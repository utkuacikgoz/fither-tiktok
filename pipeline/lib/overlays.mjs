// Renders text overlays and slides to PNG with headless Chromium.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { cacheDir, ensureDir, findChromium } from "./env.mjs";

// Bump when a template's look changes, so cached overlay PNGs regenerate.
const TEMPLATE_VERSION = "v3-endcard-captions";

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "templates");
const nm = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules");
const font400 = `file://${join(nm, "@fontsource/inter/files/inter-latin-400-normal.woff2")}`;
const font600 = `file://${join(nm, "@fontsource/inter/files/inter-latin-600-normal.woff2")}`;
const fontDisplay = `file://${join(nm, "@fontsource/fraunces/files/fraunces-latin-600-normal.woff2")}`;

const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

let browserPromise = null;
function getBrowser() {
  browserPromise ??= chromium.launch({
    executablePath: findChromium(),
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = null;
}

async function renderHtmlToPng(html, file, { transparent }) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  // A setContent page is about:blank and may not fetch file:// fonts;
  // navigate to a real temp file so @font-face resolves.
  const tmp = join(ensureDir(join(cacheDir, "tmp")), `page-${process.pid}-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(tmp, html);
  try {
    await page.goto(`file://${tmp}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: file, omitBackground: transparent });
  } finally {
    await page.close();
    rmSync(tmp, { force: true });
  }
}

export async function renderOverlay({ text, style = "step" }) {
  const dir = ensureDir(join(cacheDir, "overlays"));
  const key = createHash("sha1").update(`${TEMPLATE_VERSION}|${style}|${text}`).digest("hex");
  const file = join(dir, `${key}.png`);
  if (!existsSync(file)) {
    const html = readFileSync(join(templatesDir, "overlay.html"), "utf8")
      .replace("__FONT_400__", font400)
      .replace("__FONT_DISPLAY__", fontDisplay)
      .replace("__STYLE__", esc(style))
      .replace("__TEXT__", esc(text));
    await renderHtmlToPng(html, file, { transparent: true });
  }
  return file;
}

export async function renderSlide({ kicker = "", text, footer = "", index = 1, total = 1, kind = "step" }, file) {
  const textClass = text.length <= 42 ? "short" : text.length >= 82 ? "long" : "";
  const progress = Array.from({ length: total }, () => "<span></span>").join("");
  const cue = index < total ? "SWIPE →" : "SAVE THIS";
  const html = readFileSync(join(templatesDir, "slide.html"), "utf8")
    .replace("__FONT_400__", font400)
    .replace("__FONT_600__", font600)
    .replace("__FONT_DISPLAY__", fontDisplay)
    .replaceAll("__INDEX__", String(index))
    .replaceAll("__TOTAL__", String(total))
    .replace("__PROGRESS__", progress)
    .replace("__KIND__", esc(kind))
    .replace("__TEXT_CLASS__", textClass)
    .replace("__KICKER__", esc(kicker))
    .replace("__TEXT__", esc(text))
    .replace("__FOOTER__", esc(footer))
    .replace("__CUE__", cue);
  await renderHtmlToPng(html, file, { transparent: false });
  return file;
}
