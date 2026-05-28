import en from "../data/locales/en.json";
import zh from "../data/locales/zh-Hans.json";
import { interpolate } from "./util";

export type Lang = "en" | "zh-Hans";

const LOCALES: Record<Lang, Record<string, unknown>> = {
  en,
  "zh-Hans": zh,
};

const LS_LANG_KEY = "cscDiag.lang";
const ALLOWED: Lang[] = ["en", "zh-Hans"];

type Listener = (lang: Lang) => void;
const listeners: Listener[] = [];

function readSaved(): Lang {
  try {
    const v = localStorage.getItem(LS_LANG_KEY);
    if (v && (ALLOWED as string[]).includes(v)) return v as Lang;
  } catch {
    /* localStorage unavailable — fall through to browser preference */
  }
  try {
    const prefs = (navigator as { languages?: readonly string[] }).languages ?? [navigator.language];
    for (const p of prefs) {
      const tag = (p ?? "").toLowerCase();
      if (tag.startsWith("zh")) return "zh-Hans";
      if (tag.startsWith("en")) return "en";
    }
  } catch {
    /* navigator unavailable in some sandboxed environments */
  }
  return "en";
}

let currentLang: Lang = readSaved();

export function getLang(): Lang {
  return currentLang;
}

// Simplified Chinese — all four target workshops ship zh-CN.
const ZH_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap";

function ensureZhFontLoaded(): void {
  if (document.getElementById("font-zh")) return;
  const link = document.createElement("link");
  link.id = "font-zh";
  link.rel = "stylesheet";
  link.href = ZH_FONT_URL;
  document.head.appendChild(link);
}

export function setLang(lang: Lang): void {
  if (!(ALLOWED as string[]).includes(lang)) return;
  currentLang = lang;
  try {
    localStorage.setItem(LS_LANG_KEY, lang);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = lang;
  if (lang === "zh-Hans") ensureZhFontLoaded();
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function resolve(dict: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Look up a dotted key in the global chrome locale, English fallback. */
export function t(key: string): string {
  const primary = resolve(LOCALES[currentLang] ?? LOCALES.en, key);
  if (typeof primary === "string") return primary;
  const fallback = resolve(LOCALES.en, key);
  return typeof fallback === "string" ? fallback : key;
}

/** Translate a global-chrome key and substitute {var} placeholders. */
export function formatT(key: string, vars: Record<string, string | number>): string {
  return interpolate(t(key), vars);
}

// ===== Active instrument copy =====
// Each instrument ships its own copy.<lang>.json. When the router enters an
// instrument it registers that copy here; renderers resolve instrument text
// via `ct`/`ctf` exactly like `t`/`formatT` resolve global chrome.

let activeCopy: Record<Lang, Record<string, unknown>> | null = null;

export function setActiveCopy(copy: Record<Lang, Record<string, unknown>> | null): void {
  activeCopy = copy;
}

/** Resolve an instrument copy key for the current language, English fallback. */
export function ct(key: string): string {
  if (!activeCopy) return key;
  const primary = resolve(activeCopy[currentLang] ?? activeCopy.en, key);
  if (typeof primary === "string") return primary;
  const fallback = resolve(activeCopy.en, key);
  return typeof fallback === "string" ? fallback : key;
}

/** Resolve an instrument copy key and substitute {var} placeholders. */
export function ctf(key: string, vars: Record<string, string | number>): string {
  return interpolate(ct(key), vars);
}

/**
 * Resolve a key against an arbitrary copy bag for the current language (English
 * fallback). Used by the hub to read each instrument's intro copy without
 * making it the active instrument.
 */
export function copyFrom(copy: Record<Lang, Record<string, unknown>>, key: string): string {
  const primary = resolve(copy[currentLang] ?? copy.en, key);
  if (typeof primary === "string") return primary;
  const fallback = resolve(copy.en, key);
  return typeof fallback === "string" ? fallback : key;
}

/** Resolve an inline bilingual pair `{ en, zh }` for the current language. */
export function pickLang(obj: { en: string; zh: string } | undefined): string {
  if (!obj) return "";
  return currentLang === "zh-Hans" ? (obj.zh || obj.en) : obj.en;
}

export function initLang(): void {
  document.documentElement.lang = currentLang;
  if (currentLang === "zh-Hans") ensureZhFontLoaded();
}

/** True if the active locale is flagged as a draft (pending native review). */
export function isLocaleDraft(): boolean {
  const meta = (LOCALES[currentLang] as { _meta?: { draft?: boolean } })._meta;
  return meta?.draft === true;
}

/** Date stamp for filenames. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
