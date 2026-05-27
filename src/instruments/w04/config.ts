import type { Instrument } from "../../engine/instrument";
import copyEn from "./copy.en.json";
import copyZh from "./copy.zh-Hans.json";
import { score } from "./scoring";
import skills from "../../data/shared/transferable-skills.json";

// TODO(deploy): point at the live Interview Skills workshop deep link.
const WORKSHOP_URL = "https://csc-workshops.pages.dev/";

export const w04: Instrument = {
  id: "w04",
  zhVariant: "zh-Hans",
  workshopKey: "interview_skills",
  copy: { en: copyEn, "zh-Hans": copyZh },
  score,
  pages: [
    {
      id: "jobs",
      introTitleKey: "page.jobs_title",
      introWhyKey: "page.jobs_why",
      questions: [
        {
          kind: "repeater",
          id: "jobs",
          min: 1,
          max: 5,
          addLabelKey: "jobs.add",
          removeLabelKey: "jobs.remove",
          rowLabelKey: "jobs.row_label",
          fields: [
            { id: "title", labelKey: "jobs.title_label", placeholderKey: "jobs.title_ph" },
            { id: "did", labelKey: "jobs.did_label", placeholderKey: "jobs.did_ph", multiline: true },
          ],
        },
      ],
    },
    {
      id: "skills",
      introTitleKey: "page.skills_title",
      introWhyKey: "page.skills_why",
      questions: [
        {
          kind: "chips",
          id: "skills",
          cap: skills.length,
          options: skills.map((s) => ({ id: s.id, label: { en: s.en, zh: s.zh }, dimension: s.dimension })),
        },
      ],
    },
  ],
  result: {
    blocks: [
      { kind: "narrative", headingKey: "results.narrative_h", bodyKey: "results.narrative_body" },
      { kind: "list-reflect", headingKey: "results.jobs_h", leadKey: "results.jobs_lead", source: "jobs" },
      { kind: "asset-map", headingKey: "results.skills_h", leadKey: "results.skills_lead", source: "skills", emptyKey: "results.skills_empty" },
      { kind: "script-seed", headingKey: "results.star_h", leadKey: "results.star_lead", source: "star1" },
      { kind: "script-seed", headingKey: "results.star2_h", source: "star2" },
      { kind: "cta", headingKey: "results.cta_h", bodyKey: "results.cta_body", href: WORKSHOP_URL, linkKey: "results.cta_link" },
    ],
  },
};
