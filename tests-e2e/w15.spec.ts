import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("hub lists the W15 self-check", async ({ page }) => {
  await expect(page.locator("h1")).toContainText("Workshop Self-Checks");
  await expect(page.locator(".tool-card-title").first()).toContainText("Your Wins");
});

test("language toggle swaps copy and updates html[lang]", async ({ page }) => {
  await page.click('button[data-lang="zh-Hans"]');
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.locator(".brand")).toHaveText(/自我评估/);
  await page.click('button[data-lang="en"]');
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("W15 end-to-end: wins → readiness → results", async ({ page }) => {
  await page.click(".tool-card");
  await expect(page).toHaveURL(/#\/w15\/$/);
  await expect(page.locator("h1")).toContainText("Your Wins");

  await page.click('button[data-action="start"]');
  await expect(page).toHaveURL(/#\/w15\/q$/);

  // Page 1: wins repeater — fill one win with a quantified result.
  await page.fill('[data-action="repeater-input"][data-qid="wins"][data-row="0"][data-field="action"]', "Trained new hires");
  await page.fill('[data-action="repeater-input"][data-qid="wins"][data-row="0"][data-field="result"]', "Cut onboarding time by 30%");
  await page.click('button[data-action="next"]');

  // Page 2: readiness — rate all 4 statements.
  for (const id of ["r1", "r2", "r3", "r4"]) {
    await page.click(`[data-action="rate"][data-qid="${id}"][data-val="2"]`);
  }
  await page.click('button[data-action="next"]');

  // Results
  await expect(page).toHaveURL(/#\/w15\/results$/);
  await expect(page.locator(".complete-badge")).toBeVisible();
  await expect(page.locator(".reflect-list")).toContainText("Trained new hires");
  await expect(page.locator(".meter-seg.active")).toContainText(/Ready to ask/);
  await expect(page.locator(".script-seed li")).toHaveCount(3);
  await expect(page.locator(".script-seed")).toContainText("Cut onboarding time by 30%");
  await expect(page.locator('button[data-action="pdf"]')).toBeVisible();
});

test("validation: Next on empty wins page is blocked", async ({ page }) => {
  await page.goto("/#/w15/q");
  await page.click('button[data-action="next"]');
  await expect(page.locator(".field-error")).toBeVisible();
});

test("repeater: add up to max, remove, and min blocks Next", async ({ page }) => {
  await page.goto("/#/w15/q");
  // One seeded row → add 4 more to hit max (5), then Add is disabled.
  for (let i = 0; i < 4; i++) {
    await page.click('button[data-action="repeater-add"]');
  }
  await expect(page.locator(".repeater-row")).toHaveCount(5);
  await expect(page.locator('button[data-action="repeater-add"]')).toBeDisabled();
  // Remove one row → back to 4.
  await page.locator('.repeater-remove').first().click();
  await expect(page.locator(".repeater-row")).toHaveCount(4);
});
