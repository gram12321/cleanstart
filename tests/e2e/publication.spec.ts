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
  const selectedWord = solution.answers[layout.words[0].id].word;
  await page.locator(".dictionary-editor summary").click();
  await page.getByLabel("Ord og ledetråde").fill(`${selectedWord};Min egen ledetråd`);
  await page.getByRole("button", { name: "Gem ord" }).click();
  const chosenClue = page.locator(".suggestion-list button").filter({ hasText: "Min egen ledetråd" });
  await expect(chosenClue).toBeVisible({ timeout: 60000 });
  await chosenClue.click();
  await page.getByRole("button", { name: "Udgiv krydsord" }).click();
  await expect(page.getByText("Krydsordet er udgivet på forsiden i denne browser.")).toBeVisible();
  await page.getByRole("button", { name: "Løs krydsord" }).click();
  await expect(page.getByRole("button", { name: /Min egen ledetråd/ })).toBeVisible();
});

test("a published puzzle opens on the player page and can be checked", async ({ page }) => {
  const puzzle = generatePuzzle(9, dictionary);
  await page.addInitScript(published => localStorage.setItem("ordvaerk-library-v1", JSON.stringify([{ id: "test-puzzle", name: "Test", puzzle: published }])), puzzle);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Åbn designerens krydsord" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Dit krydsord/ })).toBeVisible();
  await page.getByRole("button", { name: "Tjek svar" }).click();
  await expect(page.getByRole("status").filter({ hasText: /rigtigt indtil videre/ })).toBeVisible();
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await expect(page.locator(".suggestion-panel")).toBeVisible();
  await page.getByRole("button", { name: "Løs krydsord" }).click();
  await expect(page.getByRole("button", { name: "Åbn designerens krydsord" })).toBeVisible();
});


test("preview shows an unfinished draft without changing the published puzzle", async ({ page }) => {
  const published = generatePuzzle(9, dictionary);
  await page.addInitScript(puzzle => localStorage.setItem("ordvaerk-library-v1", JSON.stringify([{ id: "test-puzzle", name: "Test", puzzle: puzzle }])), published);
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await page.getByLabel("Ledetråd til valgt ord").fill("Foreløbig ledetråd");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Forhåndsvisning af kladde")).toBeVisible();
  await expect(page.getByRole("button", { name: /Foreløbig ledetråd/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tjek svar" })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ordvaerk-library-v1")!)[0].puzzle)).toEqual(published);
  await page.getByRole("button", { name: "Tilbage til designeren" }).click();
  await expect(page.getByLabel("Ledetråd til valgt ord")).toHaveValue("Foreløbig ledetråd");
});


test("preview uses the available desktop width for the whole grid", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Designerv\u00e6rksted" }).click();
  await page.getByRole("button", { name: "Preview" }).click();
  const board = page.locator(".player-page .board-wrap");
  await expect(board).toBeVisible();
  const dimensions = await board.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(dimensions.scroll).toBe(dimensions.client);
  expect(dimensions.client).toBeLessThanOrEqual(700);
});
