#!/usr/bin/env node
// Five-second deterministic production-path fixture. It exercises Chromium,
// bundled fonts, overlay/caption rendering, ffmpeg composition, audio mixing,
// final dimensions/duration and the human-QA artifact without paid providers.
import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { closeBrowser, renderOverlay } from "./lib/overlays.mjs";
import { composeVideo, mediaDuration, meanVolume } from "./lib/compose.mjs";
import { ensureDir, ffmpegPath, rendersDir } from "./lib/env.mjs";
import { createQaSheet } from "./lib/verify.mjs";

const pexec = promisify(execFile);
const outDir = ensureDir(join(rendersDir, "golden"));
const audio = join(outDir, "golden-tone.mp3");
const output = join(outDir, "golden.mp4");
const qa = join(outDir, "golden-qa.png");
const ffmpeg = await ffmpegPath();

await pexec(ffmpeg, [
  "-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=2",
  "-c:a", "libmp3lame", "-b:a", "128k", audio,
], { maxBuffer: 1 << 22 });

let hook;
let caption;
try {
  hook = await renderOverlay({ text: "Five seconds. Every gate.", style: "hook" });
  caption = await renderOverlay({ text: "A verified golden render.", style: "caption" });
} finally {
  await closeBrowser();
}

const spec = {
  slug: "golden",
  duration: 5,
  scenes: [{ start: 0, end: 5 }],
};
await composeVideo({
  spec,
  sceneFiles: [null],
  overlays: [
    { start: 0, end: 2.5, file: hook },
    { start: 2.5, end: 4.8, file: caption },
  ],
  voFiles: [{ t: 0.5, dur: 2, file: audio }],
  out: output,
});
await createQaSheet(output, qa, { interval: 1 });

const duration = await mediaDuration(output);
if (duration == null || Math.abs(duration - 5) > 0.15) {
  throw new Error(`golden render duration is ${duration ?? "unreadable"}s, expected 5s`);
}
const volume = await meanVolume(output, 0.5, 2);
if (volume == null || volume < -45) throw new Error(`golden render audio is missing or silent (${volume})`);

let probe = "";
try {
  await pexec(ffmpeg, ["-i", output], { maxBuffer: 1 << 22 });
} catch (cause) {
  probe = cause.stderr ?? "";
}
if (!/Video:.*1080x1920/.test(probe)) throw new Error("golden render is not 1080x1920");
if (!/Audio:\s*aac/.test(probe)) throw new Error("golden render has no AAC audio stream");
for (const file of [output, qa]) {
  if (!existsSync(file) || statSync(file).size === 0) throw new Error(`golden artifact missing: ${file}`);
}

console.log(`Golden render passed: ${output}`);
