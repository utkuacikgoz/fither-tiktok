// Generated footage from Runway.
//
// This widens the demo pool past what stock libraries carry — body-only
// movement clips framed away from the face. Generation produces CANDIDATES
// ONLY. Nothing here approves footage: every clip still passes the machine
// face gate and then full-motion editorial review before it may enter
// assets/demo-library.json (CLAUDE.md, demo truth).
//
// Implemented against Runway's published API: api.dev.runwayml.com v1, a
// dated X-Runway-Version header, and task polling.
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const RUNWAY_BASE = process.env.RUNWAY_BASE_URL || "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = process.env.RUNWAY_API_VERSION || "2024-11-06";
const VIDEO_MODEL = process.env.RUNWAY_VIDEO_MODEL || "gen4_turbo";
const IMAGE_MODEL = process.env.RUNWAY_IMAGE_MODEL || "gen4_image";
const VIDEO_RATIO = process.env.RUNWAY_VIDEO_RATIO || "720:1280";
const IMAGE_RATIO = process.env.RUNWAY_IMAGE_RATIO || "1080:1920";

// Runway's own asset URLs expire within a day or two, so pinning the
// recurring character to one would quietly unpin her: the reference would
// 404 and every later clip would invent a new stranger. The approved
// portrait therefore lives in the repo as a file, and is sent inline as a
// data URI. Runway caps a data URI at 5MB.
const CHARACTER_URI_LIMIT = 5 * 1024 * 1024;
const IMAGE_MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export function characterUri(reference) {
  if (!reference) return null;
  if (/^(https:\/\/|data:)/.test(reference)) return reference;
  const mime = IMAGE_MIME[extname(reference).toLowerCase()];
  if (!mime) throw new Error(`character reference ${reference}: expected a .jpg, .png or .webp file`);
  const uri = `data:${mime};base64,${readFileSync(reference).toString("base64")}`;
  if (uri.length > CHARACTER_URI_LIMIT) {
    throw new Error(`character reference ${reference}: ${uri.length} bytes encoded, over Runway's ${CHARACTER_URI_LIMIT} limit`);
  }
  return uri;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readError(res) {
  return `${res.status} ${(await res.text().catch(() => "")).slice(0, 400)}`;
}

export function runwayAvailable() {
  return Boolean(process.env.RUNWAY_API_SECRET);
}

export function providersAvailable() {
  return runwayAvailable() ? ["runway"] : [];
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.RUNWAY_API_SECRET}`,
    "X-Runway-Version": RUNWAY_VERSION,
    "content-type": "application/json",
  };
}

// Runway tasks are asynchronous; the API asks for one poll per task every
// five seconds at most.
async function awaitTask(id, { timeoutMs = 420000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(5000);
    const res = await fetch(`${RUNWAY_BASE}/tasks/${id}`, { headers: headers() });
    if (!res.ok) throw new Error(`Runway task ${id}: ${await readError(res)}`);
    const task = await res.json();
    if (task.status === "SUCCEEDED") {
      const url = (task.output ?? [])[0];
      if (!url) throw new Error(`Runway task ${id} succeeded with no output`);
      return url;
    }
    if (task.status === "FAILED") {
      throw new Error(`Runway task ${id} failed: ${task.failureCode ?? ""} ${task.failure ?? ""}`.trim());
    }
  }
  throw new Error(`Runway task ${id} timed out`);
}

async function post(path, body) {
  const res = await fetch(`${RUNWAY_BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Runway ${path}: ${await readError(res)}`);
  const { id } = await res.json();
  if (!id) throw new Error(`Runway ${path}: response carried no task id`);
  return id;
}

// A single still, used to cast the channel's recurring character. The URL it
// returns becomes the reference every later generation is pinned to.
export async function runwayPortrait({ prompt, seed } = {}) {
  if (!prompt?.trim()) throw new Error("runwayPortrait needs a prompt");
  if (!runwayAvailable()) throw new Error("RUNWAY_API_SECRET is not set");
  const task = await post("/text_to_image", {
    model: IMAGE_MODEL,
    promptText: prompt,
    ratio: IMAGE_RATIO,
    ...(seed === undefined ? {} : { seed }),
  });
  return awaitTask(task);
}

// Gen-4 Turbo animates a starting frame, so a still is generated first.
// The still is where body-only framing is won or lost, which is why the
// prompt book describes the crop and not just the movement.
export async function generateClip(provider, { prompt, motion, duration = 5, seed, character } = {}) {
  if (provider !== "runway") throw new Error(`unknown provider "${provider}"`);
  if (!prompt || !prompt.trim()) throw new Error("generateClip needs a prompt");
  if (!runwayAvailable()) throw new Error("RUNWAY_API_SECRET is not set");

  // A reference image pins the recurring character, so the same woman
  // appears in every movement instead of a new stranger per clip.
  const reference = characterUri(character);
  const imageTask = await post("/text_to_image", {
    model: IMAGE_MODEL,
    promptText: prompt,
    ratio: IMAGE_RATIO,
    ...(reference ? { referenceImages: [{ uri: reference, tag: "character" }] } : {}),
    ...(seed === undefined ? {} : { seed }),
  });
  const promptImage = await awaitTask(imageTask);

  const videoTask = await post("/image_to_video", {
    model: VIDEO_MODEL,
    promptImage,
    promptText: motion ?? prompt,
    ratio: VIDEO_RATIO,
    duration,
    ...(seed === undefined ? {} : { seed }),
  });
  const url = await awaitTask(videoTask);
  return { url, provider: "runway", model: VIDEO_MODEL, still: promptImage, character: character ?? null };
}
