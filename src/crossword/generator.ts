import type { DictionaryEntry } from "./dictionary";
import { fillLayout } from "./fillLayout";
import { answerLetters, imageCueMarker, wordCells, type GridLayout } from "./layout";
import { createTemplateLayout } from "./templateLayouts";

export type Direction = "across" | "down";
export interface Placement extends DictionaryEntry {
  id: number;
  row: number;
  col: number;
  direction: Direction;
  clueRow: number;
  clueCol: number;
  cueKind: "clue" | "image";
  imageMarker?: { left: number; top: number; arrow: string };
  arrow: string;
  cells?: [number, number][];
}
export interface LetterCell { kind: "letter"; solution: string; placementIds: number[] }
export interface ClueCell { kind: "clue"; placementIds: number[]; width: number; height: number }
export interface ImageCell { kind: "image"; width: number; height: number; illustration?: string; offsetX?: number; offsetY?: number; placementIds: number[] }
export interface CoveredCell { kind: "covered" }
export interface BlockCell { kind: "block" }
export interface ArrowCell { kind: "arrow"; direction: Direction }
export type Cell = LetterCell | ClueCell | ImageCell | CoveredCell | BlockCell | ArrowCell;
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
  return puzzleFromLayout(layout, answers);
}

export function puzzleFromLayout(layout: GridLayout, answers: Record<string, DictionaryEntry>): Puzzle {
  const size = layout.width;
  const cells = Array.from({ length: size }, () => Array<Cell>(size));
  for (const block of layout.blocks ?? []) cells[block.row][block.col] = { kind: "block" };
  for (const arrow of layout.arrows ?? []) cells[arrow.row][arrow.col] = { kind: "arrow", direction: arrow.direction };
  for (const clue of layout.clues) {
    for (let r = clue.row; r < clue.row + clue.height; r++) for (let c = clue.col; c < clue.col + clue.width; c++) cells[r][c] = { kind: "covered" };
    cells[clue.row][clue.col] = { kind: "clue", placementIds: [], width: clue.width, height: clue.height };
  }
  for (const image of layout.images) {
    for (let r = image.row; r < image.row + image.height; r++) for (let c = image.col; c < image.col + image.width; c++) cells[r][c] = { kind: "covered" };
    cells[image.row][image.col] = { kind: "image", width: image.width, height: image.height, illustration: image.illustration, offsetX: image.offsetX, offsetY: image.offsetY, placementIds: [] };
  }
  const placements: Placement[] = layout.words.map((word, id) => {
    const clue = layout!.clues.find(item => item.id === word.clueId);
    const image = layout!.images.find(item => item.id === word.clueId);
    const cue = clue ?? image!;
    const straight = word.direction === "across"
      ? word.start.row >= cue.row && word.start.row < cue.row + cue.height && word.start.col === cue.col + cue.width
      : word.start.col >= cue.col && word.start.col < cue.col + cue.width && word.start.row === cue.row + cue.height;
    const placement: Placement = {
      ...answers[word.id], id, row: word.start.row, col: word.start.col, direction: word.direction,
      clueRow: cue.row, clueCol: cue.col, cueKind: image ? "image" : "clue",
      ...(image ? { imageMarker: imageCueMarker(image, word) } : {}),
      arrow: straight ? (word.direction === "across" ? "→" : "↓") : (word.direction === "across" ? "↓→" : "→↓"),
      ...(word.breaks?.length ? { cells: wordCells(word).map(({ row, col }): [number, number] => [row, col]) } : {}),
    };
    const clueCell = clue ? cells[clue.row][clue.col] : cells[image!.row][image!.col];
    if (clueCell.kind === "clue") clueCell.placementIds.push(id);
    if (clueCell.kind === "image") clueCell.placementIds.push(id);
    for (const [i, [r, c]] of placementCells(placement).entries()) {
      const current = cells[r][c];
      if (current?.kind === "letter") current.placementIds.push(id);
      else cells[r][c] = { kind: "letter", solution: answerLetters(placement.word)[i], placementIds: [id] };
    }
    return placement;
  });
  return { size, cells, placements };
}

export function placementCells(placement: Placement): [number, number][] {
  return placement.cells ?? Array.from({ length: answerLetters(placement.word).length }, (_, i) => [
    placement.row + (placement.direction === "down" ? i : 0),
    placement.col + (placement.direction === "across" ? i : 0),
  ]);
}
