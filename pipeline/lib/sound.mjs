// Original FITHER sound beds. They are synthesized deterministically from
// simple waveforms and filtered noise, so every render is rights-safe,
// reproducible and independent of a third-party music catalogue.
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cacheDir, ensureDir, ffmpegPath } from "./env.mjs";

const pexec = promisify(execFile);
export const SOUND_PROFILES = new Set(["quiet-drive"]);
const BED_DURATION = 65;
const SOUND_VERSION = "fither-bed-v1";

export async function renderSoundBed(profile = "quiet-drive") {
  if (!SOUND_PROFILES.has(profile)) throw new Error(`unknown sound profile "${profile}"`);
  const dir = ensureDir(join(cacheDir, "sound"));
  const key = createHash("sha256").update(`${SOUND_VERSION}|${profile}`).digest("hex").slice(0, 16);
  const out = join(dir, `${profile}-${key}.mp3`);
  if (existsSync(out) && statSync(out).size > 0) return out;

  const ffmpeg = await ffmpegPath();
  const pulse = "0.20*sin(2*PI*49*t)*exp(-8*mod(t\\,0.75))";
  const chime = "0.035*sin(2*PI*587.33*t)*exp(-5*mod(t\\,6))";
  const tonal = [
    "0.44*sin(2*PI*98*t)",
    "0.26*sin(2*PI*146.832*t)",
    "0.18*sin(2*PI*195.998*t)",
    "0.08*sin(2*PI*293.665*t)",
    pulse,
    chime,
  ].join("+");

  const filters = [
    "[0:a]highpass=f=35,lowpass=f=4200,volume=0.18[tones]",
    "[1:a]highpass=f=180,lowpass=f=5000,volume=0.08[air]",
    `[tones][air]amix=inputs=2:normalize=0,acompressor=threshold=-18dB:ratio=2:attack=40:release=300,loudnorm=I=-20:LRA=5:TP=-2,afade=t=in:st=0:d=1.2,afade=t=out:st=${BED_DURATION - 2}:d=2[out]`,
  ];

  try {
    await pexec(ffmpeg, [
      "-y",
      "-f", "lavfi", "-i", `aevalsrc=${tonal}:s=44100:d=${BED_DURATION}`,
      "-f", "lavfi", "-i", `anoisesrc=color=pink:amplitude=0.04:r=44100:d=${BED_DURATION}`,
      "-filter_complex", filters.join(";"),
      "-map", "[out]",
      "-c:a", "libmp3lame", "-b:a", "192k",
      out,
    ], { maxBuffer: 1 << 24 });
  } catch (cause) {
    throw new Error(`sound-bed generation failed: ${(cause.stderr ?? cause.message).slice(-800)}`);
  }
  if (!existsSync(out) || statSync(out).size === 0) throw new Error("sound-bed generation produced no file");
  return out;
}
