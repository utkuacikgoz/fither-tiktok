#!/usr/bin/env node
// Renders one FITHER video from its spec sidecar.
//   node pipeline/render.mjs content/scripts/2026-09-04-hotel-room-silent-session.md
// Output: renders/week-NN/<slug>.mp4 (or <slug>/slide-N.png for slideshows).
// Degrades honestly: no ELEVENLABS_* key → silent draft; no PEXELS_API_KEY →
// brand-gradient backgrounds. Both states are printed, never hidden.
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { ensureDir, rendersDir } from "./lib/env.mjs";
import { loadSpec, overlayWindows } from "./lib/spec.mjs";
import { synthesizeLines, ttsAvailable } from "./lib/tts.mjs";
import { fetchBroll, fetchApprovedDemo, brollAvailable, readAssetMetadata } from "./lib/broll.mjs";
import { fetchApprovedAnimation } from "./lib/animations.mjs";
import { renderOverlay, renderSlide, closeBrowser } from "./lib/overlays.mjs";
import { composeVideo, mediaDuration } from "./lib/compose.mjs";
import { rebuildSchedule } from "./lib/schedule.mjs";
import { assertAudioMaster, assertVoiceAudible, createQaSheet, faceSampleTimes, findFaces } from "./lib/verify.mjs";
import { renderSoundBed } from "./lib/sound.mjs";

function writeDeliveryText(outDir, spec, notes) {
  const captionFile = join(outDir, `${spec.slug}.caption.txt`);
  const notesFile = join(outDir, `${spec.slug}.notes.txt`);
  writeFileSync(captionFile, `${spec.caption}\n\n${(spec.hashtags ?? []).join(" ")}\n`);
  writeFileSync(notesFile, notes.map((note) => `- ${note}`).join("\n") + "\n");
  return captionFile;
}

function writeAssetRecord(outDir, spec, assets) {
  const file = join(outDir, `${spec.slug}.assets.json`);
  writeFileSync(file, `${JSON.stringify({
    slug: spec.slug,
    week: spec.week,
    post_date: spec.post_date,
    assets,
  }, null, 2)}\n`);
  return file;
}

