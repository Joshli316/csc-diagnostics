import { describe, it, expect } from "vitest";
import { readinessLevel, readinessBucket } from "../../engine/scoring";
import { escapeHtml } from "../../engine/util";
import { buildRaiseScript, pickTopWin, collectWins, score, type RaiseTemplates, type Win } from "./scoring";
import { emptyState } from "../../engine/state";
import type { CopyT, InstrumentState } from "../../engine/instrument";

function st(overrides: Partial<InstrumentState> = {}): InstrumentState {
  return { ...emptyState("en"), ...overrides };
}

const TEMPLATES: RaiseTemplates = {
  open: "Open line.",
  evidence: "For example: {action} — {result}.",
  evidenceEmpty: "Walk through my results.",
  ask: "Ask for a raise.",
};

// Fake copy resolver mapping the script.* keys to the test templates.
const ct: CopyT = (key) => {
  const map: Record<string, string> = {
    "script.open": TEMPLATES.open,
    "script.evidence": TEMPLATES.evidence,
    "script.evidence_empty": TEMPLATES.evidenceEmpty,
    "script.ask": TEMPLATES.ask,
  };
  return map[key] ?? key;
};

describe("readiness band edges (0–8 → building / getting_ready / ready)", () => {
  it.each([
    [0, "building"],
    [2, "building"],
    [3, "getting_ready"],
    [5, "getting_ready"],
    [6, "ready"],
    [8, "ready"],
  ] as const)("sum=%i → %s", (sum, level) => {
    expect(readinessLevel(sum)).toBe(level);
  });

  it("readinessBucket reports score, max, and level", () => {
    expect(readinessBucket(4, 8)).toEqual({ level: "getting_ready", score: 4, max: 8 });
  });
});

describe("pickTopWin", () => {
  it("returns null with no wins", () => {
    expect(pickTopWin([])).toBe(null);
  });
  it("prefers the first win whose result has a number", () => {
    const wins: Win[] = [
      { action: "Helped customers", result: "they were happy" },
      { action: "Cut wait time", result: "by 30%" },
    ];
    expect(pickTopWin(wins)).toEqual({ action: "Cut wait time", result: "by 30%" });
  });
  it("falls back to the first win when none are quantified", () => {
    const wins: Win[] = [{ action: "Trained the team", result: "they improved" }];
    expect(pickTopWin(wins)).toEqual(wins[0]);
  });
});

describe("buildRaiseScript templating", () => {
  it("interpolates the top win into the evidence line", () => {
    const lines = buildRaiseScript({ action: "Trained 5 hires", result: "cut onboarding 30%" }, TEMPLATES);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Open line.");
    expect(lines[1]).toBe("For example: Trained 5 hires — cut onboarding 30%.");
    expect(lines[2]).toBe("Ask for a raise.");
  });
  it("uses the empty-evidence template when there is no win", () => {
    const lines = buildRaiseScript(null, TEMPLATES);
    expect(lines[1]).toBe("Walk through my results.");
  });
  it("leaves unknown placeholders intact", () => {
    const lines = buildRaiseScript({ action: "X", result: "Y" }, { ...TEMPLATES, evidence: "{action} {result} {bogus}" });
    expect(lines[1]).toBe("X Y {bogus}");
  });
  it("is escapeHtml-safe — injected markup cannot break out at render", () => {
    const lines = buildRaiseScript({ action: "<script>alert(1)</script>", result: "<b>x</b>" }, TEMPLATES);
    const rendered = escapeHtml(lines[1]);
    expect(rendered).not.toContain("<script>");
    expect(rendered).not.toContain("<b>");
    expect(rendered).toContain("&lt;script&gt;");
  });
});

describe("collectWins", () => {
  it("keeps rows with any non-blank field, trims, drops fully-blank rows", () => {
    const state = st({ repeaters: { wins: [
      { action: " Led project ", result: "saved $2k" },
      { action: "", result: "" },
      { action: "", result: "mentored 3 people" },
    ] } });
    expect(collectWins(state)).toEqual([
      { action: "Led project", result: "saved $2k" },
      { action: "", result: "mentored 3 people" },
    ]);
  });
});

describe("score — end to end Diagnosis", () => {
  const state = st({
    repeaters: { wins: [
      { action: "Helped customers", result: "fewer complaints" },
      { action: "Cut wait time", result: "by 30%" },
    ] },
    ratings: { r1: 2, r2: 2, r3: 1, r4: 1 }, // sum 6 → ready
  });
  const diag = score(state, ct);

  it("lists wins with primary/secondary", () => {
    expect(diag.lists.wins).toEqual([
      { primary: "Helped customers", secondary: "fewer complaints" },
      { primary: "Cut wait time", secondary: "by 30%" },
    ]);
  });
  it("buckets readiness from the rating sum", () => {
    expect(diag.meters.readiness).toEqual({ level: "ready", score: 6, max: 8 });
  });
  it("seeds the raise script with the quantified top win", () => {
    expect(diag.scripts.raise[1]).toBe("For example: Cut wait time — by 30%.");
  });
  it("exposes the win count for narrative interpolation", () => {
    expect(diag.vars.winCount).toBe(2);
  });
});
