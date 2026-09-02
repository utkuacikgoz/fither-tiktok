import test from "node:test";
import assert from "node:assert/strict";
import { parseExperiments, validateExperiments } from "../lib/experiments.mjs";

const running = `# Experiment registry

## EXP-001 — A real test

- **Week opened**: 01
- **Status**: running
- **Hypothesis**: one variant wins.
- **Metric**: watch %
- **Decision rule**: a gap over 5 points wins.
- **Result**: —
- **Decision**: —
`;

test("parses the Markdown registry into structured records", () => {
  const records = parseExperiments(running);
  assert.equal(records.length, 1);
  assert.equal(records[0].id, "EXP-001");
  assert.equal(records[0].fields["Decision rule"], "a gap over 5 points wins.");
});

test("accepts a well-formed running experiment before results arrive", () => {
  assert.deepEqual(validateExperiments(running).errors, []);
});

test("forces stale running experiments to close before another plan", () => {
  const { errors } = validateExperiments(running, [{ week: "02" }]);
  assert.ok(errors.some((error) => error.includes("close it before planning again")));
});

test("decided experiments require evidence and a decision", () => {
  const malformed = running.replace("running", "decided");
  const { errors } = validateExperiments(malformed);
  assert.ok(errors.some((error) => error.includes("need a result")));
  assert.ok(errors.some((error) => error.includes("need a decision")));
});

