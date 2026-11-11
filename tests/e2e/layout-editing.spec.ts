import { expect, test } from "@playwright/test";
import { editLayout, resizeImageArea } from "../../src/crossword/editLayout";
import { fillLayout } from "../../src/crossword/fillLayout";
import { puzzleFromLayout, placementCells } from "../../src/crossword/generator";
import { cluePresentation, imageCueTargets, layoutIssues, validateLayout, wordCells, type GridLayout } from "../../src/crossword/layout";
import { dictionary, type DictionaryEntry } from "../../src/crossword/dictionary";
import { shortClues } from "../../src/crossword/data/shortClues";
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

test("an image area repairs adjacent unused clues while preserving the image", () => {
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
  const edited = editLayout(grid, { row: 1, col: 2 }, "image-area", { width: 2, height: 1 })!;
  expect(edited.images).toContainEqual(expect.objectContaining({ row: 1, col: 2, width: 2, height: 1 }));
  for (const cell of [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }]) expect(edited.blocks).toContainEqual(cell);
  expect(edited.clues).toEqual([]);
});

test("an image cue creates a selectable answer arrow on the image", () => {
  let grid = blank(3);
  grid = editLayout(grid, { row: 0, col: 1 }, "letter")!;
  grid = editLayout(grid, { row: 0, col: 2 }, "letter")!;
  grid = editLayout(grid, { row: 0, col: 0 }, "image-area")!;
  expect(grid.words).toHaveLength(1);
  expect(grid.words[0].clueId).not.toBe("image-0-0");
  expect(validateLayout(grid)).toContain(`Missing clue for ${grid.words[0].id}`);
  grid.words[0] = { ...grid.words[0], clueId: "image-0-0", textClueId: "image-0-0" };
  expect(validateLayout(grid)).toEqual([]);

  const answer: DictionaryEntry = { word: "AB", clue: "En test", length: 2, source: "custom" };
  const puzzle = puzzleFromLayout(grid, { [grid.words[0].id]: answer });
  const image = puzzle.cells[0][0];
  expect(image).toMatchObject({ kind: "image", placementIds: [0] });
  expect(puzzle.placements[0]).toMatchObject({ cueKind: "image", imageMarker: { arrow: "â†’" } });
});

test("image targets use the adjacent run instead of a word beyond another clue", () => {
  const image = { id: "image", row: 0, col: 1, width: 1, height: 1 };
  const grid: GridLayout = {
    width: 3, height: 6, images: [image], blocks: [], arrows: [],
    clues: [{ id: "lower", row: 3, col: 1, width: 1, height: 1 }],
    words: [
      { id: "lower-word", clueId: "lower", direction: "down", start: { row: 4, col: 1 }, length: 2 },
      ...[1, 2].map(row => ({ id: `across-${row}`, clueId: `missing-${row}`, direction: "across" as const, start: { row, col: 0 }, length: 3 })),
    ],
  };
  const target = imageCueTargets(image, grid).find(item => item.word.direction === "down")!;
  expect(target.word).toMatchObject({ start: { row: 1, col: 1 }, length: 2 });
  expect(target.word.id).not.toBe("lower-word");
});

test("resizing an image preserves its content and releases cells without splitting it", () => {
  let grid = blank(5);
  grid = editLayout(grid, { row: 0, col: 0 }, "image-area", { width: 2, height: 2 })!;
  grid.images[0] = { ...grid.images[0], illustration: "preset:house", fit: "contain", offsetX: 25 };
  grid = resizeImageArea(grid, grid.images[0].id, 3, 2)!;
  expect(grid.images).toEqual([expect.objectContaining({ width: 3, height: 2, illustration: "preset:house", fit: "contain", offsetX: 25 })]);
  grid = resizeImageArea(grid, grid.images[0].id, 1, 1)!;
  expect(grid.images).toHaveLength(1);
  expect(grid.blocks).toContainEqual({ row: 1, col: 2 });
  expect(resizeImageArea(grid, grid.images[0].id, 6, 1)).toBeNull();
});

