// Rebuilds a video's timeline from measured voiceover audio.
//
// Sidecar timestamps are word-count estimates written before the voice
// exists. The synthesized audio is the truth, so the schedule is rebuilt
// from it rather than nudged: lines are packed one breath apart, and the
// overlays and scene cuts authored against those lines ride along. An
// earlier version only ever pushed lines later, which let a generous
// estimate rather than the speech decide the running time.
const BREATH = 0.35; // between lines
const CLOSE_BEAT = 0.6; // before the closing question
const TAIL = 0.6; // after the last word
const END_CARD_HOLD = 2.2; // the close sits on screen, then the video ends
const MIN_DURATION = 45; // the brief's floor
const MIN_SCENE = 0.5;

const round = (n) => Math.round(n * 100) / 100;

export function rebuildSchedule({ authored, durations, scenes, duration, maxDuration = 60 }) {
  if (authored.length !== durations.length) {
    throw new Error(`schedule: ${authored.length} authored lines but ${durations.length} measured`);
  }

  const times = [];
  let prevEnd = 0;
  for (const [i, d] of durations.entries()) {
    const gap = i === durations.length - 1 ? CLOSE_BEAT : BREATH;
    const t = i === 0 ? 0 : round(prevEnd + gap);
    times.push(t);
    prevEnd = t + d;
  }
  const requiredEnd = round(prevEnd + TAIL);
  if (requiredEnd > maxDuration) {
    return { overLimit: true, requiredEnd, times, scenes, duration };
  }

  // Each overlay and cut moves by however far the line it was authored
  // against moved.
  const shiftAt = (t) => {
    let shift = 0;
    for (const [i, oldT] of authored.entries()) {
      if (oldT > t + 0.001) break;
      shift = times[i] - oldT;
    }
    return shift;
  };

  let floor = 0;
  const moved = scenes.map((scene) => {
    const start = Math.max(floor, round(scene.start + shiftAt(scene.start)));
    const end = Math.max(start + MIN_SCENE, round(scene.end + shiftAt(scene.end)));
    floor = end;
    return {
      ...scene,
      start,
      end,
      overlays: (scene.overlays ?? []).map((overlay) => ({
        ...overlay,
        t: Math.min(Math.max(start, round(overlay.t + shiftAt(overlay.t))), round(end - 0.1)),
      })),
    };
  });

  // End on the close, not on the authored duration: the card gets a fixed
  // hold and the video stops. Padding to the authored length would leave a
  // static end card sitting there for the seconds the speech came in under.
  const last = moved[moved.length - 1];
  last.end = Math.min(
    maxDuration,
    Math.max(MIN_DURATION, last.start + MIN_SCENE, round(requiredEnd + END_CARD_HOLD)),
  );

  const drift = Math.max(0, ...times.map((t, i) => Math.abs(t - authored[i])));
  return { overLimit: false, requiredEnd, times, scenes: moved, duration: last.end, drift };
}
