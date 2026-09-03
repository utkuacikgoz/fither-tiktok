// Loads and validates a video spec (the .json sidecar next to each script .md).
import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { policyViolations } from "./policy.mjs";
import { SOUND_PROFILES } from "./sound.mjs";
import { loadAnimationLibrary } from "./animations.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FORMATS = new Set(["environment-pov", "text-on-screen", "animated-demo", "slideshow", "single"]);
// Formats rendered as still images rather than video: no voiceover, no sound
// bed, no 45-60s contract. A carousel is many slides, a single is one.
const STILL_FORMATS = new Set(["slideshow", "single"]);
export const SLIDE_COUNTS = { slideshow: [4, 8], single: [1, 1] };

// The week ships each topic three ways (owner decision, 2026-09-03): the
// video, a carousel of the same idea, and a single-image hook from it. These
// are the three slots a post date must fill.
export const POST_SLOTS = ["video", "carousel", "single"];
export function postSlot(format) {
  if (format === "slideshow") return "carousel";
  if (format === "single") return "single";
  return FORMATS.has(format) ? "video" : null;
}
const PILLARS = new Set(["Constraint", "Skill ladder", "Reframe", "Fast tips", "Behind the build"]);
const HOOKS = new Set(["contradiction", "situation", "number", "promise"]);
const OVERLAY_STYLES = new Set(["hook", "step", "cta"]);

let movementNames;
let approvedDemoMovements;
let approvedAnimationMovements;

function loadMovementNames() {
  if (movementNames) return movementNames;
  const file = join(repoRoot, ".claude", "skills", "fither-voice", "references", "movement-library.md");
  movementNames = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\|\s*[1-6]\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (match) movementNames.add(match[1]);
  }
  return movementNames;
}

function loadApprovedDemoMovements() {
  if (approvedDemoMovements) return approvedDemoMovements;
  const file = join(repoRoot, "assets", "demo-library.json");
  approvedDemoMovements = new Set(Object.keys(JSON.parse(readFileSync(file, "utf8")).movements ?? {}));
  return approvedDemoMovements;
}

function loadApprovedAnimationMovements() {
  if (approvedAnimationMovements) return approvedAnimationMovements;
  approvedAnimationMovements = new Set(Object.keys(loadAnimationLibrary().movements ?? {}));
  return approvedAnimationMovements;
}

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const wordCount = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;

