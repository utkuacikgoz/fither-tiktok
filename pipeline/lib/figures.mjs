// The authored movement figure as a still: the peak frame of an approved
// export from assets/animation-library.json, cropped above the export's
// progress ring so a card can lay type over the empty upper half.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cacheDir, ensureDir, ffmpegPath, repoRoot } from "./env.mjs";
import { loadAnimationLibrary } from "./animations.mjs";

const pexec = promisify(execFile);
// The authored loops run 4s with the peak of the repetition at the midpoint.
const PEAK_SECONDS = 2;
const CROP_HEIGHT = 1660;

export function approvedFigureExport(movement, library = loadAnimationLibrary()) {
  const entries = (library.movements?.[movement] ?? []).filter(
    (entry) => entry.movement_verified === true && entry.faceless_verified === true && entry.path,
  );
  return entries[0] ?? null;
}

export async function figureFrame(movement) {
  const entry = approvedFigureExport(movement);
  if (!entry) return null;
  const source = join(repoRoot, entry.path);
  if (!existsSync(source)) throw new Error(`authored export missing: ${entry.path}`);
  const key = createHash("sha1").update(`${entry.sha256}|${PEAK_SECONDS}|${CROP_HEIGHT}`).digest("hex").slice(0, 16);
  const file = join(ensureDir(join(cacheDir, "figures")), `${key}.png`);
  if (!existsSync(file)) {
    const ffmpeg = await ffmpegPath();
    await pexec(ffmpeg, [
      "-y", "-loglevel", "error", "-ss", String(PEAK_SECONDS), "-i", source,
      "-frames:v", "1", "-vf", `crop=1080:${CROP_HEIGHT}:0:0`, file,
    ], { maxBuffer: 1 << 24 });
  }
  return file;
}
