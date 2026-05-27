# CSC Diagnostics

A config-driven suite of short, private **self-check** tools for Chinatown Service
Center workshops. One shared engine renders every tool from a declarative
`Instrument` config. Bilingual English / Simplified Chinese. No login, no
backend — everything stays on the visitor's device.

**Phase 1 ships W15 "Your Wins"** (Career Growth workshop): list your
accomplishments, get a readiness meter, and walk away with a 3-step raise script
pre-filled with your strongest win.

## Develop
```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests
npm run test:e2e     # Playwright (run `npm run test:e2e:install` first)
npm run build        # dist/ + stamped CSP hash
```

## Add a new tool
1. `src/instruments/<id>/` — `config.ts`, `scoring.ts`, `copy.en.json`, `copy.zh-Hans.json`.
2. Register it in `src/engine/registry.ts`.

See `CLAUDE.md` for architecture and conventions.
