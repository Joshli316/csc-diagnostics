/**
 * Shared, DOM-free scoring helpers — the "spec dispatcher" each instrument's
 * own scoring.ts composes. career-compass's RIASEC vector + cosine are dropped;
 * diagnostics need readiness banding and dimension tallies instead.
 */
import type { InstrumentState, MeterValue, ReadinessLevel } from "./instrument";

/**
 * Map a 0–8 readiness sum to a band. Edges: 0–2 building, 3–5 getting_ready,
 * 6–8 ready. (Unit-tested at 0/2/3/5/6/8.)
 */
export function readinessLevel(sum: number): ReadinessLevel {
  if (sum <= 2) return "building";
  if (sum <= 5) return "getting_ready";
  return "ready";
}

/** Build a level-meter value from a 0–8 readiness sum. */
export function readinessBucket(sum: number, max = 8): MeterValue {
  return { level: readinessLevel(sum), score: sum, max };
}

/** Sum the 3-point ratings for a set of item ids (missing = 0). */
export function sumRatings(state: InstrumentState, itemIds: string[]): number {
  return itemIds.reduce((acc, id) => acc + (state.ratings[id] ?? 0), 0);
}

/**
 * Tally selections/ratings into named dimensions. Reserved for W04/W10, which
 * map question options to dimensions via the optional `dimension` field.
 */
export function dimensionTally(counts: Record<string, number>): Record<string, number> {
  return { ...counts };
}

/**
 * Group items into ordered buckets by a key function, preserving both the
 * bucket order of first appearance and item order within a bucket. Used by the
 * asset-map (W04 skills by dimension, W12 contacts by category).
 */
export function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = keyOf(item);
    const bucket = out.get(k);
    if (bucket) bucket.push(item);
    else out.set(k, [item]);
  }
  return out;
}
