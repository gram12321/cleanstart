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
