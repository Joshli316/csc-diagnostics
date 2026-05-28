/**
 * Generalized survey renderer + delegated state machine. One renderer per
 * `question.kind`; the active instrument and its saved state are module-local
 * and (re)set by `setActiveInstrument` when the router enters `#/<id>/q`.
 */
import { t, ct, formatT, getLang, setActiveCopy, pickLang } from "./i18n";
import type {
  Instrument,
  InstrumentState,
  Labeled,
  Page,
  Question,
  RatingValue,
  RepeaterRow,
} from "./instrument";
import { emptyState, loadState, saveState } from "./state";
import { escapeHtml } from "./util";
import {
  buildPageList,
  validatePage,
  togglePick,
  type ValidationResult,
} from "./survey-logic";

let inst: Instrument | null = null;
let pages: Page[] = [];
let state: InstrumentState = emptyState(getLang());
let errorMessage: string | null = null;

/** Bind the survey machine to an instrument; loads saved state or starts fresh. */
export function setActiveInstrument(next: Instrument): void {
  inst = next;
  pages = buildPageList(next);
  setActiveCopy(next.copy);
  const saved = loadState(next.id);
  state = saved ?? emptyState(getLang());
  errorMessage = null;
}

export function activeInstrumentId(): string | null {
  return inst?.id ?? null;
}

export function totalPages(): number {
  return pages.length;
}

export function reloadActiveFromStorage(): void {
  if (!inst) return;
  const saved = loadState(inst.id);
  if (saved) state = saved;
}

export function resetActive(): void {
  if (!inst) return;
  state = emptyState(getLang());
  errorMessage = null;
  saveState(inst.id, state);
}

function getCurrentPage(): Page {
  const idx = Math.max(0, Math.min(state.pageIndex, pages.length - 1));
  return pages[idx];
}

function progressPct(): number {
  return Math.round(((state.pageIndex + 1) / Math.max(1, pages.length)) * 100);
}

// ===== Per-kind renderers =====

function renderModuleIntro(titleKey: string, whyKey: string | undefined): string {
  const num = state.pageIndex + 1;
  return `
    <section class="module-intro" aria-labelledby="mod-title">
      <span class="module-num" aria-hidden="true">${num}</span>
      <div class="module-intro-body">
        <h2 id="mod-title">${escapeHtml(ct(titleKey))}</h2>
        ${whyKey ? `<p>${escapeHtml(ct(whyKey))}</p>` : ""}
      </div>
    </section>
  `;
}

/** Resolve a label from a copy key or an inline bilingual pair. */
function optionLabel(o: Labeled): string {
  return o.labelKey ? ct(o.labelKey) : pickLang(o.label);
}

function qIntroId(q: Question): string {
  return `qi-${q.id}`;
}

function renderQuestionIntro(q: Question): string {
  if (!q.introTitleKey) return "";
  return `
    <div class="q-intro">
      <h3 id="${escapeHtml(qIntroId(q))}">${escapeHtml(ct(q.introTitleKey))}</h3>
      ${q.introWhyKey ? `<p>${escapeHtml(ct(q.introWhyKey))}</p>` : ""}
    </div>
  `;
}

/**
 * Group label for chip/tile/choice containers. Screen readers announce
 * `role="group"` with no name as just "group" — link the group to the q-intro
 * h3 when one exists; otherwise drop role="group" so AT users hear the buttons
 * unannounced rather than a nameless group.
 */
function groupAttrs(q: Question): string {
  return q.introTitleKey ? ` role="group" aria-labelledby="${escapeHtml(qIntroId(q))}"` : "";
}

