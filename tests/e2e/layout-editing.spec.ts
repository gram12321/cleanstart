import { expect, test } from "@playwright/test";
import { editLayout } from "../../src/crossword/editLayout";
import { fillLayout } from "../../src/crossword/fillLayout";
import { puzzleFromLayout, placementCells } from "../../src/crossword/generator";
import { cluePresentation, layoutIssues, validateLayout, wordCells, type GridLayout } from "../../src/crossword/layout";
import type { DictionaryEntry } from "../../src/crossword/dictionary";
import { createTemplateLayout } from "../../src/crossword/templateLayouts";

const blank = (size: number): GridLayout => ({
  width: size, height: size, clues: [], images: [], words: [],
  blocks: Array.from({ length: size * size }, (_, i) => ({ row: Math.floor(i / size), col: i % size })),
});

test("rebuilding an unchanged template preserves its slots", () => {
  for (const size of [9, 11, 13]) {
    const original = createTemplateLayout(size)!;
    const point = wordCells(original.words[0])[0];
    const rebuilt = editLayout(original, point, "letter")!;
    expect(validateLayout(rebuilt)).toEqual([]);
    const slots = (layout: GridLayout) => layout.words.map(word => JSON.stringify([word.direction, wordCells(word)])).sort();
    expect(slots(rebuilt)).toEqual(slots(original));
  }
});

test("editing derives a shared clue, rectangular areas, and moves or blocks cells", () => {
  let shared = blank(4);
  for (const [row, col] of [[0, 1], [0, 2], [1, 0], [2, 0]]) shared = editLayout(shared, { row, col }, "letter")!;
  shared = editLayout(shared, { row: 0, col: 0 }, "clue")!;
  expect(shared.words.filter(word => word.clueId === "clue-0-0").map(word => word.direction)).toEqual(["across", "down"]);
  let grid = blank(4);
  for (const [row, col] of [[1, 1], [1, 2], [2, 1]]) grid = editLayout(grid, { row, col }, "letter")!;
  grid = editLayout(grid, { row: 1, col: 0 }, "clue")!;
  grid = editLayout(grid, { row: 0, col: 1 }, "clue")!;
  expect(grid.words).toHaveLength(2);
  expect(validateLayout(grid)).toEqual([]);
  grid = editLayout(grid, { row: 0, col: 0 }, "wide")!;
  expect(grid.clues.find(clue => clue.width === 2)).toBeDefined();
  expect(validateLayout(grid)).toEqual([]);
  grid = editLayout(grid, { row: 0, col: 0 }, "tall")!;
  expect(grid.clues.find(clue => clue.height === 2)).toBeDefined();
  expect(grid.words.filter(word => word.clueId === "clue-0-0")).toHaveLength(1);
  grid = editLayout(grid, { row: 0, col: 1 }, "letter")!;
  expect(validateLayout(grid).length).toBeGreaterThan(0);
  grid = editLayout(grid, { row: 0, col: 1 }, "block")!;
  expect(grid.blocks).toContainEqual({ row: 0, col: 1 });
  expect(editLayout(grid, { row: 3, col: 3 }, "wide")).toBeNull();
});

test("blocking an isolated letter preserves independently clued crossing rows", () => {
  const grid: GridLayout = {
    width: 4, height: 4, images: [],
    clues: [{ id: "top", row: 0, col: 1, width: 1, height: 1 }, ...[1, 2, 3].map(row => ({ id: `row-${row}`, row, col: 0, width: 1, height: 1 }))],
    blocks: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
    words: [
      ...[1, 2, 3].map(row => ({ id: `across-${row}`, clueId: `row-${row}`, start: { row, col: 1 }, direction: "across" as const, length: 3 })),
      { id: "down", clueId: "top", start: { row: 1, col: 1 }, direction: "down", length: 3 },
    ],
  };
  const edited = editLayout(grid, { row: 2, col: 1 }, "block")!;
  expect(edited.words.find(word => word.id === "down")?.length).toBe(1);
  expect(edited.words.filter(word => word.direction === "across").map(word => word.start.row)).toContain(3);
  expect(layoutIssues(edited).some(issue => issue.message.startsWith("Missing clue for down-3-"))).toBe(false);
});

