#!/usr/bin/env node
// Generates demo-clip CANDIDATES with Runway and Higgsfield, gates them on
// the faceless rule, and writes a review set. Nothing here approves
// footage: a clip enters assets/demo-library.json only after a human
// watches it end to end (CLAUDE.md, demo truth).
//
// Run in CI (needs RUNWAY_API_SECRET and/or HIGGSFIELD_API_KEY_ID +
// HIGGSFIELD_API_KEY_SECRET): node pipeline/generate.mjs
// Output: generation/candidates.json, generation/clips/*.mp4,
//         generation/frames/*.jpg, generation/review.html
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { repoRoot, ensureDir, ffmpegPath } from "./lib/env.mjs";
import { personInJpeg, faceInJpeg } from "./lib/persons.mjs";
import { generateClip, providersAvailable } from "./lib/generate.mjs";

const pexec = promisify(execFile);
const FACE_THRESHOLD = 0.35; // strict: generation is cheap, a leaked face is not
const REVIEW_SAMPLES = 9;
const CLIP_SECONDS = Number(process.env.GENERATION_SECONDS || 5);
const PER_MOVEMENT = Number(process.env.GENERATION_TAKES || 2);
const RAW_BASE = "https://raw.githubusercontent.com/utkuacikgoz/fither-tiktok/generated-demos";

const providers = process.env.GENERATION_PROVIDERS
  ? process.env.GENERATION_PROVIDERS.split(",").map((p) => p.trim()).filter(Boolean)
  : providersAvailable();
if (providers.length === 0) {
  console.error("No generation providers configured. Set RUNWAY_API_SECRET and/or HIGGSFIELD_API_KEY_ID + HIGGSFIELD_API_KEY_SECRET.");
  process.exit(1);
}

const book = JSON.parse(readFileSync(join(repoRoot, "assets", "generation-prompts.json"), "utf8"));
const library = JSON.parse(readFileSync(join(repoRoot, "assets", "demo-library.json"), "utf8"));

// Default target: every movement in the prompt book that has no approved
// clip yet. Those are the ones starving the plans.
const approved = new Set(
  Object.entries(library.movements ?? {})
    .filter(([, clips]) => (clips ?? []).length > 0)
    .map(([movement]) => movement),
);
const requested = process.env.GENERATION_MOVEMENTS
  ? process.env.GENERATION_MOVEMENTS.split(",").map((m) => m.trim()).filter(Boolean)
  : Object.keys(book.movements).filter((m) => !approved.has(m));
const unknown = requested.filter((m) => !book.movements[m]);
if (unknown.length) throw new Error(`No prompt for: ${unknown.join(", ")}`);
if (requested.length === 0) {
  console.log("Every movement in the prompt book already has an approved clip; nothing to generate.");
  process.exit(0);
}

const outDir = join(repoRoot, "generation");
rmSync(outDir, { recursive: true, force: true });
const clipsDir = ensureDir(join(outDir, "clips"));
const framesDir = ensureDir(join(outDir, "frames"));
const ffmpeg = await ffmpegPath();

function buildPrompt(movement) {
  const entry = book.movements[movement];
  return {
    prompt: [entry.prompt, book.framing, book.style].join(". "),
    motion: [entry.motion, book.framing].join(". "),
  };
}

