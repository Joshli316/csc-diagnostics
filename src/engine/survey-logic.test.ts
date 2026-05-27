import { describe, it, expect } from "vitest";
import { buildPageList, validatePage, togglePick, filledRowCount } from "./survey-logic";
import { emptyState } from "./state";
import type { Instrument, InstrumentState, Page } from "./instrument";

function st(overrides: Partial<InstrumentState> = {}): InstrumentState {
  return { ...emptyState("en"), ...overrides };
}

// ---- Fixture pages, one per question kind ----
const matrixPage: Page = {
  id: "m",
  questions: [{
    kind: "matrix-rating",
    id: "m",
    scaleKeys: ["s.2", "s.1", "s.0"],
    items: [{ id: "a", labelKey: "a" }, { id: "b", labelKey: "b" }],
  }],
};
const chipsPage: Page = {
  id: "c",
  questions: [{ kind: "chips", id: "c", cap: 3, options: [{ id: "x", labelKey: "x" }] }],
};
const tilesPage: Page = {
  id: "t",
  questions: [{ kind: "tiles", id: "t", pick: 2, options: [
    { id: "t1", labelKey: "t1" }, { id: "t2", labelKey: "t2" }, { id: "t3", labelKey: "t3" },
  ] }],
};
const singlePage: Page = {
  id: "s",
  questions: [{ kind: "single-tile", id: "s", options: [{ id: "o1", labelKey: "o1" }] }],
};
const choicePage: Page = {
  id: "ch",
  questions: [{ kind: "choice", id: "ch", aKey: "a", bKey: "b" }],
};
const repeaterPage: Page = {
  id: "rep",
  questions: [{
    kind: "repeater", id: "rep", min: 2, max: 5, addLabelKey: "add", removeLabelKey: "rm",
    fields: [{ id: "f1", labelKey: "f1" }, { id: "f2", labelKey: "f2" }],
  }],
};

describe("buildPageList", () => {
  it("returns the instrument's declared pages verbatim", () => {
    const inst = { pages: [matrixPage, repeaterPage] } as Instrument;
    expect(buildPageList(inst)).toEqual([matrixPage, repeaterPage]);
  });
});

describe("validatePage — matrix-rating", () => {
  it("fails until every item is rated", () => {
    expect(validatePage(st(), matrixPage)?.code).toBe("pick_one_each");
    expect(validatePage(st({ ratings: { a: 1 } }), matrixPage)?.code).toBe("pick_one_each");
  });
  it("passes when all items rated (even value 0)", () => {
    expect(validatePage(st({ ratings: { a: 0, b: 0 } }), matrixPage)).toBe(null);
  });
});

describe("validatePage — chips", () => {
  it("always passes (capped multi-select, 0 allowed)", () => {
    expect(validatePage(st(), chipsPage)).toBe(null);
    expect(validatePage(st({ picks: { c: ["x"] } }), chipsPage)).toBe(null);
  });
});

describe("validatePage — tiles (pick exactly N)", () => {
  it.each([
    [[], "pick_exact_n"],
    [["t1"], "pick_exact_n"],
    [["t1", "t2"], null],
    [["t1", "t2", "t3"], "pick_exact_n"],
  ] as const)("picks=%j", (picks, expected) => {
    const res = validatePage(st({ picks: { t: [...picks] } }), tilesPage);
    expect(res?.code ?? null).toBe(expected);
  });
  it("reports the required count in vars", () => {
    expect(validatePage(st(), tilesPage)?.vars).toEqual({ n: 2 });
  });
});

describe("validatePage — single-tile & choice", () => {
  it("single-tile fails until one is picked", () => {
    expect(validatePage(st(), singlePage)?.code).toBe("pick_one");
    expect(validatePage(st({ singles: { s: "o1" } }), singlePage)).toBe(null);
  });
  it("choice fails until a side is picked", () => {
    expect(validatePage(st(), choicePage)?.code).toBe("pick_one");
    expect(validatePage(st({ singles: { ch: "a" } }), choicePage)).toBe(null);
  });
});

describe("validatePage — repeater (min rows)", () => {
  it("counts only rows with at least one non-blank field", () => {
    expect(filledRowCount([{ f1: "", f2: " " }, { f1: "hi", f2: "" }])).toBe(1);
  });
  it("fails below min, passes at min", () => {
    expect(validatePage(st({ repeaters: { rep: [{ f1: "one", f2: "" }] } }), repeaterPage)?.code).toBe("need_min_rows");
    expect(validatePage(st({ repeaters: { rep: [{ f1: "one", f2: "" }, { f1: "two", f2: "" }] } }), repeaterPage)).toBe(null);
  });
  it("blank rows do not count toward min", () => {
    const res = validatePage(st({ repeaters: { rep: [{ f1: "", f2: "" }, { f1: "", f2: "" }] } }), repeaterPage);
    expect(res?.code).toBe("need_min_rows");
    expect(res?.vars).toEqual({ min: 2 });
  });
});

describe("togglePick (FIFO cap)", () => {
  it("adds a new id", () => { expect(togglePick([], "a", 3)).toEqual(["a"]); });
  it("removes an existing id", () => { expect(togglePick(["a", "b"], "a", 3)).toEqual(["b"]); });
  it("evicts oldest when cap would be exceeded", () => { expect(togglePick(["a", "b", "c"], "d", 3)).toEqual(["b", "c", "d"]); });
  it("does not evict when removing", () => { expect(togglePick(["a", "b", "c"], "b", 3)).toEqual(["a", "c"]); });
  it("does not mutate the input array", () => {
    const orig = ["a", "b", "c"];
    const after = togglePick(orig, "d", 3);
    expect(orig).toEqual(["a", "b", "c"]);
    expect(after).not.toBe(orig);
  });
});
