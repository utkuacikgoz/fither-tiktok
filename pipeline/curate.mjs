#!/usr/bin/env node
// One-time (and occasional) demo-library curation: for each movement,
// search Pexels for body-only exercise clips, gate them hard (person
// required, face forbidden at a strict threshold), and emit candidate
// frames for human review. The human-approved winners go into
// assets/demo-library.json; render time then uses only approved clips.
//
// Run in CI (needs PEXELS_API_KEY): node pipeline/curate.mjs
// Output: curation/candidates.json + curation/frames/<movement>--<id>--N.jpg
import { writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { repoRoot, ensureDir, ffmpegPath } from "./lib/env.mjs";
import { personInJpeg, faceInJpeg } from "./lib/persons.mjs";

const pexec = promisify(execFile);
const FACE_THRESHOLD = 0.5; // stricter than render-time; curation can afford false rejections
const MAX_KEEP = 6; // candidates per movement to hand to review

// Movements worth curating now: named in week plans or likely soon, and
// plausibly findable as stock. Doorframe rows are included but expected to
// come up empty; movements with zero candidates simply stay
// environment-only until the app's animations land.
// Round 2 (2026-09-02): deeper pools for approved movements and fresh
// query angles for the round-1 misses.
const TARGETS = [
  { movement: "Wall Push-Up", queries: ["woman wall push up exercise", "standing push up wall workout", "wall press exercise fitness"] },
  { movement: "Incline Push-Up", queries: ["push up on sofa woman", "elevated push up home workout", "incline push up exercise fitness"] },
  { movement: "Kneeling Push-Up", queries: ["modified push up woman home", "beginner push up knees workout"] },
  { movement: "Full Push-Up", queries: ["woman doing push ups living room", "push up home workout fitness woman", "girl push ups mat home"] },
  { movement: "Doorframe Row", queries: ["leaning back holding door", "doorway stretch pull exercise"] },
  { movement: "Wall Sit", queries: ["wall sit hold exercise fitness", "woman squat against wall workout", "isometric wall exercise legs"] },
  { movement: "Air Squat", queries: ["woman bodyweight squat home workout", "squats living room exercise", "deep squat exercise woman fitness"] },
  { movement: "Sit-to-Stand", queries: ["woman standing up from chair exercise", "chair squat home workout fitness"] },
  { movement: "Reverse Lunge", queries: ["woman lunge exercise home workout", "backward lunge fitness woman", "lunges living room exercise"] },
  { movement: "Split Squat", queries: ["split squat exercise fitness woman", "stationary lunge home workout"] },
  { movement: "Glute Bridge", queries: ["glute bridge exercise woman mat", "hip bridge floor workout home", "bridge pose fitness mat woman"] },
  { movement: "Hip Thrust", queries: ["hip thrust couch exercise woman", "glute bridge shoulders elevated workout"] },
  { movement: "Standing Hip Hinge", queries: ["good morning exercise bodyweight woman", "hip hinge form fitness workout"] },
  { movement: "Full Plank", queries: ["woman plank hold home workout", "forearm plank exercise mat woman", "plank core workout home"] },
  { movement: "Knee Plank", queries: ["modified plank knees woman", "beginner plank exercise home"] },
  { movement: "Side Plank", queries: ["side plank hold woman mat", "side plank exercise home workout"] },
  { movement: "Seated Knee Lift", queries: ["seated leg lift chair exercise", "chair workout legs woman home", "seated core exercise office"] },
];

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

// Never re-download a clip a human has already judged: approved clips are
// in the library, rejected ones are in its rejected list. Both are skipped.
const library = JSON.parse(readFileSync(join(repoRoot, "assets", "demo-library.json"), "utf8"));
const seenIds = new Set(library.rejected ?? []);
for (const entries of Object.values(library.movements ?? {})) {
  for (const entry of entries) seenIds.add(entry.pexels_id);
}
console.log(`Skipping ${seenIds.size} already-reviewed clip(s) from assets/demo-library.json`);

for (const target of TARGETS) {
  const kept = [];
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

      // Gate: sample 5 frames; every frame must be face-free (strict) and
      // at least one must contain a person actually in it.
      let facy = false;
      let personSeen = false;
      const frameFiles = [];
      for (const [i, frac] of [0.05, 0.28, 0.5, 0.72, 0.95].entries()) {
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
      // Keep three review frames.
      for (const { i, frame } of frameFiles.slice(0, 3)) {
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
console.log(`\nWrote curation/candidates.json (${results.reduce((n, r) => n + r.candidates.length, 0)} candidates)`);
