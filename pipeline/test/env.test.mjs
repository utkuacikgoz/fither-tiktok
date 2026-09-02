import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findChromium } from "../lib/env.mjs";

function fakeExecutable(path) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, "");
  return path;
}

test("uses Playwright's resolved Chromium executable when no system browser exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "fither-chromium-"));
  try {
    const expected = fakeExecutable(join(dir, "resolved", "chrome"));
    assert.equal(findChromium({ preferredPath: expected, roots: [], systemPaths: [] }), expected);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prefers a signed system browser over a blocked local cache", () => {
  const dir = mkdtempSync(join(tmpdir(), "fither-chromium-"));
  try {
    const downloaded = fakeExecutable(join(dir, "cache", "chrome"));
    const system = fakeExecutable(join(dir, "system", "chrome"));
    assert.equal(findChromium({ preferredPath: downloaded, roots: [], systemPaths: [system] }), system);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("finds current Linux Playwright Chromium cache layouts", () => {
  const dir = mkdtempSync(join(tmpdir(), "fither-chromium-"));
  try {
    const expected = fakeExecutable(join(
      dir,
      "chromium_headless_shell-1194",
      "chrome-headless-shell-linux64",
      "headless_shell",
    ));
    assert.equal(findChromium({ preferredPath: "", roots: [dir], systemPaths: [] }), expected);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