async function mediaDuration(file) {
  const { stderr } = await pexec(ffmpeg, ["-i", file], { maxBuffer: 1 << 22 }).catch((e) => e);
  const match = /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/.exec(stderr ?? "");
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

// Same gate the curation flow uses: every sampled frame must be face-free
// and at least one must actually contain a person doing the movement.
async function gate(file, duration, label) {
  const dur = Math.max(1, duration || CLIP_SECONDS);
  let personSeen = false;
  const kept = [];
  for (let i = 0; i < REVIEW_SAMPLES; i++) {
    const frac = 0.04 + (0.92 * i) / (REVIEW_SAMPLES - 1);
    const frame = join(framesDir, `${label}--${i}.jpg`);
    await pexec(ffmpeg, [
      "-y", "-ss", String((dur * frac).toFixed(2)), "-i", file,
      "-vf", "eq=brightness=0.10:contrast=1.1",
      "-frames:v", "1", "-q:v", "4", frame,
    ], { maxBuffer: 1 << 22 }).catch(() => {});
    if (!existsSync(frame)) continue;
    const buf = readFileSync(frame);
    if (await faceInJpeg(buf, FACE_THRESHOLD)) {
      for (const f of [...kept, frame]) rmSync(f, { force: true });
      return { ok: false, reason: "face detected" };
    }
    if (await personInJpeg(buf)) personSeen = true;
    kept.push(frame);
  }
  if (!personSeen) {
    for (const f of kept) rmSync(f, { force: true });
    return { ok: false, reason: "no person in frame" };
  }
  return { ok: true, frames: kept.map((f) => f.slice(outDir.length + 1)) };
}

const results = [];
for (const movement of requested) {
  const { prompt, motion } = buildPrompt(movement);
  for (const provider of providers) {
    for (let take = 0; take < PER_MOVEMENT; take++) {
      const label = `${movement.replaceAll(" ", "_")}--${provider}--${take}`;
      // Deterministic per movement/provider/take so a rerun reproduces the
      // same shot instead of re-rolling the dice and re-billing.
      const seed = parseInt(createHash("sha1").update(label).digest("hex").slice(0, 8), 16) % 4294967295;
      let clip;
      try {
        clip = await generateClip(provider, { prompt, motion, duration: CLIP_SECONDS, seed });
      } catch (e) {
        console.log(`  ${label}: generation failed (${e.message.slice(0, 200)})`);
        continue;
      }
      const file = join(clipsDir, `${label}.mp4`);
      const dl = await fetch(clip.url);
      if (!dl.ok) {
        console.log(`  ${label}: download ${dl.status}`);
        continue;
      }
      const body = Buffer.from(await dl.arrayBuffer());
      writeFileSync(file, body);
      const duration = (await mediaDuration(file)) ?? CLIP_SECONDS;
      const verdict = await gate(file, duration, label);
      if (!verdict.ok) {
        console.log(`  ${label}: rejected (${verdict.reason})`);
        rmSync(file, { force: true });
        continue;
      }
      const sha256 = createHash("sha256").update(body).digest("hex");
      results.push({
        movement,
        source: "generated",
        provider: clip.provider,
        model: clip.model,
        prompt,
        motion,
        seed,
        duration: Math.round(duration * 10) / 10,
        sha256,
        file: `clips/${label}.mp4`,
        url: `${RAW_BASE}/generation/clips/${label}.mp4`,
        frames: verdict.frames,
        movement_verified: false,
        faceless_verified: false,
      });
      console.log(`  ${label}: KEPT (${duration.toFixed(1)}s, ${clip.provider})`);
    }
  }
}

writeFileSync(join(outDir, "candidates.json"), `${JSON.stringify(results, null, 2)}\n`);

const rows = results
  .map((r) => `<section><h2>${r.movement} — ${r.provider}</h2>
<video src="${r.file}" controls loop muted playsinline width="270"></video>
<p><code>${r.sha256}</code><br>${r.duration}s, seed ${r.seed}</p>
<div>${r.frames.map((f) => `<img src="${f}" width="120">`).join("")}</div></section>`)
  .join("\n");
writeFileSync(
  join(outDir, "review.html"),
  `<!doctype html><meta charset="utf-8"><title>Generated demo candidates</title>
<style>body{font:14px system-ui;margin:24px;max-width:1100px}section{border-bottom:1px solid #ddd;padding:16px 0}img{margin:2px;vertical-align:top}</style>
<h1>Generated demo candidates</h1>
<p>Machine screening only. Watch every clip end to end before approving any of
them into <code>assets/demo-library.json</code>: the movement must be the named
movement, the form usable, and no recognizable face in any frame.</p>
${rows}\n`,
);

console.log(`\nWrote generation/candidates.json (${results.length} candidate(s) from ${providers.join(", ")})`);
