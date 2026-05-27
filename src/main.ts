import {
  t,
  ct,
  formatT,
  getLang,
  setLang,
  onLangChange,
  initLang,
  isLocaleDraft,
  copyFrom,
  setActiveCopy,
  todayISO,
} from "./engine/i18n";
import type { Lang } from "./engine/i18n";
import {
  renderSurvey,
  setActiveInstrument,
  resetActive,
  reloadActiveFromStorage,
} from "./engine/survey";
import { renderResults } from "./engine/results";
import { loadState, isFresh, clearState } from "./engine/state";
import { downloadPdf } from "./engine/pdf";
import { escapeHtml } from "./engine/util";
import { INSTRUMENTS, getInstrument } from "./engine/registry";
import type { Instrument } from "./engine/instrument";

function renderHeader(): void {
  const header = document.getElementById("site-header");
  if (!header) return;
  const lang = getLang();
  header.innerHTML = `
    <div class="inner">
      <a class="brand" href="#/" data-action="home">${escapeHtml(t("header.brand"))}</a>
      <div class="lang-toggle" role="group" aria-label="${escapeHtml(t("lang.aria_label"))}">
        <button type="button" data-lang="en" aria-pressed="${lang === "en"}">${escapeHtml(t("lang.en"))}</button>
        <button type="button" data-lang="zh-Hans" aria-pressed="${lang === "zh-Hans"}">${escapeHtml(t("lang.zh"))}</button>
      </div>
    </div>
  `;
  header.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang as Lang));
  });
}

function renderFooter(): void {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `<p class="inner">${escapeHtml(t("footer.disclaimer"))}</p>`;
}

function draftBannerHtml(): string {
  if (!isLocaleDraft()) return "";
  return `<p class="draft-banner" role="status">${escapeHtml(t("hub.draft_banner"))}</p>`;
}

// ===== Hub landing =====

function instrumentStatus(inst: Instrument): { resumeStep: number | null; finished: boolean } {
  const saved = loadState(inst.id);
  if (!saved || !isFresh(saved)) return { resumeStep: null, finished: false };
  const last = inst.pages.length - 1;
  if (saved.pageIndex >= last) {
    // finished only if they actually reached results; treat last page reached as resumable-to-results
    return { resumeStep: null, finished: saved.pageIndex >= last && hasAnyAnswer(saved) };
  }
  return { resumeStep: saved.pageIndex > 0 ? saved.pageIndex + 1 : null, finished: false };
}

function hasAnyAnswer(s: ReturnType<typeof loadState>): boolean {
  if (!s) return false;
  return (
    Object.keys(s.ratings).length > 0 ||
    Object.keys(s.picks).length > 0 ||
    Object.keys(s.singles).length > 0 ||
    Object.values(s.repeaters).some((rows) => rows.some((r) => Object.values(r).some((v) => v.trim())))
  );
}

function renderHub(root: HTMLElement): void {
  const cards = INSTRUMENTS.map((inst) => {
    const { resumeStep, finished } = instrumentStatus(inst);
    let secondary = "";
    if (resumeStep) {
      const label = formatT("hub.card_resume", { current: resumeStep, total: inst.pages.length });
      secondary = `<p class="card-resume"><a href="#/${escapeHtml(inst.id)}/" data-action="open" data-id="${escapeHtml(inst.id)}">${escapeHtml(label)}</a></p>`;
    } else if (finished) {
      secondary = `<p class="card-resume"><a href="#/${escapeHtml(inst.id)}/results">${escapeHtml(t("hub.card_view"))}</a></p>`;
    }
    return `
      <a class="tool-card" href="#/${escapeHtml(inst.id)}/" data-action="open" data-id="${escapeHtml(inst.id)}">
        <span class="tool-card-workshop">${escapeHtml(copyFrom(inst.copy, "intro.workshop"))}</span>
        <h2 class="tool-card-title">${escapeHtml(copyFrom(inst.copy, "intro.title"))}</h2>
        <p class="tool-card-sub">${escapeHtml(copyFrom(inst.copy, "intro.subhead"))}</p>
        <span class="tool-card-meta">${escapeHtml(copyFrom(inst.copy, "intro.duration"))}</span>
        <span class="tool-card-cta">${escapeHtml(t("hub.card_start"))}</span>
      </a>
      ${secondary}
    `;
  }).join("");

  root.innerHTML = `
    <section class="hub" aria-labelledby="hub-title">
      ${draftBannerHtml()}
      <h1 id="hub-title">${escapeHtml(t("hub.h1"))}</h1>
      <p class="subhead">${escapeHtml(t("hub.subhead"))}</p>
      <div class="tool-grid">${cards}</div>
      <p class="hub-foot">${escapeHtml(t("hub.footer_note"))}</p>
    </section>
  `;
}

