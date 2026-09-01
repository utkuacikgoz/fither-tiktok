#!/usr/bin/env node
// Regenerates .claude/skills/fither-voice/references/movement-library.md
// from the app repo's data/movements.json. Usage:
//   node scripts/refresh-movement-library.mjs /path/to/fither-checkout
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRepo = process.argv[2];
if (!appRepo) {
  console.error("Usage: node scripts/refresh-movement-library.mjs <path-to-fither-checkout>");
  process.exit(1);
}

const { movements } = JSON.parse(
  readFileSync(join(appRepo, "data", "movements.json"), "utf8"),
);

const patterns = ["push", "pull", "squat", "hinge", "core"];
const byPattern = Object.fromEntries(patterns.map((p) => [p, []]));
for (const m of movements) byPattern[m.pattern].push(m);
for (const p of patterns) byPattern[p].sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));

const timing = (m) =>
  m.timing.type === "reps" ? `${m.timing.defaultValue} reps` : `${m.timing.defaultValue}s hold`;

let out = `# FITHER movement library (generated — do not edit by hand)

Source of truth: \`data/movements.json\` in the app repo. Regenerate with
\`node scripts/refresh-movement-library.mjs <path-to-fither-checkout>\`.

${movements.length} movements, five patterns, tiers 1–6. **Every movement is
quiet-safe** (no jumping, no impact) and needs at most a wall or a chair —
"silent" and "no equipment" are library-wide facts, safe to claim in content.
Scripts may only name movements on this list. Unsure? Name the pattern instead.

Loads listed per movement are the joints/areas the movement stresses — useful
for honest "sore today" content. Note: there are no wrist-neutral push
variants; every push movement loads the wrists.
`;

for (const p of patterns) {
  out += `\n## ${p} (${byPattern[p].length})\n\n`;
  out += `| Tier | Movement | Equipment | Default | Loads |\n|---|---|---|---|---|\n`;
  for (const m of byPattern[p]) {
    out += `| ${m.tier} | ${m.name} | ${m.equipment} | ${timing(m)} | ${m.loads.join(", ")} |\n`;
  }
}

const dest = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".claude/skills/fither-voice/references/movement-library.md",
);
writeFileSync(dest, out);
console.log(`Wrote ${dest} (${movements.length} movements)`);
