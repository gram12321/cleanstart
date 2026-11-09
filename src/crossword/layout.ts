import type { Direction } from "./generator";

export interface Point { row: number; col: number }
export interface Area extends Point { width: number; height: number }
export interface ClueArea extends Area { id: string }
export interface GridWord {
  id: string;
  clueId: string;
  start: Point;
  direction: Direction;
  length: number;
  breaks?: number[];
}
export interface ArrowCell extends Point { direction: Direction }
export interface GridLayout {
  width: number;
  height: number;
  clues: ClueArea[];
  images: Area[];
  words: GridWord[];
  blocks?: Point[];
  arrows?: ArrowCell[];
}
export interface LayoutIssue { message: string; cells: Point[] }

export function orderClueWords<T extends { direction: Direction; row: number; col: number }>(words: T[]): T[] {
  return [...words].sort((a, b) => a.direction !== b.direction
    ? (a.direction === "down" ? -1 : 1)
    : a.direction === "down" ? a.col - b.col : a.row - b.row);
}
export function cluePresentation<T extends { direction: Direction; row: number; col: number }>(area: Area, words: T[]): { horizontal: boolean; words: T[] } {
  const sorted = orderClueWords(words);
  if (sorted.length !== 2) return { horizontal: false, words: sorted };
  if (sorted[0].direction === sorted[1].direction) {
    return { horizontal: sorted[0].direction === "down" && area.width > 1, words: sorted };
  }
  const down = sorted.find(word => word.direction === "down")!;
  const horizontal = area.width === 1 || down.col < area.col + area.width / 2;
  return { horizontal, words: horizontal ? sorted : sorted.reverse() };
}

export function wordCells(word: GridWord): Point[] {
  return Array.from({ length: word.length }, (_, i) => ({
    row: word.start.row + (word.direction === "down" ? i + (word.breaks?.filter(b => b <= i).length ?? 0) : 0),
    col: word.start.col + (word.direction === "across" ? i + (word.breaks?.filter(b => b <= i).length ?? 0) : 0),
  }));
}

export function answerLetters(answer: string): string { return answer.replaceAll(" ", ""); }
export function answerBreaks(answer: string): number[] {
  let letters = 0;
  const breaks: number[] = [];
  for (const char of answer) {
    if (char === " ") breaks.push(letters);
    else letters++;
  }
  return breaks;
}
export function fitsBreaks(word: GridWord, answer: string): boolean {
  return JSON.stringify(word.breaks ?? []) === JSON.stringify(answerBreaks(answer));
}

