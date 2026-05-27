/**
 * Results renderer — walks `instrument.result.blocks[]` and renders each by
 * `block.kind`, reading from the `Diagnosis` the instrument's own `score()`
 * returns. The engine never imports an instrument; it calls `inst.score`.
 */
import { t, ct, ctf } from "./i18n";
import { escapeHtml } from "./util";
import type {
  Diagnosis,
  Instrument,
  InstrumentState,
  ListItem,
  ReadinessLevel,
  ResultBlock,
} from "./instrument";

const LEVELS: ReadinessLevel[] = ["building", "getting_ready", "ready"];

function renderNarrative(block: Extract<ResultBlock, { kind: "narrative" }>, diag: Diagnosis): string {
  return `
    <section class="section" aria-labelledby="b-${escapeHtml(block.kind)}">
      <h2 id="b-${escapeHtml(block.kind)}">${escapeHtml(ct(block.headingKey))}</h2>
      <p class="narrative">${escapeHtml(ctf(block.bodyKey, diag.vars))}</p>
    </section>
  `;
}

function renderListReflect(block: Extract<ResultBlock, { kind: "list-reflect" }>, diag: Diagnosis): string {
  const items = diag.lists[block.source] ?? [];
  const lead = block.leadKey ? `<p class="lead-in">${escapeHtml(ct(block.leadKey))}</p>` : "";
  if (items.length === 0) {
    const empty = block.emptyKey ? `<p class="lead-in">${escapeHtml(ct(block.emptyKey))}</p>` : "";
    return `
      <section class="section summary-block">
        <h3>${escapeHtml(ct(block.headingKey))}</h3>
        ${empty}
      </section>
    `;
  }
  const lis = items.map((it) => {
    const secondary = it.secondary
      ? `<span class="example">${escapeHtml(it.secondary)}</span>`
      : "";
    return `<li><strong>${escapeHtml(it.primary)}</strong>${secondary}</li>`;
  }).join("");
  return `
    <section class="section summary-block">
      <h3>${escapeHtml(ct(block.headingKey))}</h3>
      ${lead}
      <ul class="reflect-list">${lis}</ul>
    </section>
  `;
}

function renderLevelMeter(block: Extract<ResultBlock, { kind: "level-meter" }>, diag: Diagnosis): string {
  const meter = diag.meters[block.source];
  if (!meter) return "";
  const segs = LEVELS.map((lvl) => {
    const active = lvl === meter.level;
    return `<span class="meter-seg ${active ? "active" : ""}" aria-current="${active ? "true" : "false"}">${escapeHtml(ct(`${block.levelCopyPrefix}.${lvl}.name`))}</span>`;
  }).join("");
  const lead = block.leadKey ? `<p class="lead-in">${escapeHtml(ct(block.leadKey))}</p>` : "";
  return `
    <section class="section summary-block">
      <h3>${escapeHtml(ct(block.headingKey))}</h3>
      ${lead}
      <div class="level-meter" data-level="${escapeHtml(meter.level)}">
        <div class="meter-track" role="img" aria-label="${escapeHtml(ct(`${block.levelCopyPrefix}.${meter.level}.name`))}">${segs}</div>
        <p class="meter-desc">${escapeHtml(ct(`${block.levelCopyPrefix}.${meter.level}.desc`))}</p>
      </div>
    </section>
  `;
}

function renderScriptSeed(block: Extract<ResultBlock, { kind: "script-seed" }>, diag: Diagnosis): string {
  const lines = diag.scripts[block.source] ?? [];
  if (lines.length === 0) return "";
  const lead = block.leadKey ? `<p class="lead-in">${escapeHtml(ct(block.leadKey))}</p>` : "";
  const steps = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  return `
    <section class="section summary-block">
      <h3>${escapeHtml(ct(block.headingKey))}</h3>
      ${lead}
      <ol class="script-seed">${steps}</ol>
    </section>
  `;
}

function renderItemList(items: ListItem[]): string {
  return items.map((it) => {
    const secondary = it.secondary ? `<span class="example">${escapeHtml(it.secondary)}</span>` : "";
    return `<li><strong>${escapeHtml(it.primary)}</strong>${secondary}</li>`;
  }).join("");
}

