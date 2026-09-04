// Environment scenes: the 35-per-week half of the machine.
//
// A week's sidecars carry roughly one demo scene and thirty-five environment
// scenes, and it was the environment footage that failed week 01's review —
// a stock watermark, third-party gym branding, a kettlebell, a steering
// wheel standing in for an incline push-up. Query-based stock sourcing is
// retired for these (owner decision, 2026-09-03); they are generated with
// the recurring character in frame and approved by full-motion review, the
// same contract demo clips have always had.

// The query in a sidecar is already a shot description ("hands opening oven
// door"), so the prompt is composed from it rather than authored per query.
// What the query cannot say is which room it happens in, which the keyword
// map settles. First match wins, so the list is ordered most specific first.
export function resolveSetting(query, book) {
  const env = book?.environments;
  if (!env) throw new Error("shot book has no environments block");
  const text = String(query ?? "").toLowerCase();
  for (const [keyword, setting] of env.setting_keywords ?? []) {
    if (text.includes(keyword)) {
      if (!env.settings?.[setting]) throw new Error(`setting_keywords maps "${keyword}" to unknown setting "${setting}"`);
      return { setting, matched: keyword };
    }
  }
  const fallback = env.default_setting;
  if (!env.settings?.[fallback]) throw new Error(`default_setting "${fallback}" is not a known setting`);
  // A fallback is reported rather than silent: a query about a gym would
  // otherwise quietly become her living room, and review would have to
  // catch what the machine already knew.
  return { setting: fallback, matched: null };
}

export function buildEnvironmentPrompt(query, book, { limit = 1000 } = {}) {
  if (!query?.trim()) throw new Error("buildEnvironmentPrompt needs a query");
  const env = book.environments;
  const { setting, matched } = resolveSetting(query, book);
  const prompt = [
    `${query.trim()}.`,
    env.framing,
    env.settings[setting],
    book.wardrobe,
    book.light,
    book.camera,
    book.look,
  ].join(" ");
  const motion = `${query.trim()}, moving slowly and continuously through the whole shot.`;
  for (const [field, text] of [["prompt", prompt], ["motion", motion]]) {
    if (text.length > limit) throw new Error(`${query}: ${field} is ${text.length} chars, over Runway's ${limit} limit`);
  }
  return { prompt, motion, setting, matched };
}

const CLIP_SOURCES = new Set(["generated", "owned"]);

// Same shape and the same rigour as the demo library, with two differences:
// the key is the sidecar query rather than a movement name, and the verified
// field asks whether the clip shows what the query describes.
export function validateEnvironmentLibrary(library) {
  const errors = [];
  const queries = library?.queries ?? {};
  const ids = new Map();
  if (library && typeof library !== "object") errors.push("environment library must be an object");
  for (const [query, clips] of Object.entries(queries)) {
    if (!Array.isArray(clips) || clips.length === 0) {
      errors.push(`${query}: approved clip list is empty`);
      continue;
    }
    for (const [index, clip] of clips.entries()) {
      const label = `${query}[${index}]`;
      if (!CLIP_SOURCES.has(clip.source)) errors.push(`${label}: source must be generated or owned`);
      if (!(Number(clip.duration) > 0)) errors.push(`${label}: invalid duration`);
      if (!/^https:\/\//.test(clip.url ?? "")) errors.push(`${label}: needs an HTTPS url`);
      if (!/^[a-f0-9]{64}$/.test(clip.sha256 ?? "")) errors.push(`${label}: needs a lowercase SHA-256`);
      if (clip.source === "generated") {
        if (clip.provider !== "runway") errors.push(`${label}: generated clip needs a known provider`);
        if (typeof clip.prompt !== "string" || !clip.prompt.trim()) errors.push(`${label}: generated clip needs its prompt`);
      }
      if (clip.scene_verified !== true) errors.push(`${label}: scene_verified must be true`);
      // Generated footage is exempt from the faceless rule (owner override,
      // 2026-09-03): the person is synthetic. Owned footage is not.
      if (clip.source === "owned" && clip.faceless_verified !== true) {
        errors.push(`${label}: owned clip needs faceless_verified`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(clip.reviewed_at ?? "")) errors.push(`${label}: invalid reviewed_at`);
      const id = `${clip.source}:${clip.sha256}`;
      if (ids.has(id)) errors.push(`${label}: duplicates ${ids.get(id)}`);
      ids.set(id, query);
    }
  }
  return { errors, count: ids.size, queries: Object.keys(queries).length };
}
