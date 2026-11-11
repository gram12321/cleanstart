import { expect, test } from "@playwright/test";
import { generatePuzzle } from "../../src/crossword/generator";
import { dictionary } from "../../src/crossword/dictionary";

test("player progress is restored separately for each published crossword", async ({ page }) => {
  const first = generatePuzzle(9, dictionary);
  const second = generatePuzzle(9, dictionary);
  await page.addInitScript(({ first, second }) => {
    if (!localStorage.getItem("ordvaerk-library-v1")) localStorage.setItem("ordvaerk-library-v1", JSON.stringify([{ id: "a", name: "Første", puzzle: first }, { id: "b", name: "Andet", puzzle: second }]));
  }, { first, second });
  await page.goto("/");
  const choice = page.getByLabel("Vælg krydsord");
  await choice.selectOption("a");
  const cell = page.locator(".player-page input.cell-letter").first();
  await cell.fill("A");
  await choice.selectOption("b");
  await expect(page.locator(".player-page input.cell-letter").first()).toHaveValue("");
  await choice.selectOption("a");
  await expect(cell).toHaveValue("A");
  await page.reload();
  await expect(page.locator(".player-page input.cell-letter").first()).toHaveValue("A");
});

test("named unfinished drafts can be saved and reopened", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await page.getByLabel("Designets navn").fill("Min kladde");
  await page.getByLabel("Ledetråd til valgt ord").fill("En ufærdig ledetråd");
  await page.getByRole("button", { name: "Gem kladde" }).click();
  await expect(page.getByText("Kladden er gemt i denne browser.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await page.getByLabel("Åbn gemt kladde").selectOption({ label: "Min kladde" });
  await expect(page.getByLabel("Ledetråd til valgt ord")).toHaveValue("En ufærdig ledetråd");
});
