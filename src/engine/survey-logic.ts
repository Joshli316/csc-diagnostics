/**
 * Pure (DOM-free) survey state-machine logic. Generalized from career-compass:
 * `buildPageList` reads `inst.pages` instead of a hardcoded sequence, and
 * `validatePage` switches on `question.kind`. `togglePick` is ported verbatim.
 *
 * Imported by survey.ts for rendering and by survey-logic.test.ts for tests.
 */
import type { Instrument, InstrumentState, Page, Question } from "./instrument";

export function buildPageList(inst: Instrument): Page[] {
  return inst.pages;
}

export type ValidationCode =
  | "pick_one_each"
  | "pick_one"
  | "pick_exact_n"
  | "need_min_rows";

export interface ValidationResult {
  code: ValidationCode;
  vars?: Record<string, number>;
}

/** Count repeater rows that have at least one non-blank field. */
export function filledRowCount(rows: Record<string, string>[] | undefined): number {
  if (!rows) return 0;
  return rows.filter((r) => Object.values(r).some((v) => v.trim().length > 0)).length;
}

function validateQuestion(state: InstrumentState, q: Question): ValidationResult | null {
  switch (q.kind) {
    case "matrix-rating": {
      const unanswered = q.items.some((it) => state.ratings[it.id] === undefined);
      return unanswered ? { code: "pick_one_each" } : null;
    }
    case "chips":
      // Capped multi-select — 0 allowed; the FIFO cap is enforced on toggle.
      return null;
    case "tiles": {
      const n = state.picks[q.id]?.length ?? 0;
      return n !== q.pick ? { code: "pick_exact_n", vars: { n: q.pick } } : null;
    }
    case "single-tile":
      return state.singles[q.id] === undefined ? { code: "pick_one" } : null;
    case "choice":
      return state.singles[q.id] === undefined ? { code: "pick_one" } : null;
    case "repeater": {
      const filled = filledRowCount(state.repeaters[q.id]);
      return filled < q.min ? { code: "need_min_rows", vars: { min: q.min } } : null;
    }
  }
}

/** First incomplete question's validation code, or null if the page is done. */
export function validatePage(state: InstrumentState, page: Page): ValidationResult | null {
  for (const q of page.questions) {
    const res = validateQuestion(state, q);
    if (res) return res;
  }
  return null;
}

/**
 * Toggle a "pick up to N" item, evicting the oldest (FIFO) when the cap would
 * be exceeded. Returns a new array; never mutates the input.
 */
export function togglePick(list: string[], id: string, cap: number): string[] {
  const idx = list.indexOf(id);
  const next = [...list];
  if (idx >= 0) {
    next.splice(idx, 1);
  } else {
    if (next.length >= cap) next.shift();
    next.push(id);
  }
  return next;
}