test("image controls select an existing box, resize it and fit the image", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Designerv/ }).click();
  await page.getByRole("button", { name: /Billedomr/ }).click();
  await page.getByRole("button", { name: "Rediger række 2, kolonne 1" }).click();
  await page.getByRole("button", { name: /Billedomr/ }).click();
  await page.getByRole("button", { name: "Rediger række 2, kolonne 1" }).click();
  await expect(page.getByRole("group", { name: "Indstillinger for valgt billede" })).toBeVisible();
  await page.getByRole("button", { name: "Forøg billedområdets bredde" }).click();
  await expect(page.getByText("Bredde: 2", { exact: true })).toBeVisible();
  await page.getByLabel("Billedtilpasning").selectOption("contain");
  await page.getByRole("button", { name: "Bogstavfelt / vælg ord" }).click();
  const image = page.locator(".editor-image img[src$='landscape.svg']");
  await expect(image).toHaveCSS("object-fit", "contain");
  await expect(image.locator("..")).toHaveCSS("grid-column-end", "span 2");
  const box = (await image.boundingBox())!;
  await page.mouse.move(box.x + 32, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 20);
  await page.mouse.up();
  await expect(image).not.toHaveCSS("object-position", "50% 50%");
});

test("designer links a word to an image cue and player selects its arrow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Designerv/ }).click();
  await page.getByRole("button", { name: /Billedomr/ }).click();
  await page.getByRole("button", { name: "Rediger række 2, kolonne 1" }).click();
  const target = page.locator(".editor-image .image-cue-target").first();
  await expect(target).toBeVisible();
  const darkCells = await page.locator(".editor-board .editor-dark").count();
  const clueCells = await page.locator(".editor-board .editor-clue").count();
  await target.click();
  await expect(page.locator(".editor-image .image-cue-target.active")).toHaveCount(1);
  await expect(page.locator(".editor-board .editor-dark")).toHaveCount(darkCells);
  await expect(page.locator(".editor-board .editor-clue")).toHaveCount(clueCells);
  await target.click();
  await expect(page.locator(".editor-image .image-cue-target.active")).toHaveCount(0);
  await expect(page.locator(".editor-board .editor-dark")).toHaveCount(darkCells);
  await target.click();
  await page.getByRole("button", { name: "Preview" }).click();
  const arrow = page.locator(".player-page .image-cue-button");
  await expect(arrow).toHaveCount(1);
  const imageBox = await page.locator(".player-page .cell-image").filter({ has: page.locator(".image-cue-button") }).boundingBox();
  const arrowBox = await arrow.boundingBox();
  expect(imageBox).not.toBeNull();
  expect(arrowBox).not.toBeNull();
  expect(arrowBox!.x).toBeGreaterThanOrEqual(imageBox!.x);
  expect(arrowBox!.y).toBeGreaterThanOrEqual(imageBox!.y);
  expect(arrowBox!.x + arrowBox!.width).toBeLessThanOrEqual(imageBox!.x + imageBox!.width + 1);
  expect(arrowBox!.y + arrowBox!.height).toBeLessThanOrEqual(imageBox!.y + imageBox!.height + 1);
  if ((await arrow.textContent()) === "→") expect(imageBox!.x + imageBox!.width - (arrowBox!.x + arrowBox!.width)).toBeLessThan(2);
  else expect(imageBox!.y + imageBox!.height - (arrowBox!.y + arrowBox!.height)).toBeLessThan(2);
  await arrow.click();
  await expect(page.locator(".active-clue")).toContainText("BILLEDLEDTR");
});

test("blocking a word retains a clued single-letter answer", () => {
  const grid: GridLayout = { width: 3, height: 1, clues: [{ id: "clue", row: 0, col: 0, width: 1, height: 1 }], images: [], words: [{ id: "word", clueId: "clue", start: { row: 0, col: 1 }, direction: "across", length: 2 }] };
  const edited = editLayout(grid, { row: 0, col: 2 }, "block")!;
  expect(edited.words).toEqual([expect.objectContaining({ clueId: "clue", length: 1, direction: "across" })]);
  expect(validateLayout(edited)).toEqual([]);
  const answer: DictionaryEntry = { word: "A", clue: "Bogstav", length: 1, source: "custom" };
  expect(fillLayout(edited, [answer]).status).toBe("solved");
  const builtIn = fillLayout(edited, dictionary, 10000, { "0,1": "Ã…" });
  expect(builtIn.status).toBe("solved");
  if (builtIn.status === "solved") expect(builtIn.answers.word.clue).toBe("VandlÃ¸b");
  expect(puzzleFromLayout(edited, { word: answer }).placements[0].word).toBe("A");
});

test("curated short answers survive dictionary filtering", () => {
  const short = dictionary.filter(entry => entry.source === "starter" && entry.length <= 2);
  for (const word of ["A", "B", "F", "Ã…", "Ã†", "BA", "DD", "XL", "KB", "MB", "TB", "UK", "PO", "CA", "NH", "RI", "WY"]) {
    expect(short.some(entry => entry.word === word), word).toBe(true);
  }
});

