// Generated footage providers: Runway and Higgsfield.
//
// These widen the demo pool past what stock libraries carry — body-only
// movement clips framed away from the face. Generation produces CANDIDATES
// ONLY. Nothing here approves footage: every clip still passes the machine
// face gate and then full-motion editorial review before it may enter
// assets/demo-library.json (CLAUDE.md, demo truth).
//
// Runway is implemented against its published OpenAPI (api.dev.runwayml.com
// v1, dated X-Runway-Version header, task polling). Higgsfield moves its
// surface more often, so its paths and model id are env-overridable and a
// mismatch fails loudly with the response body rather than guessing.
const RUNWAY_BASE = process.env.RUNWAY_BASE_URL || "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = process.env.RUNWAY_API_VERSION || "2024-11-06";
const RUNWAY_VIDEO_MODEL = process.env.RUNWAY_VIDEO_MODEL || "gen4_turbo";
const RUNWAY_IMAGE_MODEL = process.env.RUNWAY_IMAGE_MODEL || "gen4_image";
const RUNWAY_VIDEO_RATIO = process.env.RUNWAY_VIDEO_RATIO || "720:1280";
const RUNWAY_IMAGE_RATIO = process.env.RUNWAY_IMAGE_RATIO || "1080:1920";

const HF_BASE = process.env.HIGGSFIELD_BASE_URL || "https://api.higgsfield.ai";
const HF_T2V_PATH = process.env.HIGGSFIELD_T2V_PATH || "/v1/text2video/dop";
const HF_MODEL = process.env.HIGGSFIELD_MODEL || "dop-turbo";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readError(res) {
  return `${res.status} ${(await res.text().catch(() => "")).slice(0, 400)}`;
}

export function runwayAvailable() {
  return Boolean(process.env.RUNWAY_API_SECRET);
}

export function higgsfieldAvailable() {
  return Boolean(process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_KEY_SECRET);
}

export function providersAvailable() {
  const out = [];
  if (runwayAvailable()) out.push("runway");
  if (higgsfieldAvailable()) out.push("higgsfield");
  return out;
}

function runwayHeaders() {
  return {
    Authorization: `Bearer ${process.env.RUNWAY_API_SECRET}`,
    "X-Runway-Version": RUNWAY_VERSION,
    "content-type": "application/json",
  };
}

// Runway tasks are asynchronous; the API asks for one poll per task every
// five seconds at most.
async function runwayTask(id, { timeoutMs = 420000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(5000);
    const res = await fetch(`${RUNWAY_BASE}/tasks/${id}`, { headers: runwayHeaders() });
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

async function runwayPost(path, body) {
  const res = await fetch(`${RUNWAY_BASE}${path}`, {
    method: "POST",
    headers: runwayHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Runway ${path}: ${await readError(res)}`);
  const { id } = await res.json();
  if (!id) throw new Error(`Runway ${path}: response carried no task id`);
  return id;
}

// Gen-4 Turbo animates a starting frame, so a still is generated first.
// The still is where body-only framing is won or lost, which is why the
// prompt book describes the crop, not just the movement.
async function runwayClip({ prompt, motion, duration, seed }) {
  const imageTask = await runwayPost("/text_to_image", {
    model: RUNWAY_IMAGE_MODEL,
    promptText: prompt,
    ratio: RUNWAY_IMAGE_RATIO,
    ...(seed === undefined ? {} : { seed }),
  });
  const promptImage = await runwayTask(imageTask);
  const videoTask = await runwayPost("/image_to_video", {
    model: RUNWAY_VIDEO_MODEL,
    promptImage,
    promptText: motion ?? prompt,
    ratio: RUNWAY_VIDEO_RATIO,
    duration,
    ...(seed === undefined ? {} : { seed }),
  });
  const url = await runwayTask(videoTask);
  return { url, provider: "runway", model: RUNWAY_VIDEO_MODEL, still: promptImage };
}

function higgsfieldHeaders() {
  return {
    Authorization: `Key ${process.env.HIGGSFIELD_API_KEY_ID}:${process.env.HIGGSFIELD_API_KEY_SECRET}`,
    "content-type": "application/json",
  };
}

// Higgsfield returns a request id plus a status url; the finished asset
// arrives on a job result. Shapes vary between model families, so the
// result URL is searched for rather than assumed at a fixed path.
function findResultUrl(payload) {
  const seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string" && /^https?:\/\//.test(value) && /\.(mp4|mov|webm)(\?|$)/i.test(value)) return value;
      if (typeof value === "string" && /^https?:\/\//.test(value) && (key === "url" || key === "raw")) return value;
      const found = walk(value);
      if (found) return found;
    }
    return null;
  };
  return walk(payload);
}

async function higgsfieldClip({ prompt, duration, seed, timeoutMs = 420000 }) {
  const res = await fetch(`${HF_BASE}${HF_T2V_PATH}`, {
    method: "POST",
    headers: higgsfieldHeaders(),
    body: JSON.stringify({
      input: {
        model: HF_MODEL,
        prompt,
        aspect_ratio: "9:16",
        duration,
        ...(seed === undefined ? {} : { seed }),
      },
    }),
  });
  if (!res.ok) throw new Error(`Higgsfield ${HF_T2V_PATH}: ${await readError(res)}`);
  const created = await res.json();
  const statusUrl = created.status_url
    ?? (created.request_id ? `${HF_BASE}/requests/${created.request_id}/status` : null);
  if (!statusUrl) {
    throw new Error(`Higgsfield: no status_url or request_id in ${JSON.stringify(created).slice(0, 300)}`);
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(5000);
    const poll = await fetch(statusUrl, { headers: higgsfieldHeaders() });
    if (!poll.ok) throw new Error(`Higgsfield status: ${await readError(poll)}`);
    const body = await poll.json();
    const status = String(body.status ?? body.state ?? "").toLowerCase();
    if (status === "completed" || status === "succeeded") {
      const url = findResultUrl(body);
      if (!url) throw new Error(`Higgsfield completed with no asset url: ${JSON.stringify(body).slice(0, 300)}`);
      return { url, provider: "higgsfield", model: HF_MODEL };
    }
    if (status === "failed" || status === "nsfw" || status === "canceled") {
      throw new Error(`Higgsfield generation ${status}`);
    }
  }
  throw new Error("Higgsfield generation timed out");
}

// One clip from the named provider. Callers own the face gate and review
// step; this returns a downloadable URL and its provenance, nothing more.
export async function generateClip(provider, { prompt, motion, duration = 5, seed } = {}) {
  if (!prompt || !prompt.trim()) throw new Error("generateClip needs a prompt");
  if (provider === "runway") {
    if (!runwayAvailable()) throw new Error("RUNWAY_API_SECRET is not set");
    return runwayClip({ prompt, motion, duration, seed });
  }
  if (provider === "higgsfield") {
    if (!higgsfieldAvailable()) throw new Error("HIGGSFIELD_API_KEY_ID / HIGGSFIELD_API_KEY_SECRET are not set");
    return higgsfieldClip({ prompt, duration, seed });
  }
  throw new Error(`unknown provider "${provider}"`);
}
