#!/usr/bin/env node
// Generates demo-clip CANDIDATES with Runway, gates them on the faceless
// rule, and writes a review set. Nothing here approves footage: a clip
// enters assets/demo-library.json only after a human watches it end to end
// (CLAUDE.md, demo truth).
//
// Run in CI (needs RUNWAY_API_SECRET): node pipeline/generate.mjs
// Output: generation/candidates.json, generation/clips/*.mp4,
//         generation/frames/*.jpg, generation/review.html
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { repoRoot, ensureDir, ffmpegPath } from "./lib/env.mjs";
import { personInJpeg } from "./lib/persons.mjs";
import { generateClip, providersAvailable } from "./lib/generate.mjs";

const pexec = promisify(execFile);
const REVIEW_SAMPLES = 9;
const CLIP_SECONDS = Number(process.env.GENERATION_SECONDS || 5);
const PER_MOVEMENT = Number(process.env.GENERATION_TAKES || 2);
const PROMPT_LIMIT = 1000; // Runway promptText hard cap
const RAW_BASE = "https://raw.githubusercontent.com/utkuacikgoz/fither-tiktok/generated-demos";

const providers = providersAvailable();
if (providers.length === 0) {
  console.error("No generation provider configured. Set RUNWAY_API_SECRET.");
  process.exit(1);
}

const book = JSON.parse(readFileSync(join(repoRoot, "assets", "generation-prompts.json"), "utf8"));
// The recurring character. Until a portrait is approved every clip would
// invent a new stranger, so generation refuses to run without one unless it
// is explicitly generating the portraits themselves.
const characterPath = join(repoRoot, "assets", "character.json");
const character = existsSync(characterPath) ? JSON.parse(readFileSync(characterPath, "utf8")) : null;
// The portrait is a file committed to this repo, not a provider URL: Runway's
// own asset URLs expire within a day or two, which would silently unpin the
// character. approved_url stays supported for a durable URL you host.
const characterReference = character?.approved_file
  ? join(repoRoot, character.approved_file)
  : character?.approved_url ?? null;
if (characterReference && character.approved_file && !existsSync(characterReference)) {
  console.error(`assets/character.json points at ${character.approved_file}, which is not in the repo.`);
  process.exit(1);
}
if (!characterReference && process.env.GENERATION_ALLOW_NO_CHARACTER !== "1") {
  console.error("No approved character in assets/character.json. Approve a reference portrait first, or set GENERATION_ALLOW_NO_CHARACTER=1 to generate without one.");
  process.exit(1);
}
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

// Runway animates a generated still, so the still prompt carries the whole
// look: composition, framing, wardrobe, room, light and grade. The motion
// prompt stays short and describes only what moves, plus the framing rule
// again so the animation cannot drift the head back into shot. A movement
// may override the default framing where the default reads wrong, which is
// the case for every floor movement.
function buildPrompt(movement) {
  const entry = book.movements[movement];
  const framing = entry.framing ?? book.framing;
  const prompt = [entry.prompt, framing, book.wardrobe, book.room, book.light, book.camera, book.look].join(" ");
  const motion = [entry.motion, framing].join(" ");
  // Runway rejects a promptText over 1000 characters with a 400, which cost
  // a whole run to discover. Fail here, before spending any call.
  for (const [field, text] of [["prompt", prompt], ["motion", motion]]) {
    if (text.length > PROMPT_LIMIT) {
      throw new Error(`${movement}: ${field} is ${text.length} chars, over Runway's ${PROMPT_LIMIT} limit`);
    }
  }
  return { prompt, motion };
}

async function mediaDuration(file) {
  const { stderr } = await pexec(ffmpeg, ["-i", file], { maxBuffer: 1 << 22 }).catch((e) => e);
  const match = /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/.exec(stderr ?? "");
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

// Generated footage may show a face (owner override, 2026-09-03): the
// person is synthetic, so the only machine requirement is that somebody is
// actually in frame doing the movement. Whether the movement is right, the
// form usable and the character on-brand is decided by full-motion review.
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
        clip = await generateClip(provider, { prompt, motion, duration: CLIP_SECONDS, seed, character: characterReference });
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
        character: character?.approved_file ?? character?.approved_url ?? null,
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
movement, the form usable, and the person must match the approved character.</p>
${rows}\n`,
);

console.log(`\nWrote generation/candidates.json (${results.length} candidate(s) from ${providers.join(", ")})`);
if (results.length === 0) {
  console.error("No candidate survived generation and gating; see the failures above.");
  process.exit(1);
}
