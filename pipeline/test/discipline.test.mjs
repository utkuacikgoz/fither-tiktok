import test from "node:test";
import assert from "node:assert/strict";
import { overdueIntakeWeeks } from "../lib/discipline.mjs";

const weeks = new Map([
  ["03", [{ slug: "2026-09-26-a", post_date: "2026-09-26" }, { slug: "2026-09-30-b", post_date: "2026-09-30" }]],
  ["04", [{ slug: "2026-10-09-c", post_date: "2026-10-09" }]],
]);

test("a finished week with no performance rows is overdue", () => {
  const overdue = overdueIntakeWeeks(weeks, [], new Date("2026-10-08T12:00:00Z"));
  assert.deepEqual(overdue.map((w) => w.week), ["03"]);
});

test("one measured post clears the week, and an unfinished week is never overdue", () => {
  const overdue = overdueIntakeWeeks(weeks, [{ slug: "2026-09-30-b" }], new Date("2026-10-08T12:00:00Z"));
  assert.deepEqual(overdue, []);
});
