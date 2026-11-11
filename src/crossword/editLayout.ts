import { wordCells, type ClueArea, type GridLayout, type GridWord, type Point } from "./layout";

export type LayoutTool = "letter" | "clue" | "wide" | "tall" | "block" | "image-area" | "arrow-across" | "arrow-down";
const key = (row: number, col: number) => `${row},${col}`;

/** Rebuild slots from the visible grid, including incomplete intermediate layouts. */
export function editLayout(layout: GridLayout, point: Point, tool: LayoutTool, areaSize?: { width: number; height: number }): GridLayout | null {
  const width = areaSize?.width ?? (tool === "wide" ? 2 : 1);
  const height = areaSize?.height ?? (tool === "tall" ? 2 : 1);
  if (!Number.isInteger(point.row) || !Number.isInteger(point.col) || point.row < 0 || point.col < 0 || point.col + width > layout.width || point.row + height > layout.height) return null;
  const changed = new Set<string>();
  for (let r = point.row; r < point.row + height; r++) for (let c = point.col; c < point.col + width; c++) changed.add(key(r, c));

  const clues: ClueArea[] = [];
  const images: GridLayout["images"] = [];
  const blocks = new Map<string, Point>();
  const arrows = new Map((layout.arrows ?? []).map(arrow => [key(arrow.row, arrow.col), arrow]));
  for (const area of layout.clues) {
    const points: Point[] = [];
    for (let r = area.row; r < area.row + area.height; r++) for (let c = area.col; c < area.col + area.width; c++) points.push({ row: r, col: c });
    if (points.some(p => changed.has(key(p.row, p.col)))) {
      for (const p of points) if (!changed.has(key(p.row, p.col))) clues.push({ ...p, id: `clue-${p.row}-${p.col}`, width: 1, height: 1 });
    } else clues.push(area);
  }
  for (const area of layout.images) {
    const points: Point[] = [];
    for (let r = area.row; r < area.row + area.height; r++) for (let c = area.col; c < area.col + area.width; c++) points.push({ row: r, col: c });
    if (points.some(p => changed.has(key(p.row, p.col)))) {
      for (const p of points) if (!changed.has(key(p.row, p.col))) images.push({ ...p, id: `image-${p.row}-${p.col}`, width: 1, height: 1 });
    } else images.push(area);
  }
  for (const block of layout.blocks ?? []) blocks.set(key(block.row, block.col), block);
  for (const k of changed) { blocks.delete(k); arrows.delete(k); }
  if (tool === "clue" || tool === "wide" || tool === "tall") clues.push({ ...point, id: `clue-${point.row}-${point.col}`, width, height });
  if (tool === "image-area") images.push({ ...point, id: `image-${point.row}-${point.col}`, width, height });
  if (tool === "block") blocks.set(key(point.row, point.col), point);
  if (tool === "arrow-across" || tool === "arrow-down") arrows.set(key(point.row, point.col), { ...point, direction: tool === "arrow-across" ? "across" : "down" });

  const clueAt = (row: number, col: number) => clues.find(area => row >= area.row && row < area.row + area.height && col >= area.col && col < area.col + area.width);
  const inside = (r: number, c: number) => r >= 0 && c >= 0 && r < layout.height && c < layout.width;
  const isLetter = (r: number, c: number) => inside(r, c) && !clueAt(r, c) && !images.some(area => r >= area.row && r < area.row + area.height && c >= area.col && c < area.col + area.width) && !blocks.has(key(r, c)) && !arrows.has(key(r, c));
  const deriveWords = (): GridWord[] => {
  const words: GridWord[] = [];
  for (const direction of ["across", "down"] as const) {
    const dr = direction === "down" ? 1 : 0, dc = direction === "across" ? 1 : 0;
    for (let row = 0; row < layout.height; row++) for (let col = 0; col < layout.width; col++) {
      if (!isLetter(row, col) || isLetter(row - dr, col - dc) || arrows.get(key(row - dr, col - dc))?.direction === direction) continue;
      let r = row, c = col, length = 0;
      const breaks: number[] = [];
      while (isLetter(r, c)) {
        length++; r += dr; c += dc;
        if (arrows.get(key(r, c))?.direction === direction && isLetter(r + dr, c + dc)) {
          breaks.push(length); r += dr; c += dc;
        }
      }
      if (length === 1 && !clueAt(row - dr, col - dc)) continue;
      const old = layout.words.find(word => word.direction === direction && word.start.row === row && word.start.col === col);
      const clue = clueAt(row - dr, col - dc);
      const retainedImageCue = old && images.find(area => area.id === old.clueId);
      words.push({ id: old?.id ?? `${direction}-${row}-${col}`, clueId: retainedImageCue?.id ?? clue?.id ?? `missing-${direction}-${row}-${col}`, ...(old?.textClueId ? { textClueId: old.textClueId } : {}), start: { row, col }, direction, length, ...(breaks.length ? { breaks } : {}) });
    }
  }
  // A run without a clue is not an additional word when it crosses a clued word; any uncovered cells remain invalid.
  const cluedCells = new Set(words.filter(word => !word.clueId.startsWith("missing-")).flatMap(word => wordCells(word).map(cell => key(cell.row, cell.col))));
  const retainedWords = words.filter(word => !word.clueId.startsWith("missing-") || wordCells(word).every(cell => !cluedCells.has(key(cell.row, cell.col))));
  return retainedWords;
  };
  let retainedWords = deriveWords();
  if (tool === "block" || tool === "image-area") {
    // Repair unused clues connected to the edited area, following the cascade.
    const repaired = new Set(changed);
    let removed: boolean;
    do {
      removed = false;
      for (let i = clues.length - 1; i >= 0; i--) {
        const clue = clues[i];
        const touchesRepair = Array.from({ length: clue.width * clue.height }, (_, n) => ({ row: clue.row + Math.floor(n / clue.width), col: clue.col + n % clue.width })).some(cell =>
          [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => repaired.has(key(cell.row + dr, cell.col + dc))));
        if (!touchesRepair || retainedWords.some(word => word.clueId === clue.id || (word.textClueId === clue.id && images.some(image => image.id === word.clueId)))) continue;
        clues.splice(i, 1);
        for (let row = clue.row; row < clue.row + clue.height; row++) for (let col = clue.col; col < clue.col + clue.width; col++) { blocks.set(key(row, col), { row, col }); repaired.add(key(row, col)); }
        removed = true;
      }
      if (removed) retainedWords = deriveWords();
    } while (removed);
    const oldCells = new Set(layout.words.flatMap(word => wordCells(word).map(cell => key(cell.row, cell.col))));
    const occupied = new Set(retainedWords.flatMap(word => wordCells(word).map(cell => key(cell.row, cell.col))));
    for (let row = 0; row < layout.height; row++) for (let col = 0; col < layout.width; col++) {
      const cellKey = key(row, col);
      if (oldCells.has(cellKey) && !occupied.has(cellKey) && isLetter(row, col)
        && ![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => isLetter(row + dr, col + dc))) blocks.set(cellKey, { row, col });
    }
    retainedWords = deriveWords();
  }
  return { width: layout.width, height: layout.height, clues, images, blocks: [...blocks.values()], arrows: [...arrows.values()], words: retainedWords };
}

