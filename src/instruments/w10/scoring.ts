/**
 * W10 "Workplace Culture Fit" scoring. Partitions the US-workplace-norm ratings
 * into strengths (comes naturally) vs watch-outs (feels hard) for the split-map.
 */
import type { CopyT, Diagnosis, InstrumentState } from "../../engine/instrument";
import { pickLang } from "../../engine/i18n";
import norms from "../../data/shared/us-workplace-norms.json";

type Norm = (typeof norms)[number];

/** Pure partition: rating 2 → strength, rating 0 → watch-out, 1 → neither. */
export function partitionNorms(
  ratings: Record<string, 0 | 1 | 2>,
): { strengths: Norm[]; watchouts: Norm[] } {
  const strengths: Norm[] = [];
  const watchouts: Norm[] = [];
  for (const n of norms) {
    const r = ratings[n.id];
    if (r === 2) strengths.push(n);
    else if (r === 0) watchouts.push(n);
  }
  return { strengths, watchouts };
}

export function score(state: InstrumentState, _ct: CopyT): Diagnosis {
  const { strengths, watchouts } = partitionNorms(state.ratings);
  return {
    vars: { strengthsCount: strengths.length, watchoutsCount: watchouts.length },
    lists: {},
    meters: {},
    scripts: {},
    maps: {
      culture: {
        left: strengths.map((n) => ({ primary: pickLang({ en: n.en, zh: n.zh }) })),
        right: watchouts.map((n) => ({
          primary: pickLang({ en: n.en, zh: n.zh }),
          secondary: pickLang({ en: n.tip_en, zh: n.tip_zh }),
        })),
      },
    },
    tallies: { strengths: strengths.length, watchouts: watchouts.length },
  };
}
