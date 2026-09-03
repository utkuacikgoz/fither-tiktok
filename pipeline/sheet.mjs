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

let sheet = `# Week ${week} — posting sheet\n\nThree posts a day: the video, the carousel, the single. Space them across the\nday rather than back to back. The caption goes in as the first text.\nVideo masters already contain the original FITHER bed with voice ducking; do not\nstack another sound unless the post is a named native-sound experiment (0-5%).\nFor carousels and singles, choose a calm native sound that carries no\ninstructional meaning.\n`;
const allNotes = [];
let missing = 0;

// A video carrying the generated character must be posted with TikTok's
// AI-generated-content label. Runway attaches C2PA credentials, but the
// render re-encodes through ffmpeg and strips them, so nothing auto-labels
// the upload: this line is the only thing that applies it. Whether a render
// used generated footage is recorded per render in <slug>.assets.json.
function needsAiLabel(spec) {
  if (spec.format === "slideshow" || spec.format === "single") return false;
  const record = join(outDir, `${spec.slug}.assets.json`);
  if (!existsSync(record)) return null;
  try {
    const assets = JSON.parse(readFileSync(record, "utf8"));
    return (assets.assets ?? assets ?? []).some?.((a) => a.source === "generated") ?? false;
  } catch {
    return null;
  }
}

let previousDate = null;
for (const spec of specs) {
  const mp4 = join(outDir, `${spec.slug}.mp4`);
  const slideDir = join(outDir, spec.slug);
  const solo = spec.format === "single";
  const expectedSlides = solo
    ? [join(outDir, `${spec.slug}.png`)]
    : spec.scenes.map((_, i) => join(slideDir, `slide-${String(i + 1).padStart(2, "0")}.png`));
  const still = solo || spec.format === "slideshow";
  const rendered = still ? expectedSlides.every(existsSync) : existsSync(mp4);
  if (!rendered) missing++;
  if (spec.post_date !== previousDate) {
    sheet += `\n# ${spec.post_date}\n`;
    previousDate = spec.post_date;
  }
  sheet += `\n## ${spec.post_date} — ${spec.slug}${rendered ? "" : " (MISSING RENDER)"}\n\n`;
  sheet += solo
    ? `Image: \`renders/week-${week}/${spec.slug}.png\` (one photo post)\n\n`
    : spec.format === "slideshow"
      ? `Slides: \`renders/week-${week}/${spec.slug}/\` (upload in filename order)\n\n`
      : `File: \`renders/week-${week}/${spec.slug}.mp4\`\n\n`;
  const label = needsAiLabel(spec);
  if (label === true) {
    sheet += `**Switch on TikTok's AI-generated-content label before posting.** This\nvideo carries the generated character and nothing auto-labels it.\n\n`;
  } else if (label === null) {
    sheet += `AI label: unknown, no asset record found. Check the render before posting.\n\n`;
  }
  sheet += `Caption:\n\n> ${spec.caption}\n>\n> ${(spec.hashtags ?? []).join(" ")}\n`;
  sheet += `\nAfter publishing: \`node pipeline/shots.mjs ${week} --record ${spec.slug}\`\n`;
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
sheet += `\nShot identity report: \`renders/week-${week}/shot-report.md\`\n`;
writeFileSync(join(outDir, "posting-sheet.md"), sheet);
console.log(`Posting sheet for ${specs.length} videos (${missing} missing renders): ${join(outDir, "posting-sheet.md")}`);
if (missing > 0) process.exit(1);
