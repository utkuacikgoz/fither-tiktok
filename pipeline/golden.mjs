#!/usr/bin/env node
// Deterministic production-path fixtures. They exercise video composition and
// the complete slideshow system without paid providers.
import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { closeBrowser, renderOverlay, renderSlide } from "./lib/overlays.mjs";
import { composeVideo, mediaDuration, meanVolume } from "./lib/compose.mjs";
import { ensureDir, ffmpegPath, rendersDir } from "./lib/env.mjs";
import { assertAudioMaster, createQaSheet } from "./lib/verify.mjs";
import { renderSoundBed } from "./lib/sound.mjs";
import { assertAnimationMedia } from "./lib/animations.mjs";

const pexec = promisify(execFile);
const outDir = ensureDir(join(rendersDir, "golden"));
const audio = join(outDir, "golden-tone.mp3");
const output = join(outDir, "golden.mp4");
const animation = join(outDir, "golden-animation.mp4");
const qa = join(outDir, "golden-qa.png");
const slideDir = ensureDir(join(outDir, "slides"));
const slides = [
  { kicker: "THE CONSTRAINT", text: "The room is quiet. You can still train.", footer: "Strength that fits your life.", kind: "hook" },
  { kicker: "STEP 1", text: "Use the wall for ten controlled reps.", footer: "A workout that fits today.", kind: "step" },
  { kicker: "STEP 2", text: "Move slowly enough to own every centimetre, then pause where the rep asks for control.", footer: "Keep the room quiet. Keep the work real.", kind: "step" },
  { kicker: "YOUR TURN", text: "Which wall starts your session?", footer: "Save this for tonight.", kind: "cta" },
];
const ffmpeg = await ffmpegPath();

await pexec(ffmpeg, [
  "-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=2",
  "-c:a", "libmp3lame", "-b:a", "128k", audio,
], { maxBuffer: 1 << 22 });
await pexec(ffmpeg, [
  "-y", "-f", "lavfi", "-i", "color=c=0xE7ECE7:s=1080x1920:r=30:d=1",
  "-vf", "drawbox=x=390:y='700+80*sin(t*2*PI)':w=300:h=520:color=0x5C6F5E:t=fill",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", animation,
], { maxBuffer: 1 << 22 });
await assertAnimationMedia(animation, { duration: 1 });

let hook;
let caption;
const slideFiles = [];
try {
  hook = await renderOverlay({ text: "Five seconds. Every gate.", style: "hook" });
  caption = await renderOverlay({ text: "A verified golden render.", style: "caption" });
  for (const [index, slide] of slides.entries()) {
    const file = join(slideDir, `slide-${String(index + 1).padStart(2, "0")}.png`);
    await renderSlide({ ...slide, index: index + 1, total: slides.length }, file);
    slideFiles.push(file);
  }
} finally {
  await closeBrowser();
}

const spec = {
  slug: "golden",
  duration: 5,
  sound: { profile: "quiet-drive", bed_gain_db: -16 },
  scenes: [{ start: 0, end: 5, animation: true }],
};
const soundBedFile = await renderSoundBed(spec.sound.profile);
await composeVideo({
  spec,
  sceneFiles: [animation],
  overlays: [
    { start: 0, end: 2.5, file: hook },
    { start: 2.5, end: 4.8, file: caption },
  ],
  voFiles: [{ t: 0.5, dur: 2, file: audio }],
  soundBedFile,
  out: output,
});
await createQaSheet(output, qa, { interval: 1 });
await assertAudioMaster(output);

const duration = await mediaDuration(output);
if (duration == null || Math.abs(duration - 5) > 0.15) {
  throw new Error(`golden render duration is ${duration ?? "unreadable"}s, expected 5s`);
}
const volume = await meanVolume(output, 0.5, 2);
if (volume == null || volume < -45) throw new Error(`golden render audio is missing or silent (${volume})`);
const bedVolume = await meanVolume(output, 3.2, 1);
if (bedVolume == null || bedVolume < -50) throw new Error(`golden render sound bed is missing or silent (${bedVolume})`);

let probe = "";
try {
  await pexec(ffmpeg, ["-i", output], { maxBuffer: 1 << 22 });
} catch (cause) {
  probe = cause.stderr ?? "";
}
if (!/Video:.*1080x1920/.test(probe)) throw new Error("golden render is not 1080x1920");
if (!/Audio:\s*aac.*48000 Hz, stereo/.test(probe)) {
  throw new Error("golden render audio is not 48 kHz stereo AAC");
}
for (const file of [animation, output, qa, ...slideFiles]) {
  if (!existsSync(file) || statSync(file).size === 0) throw new Error(`golden artifact missing: ${file}`);
}
for (const file of slideFiles) {
  let imageProbe = "";
  try {
    await pexec(ffmpeg, ["-i", file], { maxBuffer: 1 << 22 });
  } catch (cause) {
    imageProbe = cause.stderr ?? "";
  }
  if (!/Video:.*1080x1920/.test(imageProbe)) throw new Error(`golden slide is not 1080x1920: ${file}`);
}

console.log(`Golden video passed: ${output}`);
console.log(`Golden slideshow passed: ${slideDir}`);
