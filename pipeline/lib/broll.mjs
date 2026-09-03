// Portrait b-roll from the Pexels video API with a faceless gate: any
// candidate whose thumbnails or sampled frames contain a recognizable
// face is rejected. People are welcome — hands, backs, bodies mid-motion
// make scenes feel human (owner note, 2026-09-02: "no face is fine, but
// no person looks weird"). Without PEXELS_API_KEY every scene falls back
// to a slow brand gradient.
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, readdirSync, renameSync, rmSync, existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cacheDir, ensureDir, ffmpegPath, repoRoot } from "./env.mjs";
import { personInJpeg, faceInJpeg } from "./persons.mjs";
import { OUTPUT_FACE_THRESHOLD, OUTPUT_SAMPLE_INTERVAL } from "./verify.mjs";
import { PORTRAIT_GEOMETRY } from "./compose.mjs";
import { shotHistoryIds } from "./shots.mjs";

const pexec = promisify(execFile);
const MAX_CANDIDATES = 8;

// INVARIANT: screening a source clip must be at least as strict and at least
// as dense as verifying the finished video, so the render never gets as far
// as burning six minutes on footage the output gate will reject.
export const SOURCE_FACE_THRESHOLD = Math.min(0.5, OUTPUT_FACE_THRESHOLD);
export const SOURCE_SAMPLE_FPS = Math.max(2, 1 / OUTPUT_SAMPLE_INTERVAL);

// A cached clip is a cached VERDICT: "this passed screening". The cache is
// restored across CI runs, so keying it by clip id alone let footage accepted
// under an older, looser policy keep rendering long after the policy tightened.
// Keying by the policy retires those acceptances automatically.
export const SCREEN_POLICY = createHash("sha1")
  .update(`face:${SOURCE_FACE_THRESHOLD}|fps:${SOURCE_SAMPLE_FPS}|geom:${PORTRAIT_GEOMETRY}`)
  .digest("hex")
  .slice(0, 8);

// Two scene modes share one gate shape:
// environment — people may appear (they make scenes feel human) but a
//               recognizable face must not;
// demo        — a person MUST appear (body-only exercise footage) and a
//               recognizable face must not.
async function jpegAcceptable(buf, mode, seen) {
  if (await faceInJpeg(buf, SOURCE_FACE_THRESHOLD)) return false;
  if (mode === "demo" && (await personInJpeg(buf))) seen.person = true;
  return true;
}

export function brollAvailable() {
  return Boolean(process.env.PEXELS_API_KEY);
}

async function search(query) {
  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", String(MAX_CANDIDATES));
  const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).videos ?? [];
}

