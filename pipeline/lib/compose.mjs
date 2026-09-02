// Builds and runs the single ffmpeg command that assembles one video:
// background scenes (b-roll or brand gradient) + faded text overlays +
// voiceover lines placed at their timestamps.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ffmpegPath, palette } from "./env.mjs";

const pexec = promisify(execFile);

const GRADIENT = (dur) =>
  `gradients=s=1080x1920:c0=${palette.bg.replace("#", "0x")}:c1=${palette.accentSoft.replace("#", "0x")}:speed=0.008:duration=${dur}`;

// Mean audio level (dB) over a window of the file; null when unmeasurable.
export async function meanVolume(file, start, dur) {
  const ffmpeg = await ffmpegPath();
  try {
    const { stderr } = await pexec(
      ffmpeg,
      ["-ss", String(start), "-t", String(dur), "-i", file, "-map", "a", "-af", "volumedetect", "-f", "null", "-"],
      { maxBuffer: 1 << 22 },
    );
    const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(stderr ?? "");
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

export async function mediaDuration(file) {
  const ffmpeg = await ffmpegPath();
  try {
    await pexec(ffmpeg, ["-i", file], { maxBuffer: 1 << 22 });
  } catch (e) {
    const m = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(e.stderr ?? "");
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return null;
}

export async function composeVideo({ spec, sceneFiles, overlays, voFiles, out }) {
  const ffmpeg = await ffmpegPath();
  const total = spec.duration;
  const args = ["-y"];
  const filters = [];

  // Scene background inputs. Held single shots kill retention, so any
  // clip-backed scene longer than ~4.2s is cut into ~3s segments taken
  // from staggered offsets of the clip — jump-cut rhythm without extra
  // downloads or gate passes.
  spec.scenes.forEach((s, i) => {
    const dur = s.end - s.start;
    if (sceneFiles[i]) {
      const nSeg = dur > 4.2 ? Math.min(4, Math.ceil(dur / 3)) : 1;
      const segDur = dur / nSeg;
      // Loop the source long enough that any offset+segment stays in range.
      const loopLen = dur + segDur * nSeg + 2;
      args.push("-stream_loop", "-1", "-t", String(loopLen.toFixed(2)), "-i", sceneFiles[i]);
      const base =
        `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,` +
        `crop=1080:1920,fps=30,setsar=1`;
      if (nSeg === 1) {
        filters.push(`${base},trim=duration=${dur},setpts=PTS-STARTPTS[s${i}]`);
      } else {
        const parts = Array.from({ length: nSeg }, (_, k) => `[c${i}p${k}]`);
        filters.push(`${base},split=${nSeg}${parts.join("")}`);
        const segs = [];
        for (let k = 0; k < nSeg; k++) {
          const off = (k * (segDur + 1.7)).toFixed(2);
          filters.push(
            `[c${i}p${k}]trim=start=${off}:duration=${segDur.toFixed(3)},setpts=PTS-STARTPTS[c${i}s${k}]`,
          );
          segs.push(`[c${i}s${k}]`);
        }
        filters.push(`${segs.join("")}concat=n=${nSeg}:v=1:a=0[s${i}]`);
      }
    } else {
      args.push("-f", "lavfi", "-t", String(dur), "-i", GRADIENT(dur));
      filters.push(`[${i}:v]fps=30,setsar=1,trim=duration=${dur},setpts=PTS-STARTPTS[s${i}]`);
    }
  });
  const nScenes = spec.scenes.length;
  filters.push(
    spec.scenes.map((_, i) => `[s${i}]`).join("") + `concat=n=${nScenes}:v=1:a=0[v0]`,
  );

  // Overlay inputs, faded in/out and shifted to their absolute window.
  overlays.forEach((o, k) => {
    const idx = nScenes + k;
    const win = o.end - o.start;
    const fade = Math.min(0.25, win / 3);
    args.push("-loop", "1", "-t", String(win), "-i", o.file);
    filters.push(
      `[${idx}:v]format=rgba,fade=t=in:st=0:d=${fade}:alpha=1,` +
        `fade=t=out:st=${(win - fade).toFixed(3)}:d=${fade}:alpha=1,` +
        `setpts=PTS-STARTPTS+${o.start}/TB[o${k}]`,
    );
    filters.push(
      `[v${k}][o${k}]overlay=0:0:enable='between(t,${o.start},${o.end})'[v${k + 1}]`,
    );
  });
  const vOut = `v${overlays.length}`;

  // Audio: voiceover lines at their timestamps, or silence for drafts.
  let aOut;
  if (voFiles && voFiles.length > 0) {
    const base = nScenes + overlays.length;
    voFiles.forEach((v, k) => {
      args.push("-i", v.file);
      filters.push(`[${base + k}:a]adelay=${Math.round(v.t * 1000)}:all=1[a${k}]`);
    });
    filters.push(
      voFiles.map((_, k) => `[a${k}]`).join("") +
        `amix=inputs=${voFiles.length}:normalize=0:duration=longest,apad,atrim=duration=${total}[aout]`,
    );
    aOut = "aout";
  } else {
    args.push("-f", "lavfi", "-t", String(total), "-i", "anullsrc=r=44100:cl=stereo");
    aOut = `${nScenes + overlays.length}:a`;
  }

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", `[${vOut}]`,
    "-map", aOut.startsWith("v") || aOut === "aout" ? `[${aOut}]` : aOut,
    "-c:v", "libx264", "-preset", "medium", "-crf", "22",
    "-maxrate", "3M", "-bufsize", "6M", "-r", "30",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    "-t", String(total),
    out,
  );

  try {
    await pexec(ffmpeg, args, { maxBuffer: 1 << 26 });
  } catch (e) {
    throw new Error(`ffmpeg failed:\n${(e.stderr ?? String(e)).slice(-2000)}`);
  }
  return out;
}
