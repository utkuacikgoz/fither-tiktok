import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./env.mjs";

export function loadShotHistory(file = join(repoRoot, "data", "shot-history.json")) {
  if (!existsSync(file)) return { version: 1, posted: [] };
  const history = JSON.parse(readFileSync(file, "utf8"));
  if (history.version !== 1 || !Array.isArray(history.posted)) {
    throw new Error("data/shot-history.json must contain version 1 and a posted array");
  }
  return history;
}

export function shotHistoryIds(history = loadShotHistory()) {
  return new Set((history.posted ?? []).map((entry) => entry.asset_id).filter(Boolean));
}

export function auditShotUsage(records, history = loadShotHistory()) {
  const errors = [];
  const seen = new Map();
  const historic = new Map((history.posted ?? []).map((entry) => [entry.asset_id, entry]));
  const assets = [];

  for (const record of records) {
    for (const asset of record.assets ?? []) {
      if (!asset.asset_id) {
        errors.push(`${record.slug} scene ${asset.scene_start}: selected footage has no asset identity`);
        continue;
      }
      const use = { ...asset, slug: record.slug, week: record.week, post_date: record.post_date };
      const prior = seen.get(asset.asset_id);
      if (prior) {
        errors.push(`${asset.asset_id} repeats in ${prior.slug} and ${record.slug}`);
      } else {
        seen.set(asset.asset_id, use);
      }
      const posted = historic.get(asset.asset_id);
      if (posted) errors.push(`${asset.asset_id} already posted in ${posted.slug}`);
      assets.push(use);
    }
  }

  let report = "# Shot identity report\n\n";
  report += `- Rendered assets: **${assets.length}**\n`;
  report += `- Distinct identities: **${seen.size}**\n`;
  report += `- Recorded prior identities: **${historic.size}**\n`;
  report += `- Reuse violations: **${errors.length}**\n`;
  report += "\n| Post | Scene | Kind | Asset identity | Source intent |\n|---|---:|---|---|---|\n";
  for (const asset of assets) {
    report += `| ${asset.slug} | ${asset.scene_start}s | ${asset.kind} | ${asset.asset_id} | ${asset.movement ?? asset.query ?? "—"} |\n`;
  }
  if (errors.length) {
    report += "\n## Blockers\n\n";
    for (const error of errors) report += `- ${error}\n`;
  }
  return { errors, assets, report };
}
