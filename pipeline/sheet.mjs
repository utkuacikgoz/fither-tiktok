#!/usr/bin/env node
// Builds renders/week-NN/posting-sheet.md from the week's sidecars and the
// per-video files already in the renders directory. Used by the sharded CI
// workflow after per-video render jobs are collected; produce.mjs builds
// the same sheet inline for local runs.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, rendersDir } from "./lib/env.mjs";

const week = String(process.argv[2] ?? "").replace(/^week-/, "").padStart(2, "0");
if (!/^\d{2}$/.test(week)) {
  console.error("Usage: node pipeline/sheet.mjs <week number, e.g. 01>");
  process.exit(1);
}

const scriptsDir = join(repoRoot, "content", "scripts");
const outDir = join(rendersDir, `week-${week}`);
const specs = readdirSync(scriptsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(scriptsDir, f), "utf8")))
  .filter((s) => String(s.week).padStart(2, "0") === week)
  .sort((a, b) => a.post_date.localeCompare(b.post_date));

let sheet = `# Week ${week} — posting sheet\n\nOne per day, fixed time. Caption goes in as the first text.\nWhen posting, add a calm in-app sound at 10-20% volume under the voice —\nnative feel, zero licensing risk. Never pick a sound the video depends on.\n`;
const allNotes = [];
let missing = 0;

for (const spec of specs) {
  const mp4 = join(outDir, `${spec.slug}.mp4`);
  const slideDir = join(outDir, spec.slug);
  const expectedSlides = spec.scenes.map((_, i) => join(slideDir, `slide-${String(i + 1).padStart(2, "0")}.png`));
  const rendered = spec.format === "slideshow" ? expectedSlides.every(existsSync) : existsSync(mp4);
  if (!rendered) missing++;
  sheet += `\n## ${spec.post_date} — ${spec.slug}${rendered ? "" : " (MISSING RENDER)"}\n\n`;
  sheet += spec.format === "slideshow"
    ? `Slides: \`renders/week-${week}/${spec.slug}/\` (upload in filename order)\n\n`
    : `File: \`renders/week-${week}/${spec.slug}.mp4\`\n\n`;
  sheet += `Caption:\n\n> ${spec.caption}\n>\n> ${(spec.hashtags ?? []).join(" ")}\n`;
  const notesFile = join(outDir, `${spec.slug}.notes.txt`);
  if (existsSync(notesFile)) {
    const notes = readFileSync(notesFile, "utf8").trim();
    if (notes && notes !== "-") for (const n of notes.split("\n")) allNotes.push(`${spec.slug}: ${n.replace(/^- /, "")}`);
  }
}

if (allNotes.length) {
  sheet += `\n## Render notes\n\n`;
  allNotes.forEach((n) => (sheet += `- ${n}\n`));
}
writeFileSync(join(outDir, "posting-sheet.md"), sheet);
console.log(`Posting sheet for ${specs.length} videos (${missing} missing renders): ${join(outDir, "posting-sheet.md")}`);
if (missing > 0) process.exit(1);
