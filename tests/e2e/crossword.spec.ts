import { expect, test } from "@playwright/test";
import { dictionary } from "../../src/crossword/dictionary";
import { generatePuzzle, placementCells } from "../../src/crossword/generator";

test("DanNet supplies playable clues and shared meanings across word lengths", () => {
  const imported = dictionary.filter((entry) => entry.source === "dannet");
  expect(new Set(imported.map((entry) => entry.word)).size).toBeGreaterThan(10000);
  expect(imported.some((entry) => entry.word === "AABENRAA" && entry.clue === "Dansk by")).toBe(true);
  expect(imported.every((entry) => entry.clue.length <= 18 && entry.clue.trim().split(/\s+/).length <= 2)).toBe(true);
  expect(imported.filter((entry) => !entry.clue.includes(" ")).length / imported.length).toBeGreaterThan(0.9);
  const groups = new Map<string, Set<number>>();
  for (const entry of imported) {
    if (!entry.clueGroupId) continue;
    const lengths = groups.get(entry.clueGroupId) ?? new Set<number>();
    lengths.add(entry.length);
    groups.set(entry.clueGroupId, lengths);
  }
  expect([...groups.values()].some((lengths) => lengths.size > 1)).toBe(true);
  expect(generatePuzzle(11, dictionary).placements.some((entry) => entry.source === "dannet")).toBe(true);
});

test("generated words have clues, valid crossings and no accidental neighbours", () => {
  for (const size of [9, 11, 13]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const puzzle = generatePuzzle(size, dictionary);
      expect(puzzle.placements.length).toBeGreaterThan(5);
      expect(new Set(puzzle.placements.map((placement) => placement.word)).size).toBe(puzzle.placements.length);
      for (const placement of puzzle.placements) {
        const clue = puzzle.cells[placement.clueRow][placement.clueCol];
        expect(clue?.kind).toBe("clue");
        expect(clue?.placementIds).toContain(placement.id);
        placementCells(placement).forEach(([r, c], i) => {
          const cell = puzzle.cells[r][c];
          expect(cell?.kind).toBe("letter");
          if (cell?.kind === "letter") {
            expect(cell.solution).toBe(placement.word[i]);
            expect(cell.placementIds).toContain(placement.id);
          }
        });
        if (placement.id > 0) {
          expect(placementCells(placement).some(([r, c]) => (puzzle.cells[r][c]?.placementIds.length ?? 0) > 1)).toBe(true);
        }
      }
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        const cell = puzzle.cells[r][c];
        if (cell?.kind !== "letter") continue;
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const neighbour = puzzle.cells[r + dr]?.[c + dc];
          if (neighbour?.kind === "letter") {
            expect(cell.placementIds.some((id) => neighbour.placementIds.includes(id))).toBe(true);
          }
        }
      }
    }
  }
});

test("the seeded generator fills every cell of each supported grid", () => {
  const originalRandom = Math.random;
  let seed = 20261108;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  try {
    for (const size of [9, 11, 13]) {
      const puzzle = generatePuzzle(size, dictionary);
      expect(puzzle.cells.flat()).toHaveLength(size * size);
      expect(puzzle.cells.flat().every(Boolean)).toBe(true);
    }
  } finally {
    Math.random = originalRandom;
  }
});

test("repeated generation fills all sizes without empty cells", () => {
  const originalRandom = Math.random;
  let seed = 20261108;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  try {
    for (const size of [9, 11, 13]) for (let attempt = 0; attempt < 20; attempt++) {
      const puzzle = generatePuzzle(size, dictionary);
      expect(puzzle.cells.flat().every(Boolean)).toBe(true);
      expect(puzzle.cells.flat().filter(cell => cell.kind === "letter").length).toBeGreaterThan(size * 3);
      expect(puzzle.placements.some(word => word.arrow.length > 1)).toBe(true);
      expect(new Set(puzzle.placements.map(word => word.word)).size).toBe(puzzle.placements.length);
    }
  } finally { Math.random = originalRandom; }
  expect(() => generatePuzzle(9, [])).toThrow();
});

test("all sizes render without gaps and a bent clue selects its start", async ({ page }) => {
  await page.goto("/");
  for (const size of [9, 11, 13]) {
    await page.getByLabel("Størrelse på feltet").selectOption(String(size));
    await page.getByRole("button", { name: "Nyt krydsord" }).click();
    await expect(page.getByText(`${size} × ${size} FELTER`)).toBeVisible();
    await expect(page.locator(".cell-block")).toHaveCount(0);
    const area = await page.locator(".board > .cell").evaluateAll(cells => cells.reduce((total, cell) => {
      const style = getComputedStyle(cell);
      const span = (value: string) => Number(value.match(/span (\d+)/)?.[1] ?? 1);
      return total + span(style.gridRowEnd) * span(style.gridColumnEnd);
    }, 0));
    expect(area).toBe(size * size);
    const bent = page.locator(".cell-clue button").filter({ has: page.locator("b:text-is('↓→'), b:text-is('→↓')") }).first();
    const label = await bent.getAttribute("aria-label");
    const match = label?.match(/række (\d+), kolonne (\d+)/);
    expect(match).not.toBeNull();
    await bent.click();
    await expect(page.getByLabel(`Række ${match![1]}, kolonne ${match![2]}`, { exact: true })).toHaveClass(/selected/);
  }
});

test("play, check, reveal and create a new puzzle", async ({ page }) => {
  await page.goto("/");
  const cells = page.locator("input.cell-letter");
  await expect(cells.first()).toBeVisible();
  await cells.first().click();
  await page.keyboard.type("Z");
  await expect(cells.first()).toHaveValue("Z");
  await page.getByRole("button", { name: "Tjek svar" }).click();
  await expect(page.getByRole("status").first()).toContainText("markeret");
  await page.getByRole("button", { name: "Vis et bogstav" }).click();
  await expect(page.getByRole("status").first()).toContainText("afsløret");
  await page.getByRole("button", { name: "Start forfra" }).click();
  await expect(cells.first()).toHaveValue("");
  await page.getByLabel("Størrelse på feltet").selectOption("9");
  await page.getByRole("button", { name: "Nyt krydsord" }).click();
  await expect(page.getByText("9 × 9 FELTER")).toBeVisible();
  await expect(page.locator(".board .cell-block")).toHaveCount(0);
  const filledArea = await page.locator(".board > .cell").evaluateAll(cells => cells.reduce((sum, cell) => {
    const style = getComputedStyle(cell);
    const span = (value: string) => Number(value.match(/span (\d+)/)?.[1] ?? 1);
    return sum + span(style.gridColumnEnd) * span(style.gridRowEnd);
  }, 0));
  expect(filledArea).toBe(81);
});

test("custom words persist and narrow screens remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByText("Udvid ordbogen").click();
  await page.getByLabel("Ét ord og én ledetråd pr. linje, adskilt af semikolon").fill("KAFFE;Varm drik");
  await page.getByRole("button", { name: "Gem ord" }).click();
  await expect(page.getByText("1 eget ord")).toBeVisible();
  await page.reload();
  await page.getByText("Udvid ordbogen").click();
  await expect(page.getByText("1 eget ord")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const cell = page.locator("input.cell-letter").first();
  await cell.fill("Æ");
  await expect(cell).toHaveValue("Æ");
});