export function validateSpec(spec, options = {}) {
  const errors = [];
  const warnings = [];
  const movements = options.movementNames ?? loadMovementNames();
  const demos = options.approvedDemoMovements ?? loadApprovedDemoMovements();
  const animations = options.approvedAnimationMovements ?? loadApprovedAnimationMovements();
  const error = (message) => errors.push(message);
  const warn = (message) => warnings.push(message);
  const needString = (key) => {
    if (typeof spec[key] !== "string" || !spec[key].trim()) error(`missing or empty "${key}"`);
  };

  ["slug", "week", "post_date", "format", "pillar", "hook_mechanism", "caption"].forEach(needString);

  if (typeof spec.slug === "string") {
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.slug)) {
      error(`slug "${spec.slug}" must be a dated, lowercase kebab-case slug`);
    }
    if (options.jsonPath && basename(options.jsonPath, ".json") !== spec.slug) {
      error(`slug "${spec.slug}" does not match sidecar filename "${basename(options.jsonPath, ".json")}"`);
    }
  }
  if (typeof spec.week === "string" && !/^(0[1-9]|[1-4]\d|5[0-3])$/.test(spec.week)) {
    error(`week "${spec.week}" must be 01-53`);
  }
  if (typeof spec.post_date === "string") {
    const parsed = new Date(`${spec.post_date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.post_date) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== spec.post_date) {
      error(`post_date "${spec.post_date}" is not a real YYYY-MM-DD date`);
    }
    if (typeof spec.slug === "string" && !spec.slug.startsWith(`${spec.post_date}-`)) {
      error(`slug must begin with post_date "${spec.post_date}"`);
    }
  }
  if (typeof spec.format === "string" && !FORMATS.has(spec.format)) error(`format "${spec.format}" is unknown`);
  if (typeof spec.pillar === "string" && !PILLARS.has(spec.pillar)) error(`pillar "${spec.pillar}" is unknown`);
  if (typeof spec.hook_mechanism === "string" && !HOOKS.has(spec.hook_mechanism)) {
    error(`hook_mechanism "${spec.hook_mechanism}" is unknown`);
  }
  if (STILL_FORMATS.has(spec.format)) {
    if (spec.sound?.profile !== "platform") error(`${spec.format} sound.profile must be "platform"`);
  } else if (!spec.sound || typeof spec.sound !== "object") {
    error("video formats require a sound contract");
  } else {
    if (!SOUND_PROFILES.has(spec.sound.profile)) error(`sound profile "${spec.sound.profile}" is unknown`);
    if (!isFiniteNumber(spec.sound.bed_gain_db) || spec.sound.bed_gain_db < -22 || spec.sound.bed_gain_db > -12) {
      error("sound bed_gain_db must be between -22 and -12 dB");
    }
  }
  if (!Array.isArray(spec.hashtags) || spec.hashtags.length === 0) {
    error("hashtags must be a non-empty array");
  } else {
    const seen = new Set();
    spec.hashtags.forEach((tag, i) => {
      if (typeof tag !== "string" || !/^#[A-Za-z0-9]+$/.test(tag)) error(`hashtags[${i}] is invalid`);
      const normalized = String(tag).toLowerCase();
      if (seen.has(normalized)) error(`hashtags[${i}] duplicates "${tag}"`);
      seen.add(normalized);
    });
  }

  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) {
    error("scenes must be a non-empty array");
  } else {
    let prevEnd = 0;
    let animationScenes = 0;
    spec.scenes.forEach((scene, i) => {
      if (!isFiniteNumber(scene.start) || !isFiniteNumber(scene.end) || scene.end <= scene.start) {
        error(`scene ${i}: bad start/end`);
      } else if (Math.abs(scene.start - prevEnd) > 0.001) {
        error(`scene ${i}: starts at ${scene.start}, previous ended at ${prevEnd} (scenes must be contiguous)`);
      }
      if (scene.demo === true && !scene.movement) error(`scene ${i}: demo scenes require a movement`);
      if (scene.animation === true && !scene.movement) error(`scene ${i}: animation scenes require a movement`);
      if (scene.demo === true && scene.animation === true) error(`scene ${i}: demo and animation are mutually exclusive`);
      if ((scene.demo === true || scene.animation === true) && scene.broll_query != null) {
        error(`scene ${i}: movement visuals cannot also declare broll_query`);
      }
      if (scene.movement && scene.demo !== true && scene.animation !== true) {
        error(`scene ${i}: movement requires demo: true or animation: true`);
      }
      if (scene.movement && !movements.has(scene.movement)) error(`scene ${i}: movement "${scene.movement}" is not in the movement library`);
      if (scene.demo === true && scene.movement && !demos.has(scene.movement)) {
        error(`scene ${i}: "${scene.movement}" has no owner-approved demo in assets/demo-library.json`);
      }
      if (scene.animation === true) {
        animationScenes++;
        if (spec.format !== "animated-demo") error(`scene ${i}: animation requires format "animated-demo"`);
        if (scene.movement && !animations.has(scene.movement)) {
          error(`scene ${i}: "${scene.movement}" has no approved authored export in assets/animation-library.json`);
        }
      }
      if (scene.broll_query != null && (typeof scene.broll_query !== "string" || !scene.broll_query.trim())) {
        error(`scene ${i}: broll_query must be a non-empty string`);
      }
      if (!Array.isArray(scene.overlays) || scene.overlays.length === 0) warn(`scene ${i}: no overlays`);
      if (STILL_FORMATS.has(spec.format)) {
        if (scene.overlays?.length !== 1) error(`slide ${i + 1}: requires exactly one overlay`);
        if (typeof scene.kicker !== "string" || !scene.kicker.trim()) error(`slide ${i + 1}: requires a kicker`);
        if (typeof scene.footer !== "string" || !scene.footer.trim()) error(`slide ${i + 1}: requires a footer`);
      }
      for (const [j, overlay] of (scene.overlays ?? []).entries()) {
        if (!isFiniteNumber(overlay.t) || typeof overlay.text !== "string" || !overlay.text.trim()) {
          error(`scene ${i} overlay ${j}: needs numeric t and text`);
        } else if (isFiniteNumber(scene.start) && isFiniteNumber(scene.end) && (overlay.t < scene.start - 0.001 || overlay.t >= scene.end)) {
          error(`scene ${i} overlay ${j}: t=${overlay.t} is outside the scene`);
        }
        if (!OVERLAY_STYLES.has(overlay.style)) error(`scene ${i} overlay ${j}: style "${overlay.style}" is unknown`);
        if (typeof overlay.text === "string" && overlay.text.length > 90) warn(`scene ${i} overlay ${j}: text is over 90 characters`);
      }
      if (isFiniteNumber(scene.end)) prevEnd = scene.end;
    });
    spec.duration = prevEnd;
    if (spec.format === "animated-demo" && animationScenes === 0) {
      error('format "animated-demo" requires at least one animation scene');
    }
    if (STILL_FORMATS.has(spec.format)) {
      const [min, max] = SLIDE_COUNTS[spec.format];
      if (spec.scenes.length < min || spec.scenes.length > max) {
        error(min === max ? `${spec.format} requires exactly ${min} slide` : `${spec.format} requires ${min}-${max} slides`);
      }
    } else {
      if (prevEnd < 45) warn(`duration ${prevEnd}s is below the 45-60s brief`);
      if (prevEnd > 60) error(`duration ${prevEnd}s exceeds the 45-60s brief`);
    }

    const firstOverlays = spec.scenes[0]?.overlays ?? [];
    if (!firstOverlays.some((overlay) => overlay.style === "hook" && Math.abs(overlay.t) < 0.001)) {
      error("first scene needs a hook overlay at 0s");
    }
    // A single post has one frame, and that frame is the hook. The voice
    // rule that a piece ends on an answerable question still holds, so the
    // question moves to the caption, which is the only other surface it has.
    if (spec.format === "single") {
      if (!String(spec.caption ?? "").trim().includes("?")) {
        error("single needs a question in its caption, which is where its CTA lives");
      }
    } else {
      const lastOverlays = spec.scenes.at(-1)?.overlays ?? [];
      if (!lastOverlays.some((overlay) => overlay.style === "cta" && String(overlay.text).trim().endsWith("?"))) {
        error("last scene needs a question CTA overlay");
      }
    }
  }

  if (!STILL_FORMATS.has(spec.format)) {
    if (!Array.isArray(spec.voiceover) || spec.voiceover.length === 0) {
      error("video formats need a non-empty voiceover array");
    } else {
      let previous = -1;
      spec.voiceover.forEach((line, i) => {
        if (!isFiniteNumber(line.t) || typeof line.text !== "string" || !line.text.trim()) {
          error(`voiceover ${i}: needs numeric t and text`);
        } else {
          if (line.t < previous) error(`voiceover ${i}: lines must be time-ordered`);
          if (isFiniteNumber(spec.duration) && line.t >= spec.duration) error(`voiceover ${i}: starts after the video ends`);
          if (wordCount(line.text) > 16) warn(`voiceover ${i}: exceeds 16 words`);
          previous = line.t;
        }
      });
      if (!String(spec.voiceover.at(-1)?.text ?? "").trim().endsWith("?")) error("final voiceover line must be a question CTA");
    }
  }

  for (const violation of policyViolations(spec)) error(`forbidden copy: ${violation}`);
  return { errors, warnings };
}

export function loadSpec(jsonPath) {
  if (!existsSync(jsonPath)) {
    throw new Error(
      `Missing spec ${jsonPath}. The video-writer emits a .json sidecar per script; write one for this video first.`,
    );
  }
  let spec;
  try {
    spec = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (cause) {
    throw new Error(`Invalid JSON in ${jsonPath}: ${cause.message}`);
  }
  const { errors } = validateSpec(spec, { jsonPath });
  if (errors.length) throw new Error(`Invalid spec ${jsonPath}:\n  - ${errors.join("\n  - ")}`);
  return spec;
}

// Overlay display window: from its start time to the next overlay in the
// same scene, or the scene end.
export function overlayWindows(spec) {
  const out = [];
  for (const s of spec.scenes) {
    const os = [...(s.overlays ?? [])].sort((a, b) => a.t - b.t);
    os.forEach((o, i) => {
      out.push({ ...o, start: o.t, end: i + 1 < os.length ? os[i + 1].t : s.end });
    });
  }
  return out;
}
