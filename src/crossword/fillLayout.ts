import { indexWordScores, isValidAnswerSpelling, type DictionaryEntry } from "./dictionary";
import { answerLetters, fitsBreaks, validateLayout, wordCells, type GridLayout } from "./layout";

export type FillResult =
  | { status: "solved"; answers: Record<string, DictionaryEntry> }
  | { status: "invalid"; errors: string[] }
  | { status: "unsatisfiable" }
  | { status: "limit"; answers?: Record<string, DictionaryEntry> };

export interface FillProgress { nodes: number; solutions: number; bestScore: number | null }

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ";
interface LengthIndex { entries: DictionaryEntry[]; masks: Uint32Array[][]; full: Uint32Array }
interface Crossing { other: number; position: number; otherPosition: number }

function countBits(value: number): number {
  value -= (value >>> 1) & 0x55555555;
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return (((value + (value >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function makeIndex(entries: readonly DictionaryEntry[], lengths: Set<number>): Map<number, LengthIndex> {
  const groups = new Map<number, DictionaryEntry[]>();
  const seen = new Set<string>();
  // Custom clues override the built-in clue for the same answer.
  for (const entry of [...entries.filter(e => e.source === "custom"), ...entries.filter(e => e.source !== "custom")]) {
    if (!lengths.has(answerLetters(entry.word).length) || !isValidAnswerSpelling(entry.word) || seen.has(entry.word)) continue;
    seen.add(entry.word);
    const length = answerLetters(entry.word).length;
    const bucket = groups.get(length) ?? [];
    bucket.push(entry); groups.set(length, bucket);
  }
  const result = new Map<number, LengthIndex>();
  for (const [length, words] of groups) {
    const blocks = Math.ceil(words.length / 32);
    const masks = Array.from({ length }, () => Array.from({ length: ALPHABET.length }, () => new Uint32Array(blocks)));
    const full = new Uint32Array(blocks);
    words.forEach((entry, id) => {
      full[id >>> 5] |= 1 << (id & 31);
      const letters = answerLetters(entry.word);
      for (let p = 0; p < length; p++) masks[p][ALPHABET.indexOf(letters[p])][id >>> 5] |= 1 << (id & 31);
    });
    result.set(length, { entries: words, masks, full });
  }
  return result;
}

/** Fill a complete layout, propagating crossing constraints before each search step. */
export function fillLayout(layout: GridLayout, dictionary: readonly DictionaryEntry[], maxNodes = 10000, fixedLetters: Readonly<Record<string, string>> = {}, optimize = false, onProgress?: (progress: FillProgress) => void): FillResult {
  const errors = validateLayout(layout);
  if (errors.length) return { status: "invalid", errors };
  const index = makeIndex(dictionary, new Set(layout.words.map(word => word.length)));
  const indexes = layout.words.map(word => index.get(word.length));
  if (indexes.some(item => !item)) return { status: "unsatisfiable" };
  const slots = layout.words.map(word => wordCells(word).map(p => `${p.row},${p.col}`));
  const crossings: Crossing[][] = slots.map(() => []);
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    slots[i].forEach((cell, position) => {
      const otherPosition = slots[j].indexOf(cell);
      if (otherPosition >= 0) {
        crossings[i].push({ other: j, position, otherPosition });
        crossings[j].push({ other: i, position: otherPosition, otherPosition: position });
      }
    });
  }
  const scores = indexWordScores(dictionary);
  let best: Uint32Array[] | null = null;
  let bestScore = -1;
  let bestKey = "";
  let nodes = 0;
  let solutions = 0;
  let limited = false;
  const report = () => onProgress?.({ nodes, solutions, bestScore: bestScore < 0 ? null : bestScore });
  function propagate(domains: Uint32Array[], queue: number[]): boolean {
    const queued = new Set(queue);
    const enqueue = (i: number) => { if (!queued.has(i)) { queue.push(i); queued.add(i); } };
    while (queue.length) {
      const i = queue.pop()!; queued.delete(i);
      const source = indexes[i]!;
      const domain = domains[i];
      let count = 0, only = -1;
      for (let block = 0; block < domain.length; block++) {
        const value = domain[block]; count += countBits(value);
        if (value) only = (block << 5) + (31 - Math.clz32(value & -value));
      }
      if (!count) return false;
      if (count === 1) {
        // Indexes are shared by length, so the same bit is the same spelling.
        for (let j = 0; j < domains.length; j++) if (j !== i && indexes[j] === source) {
          const block = only >>> 5, bit = 1 << (only & 31);
          if (domains[j][block] & bit) { domains[j][block] = (domains[j][block] & ~bit) >>> 0; enqueue(j); }
        }
      }
      for (const { other, position, otherPosition } of crossings[i]) {
        const target = indexes[other]!;
        const allowed = new Uint32Array(target.full.length);
        for (let letter = 0; letter < ALPHABET.length; letter++) {
          const mask = source.masks[position][letter];
          let exists = false;
          for (let k = 0; k < domain.length; k++) if (domain[k] & mask[k]) { exists = true; break; }
          if (exists) for (let k = 0; k < allowed.length; k++) allowed[k] |= target.masks[otherPosition][letter][k];
        }
        let changed = false, nonempty = false;
        for (let k = 0; k < allowed.length; k++) {
          const value = (domains[other][k] & allowed[k]) >>> 0;
          if (value !== domains[other][k]) { domains[other][k] = value; changed = true; }
          if (value) nonempty = true;
        }
        if (!nonempty) return false;
        if (changed) enqueue(other);
      }
    }
    return true;
  }
  function search(domains: Uint32Array[], queue: number[]): Uint32Array[] | null {
    if (nodes >= maxNodes) { limited = true; return null; }
    nodes++;
    if (nodes % 100 === 0) report();
    if (!propagate(domains, queue)) return null;
    if (optimize) {
      let upper = 0;
      for (let i = 0; i < domains.length; i++) {
        let max = 0;
        domains[i].forEach((value, block) => {
          while (value) { const bit = 31 - Math.clz32(value & -value); max = Math.max(max, scores.get(indexes[i]!.entries[(block << 5) + bit].word) ?? 0); value = (value & (value - 1)) >>> 0; }
        });
        upper += max;
      }
      if (upper <= bestScore) return null;
    }
    let target = -1, smallest = Infinity;
    for (let i = 0; i < domains.length; i++) {
      let count = 0;
      for (const value of domains[i]) count += countBits(value);
      if (count > 1 && count < smallest) { target = i; smallest = count; }
    }
    if (target < 0) {
      solutions++;
      if (!optimize) return domains;
      const words = domains.map((domain, i) => { const block = domain.findIndex(value => value !== 0); const id = (block << 5) + (31 - Math.clz32(domain[block] & -domain[block])); return indexes[i]!.entries[id].word; });
      const score = words.reduce((sum, word) => sum + (scores.get(word) ?? 0), 0);
      const key = words.join("\0");
      if (score > bestScore || (score === bestScore && key.localeCompare(bestKey, "da") < 0)) { best = domains; bestScore = score; bestKey = key; }
      report();
      return null;
    }
    const ids: number[] = [];
    domains[target].forEach((value, block) => {
      while (value) { const bit = 31 - Math.clz32(value & -value); ids.push((block << 5) + bit); value = (value & (value - 1)) >>> 0; }
    });
    if (optimize) ids.sort((a, b) => (scores.get(indexes[target]!.entries[b].word) ?? 0) - (scores.get(indexes[target]!.entries[a].word) ?? 0) || indexes[target]!.entries[a].word.localeCompare(indexes[target]!.entries[b].word, "da"));
    else for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    for (const id of ids) {
      const next = domains.map(domain => domain.slice());
      next[target].fill(0); next[target][id >>> 5] = 1 << (id & 31);
      const result = search(next, [target]);
      if (result) return result;
      if (limited) break;
    }
    return null;
  }
  const domains = indexes.map(item => item!.full.slice());
  for (let i = 0; i < domains.length; i++) {
    indexes[i]!.entries.forEach((entry, id) => {
      if (!fitsBreaks(layout.words[i], entry.word)) domains[i][id >>> 5] &= ~(1 << (id & 31));
    });
  }
  for (let i = 0; i < slots.length; i++) for (let position = 0; position < slots[i].length; position++) {
    const letter = fixedLetters[slots[i][position]];
    if (!letter) continue;
    const letterIndex = ALPHABET.indexOf(letter);
    if (letterIndex < 0) return { status: "unsatisfiable" };
    const mask = indexes[i]!.masks[position][letterIndex];
    for (let block = 0; block < domains[i].length; block++) domains[i][block] &= mask[block];
  }
  const found = search(domains, domains.map((_, i) => i));
  report();
  const solution = optimize ? best : found;
  if (!solution) return { status: limited ? "limit" : "unsatisfiable" };
  const answers = Object.fromEntries(layout.words.map((word, i) => {
    const domain = solution[i];
    const block = domain.findIndex(value => value !== 0);
    const id = (block << 5) + (31 - Math.clz32(domain[block] & -domain[block]));
    return [word.id, indexes[i]!.entries[id]];
  }));
  return limited ? { status: "limit", answers } : { status: "solved", answers };
}
