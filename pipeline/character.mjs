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
// for, not a fitness model. Ordinary, capable, mid-thirties, unstyled.
const BRIEF = [
  "Head and shoulders portrait of an ordinary woman in her mid-thirties, calm and capable, warm natural expression, no makeup styling, hair loosely tied back.",
  book.wardrobe,
  book.light,
  "Plain bone-white wall behind her, softly defocused.",
  book.look,
].join(" ");

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
