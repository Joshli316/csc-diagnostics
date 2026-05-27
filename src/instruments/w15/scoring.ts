/**
 * W15 "Your Wins" scoring. Pure + DOM-free. The exported helpers
 * (`buildRaiseScript`, `pickTopWin`) are the unit-tested surface; `score`
 * composes them with the shared `readinessBucket`.
 */
import type { CopyT, Diagnosis, InstrumentState, ListItem } from "../../engine/instrument";
import { readinessBucket, sumRatings } from "../../engine/scoring";

export const WINS_QID = "wins";
export const READINESS_ITEM_IDS = ["r1", "r2", "r3", "r4"];
export const READINESS_MAX = 8; // 4 items × 2

export interface Win {
  action: string;
  result: string;
}

export interface RaiseTemplates {
  open: string;
  evidence: string;
  evidenceEmpty: string;
  ask: string;
}

function interpolate(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? vars[name] : `{${name}}`));
}

/** Filled wins, in entry order. A row counts if either field has text. */
export function collectWins(state: InstrumentState): Win[] {
  const rows = state.repeaters[WINS_QID] ?? [];
  return rows
    .map((r) => ({ action: (r.action ?? "").trim(), result: (r.result ?? "").trim() }))
    .filter((w) => w.action.length > 0 || w.result.length > 0);
}

/**
 * The strongest win to feature in the raise script: the first that quantifies
 * its result (a number — "numbers not adjectives"), else the first win.
 */
export function pickTopWin(wins: Win[]): Win | null {
  if (wins.length === 0) return null;
  const quantified = wins.find((w) => /\d/.test(w.result));
  return quantified ?? wins[0];
}

/**
 * Three-step raise/promotion conversation seed: open → evidence → ask. The top
 * win is interpolated into the evidence line. Returns raw lines; the renderer
 * escapeHtml-escapes them (so a win containing markup can never inject).
 */
export function buildRaiseScript(win: Win | null, templates: RaiseTemplates): string[] {
  const evidence =
    win && (win.action || win.result)
      ? interpolate(templates.evidence, { action: win.action, result: win.result })
      : templates.evidenceEmpty;
  return [templates.open, evidence, templates.ask];
}

export function score(state: InstrumentState, ct: CopyT): Diagnosis {
  const wins = collectWins(state);
  const lists: ListItem[] = wins.map((w) => ({
    primary: w.action || w.result,
    secondary: w.action && w.result ? w.result : undefined,
  }));

  const readinessSum = sumRatings(state, READINESS_ITEM_IDS);
  const meter = readinessBucket(readinessSum, READINESS_MAX);

  const raise = buildRaiseScript(pickTopWin(wins), {
    open: ct("script.open"),
    evidence: ct("script.evidence"),
    evidenceEmpty: ct("script.evidence_empty"),
    ask: ct("script.ask"),
  });

  return {
    vars: { winCount: wins.length },
    lists: { wins: lists },
    meters: { readiness: meter },
    scripts: { raise },
  };
}
