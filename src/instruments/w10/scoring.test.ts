import { describe, it, expect } from "vitest";
import { partitionNorms, score } from "./scoring";
import { emptyState } from "../../engine/state";
import type { CopyT, InstrumentState } from "../../engine/instrument";

const ct: CopyT = (k) => k;
function st(o: Partial<InstrumentState> = {}): InstrumentState {
  return { ...emptyState("en"), ...o };
}

describe("W10 partitionNorms", () => {
  it("rating 2 → strength, 0 → watch-out, 1 → neither", () => {
    const { strengths, watchouts } = partitionNorms({
      n_speak: 2,
      n_sell: 0,
      n_smalltalk: 1,
      n_questions: 2,
    });
    expect(strengths.map((n) => n.id)).toEqual(["n_speak", "n_questions"]);
    expect(watchouts.map((n) => n.id)).toEqual(["n_sell"]);
  });

  it("empty ratings → both columns empty", () => {
    const { strengths, watchouts } = partitionNorms({});
    expect(strengths).toEqual([]);
    expect(watchouts).toEqual([]);
  });
});

describe("W10 score → split-map", () => {
  it("builds left (strengths) and right (watch-outs with tips)", () => {
    const diag = score(st({ ratings: { n_speak: 2, n_sell: 0 } }), ct);
    const map = diag.maps!.culture;
    expect(map.left).toHaveLength(1);
    expect(map.left[0].primary).toMatch(/Speaking up/);
    expect(map.right).toHaveLength(1);
    expect(map.right[0].primary).toMatch(/achievements/);
    expect(map.right[0].secondary).toMatch(/list of your wins/); // coping tip attached
    expect(diag.tallies).toEqual({ strengths: 1, watchouts: 1 });
  });
});
