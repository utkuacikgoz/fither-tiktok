import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetReport } from "../lib/assets.mjs";

const animations = { version: 1, movements: {} };

test("reports thin reused demo pools and malformed library entries", () => {
  const specs = [{ slug: "one", scenes: [{ demo: true, movement: "Wall Push-Up" }] }];
  const library = { movements: { "Wall Push-Up": [{
    source: "pexels",
    pexels_id: 1,
    duration: 5,
    pexels_url: "bad",
    movement_verified: false,
    faceless_verified: false,
    reviewed_at: "",
  }] } };
  const result = buildAssetReport(specs, library, animations);
  assert.ok(result.errors.some((error) => error.includes("invalid Pexels URL")));
  assert.ok(result.errors.some((error) => error.includes("movement_verified must be true")));
  assert.ok(result.errors.some((error) => error.includes("faceless_verified must be true")));
  assert.ok(result.warnings.some((warning) => warning.includes("AAA target is 3+")));
  assert.match(result.report, /\| Wall Push-Up \| 1 \| 1 \| 1 \| Thin \|/);
});

test("accepts checksum-pinned owned footage", () => {
  const library = { movements: { "Full Plank": [{
    source: "owned",
    url: "https://media.example.test/full-plank-side.mp4",
    sha256: "a".repeat(64),
    duration: 10,
    movement_verified: true,
    faceless_verified: true,
    reviewed_at: "2026-09-02",
  }] } };
  const result = buildAssetReport([], library, animations);
  assert.deepEqual(result.errors, []);
  assert.match(result.report, /Approved body-only clips: \*\*1\*\*/);
});

test("tracks quarantined clips without counting them as approved depth", () => {
  const specs = [{ slug: "one", scenes: [{ demo: true, movement: "Air Squat" }] }];
  const library = {
    movements: {},
    quarantined: [{
      movement: "Air Squat",
      pexels_id: 2,
      duration: 8,
      pexels_url: "https://www.pexels.com/video/example-2/",
      reason: "Face visible.",
    }],
  };
  const result = buildAssetReport(specs, library, animations);
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some((warning) => warning.includes("1 current demo scene(s)")));
  assert.match(result.report, /Approved body-only clips: \*\*0\*\*/);
  assert.match(result.report, /Quarantined legacy clips: \*\*1\*\*/);
  assert.match(result.report, /\| Air Squat \| 0 \| 1 \| 1 \| Blocked \|/);
});

test("rejects a Pexels clip listed as both approved and quarantined", () => {
  const library = {
    movements: { "Full Plank": [{
      source: "pexels",
      pexels_id: 7,
      duration: 8,
      pexels_url: "https://www.pexels.com/video/example-7/",
      movement_verified: true,
      faceless_verified: true,
      reviewed_at: "2026-09-02",
    }] },
    quarantined: [{
      movement: "Full Plank",
      pexels_id: 7,
      duration: 8,
      pexels_url: "https://www.pexels.com/video/example-7/",
      reason: "Duplicate truth state.",
    }],
  };
  const result = buildAssetReport([], library, animations);
  assert.ok(result.errors.some((error) => error.includes("duplicates approved Full Plank")));
});

test("reports approved authored animation depth and current use", () => {
  const animationLibrary = { version: 1, movements: { "Air Squat": [{
    source: "authored",
    rights: "FITHER-owned",
    path: "assets/animation-exports/air-squat.mp4",
    sha256: "b".repeat(64),
    duration: 6,
    width: 1080,
    height: 1920,
    fps: 30,
    loop_safe: true,
    movement_verified: true,
    faceless_verified: true,
    reviewed_at: "2026-09-02",
  }] } };
  const specs = [{ slug: "one", scenes: [{ animation: true, movement: "Air Squat" }] }];
  const result = buildAssetReport(specs, { movements: {} }, animationLibrary);
  assert.deepEqual(result.errors, []);
  assert.match(result.report, /Ready authored animation exports: \*\*1\*\*/);
  assert.match(result.report, /\| Air Squat \| 1 \| 1 \| 1 \| Ready \|/);
});

test("accepts generated footage carrying its provenance", () => {
  const library = { movements: { "Doorframe Row": [{
    source: "generated",
    provider: "runway",
    model: "gen4_turbo",
    prompt: "A woman doing doorframe rows, framed from the shoulders down",
    url: "https://raw.githubusercontent.test/generated/doorframe-row.mp4",
    sha256: "b".repeat(64),
    duration: 5,
    movement_verified: true,
    faceless_verified: true,
    reviewed_at: "2026-09-02",
  }] } };
  const result = buildAssetReport([], library, animations);
  assert.deepEqual(result.errors, []);
});

test("rejects generated footage without provider or prompt provenance", () => {
  const library = { movements: { "Doorframe Row": [{
    source: "generated",
    url: "https://raw.githubusercontent.test/generated/doorframe-row.mp4",
    sha256: "c".repeat(64),
    duration: 5,
    movement_verified: true,
    faceless_verified: true,
    reviewed_at: "2026-09-02",
  }] } };
  const result = buildAssetReport([], library, animations);
  assert.ok(result.errors.some((error) => error.includes("known provider")));
  assert.ok(result.errors.some((error) => error.includes("needs its prompt")));
});