function renderMatrixRating(q: Extract<Question, { kind: "matrix-rating" }>): string {
  const labels: Record<number, string> = {
    2: ct(q.scaleKeys[0]),
    1: ct(q.scaleKeys[1]),
    0: ct(q.scaleKeys[2]),
  };
  const rows = q.items.map((item) => {
    const v = state.ratings[item.id];
    const label = optionLabel(item);
    const ex = item.exampleKey ? ct(item.exampleKey) : "";
    return `
      <li class="q-row" data-qid="${escapeHtml(item.id)}">
        ${ex
          ? `<div><div class="label">${escapeHtml(label)}</div><div class="ex">${escapeHtml(ex)}</div></div>`
          : `<span class="label">${escapeHtml(label)}</span>`}
        <div class="opts" role="group" aria-label="${escapeHtml(label)}">
          ${[2, 1, 0].map((val) => `
            <button type="button" class="opt" data-action="rate" data-qid="${escapeHtml(item.id)}" data-val="${val}"
              aria-pressed="${v === val ? "true" : "false"}">
              ${escapeHtml(labels[val])}
            </button>
          `).join("")}
        </div>
      </li>
    `;
  }).join("");
  return `${renderQuestionIntro(q)}<ul class="q-list">${rows}</ul>`;
}

function renderChips(q: Extract<Question, { kind: "chips" }>): string {
  const picks = state.picks[q.id] ?? [];
  const chips = q.options.map((o) => {
    const active = picks.includes(o.id);
    return `
      <button type="button" class="chip" data-action="chip" data-qid="${escapeHtml(q.id)}" data-id="${escapeHtml(o.id)}" aria-pressed="${active}">
        ${escapeHtml(optionLabel(o))}
      </button>
    `;
  }).join("");
  // "Pick all that apply" lists (cap >= option count) show a plain count;
  // genuinely capped lists show "n of max".
  const counter = q.cap >= q.options.length
    ? formatT("survey.selected_count_simple", { n: picks.length })
    : formatT("survey.selected_count", { n: picks.length, max: q.cap });
  return `
    ${renderQuestionIntro(q)}
    <div class="tag-cloud"${groupAttrs(q)}>${chips}</div>
    <p class="step-counter" aria-live="polite">${escapeHtml(counter)}</p>
  `;
}

function renderTiles(q: Extract<Question, { kind: "tiles" }>): string {
  const picks = state.picks[q.id] ?? [];
  const tiles = q.options.map((o) => {
    const active = picks.includes(o.id);
    const order = picks.indexOf(o.id);
    const label = optionLabel(o);
    const ariaLabel = active ? formatT("survey.tile_selected_rank", { label, rank: order + 1 }) : label;
    return `
      <button type="button" class="tile" data-action="tile" data-qid="${escapeHtml(q.id)}" data-id="${escapeHtml(o.id)}"
        aria-pressed="${active}" aria-label="${escapeHtml(ariaLabel)}">
        ${active ? `<span class="count-badge" aria-hidden="true">${order + 1}</span>` : ""}
        ${o.svg ? `<span class="svg-wrap" aria-hidden="true">${o.svg}</span>` : ""}
        <span class="label">${escapeHtml(label)}</span>
      </button>
    `;
  }).join("");
  const counter = formatT("survey.selected_count", { n: picks.length, max: q.pick });
  return `
    ${renderQuestionIntro(q)}
    <div class="tile-grid"${groupAttrs(q)}>${tiles}</div>
    <p class="step-counter" aria-live="polite">${escapeHtml(counter)}</p>
  `;
}

function renderSingleTile(q: Extract<Question, { kind: "single-tile" }>): string {
  const chosen = state.singles[q.id];
  const tiles = q.options.map((o) => {
    const active = chosen === o.id;
    return `
      <button type="button" class="tile" data-action="single" data-qid="${escapeHtml(q.id)}" data-id="${escapeHtml(o.id)}"
        aria-pressed="${active}">
        ${o.svg ? `<span class="svg-wrap" aria-hidden="true">${o.svg}</span>` : ""}
        <span class="label">${escapeHtml(optionLabel(o))}</span>
      </button>
    `;
  }).join("");
  return `${renderQuestionIntro(q)}<div class="tile-grid"${groupAttrs(q)}>${tiles}</div>`;
}

