import type { Instrument, RepeaterQuestion } from "../../engine/instrument";
import copyEn from "./copy.en.json";
import copyZh from "./copy.zh-Hans.json";
import { score } from "./scoring";
import { CATEGORIES } from "./categories";

// TODO(deploy): point at the live Networking workshop deep link.
const WORKSHOP_URL = "https://csc-workshops.pages.dev/";

const categoryRepeaters: RepeaterQuestion[] = CATEGORIES.map((cat) => ({
  kind: "repeater",
  id: cat.id,
  introTitleKey: cat.titleKey,
  introWhyKey: cat.whyKey,
  min: cat.min,
  max: 5,
  addLabelKey: "contact.add",
  removeLabelKey: "contact.remove",
  rowLabelKey: "contact.row_label",
  fields: [
    { id: "name", labelKey: "contact.name_label", placeholderKey: "contact.name_ph" },
    { id: "how", labelKey: "contact.how_label", placeholderKey: "contact.how_ph", multiline: true },
  ],
}));

export const w12: Instrument = {
  id: "w12",
  zhVariant: "zh-Hans",
  workshopKey: "networking",
  copy: { en: copyEn, "zh-Hans": copyZh },
  score,
  pages: [
    {
      id: "network",
      introTitleKey: "page.network_title",
      introWhyKey: "page.network_why",
      questions: categoryRepeaters,
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
      { kind: "asset-map", headingKey: "results.map_h", leadKey: "results.map_lead", source: "network", emptyKey: "results.map_empty" },
      { kind: "level-meter", headingKey: "results.meter_h", leadKey: "results.meter_lead", source: "network_ready", levelCopyPrefix: "readiness_levels" },
      { kind: "script-seed", headingKey: "results.script_h", leadKey: "results.script_lead", source: "outreach" },
      { kind: "cta", headingKey: "results.cta_h", bodyKey: "results.cta_body", href: WORKSHOP_URL, linkKey: "results.cta_link" },
    ],
  },
};
