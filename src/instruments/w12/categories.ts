/**
 * W12 network categories. Each becomes a repeater on the survey page and a
 * group in the results asset-map. Shared by config.ts and scoring.ts so the two
 * never drift. (The "network categories bank" the plan calls for, kept as a
 * typed module since each category maps 1:1 to a repeater question.)
 */
export interface NetworkCategory {
  id: string;
  titleKey: string;
  whyKey: string;
  /** Minimum filled rows required to advance (only the first category gates). */
  min: number;
}

export const CATEGORIES: NetworkCategory[] = [
  { id: "family", titleKey: "categories.family_title", whyKey: "categories.family_why", min: 1 },
  { id: "coworkers", titleKey: "categories.coworkers_title", whyKey: "categories.coworkers_why", min: 0 },
  { id: "friends", titleKey: "categories.friends_title", whyKey: "categories.friends_why", min: 0 },
  { id: "community", titleKey: "categories.community_title", whyKey: "categories.community_why", min: 0 },
];
