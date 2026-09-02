// Portrait b-roll from the Pexels video API with a faceless gate: any
// candidate whose thumbnails or sampled frames contain a person is
// rejected. Only person-free clips are cached. Without PEXELS_API_KEY
// every scene falls back to a slow brand gradient.
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, renameSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cacheDir, ensureDir, ffmpegPath, repoRoot } from "./env.mjs";
import { personInJpeg, faceInJpeg } from "./persons.mjs";

const pexec = promisify(execFile);
const MAX_CANDIDATES = 8;

// Two scene modes share one gate shape:
// environment — no person may appear anywhere in the clip;
// demo        — a person SHOULD appear (body-only exercise footage) but a
//               recognizable face must not.
async function jpegAcceptable(buf, mode, seen) {
  if (mode === "demo") {
    if (await faceInJpeg(buf, 0.6)) return false;
    if (await personInJpeg(buf)) seen.person = true;
    return true;
  }
  return !(await personInJpeg(buf));
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

// Second gate on the actual file: sample frames across the clip. Frames
// are brightened before detection — a dark kitchen once hid a person from
// the detector at native exposure.
async function framesClean(file, duration, mode, seen) {
  const ffmpeg = await ffmpegPath();
  const dur = Math.max(1, duration || 10);
  for (const frac of [0.08, 0.35, 0.65, 0.92]) {
    const frame = `${file}.probe.jpg`;
    try {
      await pexec(ffmpeg, [
        "-y", "-ss", String((dur * frac).toFixed(2)), "-i", file,
        "-vf", "eq=brightness=0.12:contrast=1.15",
        "-frames:v", "1", "-q:v", "4", frame,
      ], { maxBuffer: 1 << 22 });
      if (existsSync(frame) && !(await jpegAcceptable(readFileSync(frame), mode, seen))) return false;
    } finally {
      rmSync(`${file}.probe.jpg`, { force: true });
    }
  }
  return true;
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

// Approved demo clips: fetched by exact Pexels ID from
// assets/demo-library.json — no search lottery at render time. The
// library is populated only through the curation flow plus owner approval.
export async function fetchApprovedDemo(movement, seed = "") {
  if (!brollAvailable() || !movement) return null;
  const libPath = join(repoRoot, "assets", "demo-library.json");
  const lib = JSON.parse(readFileSync(libPath, "utf8"));
  const entries = (lib.movements?.[movement] ?? []).filter(
    (entry) => entry.movement_verified === true && entry.faceless_verified === true && /^\d{4}-\d{2}-\d{2}$/.test(entry.reviewed_at ?? ""),
  );
  if (!entries || entries.length === 0) return null;
  // Rotate deterministically across approved clips so a movement that
  // appears in several videos doesn't always show the same footage.
  const idx = parseInt(createHash("sha1").update(`${movement}|${seed}`).digest("hex").slice(0, 6), 16) % entries.length;
  const entry = entries[idx];
  const dir = ensureDir(join(cacheDir, "broll"));
  if (entry.source === "owned") {
    const file = join(dir, `demo-owned-${entry.sha256.slice(0, 20)}.mp4`);
    if (existsSync(file)) return file;
    const dl = await fetch(entry.url);
    if (!dl.ok) throw new Error(`owned demo download ${dl.status}`);
    const body = Buffer.from(await dl.arrayBuffer());
    const actual = createHash("sha256").update(body).digest("hex");
    if (actual !== entry.sha256) throw new Error(`owned demo checksum mismatch for ${movement}`);
    writeFileSync(file, body);
    return file;
  }
  const file = join(dir, `demo-${entry.pexels_id}.mp4`);
  if (existsSync(file)) return file;
  const res = await fetch(`https://api.pexels.com/videos/videos/${entry.pexels_id}`, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  });
  if (!res.ok) throw new Error(`Pexels video ${entry.pexels_id}: ${res.status}`);
  const pick = pickFile(await res.json());
  if (!pick) return null;
  const dl = await fetch(pick.link);
  if (!dl.ok) throw new Error(`Pexels download ${dl.status}`);
  writeFileSync(file, Buffer.from(await dl.arrayBuffer()));
  return file;
}

export async function fetchBroll(query, mode = "environment") {
  if (!brollAvailable() || !query) return null;
  const dir = ensureDir(join(cacheDir, "broll"));
  const key = createHash("sha1").update(`${mode}|${query}`).digest("hex");
  const file = join(dir, `${key}.mp4`);
  if (existsSync(file)) return file;

  const reason = mode === "demo" ? "face visible" : "person";
  for (const video of await search(query)) {
    const seen = { person: false };
    if (!(await thumbnailsClean(video, mode, seen))) {
      console.log(`  broll "${query}" [${mode}]: candidate ${video.id} rejected (${reason} in thumbnail)`);
      continue;
    }
    const pick = pickFile(video);
    if (!pick) continue;
    const dl = await fetch(pick.link);
    if (!dl.ok) continue;
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, Buffer.from(await dl.arrayBuffer()));
    if (await framesClean(tmp, video.duration, mode, seen)) {
      if (mode === "demo" && !seen.person) {
        console.log(`  broll "${query}" [demo]: candidate ${video.id} rejected (no person doing the movement)`);
        rmSync(tmp, { force: true });
        continue;
      }
      renameSync(tmp, file);
      return file;
    }
    console.log(`  broll "${query}" [${mode}]: candidate ${video.id} rejected (${reason} in sampled frame)`);
    rmSync(tmp, { force: true });
  }
  console.log(`  broll "${query}" [${mode}]: no acceptable candidate, using gradient`);
  return null;
}
