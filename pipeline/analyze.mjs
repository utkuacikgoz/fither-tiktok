#!/usr/bin/env node
// Turns data/performance.csv into data/insights.md: derived metrics,
// pillar/format/hook aggregates, kill-criteria and launch-signal checks.
// Deterministic and dependency-free; the planner reads the output, never
// the raw CSV. Run: node pipeline/analyze.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./lib/env.mjs";

const csvPath = join(repoRoot, "data", "performance.csv");
const outPath = join(repoRoot, "data", "insights.md");

function parseCsv(text) {
  const [header, ...lines] = text.trim().split("\n");
  const cols = header.split(",");
  return lines
    .filter((l) => l.trim())
    .map((l) => {
      // Minimal quoted-field support for free-text columns.
      const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) =>
        c.replace(/,$/, "").replace(/^"|"$/g, "").replaceAll('""', '"'),
      );
      return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ""]));
    });
}

const rows = parseCsv(readFileSync(csvPath, "utf8")).map((r) => ({
  ...r,
  views: Number(r.views) || 0,
  watch_pct: Number(r.watch_pct) || 0,
  saves: Number(r.saves) || 0,
  follows: Number(r.follows) || 0,
  saves_per_1k: r.views > 0 ? (Number(r.saves) / Number(r.views)) * 1000 : 0,
  follows_per_1k: r.views > 0 ? (Number(r.follows) / Number(r.views)) * 1000 : 0,
}));

const f1 = (n) => n.toFixed(1);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const by = (key) => {
  const groups = {};
  for (const r of rows) (groups[r[key] || "(blank)"] ??= []).push(r);
  return groups;
};

let out = `# Insights (generated — do not edit; run \`node pipeline/analyze.mjs\`)\n\nSource: data/performance.csv, ${rows.length} posted video${rows.length === 1 ? "" : "s"}.\n`;

if (rows.length === 0) {
  out += `\nNo performance rows yet. Plan on strategy priors, not data: watch %\nfirst, saves per 1000 second, views are noise for 60 days.\n`;
} else {
  out += `\n## Channel\n\n- Average watch %: **${f1(mean(rows.map((r) => r.watch_pct)))}** (target >50)\n- Saves per 1000 views: **${f1(mean(rows.map((r) => r.saves_per_1k)))}** (strong >15)\n- Follows per 1000 views: **${f1(mean(rows.map((r) => r.follows_per_1k)))}** (good faceless >3)\n`;

  for (const [key, label] of [["pillar", "Pillar"], ["format", "Format"], ["hook_mechanism", "Hook mechanism"]]) {
    const groups = Object.entries(by(key)).sort(
      (a, b) => mean(b[1].map((r) => r.watch_pct)) - mean(a[1].map((r) => r.watch_pct)),
    );
    out += `\n## By ${label.toLowerCase()}\n\n| ${label} | n | Watch % | Saves/1k | Follows/1k |\n|---|---|---|---|---|\n`;
    for (const [g, rs] of groups) {
      out += `| ${g} | ${rs.length} | ${f1(mean(rs.map((r) => r.watch_pct)))} | ${f1(mean(rs.map((r) => r.saves_per_1k)))} | ${f1(mean(rs.map((r) => r.follows_per_1k)))} |\n`;
    }
  }

  const sorted = [...rows].sort((a, b) => b.watch_pct - a.watch_pct);
  out += `\n## Top 3 by watch %\n\n`;
  for (const r of sorted.slice(0, 3)) out += `- ${r.slug}: ${f1(r.watch_pct)}% watch, ${f1(r.saves_per_1k)} saves/1k (${r.pillar}, ${r.format})\n`;
  out += `\n## Bottom 3 by watch %\n\n`;
  for (const r of sorted.slice(-3).reverse()) out += `- ${r.slug}: ${f1(r.watch_pct)}% watch, ${f1(r.saves_per_1k)} saves/1k (${r.pillar}, ${r.format})\n`;

  // Kill criteria: pillar under 30% average watch for 3 consecutive weeks.
  out += `\n## Kill criteria check\n\n`;
  let flagged = false;
  for (const [pillar, rs] of Object.entries(by("pillar"))) {
    const weeks = {};
    for (const r of rs) (weeks[r.week] ??= []).push(r.watch_pct);
    const ordered = Object.keys(weeks).sort();
    let streak = 0;
    for (const w of ordered) streak = mean(weeks[w]) < 30 ? streak + 1 : 0;
    if (streak >= 3) {
      out += `- **${pillar} is under 30% watch for ${streak} straight weeks — the kill rule says cut it. Say so in the plan.**\n`;
      flagged = true;
    } else if (streak > 0) {
      out += `- ${pillar}: under 30% for ${streak} week${streak > 1 ? "s" : ""} (kill at 3).\n`;
      flagged = true;
    }
  }
  if (!flagged) out += `Nothing near the kill line.\n`;

  // Launch signal: 3+ videos with >60% watch and >20 saves/1k.
  const launch = rows.filter((r) => r.watch_pct > 60 && r.saves_per_1k > 20);
  out += `\n## Ready-to-launch signal\n\n${launch.length}/3 videos over 60% watch and 20 saves/1k`;
  out += launch.length >= 3 ? ` — **signal reached.** These hooks are the paid creative and the App Store screenshots:\n` : `.\n`;
  for (const r of launch) out += `- ${r.slug}: ${f1(r.watch_pct)}%, ${f1(r.saves_per_1k)} saves/1k\n`;

  // Hooks file harvest reminder, every 20 posted videos.
  if (rows.length >= 20) {
    const q3 = sorted[Math.floor(sorted.length / 4)].watch_pct;
    out += `\n## Hook harvest (every 20 videos)\n\nTop-quartile threshold is ${f1(q3)}% watch. Append the hooks of videos at or\nabove it to \`.claude/skills/fither-voice/references/hooks.md\` if not already there.\n`;
  }
}

writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${rows.length} rows)`);
