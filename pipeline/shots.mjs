#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { auditShotUsage, loadShotHistory } from "./lib/shots.mjs";
import { ensureDir, rendersDir, repoRoot } from "./lib/env.mjs";

const week = String(process.argv[2] ?? "").replace(/^week-/, "").padStart(2, "0");
if (!/^\d{2}$/.test(week)) {
  console.error("Usage: node pipeline/shots.mjs <week number, e.g. 01>");
  process.exit(1);
}

const outDir = ensureDir(join(rendersDir, `week-${week}`));
let records = readdirSync(outDir)
  .filter((name) => name.endsWith(".assets.json"))
  .map((name) => JSON.parse(readFileSync(join(outDir, name), "utf8")));
if (records.length === 0) {
  console.error(`No rendered asset records found in ${outDir}`);
  process.exit(1);
}

const recordIndex = process.argv.indexOf("--record");
const recordSlug = recordIndex >= 0 ? process.argv[recordIndex + 1] : null;
if (recordIndex >= 0) {
  if (!recordSlug) {
    console.error("--record requires a rendered slug or 'all'");
    process.exit(1);
  }
  if (recordSlug !== "all") records = records.filter((record) => record.slug === recordSlug);
  if (records.length === 0) {
    console.error(`No rendered asset record matches ${recordSlug}`);
    process.exit(1);
  }
}

const history = loadShotHistory();
const result = auditShotUsage(records, history);
const report = join(outDir, "shot-report.md");
writeFileSync(report, result.report);
console.log(`Shot identity: ${result.assets.length} asset(s), ${result.errors.length} reuse violation(s)`);
console.log(report);
if (result.errors.length) process.exit(1);

if (recordIndex >= 0) {
  history.posted.push(...result.assets);
  history.posted.sort((a, b) => a.post_date.localeCompare(b.post_date) || a.slug.localeCompare(b.slug));
  const historyFile = join(repoRoot, "data", "shot-history.json");
  writeFileSync(historyFile, `${JSON.stringify(history, null, 2)}\n`);
  console.log(`Recorded ${result.assets.length} posted asset(s): ${historyFile}`);
}
