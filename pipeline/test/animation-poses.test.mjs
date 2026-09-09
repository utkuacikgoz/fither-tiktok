import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHORING_MOVEMENTS,
  loopProgress,
  movementFrame,
  validateAuthoredPoses,
} from "../lib/animation-poses.mjs";

test("priority authored movement poses stay complete, safe and loop-seamless", () => {
  assert.equal(AUTHORING_MOVEMENTS.length, 7);
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