export function sameSlot(a: GridWord, b: GridWord): boolean {
  return a.direction === b.direction && a.clueId === b.clueId && JSON.stringify(wordCells(a)) === JSON.stringify(wordCells(b));
}

/** Resize from the existing top-left corner, leaving released cells as blocks. */
export function resizeImageArea(layout: GridLayout, imageId: string, width: number, height: number): GridLayout | null {
  const image = layout.images.find(item => item.id === imageId);
  if (!image || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || image.col + width > layout.width || image.row + height > layout.height) return null;
  if (layout.images.some(other => other.id !== imageId && image.row < other.row + other.height && image.row + height > other.row && image.col < other.col + other.width && image.col + width > other.col)) return null;
  const released: Point[] = [];
  for (let row = image.row; row < image.row + image.height; row++) for (let col = image.col; col < image.col + image.width; col++) {
    if (row >= image.row + height || col >= image.col + width) released.push({ row, col });
  }
  const generatedId = `image-${image.row}-${image.col}`;
  const base = { ...layout, images: layout.images.filter(item => item.id !== imageId), blocks: [...(layout.blocks ?? []), ...released], words: layout.words.map(word => word.clueId === imageId ? { ...word, clueId: generatedId } : word) };
  const next = editLayout(base, image, "image-area", { width, height });
  if (!next) return null;
  return { ...next, images: next.images.map(item => item.id === generatedId ? { ...image, width, height } : item), words: next.words.map(word => word.clueId === generatedId ? { ...word, clueId: image.id } : word) };
}
