import type { Instrument } from "../../engine/instrument";
import copyEn from "./copy.en.json";
import copyZh from "./copy.zh-Hans.json";
import { score } from "./scoring";

const WORKSHOP_URL = "https://career-growth-workshop.pages.dev/";

export const w15: Instrument = {
  id: "w15",
  zhVariant: "zh-Hans",
  workshopKey: "career_growth",
  copy: { en: copyEn, "zh-Hans": copyZh },
  score,
  pages: [
    {
      id: "wins",
      introTitleKey: "page.wins_title",
      introWhyKey: "page.wins_why",
      questions: [
        {
          kind: "repeater",
          id: "wins",
          min: 1,
          max: 5,
          addLabelKey: "wins.add",
          removeLabelKey: "wins.remove",
          rowLabelKey: "wins.row_label",
          fields: [
            { id: "action", labelKey: "wins.action_label", placeholderKey: "wins.action_ph" },
            { id: "result", labelKey: "wins.result_label", placeholderKey: "wins.result_ph", multiline: true },
          ],
        },
      ],
    },
    {
      id: "readiness",
      introTitleKey: "page.readiness_title",
      introWhyKey: "page.readiness_why",
      questions: [
        {
          kind: "matrix-rating",
          id: "readiness",
          scaleKeys: ["readiness.scale_yes", "readiness.scale_somewhat", "readiness.scale_not"],
          items: [
            { id: "r1", labelKey: "readiness.q1" },
            { id: "r2", labelKey: "readiness.q2" },
            { id: "r3", labelKey: "readiness.q3" },
            { id: "r4", labelKey: "readiness.q4" },
          ],
        },
      ],
    },
  ],
  result: {
    blocks: [
      { kind: "narrative", headingKey: "results.narrative_h", bodyKey: "results.narrative_body" },
      { kind: "list-reflect", headingKey: "results.wins_h", leadKey: "results.wins_lead", source: "wins", emptyKey: "results.wins_empty" },
      { kind: "level-meter", headingKey: "results.meter_h", leadKey: "results.meter_lead", source: "readiness", levelCopyPrefix: "readiness_levels" },
      { kind: "script-seed", headingKey: "results.script_h", leadKey: "results.script_lead", source: "raise" },
      { kind: "cta", headingKey: "results.cta_h", bodyKey: "results.cta_body", href: WORKSHOP_URL, linkKey: "results.cta_link" },
    ],
  },
};