test("blocking a cell repairs adjacent unused clues through a cascade", () => {
  const grid: GridLayout = {
    width: 4, height: 3, images: [],
    clues: [
      { id: "top-left", row: 0, col: 1, width: 1, height: 1 },
      { id: "top-right", row: 0, col: 2, width: 1, height: 1 },
      { id: "left", row: 1, col: 1, width: 1, height: 1 },
      { id: "unrelated", row: 2, col: 3, width: 1, height: 1 },
    ],
    blocks: [{ row: 0, col: 0 }, { row: 0, col: 3 }, { row: 1, col: 0 }, { row: 1, col: 3 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
    words: [
      { id: "across", clueId: "left", direction: "across", start: { row: 1, col: 2 }, length: 1 },
      { id: "down", clueId: "top-right", direction: "down", start: { row: 1, col: 2 }, length: 1 },
    ],
  };
  const edited = editLayout(grid, { row: 1, col: 2 }, "block")!;
  for (const cell of [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 2 }]) expect(edited.blocks).toContainEqual(cell);
  expect(edited.clues.map(clue => clue.id)).toEqual(["unrelated"]);
});

test("blocking a word retains a clued single-letter answer", () => {
  const grid: GridLayout = { width: 3, height: 1, clues: [{ id: "clue", row: 0, col: 0, width: 1, height: 1 }], images: [], words: [{ id: "word", clueId: "clue", start: { row: 0, col: 1 }, direction: "across", length: 2 }] };
  const edited = editLayout(grid, { row: 0, col: 2 }, "block")!;
  expect(edited.words).toEqual([expect.objectContaining({ clueId: "clue", length: 1, direction: "across" })]);
  expect(validateLayout(edited)).toEqual([]);
  const answer: DictionaryEntry = { word: "A", clue: "Bogstav", length: 1, source: "custom" };
  expect(fillLayout(edited, [answer]).status).toBe("solved");
  expect(puzzleFromLayout(edited, { word: answer }).placements[0].word).toBe("A");
});

test("designer builds and publishes a multi-word answer", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await page.getByRole("button", { name: "Sort felt", exact: true }).click();
  for (let row = 1; row <= 9; row++) {
    if (row === 2) continue;
    for (let col = 1; col <= 9; col++) await page.getByRole("button", { name: `Rediger række ${row}, kolonne ${col}` }).click();
  }
  await page.getByRole("button", { name: "Ledetrådsfelt 1 × 1" }).click();
  await page.getByRole("button", { name: "Rediger række 2, kolonne 1" }).click();
  await page.getByRole("button", { name: "Gør til bogstavfelt" }).click();
  for (const col of [2, 3, 4, 6, 7, 8, 9]) await page.getByRole("button", { name: `Rediger række 2, kolonne ${col}` }).click();
  await page.getByRole("button", { name: "Ordmellemrum →" }).click();
  await page.getByRole("button", { name: "Rediger række 2, kolonne 5" }).click();
  await page.getByRole("button", { name: "Bogstavfelt / vælg ord" }).click();
  await page.getByText("Udvid ordbogen", { exact: false }).click();
  await page.getByLabel("Ord og ledetråde").fill("NEW YORK;Amerikansk by");
  await page.getByRole("button", { name: "Gem ord" }).click();
  await expect(page.getByText("1 ord er gemt.")).toBeVisible();
  for (const [i, letter] of [..."NEWYORK"].entries()) {
    const col = [2, 3, 4, 6, 7, 8, 9][i];
    await page.locator(".editor-board").getByLabel(`Række 2, kolonne ${col}`, { exact: true }).fill(letter);
  }
  await page.getByRole("button", { name: "Udgiv krydsord" }).click();
  await expect(page.getByText("Krydsordet er udgivet på forsiden i denne browser.")).toBeVisible();
  await page.getByRole("button", { name: "Løs krydsord" }).click();
  await expect(page.getByRole("button", { name: /Amerikansk by, vandret, 7 bogstaver/ })).toBeVisible();
  await expect(page.locator(".player-page").getByLabel("Ordmellemrum, pil til højre")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Amerikansk by, vandret, 7 bogstaver/ })).toBeVisible();
});

test("an arrow separates a phrase while solver and player skip its cell", () => {
  let grid = blank(7);
  grid = editLayout(grid, { row: 1, col: 0 }, "clue")!;
  for (const col of [1, 2, 4, 5]) grid = editLayout(grid, { row: 1, col }, "letter")!;
  grid = editLayout(grid, { row: 1, col: 3 }, "arrow-across")!;
  expect(validateLayout(grid)).toEqual([]);
  expect(grid.words).toHaveLength(1);
  expect(grid.words[0].breaks).toEqual([2]);
  expect(wordCells(grid.words[0])).toEqual([{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 4 }, { row: 1, col: 5 }]);
  const phrase: DictionaryEntry = { word: "AB CD", clue: "Et udtryk", length: 4, source: "custom" };
  const joined = { ...phrase, word: "ABCD" };
  expect(fillLayout(grid, [joined]).status).toBe("unsatisfiable");
  const solved = fillLayout(grid, [phrase]);
  expect(solved.status).toBe("solved");
  if (solved.status !== "solved") return;
  const puzzle = puzzleFromLayout(grid, solved.answers);
  expect(puzzle.cells[1][3]).toEqual({ kind: "arrow", direction: "across" });
  expect(placementCells(puzzle.placements[0])).toEqual([[1, 1], [1, 2], [1, 4], [1, 5]]);
  expect(puzzle.cells[1][4]).toMatchObject({ kind: "letter", solution: "C" });
  const wrongArrow = { ...grid, arrows: [{ row: 1, col: 3, direction: "down" as const }] };
  expect(validateLayout(wrongArrow).length).toBeGreaterThan(0);
  let vertical = blank(7);
  vertical = editLayout(vertical, { row: 0, col: 1 }, "clue")!;
  for (const row of [1, 2, 4, 5]) vertical = editLayout(vertical, { row, col: 1 }, "letter")!;
  vertical = editLayout(vertical, { row: 3, col: 1 }, "arrow-down")!;
  expect(validateLayout(vertical)).toEqual([]);
  expect(fillLayout(vertical, [phrase]).status).toBe("solved");
  expect(wordCells(vertical.words[0])).toEqual([{ row: 1, col: 1 }, { row: 2, col: 1 }, { row: 4, col: 1 }, { row: 5, col: 1 }]);
});

