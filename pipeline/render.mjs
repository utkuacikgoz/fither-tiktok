#!/usr/bin/env node
// Renders one FITHER video from its spec sidecar.
//   node pipeline/render.mjs content/scripts/2026-09-01-hotel-room-silent-session.md
// Output: renders/week-NN/<slug>.mp4 (or <slug>/slide-N.png for slideshows).
// Degrades honestly: no ELEVENLABS_* key → silent draft; no PEXELS_API_KEY →
// brand-gradient backgrounds. Both states are printed, never hidden.
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { ensureDir, rendersDir } from "./lib/env.mjs";
import { loadSpec, overlayWindows } from "./lib/spec.mjs";
import { synthesizeLines, ttsAvailable } from "./lib/tts.mjs";
import { fetchBroll, fetchApprovedDemo, brollAvailable } from "./lib/broll.mjs";
import { renderOverlay, renderSlide, closeBrowser } from "./lib/overlays.mjs";
import { composeVideo, mediaDuration, meanVolume } from "./lib/compose.mjs";

export async function renderOne(scriptPath) {
  const specPath = scriptPath.replace(/\.md$/, ".json").replace(/\.json$/, ".json");
  const spec = loadSpec(specPath);
  const outDir = ensureDir(join(rendersDir, `week-${spec.week}`));
  const notes = [];

  if (spec.format === "slideshow") {
    const slideDir = ensureDir(join(outDir, spec.slug));
    const files = [];
    for (const [i, s] of spec.scenes.entries()) {
      const f = join(slideDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
      await renderSlide(
        { kicker: s.kicker ?? "", text: s.overlays?.[0]?.text ?? "", footer: s.footer ?? "" },
        f,
      );
      files.push(f);
    }
    return { spec, files, notes: ["slideshow: post as a TikTok photo post"] };
  }

  if (!ttsAvailable()) notes.push("SILENT DRAFT: no ELEVENLABS_API_KEY/ELEVENLABS_VOICE_ID set");
  if (!brollAvailable()) notes.push("GRADIENT BACKGROUNDS: no PEXELS_API_KEY set");

  const voFiles = await synthesizeLines(spec.voiceover ?? []);

  // GUARDRAIL: two lines must never speak at once. Sidecar times are
  // estimates; the synthesized audio is the truth. Measure every line and
  // push any line that would start before the previous one finishes
  // (plus a breath), extending the final scene if the close needs room.
  if (voFiles) {
    let prevEnd = 0;
    let shifted = 0;
    for (const v of voFiles) {
      const d = (await mediaDuration(v.file)) ?? 3.5;
      const t = Math.max(v.t, prevEnd > 0 ? prevEnd + 0.35 : 0);
      if (t - v.t > 0.05) shifted++;
      v.t = t;
      prevEnd = t + d;
    }
    if (shifted > 0) notes.push(`retimed ${shifted} voiceover line(s) to prevent overlap`);
    const lastScene = spec.scenes[spec.scenes.length - 1];
    if (prevEnd + 0.6 > spec.duration) {
      const ext = prevEnd + 0.8 - spec.duration;
      lastScene.end = Math.round((lastScene.end + ext) * 10) / 10;
      spec.duration = lastScene.end;
      notes.push(`extended by ${ext.toFixed(1)}s so the final line finishes`);
    }
  }

  const sceneFiles = [];
  for (const s of spec.scenes) {
    let f = null;
    try {
      if (s.demo && s.movement) {
        f = await fetchApprovedDemo(s.movement);
        if (!f) notes.push(`"${s.movement}" not in assets/demo-library.json — demo scene falls back`);
      }
      f ??= await fetchBroll(s.broll_query, s.demo ? "demo" : "environment");
    } catch (e) {
      notes.push(`b-roll "${s.broll_query}" failed (${e.message.slice(0, 80)}), using gradient`);
    }
    if (!f && brollAvailable() && s.broll_query) {
      notes.push(`no b-roll found for "${s.broll_query}", using gradient`);
    }
    sceneFiles.push(f);
  }

  const overlays = [];
  for (const w of overlayWindows(spec)) {
    overlays.push({ ...w, file: await renderOverlay(w) });
  }
  await closeBrowser();

  const out = join(outDir, `${spec.slug}.mp4`);
  await composeVideo({ spec, sceneFiles, overlays, voFiles, out });

  // GUARDRAIL: every scripted line must be audible in the finished file.
  // The retimed schedule is ground truth; a silent line window means the
  // mix dropped audio, and the render fails loudly instead of shipping.
  if (voFiles && voFiles.length > 0) {
    const silent = [];
    for (const v of voFiles) {
      const lvl = await meanVolume(out, v.t + 0.15, 1.0);
      if (lvl !== null && lvl < -45) silent.push(`${v.t.toFixed(1)}s`);
    }
    if (silent.length > 0) {
      throw new Error(
        `audio verification failed for ${spec.slug}: no voice at ${silent.join(", ")} — the mix lost lines; do not ship this render`,
      );
    }
  }

  // QA contact sheet: one frame every ~10s, tiled. The faceless rule is
  // verified by looking at this before anything is posted.
  const qaDir = ensureDir(join(outDir, "qa"));
  const qaFile = join(qaDir, `${spec.slug}.png`);
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const ffmpeg = await (await import("./lib/env.mjs")).ffmpegPath();
    await promisify(execFile)(ffmpeg, [
      "-y", "-i", out,
      "-vf", "select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,10)',scale=270:480,tile=6x1",
      "-frames:v", "1", qaFile,
    ], { maxBuffer: 1 << 24 });
  } catch (e) {
    notes.push(`QA sheet failed: ${e.message.slice(0, 120)}`);
  }

  const captionFile = join(outDir, `${spec.slug}.caption.txt`);
  writeFileSync(captionFile, `${spec.caption}\n\n${(spec.hashtags ?? []).join(" ")}\n`);
  // Notes persist next to the render so sharded CI jobs can be collected
  // into one posting sheet.
  writeFileSync(join(outDir, `${spec.slug}.notes.txt`), notes.map((n) => `- ${n}`).join("\n") + "\n");
  return { spec, files: [out, captionFile, qaFile], notes };
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (invokedDirectly) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node pipeline/render.mjs <content/scripts/FILE.md>");
    process.exit(1);
  }
  renderOne(target)
    .then(({ spec, files, notes }) => {
      console.log(`Rendered ${spec.slug} (${spec.duration ?? "-"}s)`);
      for (const f of files) console.log(`  ${f}`);
      for (const n of notes) console.log(`  NOTE: ${n}`);
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
