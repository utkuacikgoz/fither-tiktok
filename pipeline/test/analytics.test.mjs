import test from "node:test";
import assert from "node:assert/strict";
import { generateInsights } from "../lib/analytics.mjs";

const header = "date_posted,week,slug,pillar,format,hook_mechanism,views,watch_pct,saves,follows,completion_pct,retention_dropoff_s,comments,notes";

test("channel metrics are weighted by real viewers and include retention diagnostics", () => {
  const csv = [
    header,
    "2026-01-05,01,small,Constraint,environment-pov,situation,100,20,1,0,10,5,,",
    "2026-01-06,01,large,Constraint,environment-pov,situation,900,60,18,9,50,15,,",
  ].join("\n");
  const output = generateInsights(csv);
  assert.match(output, /View-weighted watch %: \*\*56\.0\*\*/);
  assert.match(output, /Saves per 1000 views: \*\*19\.0\*\*/);
  assert.match(output, /Follows per 1000 views: \*\*9\.0\*\*/);
  assert.match(output, /View-weighted completion %: \*\*46\.0\*\*/);
  assert.match(output, /View-weighted retention drop-off: \*\*14\.0s\*\*/);
});

test("missing calendar weeks break a kill-criteria streak", () => {
  const csv = [
    header,
    "2026-01-05,01,a,Constraint,text-on-screen,situation,100,20,1,0,10,5,,",
    "2026-01-19,03,b,Constraint,text-on-screen,situation,100,20,1,0,10,5,,",
    "2026-01-26,04,c,Constraint,text-on-screen,situation,100,20,1,0,10,5,,",
  ].join("\n");
  const output = generateInsights(csv);
  assert.doesNotMatch(output, /kill rule says cut it/);
  assert.match(output, /under 30% for 2 straight calendar weeks/);
});

test("three genuinely consecutive low weeks trigger the kill rule", () => {
  const csv = [
    header,
    "2026-01-05,01,a,Constraint,text-on-screen,situation,100,20,1,0,10,5,,",
    "2026-01-12,02,b,Constraint,text-on-screen,situation,100,20,1,0,10,5,,",
    "2026-01-19,03,c,Constraint,text-on-screen,situation,100,20,1,0,10,5,,",
  ].join("\n");
  assert.match(generateInsights(csv), /kill rule says cut it/);
});