test("designer tools edit cells and report incomplete layouts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Designerværksted" }).click();
  await expect(page.getByRole("button", { name: "Bogstavfelt / vælg ord" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ledetrådsfelt 2 × 1" }).click();
  await page.getByRole("button", { name: "Rediger række 1, kolonne 1" }).click();
  await expect(page.getByText(/Feltet er ændret/)).toBeVisible();
  await page.getByRole("button", { name: "Ordmellemrum ↓" }).click();
  await page.getByRole("button", { name: "Rediger række 2, kolonne 2" }).click();
  await expect(page.getByText(/Feltet er ikke klar/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Rediger række 2, kolonne 2" })).toHaveClass(/layout-problem/);
  await expect(page.getByRole("button", { name: "Rediger række 2, kolonne 2" })).toHaveAttribute("aria-invalid", "true");
  await page.getByText("Se problemer i feltet").click();
  await expect(page.locator(".layout-errors li").first()).toBeVisible();
  await page.getByRole("button", { name: "Udgiv krydsord" }).click();
  await expect(page.getByText("Ret feltets opbygning før udgivelse.")).toBeVisible();
  await page.getByRole("button", { name: "Bogstavfelt / vælg ord" }).click();
  await expect(page.getByLabel("Ordmellemrum, pil ned")).toBeVisible();
  await expect(page.locator(".editor-board").getByLabel("Ordmellemrum, pil ned")).toHaveClass(/layout-problem/);
  await page.getByRole("button", { name: "Nyt tomt felt" }).click();
  await expect(page.locator(".editor-board .layout-problem")).toHaveCount(0);
});

test("shared clue arrows are placed toward their answers rather than each other", () => {
  const across = { direction: "across" as const, row: 1, col: 2 };
  const down = { direction: "down" as const, row: 2, col: 1 };
  const square = cluePresentation({ row: 1, col: 1, width: 1, height: 1 }, [across, down]);
  expect(square.horizontal).toBe(true);
  expect(square.words).toEqual([down, across]);
  const wide = cluePresentation({ row: 1, col: 0, width: 2, height: 1 }, [across, down]);
  expect(wide.horizontal).toBe(false);
  expect(wide.words).toEqual([across, down]);
  let grid = blank(5);
  grid = editLayout(grid, { row: 1, col: 0 }, "wide")!;
  for (const [row, col] of [[1, 2], [1, 3], [2, 1], [3, 1]]) grid = editLayout(grid, { row, col }, "letter")!;
  expect(grid.words.filter(word => word.clueId === "clue-1-0")).toHaveLength(2);
  expect(grid.words.find(word => word.direction === "across")?.start).toEqual({ row: 1, col: 2 });
  expect(grid.words.find(word => word.direction === "down")?.start).toEqual({ row: 2, col: 1 });
  let inserted = blank(5);
  for (const [row, col] of [[1, 1], [1, 2], [1, 3], [2, 1], [3, 1]]) inserted = editLayout(inserted, { row, col }, "letter")!;
  inserted = editLayout(inserted, { row: 1, col: 0 }, "clue")!;
  inserted = editLayout(inserted, { row: 0, col: 1 }, "clue")!;
  inserted = editLayout(inserted, { row: 1, col: 1 }, "clue")!;
  const shared = inserted.words.filter(word => word.clueId === "clue-1-1");
  expect(shared.map(word => word.direction)).toEqual(["across", "down"]);
  expect(inserted.words.filter(word => word.clueId === "clue-1-0")).toHaveLength(0);
  expect(layoutIssues(inserted).find(issue => issue.message.startsWith("Clue clue-1-0"))?.cells).toEqual([{ row: 1, col: 0 }]);
  const invalidBend: GridLayout = {
    width: 3, height: 3,
    clues: [{ row: 0, col: 0, width: 1, height: 1, id: "first" }, { row: 1, col: 0, width: 1, height: 1, id: "second" }],
    images: [], blocks: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
    words: [{ id: "bad-bend", clueId: "first", direction: "across", start: { row: 1, col: 1 }, length: 2 }],
  };
  expect(validateLayout(invalidBend)).toContain("Clue cannot point to bad-bend");
});

test("published shared clue arrows face outwards in square and wide clue areas", async ({ page }) => {
  let grid = blank(9);
  for (const [row, col] of [[1, 1], [1, 2], [2, 0], [3, 0], [5, 2], [5, 3], [6, 1], [7, 1]]) grid = editLayout(grid, { row, col }, "letter")!;
  grid = editLayout(grid, { row: 1, col: 0 }, "clue")!;
  grid = editLayout(grid, { row: 5, col: 0 }, "wide")!;
  const answers = Object.fromEntries(grid.words.map((word, i) => [word.id, { word: "AB", clue: `Ledetråd ${i}`, length: 2, source: "custom" as const }]));
  const puzzle = puzzleFromLayout(grid, answers);
  await page.addInitScript(saved => localStorage.setItem("ordvaerk-published-v1", JSON.stringify(saved)), puzzle);
  await page.goto("/");
  for (const [row, col, horizontal] of [[1, 0, true], [5, 0, false]] as const) {
    const clue = page.locator(".cell-clue").filter({ has: page.getByRole("button", { name: new RegExp(`vandret.*række ${row + 1}, kolonne ${col + (horizontal ? 2 : 3)}$`) }) });
    await expect(clue).toHaveClass(horizontal ? /clue-horizontal/ : /cell-clue/);
    const buttons = clue.locator("button");
    const arrows = await buttons.locator("b").allTextContents();
    expect(arrows).toEqual(horizontal ? ["↓", "→"] : ["→", "↓"]);
    const area = (await clue.boundingBox())!;
    const right = (await buttons.filter({ has: page.locator("b:text-is('→')") }).locator("b").boundingBox())!;
    const down = (await buttons.filter({ has: page.locator("b:text-is('↓')") }).locator("b").boundingBox())!;
    expect(area.x + area.width - (right.x + right.width)).toBeLessThan(5);
    expect(area.y + area.height - (down.y + down.height)).toBeLessThan(5);
    if (horizontal) expect(down.x + down.width).toBeLessThan(right.x);
  }
});

test("layout issues identify the affected cells, including disconnected words", () => {
  let grid = blank(5);
  for (const [row, col] of [[1, 1], [1, 2], [3, 1], [3, 2]]) grid = editLayout(grid, { row, col }, "letter")!;
  grid = editLayout(grid, { row: 1, col: 0 }, "clue")!;
  const missing = layoutIssues(grid).find(issue => issue.message.startsWith("Missing clue"))!;
  expect(missing.cells).toEqual([{ row: 3, col: 1 }, { row: 3, col: 2 }]);
  grid = editLayout(grid, { row: 3, col: 0 }, "clue")!;
  const disconnected = layoutIssues(grid).find(issue => issue.message === "Words are not connected by crossings")!;
  expect(disconnected.cells).toEqual([{ row: 3, col: 1 }, { row: 3, col: 2 }]);
  grid = editLayout(grid, { row: 3, col: 2 }, "block")!;
  expect(layoutIssues(grid).find(issue => issue.message === "Empty cell at 3,1")?.cells).toEqual([{ row: 3, col: 1 }]);
});

test("player loads a published phrase and moves across its arrow", async ({ page }) => {
  let grid = blank(9);
  grid = editLayout(grid, { row: 1, col: 0 }, "clue")!;
  for (const col of [1, 2, 4, 5]) grid = editLayout(grid, { row: 1, col }, "letter")!;
  grid = editLayout(grid, { row: 1, col: 3 }, "arrow-across")!;
  const entry: DictionaryEntry = { word: "AB CD", clue: "Et udtryk", length: 4, source: "custom" };
  const puzzle = puzzleFromLayout(grid, { [grid.words[0].id]: entry });
  await page.addInitScript(saved => localStorage.setItem("ordvaerk-published-v1", JSON.stringify(saved)), puzzle);
  await page.goto("/");
  await expect(page.getByLabel("Ordmellemrum, pil til højre")).toBeVisible();
  await page.locator(".player-page").getByLabel("Række 2, kolonne 2", { exact: true }).click();
  await page.keyboard.type("ABCD");
  await expect(page.locator(".player-page").getByLabel("Række 2, kolonne 5", { exact: true })).toHaveValue("C");
  await page.getByRole("button", { name: "Tjek svar" }).click();
  await expect(page.getByText("Flot klaret! Du har løst krydsordet.")).toBeVisible();
});
