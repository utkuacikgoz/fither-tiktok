// Authored movement animation ingestion. The renderer never accepts a search
// result or generative exercise clip: every export is explicitly approved,
// checksum-pinned and probed before it can make a coaching claim on screen.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { cacheDir, ensureDir, ffmpegPath, repoRoot } from "./env.mjs";
import { shotHistoryIds } from "./shots.mjs";

const pexec = promisify(execFile);
const SHA256 = /^[a-f0-9]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_EXPORT = /^assets\/animation-exports\/[A-Za-z0-9._/-]+\.(?:mp4|webm)$/;

export function animationIdentity(entry) {
  return `animation:${entry.sha256}`;
}

export function validateAnimationLibrary(library) {
  const errors = [];
  const identities = new Map();
  let count = 0;
  if (library?.version !== 1) errors.push("animation library must use version 1");
  if (!library?.movements || typeof library.movements !== "object" || Array.isArray(library.movements)) {
    errors.push("animation library movements must be an object");
    return { errors, count, readyMovements: new Set() };
  }

  const readyMovements = new Set();
  for (const [movement, entries] of Object.entries(library.movements)) {
    if (!Array.isArray(entries) || entries.length === 0) {
      errors.push(`${movement}: approved animation list is empty`);
      continue;
    }
    readyMovements.add(movement);
    for (const [index, entry] of entries.entries()) {
      const label = `${movement}[${index}]`;
      count++;
      if (entry.source !== "authored") errors.push(`${label}: source must be authored`);
      if (entry.rights !== "FITHER-owned") errors.push(`${label}: rights must be FITHER-owned`);
      const locations = [entry.path, entry.url].filter((value) => typeof value === "string" && value.length > 0);
      if (locations.length !== 1) errors.push(`${label}: provide exactly one path or HTTPS url`);
      if (entry.path != null && (!LOCAL_EXPORT.test(entry.path) || entry.path.includes(".."))) {
        errors.push(`${label}: path must be an MP4/WebM under assets/animation-exports`);
      }
      if (entry.url != null) {
        try {
          const url = new URL(entry.url);
          if (url.protocol !== "https:" || !/\.(?:mp4|webm)$/i.test(url.pathname)) throw new Error();
        } catch {
          errors.push(`${label}: url must be a direct HTTPS MP4/WebM URL`);
        }
      }
      if (!SHA256.test(entry.sha256 ?? "")) errors.push(`${label}: needs a lowercase SHA-256`);
      if (!(Number(entry.duration) > 0 && Number(entry.duration) <= 60)) errors.push(`${label}: duration must be greater than 0 and at most 60 seconds`);
      if (entry.width !== 1080 || entry.height !== 1920) errors.push(`${label}: export must be 1080x1920`);
      if (entry.fps !== 30) errors.push(`${label}: export must be 30 fps`);
      if (entry.loop_safe !== true) errors.push(`${label}: loop_safe must be true`);
      if (entry.movement_verified !== true) errors.push(`${label}: movement_verified must be true`);
      if (entry.faceless_verified !== true) errors.push(`${label}: faceless_verified must be true`);
      if (!DATE.test(entry.reviewed_at ?? "")) errors.push(`${label}: invalid reviewed_at`);
      if (SHA256.test(entry.sha256 ?? "")) {
        const identity = animationIdentity(entry);
        if (identities.has(identity)) errors.push(`${label}: export duplicates ${identities.get(identity)}`);
        identities.set(identity, movement);
      }
    }
  }
  return { errors, count, readyMovements };
}

export function validateAnimationCandidates(library) {
  const errors = [];
  if (library?.status !== "awaiting-qualified-coach-review") {
    errors.push("animation candidates must have awaiting-qualified-coach-review status");
  }
  const staged = structuredClone(library ?? {});
  delete staged.status;
  for (const [movement, entries] of Object.entries(staged.movements ?? {})) {
    for (const [index, entry] of (entries ?? []).entries()) {
      if (entry.movement_verified !== false) errors.push(`${movement}[${index}]: candidate movement_verified must be false`);
      if (entry.review_status !== "awaiting-qualified-coach-review") {
        errors.push(`${movement}[${index}]: invalid review_status`);
      }
      entry.movement_verified = true;
      entry.reviewed_at = "2000-01-01";
      delete entry.review_status;
      delete entry.app_movement_id;
    }
  }
  const state = validateAnimationLibrary(staged);
  errors.push(...state.errors);
  return { errors, count: state.count, movements: state.readyMovements };
}

