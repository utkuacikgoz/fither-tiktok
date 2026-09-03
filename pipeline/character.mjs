#!/usr/bin/env node
// Generates candidate reference portraits for the channel's recurring
// character. Runway pins a person across shots from a reference image, so
// every movement clip shows the same woman instead of a new stranger.
//
// Run in CI (needs RUNWAY_API_SECRET): node pipeline/character.mjs
// Output: character/portrait-N.jpg + character/review.html
//
// Nothing here approves anything. The owner picks one portrait; it is
// committed into the repo and named in assets/character.json as
// approved_file, because Runway's own asset URLs expire within a day or two.
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, ensureDir } from "./lib/env.mjs";
import { runwayPortrait } from "./lib/generate.mjs";

const COUNT = Number(process.env.CHARACTER_TAKES || 4);
const book = JSON.parse(readFileSync(join(repoRoot, "assets", "generation-prompts.json"), "utf8"));

// The character brief is the brand in one sentence: the woman the channel is
// for, not a fitness model.
//
// Two casting rounds were spent learning that Runway drops negations. "No
// crop top", "no bare midriff" and "not a fitness model" each produced
// exactly the thing they forbade: the nouns land and the "no" does not. The
// brief is therefore written with no negations at all. Every constraint is
// stated as something present in the frame, and the words that pull hardest
// toward a sportswear lookbook (portrait, posed, fitness) are simply absent.
// Age is described by its markers rather than asserted as a number, for the
// same reason: "thirty-eight" is a token, laugh lines are an instruction.
const BRIEF = [
  "Candid full-length phone snapshot of a forty-year-old woman standing in her own living room.",
  "Laugh lines at her eyes, a few grey strands through mid-brown hair tied back untidily, a bare face.",
  "Her build is soft and average: a rounded stomach, fuller upper arms, wider hips, the body of someone who sits at a desk.",
  "She wears a plain oatmeal cotton vest top tucked into the waistband of charcoal leggings, covering her stomach and lower back, and she is barefoot.",
  "She stands relaxed and a little awkward, arms hanging at her sides, her whole body from head to feet inside the frame.",
  "Plain bone-white wall and warm oak floor behind her.",
  book.light,
  "Honest unretouched photograph, real skin texture with visible pores and blemishes, flat everyday colour.",
].join(" ");
if (BRIEF.length > 1000) throw new Error(`character brief is ${BRIEF.length} chars, over Runway's 1000 limit`);

const outDir = ensureDir(join(repoRoot, "character"));
const results = [];
for (let i = 0; i < COUNT; i++) {
  try {
    const url = await runwayPortrait({ prompt: BRIEF, seed: 1000 + i * 7919 });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const file = join(outDir, `portrait-${i}.jpg`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    results.push({ index: i, url, file: `portrait-${i}.jpg` });
    console.log(`  portrait-${i}: ${url}`);
  } catch (e) {
    console.log(`  portrait-${i}: failed (${e.message.slice(0, 200)})`);
  }
}

writeFileSync(join(outDir, "candidates.json"), `${JSON.stringify({ brief: BRIEF, portraits: results }, null, 2)}\n`);
writeFileSync(
  join(outDir, "review.html"),
  `<!doctype html><meta charset="utf-8"><title>Character candidates</title>
<style>body{font:14px system-ui;margin:24px}figure{display:inline-block;margin:8px;width:300px}img{width:100%}</style>
<h1>Recurring character candidates</h1>
<p>Pick one. Its file is committed into the repo at
<code>assets/character/portrait.jpg</code> and named in
<code>assets/character.json</code> as <code>approved_file</code>, and every
generated clip from then on shows her. The Runway URLs below expire within a
day or two, which is why the bytes are kept rather than the link.</p>
${results.map((r) => `<figure><img src="${r.file}"><figcaption>portrait-${r.index}</figcaption></figure>`).join("")}\n`,
);

console.log(`\nWrote character/candidates.json (${results.length} portrait(s))`);
if (results.length === 0) process.exit(1);
