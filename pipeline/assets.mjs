#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAssetReport } from "./lib/assets.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const scriptsDir = join(repoRoot, "content", "scripts");
const specs = readdirSync(scriptsDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(scriptsDir, file), "utf8")));
const library = JSON.parse(readFileSync(join(repoRoot, "assets", "demo-library.json"), "utf8"));
const animations = JSON.parse(readFileSync(join(repoRoot, "assets", "animation-library.json"), "utf8"));
const environments = JSON.parse(readFileSync(join(repoRoot, "assets", "environment-library.json"), "utf8"));
const book = JSON.parse(readFileSync(join(repoRoot, "assets", "generation-prompts.json"), "utf8"));
const outPath = join(repoRoot, "data", "assets.md");
const { report, errors, warnings } = buildAssetReport(specs, library, animations, environments, book);

for (const error of errors) console.error(`ERROR ${error}`);
for (const warning of warnings) console.warn(`WARN  ${warning}`);
if (errors.length) process.exit(1);

if (process.argv.includes("--check")) {
  const current = readFileSync(outPath, "utf8");
  if (current !== report) {
    console.error("ERROR data/assets.md is stale; run node pipeline/assets.mjs");
    process.exit(1);
  }
} else {
  writeFileSync(outPath, report);
}
console.log(`Asset readiness: ${errors.length} error(s), ${warnings.length} warning(s).`);
