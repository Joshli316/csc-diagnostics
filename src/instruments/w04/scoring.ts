/**
 * W04 "Transferable Skills Finder" scoring. Groups selected skills by dimension
 * for the asset-map, and seeds up to two STAR interview stories from the user's
 * jobs + skills. `buildStarSeeds` is the unit-tested pure surface.
 */
import type { CopyT, Diagnosis, InstrumentState, ListItem } from "../../engine/instrument";
import { pickLang } from "../../engine/i18n";
import skills from "../../data/shared/transferable-skills.json";

export const JOBS_QID = "jobs";
export const SKILLS_QID = "skills";
export const DIMENSION_ORDER = ["people", "solving", "doing", "leading"] as const;

export interface Job { title: string; did: string; }

export interface StarTemplates {
  situation: string;
  task: string;
  action: string;
  actionNoSkill: string;
  result: string;
}

function interpolate(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? vars[name] : `{${name}}`));
}

export function collectJobs(state: InstrumentState): Job[] {
  const rows = state.repeaters[JOBS_QID] ?? [];
  return rows
    .map((r) => ({ title: (r.title ?? "").trim(), did: (r.did ?? "").trim() }))
    .filter((j) => j.title.length > 0 || j.did.length > 0);
}

/**
 * Build up to two STAR story seeds. Each seed = [Situation, Task, Action,
 * Result], with a job interpolated into Situation and a skill into Action.
 * Returns raw lines; the renderer escapeHtml-escapes them.
 */
export function buildStarSeeds(jobs: string[], skillLabels: string[], t: StarTemplates): string[][] {
  if (jobs.length === 0) return [];
  const count = Math.min(2, Math.max(jobs.length, skillLabels.length, 1));
  const seeds: string[][] = [];
  for (let i = 0; i < count; i++) {
    const job = jobs[i % jobs.length];
    const skill = skillLabels.length ? skillLabels[i % skillLabels.length] : null;
    const action = skill ? interpolate(t.action, { skill }) : t.actionNoSkill;
    seeds.push([interpolate(t.situation, { job }), t.task, action, t.result]);
  }
  return seeds;
}

export function score(state: InstrumentState, ct: CopyT): Diagnosis {
  const jobs = collectJobs(state);
  const jobLists: ListItem[] = jobs.map((j) => ({
    primary: j.title || j.did,
    secondary: j.title && j.did ? j.did : undefined,
  }));

  const selected = state.picks[SKILLS_QID] ?? [];
  const selectedSet = new Set(selected);

  const groups = DIMENSION_ORDER.map((dim) => {
    const inDim = skills.filter((s) => s.dimension === dim && selectedSet.has(s.id));
    return { group: ct(`dimensions.${dim}`), items: inDim.map((s) => ({ primary: pickLang({ en: s.en, zh: s.zh }) })) };
  }).filter((g) => g.items.length > 0);

  const skillLabels = skills.filter((s) => selectedSet.has(s.id)).map((s) => pickLang({ en: s.en, zh: s.zh }));
  const jobTitles = jobs.map((j) => j.title || j.did);

  const seeds = buildStarSeeds(jobTitles, skillLabels, {
    situation: ct("star.situation"),
    task: ct("star.task"),
    action: ct("star.action"),
    actionNoSkill: ct("star.action_no_skill"),
    result: ct("star.result"),
  });

  const tallies: Record<string, number> = {};
  for (const dim of DIMENSION_ORDER) {
    tallies[dim] = skills.filter((s) => s.dimension === dim && selectedSet.has(s.id)).length;
  }

  return {
    vars: { skillCount: selected.length, jobCount: jobs.length },
    lists: { jobs: jobLists },
    meters: {},
    scripts: { star1: seeds[0] ?? [], star2: seeds[1] ?? [] },
    assets: { skills: groups },
    tallies,
  };
}