// ===== Instrument intro =====

function renderIntro(inst: Instrument, root: HTMLElement): void {
  setActiveInstrument(inst);
  const saved = loadState(inst.id);
  const last = inst.pages.length - 1;
  const isMid = !!saved && isFresh(saved) && saved.pageIndex > 0 && saved.pageIndex < last;

  let secondary = "";
  if (isMid && saved) {
    const label = formatT("common.resume_with_step", { current: saved.pageIndex + 1, total: inst.pages.length });
    secondary = `<p class="resume-link"><a href="#/${escapeHtml(inst.id)}/q" data-action="resume">${escapeHtml(label)}</a></p>`;
  }

  root.innerHTML = `
    <section class="landing" aria-labelledby="l-title">
      <p class="tool-eyebrow"><a href="#/" data-action="hub">${escapeHtml(t("common.back_to_hub"))}</a></p>
      <p class="landing-workshop">${escapeHtml(ct("intro.workshop"))}</p>
      <h1 id="l-title">${escapeHtml(ct("intro.title"))}</h1>
      <p class="subhead">${escapeHtml(ct("intro.subhead"))}</p>
      <ul class="bullets">
        <li>${escapeHtml(ct("intro.outcome"))}</li>
        <li>${escapeHtml(t("common.free"))}</li>
        <li>${escapeHtml(t("common.private"))}</li>
      </ul>
      <button type="button" class="btn block" data-action="start">${escapeHtml(t("common.start"))}</button>
      ${secondary}
    </section>
  `;

  root.querySelector('[data-action="start"]')?.addEventListener("click", () => {
    resetActive();
    location.hash = `#/${inst.id}/q`;
  });
  root.querySelector('[data-action="resume"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    reloadActiveFromStorage();
    location.hash = `#/${inst.id}/q`;
  });
}

// ===== Results view =====

function renderResultsView(inst: Instrument, root: HTMLElement): void {
  setActiveInstrument(inst);
  reloadActiveFromStorage();
  const saved = loadState(inst.id);
  if (!saved) {
    location.hash = `#/${inst.id}/`;
    return;
  }
  renderResults(inst, saved, root);
  root.querySelector('[data-action="pdf"]')?.addEventListener("click", () => {
    void downloadPdf(`csc-selfcheck-${inst.id}-${todayISO()}.pdf`);
  });
  root.querySelector('[data-action="restart"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    clearState(inst.id);
    resetActive();
    location.hash = `#/${inst.id}/`;
  });
}

// ===== Router =====

interface Route {
  instrument: Instrument | null;
  sub: string;
}

function parseRoute(): Route {
  const hash = location.hash.replace(/^#/, "") || "/";
  const segs = hash.split("/").filter(Boolean); // ["w15","q"] etc.
  if (segs.length === 0) return { instrument: null, sub: "" };
  const inst = getInstrument(segs[0]) ?? null;
  return { instrument: inst, sub: segs[1] ?? "" };
}

function route(): void {
  const root = document.getElementById("main");
  if (!root) return;
  const { instrument, sub } = parseRoute();

  if (!instrument) {
    setActiveCopy(null);
    renderHub(root);
    document.title = t("page_title.hub");
  } else if (sub === "q") {
    setActiveInstrument(instrument);
    reloadActiveFromStorage();
    renderSurvey(root);
    document.title = t("page_title.tool");
  } else if (sub === "results") {
    renderResultsView(instrument, root);
    document.title = t("page_title.results");
  } else {
    renderIntro(instrument, root);
    document.title = t("page_title.tool");
  }
  window.scrollTo(0, 0);
  announce(document.title);
}

function announce(text: string): void {
  const el = document.getElementById("sr-announce");
  if (!el) return;
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = text; });
}

function ensureCanonicalAndOgUrl(): void {
  const url = `${location.origin}${location.pathname}`;
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    document.head.appendChild(ogUrl);
  }
  ogUrl.content = url;
}

function init(): void {
  initLang();
  ensureCanonicalAndOgUrl();
  renderHeader();
  renderFooter();
  route();
  window.addEventListener("hashchange", route);
  onLangChange(() => {
    renderHeader();
    renderFooter();
    route();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
