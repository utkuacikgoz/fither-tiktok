import test from "node:test";
import assert from "node:assert/strict";
import { rebuildSchedule } from "../lib/schedule.mjs";

const scenes = [
  { start: 0, end: 20, broll_query: "a", overlays: [{ t: 0, style: "hook", text: "h" }, { t: 10, style: "step", text: "s" }] },
  { start: 20, end: 59.8, broll_query: "b", overlays: [{ t: 20, style: "step", text: "s2" }, { t: 50, style: "cta", text: "c?" }] },
];
const authored = [0, 10, 20, 50];

test("packs lines one breath apart and never overlaps them", () => {
  const durations = [4, 5, 6, 4];
  const { times, overLimit } = rebuildSchedule({ authored, durations, scenes, duration: 59.8 });
  assert.equal(overLimit, false);
  assert.deepEqual(times, [0, 4.35, 9.7, 16.3]);
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i] >= times[i - 1] + durations[i - 1], `line ${i} starts before line ${i - 1} finishes`);
  }
});

test("pulls a too-generous authored schedule earlier instead of only pushing later", () => {
  // The regression that broke six renders: authored times sat far later than
  // the measured audio needed, so the estimate rather than the speech set the
  // running time and blew the 60s contract.
  const durations = [3, 3, 3, 3];
  const { times, requiredEnd, overLimit } = rebuildSchedule({ authored, durations, scenes, duration: 59.8 });
  assert.equal(overLimit, false);
  assert.ok(times[3] < authored[3], "the closing line should move earlier, not later");
  assert.ok(requiredEnd < 20, `speech should finish early, got ${requiredEnd}`);
});

test("overlays and scene cuts ride the rebuilt schedule", () => {
  const durations = [4, 5, 6, 4];
  const { times, scenes: moved } = rebuildSchedule({ authored, durations, scenes, duration: 59.8 });
  assert.equal(moved[0].overlays[0].t, times[0]);
  assert.equal(moved[0].overlays[1].t, times[1]);
  assert.equal(moved[1].start, times[2]);
  assert.equal(moved[1].overlays[0].t, times[2]);
  assert.equal(moved[1].overlays[1].t, times[3]);
  for (const scene of moved) {
    for (const overlay of scene.overlays) {
      assert.ok(overlay.t >= scene.start && overlay.t < scene.end, "overlay must stay inside its scene");
    }
  }
  assert.equal(moved[0].end, moved[1].start, "scenes must stay contiguous");
});

test("ends on the close rather than padding to the authored duration", () => {
  // Speech that comes in under the authored length must not leave a static
  // end card sitting on screen for the difference.
  const durations = [12, 12, 12, 12];
  const { scenes: moved, duration, requiredEnd } = rebuildSchedule({ authored, durations, scenes, duration: 59.8 });
  assert.ok(duration < 59.8, `expected an early finish, got ${duration}`);
  assert.ok(duration - requiredEnd <= 2.5, "the end card hold should be short and fixed");
  assert.equal(moved.at(-1).end, duration);
});

test("never drops below the brief's 45s floor", () => {
  const durations = [3, 3, 3, 3];
  const { duration } = rebuildSchedule({ authored, durations, scenes, duration: 59.8 });
  assert.ok(duration >= 45, `duration ${duration} is under the brief`);
});

test("reports over the limit instead of shipping a long video", () => {
  const durations = [20, 20, 20, 20];
  const { overLimit, requiredEnd } = rebuildSchedule({ authored, durations, scenes, duration: 59.8 });
  assert.equal(overLimit, true);
  assert.ok(requiredEnd > 60);
});

test("never runs past the contract even when the authored duration does", () => {
  const durations = [4, 5, 6, 4];
  const { duration } = rebuildSchedule({ authored, durations, scenes, duration: 75 });
  assert.ok(duration <= 60, `duration ${duration} exceeds the contract`);
});

test("refuses a measurement list that does not match the script", () => {
  assert.throws(() => rebuildSchedule({ authored, durations: [1, 2], scenes, duration: 59.8 }), /authored lines/);
});