function renderChoice(q: Extract<Question, { kind: "choice" }>): string {
  const chosen = state.singles[q.id];
  return `
    ${renderQuestionIntro(q)}
    <div class="tot-wrap"${groupAttrs(q)}>
      <button type="button" class="tot-card" data-action="choice" data-qid="${escapeHtml(q.id)}" data-side="a"
        aria-pressed="${chosen === "a"}">${escapeHtml(ct(q.aKey))}</button>
      <span class="tot-or" aria-hidden="true">${escapeHtml(t("survey.or_separator"))}</span>
      <button type="button" class="tot-card" data-action="choice" data-qid="${escapeHtml(q.id)}" data-side="b"
        aria-pressed="${chosen === "b"}">${escapeHtml(ct(q.bKey))}</button>
    </div>
  `;
}

function blankRow(q: Extract<Question, { kind: "repeater" }>): RepeaterRow {
  const row: RepeaterRow = {};
  for (const f of q.fields) row[f.id] = "";
  return row;
}

function renderRepeater(q: Extract<Question, { kind: "repeater" }>): string {
  // Seed the minimum number of blank rows on first visit so the user always
  // sees at least one row to fill in.
  if (!state.repeaters[q.id]) {
    state.repeaters[q.id] = Array.from({ length: Math.max(1, q.min) }, () => blankRow(q));
    if (inst) saveState(inst.id, state);
  }
  const rows = state.repeaters[q.id];
  const canRemove = rows.length > 1;
  const rowsHtml = rows.map((row, i) => {
    const fields = q.fields.map((f) => {
      const value = row[f.id] ?? "";
      const ph = f.placeholderKey ? ct(f.placeholderKey) : "";
      const common =
        `data-action="repeater-input" data-qid="${escapeHtml(q.id)}" data-row="${i}" data-field="${escapeHtml(f.id)}"` +
        ` placeholder="${escapeHtml(ph)}"`;
      const control = f.multiline
        ? `<textarea class="repeater-input" rows="2" ${common}>${escapeHtml(value)}</textarea>`
        : `<input type="text" class="repeater-input" ${common} value="${escapeHtml(value)}" />`;
      return `
        <label class="repeater-field">
          <span class="repeater-field-label">${escapeHtml(ct(f.labelKey))}</span>
          ${control}
        </label>
      `;
    }).join("");
    const rowLabel = q.rowLabelKey ? ct(q.rowLabelKey).replace(/\{n\}/g, String(i + 1)) : `${i + 1}`;
    const removeBtn = canRemove
      ? `<button type="button" class="repeater-remove" data-action="repeater-remove" data-qid="${escapeHtml(q.id)}" data-row="${i}">${escapeHtml(ct(q.removeLabelKey))}</button>`
      : "";
    return `
      <fieldset class="repeater-row" data-row="${i}">
        <legend class="repeater-legend"><span>${escapeHtml(rowLabel)}</span>${removeBtn}</legend>
        ${fields}
      </fieldset>
    `;
  }).join("");
  const atMax = rows.length >= q.max;
  const addBtn = `<button type="button" class="btn ghost repeater-add" data-action="repeater-add" data-qid="${escapeHtml(q.id)}" ${atMax ? "disabled" : ""}>${escapeHtml(ct(q.addLabelKey))}</button>`;
  return `${renderQuestionIntro(q)}<div class="repeater" data-qid="${escapeHtml(q.id)}">${rowsHtml}${addBtn}</div>`;
}

function renderQuestion(q: Question): string {
  switch (q.kind) {
    case "matrix-rating": return renderMatrixRating(q);
    case "chips": return renderChips(q);
    case "tiles": return renderTiles(q);
    case "single-tile": return renderSingleTile(q);
    case "choice": return renderChoice(q);
    case "repeater": return renderRepeater(q);
  }
}

// ===== Validation =====

function messageFor(res: ValidationResult): string {
  return res.vars ? formatT(`survey.${res.code}`, res.vars) : t(`survey.${res.code}`);
}

function validateCurrent(): string | null {
  const res = validatePage(state, getCurrentPage());
  return res === null ? null : messageFor(res);
}

