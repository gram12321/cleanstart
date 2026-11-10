import { expect, test } from "@playwright/test";
import { createTemplateLayout } from "../../src/crossword/templateLayouts";
import { wordCells } from "../../src/crossword/layout";

test("direction controls select the corresponding word in writing and autofill modes", async ({ page }) => {
  const layout = createTemplateLayout(9)!;
  const across = layout.words.find(word => word.direction === "across" && wordCells(word).some(cell =>
    layout.words.some(other => other.direction === "down" && wordCells(other).some(point => point.row === cell.row && point.col === cell.col))))!;
  const crossing = wordCells(across).find(cell => layout.words.some(other => other.direction === "down" && wordCells(other).some(point => point.row === cell.row && point.col === cell.col)))!;
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  const cell = page.getByRole("textbox", { name: `Række ${crossing.row + 1}, kolonne ${crossing.col + 1}` });
  const horizontal = page.getByRole("button", { name: "→ Vandret" });
  const vertical = page.getByRole("button", { name: "↓ Lodret" });
  await horizontal.click();
  await cell.click();
  await expect(page.locator(".selection-info")).toContainText("VANDRET");
  await vertical.click();
  await expect(vertical).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".selection-info")).toContainText("LODRET");
  await page.getByRole("button", { name: "Autofyld ord" }).click();
  await horizontal.click();
  await cell.click();
  await expect(page.locator(".selection-info")).toContainText("VANDRET");
});
