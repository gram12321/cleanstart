import { fillLayout } from "./fillLayout";
import { answerLetters, fitsBreaks, wordCells, type GridLayout } from "./layout";
import { getEntryScore, indexWordScores, type DictionaryEntry } from "./dictionary";

self.onmessage = (event: MessageEvent<{ layout: GridLayout; entries: DictionaryEntry[]; selected: string; letters: Record<string, string> }>) => {
  const { layout, entries, selected, letters } = event.data;
  const slot = layout.words.find(word => word.id === selected);
  if (!slot) return;
  const cells = wordCells(slot);
  const matching = entries.filter(entry => answerLetters(entry.word).length === slot.length && /^[A-ZÆØÅ]+(?: [A-ZÆØÅ]+)*$/.test(entry.word) && fitsBreaks(slot, entry.word) && cells.every((cell, i) => !letters[`${cell.row},${cell.col}`] || letters[`${cell.row},${cell.col}`] === answerLetters(entry.word)[i]));
  const scores = indexWordScores(entries);
  const candidates = [...new Map([...matching].reverse().map(entry => [entry.word, entry])).values()]
    .sort((a, b) => (scores.get(b.word) ?? 0) - (scores.get(a.word) ?? 0) || a.word.localeCompare(b.word, "da"));
  let checked = 0, uncertain = 0, found = 0;
  for (const entry of candidates) {
    const fixed = { ...letters };
    cells.forEach((cell, i) => { fixed[`${cell.row},${cell.col}`] = answerLetters(entry.word)[i]; });
    const result = fillLayout(layout, entries, 3000, fixed);
    checked++;
    if (result.status === "solved") {
      found++;
      const cluesByText = new Map<string, { clue: string; score: number }>();
      for (const item of matching.filter(item => item.word === entry.word)) {
        const clue = item.clue.trim();
        const key = clue.toLocaleLowerCase("da-DK");
        const current = cluesByText.get(key);
        const score = getEntryScore(item);
        if (!current || score > current.score) cluesByText.set(key, { clue, score });
      }
      const clues = [...cluesByText.values()].sort((a, b) => b.score - a.score || a.clue.localeCompare(b.clue, "da"));
      self.postMessage({ type: "candidate", entry, clues });
    }
    if (result.status === "limit") uncertain++;
    self.postMessage({ type: "progress", checked, total: candidates.length, uncertain });
    if (found >= 40) break;
  }
  self.postMessage({ type: "done", checked, total: candidates.length, uncertain, found });
};
