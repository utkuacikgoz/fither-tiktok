#!/usr/bin/env node
// One-time (and occasional) demo-library curation: for each movement,
// search Pexels for body-only exercise clips, gate them hard (person
// required, face forbidden at a strict threshold), and emit candidate
// frames plus a review page. Machine-screened candidates are not approved;
// full-motion editorial review is the only way into
// assets/demo-library.json; render time then uses only approved clips.
//
// Run in CI (needs PEXELS_API_KEY): node pipeline/curate.mjs
// Output: curation/candidates.json + curation/review.html + review frames
import { writeFileSync, readFileSync, readdirSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { repoRoot, ensureDir, ffmpegPath } from "./lib/env.mjs";
import { personInJpeg, faceInJpeg } from "./lib/persons.mjs";

const pexec = promisify(execFile);
const FACE_THRESHOLD = 0.35; // curation can afford false rejections
const MAX_KEEP = 6; // candidates per movement to hand to review
const REVIEW_SAMPLES = 9;

// Movements worth curating now: named in week plans or likely soon, and
// plausibly findable as stock. Doorframe rows are included but expected to
// come up empty; movements with zero candidates simply stay
// environment-only until the app's animations land.
// Round 2 (2026-09-02): deeper pools for approved movements and fresh
// query angles for the round-1 misses.
const ALL_TARGETS = [
  { movement: "Wall Push-Up", queries: ["body only wall push up", "woman wall push up exercise side", "standing push up wall workout cropped"] },
  { movement: "Incline Push-Up", queries: ["push up on sofa woman", "elevated push up home workout", "incline push up exercise fitness"] },
  { movement: "Kneeling Push-Up", queries: ["modified push up woman home", "beginner push up knees workout"] },
  { movement: "Full Push-Up", queries: ["woman doing push ups living room", "push up home workout fitness woman", "girl push ups mat home"] },
  { movement: "Doorframe Row", queries: ["leaning back holding door", "doorway stretch pull exercise"] },
  { movement: "Wall Sit", queries: ["wall sit hold exercise fitness", "woman squat against wall workout", "isometric wall exercise legs"] },
  { movement: "Air Squat", queries: ["body only air squat close up", "woman bodyweight squat side", "squats living room exercise cropped"] },
  { movement: "Sit-to-Stand", queries: ["woman standing up from chair exercise", "chair squat home workout fitness"] },
  { movement: "Reverse Lunge", queries: ["body only reverse lunge close up", "backward lunge fitness woman side", "lunges living room exercise cropped"] },
  { movement: "Split Squat", queries: ["split squat exercise fitness woman", "stationary lunge home workout"] },
  { movement: "Glute Bridge", queries: ["body only glute bridge side", "glute bridge exercise cropped", "hip bridge floor workout close up"] },
  { movement: "Hip Thrust", queries: ["hip thrust couch exercise woman", "glute bridge shoulders elevated workout"] },
  { movement: "Standing Hip Hinge", queries: ["good morning exercise bodyweight woman", "hip hinge form fitness workout"] },
  { movement: "Full Plank", queries: ["body only full plank side", "woman plank hold face hidden", "plank core workout cropped"] },
  { movement: "Knee Plank", queries: ["modified plank knees woman", "beginner plank exercise home"] },
  { movement: "Side Plank", queries: ["side plank hold woman mat", "side plank exercise home workout"] },
  { movement: "Seated Knee Lift", queries: ["body only seated knee lift chair", "seated leg lift exercise close up", "chair knee raise exercise cropped"] },
];

const defaultMovements = ["Wall Push-Up", "Air Squat", "Reverse Lunge", "Glute Bridge", "Full Plank", "Seated Knee Lift"];
const requestedMovements = (process.env.CURATION_MOVEMENTS || defaultMovements.join(","))
  .split(",")
  .map((movement) => movement.trim())
  .filter(Boolean);
const requested = new Set(requestedMovements);
const TARGETS = ALL_TARGETS.filter((target) => requested.has(target.movement));
const unknownTargets = requestedMovements.filter((movement) => !ALL_TARGETS.some((target) => target.movement === movement));
if (unknownTargets.length) throw new Error(`Unknown CURATION_MOVEMENTS: ${unknownTargets.join(", ")}`);
if (!TARGETS.length) throw new Error("No curation targets selected");

const outDir = join(repoRoot, "curation");
rmSync(outDir, { recursive: true, force: true });
const framesDir = ensureDir(join(outDir, "frames"));
const tmpDir = ensureDir(join(outDir, "tmp"));

async function search(query) {
  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", "8");
  const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status} for "${query}"`);
  return (await res.json()).videos ?? [];
}

function smallestMp4(video) {
  const files = video.video_files.filter((f) => f.file_type === "video/mp4" && f.height >= 720);
  files.sort((a, b) => a.height - b.height);
  return files[0] ?? null;
}

const ffmpeg = await ffmpegPath();
const results = [];

for (const target of TARGETS) {
  const kept = [];
  // A source can match several searches for this movement, but must remain
  // eligible for a different movement until editorial review resolves what
  // it actually depicts. A global seen set previously mislabelled crossovers.
  const seenIds = new Set();
  for (const query of target.queries) {
    if (kept.length >= MAX_KEEP) break;
    for (const video of await search(query)) {
      if (kept.length >= MAX_KEEP) break;
      if (seenIds.has(video.id)) continue;
      seenIds.add(video.id);

      const pick = smallestMp4(video);
      if (!pick || video.duration < 6) continue;
      const clip = join(tmpDir, `${video.id}.mp4`);
      const dl = await fetch(pick.link);
      if (!dl.ok) continue;
      writeFileSync(clip, Buffer.from(await dl.arrayBuffer()));

      // Gate: sample across the entire clip; every frame must be face-free and
      // at least one must contain a person actually in it.
      let facy = false;
      let personSeen = false;
      const frameFiles = [];
      const fractions = Array.from({ length: REVIEW_SAMPLES }, (_, i) => 0.04 + (0.92 * i) / (REVIEW_SAMPLES - 1));
      for (const [i, frac] of fractions.entries()) {
        const frame = join(tmpDir, `${video.id}-${i}.jpg`);
        await pexec(ffmpeg, [
          "-y", "-ss", String((video.duration * frac).toFixed(2)), "-i", clip,
          "-vf", "eq=brightness=0.10:contrast=1.1",
          "-frames:v", "1", "-q:v", "4", frame,
        ], { maxBuffer: 1 << 22 }).catch(() => {});
        if (!existsSync(frame)) continue;
        const buf = readFileSync(frame);
        if (await faceInJpeg(buf, FACE_THRESHOLD)) { facy = true; break; }
        if (await personInJpeg(buf)) personSeen = true;
        frameFiles.push({ i, frame });
      }
      if (facy || !personSeen) {
        rmSync(clip, { force: true });
        console.log(`  ${target.movement}: candidate ${video.id} rejected (${facy ? "face" : "no person"})`);
        continue;
      }
      // Keep five review frames distributed across the accepted motion.
      const reviewFrames = frameFiles.filter((_, i) => i % 2 === 0).slice(0, 5);
      for (const { i, frame } of reviewFrames) {
        const dest = join(framesDir, `${target.movement.replaceAll(" ", "_")}--${video.id}--${i}.jpg`);
        writeFileSync(dest, readFileSync(frame));
      }
      kept.push({
        movement: target.movement,
        pexels_id: video.id,
        duration: video.duration,
        width: pick.width,
        height: pick.height,
        pexels_url: video.url,
        query,
        review_status: "pending",
      });
      rmSync(clip, { force: true });
      console.log(`  ${target.movement}: candidate ${video.id} KEPT (${video.duration}s)`);
    }
  }
  results.push({ movement: target.movement, candidates: kept });
  console.log(`${target.movement}: ${kept.length} candidate(s)`);
}

rmSync(tmpDir, { recursive: true, force: true });
writeFileSync(join(outDir, "candidates.json"), JSON.stringify(results, null, 2));

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
let review = `<!doctype html><html><head><meta charset="utf-8"><title>FITHER demo review</title><style>
body{margin:0;background:#faf7f2;color:#1f1d1a;font:16px/1.45 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:48px 28px}h1,h2{font-family:Georgia,serif}h2{margin-top:56px}.candidate{background:#fff;border:1px solid #e8e2d8;border-radius:18px;padding:20px;margin:22px 0}.meta{display:flex;gap:18px;flex-wrap:wrap;color:#6e675e}.frames{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:16px}.frames img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:8px}.check{margin-top:14px;color:#5c6f5e;font-weight:600}@media(max-width:800px){.frames{grid-template-columns:repeat(3,1fr)}}
</style></head><body><main><h1>Demo candidate review</h1><p>These clips passed machine screening only. Open the source and watch the full motion. Approve only when the named movement is exact, the form is usable, and no recognizable face appears in any frame.</p>`;
for (const result of results) {
  review += `<h2>${esc(result.movement)} (${result.candidates.length})</h2>`;
  for (const candidate of result.candidates) {
    const prefix = `${candidate.movement.replaceAll(" ", "_")}--${candidate.pexels_id}--`;
    const frames = readdirSync(framesDir).filter((name) => name.startsWith(prefix)).sort();
    review += `<article class="candidate"><h3><a href="${esc(candidate.pexels_url)}">Pexels ${candidate.pexels_id}</a></h3>`;
    review += `<div class="meta"><span>${candidate.duration}s</span><span>${candidate.width}×${candidate.height}</span><span>query: ${esc(candidate.query)}</span></div>`;
    review += `<div class="frames">${frames.map((name) => `<img src="frames/${esc(name)}" alt="${esc(candidate.movement)} candidate ${candidate.pexels_id}">`).join("")}</div>`;
    review += `<div class="check">□ exact movement &nbsp; □ safe form &nbsp; □ no face in full clip &nbsp; □ useful 9:16 crop</div></article>`;
  }
}
review += `</main></body></html>`;
writeFileSync(join(outDir, "review.html"), review);
console.log(`\nWrote curation review pack (${results.reduce((n, r) => n + r.candidates.length, 0)} machine-screened candidates)`);