export function layoutIssues(layout: GridLayout): LayoutIssue[] {
  const errors: LayoutIssue[] = [];
  const add = (message: string, cells: Point[] = []) => errors.push({ message, cells: cells.filter(inside) });
  if (!Number.isInteger(layout.width) || !Number.isInteger(layout.height) || layout.width < 1 || layout.height < 1) return [{ message: "Invalid grid dimensions", cells: [] }];
  const cells: { area?: string; words: GridWord[] }[][] = Array.from({ length: layout.height }, () =>
    Array.from({ length: layout.width }, () => ({ words: [] })));
  const inside = ({ row, col }: Point) => Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0 && row < layout.height && col < layout.width;
  const clueIds = new Set<string>();
  for (const [index, area] of [...layout.clues, ...layout.images].entries()) {
    const clue = index < layout.clues.length;
    const id = clue ? layout.clues[index].id : `image-${index}`;
    if (clue && (!id || clueIds.has(id))) add(`Duplicate or empty clue id: ${id}`, [area]);
    if (clue) clueIds.add(id);
    if (!Number.isInteger(area.width) || !Number.isInteger(area.height) || area.width < 1 || area.height < 1 || !inside(area) || !inside({ row: area.row + area.height - 1, col: area.col + area.width - 1 })) {
      add(`Invalid area: ${id}`, [area]); continue;
    }
    for (let r = area.row; r < area.row + area.height; r++) for (let c = area.col; c < area.col + area.width; c++) {
      if (cells[r][c].area) add(`Overlapping areas at ${r},${c}`, [{ row: r, col: c }]);
      cells[r][c].area = id;
    }
  }
  for (const [kind, points] of [["block", layout.blocks ?? []], ["arrow", layout.arrows ?? []]] as const) {
    for (const point of points) {
      if (!inside(point)) { add(`Invalid ${kind}`); continue; }
      if (cells[point.row][point.col].area) add(`Overlapping areas at ${point.row},${point.col}`, [point]);
      cells[point.row][point.col].area = kind;
    }
  }
  const wordIds = new Set<string>();
  for (const word of layout.words) {
    if (!word.id || wordIds.has(word.id)) add(`Duplicate or empty word id: ${word.id}`, [word.start]);
    wordIds.add(word.id);
    const clue = layout.clues.find(item => item.id === word.clueId);
    if (!clue) add(`Missing clue for ${word.id}`, wordCells(word));
    if (!Number.isInteger(word.length) || word.length < 1 || !inside(word.start) || (word.breaks ?? []).some((b, i, all) => !Number.isInteger(b) || b < 1 || b >= word.length || (i > 0 && b <= all[i - 1]))) { add(`Invalid word: ${word.id}`, [word.start]); continue; }
    // A straight or bent arrow connects the clue area to the first letter.
    if (clue) {
      const dr = word.start.row < clue.row ? clue.row - word.start.row : Math.max(0, word.start.row - (clue.row + clue.height - 1));
      const dc = word.start.col < clue.col ? clue.col - word.start.col : Math.max(0, word.start.col - (clue.col + clue.width - 1));
      if (dr > 1 || dc > 1 || dr + dc === 0 || (word.start.col < clue.col || word.start.row < clue.row)) add(`Clue cannot point to ${word.id}`, [clue, word.start]);
      if (dr === 1 && dc === 1) {
        const turn = word.direction === "across" ? { row: word.start.row, col: word.start.col - 1 } : { row: word.start.row - 1, col: word.start.col };
        if (inside(turn) && cells[turn.row][turn.col].area) add(`Clue cannot point to ${word.id}`, [clue, turn, word.start]);
      }
    }
    for (const point of wordCells(word)) {
      if (!inside(point)) { add(`Word outside grid: ${word.id}`, [word.start]); break; }
      const cell = cells[point.row][point.col];
      if (cell.area || cell.words.some(other => other.direction === word.direction)) add(`Invalid word overlap at ${point.row},${point.col}`, [point]);
      cell.words.push(word);
    }
    for (const b of word.breaks ?? []) {
      const previous = wordCells(word)[b - 1];
      const row = previous.row + (word.direction === "down" ? 1 : 0);
      const col = previous.col + (word.direction === "across" ? 1 : 0);
      if (!layout.arrows?.some(arrow => arrow.row === row && arrow.col === col && arrow.direction === word.direction)) add(`Missing arrow in ${word.id}`, [{ row, col }]);
    }
  }
  if (!layout.words.length) add("No words");
  if (layout.words.length) {
    const reached = new Set<GridWord>([layout.words[0]]);
    let previous = -1;
    while (previous !== reached.size) {
      previous = reached.size;
      for (const row of cells) for (const cell of row) {
        if (cell.words.some(word => reached.has(word))) cell.words.forEach(word => reached.add(word));
      }
    }
    if (reached.size !== layout.words.length) add("Words are not connected by crossings", layout.words.filter(word => !reached.has(word)).flatMap(wordCells));
  }
  for (const clue of layout.clues) {
    const count = layout.words.filter(word => word.clueId === clue.id).length;
    if (count < 1 || count > 2) add(`Clue ${clue.id} must have one or two words`, Array.from({ length: clue.width * clue.height }, (_, i) => ({ row: clue.row + Math.floor(i / clue.width), col: clue.col + i % clue.width })));
  }
  for (const arrow of layout.arrows ?? []) {
    if (!layout.words.some(word => word.direction === arrow.direction && (word.breaks ?? []).some(b => {
      const previous = wordCells(word)[b - 1];
      return previous.row + (word.direction === "down" ? 1 : 0) === arrow.row && previous.col + (word.direction === "across" ? 1 : 0) === arrow.col;
    }))) add(`Unused arrow at ${arrow.row},${arrow.col}`, [arrow]);
  }
  for (let r = 0; r < layout.height; r++) for (let c = 0; c < layout.width; c++) {
    const cell = cells[r][c];
    if (!cell.area && !cell.words.length) add(`Empty cell at ${r},${c}`, [{ row: r, col: c }]);

  }
  return errors;
}

/** Returns structural problems; an empty array means every cell has a role. */
export function validateLayout(layout: GridLayout): string[] {
  return layoutIssues(layout).map(issue => issue.message);
}
