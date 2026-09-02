const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines[0]) return [];
  const cols = lines[0].split(",");
  return lines.slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((cell) =>
        cell.replace(/,$/, "").replace(/^"|"$/g, "").replaceAll('""', '"'),
      ) ?? [];
      return Object.fromEntries(cols.map((col, index) => [col, cells[index] ?? ""]));
    });
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value) {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeRows(csvText) {
  return parseCsv(csvText).map((row) => ({
    ...row,
    views: numberOrZero(row.views),
    watch_pct: numberOrZero(row.watch_pct),
    saves: numberOrZero(row.saves),
    follows: numberOrZero(row.follows),
    retention_dropoff_s: optionalNumber(row.retention_dropoff_s),
    completion_pct: optionalNumber(row.completion_pct),
  }));
}

const f1 = (number) => number.toFixed(1);
const mean = (numbers) => numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : 0;
const weightedMean = (rows, key) => {
  const withViews = rows.filter((row) => row.views > 0);
  const views = withViews.reduce((sum, row) => sum + row.views, 0);
  return views > 0
    ? withViews.reduce((sum, row) => sum + row[key] * row.views, 0) / views
    : mean(rows.map((row) => row[key]));
};
const ratePerThousand = (rows, key) => {
  const views = rows.reduce((sum, row) => sum + row.views, 0);
  return views > 0 ? rows.reduce((sum, row) => sum + row[key], 0) / views * 1000 : 0;
};
const optionalWeightedMean = (rows, key) => {
  const present = rows.filter((row) => row[key] != null);
  return present.length ? weightedMean(present, key) : null;
};
const groupBy = (rows, key) => {
  const groups = {};
  for (const row of rows) (groups[row[key] || "(blank)"] ??= []).push(row);
  return groups;
};

// Monday-based calendar week ordinal. This prevents Week 01 and Week 03
// from counting as consecutive merely because the missing week has no rows.
export function calendarWeekOrdinal(row) {
  const date = new Date(`${row.date_posted}T00:00:00Z`);
  if (!Number.isNaN(date.valueOf())) {
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    return Math.floor((date.valueOf() - daysSinceMonday * DAY_MS) / WEEK_MS);
  }
  const fallback = Number(row.week);
  return Number.isFinite(fallback) ? fallback : 0;
}

export function generateInsights(csvText) {
  const rows = normalizeRows(csvText);
  let out = `# Insights (generated — do not edit; run \`node pipeline/analyze.mjs\`)\n\nSource: data/performance.csv, ${rows.length} posted video${rows.length === 1 ? "" : "s"}.\n`;

  if (!rows.length) {
    return out + `\nNo performance rows yet. Plan on strategy priors, not data: watch %\nfirst, saves per 1000 second, views are noise for 60 days.\n`;
  }

  const dropoff = optionalWeightedMean(rows, "retention_dropoff_s");
  const completion = optionalWeightedMean(rows, "completion_pct");
  out += `\n## Channel\n\n`;
  out += `- View-weighted watch %: **${f1(weightedMean(rows, "watch_pct"))}** (target >50)\n`;
  out += `- Saves per 1000 views: **${f1(ratePerThousand(rows, "saves"))}** (strong >15)\n`;
  out += `- Follows per 1000 views: **${f1(ratePerThousand(rows, "follows"))}** (good faceless >3)\n`;
  out += `- View-weighted completion %: **${completion == null ? "not collected" : f1(completion)}**\n`;
  out += `- View-weighted retention drop-off: **${dropoff == null ? "not collected" : `${f1(dropoff)}s`}**\n`;

  for (const [key, label] of [["pillar", "Pillar"], ["format", "Format"], ["hook_mechanism", "Hook mechanism"]]) {
    const groups = Object.entries(groupBy(rows, key)).sort((a, b) => weightedMean(b[1], "watch_pct") - weightedMean(a[1], "watch_pct"));
    out += `\n## By ${label.toLowerCase()}\n\n| ${label} | n | Watch % | Saves/1k | Follows/1k | Completion % | Drop-off |\n|---|---|---|---|---|---|---|\n`;
    for (const [group, groupRows] of groups) {
      const groupCompletion = optionalWeightedMean(groupRows, "completion_pct");
      const groupDropoff = optionalWeightedMean(groupRows, "retention_dropoff_s");
      out += `| ${group} | ${groupRows.length} | ${f1(weightedMean(groupRows, "watch_pct"))} | ${f1(ratePerThousand(groupRows, "saves"))} | ${f1(ratePerThousand(groupRows, "follows"))} | ${groupCompletion == null ? "—" : f1(groupCompletion)} | ${groupDropoff == null ? "—" : `${f1(groupDropoff)}s`} |\n`;
    }
  }

  const sorted = [...rows].sort((a, b) => b.watch_pct - a.watch_pct);
  out += `\n## Top 3 by watch %\n\n`;
  for (const row of sorted.slice(0, 3)) out += `- ${row.slug}: ${f1(row.watch_pct)}% watch, ${f1(ratePerThousand([row], "saves"))} saves/1k (${row.pillar}, ${row.format})\n`;
  out += `\n## Bottom 3 by watch %\n\n`;
  for (const row of sorted.slice(-3).reverse()) out += `- ${row.slug}: ${f1(row.watch_pct)}% watch, ${f1(ratePerThousand([row], "saves"))} saves/1k (${row.pillar}, ${row.format})\n`;

  out += `\n## Kill criteria check\n\n`;
  let flagged = false;
  for (const [pillar, pillarRows] of Object.entries(groupBy(rows, "pillar"))) {
    const weeks = new Map();
    for (const row of pillarRows) {
      const ordinal = calendarWeekOrdinal(row);
      if (!weeks.has(ordinal)) weeks.set(ordinal, []);
      weeks.get(ordinal).push(row);
    }
    let streak = 0;
    let previous = null;
    for (const [ordinal, weekRows] of [...weeks.entries()].sort((a, b) => a[0] - b[0])) {
      if (previous != null && ordinal !== previous + 1) streak = 0;
      streak = weightedMean(weekRows, "watch_pct") < 30 ? streak + 1 : 0;
      previous = ordinal;
    }
    if (streak >= 3) {
      out += `- **${pillar} is under 30% watch for ${streak} straight calendar weeks — the kill rule says cut it. Say so in the plan.**\n`;
      flagged = true;
    } else if (streak > 0) {
      out += `- ${pillar}: under 30% for ${streak} straight calendar week${streak > 1 ? "s" : ""} (kill at 3).\n`;
      flagged = true;
    }
  }
  if (!flagged) out += `Nothing near the kill line.\n`;

  const launch = rows.filter((row) => row.watch_pct > 60 && ratePerThousand([row], "saves") > 20);
  out += `\n## Ready-to-launch signal\n\n${launch.length}/3 videos over 60% watch and 20 saves/1k`;
  out += launch.length >= 3 ? ` — **signal reached.** These hooks are the paid creative and the App Store screenshots:\n` : `.\n`;
  for (const row of launch) out += `- ${row.slug}: ${f1(row.watch_pct)}%, ${f1(ratePerThousand([row], "saves"))} saves/1k\n`;

  if (rows.length >= 20) {
    const threshold = sorted[Math.floor(sorted.length / 4)].watch_pct;
    out += `\n## Hook harvest (every 20 videos)\n\nTop-quartile threshold is ${f1(threshold)}% watch. Append the hooks of videos at or\nabove it to \`.claude/skills/fither-voice/references/hooks.md\` if not already there.\n`;
  }
  return out;
}

