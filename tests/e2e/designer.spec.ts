import { expect, test } from "@playwright/test";

test("designer selects a word and inserts a verified suggestion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await page.getByRole("button", { name: "Udgiv krydsord" }).click();
  await expect(page.getByText("Udfyld alle bogstavfelter før udgivelse.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mulige ord" })).toBeVisible();
  await expect(page.locator(".editor-cell").first()).toHaveValue("");
  const suggestion = page.locator(".suggestion-list button").first();
  await expect(suggestion).toBeVisible({ timeout: 60000 });
  const word = await suggestion.locator("strong").innerText();
  await suggestion.click();
  await expect(page.locator(".selection-info strong")).toHaveText(word);
  await page.getByRole("button", { name: "Ryd alle bogstaver" }).click();
  await expect(page.locator(".editor-cell").first()).toHaveValue("");
});

test("multiple custom clues for one answer can be selected and survive reload", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  const first = page.locator(".suggestion-list button").first();
  await expect(first).toBeVisible({ timeout: 60000 });
  const word = await first.locator("strong").innerText();
  await page.locator(".dictionary-editor summary").click();
  await page.getByLabel("Ord og ledetråde").fill(`${word};Første testledetråd\n${word};Anden testledetråd`);
  await page.getByRole("button", { name: "Gem ord" }).click();
  await expect(page.getByText("2 ord er gemt.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Designerværksted" }).click();
  const second = page.locator(".suggestion-list button").filter({ hasText: "Anden testledetråd" });
  await expect(second).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".suggestion-list button").filter({ hasText: "Første testledetråd" })).toBeVisible();
  await second.click();
  await expect(page.getByLabel("Ledetråd til valgt ord")).toHaveValue("Anden testledetråd");
  await page.getByRole("button", { name: "Ryd alle bogstaver" }).click();
  await expect(page.getByLabel("Ledetråd til valgt ord")).toHaveValue("");
});


test("custom dictionary accepts several answers for one clue in both views", async ({ page }) => {
  await page.goto("/");
  await page.locator(".dictionary-section summary").click();
  await page.locator("#dictionary-input").fill("Pigenavn: Hanne|Sigrid\nCYKEL;Køretøj;Transportmiddel");
  await page.getByRole("button", { name: "Gem ord" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ordvaerk-ordbog") ?? "[]").length)).toBe(4);
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await page.locator(".dictionary-editor summary").click();
  await page.getByLabel("Ord og ledetråde").fill("Pigenavn: Ida|Anna");
  await page.getByRole("button", { name: "Gem ord" }).click();
  const entries = await page.evaluate(() => JSON.parse(localStorage.getItem("ordvaerk-ordbog") ?? "[]") as { word: string; clue: string }[]);
  expect(entries.filter(entry => entry.clue === "Pigenavn").map(entry => entry.word)).toEqual(["HANNE", "SIGRID", "IDA", "ANNA"]);
  await page.getByLabel("Ord og ledetråde").fill("Pigenavn: Hanne|");
  await page.getByRole("button", { name: "Gem ord" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Pigenavn" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ordvaerk-ordbog") ?? "[]").length)).toBe(6);
});
