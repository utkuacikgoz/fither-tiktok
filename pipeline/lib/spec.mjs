// Loads and validates a video spec (the .json sidecar next to each script .md).
import { readFileSync, existsSync } from "node:fs";

export function loadSpec(jsonPath) {
  if (!existsSync(jsonPath)) {
    throw new Error(
      `Missing spec ${jsonPath}. The video-writer emits a .json sidecar per script; write one for this video first.`,
    );
  }
  const spec = JSON.parse(readFileSync(jsonPath, "utf8"));
  const errors = [];
  const need = (k) => spec[k] == null && errors.push(`missing "${k}"`);
  ["slug", "format", "caption", "scenes"].forEach(need);
  if (!["environment-pov", "text-on-screen", "slideshow"].includes(spec.format)) {
    errors.push(`format "${spec.format}" unknown`);
  }
  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) {
    errors.push("scenes must be a non-empty array");
  } else {
    let prevEnd = 0;
    spec.scenes.forEach((s, i) => {
      if (typeof s.start !== "number" || typeof s.end !== "number" || s.end <= s.start) {
        errors.push(`scene ${i}: bad start/end`);
      } else if (Math.abs(s.start - prevEnd) > 0.001) {
        errors.push(`scene ${i}: starts at ${s.start}, previous ended at ${prevEnd} (scenes must be contiguous)`);
      }
      prevEnd = s.end;
      for (const o of s.overlays ?? []) {
        if (o.t == null || !o.text) errors.push(`scene ${i}: overlay needs t and text`);
        else if (o.t < s.start - 0.001 || o.t >= s.end) errors.push(`scene ${i}: overlay at ${o.t} outside scene`);
      }
    });
    spec.duration = prevEnd;
  }
  for (const v of spec.voiceover ?? []) {
    if (v.t == null || !v.text) errors.push("voiceover lines need t and text");
    else if (v.t >= spec.duration) errors.push(`voiceover at ${v.t}s is past the end (${spec.duration}s)`);
  }
  if (errors.length) throw new Error(`Invalid spec ${jsonPath}:\n  - ${errors.join("\n  - ")}`);
  return spec;
}

// Overlay display window: from its start time to the next overlay in the
// same scene, or the scene end.
export function overlayWindows(spec) {
  const out = [];
  for (const s of spec.scenes) {
    const os = [...(s.overlays ?? [])].sort((a, b) => a.t - b.t);
    os.forEach((o, i) => {
      out.push({ ...o, start: o.t, end: i + 1 < os.length ? os[i + 1].t : s.end });
    });
  }
  return out;
}
