import { expect, test } from "@playwright/test";

test("custom dictionaries migrate, edit and persist independent settings", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ordvaerk-ordbog", JSON.stringify([{ word: "TEST", clue: "Gammel", length: 4, source: "custom" }])));
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await page.locator(".dictionary-editor summary").click();
  await expect(page.getByText("Gammel", { exact: false }).last()).toBeVisible();
  await page.getByRole("button", { name: "Rediger TEST: Gammel" }).click();
  await page.locator(".custom-word-row input").fill("TEST;Ny ledetråd");
  await page.getByRole("button", { name: "Gem ændring" }).click();
  await page.getByLabel("Ny ordbog").fill("Tema");
  await page.getByRole("button", { name: "Opret ordbog" }).click();
  await page.getByLabel("Ord og ledetråde", { exact: true }).fill("KAT;Dyr");
  await page.getByRole("button", { name: "Gem ord", exact: true }).click();
  await page.getByLabel("Vis i ordforslag").uncheck();
  await expect(page.getByLabel("Brug til autofyldning")).toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await page.locator(".dictionary-editor summary").click();
  await page.getByLabel("Vælg ordbog").selectOption({ label: "Tema" });
  await expect(page.getByLabel("Vis i ordforslag")).not.toBeChecked();
  await expect(page.getByLabel("Brug til autofyldning")).toBeChecked();
  await page.getByRole("button", { name: "Fjern KAT: Dyr" }).click();
  await page.getByLabel("Vælg ordbog").selectOption({ label: "Egen ordbog" });
  await expect(page.getByText("Ny ledetråd", { exact: false }).last()).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ordvaerk-ordboger-v1")!));
  expect(saved[1].entries).toHaveLength(0);
});