function renderSplitMap(block: Extract<ResultBlock, { kind: "split-map" }>, diag: Diagnosis): string {
  const map = diag.maps?.[block.source] ?? { left: [], right: [] };
  const lead = block.leadKey ? `<p class="lead-in">${escapeHtml(ct(block.leadKey))}</p>` : "";
  const leftBody = map.left.length
    ? `<ul class="reflect-list">${renderItemList(map.left)}</ul>`
    : `<p class="lead-in">${escapeHtml(ct(block.leftEmptyKey))}</p>`;
  const rightBody = map.right.length
    ? `<ul class="reflect-list">${renderItemList(map.right)}</ul>`
    : `<p class="lead-in">${escapeHtml(ct(block.rightEmptyKey))}</p>`;
  return `
    <section class="section summary-block">
      <h3>${escapeHtml(ct(block.headingKey))}</h3>
      ${lead}
      <div class="split-map">
        <div class="split-col split-strengths">
          <h4>${escapeHtml(ct(block.leftHeadingKey))}</h4>
          ${leftBody}
        </div>
        <div class="split-col split-watchouts">
          <h4>${escapeHtml(ct(block.rightHeadingKey))}</h4>
          ${rightBody}
        </div>
      </div>
    </section>
  `;
}

function renderAssetMap(block: Extract<ResultBlock, { kind: "asset-map" }>, diag: Diagnosis): string {
  const groups = diag.assets?.[block.source] ?? [];
  const lead = block.leadKey ? `<p class="lead-in">${escapeHtml(ct(block.leadKey))}</p>` : "";
  if (groups.length === 0) {
    const empty = block.emptyKey ? `<p class="lead-in">${escapeHtml(ct(block.emptyKey))}</p>` : "";
    return `<section class="section summary-block"><h3>${escapeHtml(ct(block.headingKey))}</h3>${empty}</section>`;
  }
  const cards = groups.map((g) => `
    <div class="asset-group">
      <h4>${escapeHtml(g.group)}</h4>
      <ul class="reflect-list">${renderItemList(g.items)}</ul>
    </div>
  `).join("");
  return `
    <section class="section summary-block">
      <h3>${escapeHtml(ct(block.headingKey))}</h3>
      ${lead}
      <div class="asset-map">${cards}</div>
    </section>
  `;
}

function renderCta(block: Extract<ResultBlock, { kind: "cta" }>): string {
  const body = block.bodyKey ? `<p>${escapeHtml(ct(block.bodyKey))}</p>` : "";
  return `
    <section class="section" aria-labelledby="b-cta">
      <h2 id="b-cta">${escapeHtml(ct(block.headingKey))}</h2>
      <div class="next-step-card cta-card">
        ${body}
        <a class="btn" href="${escapeHtml(block.href)}" target="_blank" rel="noopener">${escapeHtml(ct(block.linkKey))}</a>
      </div>
    </section>
  `;
}

function renderBlock(block: ResultBlock, diag: Diagnosis): string {
  switch (block.kind) {
    case "narrative": return renderNarrative(block, diag);
    case "list-reflect": return renderListReflect(block, diag);
    case "level-meter": return renderLevelMeter(block, diag);
    case "script-seed": return renderScriptSeed(block, diag);
    case "split-map": return renderSplitMap(block, diag);
    case "asset-map": return renderAssetMap(block, diag);
    case "cta": return renderCta(block);
  }
}

export function renderResults(inst: Instrument, state: InstrumentState, root: HTMLElement): void {
  const diag = inst.score(state, ct);
  const blocks = inst.result.blocks.map((b) => renderBlock(b, diag)).join("");

  root.innerHTML = `
    <article class="results" aria-labelledby="r-title">
      <p class="tool-eyebrow"><a href="#/" data-action="hub">${escapeHtml(t("survey.all_tools"))}</a></p>
      <p class="complete-badge"><span aria-hidden="true">✓</span> ${escapeHtml(t("results.complete_badge"))}</p>
      <h1 id="r-title">${escapeHtml(ct("results.title"))}</h1>

      ${blocks}

      <section class="section" aria-labelledby="sec-take">
        <h2 id="sec-take">${escapeHtml(t("results.take_title"))}</h2>
        <div class="next-step-card" id="pdf-controls">
          <button type="button" class="btn block" data-action="pdf">${escapeHtml(t("results.pdf_button"))}</button>
          <p class="helper">${escapeHtml(t("results.pdf_helper"))}</p>
          <p class="helper">${escapeHtml(t("results.specialist_note"))}</p>
          <p class="restart">
            ${escapeHtml(t("results.restart_note"))} <a href="#/${escapeHtml(inst.id)}/" data-action="restart">${escapeHtml(t("results.restart_link"))}</a>
          </p>
        </div>
      </section>

      <p class="print-only print-footer">${escapeHtml(t("footer.disclaimer"))}</p>
    </article>
  `;
}
