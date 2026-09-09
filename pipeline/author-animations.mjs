#!/usr/bin/env node
// Renders the first deterministic FITHER-owned movement animation candidates.
// Outputs remain candidates until the complete loops pass movement review.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { chromium } from "playwright-core";
import { AUTHORING_MOVEMENTS, movementFrame, validateAuthoredPoses } from "./lib/animation-poses.mjs";
import { assertAnimationMedia } from "./lib/animations.mjs";
import { ensureDir, ffmpegPath, findChromium, repoRoot } from "./lib/env.mjs";
import { assertNoFaces, createQaSheet } from "./lib/verify.mjs";

const pexec = promisify(execFile);
const FPS = 30;
const DURATION = 4;
const FRAMES = FPS * DURATION;
const exportsDir = ensureDir(join(repoRoot, "assets", "animation-exports"));
const reviewDir = ensureDir(join(repoRoot, "assets", "animation-review"));
const framesRoot = mkdtempSync(join(tmpdir(), "fither-authored-animation-"));

const poseErrors = validateAuthoredPoses();
if (poseErrors.length) throw new Error(`Invalid authored poses:\n  - ${poseErrors.join("\n  - ")}`);

const browser = await chromium.launch({
  executablePath: findChromium(),
  args: ["--no-sandbox", "--force-color-profile=srgb"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.setContent('<canvas id="stage" width="1080" height="1920"></canvas>');
await page.addScriptTag({ content: `
  window.renderFitherMovement = ({ pose, context, focus, phase }) => {
    const canvas = document.getElementById("stage");
    const ctx = canvas.getContext("2d");
    const C = {
      bg: "#FAF7F2", surface: "#FFFFFF", ink: "#1F1D1A", soft: "#8C847A",
      accent: "#5C6F5E", accentSoft: "#E7ECE7", gold: "#B98A2F", line: "#D9D1C6"
    };
    ctx.clearRect(0, 0, 1080, 1920);
    const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
    bg.addColorStop(0, C.bg); bg.addColorStop(0.58, "#F7F3ED"); bg.addColorStop(1, "#EEF2ED");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = "rgba(92,111,94,0.055)";
    ctx.beginPath(); ctx.arc(930, 300, 380, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(70, 1650, 310, 0, Math.PI * 2); ctx.fill();

    const line = (a, b, width = 18, color = C.line) => {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.lineWidth = width; ctx.lineCap = "round"; ctx.strokeStyle = color; ctx.stroke();
    };
    const floorY = 1605;
    if (context === "wall") {
      ctx.fillStyle = C.surface; ctx.fillRect(895, 390, 18, 1215);
      ctx.fillStyle = C.accentSoft; ctx.fillRect(913, 390, 167, 1215);
      line({x: 895, y: 390}, {x: 895, y: floorY}, 5, C.accent);
    } else if (context === "doorframe") {
      ctx.fillStyle = C.surface; ctx.fillRect(865, 340, 48, 1265);
      ctx.fillStyle = C.accentSoft; ctx.fillRect(913, 340, 167, 1265);
      line({x: 875, y: 340}, {x: 875, y: floorY}, 14, C.accent);
      line({x: 875, y: 340}, {x: 1040, y: 340}, 14, C.accent);
    } else if (context === "chair") {
      ctx.fillStyle = C.accentSoft; ctx.fillRect(360, 1080, 300, 42);
      line({x: 390, y: 1120}, {x: 355, y: floorY}, 28, C.accent);
      line({x: 625, y: 1120}, {x: 660, y: floorY}, 28, C.accent);
      line({x: 375, y: 1080}, {x: 375, y: 740}, 28, C.accent);
    }
    line({x: 70, y: floorY}, {x: 1010, y: floorY}, 5, C.line);

    ctx.save();
    ctx.filter = "blur(15px)";
    ctx.fillStyle = "rgba(31,29,26,0.11)";
    ctx.beginPath(); ctx.ellipse(560, 1590, 350, 42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const shifted = (p, dx, dy) => ({ x: p.x + dx, y: p.y + dy });
    const bone = (a, b, far = false) => {
      line(a, b, far ? 62 : 72, far ? "#E0DAD1" : "#D7D0C7");
      line(a, b, far ? 40 : 49, far ? C.soft : C.accent);
    };
    const joint = (p, far = false) => {
      ctx.fillStyle = far ? C.soft : C.accent;
      ctx.beginPath(); ctx.arc(p.x, p.y, far ? 21 : 26, 0, Math.PI * 2); ctx.fill();
    };

    const farHip = shifted(pose.hip, -30, 12);
    const farShoulder = shifted(pose.shoulder, -28, 8);
    const farElbow = shifted(pose.elbow, -42, 25);
    const farHand = shifted(pose.hand, -45, 22);
    const farKnee = pose.farKnee || shifted(pose.knee, -48, 16);
    const farAnkle = pose.farAnkle || shifted(pose.ankle, -45, 12);
    const farToe = pose.farToe || shifted(pose.toe, -38, 10);

    bone(farShoulder, farElbow, true); bone(farElbow, farHand, true);
    bone(farHip, farKnee, true); bone(farKnee, farAnkle, true); bone(farAnkle, farToe, true);
    bone(pose.shoulder, pose.hip); bone(pose.shoulder, pose.elbow); bone(pose.elbow, pose.hand);
    bone(pose.hip, pose.knee); bone(pose.knee, pose.ankle); bone(pose.ankle, pose.toe);
    [pose.shoulder, pose.elbow, pose.hand, pose.hip, pose.knee, pose.ankle].forEach((p) => joint(p));

    // Body-only by construction: the crop ends at the shoulder line and no
    // head or facial geometry is drawn into an exercise demonstration.

    const pulse = 19 + 7 * Math.sin(phase * Math.PI * 2) ** 2;
    for (const key of focus) {
      const p = pose[key];
      if (!p) continue;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 9; ctx.globalAlpha = 0.78;
      ctx.beginPath(); ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.line; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(540, 1735, 52, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.beginPath(); ctx.arc(540, 1735, 52, -Math.PI / 2, -Math.PI / 2 + phase * Math.PI * 2); ctx.stroke();
  };
` });

const ffmpeg = await ffmpegPath();
const candidates = { version: 1, status: "awaiting-qualified-coach-review", movements: {} };

try {
  for (const movement of AUTHORING_MOVEMENTS) {
    console.log(`Authoring ${movement.name}...`);
    const frameDir = ensureDir(join(framesRoot, movement.id));
    for (let frame = 0; frame < FRAMES; frame++) {
      const t = frame / FRAMES;
      const authored = movementFrame(movement.id, t);
      await page.evaluate(({ pose, context, focus, phase }) => {
        window.renderFitherMovement({ pose, context, focus, phase });
      }, { ...authored, phase: t });
      await page.screenshot({
        path: join(frameDir, `frame-${String(frame).padStart(4, "0")}.png`),
        clip: { x: 0, y: 0, width: 1080, height: 1920 },
      });
    }

    const output = join(exportsDir, `${movement.id}-v1.mp4`);
    await pexec(ffmpeg, [
      "-y", "-framerate", String(FPS), "-i", join(frameDir, "frame-%04d.png"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
      "-r", String(FPS), "-movflags", "+faststart", "-an", output,
    ], { maxBuffer: 1 << 24 });
    const entry = {
      source: "authored",
      rights: "FITHER-owned",
      path: `assets/animation-exports/${movement.id}-v1.mp4`,
      sha256: createHash("sha256").update(readFileSync(output)).digest("hex"),
      duration: DURATION,
      width: 1080,
      height: 1920,
      fps: FPS,
      loop_safe: true,
      movement_verified: false,
      faceless_verified: true,
      app_movement_id: movement.appId,
      review_status: "awaiting-qualified-coach-review",
    };
    await assertAnimationMedia(output, entry);
    await assertNoFaces(output, DURATION);
    await createQaSheet(output, join(reviewDir, `${movement.id}-v1.png`), { interval: 0.5 });
    candidates.movements[movement.name] = [entry];
  }
} finally {
  await page.close();
  await browser.close();
  rmSync(framesRoot, { recursive: true, force: true });
}

writeFileSync(
  join(repoRoot, "assets", "animation-candidates.json"),
  `${JSON.stringify(candidates, null, 2)}\n`,
);
console.log(`Authored ${AUTHORING_MOVEMENTS.length} review candidates in ${exportsDir}`);
