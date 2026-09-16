import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHORING_MOVEMENTS,
  loopProgress,
  movementFrame,
  validateAuthoredPoses,
} from "../lib/animation-poses.mjs";

test("priority authored movement poses stay complete, safe and loop-seamless", () => {
  assert.equal(AUTHORING_MOVEMENTS.length, 13);
  assert.deepEqual(validateAuthoredPoses(), []);
});

test("movement loops travel to the authored end pose and return", () => {
  assert.equal(loopProgress(0), 0);
  assert.equal(loopProgress(0.5), 1);
  assert.ok(Math.abs(loopProgress(1)) < Number.EPSILON);
  const start = movementFrame("air-squat", 0).pose.hip;
  const bottom = movementFrame("air-squat", 0.5).pose.hip;
  const end = movementFrame("air-squat", 1).pose.hip;
  assert.notDeepEqual(bottom, start);
  assert.deepEqual(end, start);
});

test("the second authored batch moves the joint each movement teaches", () => {
  const at = (id, key, t) => movementFrame(id, t).pose[key];
  // Sit-to-Stand rises off the seat and stands over the feet at the peak.
  assert.ok(at("sit-to-stand", "hip", 0.5).y < at("sit-to-stand", "hip", 0).y - 100);
  assert.ok(Math.abs(at("sit-to-stand", "hip", 0.5).x - at("sit-to-stand", "ankle", 0.5).x) < 20);
  // Standing Hip Hinge sends the hips back and the shoulders forward; the feet stay put.
  assert.ok(at("standing-hip-hinge", "hip", 0.5).x < at("standing-hip-hinge", "hip", 0).x - 80);
  assert.ok(at("standing-hip-hinge", "shoulder", 0.5).x > at("standing-hip-hinge", "shoulder", 0).x + 100);
  assert.deepEqual(at("standing-hip-hinge", "ankle", 0.5), at("standing-hip-hinge", "ankle", 0));
  // Wall Slide takes the hand up the wall and keeps it on the wall.
  assert.ok(at("wall-slide", "hand", 0.5).y < at("wall-slide", "hand", 0).y - 200);
  assert.ok(Math.abs(at("wall-slide", "hand", 0.5).x - at("wall-slide", "hand", 0).x) < 5);
  // Doorframe Lean Row keeps the hand on the frame and pulls the shoulder toward it.
  assert.deepEqual(at("doorframe-lean-row", "hand", 0.5), at("doorframe-lean-row", "hand", 0));
  assert.ok(at("doorframe-lean-row", "shoulder", 0.5).x > at("doorframe-lean-row", "shoulder", 0).x + 80);
  // The two holds breathe rather than travel.
  for (const id of ["wall-sit", "knee-plank"]) {
    const dy = Math.abs(at(id, "shoulder", 0.5).y - at(id, "shoulder", 0).y);
    assert.ok(dy > 0 && dy < 20, `${id} shoulder moves ${dy}px`);
    assert.deepEqual(at(id, "ankle", 0.5), at(id, "ankle", 0));
  }
});
