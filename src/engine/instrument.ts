/**
 * Declarative instrument schema — the heart of the config-driven engine.
 *
 * The engine renders every tool by walking `pages[].questions[].kind` and
 * `result.blocks[].kind`. It NEVER imports a concrete instrument; only
 * `registry.ts` does that. Adding a new diagnostic = a new `instruments/<id>/`
 * folder (config + scoring + copy.en/copy.zh-Hans) + one line in the registry.
 *
 * All user-facing text is referenced by *copy keys* resolved against the
 * instrument's own `copy.<lang>.json` (see i18n `ct`/`ctf`). The schema holds
 * structure and ids only — no prose — so copy stays fully translatable.
 */
import type { Lang } from "./i18n";

// ===== Questions =====

/** 3-point scale ratings stored as 2 (top) / 1 (mid) / 0 (bottom). */
export type RatingValue = 0 | 1 | 2;

interface QuestionBase {
  id: string;
  /** Optional per-question heading rendered above the input. */
  introTitleKey?: string;
  introWhyKey?: string;
}

/**
 * An option/item label resolves EITHER from the instrument copy (`labelKey`)
 * OR from an inline bilingual pair (`label`) — the latter lets shared data
 * banks (transferable-skills, workplace-norms) keep both languages in one file.
 */
export interface Labeled {
  labelKey?: string;
  label?: { en: string; zh: string };
}

/**
 * A list of statements, each rated on the same 3-point scale. Subsumes the
 * single-rating case (one item). Drives `readiness-bucket` and `dimension-tally`.
 */
export interface MatrixRatingQuestion extends QuestionBase {
  kind: "matrix-rating";
  /** Copy keys for the value-2, value-1, value-0 button labels. */
  scaleKeys: [string, string, string];
  items: (Labeled & { id: string; exampleKey?: string; dimension?: string })[];
}

/** Capped multi-select pills. 0 selections allowed (optional by nature). */
export interface ChipsQuestion extends QuestionBase {
  kind: "chips";
  cap: number;
  options: (Labeled & { id: string; dimension?: string })[];
}

/** Pick-exactly-N tiles with FIFO order badges. */
export interface TilesQuestion extends QuestionBase {
  kind: "tiles";
  pick: number;
  options: (Labeled & { id: string; svg?: string; dimension?: string })[];
}

/** Pick exactly one tile. */
export interface SingleTileQuestion extends QuestionBase {
  kind: "single-tile";
  options: (Labeled & { id: string; svg?: string; dimension?: string })[];
}

/** This-or-that forced choice; stores "a" | "b". */
export interface ChoiceQuestion extends QuestionBase {
  kind: "choice";
  aKey: string;
  bKey: string;
  aDimension?: string;
  bDimension?: string;
}

/** Net-new: free-text rows (wins, jobs, contacts). Stays in localStorage only. */
export interface RepeaterQuestion extends QuestionBase {
  kind: "repeater";
  min: number;
  max: number;
  addLabelKey: string;
  removeLabelKey: string;
  /** Copy key for the per-row heading, interpolated with {n}. */
  rowLabelKey?: string;
  fields: {
    id: string;
    labelKey: string;
    placeholderKey?: string;
    multiline?: boolean;
  }[];
}

export type Question =
  | MatrixRatingQuestion
  | ChipsQuestion
  | TilesQuestion
  | SingleTileQuestion
  | ChoiceQuestion
  | RepeaterQuestion;

export interface Page {
  id: string;
  /** Page-level module heading (rendered once, above the questions). */
  introTitleKey?: string;
  introWhyKey?: string;
  questions: Question[];
}

// ===== Result blocks =====

export interface NarrativeBlock {
  kind: "narrative";
  headingKey: string;
  /** Interpolated with the scoring `vars` bag via ctf. */
  bodyKey: string;
}

export interface ListReflectBlock {
  kind: "list-reflect";
  headingKey: string;
  leadKey?: string;
  /** Key into `Diagnosis.lists`. */
  source: string;
  emptyKey?: string;
}

export interface LevelMeterBlock {
  kind: "level-meter";
  headingKey: string;
  leadKey?: string;
  /** Key into `Diagnosis.meters`. */
  source: string;
  /** Copy-key prefix; resolves `<prefix>.<level>.name` and `.desc`. */
  levelCopyPrefix: string;
}

