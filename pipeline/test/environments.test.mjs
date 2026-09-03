import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../lib/env.mjs";
import { buildEnvironmentPrompt, resolveSetting, validateEnvironmentLibrary } from "../lib/environments.mjs";

const book = JSON.parse(readFileSync(join(repoRoot, "assets/generation-prompts.json"), "utf8"));

test("every setting keyword maps to a defined setting", () => {
  for (const [keyword, setting] of book.environments.setting_keywords) {
    assert.ok(book.environments.settings[setting], `"${keyword}" maps to unknown setting "${setting}"`);
  }
  assert.ok(book.environments.settings[book.environments.default_setting]);
});

test("settings resolve as intended and fall back visibly", () => {
  assert.equal(resolveSetting("hands opening oven door", book).setting, "kitchen");
  assert.equal(resolveSetting("feet climbing home staircase", book).setting, "stairwell");
  assert.equal(resolveSetting("hands typing at desk", book).setting, "office");
  assert.equal(resolveSetting("bare feet on yoga mat", book).setting, "bedroom");
  assert.equal(resolveSetting("hand on hotel window", book).setting, "hotel_room");
  // A mat that is not a yoga mat belongs in her own room, not the bedroom.
  const plain = resolveSetting("knees on exercise mat closeup", book);
  assert.equal(plain.setting, "apartment");
  assert.equal(plain.matched, null, "an unmatched query must report its fallback");
});

// Every environment prompt is composed at run time, so a shot-book edit can
// silently push one past Runway's cap. The sidecars are the real workload.
test("every sidecar query composes a prompt inside Runway's limit", () => {
  const dir = join(repoRoot, "content", "scripts");
  const queries = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    for (const scene of JSON.parse(readFileSync(join(dir, file), "utf8")).scenes ?? []) {
      if (!scene.demo && !scene.animation && scene.broll_query) queries.add(scene.broll_query.trim());
    }
  }
  assert.ok(queries.size > 0);
  for (const query of queries) {
    const built = buildEnvironmentPrompt(query, book);
    assert.ok(built.prompt.length <= 1000, `${query}: ${built.prompt.length} chars`);
    assert.ok(built.motion.length <= 1000);
    assert.ok(built.prompt.includes(book.wardrobe), `${query}: character wardrobe missing`);
  }
});

test("an environment clip needs review, a checksum and an https url", () => {
  const clip = {
    source: "generated", provider: "runway", prompt: "p",
    url: "https://example.com/a.mp4", sha256: "b".repeat(64),
    duration: 5, scene_verified: true, reviewed_at: "2026-09-03",
  };
  assert.deepEqual(validateEnvironmentLibrary({ queries: { q: [clip] } }).errors, []);
  const cases = [
    [{ ...clip, scene_verified: false }, /scene_verified/],
    [{ ...clip, url: "http://example.com/a.mp4" }, /HTTPS/],
    [{ ...clip, sha256: "nope" }, /SHA-256/],
    [{ ...clip, reviewed_at: "yesterday" }, /reviewed_at/],
    [{ ...clip, source: "pexels" }, /generated or owned/],
    [{ ...clip, source: "owned", faceless_verified: false }, /faceless_verified/],
  ];
  for (const [broken, pattern] of cases) {
    const { errors } = validateEnvironmentLibrary({ queries: { q: [broken] } });
    assert.ok(errors.some((e) => pattern.test(e)), `expected ${pattern} for ${JSON.stringify(broken.source)}`);
  }
});
