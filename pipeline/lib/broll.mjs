// Portrait b-roll from the Pexels video API with a faceless gate: any
// candidate whose thumbnails or sampled frames contain a person is
// rejected. Only person-free clips are cached. Without PEXELS_API_KEY
// every scene falls back to a slow brand gradient.
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, renameSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cacheDir, ensureDir, ffmpegPath } from "./env.mjs";
import { personInJpeg } from "./persons.mjs";

const pexec = promisify(execFile);
const MAX_CANDIDATES = 8;

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
async function thumbnailsClean(video) {
  const pics = video.video_pictures ?? [];
  const picks = pics.length <= 3 ? pics : [pics[0], pics[Math.floor(pics.length / 2)], pics[pics.length - 1]];
  for (const p of picks) {
    const buf = await fetchJpeg(p.picture);
    if (buf && (await personInJpeg(buf))) return false;
  }
  return true;
}

// Second gate on the actual file: sample frames at 10/50/90 percent.
async function framesClean(file, duration) {
  const ffmpeg = await ffmpegPath();
  const dur = Math.max(1, duration || 10);
  for (const frac of [0.1, 0.5, 0.9]) {
    const frame = `${file}.probe.jpg`;
    try {
      await pexec(ffmpeg, [
        "-y", "-ss", String((dur * frac).toFixed(2)), "-i", file,
        "-frames:v", "1", "-q:v", "4", frame,
      ], { maxBuffer: 1 << 22 });
      if (existsSync(frame) && (await personInJpeg(readFileSync(frame)))) return false;
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

export async function fetchBroll(query) {
  if (!brollAvailable() || !query) return null;
  const dir = ensureDir(join(cacheDir, "broll"));
  const key = createHash("sha1").update(query).digest("hex");
  const file = join(dir, `${key}.mp4`);
  if (existsSync(file)) return file;

  for (const video of await search(query)) {
    if (!(await thumbnailsClean(video))) {
      console.log(`  broll "${query}": candidate ${video.id} rejected (person in thumbnail)`);
      continue;
    }
    const pick = pickFile(video);
    if (!pick) continue;
    const dl = await fetch(pick.link);
    if (!dl.ok) continue;
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, Buffer.from(await dl.arrayBuffer()));
    if (await framesClean(tmp, video.duration)) {
      renameSync(tmp, file);
      return file;
    }
    console.log(`  broll "${query}": candidate ${video.id} rejected (person in sampled frame)`);
    rmSync(tmp, { force: true });
  }
  console.log(`  broll "${query}": no person-free candidate, using gradient`);
  return null;
}