export interface ScriptSeedBlock {
  kind: "script-seed";
  headingKey: string;
  leadKey?: string;
  /** Key into `Diagnosis.scripts` (array of step lines). */
  source: string;
}

/** Two-column map: strengths (left) vs watch-outs (right). W10. */
export interface SplitMapBlock {
  kind: "split-map";
  headingKey: string;
  leadKey?: string;
  /** Key into `Diagnosis.maps`. */
  source: string;
  leftHeadingKey: string;
  rightHeadingKey: string;
  leftEmptyKey: string;
  rightEmptyKey: string;
}

/** Grouped list (network by category, skills by dimension). W04, W12. */
export interface AssetMapBlock {
  kind: "asset-map";
  headingKey: string;
  leadKey?: string;
  /** Key into `Diagnosis.assets`. */
  source: string;
  emptyKey?: string;
}

export interface CtaBlock {
  kind: "cta";
  headingKey: string;
  bodyKey?: string;
  /** External link back to the workshop. */
  href: string;
  linkKey: string;
}

export type ResultBlock =
  | NarrativeBlock
  | ListReflectBlock
  | LevelMeterBlock
  | ScriptSeedBlock
  | SplitMapBlock
  | AssetMapBlock
  | CtaBlock;

// ===== Scoring output (normalized, render-ready, DOM-free) =====

export type ReadinessLevel = "building" | "getting_ready" | "ready";

export interface MeterValue {
  level: ReadinessLevel;
  score: number;
  max: number;
}

export interface ListItem {
  primary: string;
  secondary?: string;
}

/**
 * What every instrument's `score()` returns. The engine's result block-walker
 * reads from these maps by the `source` declared on each block.
 */
export interface Diagnosis {
  /** Interpolation values for narrative bodies. */
  vars: Record<string, string | number>;
  /** list-reflect sources. */
  lists: Record<string, ListItem[]>;
  /** level-meter sources. */
  meters: Record<string, MeterValue>;
  /** script-seed sources (each = ordered step lines). */
  scripts: Record<string, string[]>;
  /** split-map sources: { left: strengths, right: watch-outs }. */
  maps?: Record<string, { left: ListItem[]; right: ListItem[] }>;
  /** asset-map sources: grouped lists (by category / dimension). */
  assets?: Record<string, { group: string; items: ListItem[] }[]>;
  /** dimension-tally counts (W04 inventory, W10 partition sizes). */
  tallies?: Record<string, number>;
}

/** Copy resolver bound to the active instrument + current language. */
export type CopyT = (key: string) => string;

// ===== The instrument =====

export interface Instrument {
  id: string;
  /** Which Chinese variant this tool ships. All four targets are zh-Hans. */
  zhVariant: "zh-Hans";
  /** Workshop this diagnostic supports (e.g., "Career Growth"). For ordering/labels. */
  workshopKey: string;
  pages: Page[];
  result: { blocks: ResultBlock[] };
  /**
   * DOM-free scoring. Receives the saved state and a copy resolver so it can
   * assemble localized seed text (scripts/STAR/outreach) while staying out of
   * the DOM. Pure helpers it composes (readinessBucket, buildRaiseScript…) are
   * the unit-tested surface.
   */
  score: (state: InstrumentState, ct: CopyT) => Diagnosis;
  /** Instrument copy banks, keyed by language. */
  copy: Record<Lang, Record<string, unknown>>;
}

// ===== Generic per-instrument state =====

export type RepeaterRow = Record<string, string>;

export interface InstrumentState {
  version: number;
  startedAt: number;
  updatedAt: number;
  lang: Lang;
  pageIndex: number;
  /** matrix-rating answers, keyed by item id (unique within an instrument). */
  ratings: Record<string, RatingValue>;
  /** chips + tiles selections, keyed by question id. */
  picks: Record<string, string[]>;
  /** single-tile + choice selections, keyed by question id. */
  singles: Record<string, string>;
  /** repeater rows, keyed by question id. */
  repeaters: Record<string, RepeaterRow[]>;
}
