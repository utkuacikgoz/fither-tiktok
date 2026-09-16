// Motion typography: a video that carries no footage at all.
//
// Generated footage costs real money per clip and never amortises, because
// the shot-history gate retires every asset once a post using it publishes.
// A typographic video costs nothing but the voiceover, which is cached per
// line, so the format exists to let the channel ship video while the footage
// question is still open (owner decision, 2026-09-04).
//
// The design is the carousel's, which already clears the brand bar: kicker,
// display line, footer, over the brand ground. The difference is that the
// card moves and a voice reads it.
//
// **The card is the caption.** One card per spoken beat means the words on
// screen are the words being said, so a muted viewer loses nothing and there
// is no burned-caption layer fighting the typography for the lower third.
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ffmpegPath, ensureDir, cacheDir } from "./env.mjs";
import { renderSlide } from "./overlays.mjs";

const pexec = promisify(execFile);

// A card sits on screen for one spoken beat. Longer than this and a static
// frame reads as a stall; shorter and the viewer cannot finish reading it.
export const CARD_MIN_SECONDS = 2.2;
export const CARD_MAX_SECONDS = 8;
export const MIN_CARDS = 7;
export const MAX_CARDS = 18;

// Rendered at 1.5x so the zoom crops into real pixels rather than upscaling.
const CARD_SCALE = 1.5;
// Five percent over the whole card. Enough that the frame is never still,
// little enough that it never reads as a camera move.
const ZOOM = 0.05;

export function cardZoomFilter(duration, fps = 30) {
  const frames = Math.max(1, Math.round(duration * fps));
  const step = (ZOOM / frames).toFixed(8);
  // Centred zoom. x and y are recomputed from the live zoom each frame,
  // which is what keeps the centre from drifting and jittering.
  return [
    `zoompan=z='min(1+${step}*on,${(1 + ZOOM).toFixed(3)})'`,
    `x='iw/2-(iw/zoom/2)'`,
    `y='ih/2-(ih/zoom/2)'`,
    `d=1:s=1080x1920:fps=${fps}`,
  ].join(":") + ",setsar=1";
}

// Renders one card to a silent MP4 the compositor can treat as any other
// scene background.
export async function renderCardClip({ kicker, text, footer, kind, index, total, duration, theme, background }, file) {
  const ffmpeg = await ffmpegPath();
  const png = join(ensureDir(join(cacheDir, "cards")), `${index}-${Math.random().toString(36).slice(2)}.png`);
  await renderSlide({ kicker, text, footer, kind, index, total, solo: true, scale: CARD_SCALE, cue: "", theme, background }, png);
  await pexec(ffmpeg, [
    "-y", "-loglevel", "error",
    "-loop", "1", "-framerate", "30", "-t", duration.toFixed(3), "-i", png,
    "-vf", cardZoomFilter(duration),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
    file,
  ], { maxBuffer: 1 << 24 });
  return file;
}
