import type { DictionaryEntry } from "./dictionary";
import { fillLayout } from "./fillLayout";
import type { GridLayout } from "./layout";
import { createTemplateLayout } from "./templateLayouts";

export type Direction = "across" | "down";
export interface Placement extends DictionaryEntry {
  id: number;
  row: number;
  col: number;
  direction: Direction;
  clueRow: number;
  clueCol: number;
  arrow: string;
}
export interface LetterCell { kind: "letter"; solution: string; placementIds: number[] }
export interface ClueCell { kind: "clue"; placementIds: number[]; width: number; height: number }
export interface ImageCell { kind: "image"; width: number; height: number }
export interface CoveredCell { kind: "covered" }
export type Cell = LetterCell | ClueCell | ImageCell | CoveredCell;
export interface Puzzle { size: number; cells: Cell[][]; placements: Placement[] }

export function generatePuzzle(size: number, dictionary: DictionaryEntry[]): Puzzle {
  let layout: GridLayout | null = null;
  let answers: Record<string, DictionaryEntry> | null = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = createTemplateLayout(size);
    if (!candidate) break;
    const result = fillLayout(candidate, dictionary, 5000);
    if (result.status === "solved") { layout = candidate; answers = result.answers; break; }
  }
  if (!layout || !answers) throw new Error("Krydsordet kunne ikke udfyldes med de tilgængelige ord. Prøv igen.");
  const cells = Array.from({ length: size }, () => Array<Cell>(size));
  for (const clue of layout.clues) {
    for (let r = clue.row; r < clue.row + clue.height; r++) for (let c = clue.col; c < clue.col + clue.width; c++) cells[r][c] = { kind: "covered" };
    cells[clue.row][clue.col] = { kind: "clue", placementIds: [], width: clue.width, height: clue.height };
  }
  for (const image of layout.images) {
    for (let r = image.row; r < image.row + image.height; r++) for (let c = image.col; c < image.col + image.width; c++) cells[r][c] = { kind: "covered" };
    cells[image.row][image.col] = { kind: "image", width: image.width, height: image.height };
  }
  const placements: Placement[] = layout.words.map((word, id) => {
    const clue = layout!.clues.find(item => item.id === word.clueId)!;
    const straight = word.direction === "across"
      ? word.start.row >= clue.row && word.start.row < clue.row + clue.height && word.start.col === clue.col + clue.width
      : word.start.col >= clue.col && word.start.col < clue.col + clue.width && word.start.row === clue.row + clue.height;
    const placement: Placement = {
      ...answers[word.id], id, row: word.start.row, col: word.start.col, direction: word.direction,
      clueRow: clue.row, clueCol: clue.col,
      arrow: straight ? (word.direction === "across" ? "→" : "↓") : (word.direction === "across" ? "↓→" : "→↓"),
    };
    const clueCell = cells[clue.row][clue.col];
    if (clueCell.kind === "clue") clueCell.placementIds.push(id);
    for (const [r, c] of placementCells(placement)) {
      const current = cells[r][c];
      if (current?.kind === "letter") current.placementIds.push(id);
      else cells[r][c] = { kind: "letter", solution: placement.word[word.direction === "across" ? c - placement.col : r - placement.row], placementIds: [id] };
    }
    return placement;
  });
  return { size, cells, placements };
}

export function placementCells(placement: Placement): [number, number][] {
  return Array.from({ length: placement.word.length }, (_, i) => [
    placement.row + (placement.direction === "down" ? i : 0),
    placement.col + (placement.direction === "across" ? i : 0),
  ]);
}
