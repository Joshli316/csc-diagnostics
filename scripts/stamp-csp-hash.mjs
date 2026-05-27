#!/usr/bin/env node
// Recompute the sha256 of the inline <script> in dist/index.html and patch
// dist/_headers so CSP script-src 'sha256-…' matches the actual bootstrap.
// Without this step, the html[lang] bootstrap is silently blocked by CSP.
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "dist/index.html"), "utf8");

const match = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/);
if (!match) {
  console.error("[stamp-csp-hash] no inline script found in dist/index.html");
  process.exit(1);
}
const inlineBody = match[1];
const hash = createHash("sha256").update(inlineBody, "utf8").digest("base64");

const headersSrc = resolve(root, "public/_headers");
const headersDst = resolve(root, "dist/_headers");
if (!existsSync(headersSrc)) {
  console.error("[stamp-csp-hash] public/_headers missing");
  process.exit(1);
}
mkdirSync(dirname(headersDst), { recursive: true });
copyFileSync(headersSrc, headersDst);

let headers = readFileSync(headersDst, "utf8");
const re = /script-src ([^;\n]*?)'sha256-[^'\n]+'/;
if (!re.test(headers)) {
  console.error("[stamp-csp-hash] no 'sha256-…' placeholder found in _headers script-src");
  process.exit(1);
}
headers = headers.replace(re, (_, prefix) => `script-src ${prefix}'sha256-${hash}'`);
writeFileSync(headersDst, headers, "utf8");
console.log(`[stamp-csp-hash] script-src sha256-${hash}`);
