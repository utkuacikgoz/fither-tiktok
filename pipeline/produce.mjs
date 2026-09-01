#!/usr/bin/env node
// Renders every video of a week and writes the posting sheet.
//   node pipeline/produce.mjs 01
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, rendersDir, ensureDir } from "./lib/env.mjs";
import { renderOne } from "./render.mjs";

const week = String(process.argv[2] ?? "").replace(/^week-/, "").padStart(2, "0");
if (!/^\d{2}$/.test(week)) {
  console.error("Usage: node pipeline/produce.mjs <week number, e.g. 01>");
  process.exit(1);
}

const scriptsDir = join(repoRoot, "content", "scripts");
const specs = readdirSync(scriptsDir)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => {
    try {
      return String(JSON.parse(readFileSync(join(scriptsDir, f), "utf8")).week).padStart(2, "0") === week;
    } catch {
      return false;
    }
  })
  .sort();

if (specs.length === 0) {
  console.error(`No spec sidecars for week ${week} in content/scripts/.`);
  process.exit(1);
}

const outDir = ensureDir(join(rendersDir, `week-${week}`));
let sheet = `# Week ${week} — posting sheet\n\nOne per day, fixed time. Caption goes in as the first text.\n`;
const allNotes = [];

for (const f of specs) {
  const { spec, files, notes } = await renderOne(join(scriptsDir, f));
  console.log(`✓ ${spec.slug}${notes.length ? ` (${notes.length} notes)` : ""}`);
  notes.forEach((n) => allNotes.push(`${spec.slug}: ${n}`));
  sheet += `\n## ${spec.post_date} — ${spec.slug}\n\n`;
  sheet += `File: \`${files[0].replace(repoRoot + "/", "")}\`\n\n`;
  sheet += `Caption:\n\n> ${spec.caption}\n>\n> ${(spec.hashtags ?? []).join(" ")}\n`;
}

if (allNotes.length) {
  sheet += `\n## Render notes\n\n`;
  allNotes.forEach((n) => (sheet += `- ${n}\n`));
}
writeFileSync(join(outDir, "posting-sheet.md"), sheet);
console.log(`\nPosting sheet: ${join(outDir, "posting-sheet.md")}`);
