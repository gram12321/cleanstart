import { expect, test } from "@playwright/test";
import { generatePuzzle } from "../../src/crossword/generator";
import { dictionary } from "../../src/crossword/dictionary";
import { createTemplateLayout } from "../../src/crossword/templateLayouts";
import { fillLayout } from "../../src/crossword/fillLayout";
import { wordCells } from "../../src/crossword/layout";

test("a completed designer grid can be published to the player", async ({ page }) => {
  const layout = createTemplateLayout(9)!;
  const solution = fillLayout(layout, dictionary);
  expect(solution.status).toBe("solved");
  if (solution.status !== "solved") return;
  const letters = new Map<string, string>();
  for (const word of layout.words) wordCells(word).forEach((cell, i) => letters.set(`${cell.row},${cell.col}`, solution.answers[word.id].word[i]));
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  for (const [key, letter] of letters) {
    const [row, col] = key.split(",").map(Number);
    await page.getByLabel(`Række ${row + 1}, kolonne ${col + 1}`, { exact: true }).fill(letter);
  }
  await page.getByLabel("Ledetråd til valgt ord").fill("Min egen ledetråd");
  await page.getByRole("button", { name: "Udgiv krydsord" }).click();
  await expect(page.getByText("Krydsordet er udgivet på forsiden i denne browser.")).toBeVisible();
  await page.getByRole("button", { name: "Løs krydsord" }).click();
  await expect(page.getByRole("button", { name: /Min egen ledetråd/ })).toBeVisible();
});

test("a published puzzle opens on the player page and can be checked", async ({ page }) => {
  const puzzle = generatePuzzle(9, dictionary);
  await page.addInitScript(published => localStorage.setItem("ordvaerk-published-v1", JSON.stringify(published)), puzzle);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Åbn designerens krydsord" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Dit krydsord/ })).toBeVisible();
  await page.getByRole("button", { name: "Tjek svar" }).click();
  await expect(page.getByRole("status").filter({ hasText: /rigtigt indtil videre/ })).toBeVisible();
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await expect(page.getByRole("heading", { name: "Mulige ord" })).toBeVisible();
  await page.getByRole("button", { name: "Løs krydsord" }).click();
  await expect(page.getByRole("button", { name: "Åbn designerens krydsord" })).toBeVisible();
});