export function loadAnimationLibrary(file = join(repoRoot, "assets", "animation-library.json")) {
  const library = JSON.parse(readFileSync(file, "utf8"));
  const { errors } = validateAnimationLibrary(library);
  if (errors.length) throw new Error(`Invalid animation library:\n  - ${errors.join("\n  - ")}`);
  return library;
}

function sourcePath(entry, root) {
  const exportsRoot = resolve(root, "assets", "animation-exports");
  const file = resolve(root, entry.path);
  if (file !== exportsRoot && !file.startsWith(`${exportsRoot}${sep}`)) {
    throw new Error("authored animation path escapes assets/animation-exports");
  }
  return file;
}

function checksum(body) {
  return createHash("sha256").update(body).digest("hex");
}

export async function assertAnimationMedia(file, entry) {
  const ffmpeg = await ffmpegPath();
  let probe = "";
  try {
    await pexec(ffmpeg, ["-i", file], { maxBuffer: 1 << 22 });
  } catch (cause) {
    probe = cause.stderr ?? "";
  }
  const video = /Video:.*?(\d{2,5})x(\d{2,5}).*?(\d+(?:\.\d+)?) fps/.exec(probe);
  if (!video) throw new Error("authored animation has no readable video stream");
  if (Number(video[1]) !== 1080 || Number(video[2]) !== 1920) {
    throw new Error(`authored animation is ${video[1]}x${video[2]}, expected 1080x1920`);
  }
  if (Math.abs(Number(video[3]) - 30) > 0.05) {
    throw new Error(`authored animation is ${video[3]} fps, expected 30 fps`);
  }
  const duration = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(probe);
  if (!duration) throw new Error("authored animation duration is unreadable");
  const actual = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
  if (Math.abs(actual - Number(entry.duration)) > 0.25) {
    throw new Error(`authored animation is ${actual.toFixed(2)}s, manifest declares ${entry.duration}s`);
  }
}

export async function fetchApprovedAnimation(
  movement,
  seed = "",
  excludedIds = new Set(),
  options = {},
) {
  const library = options.library ?? loadAnimationLibrary(options.libraryFile);
  const state = validateAnimationLibrary(library);
  if (state.errors.length) throw new Error(`Invalid animation library:\n  - ${state.errors.join("\n  - ")}`);
  const history = options.historyIds ?? shotHistoryIds();
  const blocked = new Set([...history, ...excludedIds]);
  const entries = (library.movements?.[movement] ?? []).filter(
    (entry) => entry.movement_verified === true && entry.faceless_verified === true &&
      !blocked.has(animationIdentity(entry)),
  );
  if (entries.length === 0) {
    throw new Error(`no fresh approved authored animation remains for "${movement}"`);
  }
  const index = parseInt(createHash("sha1").update(`${movement}|${seed}`).digest("hex").slice(0, 6), 16) % entries.length;
  const entry = entries[index];
  const root = options.root ?? repoRoot;
  const outputDir = ensureDir(join(options.cacheRoot ?? cacheDir, "animations"));
  const extension = entry.path ? extname(entry.path) : extname(new URL(entry.url).pathname);
  const file = join(outputDir, `${entry.sha256}${extension.toLowerCase()}`);

  let body;
  if (existsSync(file)) {
    body = readFileSync(file);
  } else if (entry.path) {
    const input = sourcePath(entry, root);
    if (!existsSync(input)) throw new Error(`authored animation export missing: ${entry.path}`);
    body = readFileSync(input);
  } else {
    const response = await (options.fetchImpl ?? fetch)(entry.url);
    if (!response.ok) throw new Error(`authored animation download ${response.status}`);
    body = Buffer.from(await response.arrayBuffer());
  }
  const actual = checksum(body);
  if (actual !== entry.sha256) throw new Error(`authored animation checksum mismatch for "${movement}"`);
  if (!existsSync(file)) writeFileSync(file, body);
  await (options.verifyMedia ?? assertAnimationMedia)(file, entry);
  writeFileSync(`${file}.meta.json`, `${JSON.stringify({
    asset_id: animationIdentity(entry),
    source: "authored",
    kind: "animation",
    movement,
    duration: entry.duration,
    source_name: basename(entry.path ?? new URL(entry.url).pathname),
  }, null, 2)}\n`);
  return file;
}