// ===== Main render =====

export function renderSurvey(root: HTMLElement): void {
  if (!inst) return;
  state.lang = getLang();

  const page = getCurrentPage();
  const intro = page.introTitleKey ? renderModuleIntro(page.introTitleKey, page.introWhyKey) : "";
  const body = page.questions.map(renderQuestion).join("");

  const isLast = state.pageIndex === pages.length - 1;
  const nextLabel = isLast ? t("survey.finish") : t("survey.next");
  const backLabel = t("survey.back");
  const stepCounter = formatT("survey.step_counter", {
    current: state.pageIndex + 1,
    total: pages.length,
  });

  root.innerHTML = `
    <p class="tool-eyebrow"><a href="#/" data-action="hub">${escapeHtml(t("survey.all_tools"))}</a></p>
    <div class="progress">
      <span class="bar" role="progressbar"
            aria-valuenow="${state.pageIndex + 1}" aria-valuemin="1" aria-valuemax="${pages.length}"
            aria-label="${escapeHtml(stepCounter)}">
        <span class="fill" style="width:${progressPct()}%"></span>
      </span>
    </div>
    <div class="survey-page" data-page-index="${state.pageIndex}">
      ${intro}
      ${body}
      ${errorMessage ? `<p class="field-error" role="alert">${escapeHtml(errorMessage)}</p>` : ""}
      <div class="survey-nav">
        <button type="button" class="btn ghost" data-action="back" ${state.pageIndex === 0 ? "disabled" : ""}>${escapeHtml(backLabel)}</button>
        <button type="button" class="btn" data-action="next">${escapeHtml(nextLabel)}</button>
      </div>
      <p class="step-counter">${escapeHtml(stepCounter)}</p>
    </div>
  `;

  const wrap = root.querySelector(".survey-page");
  if (!wrap) return;
  wrap.addEventListener("click", onClick);
  wrap.addEventListener("input", onInput);
}

function onInput(ev: Event): void {
  if (!inst) return;
  const target = ev.target as HTMLElement | null;
  if (!target) return;
  const el = target.closest<HTMLElement>('[data-action="repeater-input"]');
  if (!el) return;
  const qid = el.dataset.qid!;
  const rowIdx = Number(el.dataset.row);
  const field = el.dataset.field!;
  const value = (el as HTMLInputElement | HTMLTextAreaElement).value;
  const rows = state.repeaters[qid];
  if (!rows || !rows[rowIdx]) return;
  rows[rowIdx][field] = value;
  // Persist without re-rendering — re-rendering on every keystroke would drop
  // focus and the caret.
  saveState(inst.id, state);
}

