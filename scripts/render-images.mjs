#!/usr/bin/env node
// One-off PNG renderer: og-image.html → public/og.png (1200x630)
//                       apple-touch-icon.html → public/apple-touch-icon.png (180x180)
// Uses the shared system Playwright install (per project memory: never
// `npm install` heavy deps into a static-site repo's node_modules).
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "/Users/zhihuang/.local/share/playwright-test/node_modules/playwright/index.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const jobs = [
  { html: "og-image.html", out: "public/og.png", w: 1200, h: 630 },
  { html: "apple-touch-icon.html", out: "public/apple-touch-icon.png", w: 180, h: 180 },
];

const browser = await chromium.launch();
for (const job of jobs) {
  const ctx = await browser.newContext({
    viewport: { width: job.w, height: job.h },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const url = pathToFileURL(resolve(root, job.html)).href;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const outPath = resolve(root, job.out);
  await page.screenshot({ path: outPath, omitBackground: false, type: "png" });
  console.log(`✓ ${job.out} (${job.w}×${job.h} @2x)`);
  await ctx.close();
}
await browser.close();
