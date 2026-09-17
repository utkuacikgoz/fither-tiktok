// Machine-enforced subset of the FITHER voice hard rules. The human-readable
// source of truth remains .claude/skills/fither-voice/references/forbidden.md;
// these patterns stop forbidden copy before it reaches paid APIs or a render.

const RULES = [
  // Shape words (tone, sculpt, shred, ripped, abs) were unbanned by owner
  // decision on 2026-09-16 so proven hook formats can ship as written; the
  // weight and diet-culture core stays banned.
  ["body or weight language", /\b(?:weight(?:\s*loss)?|weigh[ -]?in|pounds?|kilos?|scale|fat|slim(?:ming)?|skinny|bikini(?:\s*body)?|summer\s*body|snapback|problem\s*areas?)\b/i],
  ["food or calorie language", /\b(?:calories?|burn\s*off|earn\s+your\s+food|work\s+it\s+off|guilt[ -]?free|diet|cheat\s+(?:meal|day)|guilt)\b/i],
  ["shame or streak language", /\b(?:streak|don['’]t\s+break|you\s+missed\s+a\s+day|we\s+miss\s+you|don['’]t\s+lose\s+your\s+progress|no\s+excuses|what['’]s\s+stopping\s+you|just\s+a\s+quick\s+one|mini\s+workout)\b/i],
  ["persona-breaking language", /\b(?:crush\s+it|beast\s+mode|queen|girlie|slay|you\s+got\s+this|AMRAP|HIIT|EMOM)\b/i],
  ["warm-up product language", /\b(?:app|waitlist|launch|coming\s+soon)\b/i],
  ["medical claim", /\b(?:treats?|cures?|fixes?|heals?)\s+(?:an?\s+)?(?:injury|condition|pain)\b/i],
  ["transformation promise", /\btransform\s+your\s+body\s+in\b/i],
  ["unsupported wrist-friendly claim", /\bwrist[ -]?friendly\b/i],
  ["em dash punctuation", /—/],
];

function textSurfaces(spec) {
  const out = [];
  const add = (path, value) => typeof value === "string" && out.push({ path, value });
  add("title", spec.title);
  add("caption", spec.caption);
  for (const [i, tag] of (spec.hashtags ?? []).entries()) add(`hashtags[${i}]`, tag);
  for (const [i, line] of (spec.voiceover ?? []).entries()) add(`voiceover[${i}].text`, line.text);
  for (const [i, scene] of (spec.scenes ?? []).entries()) {
    add(`scenes[${i}].kicker`, scene.kicker);
    add(`scenes[${i}].footer`, scene.footer);
    for (const [j, overlay] of (scene.overlays ?? []).entries()) {
      add(`scenes[${i}].overlays[${j}].text`, overlay.text);
    }
  }
  return out;
}

export function policyViolations(spec) {
  const violations = [];
  for (const { path, value } of textSurfaces(spec)) {
    violations.push(...policyTextViolations(value, path));
  }
  return violations;
}

export function policyTextViolations(value, path = "text") {
  const violations = [];
  for (const [label, pattern] of RULES) {
    const match = pattern.exec(value);
    if (match) violations.push(`${path}: ${label} ("${match[0]}")`);
  }
  return violations;
}
