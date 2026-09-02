import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetReport, readyAnimations } from "../lib/assets.mjs";

test("parses only the Ready animation section", () => {
  const markdown = "## Ready\n\n- wall-push-up (Wall Push-Up) — file.riv\n<!-- - template (Not Real) — example -->\n\n## In production\n\n- squat (Air Squat) — soon\n";
  assert.deepEqual(readyAnimations(markdown), ["Wall Push-Up"]);
});

test("reports thin reused demo pools and malformed library entries", () => {
  const specs = [{ slug: "one", scenes: [{ demo: true, movement: "Wall Push-Up" }] }];
  const library = { movements: { "Wall Push-Up": [{ pexels_id: 1, duration: 5, pexels_url: "bad" }] } };
  const result = buildAssetReport(specs, library, "## Ready\n\n(none yet)\n");
  assert.ok(result.errors.some((error) => error.includes("invalid Pexels URL")));
  assert.ok(result.warnings.some((warning) => warning.includes("AAA target is 3+")));
  assert.match(result.report, /\| Wall Push-Up \| 1 \| 1 \| 1 \| Thin \|/);
});
