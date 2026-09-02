import test from "node:test";
import assert from "node:assert/strict";
import { auditShotUsage, shotHistoryIds } from "../lib/shots.mjs";

const record = (slug, id) => ({
  slug,
  week: "01",
  post_date: "2026-09-04",
  assets: [{ scene_start: 0, kind: "environment", asset_id: id, query: "quiet hotel room" }],
});

test("shot history exposes previously posted identities", () => {
  assert.deepEqual([...shotHistoryIds({ version: 1, posted: [{ asset_id: "pexels:10" }] })], ["pexels:10"]);
});

test("shot audit rejects reuse within a pack and across posted history", () => {
  const result = auditShotUsage(
    [record("first", "pexels:10"), record("second", "pexels:10"), record("third", "owned:abc")],
    { version: 1, posted: [{ slug: "old", asset_id: "owned:abc" }] },
  );
  assert.ok(result.errors.some((error) => error.includes("repeats in first and second")));
  assert.ok(result.errors.some((error) => error.includes("already posted in old")));
  assert.match(result.report, /Reuse violations: \*\*2\*\*/);
});

test("shot audit accepts a pack with distinct fresh footage", () => {
  const result = auditShotUsage(
    [record("first", "pexels:10"), record("second", "pexels:11")],
    { version: 1, posted: [] },
  );
  assert.deepEqual(result.errors, []);
  assert.match(result.report, /Distinct identities: \*\*2\*\*/);
});
