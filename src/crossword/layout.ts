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
}
export interface GridLayout {
  width: number;
  height: number;
  clues: ClueArea[];
  images: Area[];
  words: GridWord[];
}

export function wordCells(word: GridWord): Point[] {
  return Array.from({ length: word.length }, (_, i) => ({
    row: word.start.row + (word.direction === "down" ? i : 0),
    col: word.start.col + (word.direction === "across" ? i : 0),
  }));
}

/** Returns structural problems; an empty array means every cell has a role. */
export function validateLayout(layout: GridLayout): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(layout.width) || !Number.isInteger(layout.height) || layout.width < 1 || layout.height < 1) return ["Invalid grid dimensions"];
  const cells: { area?: string; words: GridWord[] }[][] = Array.from({ length: layout.height }, () =>
    Array.from({ length: layout.width }, () => ({ words: [] })));
  const inside = ({ row, col }: Point) => Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0 && row < layout.height && col < layout.width;
  const clueIds = new Set<string>();
  for (const [index, area] of [...layout.clues, ...layout.images].entries()) {
    const clue = index < layout.clues.length;
    const id = clue ? layout.clues[index].id : `image-${index}`;
    if (clue && (!id || clueIds.has(id))) errors.push(`Duplicate or empty clue id: ${id}`);
    if (clue) clueIds.add(id);
    if (!Number.isInteger(area.width) || !Number.isInteger(area.height) || area.width < 1 || area.height < 1 || !inside(area) || !inside({ row: area.row + area.height - 1, col: area.col + area.width - 1 })) {
      errors.push(`Invalid area: ${id}`); continue;
    }
    for (let r = area.row; r < area.row + area.height; r++) for (let c = area.col; c < area.col + area.width; c++) {
      if (cells[r][c].area) errors.push(`Overlapping areas at ${r},${c}`);
      cells[r][c].area = id;
    }
  }
  const wordIds = new Set<string>();
  for (const word of layout.words) {
    if (!word.id || wordIds.has(word.id)) errors.push(`Duplicate or empty word id: ${word.id}`);
    wordIds.add(word.id);
    const clue = layout.clues.find(item => item.id === word.clueId);
    if (!clue) errors.push(`Missing clue for ${word.id}`);
    if (!Number.isInteger(word.length) || word.length < 2 || !inside(word.start)) { errors.push(`Invalid word: ${word.id}`); continue; }
    // A straight or bent arrow connects the clue area to the first letter.
    if (clue) {
      const dr = word.start.row < clue.row ? clue.row - word.start.row : Math.max(0, word.start.row - (clue.row + clue.height - 1));
      const dc = word.start.col < clue.col ? clue.col - word.start.col : Math.max(0, word.start.col - (clue.col + clue.width - 1));
      if (dr > 1 || dc > 1 || dr + dc === 0 || (word.start.col < clue.col || word.start.row < clue.row)) errors.push(`Clue cannot point to ${word.id}`);
    }
    for (const point of wordCells(word)) {
      if (!inside(point)) { errors.push(`Word outside grid: ${word.id}`); break; }
      const cell = cells[point.row][point.col];
      if (cell.area || cell.words.some(other => other.direction === word.direction)) errors.push(`Invalid word overlap at ${point.row},${point.col}`);
      cell.words.push(word);
    }
  }
  if (layout.words.length) {
    const reached = new Set<GridWord>([layout.words[0]]);
    let previous = -1;
    while (previous !== reached.size) {
      previous = reached.size;
      for (const row of cells) for (const cell of row) {
        if (cell.words.some(word => reached.has(word))) cell.words.forEach(word => reached.add(word));
      }
    }
    if (reached.size !== layout.words.length) errors.push("Words are not connected by crossings");
  }
  for (const clue of layout.clues) {
    const count = layout.words.filter(word => word.clueId === clue.id).length;
    if (count < 1 || count > 2) errors.push(`Clue ${clue.id} must have one or two words`);
  }
  for (let r = 0; r < layout.height; r++) for (let c = 0; c < layout.width; c++) {
    const cell = cells[r][c];
    if (!cell.area && !cell.words.length) errors.push(`Empty cell at ${r},${c}`);
    if (!cell.words.length) continue;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const neighbour = cells[r + dr]?.[c + dc];
      if (neighbour?.words.length && !cell.words.some(word => neighbour.words.includes(word))) errors.push(`Unclued neighbouring letters at ${r},${c}`);
    }
  }
  return errors;
}
