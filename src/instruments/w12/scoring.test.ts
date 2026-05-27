import { describe, it, expect } from "vitest";
import { buildOutreach, contactsIn, score, type OutreachTemplates } from "./scoring";
import { escapeHtml } from "../../engine/util";
import { emptyState } from "../../engine/state";
import type { CopyT, InstrumentState } from "../../engine/instrument";

const OUT: OutreachTemplates = {
  line1: "Hi {name}, long time!",
  line2: "I'm looking for advice.",
  line3: "Coffee?",
};

const ct: CopyT = (k) => {
  const map: Record<string, string> = {
    "outreach.line1": OUT.line1,
    "outreach.line2": OUT.line2,
    "outreach.line3": OUT.line3,
    "outreach.name_fallback": "[their name]",
    "categories.family_title": "Family & people close to you",
    "categories.coworkers_title": "Past coworkers, bosses, or clients",
    "categories.friends_title": "Friends & neighbors",
    "categories.community_title": "Classmates, teachers, church or community",
  };
  return map[k] ?? k;
};

function st(o: Partial<InstrumentState> = {}): InstrumentState {
  return { ...emptyState("en"), ...o };
}

describe("W12 contactsIn", () => {
  it("keeps rows with a name or a note, trims, drops blanks", () => {
    const state = st({ repeaters: { family: [
      { name: " Auntie Lin ", how: "knows people" },
      { name: "", how: "" },
    ] } });
    expect(contactsIn(state, "family")).toEqual([{ name: "Auntie Lin", how: "knows people" }]);
  });
});

describe("W12 buildOutreach", () => {
  it("interpolates the contact name into the greeting", () => {
    expect(buildOutreach("Maria", OUT)).toEqual(["Hi Maria, long time!", "I'm looking for advice.", "Coffee?"]);
  });
  it("is escapeHtml-safe for injected names", () => {
    expect(escapeHtml(buildOutreach("<b>x</b>", OUT)[0])).not.toContain("<b>");
  });
});

describe("W12 score → asset-map + readiness + outreach", () => {
  const state = st({
    repeaters: {
      family: [{ name: "Auntie Lin", how: "works in healthcare" }],
      coworkers: [{ name: "Old manager Sam", how: "" }],
    },
    ratings: { r1: 1, r2: 1, r3: 0, r4: 0 }, // sum 2 → building
  });
  const diag = score(state, ct);

  it("groups contacts by category, skipping empty categories", () => {
    const net = diag.assets!.network;
    expect(net.map((g) => g.group)).toEqual([
      "Family & people close to you",
      "Past coworkers, bosses, or clients",
    ]);
    expect(net[0].items[0]).toEqual({ primary: "Auntie Lin", secondary: "works in healthcare" });
  });
  it("buckets readiness", () => {
    expect(diag.meters.network_ready).toEqual({ level: "building", score: 2, max: 8 });
  });
  it("seeds outreach with the first named contact", () => {
    expect(diag.scripts.outreach[0]).toBe("Hi Auntie Lin, long time!");
  });
  it("counts total contacts and groups", () => {
    expect(diag.vars).toEqual({ contactCount: 2, groupCount: 2 });
  });
});
