// Final-output gates. Every verification is fail-closed: an unreadable frame,
// unavailable detector, missing QA sheet or unmeasurable audio is a failed
// render, never a note attached to an apparently successful one.
import { execFile } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { cacheDir, ensureDir, ffmpegPath } from "./env.mjs";
import { faceInJpeg } from "./persons.mjs";
import { meanVolume } from "./compose.mjs";

const pexec = promisify(execFile);

export async function assertVoiceAudible(file, voFiles, measure = meanVolume) {
  const silent = [];
  const unverifiable = [];
  for (const voice of voFiles ?? []) {
    const duration = Math.max(0.3, (voice.dur ?? 1) - 0.2);
    const level = await measure(file, voice.t + 0.1, duration);
    if (level == null || !Number.isFinite(level)) unverifiable.push(`${voice.t.toFixed(1)}s`);
    else if (level < -45) silent.push(`${voice.t.toFixed(1)}s`);
  }
  if (unverifiable.length) {
    throw new Error(`audio verification could not measure voice at ${unverifiable.join(", ")}`);
  }
  if (silent.length) {
    throw new Error(`audio verification found no voice at ${silent.join(", ")}`);
  }
}

export async function audioMasterMetrics(file) {
  const ffmpeg = await ffmpegPath();
  try {
    const { stderr } = await pexec(ffmpeg, [
      "-i", file, "-map", "a", "-af", "ebur128=peak=true", "-f", "null", "-",
    ], { maxBuffer: 1 << 24 });
    return parseAudioMasterMetrics(stderr ?? "");
  } catch (cause) {
    const parsed = parseAudioMasterMetrics(cause.stderr ?? "");
    if (parsed) return parsed;
    return null;
  }
}

export function parseAudioMasterMetrics(output) {
  const integrated = [...String(output).matchAll(/I:\s*(-?[\d.]+) LUFS/g)].at(-1);
  const peak = [...String(output).matchAll(/Peak:\s*(-?[\d.]+) dBFS/g)].at(-1);
  if (!integrated || !peak) return null;
  return { integratedLufs: Number(integrated[1]), truePeakDbfs: Number(peak[1]) };
}

export async function assertAudioMaster(file, measure = audioMasterMetrics) {
  const metrics = await measure(file);
  if (!metrics || !Number.isFinite(metrics.integratedLufs) || !Number.isFinite(metrics.truePeakDbfs)) {
    throw new Error("audio master verification could not measure loudness and true peak");
  }
  if (metrics.integratedLufs < -17 || metrics.integratedLufs > -11) {
    throw new Error(`audio master loudness ${metrics.integratedLufs} LUFS is outside -17 to -11 LUFS`);
  }
  if (metrics.truePeakDbfs > -1) {
    throw new Error(`audio master true peak ${metrics.truePeakDbfs} dBFS exceeds -1 dBFS`);
  }
  return metrics;
}

// The finished-video face check. Source screening in broll.mjs keys off
// these so the two can never drift apart.
export const OUTPUT_FACE_THRESHOLD = 0.6;
export const OUTPUT_SAMPLE_INTERVAL = 0.5;
// Detection is exposure sensitive, so screening and verification must
// preprocess frames identically.
export const PROBE_EQ = "eq=brightness=0.1:contrast=1.1";

export function faceSampleTimes(duration, interval = OUTPUT_SAMPLE_INTERVAL) {
  const times = [];
  for (let time = 0.5; time < duration; time += interval) times.push(Math.min(time, duration - 0.05));
  return [...new Set(times.map((time) => Number(time.toFixed(3))))];
}

export async function assertNoFaces(file, duration, options = {}) {
  const ffmpeg = options.ffmpeg ?? await ffmpegPath();
  const detect = options.detect ?? faceInJpeg;
  const exec = options.exec ?? pexec;
  const tmpDir = ensureDir(options.tmpDir ?? join(cacheDir, "tmp"));
  const hits = [];
  const times = options.times ?? faceSampleTimes(duration);

  for (const [index, time] of times.entries()) {
    const frame = join(tmpDir, `${process.pid}-${index}-${Date.now()}-facecheck.jpg`);
    try {
      await exec(ffmpeg, [
        "-y", "-ss", String(time), "-i", file,
        "-vf", PROBE_EQ,
        "-frames:v", "1", "-q:v", "4", frame,
      ], { maxBuffer: 1 << 22 });
      if (!existsSync(frame) || statSync(frame).size === 0) throw new Error("ffmpeg produced no frame");
      if (await detect(readFileSync(frame), OUTPUT_FACE_THRESHOLD)) hits.push(`${time.toFixed(1)}s`);
    } catch (cause) {
      throw new Error(`faceless verification failed at ${time.toFixed(1)}s: ${cause.message}`);
    } finally {
      rmSync(frame, { force: true });
    }
  }
  if (hits.length) throw new Error(`faceless verification detected a face at ${hits.join(", ")}`);
}

export async function createQaSheet(file, out, options = {}) {
  const ffmpeg = await ffmpegPath();
  const interval = options.interval ?? 5;
  if (!(interval > 0)) throw new Error("QA sheet interval must be positive");
  try {
    await pexec(ffmpeg, [
      "-y", "-i", file,
      "-vf", `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${interval})',scale=270:480,tile=4x4`,
      "-frames:v", "1", out,
    ], { maxBuffer: 1 << 24 });
  } catch (cause) {
    throw new Error(`QA sheet generation failed: ${(cause.stderr ?? cause.message).slice(-500)}`);
  }
  if (!existsSync(out) || statSync(out).size === 0) throw new Error("QA sheet generation produced no file");
  return out;
}