test("curated clues support multiple meanings and shared clues", () => {
  const rows = shortClues.split("\n");
  const pairs = rows.flatMap(row => { const [word, ...clues] = row.split("|"); return clues.map(clue => `${word}|${clue}`); });
  expect(new Set(pairs).size).toBe(pairs.length);
  for (const row of rows) {
    const [word, ...clues] = row.split("|");
    expect(word).toMatch(/^[A-ZÃ†Ã˜Ã…]+$/);
    expect(clues.length).toBeGreaterThan(0);
    for (const clue of clues) expect(clue.length).toBeLessThanOrEqual(24);
  }
  const has = (word: string, clue: string) => dictionary.some(entry => entry.source === "starter" && entry.word === word && entry.clue === clue);
  expect(rows.find(row => row.startsWith("Ã…|"))).toBe("Ã…|Lille vandlÃ¸b|Alternativet");
  expect(has("S", "Syd fork.")).toBe(true);
  expect(has("S", "TÃ¸jstÃ¸rrelse")).toBe(true);
  expect(has("AND", "Vandfugl")).toBe(true);
  expect(has("SVANE", "Vandfugl")).toBe(true);
  expect(has("ANDRIK", "Vandfugl")).toBe(true);
  for (const [word, clue] of [["AT", "Ã˜strig landekode"], ["KG", "Kilogram symbol"], ["AI", "Kunstig intelligens"], ["BA", "Bachelor fork."]]) {
    expect(has(word, clue)).toBe(true);
  }
});

