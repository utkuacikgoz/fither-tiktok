#!/usr/bin/env node
// Turns data/performance.csv into deterministic, view-weighted insights.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateInsights, normalizeRows } from "./lib/analytics.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const csvPath = join(repoRoot, "data", "performance.csv");
const outPath = join(repoRoot, "data", "insights.md");
const csv = readFileSync(csvPath, "utf8");
writeFileSync(outPath, generateInsights(csv));
console.log(`Wrote ${outPath} (${normalizeRows(csv).length} rows)`);
