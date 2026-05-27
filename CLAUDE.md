# CSC Diagnostics — workshop self-check suite

A config-driven SPA hosting short, private **self-check** tools for CSC's
workforce workshops (LEP Chinese-immigrant adults). One shared engine; each tool
is a declarative `Instrument` config. Bilingual **EN | 中文(Simplified, zh-Hans)** —
no Traditional, no per-instrument variant logic.

Reference app (same stack, ported from): `~/Desktop/Projects/csc-career-compass`.

## Tools (instruments)
| ID | Workshop | Reveals → outputs |
|----|----------|-------------------|
| **W15** | Career Growth — "Your Wins" | wins repeater + readiness → wins list, readiness meter, 3-step raise script |
| **W04** | Interview Skills — "Transferable Skills Finder" | jobs repeater + skills chips → inventory grouped by dimension + 2 STAR seeds |
| **W10** | Workplace Culture Fit | 6 norm ratings → strengths/watch-outs split-map (each watch-out + a tip) |
| **W12** | Networking — "Hidden Network" | contacts by category + readiness → asset-map + meter + outreach message |

All four are live. Deployed at https://csc-diagnostics.pages.dev (CF Pages, direct upload, production branch `master`). Repo: https://github.com/Joshli316/csc-diagnostics

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

## Follow-ups
- **`WORKSHOP_URL` placeholders** — all four `instruments/<id>/config.ts` cta links point at the workshops hub (`https://csc-workshops.pages.dev/`). Point each at its live workshop deep link when known.
- **Chinese copy is draft** (`_meta.draft: true` in `data/locales/zh-Hans.json` and each `copy.zh-Hans.json`) — needs native-speaker review before client use. The draft banner shows in 中文 until then.
