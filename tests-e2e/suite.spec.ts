import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("hub lists all four self-checks", async ({ page }) => {
  await expect(page.locator(".tool-card")).toHaveCount(4);
  const titles = await page.locator(".tool-card-title").allTextContents();
  expect(titles.join(" | ")).toMatch(/Your Wins/);
  expect(titles.join(" | ")).toMatch(/Transferable Skills/);
  expect(titles.join(" | ")).toMatch(/Workplace Culture/);
  expect(titles.join(" | ")).toMatch(/Hidden Network/);
});

test("W10 culture fit → split-map", async ({ page }) => {
  await page.goto("/#/w10/q");
  const ratings = { n_speak: 2, n_sell: 0, n_smalltalk: 2, n_questions: 0, n_disagree: 1, n_network: 2 };
  for (const [id, val] of Object.entries(ratings)) {
    await page.click(`[data-action="rate"][data-qid="${id}"][data-val="${val}"]`);
  }
  await page.click('button[data-action="next"]');
  await expect(page).toHaveURL(/#\/w10\/results$/);
  await expect(page.locator(".split-strengths .reflect-list li")).toHaveCount(3);
  await expect(page.locator(".split-watchouts .reflect-list li")).toHaveCount(2);
  await expect(page.locator(".split-watchouts .example").first()).toBeVisible(); // coping tip
});

test("W04 transferable skills → asset-map + STAR story", async ({ page }) => {
  await page.goto("/#/w04/q");
  await page.fill('[data-action="repeater-input"][data-qid="jobs"][data-row="0"][data-field="title"]', "Restaurant server");
  await page.fill('[data-action="repeater-input"][data-qid="jobs"][data-row="0"][data-field="did"]', "Took orders, handled cash");
  await page.click('button[data-action="next"]');
  for (const id of ["s_helping", "s_calm", "s_reliable"]) {
    await page.click(`[data-action="chip"][data-qid="skills"][data-id="${id}"]`);
  }
  await page.click('button[data-action="next"]');
  await expect(page).toHaveURL(/#\/w04\/results$/);
  await expect(page.locator(".asset-group")).not.toHaveCount(0);
  await expect(page.locator(".script-seed").first().locator("li")).toHaveCount(4); // S/T/A/R
});

test("W12 hidden network → asset-map + meter + outreach", async ({ page }) => {
  await page.goto("/#/w12/q");
  await page.fill('[data-action="repeater-input"][data-qid="family"][data-row="0"][data-field="name"]', "Auntie Lin");
  await page.fill('[data-action="repeater-input"][data-qid="family"][data-row="0"][data-field="how"]', "works in healthcare");
  await page.click('button[data-action="next"]');
  for (const id of ["r1", "r2", "r3", "r4"]) {
    await page.click(`[data-action="rate"][data-qid="${id}"][data-val="1"]`);
  }
  await page.click('button[data-action="next"]');
  await expect(page).toHaveURL(/#\/w12\/results$/);
  await expect(page.locator(".asset-group")).not.toHaveCount(0);
  await expect(page.locator(".meter-seg.active")).toBeVisible();
  await expect(page.locator(".script-seed")).toContainText("Auntie Lin");
});

test("W12 first category gates Next (min 1)", async ({ page }) => {
  await page.goto("/#/w12/q");
  await page.click('button[data-action="next"]');
  await expect(page.locator(".field-error")).toBeVisible();
});
