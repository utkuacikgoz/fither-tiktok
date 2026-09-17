#!/usr/bin/env node
// Cheap, deterministic preflight for every sidecar. This runs before any
// paid API call, browser launch, model load or ffmpeg render.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { postSlot, validateSpec } from "./lib/spec.mjs";
import { policyTextViolations } from "./lib/policy.mjs";
import { normalizeRows } from "./lib/analytics.mjs";
import { validateExperiments } from "./lib/experiments.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const strict = process.argv.includes("--strict");
const requested = process.argv.slice(2).filter((arg) => arg !== "--strict");
const scriptsDir = join(repoRoot, "content", "scripts");
const files = requested.length
  ? requested.map((file) => file.startsWith("/") ? file : join(repoRoot, file))
  : readdirSync(scriptsDir).filter((file) => file.endsWith(".json")).sort().map((file) => join(scriptsDir, file));

let errorCount = 0;
let warningCount = 0;
const slugs = new Map();
const dates = new Map();
const weeks = new Map();

for (const file of files) {
  let spec;
  try {
    spec = JSON.parse(readFileSync(file, "utf8"));
  } catch (cause) {
    console.error(`ERROR ${file}: invalid JSON (${cause.message})`);
    errorCount++;
    continue;
  }
  const label = basename(file);
  const { errors, warnings } = validateSpec(spec, { jsonPath: file });
  const markdownPath = file.replace(/\.json$/, ".md");
  if (!existsSync(markdownPath)) {
    errors.push("matching human-readable .md script is missing");
  } else {
    const markdown = readFileSync(markdownPath, "utf8");
    for (const [index, voice] of (spec.voiceover ?? []).entries()) {
      if (voice.text && !markdown.includes(`"${voice.text}"`)) {
        errors.push(`voiceover ${index} text is not synchronized with the .md script`);
      }
    }
    // Reuse notes are internal product planning. Everything before them is
    // script, hook, shot or caption material and must obey the publishable
    // copy policy, including hook options that were not selected in JSON.
    const publishableDraft = markdown.split(/^## 5\. REUSE NOTE/m)[0];
    for (const violation of policyTextViolations(publishableDraft, ".md publishable sections")) {
      errors.push(`forbidden copy: ${violation}`);
    }
  }
  if (slugs.has(spec.slug)) errors.push(`slug duplicates ${slugs.get(spec.slug)}`);
  // A date carries several carousels now (three a day since 2026-09-17),
  // so only the video and single slots collide on a shared date.
  const slot = postSlot(spec.format);
  const dateKey = `${spec.post_date}|${slot}`;
  if (slot !== "carousel" && dates.has(dateKey)) errors.push(`post_date duplicates ${dates.get(dateKey)} in the ${slot} slot`);
  slugs.set(spec.slug, label);
  dates.set(dateKey, label);
  if (!weeks.has(spec.week)) weeks.set(spec.week, []);
  weeks.get(spec.week).push(spec);

  for (const message of errors) console.error(`ERROR ${label}: ${message}`);
  for (const message of warnings) console.warn(`WARN  ${label}: ${message}`);
  errorCount += errors.length;
  warningCount += warnings.length;
}

if (!requested.length) {
  for (const [week, specs] of weeks) {
    const byDate = new Map();
    for (const spec of specs) {
      if (!byDate.has(spec.post_date)) byDate.set(spec.post_date, new Map());
      byDate.get(spec.post_date).set(postSlot(spec.format), spec.slug);
    }
    if (byDate.size !== 7) {
      console.warn(`WARN  week ${week}: expected 7 post dates, found ${byDate.size}`);
      warningCount++;
    }
    // Every date owes at least one carousel (the week is carousels since
    // 2026-09-17). Video and single are optional extras, not owed slots.
    for (const [date, slots] of [...byDate].sort()) {
      if (!slots.has("carousel")) {
        console.warn(`WARN  week ${week} ${date}: missing carousel`);
        warningCount++;
      }
    }
  }
  const experimentsPath = join(repoRoot, "content", "experiments.md");
  const performancePath = join(repoRoot, "data", "performance.csv");
  const { experiments, errors } = validateExperiments(
    readFileSync(experimentsPath, "utf8"),
    normalizeRows(readFileSync(performancePath, "utf8")),
  );
  for (const message of errors) console.error(`ERROR experiments.md: ${message}`);
  errorCount += errors.length;
  console.log(`Validated ${experiments.length} experiment record(s).`);
}

console.log(`Validated ${files.length} sidecar(s): ${errorCount} error(s), ${warningCount} warning(s).`);
if (errorCount > 0 || (strict && warningCount > 0)) process.exit(1);