async function fetchJpeg(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

// Cheap first gate: Pexels preview thumbnails, no video download needed.
async function thumbnailsClean(video, mode, seen) {
  const pics = video.video_pictures ?? [];
  const picks = pics.length <= 3 ? pics : [pics[0], pics[Math.floor(pics.length / 2)], pics[pics.length - 1]];
  for (const p of picks) {
    const buf = await fetchJpeg(p.picture);
    if (buf && !(await jpegAcceptable(buf, mode, seen))) return false;
  }
  return true;
}

// Second gate on the actual file. This must judge the clip exactly as the
// finished video presents it: same portrait crop, at least as dense, at
// least as strict. Screening at source framing missed faces that the render
// magnified when it upscaled a clip to 1080x1920. Frames are brightened
// before detection — a dark kitchen once hid a person from the detector at
// native exposure — and extracted in a single ffmpeg pass, so sampling the
// whole clip costs one process rather than one per frame.
async function framesClean(file, mode, seen) {
  const ffmpeg = await ffmpegPath();
  const dir = mkdtempSync(join(ensureDir(cacheDir), "probe-"));
  try {
    await pexec(ffmpeg, [
      "-y", "-i", file,
      "-vf", `fps=${SOURCE_SAMPLE_FPS},${PORTRAIT_GEOMETRY},eq=brightness=0.12:contrast=1.15`,
      "-q:v", "4", join(dir, "f-%04d.jpg"),
    ], { maxBuffer: 1 << 24 });
    const frames = readdirSync(dir).sort();
    if (frames.length === 0) return false;
    for (const name of frames) {
      const buf = readFileSync(join(dir, name));
      if (await faceInJpeg(buf, SOURCE_FACE_THRESHOLD)) return false;
      // Environment scenes do not care whether a person is present, so the
      // person detector only runs where the answer changes a decision.
      if (mode === "demo" && !seen.person && (await personInJpeg(buf))) seen.person = true;
    }
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function pickFile(video) {
  const files = video.video_files.filter((f) => f.file_type === "video/mp4");
  files.sort((a, b) => {
    const aFit = a.height >= 1920 && a.width >= 1080 ? 0 : 1;
    const bFit = b.height >= 1920 && b.width >= 1080 ? 0 : 1;
    return aFit - bFit || b.height - a.height;
  });
  return files[0] ?? null;
}

// Checksum-pinned sources (owned footage, generated footage) are identified
// by their content hash; Pexels clips by their id.
const isPinned = (entry) => entry.source === "owned" || entry.source === "generated";

function assetIdentity(entry) {
  return isPinned(entry) ? `${entry.source}:${entry.sha256}` : `pexels:${entry.pexels_id}`;
}

function metadataFile(file) {
  return `${file}.meta.json`;
}

function writeAssetMetadata(file, metadata) {
  writeFileSync(metadataFile(file), `${JSON.stringify(metadata, null, 2)}\n`);
}

export function readAssetMetadata(file) {
  const path = file ? metadataFile(file) : "";
  return path && existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

// Approved demo clips: fetched by exact Pexels ID from
// assets/demo-library.json — no search lottery at render time. The
// library is populated only through the curation flow plus owner approval.
export async function fetchApprovedDemo(movement, seed = "", excludedIds = new Set()) {
  if (!movement) return null;
  const libPath = join(repoRoot, "assets", "demo-library.json");
  const lib = JSON.parse(readFileSync(libPath, "utf8"));
  const blocked = new Set([...shotHistoryIds(), ...excludedIds]);
  const entries = (lib.movements?.[movement] ?? []).filter(
    (entry) => entry.movement_verified === true && entry.faceless_verified === true &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.reviewed_at ?? "") && !blocked.has(assetIdentity(entry)) &&
      (isPinned(entry) || brollAvailable()),
  );
  if (!entries || entries.length === 0) return null;
  // Rotate deterministically across approved clips so a movement that
  // appears in several videos doesn't always show the same footage.
  const idx = parseInt(createHash("sha1").update(`${movement}|${seed}`).digest("hex").slice(0, 6), 16) % entries.length;
  const entry = entries[idx];
  const identity = assetIdentity(entry);
  const dir = ensureDir(join(cacheDir, "broll"));
  if (isPinned(entry)) {
    const file = join(dir, `demo-${entry.source}-${entry.sha256.slice(0, 20)}.mp4`);
    const metadata = { asset_id: identity, source: entry.source, kind: "demo", movement, duration: entry.duration };
    if (existsSync(file)) {
      writeAssetMetadata(file, metadata);
      return file;
    }
    const dl = await fetch(entry.url);
    if (!dl.ok) throw new Error(`${entry.source} demo download ${dl.status}`);
    const body = Buffer.from(await dl.arrayBuffer());
    const actual = createHash("sha256").update(body).digest("hex");
    if (actual !== entry.sha256) throw new Error(`${entry.source} demo checksum mismatch for ${movement}`);
    writeFileSync(file, body);
    writeAssetMetadata(file, metadata);
    return file;
  }
  const file = join(dir, `demo-${entry.pexels_id}.mp4`);
  const metadata = { asset_id: identity, source: "pexels", kind: "demo", movement, duration: entry.duration };
  if (existsSync(file)) {
    writeAssetMetadata(file, metadata);
    return file;
  }
  const res = await fetch(`https://api.pexels.com/videos/videos/${entry.pexels_id}`, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  });
  if (!res.ok) throw new Error(`Pexels video ${entry.pexels_id}: ${res.status}`);
  const pick = pickFile(await res.json());
  if (!pick) return null;
  const dl = await fetch(pick.link);
  if (!dl.ok) throw new Error(`Pexels download ${dl.status}`);
  writeFileSync(file, Buffer.from(await dl.arrayBuffer()));
  writeAssetMetadata(file, metadata);
  return file;
}

export async function fetchBroll(query, mode = "environment", excludedIds = new Set()) {
  if (!brollAvailable() || !query) return null;
  const dir = ensureDir(join(cacheDir, "broll"));
  const blocked = new Set([...shotHistoryIds(), ...excludedIds]);

  const reason = "face visible";
  for (const video of await search(query)) {
    const identity = `pexels:${video.id}`;
    if (blocked.has(identity)) {
      console.log(`  broll "${query}" [${mode}]: candidate ${video.id} skipped (shot history)`);
      continue;
    }
    const seen = { person: false };
    if (!(await thumbnailsClean(video, mode, seen))) {
      console.log(`  broll "${query}" [${mode}]: candidate ${video.id} rejected (${reason} in thumbnail)`);
      continue;
    }
    const pick = pickFile(video);
    if (!pick) continue;
    const file = join(dir, `${mode}-${SCREEN_POLICY}-pexels-${video.id}.mp4`);
    const metadata = {
      asset_id: identity,
      source: "pexels",
      kind: mode,
      query,
      duration: video.duration,
      pexels_url: video.url,
    };
    if (existsSync(file)) {
      writeAssetMetadata(file, metadata);
      return file;
    }
    const dl = await fetch(pick.link);
    if (!dl.ok) continue;
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, Buffer.from(await dl.arrayBuffer()));
    if (await framesClean(tmp, mode, seen)) {
      if (mode === "demo" && !seen.person) {
        console.log(`  broll "${query}" [demo]: candidate ${video.id} rejected (no person doing the movement)`);
        rmSync(tmp, { force: true });
        continue;
      }
      renameSync(tmp, file);
      writeAssetMetadata(file, metadata);
      return file;
    }
    console.log(`  broll "${query}" [${mode}]: candidate ${video.id} rejected (${reason} in sampled frame)`);
    rmSync(tmp, { force: true });
  }
  console.log(`  broll "${query}" [${mode}]: no acceptable candidate, using gradient`);
  return null;
}
