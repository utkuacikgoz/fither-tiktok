import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assertAudioMaster,
  assertNoFaces,
  assertVoiceAudible,
  faceSampleTimes,
  parseAudioMasterMetrics,
} from "../lib/verify.mjs";

test("audio gate fails closed for silence and measurement errors", async () => {
  const voices = [{ t: 1, dur: 2 }];
  await assert.rejects(() => assertVoiceAudible("video.mp4", voices, async () => -60), /no voice/);
  await assert.rejects(() => assertVoiceAudible("video.mp4", voices, async () => null), /could not measure/);
  await assert.doesNotReject(() => assertVoiceAudible("video.mp4", voices, async () => -18));
});

test("audio master parser uses the final EBU summary", () => {
  const output = `I: -70.0 LUFS\nPeak: -inf dBFS\nSummary:\nI: -14.1 LUFS\nPeak: -1.5 dBFS`;
  assert.deepEqual(parseAudioMasterMetrics(output), { integratedLufs: -14.1, truePeakDbfs: -1.5 });
});

test("audio master gate enforces loudness and true peak", async () => {
  await assert.doesNotReject(() => assertAudioMaster("video.mp4", async () => ({ integratedLufs: -14, truePeakDbfs: -1.5 })));
  await assert.rejects(
    () => assertAudioMaster("video.mp4", async () => ({ integratedLufs: -20, truePeakDbfs: -1.5 })),
    /outside -17 to -11/,
  );
  await assert.rejects(
    () => assertAudioMaster("video.mp4", async () => ({ integratedLufs: -14, truePeakDbfs: -0.4 })),
    /exceeds -1/,
  );
  await assert.rejects(() => assertAudioMaster("video.mp4", async () => null), /could not measure/);
});

test("face sampling covers the video at half-second intervals", () => {
  assert.deepEqual(faceSampleTimes(2.2), [0.5, 1, 1.5, 2]);
});

test("face gate fails closed on extraction errors and detections", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fither-face-gate-"));
  const successfulExec = async (_bin, args) => writeFileSync(args.at(-1), "frame");
  try {
    await assert.doesNotReject(() => assertNoFaces("video.mp4", 1, {
      ffmpeg: "ffmpeg", tmpDir: dir, times: [0.5], exec: successfulExec, detect: async () => false,
    }));
    await assert.rejects(() => assertNoFaces("video.mp4", 1, {
      ffmpeg: "ffmpeg", tmpDir: dir, times: [0.5], exec: async () => { throw new Error("decode failed"); }, detect: async () => false,
    }), /decode failed/);
    await assert.rejects(() => assertNoFaces("video.mp4", 1, {
      ffmpeg: "ffmpeg", tmpDir: dir, times: [0.5], exec: successfulExec, detect: async () => true,
    }), /detected a face/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
