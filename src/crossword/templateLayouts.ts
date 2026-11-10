import { validateLayout, type GridLayout, type GridWord } from "./layout";

const SEEDS: Record<number, string[]> = {
  9: ["#########", "#....#...", "#....#...", "#..####..", "#....#...", "###....##", "#...#....", "#..#..#..", "#..#..#.."],
  11: ["###########", "#..#....#..", "#..#....#..", "#....##....", "###...#..##", "#...#..#...", "#....#..#..", "#..#..#....", "###...#..##", "#...#..#...", "#...#..#..."],
  13: ["#############", "#...#....#...", "#...#....#...", "#....##...#..", "#..#....#....", "###....#...##", "#....#...#...", "#..##....##..", "#..#..##..#..", "###....##..##", "#...##..##...", "#....#..#....", "#....#..#...."],
};

/** Randomly varies a connected clues-in-squares pattern, then derives every clue from its answer start. */
export function createTemplateLayout(size: number): GridLayout | null {
  const seed = SEEDS[size];
  if (!seed) return null;
  for (let attempt = 0; attempt < 500; attempt++) {
    const mask = seed.map(row => [...row]);
    const flips = attempt === 0 ? 0 : 1 + Math.floor(Math.random() * Math.max(1, Math.floor(size * size * 0.035)));
    for (let n = 0; n < flips; n++) {
      const row = 1 + Math.floor(Math.random() * (size - 1));
      const col = 1 + Math.floor(Math.random() * (size - 1));
      mask[row][col] = mask[row][col] === "." ? "#" : ".";
    }
    const layout = layoutFromMask(mask);
    if (layout && validateLayout(layout).length === 0) return layout;
  }
  return null;
}

function layoutFromMask(mask: string[][]): GridLayout | null {
  const size = mask.length;
  const words: GridWord[] = [];
  for (const direction of ["across", "down"] as const) for (let line = 1; line < size; line++) {
    let p = 1;
    while (p < size) {
      const at = (i: number) => direction === "across" ? mask[line][i] : mask[i][line];
      if (at(p) === "#") { p++; continue; }
      const first = p;
      while (p < size && at(p) === ".") p++;
      const start = direction === "across" ? { row: line, col: first } : { row: first, col: line };
      const clue = direction === "across" ? { row: start.row, col: start.col - 1 } : { row: start.row - 1, col: start.col };
      words.push({ id: String(words.length), clueId: String(clue.row * size + clue.col), start, direction, length: p - first });
    }
  }

  const active = new Set(words.map(word => word.clueId));
  const clues: GridLayout["clues"] = [];
  const images: GridLayout["images"] = [{ id: "image-0-0", row: 0, col: 0, width: 1, height: 1 }];
  const used = new Set<string>(["0"]);
  const remap = new Map<string, string>();
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const id = String(row * size + col);
    if (mask[row][col] !== "#" || used.has(id)) continue;
    if (active.has(id)) {
      clues.push({ id, row, col, width: 1, height: 1 });
      remap.set(id, id); used.add(id); continue;
    }
    const right = col + 1 < size ? String(row * size + col + 1) : "";
    const below = row + 1 < size ? String((row + 1) * size + col) : "";
    if (active.has(right) && !used.has(right)) {
      clues.push({ id, row, col, width: 2, height: 1 }); remap.set(right, id); used.add(id); used.add(right);
    } else if (active.has(below) && !used.has(below)) {
      clues.push({ id, row, col, width: 1, height: 2 }); remap.set(below, id); used.add(id); used.add(below);
    } else { images.push({ id: `image-${row}-${col}`, row, col, width: 1, height: 1 }); used.add(id); }
  }
  for (const word of words) word.clueId = remap.get(word.clueId) ?? word.clueId;
  return { width: size, height: size, clues, images, words };
}
