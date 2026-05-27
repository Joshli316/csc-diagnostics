# CSC Diagnostics — workshop self-check suite

A config-driven SPA hosting short, private **self-check** tools for CSC's
workforce workshops (LEP Chinese-immigrant adults). One shared engine; each tool
is a declarative `Instrument` config. Bilingual **EN | 中文(Simplified, zh-Hans)** —
no Traditional, no per-instrument variant logic.

Reference app (same stack, ported from): `~/Desktop/Projects/csc-career-compass`.

## Tools (instruments)
| ID | Workshop | Status |
|----|----------|--------|
| **W15** | Career Growth — "Your Wins" | ✅ built (Phase 1) |
| W10 | Workplace Culture Fit | planned (config-only) |
| W04 | Transferable Skills Finder | planned (config-only) |
| W12 | Hidden Network | planned (config-only) |

## Tech Stack
- Vanilla HTML + TypeScript SPA. No framework. Vite build.
- Static config + JSON copy. **No API calls, no backend** (`connect-src 'self'`).
- Cloudflare Pages. Entry point `index.html`.

## Architecture
```
src/
  engine/            instrument.ts (schema) · registry.ts · survey-logic.ts ·
                     survey.ts · scoring.ts · results.ts · state.ts · i18n.ts ·
                     pdf.ts · util.ts
  instruments/<id>/  config.ts · scoring.ts · copy.en.json · copy.zh-Hans.json
  data/locales/      en.json · zh-Hans.json   (global chrome copy)
public/_headers · scripts/stamp-csp-hash.mjs
```
The engine renders by `question.kind` and `result.block.kind`; it **never imports
an instrument** — only `registry.ts` does. Adding a tool = new `instruments/<id>/`
folder + one line in `registry.ts`.

- **Question kinds:** `matrix-rating`, `chips`, `tiles`, `single-tile`, `choice`, `repeater`.
- **Scoring helpers:** `readinessBucket` (0–8 → building/getting_ready/ready), `sumRatings`, `dimensionTally`.
- **Result blocks:** `narrative`, `list-reflect`, `level-meter`, `script-seed`, `cta` (split-map/asset-map added with W10/W12).
- **State:** `{ ratings, picks, singles, repeaters }` under `cscDiag.<id>.state`, 24h resume.

## Routes (hash router, instrument-first segment)
- `#/` — hub landing (registry-driven)
- `#/<id>/` — instrument intro (start/resume)
- `#/<id>/q` — survey state machine
- `#/<id>/results` — results + PDF take-home

## Scripts
- `npm run dev` — vite dev server on :3000
- `npm test` — vitest unit tests (survey-logic + W15 scoring)
- `npm run test:e2e` — Playwright (needs `test:e2e:install` once)
- `npm run build` — vite build → dist/ + stamp CSP hash

## Conventions
- **No login, no PII.** Free-text repeater rows stay in localStorage only.
- **Bilingual:** EN | 中文 toggle. Updates `localStorage.cscDiag.lang` AND `document.documentElement.lang` (a11y). Chinese copy is **draft** until native-speaker review (`_meta.draft: true` shows a banner).
- **CSP-safe:** data-action delegation, NO inline onclick. `escapeHtml()` on every dynamic/user string.
- **Accessibility:** 18px+ body, 44px tap targets, mobile-first (375 / 768 / 1024).
- **Print:** each results page fits one US-Letter portrait page.
- Every page carries the footer disclaimer: "starting point, not professional counseling — talk to your CSC specialist."
- **No backup files** when editing. **No auto-deploy** — wait for explicit "deploy".

## Pre-deploy TODO
- `src/instruments/w15/config.ts` `WORKSHOP_URL` is a placeholder (workshops hub). Point it at the live Career Growth workshop deep link before shipping.
