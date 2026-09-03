import { validateAnimationLibrary } from "./animations.mjs";

export function buildAssetReport(specs, library, animationLibrary) {
  const errors = [];
  const warnings = [];
  const entries = library.movements ?? {};
  const quarantined = library.quarantined ?? [];
  const ids = new Map();
  const usage = new Map();
  const environmentQueries = new Set();
  const animationUsage = new Map();

  for (const [movement, clips] of Object.entries(entries)) {
    if (!Array.isArray(clips) || clips.length === 0) errors.push(`${movement}: approved clip list is empty`);
    for (const [index, clip] of (clips ?? []).entries()) {
      if (!new Set(["pexels", "owned", "generated"]).has(clip.source)) {
        errors.push(`${movement}[${index}]: source must be pexels, owned or generated`);
      }
      if (!(Number(clip.duration) > 0)) errors.push(`${movement}[${index}]: invalid duration`);
      if (clip.source === "pexels") {
        if (!Number.isInteger(clip.pexels_id) || clip.pexels_id <= 0) errors.push(`${movement}[${index}]: invalid pexels_id`);
        if (!/^https:\/\/www\.pexels\.com\/video\//.test(clip.pexels_url ?? "")) errors.push(`${movement}[${index}]: invalid Pexels URL`);
      }
      // Owned and generated clips are both checksum-pinned files fetched
      // from a URL; generated ones additionally carry their provenance so
      // a reviewer can see which model and prompt produced the footage.
      if (clip.source === "owned" || clip.source === "generated") {
        if (!/^https:\/\//.test(clip.url ?? "")) errors.push(`${movement}[${index}]: ${clip.source} clip needs an HTTPS url`);
        if (!/^[a-f0-9]{64}$/.test(clip.sha256 ?? "")) errors.push(`${movement}[${index}]: ${clip.source} clip needs a lowercase SHA-256`);
      }
      if (clip.source === "generated") {
        if (clip.provider !== "runway") errors.push(`${movement}[${index}]: generated clip needs a known provider`);
        if (typeof clip.prompt !== "string" || !clip.prompt.trim()) errors.push(`${movement}[${index}]: generated clip needs its prompt`);
      }
      if (clip.movement_verified !== true) errors.push(`${movement}[${index}]: movement_verified must be true`);
      if (clip.faceless_verified !== true) errors.push(`${movement}[${index}]: faceless_verified must be true`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(clip.reviewed_at ?? "")) errors.push(`${movement}[${index}]: invalid reviewed_at`);
      const id = clip.source === "pexels" ? `pexels:${clip.pexels_id}` : `${clip.source}:${clip.sha256}`;
      if (ids.has(id)) errors.push(`${movement}[${index}]: source duplicates ${ids.get(id)}`);
      ids.set(id, movement);
    }
  }

  if (!Array.isArray(quarantined)) {
    errors.push("quarantined must be an array");
  } else {
    for (const [index, clip] of quarantined.entries()) {
      const label = `quarantined[${index}]`;
      if (typeof clip.movement !== "string" || !clip.movement.trim()) errors.push(`${label}: missing movement`);
      if (!Number.isInteger(clip.pexels_id) || clip.pexels_id <= 0) errors.push(`${label}: invalid pexels_id`);
      if (!(Number(clip.duration) > 0)) errors.push(`${label}: invalid duration`);
      if (!/^https:\/\/www\.pexels\.com\/video\//.test(clip.pexels_url ?? "")) errors.push(`${label}: invalid Pexels URL`);
      if (typeof clip.reason !== "string" || !clip.reason.trim()) errors.push(`${label}: missing reason`);
      const id = `pexels:${clip.pexels_id}`;
      if (ids.has(id)) errors.push(`${label}: Pexels ID duplicates approved ${ids.get(id)}`);
    }
  }

  for (const spec of specs) {
    for (const scene of spec.scenes ?? []) {
      if (scene.demo && scene.movement) {
        if (!usage.has(scene.movement)) usage.set(scene.movement, { scenes: 0, videos: new Set() });
        const item = usage.get(scene.movement);
        item.scenes++;
        item.videos.add(spec.slug);
      }
      if (scene.animation && scene.movement) {
        if (!animationUsage.has(scene.movement)) animationUsage.set(scene.movement, { scenes: 0, videos: new Set() });
        const item = animationUsage.get(scene.movement);
        item.scenes++;
        item.videos.add(spec.slug);
      }
      if (scene.broll_query) environmentQueries.add(scene.broll_query.trim().toLowerCase());
    }
  }

  const replacementMovements = new Set(
    Array.isArray(quarantined) ? quarantined.map((clip) => clip.movement).filter(Boolean) : [],
  );
  const priorityMovements = new Set([...usage.keys(), ...replacementMovements]);
  const movements = [...new Set([...Object.keys(entries), ...priorityMovements])].sort();
  for (const movement of movements) {
    const clips = entries[movement]?.length ?? 0;
    const used = usage.get(movement)?.scenes ?? 0;
    if (priorityMovements.has(movement) && clips < 3) {
      const demand = used > 0 ? `${used} current demo scene(s)` : "quarantined legacy footage awaiting replacement";
      warnings.push(`${movement}: ${clips} approved clip(s); ${demand}; AAA target is 3+`);
    }
  }

  const animationState = validateAnimationLibrary(animationLibrary);
  errors.push(...animationState.errors.map((message) => `animation: ${message}`));
  let report = `# Asset readiness (generated — run \`node pipeline/assets.mjs\`)\n\n`;
  const approvedMovementCount = Object.keys(entries).length;
  report += `- Approved body-only clips: **${ids.size}** across **${approvedMovementCount}** ${approvedMovementCount === 1 ? "movement" : "movements"}\n`;
  report += `- Quarantined legacy clips: **${Array.isArray(quarantined) ? quarantined.length : 0}**\n`;
  report += `- Demo scenes in current sidecars: **${[...usage.values()].reduce((sum, item) => sum + item.scenes, 0)}**\n`;
  report += `- Distinct environment searches: **${environmentQueries.size}**\n`;
  report += `- Ready authored animation exports: **${animationState.count}** across **${animationState.readyMovements.size}** movements\n`;
  report += `- Priority movements below target (<3 approved clips): **${movements.filter((movement) => priorityMovements.has(movement) && (entries[movement]?.length ?? 0) < 3).length}**\n`;
  report += `\n## Movement footage\n\n| Movement | Approved clips | Demo scenes | Videos | Readiness |\n|---|---:|---:|---:|---|\n`;
  for (const movement of movements) {
    const clips = entries[movement]?.length ?? 0;
    const used = usage.get(movement);
    const state = priorityMovements.has(movement)
      ? clips >= 3 ? "AAA pool" : clips > 0 ? "Thin" : "Blocked"
      : "Library only";
    report += `| ${movement} | ${clips} | ${used?.scenes ?? 0} | ${used?.videos.size ?? 0} | ${state} |\n`;
  }
  report += `\n## Authored animations\n\n| Movement | Approved exports | Current scenes | Videos | Readiness |\n|---|---:|---:|---:|---|\n`;
  const animationMovements = [...new Set([
    ...Object.keys(animationLibrary?.movements ?? {}),
    ...animationUsage.keys(),
  ])].sort();
  if (animationMovements.length === 0) {
    report += `| — | 0 | 0 | 0 | Awaiting authored exports |\n`;
  } else {
    for (const movement of animationMovements) {
      const exports = animationLibrary?.movements?.[movement]?.length ?? 0;
      const used = animationUsage.get(movement);
      report += `| ${movement} | ${exports} | ${used?.scenes ?? 0} | ${used?.videos.size ?? 0} | ${exports > 0 ? "Ready" : "Blocked"} |\n`;
    }
  }
  report += `\n## Provider boundary\n\n`;
  report += `Runway may generate candidate footage. Nothing it produces is approved by the machine: every generated clip passes the faceless gate and then full-motion editorial review before entering the approved library used by weekly rendering.\n`;
  if (warnings.length) {
    report += `\n## Curation queue\n\n`;
    for (const warning of warnings) report += `- ${warning}\n`;
  }
  return { report, errors, warnings };
}
