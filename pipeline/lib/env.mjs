// Shared environment plumbing: proxy-aware fetch, paths, palette.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { setGlobalDispatcher, EnvHttpProxyAgent } from "undici";
import { chromium } from "playwright-core";

// Outbound HTTPS must go through the agent proxy; Node's fetch ignores
// HTTPS_PROXY unless told. NODE_EXTRA_CA_CERTS covers TLS trust.
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const cacheDir = join(repoRoot, "pipeline", "cache");
export const rendersDir = join(repoRoot, "renders");

export function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  return p;
}

// FITHER palette, mirrored from the app repo's app/src/design/tokens.ts.
export const palette = {
  bg: "#FAF7F2", // warm bone
  surface: "#FFFFFF",
  ink: "#1F1D1A",
  inkSoft: "#6E675E",
  accent: "#5C6F5E", // deep sage
  accentSoft: "#E7ECE7",
  gold: "#B98A2F",
  line: "#E8E2D8",
};

export function findChromium({
  preferredPath = chromium.executablePath(),
  roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    "/opt/pw-browsers",
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
  ].filter(Boolean),
  systemPaths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
} = {}) {
  // Prefer an installed system browser when available. On managed macOS
  // hosts a downloaded test browser can be blocked from launching even
  // though the signed system Chrome works. CI has no system browser and
  // falls through to Playwright's exact resolved executable.
  for (const path of systemPaths) {
    if (existsSync(path)) return path;
  }
  if (preferredPath && existsSync(preferredPath)) return preferredPath;

  for (const root of roots) {
    if (!existsSync(root)) continue;
    const dirs = readdirSync(root).filter((d) => d.startsWith("chromium"));
    dirs.sort().reverse();
    for (const d of dirs) {
      for (const rel of [
        "chrome-linux/chrome",
        "chrome-linux64/chrome",
        "chrome-linux/headless_shell",
        "chrome-headless-shell-linux64/headless_shell",
        "chrome-headless-shell-linux/headless_shell",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
        "chrome-headless-shell-mac-arm64/chrome-headless-shell",
      ]) {
        const p = join(root, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error("No Chromium found in PLAYWRIGHT_BROWSERS_PATH, Playwright caches or system applications");
}

export async function ffmpegPath() {
  const mod = await import("ffmpeg-static");
  return mod.default;
}
