import { describe, it, expect } from "vitest";
import { buildStarSeeds, collectJobs, score, type StarTemplates } from "./scoring";
import { escapeHtml } from "../../engine/util";
import { emptyState } from "../../engine/state";
import type { CopyT, InstrumentState } from "../../engine/instrument";

const TEMPLATES: StarTemplates = {
  situation: "At \"{job}\": one time.",
  task: "What needed to happen?",
  action: "You used: {skill}.",
  actionNoSkill: "Name the skill you used.",
  result: "What was the result?",
};

const ct: CopyT = (k) => {
  const map: Record<string, string> = {
    "star.situation": TEMPLATES.situation,
    "star.task": TEMPLATES.task,
    "star.action": TEMPLATES.action,
    "star.action_no_skill": TEMPLATES.actionNoSkill,
    "star.result": TEMPLATES.result,
    "dimensions.people": "Working with people",
    "dimensions.solving": "Solving problems",
    "dimensions.doing": "Getting things done",
    "dimensions.leading": "Leading & organizing",
  };
  return map[k] ?? k;
};

function st(o: Partial<InstrumentState> = {}): InstrumentState {
  return { ...emptyState("en"), ...o };
}

describe("W04 collectJobs", () => {
  it("trims and drops fully-blank rows", () => {
    const state = st({ repeaters: { jobs: [
      { title: " Server ", did: "took orders" },
      { title: "", did: "" },
    ] } });
    expect(collectJobs(state)).toEqual([{ title: "Server", did: "took orders" }]);
  });
});

describe("W04 buildStarSeeds", () => {
  it("interpolates job into Situation and skill into Action", () => {
    const seeds = buildStarSeeds(["Restaurant server", "Family store"], ["Listening carefully", "Staying calm"], TEMPLATES);
    expect(seeds).toHaveLength(2);
    expect(seeds[0][0]).toBe('At "Restaurant server": one time.');
    expect(seeds[0][2]).toBe("You used: Listening carefully.");
    expect(seeds[1][0]).toBe('At "Family store": one time.');
    expect(seeds[1][2]).toBe("You used: Staying calm.");
  });
  it("uses the no-skill action line when no skills are selected", () => {
    const seeds = buildStarSeeds(["A job"], [], TEMPLATES);
    expect(seeds).toHaveLength(1);
    expect(seeds[0][2]).toBe("Name the skill you used.");
  });
  it("returns no seeds when there are no jobs", () => {
    expect(buildStarSeeds([], ["a skill"], TEMPLATES)).toEqual([]);
  });
  it("is escapeHtml-safe for injected job text", () => {
    const seeds = buildStarSeeds(["<img onerror=x>"], [], TEMPLATES);
    expect(escapeHtml(seeds[0][0])).not.toContain("<img");
  });
});

describe("W04 score → grouped inventory + STAR", () => {
  const state = st({
    repeaters: { jobs: [{ title: "Restaurant server", did: "took orders" }] },
    // s_helping = people, s_calm = leading
    picks: { skills: ["s_helping", "s_calm"] },
  });
  const diag = score(state, ct);

  it("groups selected skills by dimension (only non-empty groups)", () => {
    const groups = diag.assets!.skills;
    expect(groups.map((g) => g.group)).toEqual(["Working with people", "Leading & organizing"]);
    expect(groups[0].items[0].primary).toMatch(/Helping/);
  });
  it("seeds story 1 from the job + first skill", () => {
    expect(diag.scripts.star1[0]).toBe('At "Restaurant server": one time.');
    expect(diag.scripts.star1[2]).toMatch(/Helping/);
  });
  it("exposes counts", () => {
    expect(diag.vars).toEqual({ skillCount: 2, jobCount: 1 });
    expect(diag.tallies).toMatchObject({ people: 1, leading: 1, solving: 0, doing: 0 });
  });
});
