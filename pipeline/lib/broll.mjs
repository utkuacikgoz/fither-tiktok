// Portrait b-roll from the Pexels video API, cached by query.
// Without PEXELS_API_KEY every scene falls back to a slow brand gradient.
import { createHash } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cacheDir, ensureDir } from "./env.mjs";

export function brollAvailable() {
  return Boolean(process.env.PEXELS_API_KEY);
}

export async function fetchBroll(query) {
  if (!brollAvailable() || !query) return null;
  const dir = ensureDir(join(cacheDir, "broll"));
  const key = createHash("sha1").update(query).digest("hex");
  const file = join(dir, `${key}.mp4`);
  if (existsSync(file)) return file;

  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", "3");
  const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const videos = data.videos ?? [];
  if (videos.length === 0) return null;

  // Prefer files tall enough for 1080x1920; otherwise take the largest.
  const candidates = videos
    .flatMap((v) => v.video_files.map((f) => ({ ...f, duration: v.duration })))
    .filter((f) => f.file_type === "video/mp4");
  candidates.sort((a, b) => {
    const aFit = a.height >= 1920 && a.width >= 1080 ? 0 : 1;
    const bFit = b.height >= 1920 && b.width >= 1080 ? 0 : 1;
    return aFit - bFit || b.height - a.height;
  });
  const pick = candidates[0];
  if (!pick) return null;
  const dl = await fetch(pick.link);
  if (!dl.ok) throw new Error(`Pexels download ${dl.status}`);
  writeFileSync(file, Buffer.from(await dl.arrayBuffer()));
  return file;
}