test("designer builds and publishes a multi-word answer", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: "DesignervÃ¦rksted" }).click();
  await page.getByRole("button", { name: "Sort felt", exact: true }).click();
  for (let row = 1; row <= 9; row++) {
    if (row === 2) continue;
    for (let col = 1; col <= 9; col++) await page.getByRole("button", { name: `Rediger rÃ¦kke ${row}, kolonne ${col}` }).click();
  }
  await page.getByRole("button", { name: "LedetrÃ¥dsfelt 1 Ã— 1" }).click();
  await page.getByRole("button", { name: "Rediger rÃ¦kke 2, kolonne 1" }).click();
  await page.getByRole("button", { name: "GÃ¸r til bogstavfelt" }).click();
  for (const col of [2, 3, 4, 6, 7, 8, 9]) await page.getByRole("button", { name: `Rediger rÃ¦kke 2, kolonne ${col}` }).click();
  await page.getByRole("button", { name: "Ordmellemrum â†’" }).click();
  await page.getByRole("button", { name: "Rediger rÃ¦kke 2, kolonne 5" }).click();
  await page.getByRole("button", { name: "Bogstavfelt / vÃ¦lg ord" }).click();
  await page.getByText("Udvid ordbogen", { exact: false }).click();
  await page.getByLabel("Ord og ledetrÃ¥de").fill("NEW YORK;Amerikansk by");
  await page.getByRole("button", { name: "Gem ord" }).click();
  await expect(page.getByText("1 ord er gemt.")).toBeVisible();
  for (const [i, letter] of [..."NEWYORK"].entries()) {
    const col = [2, 3, 4, 6, 7, 8, 9][i];
    await page.locator(".editor-board").getByLabel(`RÃ¦kke 2, kolonne ${col}`, { exact: true }).fill(letter);
  }
  await page.getByRole("button", { name: "Udgiv krydsord" }).click();
  await expect(page.getByText("Krydsordet er udgivet pÃ¥ forsiden i denne browser.")).toBeVisible();
  await page.getByRole("button", { name: "LÃ¸s krydsord" }).click();
  await expect(page.getByRole("button", { name: /Amerikansk by, vandret, 7 bogstaver/ })).toBeVisible();
  await expect(page.locator(".player-page").getByLabel("Ordmellemrum, pil til hÃ¸jre")).toBeVisible();
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
  await page.getByRole("button", { name: "DesignervÃ¦rksted" }).click();
  await expect(page.getByRole("button", { name: "Bogstavfelt / vÃ¦lg ord" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "LedetrÃ¥dsfelt 2 Ã— 1" }).click();
  await page.getByRole("button", { name: "Rediger rÃ¦kke 1, kolonne 1" }).click();
  await expect(page.getByText(/Feltet er Ã¦ndret/)).toBeVisible();
  await page.getByRole("button", { name: "Ordmellemrum â†“" }).click();
  await page.getByRole("button", { name: "Rediger rÃ¦kke 2, kolonne 2" }).click();
  await expect(page.getByText(/Feltet er ikke klar/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Rediger rÃ¦kke 2, kolonne 2" })).toHaveClass(/layout-problem/);
  await expect(page.getByRole("button", { name: "Rediger rÃ¦kke 2, kolonne 2" })).toHaveAttribute("aria-invalid", "true");
  await page.getByText("Se problemer i feltet").click();
  await expect(page.locator(".layout-errors li").first()).toBeVisible();
  await page.getByRole("button", { name: "Udgiv krydsord" }).click();
  await expect(page.getByText("Ret feltets opbygning fÃ¸r udgivelse.")).toBeVisible();
  await page.getByRole("button", { name: "Bogstavfelt / vÃ¦lg ord" }).click();
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
  const answers = Object.fromEntries(grid.words.map((word, i) => [word.id, { word: "AB", clue: `LedetrÃ¥d ${i}`, length: 2, source: "custom" as const }]));
  const puzzle = puzzleFromLayout(grid, answers);
  await page.addInitScript(saved => localStorage.setItem("ordvaerk-published-v1", JSON.stringify(saved)), puzzle);
  await page.goto("/");
  for (const [row, col, horizontal] of [[1, 0, true], [5, 0, false]] as const) {
    const clue = page.locator(".cell-clue").filter({ has: page.getByRole("button", { name: new RegExp(`vandret.*rÃ¦kke ${row + 1}, kolonne ${col + (horizontal ? 2 : 3)}$`) }) });
    await expect(clue).toHaveClass(horizontal ? /clue-horizontal/ : /cell-clue/);
    const buttons = clue.locator("button");
    const arrows = await buttons.locator("b").allTextContents();
    expect(arrows).toEqual(horizontal ? ["â†“", "â†’"] : ["â†’", "â†“"]);
    const area = (await clue.boundingBox())!;
    const right = (await buttons.filter({ has: page.locator("b:text-is('â†’')") }).locator("b").boundingBox())!;
    const down = (await buttons.filter({ has: page.locator("b:text-is('â†“')") }).locator("b").boundingBox())!;
    expect(area.x + area.width - (right.x + right.width)).toBeLessThan(5);
    expect(area.y + area.height - (down.y + down.height)).toBeLessThan(5);
    if (horizontal) expect(down.x + down.width).toBeLessThan(right.x);
  }
});

test("independently clued words can be disconnected and still be solved", () => {
  let grid = blank(5);
  for (const [row, col] of [[1, 1], [1, 2], [3, 1], [3, 2]]) grid = editLayout(grid, { row, col }, "letter")!;
  grid = editLayout(grid, { row: 1, col: 0 }, "clue")!;
  const missing = layoutIssues(grid).find(issue => issue.message.startsWith("Missing clue"))!;
  expect(missing.cells).toEqual([{ row: 3, col: 1 }, { row: 3, col: 2 }]);
  grid = editLayout(grid, { row: 3, col: 0 }, "clue")!;
  grid = editLayout(grid, { row: 0, col: 3 }, "image-area", { width: 2, height: 2 })!;
  expect(layoutIssues(grid)).toEqual([]);
  expect(grid.words).toHaveLength(2);
  const entries: DictionaryEntry[] = ["AB", "CD"].map(word => ({ word, clue: word, length: 2, source: "custom" }));
  const result = fillLayout(grid, entries);
  expect(result.status).toBe("solved");
  if (result.status === "solved") expect(new Set(Object.values(result.answers).map(answer => answer.word)).size).toBe(2);
  grid = editLayout(grid, { row: 3, col: 2 }, "block")!;
  expect(layoutIssues(grid)).toEqual([]);
  expect(grid.words.some(word => word.start.row === 3 && word.length === 1)).toBe(true);
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
  await expect(page.getByLabel("Ordmellemrum, pil til hÃ¸jre")).toBeVisible();
  await page.locator(".player-page").getByLabel("RÃ¦kke 2, kolonne 2", { exact: true }).click();
  await page.keyboard.type("ABCD");
  await expect(page.locator(".player-page").getByLabel("RÃ¦kke 2, kolonne 5", { exact: true })).toHaveValue("C");
  await page.getByRole("button", { name: "Tjek svar" }).click();
  await expect(page.getByText("Flot klaret! Du har lÃ¸st krydsordet.")).toBeVisible();
});