function onClick(ev: Event): void {
  if (!inst) return;
  const target = ev.target as HTMLElement | null;
  if (!target) return;
  const actionEl = target.closest<HTMLElement>("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action!;
  switch (action) {
    case "rate": {
      const qid = actionEl.dataset.qid!;
      const val = Number(actionEl.dataset.val) as RatingValue;
      if (state.ratings[qid] === val) break;
      state.ratings[qid] = val;
      saveState(inst.id, state);
      rerender();
      break;
    }
    case "chip": {
      const qid = actionEl.dataset.qid!;
      const cap = capFor(qid);
      state.picks[qid] = togglePick(state.picks[qid] ?? [], actionEl.dataset.id!, cap);
      saveState(inst.id, state);
      rerender();
      break;
    }
    case "tile": {
      const qid = actionEl.dataset.qid!;
      const cap = pickFor(qid);
      state.picks[qid] = togglePick(state.picks[qid] ?? [], actionEl.dataset.id!, cap);
      saveState(inst.id, state);
      rerender();
      break;
    }
    case "single": {
      const qid = actionEl.dataset.qid!;
      const id = actionEl.dataset.id!;
      if (state.singles[qid] === id) break;
      state.singles[qid] = id;
      saveState(inst.id, state);
      rerender();
      break;
    }
    case "choice": {
      const qid = actionEl.dataset.qid!;
      const side = actionEl.dataset.side as "a" | "b";
      if (state.singles[qid] === side) break;
      state.singles[qid] = side;
      saveState(inst.id, state);
      rerender();
      break;
    }
    case "repeater-add": {
      const qid = actionEl.dataset.qid!;
      const q = findRepeater(qid);
      if (!q) break;
      const rows = state.repeaters[qid] ?? [];
      if (rows.length >= q.max) break;
      rows.push(blankRow(q));
      state.repeaters[qid] = rows;
      saveState(inst.id, state);
      rerender({ focusRepeaterRow: { qid, row: rows.length - 1 } });
      break;
    }
    case "repeater-remove": {
      const qid = actionEl.dataset.qid!;
      const rowIdx = Number(actionEl.dataset.row);
      const rows = state.repeaters[qid];
      if (!rows || rows.length <= 1) break;
      rows.splice(rowIdx, 1);
      saveState(inst.id, state);
      rerender();
      break;
    }
    case "back": {
      if (state.pageIndex > 0) {
        errorMessage = null;
        state.pageIndex -= 1;
        saveState(inst.id, state);
        rerender({ scrollToTop: true, focusHeading: true });
      }
      break;
    }
    case "next": {
      const err = validateCurrent();
      if (err) {
        errorMessage = err;
        rerender();
        return;
      }
      errorMessage = null;
      if (state.pageIndex >= pages.length - 1) {
        saveState(inst.id, state);
        location.hash = `#/${inst.id}/results`;
        return;
      }
      state.pageIndex += 1;
      saveState(inst.id, state);
      rerender({ scrollToTop: true, focusHeading: true });
      break;
    }
  }
}

function capFor(qid: string): number {
  const q = currentQuestion(qid);
  return q && q.kind === "chips" ? q.cap : 99;
}
function pickFor(qid: string): number {
  const q = currentQuestion(qid);
  return q && q.kind === "tiles" ? q.pick : 99;
}
function findRepeater(qid: string): Extract<Question, { kind: "repeater" }> | null {
  const q = currentQuestion(qid);
  return q && q.kind === "repeater" ? q : null;
}
function currentQuestion(qid: string): Question | null {
  return getCurrentPage().questions.find((q) => q.id === qid) ?? null;
}

// tabindex=-1 keeps the heading focusable for SR announcements without
// inserting it into the tab order. styles.css suppresses the outline.
function focusFirstHeading(root: HTMLElement): void {
  const h = root.querySelector<HTMLHeadingElement>("h1, h2");
  if (!h) return;
  if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
  h.focus({ preventScroll: true });
}

function focusKeyFor(el: Element | null): string | null {
  if (!el || !(el instanceof HTMLElement)) return null;
  const action = el.dataset.action;
  if (!action) return null;
  const parts = [`[data-action="${action}"]`];
  for (const key of ["qid", "id", "side", "val", "row", "field"] as const) {
    const v = el.dataset[key];
    if (v) parts.push(`[data-${key}="${v}"]`);
  }
  return parts.join("");
}

interface RerenderOpts {
  scrollToTop?: boolean;
  focusHeading?: boolean;
  focusRepeaterRow?: { qid: string; row: number };
}

function rerender(opts: RerenderOpts = {}): void {
  const root = document.getElementById("main");
  if (!root) return;
  const prevFocusKey = focusKeyFor(document.activeElement);
  renderSurvey(root);
  if (opts.scrollToTop) window.scrollTo(0, 0);
  if (opts.focusHeading) {
    focusFirstHeading(root);
    return;
  }
  if (opts.focusRepeaterRow) {
    const { qid, row } = opts.focusRepeaterRow;
    const sel = `[data-action="repeater-input"][data-qid="${qid}"][data-row="${row}"]`;
    root.querySelector<HTMLElement>(sel)?.focus();
    return;
  }
  if (prevFocusKey) {
    root.querySelector<HTMLElement>(prevFocusKey)?.focus();
  }
}
