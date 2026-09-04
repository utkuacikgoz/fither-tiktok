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


// A voided experiment is a record of a test that never ran. Counting it
// against the week's 1-3 budget would block the week from registering the
// tests it can actually run, which is what happened when week 01's three
// video experiments were stranded by the footage hold.
test("void experiments do not consume the week's budget", () => {
  const record = (id, status) => `## ${id} — Q?\n\n- **Week opened**: 01\n- **Status**: ${status}\n` +
    `- **Hypothesis**: h\n- **Variants**: v\n- **Metric**: saves per 1000\n` +
    `- **Decision rule**: over 15 saves/1k wins\n` +
    (status === "running" ? `- **Result**: —\n- **Decision**: —\n` : `- **Result**: none arrived\n- **Decision**: void\n`);

  const fiveWithThreeVoid = [
    record("EXP-001", "void"), record("EXP-002", "void"), record("EXP-003", "void"),
    record("EXP-004", "running"), record("EXP-005", "running"),
  ].join("\n");
  assert.deepEqual(validateExperiments(fiveWithThreeVoid, []).errors, []);

  const fourLive = [
    record("EXP-001", "running"), record("EXP-002", "running"),
    record("EXP-003", "running"), record("EXP-004", "running"),
  ].join("\n");
  assert.ok(validateExperiments(fourLive, []).errors.some((e) => /1-3 live experiments, found 4/.test(e)));

  // A week whose records are all void registers no live test at all, so the
  // week simply does not appear in the budget. That is correct: there is no
  // week to judge, rather than a week with zero tests.
  const allVoid = [record("EXP-001", "void"), record("EXP-002", "void")].join("\n");
  assert.deepEqual(validateExperiments(allVoid, []).errors, []);
});