export async function renderOne(scriptPath) {
  const specPath = scriptPath.replace(/\.md$/, ".json").replace(/\.json$/, ".json");
  const spec = loadSpec(specPath);
  const outDir = ensureDir(join(rendersDir, `week-${spec.week}`));
  const notes = [];

  if (spec.format === "slideshow") {
    const slideDir = ensureDir(join(outDir, spec.slug));
    const files = [];
    try {
      for (const [i, s] of spec.scenes.entries()) {
        const f = join(slideDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
        const overlay = s.overlays[0];
        await renderSlide(
          {
            kicker: s.kicker ?? "",
            text: overlay.text,
            footer: s.footer ?? "",
            index: i + 1,
            total: spec.scenes.length,
            kind: overlay.style,
          },
          f,
        );
        files.push(f);
      }
    } finally {
      await closeBrowser();
    }
    notes.push("slideshow: post as a TikTok photo post");
    files.push(writeAssetRecord(outDir, spec, []));
    files.push(writeDeliveryText(outDir, spec, notes));
    return { spec, files, notes };
  }

  if (!ttsAvailable()) notes.push("SILENT DRAFT: no ELEVENLABS_API_KEY/ELEVENLABS_VOICE_ID set");
  if (!brollAvailable() && spec.scenes.some((scene) => scene.broll_query)) {
    notes.push("GRADIENT BACKGROUNDS: no PEXELS_API_KEY set");
  }

  const voFiles = await synthesizeLines(spec.voiceover ?? []);

  // GUARDRAIL: two lines must never speak at once, and the schedule must be
  // the shortest one the real audio allows. Sidecar times are word-count
  // estimates; the synthesized audio is the truth, so the whole schedule is
  // rebuilt from measured durations rather than nudged. A schedule that only
  // ever pushed lines later let a generous estimate, not the speech, decide
  // the running time and pushed scripts past the 60s contract.
  if (voFiles) {
    const durations = [];
    for (const v of voFiles) durations.push((await mediaDuration(v.file)) ?? 3.5);
    const schedule = rebuildSchedule({
      authored: (spec.voiceover ?? []).map((line) => line.t),
      durations,
      scenes: spec.scenes,
      duration: spec.duration,
    });
    if (schedule.overLimit) {
      throw new Error(
        `voiceover needs ${schedule.requiredEnd.toFixed(1)}s of measured speech; the 60s quality contract requires a tighter script`,
      );
    }
    voFiles.forEach((v, i) => {
      v.t = schedule.times[i];
      v.dur = durations[i];
    });
    spec.scenes = schedule.scenes;
    spec.duration = schedule.duration;
    if (schedule.drift > 0.05) {
      notes.push(`rebuilt the schedule from measured audio (largest move ${schedule.drift.toFixed(1)}s)`);
    }
  }

  // Sourcing is re-runnable so a face found in the finished video can be
  // fed back as a blocked asset and the offending scene re-sourced, rather
  // than failing a render that took six minutes to reach the check.
  const blockedAssetIds = new Set();
  async function sourceScenes() {
  const sceneFiles = [];
  const selectedAssets = [];
  const usedAssetIds = new Set(blockedAssetIds);
  for (const s of spec.scenes) {
    let f = null;
    try {
      if (s.animation && s.movement) {
        f = await fetchApprovedAnimation(s.movement, `${spec.slug}|${s.start}`, usedAssetIds);
      } else if (s.demo && s.movement) {
        f = await fetchApprovedDemo(s.movement, `${spec.slug}|${s.start}`, usedAssetIds);
        if (!f) notes.push(`verified "${s.movement}" demo unavailable — using gradient`);
      } else {
        f = await fetchBroll(s.broll_query, "environment", usedAssetIds, spec.slug);
      }
    } catch (e) {
      if (s.animation) throw new Error(`authored animation "${s.movement}" failed: ${e.message}`);
      notes.push(`b-roll "${s.broll_query}" failed (${e.message.slice(0, 80)}), using gradient`);
    }
    if (!f && brollAvailable() && s.broll_query) {
      notes.push(`no b-roll found for "${s.broll_query}", using gradient`);
    }
    if (f) {
      const metadata = readAssetMetadata(f);
      if (metadata?.asset_id) usedAssetIds.add(metadata.asset_id);
      selectedAssets.push({
        scene_start: s.start,
        kind: s.animation ? "animation" : s.demo ? "demo" : "environment",
        movement: s.movement,
        query: s.broll_query,
        asset_id: metadata?.asset_id ?? null,
        source: metadata?.source ?? null,
      });
    }
    sceneFiles.push(f);
  }
  return { sceneFiles, selectedAssets };
  }

  let { sceneFiles, selectedAssets } = await sourceScenes();

  const overlays = [];
  try {
    for (const w of overlayWindows(spec)) {
      overlays.push({ ...w, file: await renderOverlay(w) });
    }

    // Burned captions for muted viewers: one per spoken line at its
    // measured window. Lines under the end card are skipped — the card
    // already carries the question at full size.
    if (voFiles) {
      const ctas = overlays.filter((o) => o.style === "cta");
      for (const v of voFiles) {
        const end = Math.min(v.t + (v.dur ?? 3.5) + 0.2, spec.duration - 0.05);
        if (end <= v.t) continue;
        if (ctas.some((c) => v.t < c.end && end > c.start)) continue;
        overlays.push({ start: v.t, end, style: "caption", file: await renderOverlay({ text: v.text, style: "caption" }) });
      }
    }
  } finally {
    await closeBrowser();
  }

  // Accessibility sidecar: same lines and timing as the burned captions.
  if (voFiles) {
    const stamp = (s) => {
      const ms = Math.round(s * 1000);
      const p = (n, w = 2) => String(n).padStart(w, "0");
      return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
    };
    const srt = voFiles
      .map((v, i) => `${i + 1}\n${stamp(v.t)} --> ${stamp(Math.min(v.t + (v.dur ?? 3.5), spec.duration))}\n${v.text}\n`)
      .join("\n");
    writeFileSync(join(outDir, `${spec.slug}.srt`), srt);
  }

  const out = join(outDir, `${spec.slug}.mp4`);
  const soundBedFile = await renderSoundBed(spec.sound.profile);
  notes.push(`embedded original ${spec.sound.profile} sound bed at ${spec.sound.bed_gain_db} dB with voice ducking`);

  // GUARDRAIL: faceless, verified on the OUTPUT. Source screening is a
  // predictor; the finished frames are the truth. When the truth disagrees,
  // the clip that produced the offending frame is blocked and its scene
  // re-sourced, so a miss costs one recomposition instead of the whole
  // render. Fails closed if re-sourcing cannot clear it.
  //
  // Scenes carrying generated footage are exempt (owner override,
  // 2026-09-03): that person is synthetic and may show a face. Every other
  // second of the video is still scanned, so a real face from stock is
  // caught exactly as before.
  const MAX_RESOURCE_ATTEMPTS = 3;
  for (let attempt = 1; ; attempt++) {
    await composeVideo({ spec, sceneFiles, overlays, voFiles, soundBedFile, out });
    const generatedWindows = spec.scenes
      .filter((scene) => selectedAssets.some((a) => a.scene_start === scene.start && a.source === "generated"))
      .map((scene) => [scene.start, scene.end]);
    const times = faceSampleTimes(spec.duration)
      .filter((t) => !generatedWindows.some(([from, to]) => t >= from && t < to));
    const hits = await findFaces(out, spec.duration, { times });
    if (hits.length === 0) break;

    const offenders = new Set();
    for (const time of hits) {
      const scene = spec.scenes.find((s) => time >= s.start && time < s.end) ?? spec.scenes.at(-1);
      const asset = selectedAssets.find((a) => a.scene_start === scene.start);
      if (asset?.asset_id) offenders.add(asset.asset_id);
    }
    const stamps = hits.map((t) => `${t.toFixed(1)}s`).join(", ");
    if (attempt >= MAX_RESOURCE_ATTEMPTS || offenders.size === 0) {
      throw new Error(`faceless verification detected a face at ${stamps}`);
    }
    for (const id of offenders) blockedAssetIds.add(id);
    notes.push(`re-sourced ${offenders.size} clip(s) after a face appeared at ${stamps}`);
    ({ sceneFiles, selectedAssets } = await sourceScenes());
  }

  // GUARDRAIL: the complete mix must meet the delivery loudness contract.
  await assertAudioMaster(out);

  // GUARDRAIL: every scripted line must be audible in the finished file.
  // The retimed schedule is ground truth; a silent line window means the
  // mix dropped audio, and the render fails loudly instead of shipping.
  if (voFiles && voFiles.length > 0) await assertVoiceAudible(out, voFiles);

  // QA contact sheet: one frame every ~5s, tiled. The faceless rule is
  // verified by looking at this before anything is posted.
  const qaDir = ensureDir(join(outDir, "qa"));
  const qaFile = join(qaDir, `${spec.slug}.png`);
  await createQaSheet(out, qaFile);
  const assetFile = writeAssetRecord(outDir, spec, selectedAssets);

  // Notes persist next to the render so sharded CI jobs can be collected
  // into one posting sheet.
  const captionFile = writeDeliveryText(outDir, spec, notes);
  return { spec, files: [out, captionFile, qaFile, assetFile], notes };
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
