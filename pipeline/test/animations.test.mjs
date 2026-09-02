import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  animationIdentity,
  fetchApprovedAnimation,
  validateAnimationLibrary,
} from "../lib/animations.mjs";

function entry(body = Buffer.from("authored-animation-fixture")) {
  return {
    source: "authored",
    rights: "FITHER-owned",
    path: "assets/animation-exports/air-squat.mp4",
    sha256: createHash("sha256").update(body).digest("hex"),
    duration: 6,
    width: 1080,
    height: 1920,
    fps: 30,
    loop_safe: true,
    movement_verified: true,
    faceless_verified: true,
    reviewed_at: "2026-09-02",
  };
}

test("validates the authored export approval contract", () => {
  const valid = { version: 1, movements: { "Air Squat": [entry()] } };
  assert.deepEqual(validateAnimationLibrary(valid).errors, []);

  const invalid = structuredClone(valid);
  invalid.movements["Air Squat"][0].rights = "unknown";
  invalid.movements["Air Squat"][0].width = 720;
  invalid.movements["Air Squat"][0].loop_safe = false;
  const { errors } = validateAnimationLibrary(invalid);
  assert.ok(errors.some((message) => message.includes("rights must be FITHER-owned")));
  assert.ok(errors.some((message) => message.includes("1080x1920")));
  assert.ok(errors.some((message) => message.includes("loop_safe")));
});

test("ingests a checksum-pinned local export and writes shot metadata", async () => {
  const root = mkdtempSync(join(tmpdir(), "fither-animation-"));
  const exportDir = join(root, "assets", "animation-exports");
  const cacheRoot = join(root, "cache");
  mkdirSync(exportDir, { recursive: true });
  const body = Buffer.from("authored-animation-fixture");
  const approved = entry(body);
  writeFileSync(join(exportDir, "air-squat.mp4"), body);
  const file = await fetchApprovedAnimation("Air Squat", "seed", new Set(), {
    library: { version: 1, movements: { "Air Squat": [approved] } },
    root,
    cacheRoot,
    historyIds: new Set(),
    verifyMedia: async () => {},
  });
  assert.deepEqual(readFileSync(file), body);
  const metadata = JSON.parse(readFileSync(`${file}.meta.json`, "utf8"));
  assert.equal(metadata.asset_id, animationIdentity(approved));
  assert.equal(metadata.kind, "animation");
});

test("fails closed on checksum drift and posted animation reuse", async () => {
  const root = mkdtempSync(join(tmpdir(), "fither-animation-bad-"));
  const exportDir = join(root, "assets", "animation-exports");
  mkdirSync(exportDir, { recursive: true });
  const approved = entry();
  writeFileSync(join(exportDir, "air-squat.mp4"), "tampered");
  await assert.rejects(
    fetchApprovedAnimation("Air Squat", "seed", new Set(), {
      library: { version: 1, movements: { "Air Squat": [approved] } },
      root,
      cacheRoot: join(root, "cache"),
      historyIds: new Set(),
      verifyMedia: async () => {},
    }),
    /checksum mismatch/,
  );
  await assert.rejects(
    fetchApprovedAnimation("Air Squat", "seed", new Set(), {
      library: { version: 1, movements: { "Air Squat": [approved] } },
      root,
      cacheRoot: join(root, "cache-2"),
      historyIds: new Set([animationIdentity(approved)]),
      verifyMedia: async () => {},
    }),
    /no fresh approved authored animation/,
  );
});
