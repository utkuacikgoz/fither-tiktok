import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateClip, providersAvailable } from "../lib/generate.mjs";
import { repoRoot } from "../lib/env.mjs";

const withEnv = async (vars, fn) => {
  const previous = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
};

test("providers are listed only when their credentials are present", async () => {
  await withEnv(
    { RUNWAY_API_SECRET: "", HIGGSFIELD_API_KEY_ID: "", HIGGSFIELD_API_KEY_SECRET: "" },
    () => assert.deepEqual(providersAvailable(), []),
  );
  await withEnv({ RUNWAY_API_SECRET: "secret", HIGGSFIELD_API_KEY_ID: "", HIGGSFIELD_API_KEY_SECRET: "" }, () =>
    assert.deepEqual(providersAvailable(), ["runway"]),
  );
  await withEnv({ RUNWAY_API_SECRET: "", HIGGSFIELD_API_KEY_ID: "id", HIGGSFIELD_API_KEY_SECRET: "sec" }, () =>
    assert.deepEqual(providersAvailable(), ["higgsfield"]),
  );
});

test("generation refuses unknown providers, empty prompts and missing keys", async () => {
  await assert.rejects(() => generateClip("runway", { prompt: "" }), /needs a prompt/);
  await assert.rejects(() => generateClip("midjourney", { prompt: "a wall push-up" }), /unknown provider/);
  await withEnv({ RUNWAY_API_SECRET: "" }, async () => {
    await assert.rejects(() => generateClip("runway", { prompt: "a wall push-up" }), /RUNWAY_API_SECRET/);
  });
  await withEnv({ HIGGSFIELD_API_KEY_ID: "", HIGGSFIELD_API_KEY_SECRET: "" }, async () => {
    await assert.rejects(() => generateClip("higgsfield", { prompt: "a wall push-up" }), /HIGGSFIELD_API_KEY_ID/);
  });
});

test("every prompt-book movement is a real library movement", () => {
  const library = readFileSync(join(repoRoot, ".claude/skills/fither-voice/references/movement-library.md"), "utf8");
  const names = new Set();
  for (const line of library.split("\n")) {
    const match = /^\|\s*[1-6]\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (match) names.add(match[1]);
  }
  const book = JSON.parse(readFileSync(join(repoRoot, "assets/generation-prompts.json"), "utf8"));
  const movements = Object.keys(book.movements);
  assert.ok(movements.length > 0);
  assert.deepEqual(movements.filter((m) => !names.has(m)), []);
  for (const [movement, entry] of Object.entries(book.movements)) {
    assert.ok(entry.prompt?.trim(), `${movement} needs a prompt`);
    assert.ok(entry.motion?.trim(), `${movement} needs a motion prompt`);
  }
});
