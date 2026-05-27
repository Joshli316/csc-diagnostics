import type { Instrument } from "../../engine/instrument";
import copyEn from "./copy.en.json";
import copyZh from "./copy.zh-Hans.json";
import { score } from "./scoring";
import norms from "../../data/shared/us-workplace-norms.json";

// TODO(deploy): point at the live Workplace Culture workshop deep link.
const WORKSHOP_URL = "https://csc-workshops.pages.dev/";

export const w10: Instrument = {
  id: "w10",
  zhVariant: "zh-Hans",
  workshopKey: "workplace_culture",
  copy: { en: copyEn, "zh-Hans": copyZh },
  score,
  pages: [
    {
      id: "culture",
      introTitleKey: "page.culture_title",
      introWhyKey: "page.culture_why",
      questions: [
        {
          kind: "matrix-rating",
          id: "culture",
          scaleKeys: ["culture.scale_natural", "culture.scale_working", "culture.scale_hard"],
          items: norms.map((n) => ({ id: n.id, label: { en: n.en, zh: n.zh } })),
        },
      ],
    },
  ],
  result: {
    blocks: [
      { kind: "narrative", headingKey: "results.narrative_h", bodyKey: "results.narrative_body" },
      {
        kind: "split-map",
        headingKey: "results.map_h",
        leadKey: "results.map_lead",
        source: "culture",
        leftHeadingKey: "results.strengths_h",
        rightHeadingKey: "results.watchouts_h",
        leftEmptyKey: "results.strengths_empty",
        rightEmptyKey: "results.watchouts_empty",
      },
      { kind: "cta", headingKey: "results.cta_h", bodyKey: "results.cta_body", href: WORKSHOP_URL, linkKey: "results.cta_link" },
    ],
  },
};
