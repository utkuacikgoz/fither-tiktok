export function readyAnimations(markdown) {
  const heading = /^## Ready\s*$/m.exec(markdown);
  if (!heading) return [];
  const tail = markdown.slice(heading.index + heading[0].length);
  const nextHeading = /^##\s/m.exec(tail);
  const section = (nextHeading ? tail.slice(0, nextHeading.index) : tail).replace(/<!--[\s\S]*?-->/g, "");
  return [...section.matchAll(/^-\s+[^\s]+\s+\(([^)]+)\)/gm)].map((match) => match[1]);
}

export function buildAssetReport(specs, library, animationsMarkdown) {
  const errors = [];
  const warnings = [];
  const entries = library.movements ?? {};
  const ids = new Map();
  const usage = new Map();
  const environmentQueries = new Set();

  for (const [movement, clips] of Object.entries(entries)) {
    if (!Array.isArray(clips) || clips.length === 0) errors.push(`${movement}: approved clip list is empty`);
    for (const [index, clip] of (clips ?? []).entries()) {
      if (!Number.isInteger(clip.pexels_id) || clip.pexels_id <= 0) errors.push(`${movement}[${index}]: invalid pexels_id`);
      if (!(Number(clip.duration) > 0)) errors.push(`${movement}[${index}]: invalid duration`);
      if (!/^https:\/\/www\.pexels\.com\/video\//.test(clip.pexels_url ?? "")) errors.push(`${movement}[${index}]: invalid Pexels URL`);
      if (ids.has(clip.pexels_id)) errors.push(`${movement}[${index}]: Pexels ID duplicates ${ids.get(clip.pexels_id)}`);
      ids.set(clip.pexels_id, movement);
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
      if (scene.broll_query) environmentQueries.add(scene.broll_query.trim().toLowerCase());
    }
  }

  const movements = [...new Set([...Object.keys(entries), ...usage.keys()])].sort();
  for (const movement of movements) {
    const clips = entries[movement]?.length ?? 0;
    const used = usage.get(movement)?.scenes ?? 0;
    if (used > 0 && clips < 3) warnings.push(`${movement}: ${clips} approved clip(s) for ${used} Week 01 demo scene(s); AAA target is 3+`);
  }

  const animations = readyAnimations(animationsMarkdown);
  let report = `# Asset readiness (generated — run \`node pipeline/assets.mjs\`)\n\n`;
  report += `- Approved body-only clips: **${ids.size}** across **${Object.keys(entries).length}** movements\n`;
  report += `- Demo scenes in current sidecars: **${[...usage.values()].reduce((sum, item) => sum + item.scenes, 0)}**\n`;
  report += `- Distinct environment searches: **${environmentQueries.size}**\n`;
  report += `- Ready authored animations: **${animations.length}**\n`;
  report += `- Thin used movements (<3 approved clips): **${movements.filter((movement) => (usage.get(movement)?.scenes ?? 0) > 0 && (entries[movement]?.length ?? 0) < 3).length}**\n`;
  report += `\n## Movement footage\n\n| Movement | Approved clips | Demo scenes | Videos | Readiness |\n|---|---:|---:|---:|---|\n`;
  for (const movement of movements) {
    const clips = entries[movement]?.length ?? 0;
    const used = usage.get(movement);
    const state = !used ? "Library only" : clips >= 3 ? "AAA pool" : clips > 0 ? "Thin" : "Blocked";
    report += `| ${movement} | ${clips} | ${used?.scenes ?? 0} | ${used?.videos.size ?? 0} | ${state} |\n`;
  }
  report += `\n## Provider boundary\n\n`;
  report += `Generative providers may supply environment footage only. Exercise form stays owner-shot or authored animation. Premium generations happen during curation, pass the same faceless review, and enter an approved cached library before weekly rendering.\n`;
  if (warnings.length) {
    report += `\n## Curation queue\n\n`;
    for (const warning of warnings) report += `- ${warning}\n`;
  }
  return { report, errors, warnings };
}
