import type { Lang } from "./i18n";
import type { InstrumentState } from "./instrument";

const STATE_VERSION = 1;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/** localStorage key for one instrument's saved progress. */
function stateKey(instrumentId: string): string {
  return `cscDiag.${instrumentId}.state`;
}

export function emptyState(lang: Lang): InstrumentState {
  const now = Date.now();
  return {
    version: STATE_VERSION,
    startedAt: now,
    updatedAt: now,
    lang,
    pageIndex: 0,
    ratings: {},
    picks: {},
    singles: {},
    repeaters: {},
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Shape-check a parsed state blob. Guards downstream code from crashing on
 *  tampered or corrupted localStorage entries (no PII risk — pure robustness). */
function isValidState(v: unknown): v is InstrumentState {
  if (!isPlainObject(v)) return false;
  return (
    v.version === STATE_VERSION &&
    typeof v.pageIndex === "number" &&
    typeof v.lang === "string" &&
    isPlainObject(v.ratings) &&
    isPlainObject(v.picks) &&
    isPlainObject(v.singles) &&
    isPlainObject(v.repeaters)
  );
}

export function loadState(instrumentId: string): InstrumentState | null {
  try {
    const raw = localStorage.getItem(stateKey(instrumentId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) {
      clearState(instrumentId);
      return null;
    }
    return parsed;
  } catch {
    clearState(instrumentId);
    return null;
  }
}

export function saveState(instrumentId: string, state: InstrumentState): void {
  state.updatedAt = Date.now();
  try {
    localStorage.setItem(stateKey(instrumentId), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function clearState(instrumentId: string): void {
  try {
    localStorage.removeItem(stateKey(instrumentId));
  } catch {
    /* ignore */
  }
}

export function isFresh(state: InstrumentState): boolean {
  return Date.now() - state.updatedAt < TWENTY_FOUR_HOURS;
}
