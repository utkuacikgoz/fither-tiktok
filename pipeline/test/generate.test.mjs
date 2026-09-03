import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { characterUri, generateClip, providersAvailable } from "../lib/generate.mjs";
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

test("Runway is listed only when its secret is present", async () => {
  await withEnv({ RUNWAY_API_SECRET: "" }, () => assert.deepEqual(providersAvailable(), []));
  await withEnv({ RUNWAY_API_SECRET: "secret" }, () => assert.deepEqual(providersAvailable(), ["runway"]));
});

test("generation refuses unknown providers, empty prompts and a missing secret", async () => {
  await assert.rejects(() => generateClip("runway", { prompt: "" }), /needs a prompt/);
  await assert.rejects(() => generateClip("sora", { prompt: "a wall push-up" }), /unknown provider/);
  await withEnv({ RUNWAY_API_SECRET: "" }, async () => {
    await assert.rejects(() => generateClip("runway", { prompt: "a wall push-up" }), /RUNWAY_API_SECRET/);
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

// Runway rejects a promptText over 1000 characters with a 400. A whole run
// was spent discovering that, so the limit is pinned here.
test("every composed prompt fits Runway's promptText limit", () => {
  const book = JSON.parse(readFileSync(join(repoRoot, "assets/generation-prompts.json"), "utf8"));
  for (const [movement, entry] of Object.entries(book.movements)) {
    const framing = entry.framing ?? book.framing;
    const prompt = [entry.prompt, framing, book.wardrobe, book.room, book.light, book.camera, book.look].join(" ");
    const motion = [entry.motion, framing].join(" ");
    assert.ok(prompt.length <= 1000, `${movement}: still prompt is ${prompt.length} chars`);
    assert.ok(motion.length <= 1000, `${movement}: motion prompt is ${motion.length} chars`);
  }
});

// Runway asset URLs expire within a day or two and the candidates branch is
// force-pushed by the next casting run, so the approved portrait is kept as
// bytes in the repo and sent inline. A pinned character that silently
// unpins is worse than no character at all.
test("the character reference is sent inline when it is a repo file", () => {
  assert.equal(characterUri(null), null);
  assert.equal(characterUri("https://example.com/her.jpg"), "https://example.com/her.jpg");
  const png = join(tmpdir(), `fither-character-${process.pid}.png`);
  writeFileSync(png, Buffer.from("89504e470d0a1a0a", "hex"));
  try {
    assert.equal(characterUri(png), `data:image/png;base64,${readFileSync(png).toString("base64")}`);
  } finally {
    rmSync(png, { force: true });
  }
  assert.throws(() => characterUri("/tmp/her.gif"), /expected a \.jpg, \.png or \.webp/);
});
