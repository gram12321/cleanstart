import { fillLayout } from "./fillLayout";
import { wordCells, type GridLayout } from "./layout";
import type { DictionaryEntry } from "./dictionary";

self.onmessage = (event: MessageEvent<{ layout: GridLayout; entries: DictionaryEntry[]; selected: string; letters: Record<string, string> }>) => {
  const { layout, entries, selected, letters } = event.data;
  const slot = layout.words.find(word => word.id === selected);
  if (!slot) return;
  const cells = wordCells(slot);
  const candidates = [...new Map(entries.filter(entry => entry.word.length === slot.length && /^[A-ZÆØÅ]+$/.test(entry.word) && cells.every((cell, i) => !letters[`${cell.row},${cell.col}`] || letters[`${cell.row},${cell.col}`] === entry.word[i])).map(entry => [entry.word, entry])).values()].sort((a, b) => a.word.localeCompare(b.word, "da"));
  let checked = 0, uncertain = 0, found = 0;
  for (const entry of candidates) {
    const fixed = { ...letters };
    cells.forEach((cell, i) => { fixed[`${cell.row},${cell.col}`] = entry.word[i]; });
    const result = fillLayout(layout, entries, 3000, fixed);
    checked++;
    if (result.status === "solved") { found++; self.postMessage({ type: "candidate", entry }); }
    if (result.status === "limit") uncertain++;
    self.postMessage({ type: "progress", checked, total: candidates.length, uncertain });
    if (found >= 40) break;
  }
  self.postMessage({ type: "done", checked, total: candidates.length, uncertain, found });
};
