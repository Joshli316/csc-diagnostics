/**
 * W12 "Hidden Network" scoring. Groups listed contacts by category for the
 * asset-map, banks comfort-asking into a readiness meter, and seeds a friendly
 * first message. `buildOutreach` is the unit-tested pure surface.
 */
import type { CopyT, Diagnosis, InstrumentState, ListItem } from "../../engine/instrument";
import { readinessBucket, sumRatings } from "../../engine/scoring";
import { interpolate } from "../../engine/util";
import { CATEGORIES } from "./categories";

export const READINESS_ITEM_IDS = ["r1", "r2", "r3", "r4"];
export const READINESS_MAX = 8;

export interface Contact { name: string; how: string; }

export interface OutreachTemplates { line1: string; line2: string; line3: string; }

/** Filled contacts in a category's repeater. */
export function contactsIn(state: InstrumentState, categoryId: string): Contact[] {
  const rows = state.repeaters[categoryId] ?? [];
  return rows
    .map((r) => ({ name: (r.name ?? "").trim(), how: (r.how ?? "").trim() }))
    .filter((c) => c.name.length > 0 || c.how.length > 0);
}

/** A friendly 3-line reconnect message with the contact's name interpolated. */
export function buildOutreach(name: string, t: OutreachTemplates): string[] {
  return [interpolate(t.line1, { name }), t.line2, t.line3];
}

export function score(state: InstrumentState, ct: CopyT): Diagnosis {
  const groups: { group: string; items: ListItem[] }[] = [];
  let total = 0;
  let firstName = "";
  for (const cat of CATEGORIES) {
    const contacts = contactsIn(state, cat.id);
    if (contacts.length === 0) continue;
    total += contacts.length;
    if (!firstName) {
      const named = contacts.find((c) => c.name.length > 0);
      if (named) firstName = named.name;
    }
    groups.push({
      group: ct(cat.titleKey),
      items: contacts.map((c) => ({
        primary: c.name || c.how,
        secondary: c.name && c.how ? c.how : undefined,
      })),
    });
  }

  const meter = readinessBucket(sumRatings(state, READINESS_ITEM_IDS), READINESS_MAX);
  const outreach = buildOutreach(firstName || ct("outreach.name_fallback"), {
    line1: ct("outreach.line1"),
    line2: ct("outreach.line2"),
    line3: ct("outreach.line3"),
  });

  return {
    vars: { contactCount: total, groupCount: groups.length },
    lists: {},
    meters: { network_ready: meter },
    scripts: { outreach },
    assets: { network: groups },
  };
}
