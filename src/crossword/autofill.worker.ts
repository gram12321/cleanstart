import { fillLayout } from "./fillLayout";
import { indexWordScores, type DictionaryEntry } from "./dictionary";
import { answerLetters, fitsBreaks, wordCells, type GridLayout } from "./layout";

self.onmessage = (event: MessageEvent<{ layout: GridLayout; entries: DictionaryEntry[]; letters: Record<string, string>; selected?: string }>) => {
  const { layout, entries, letters, selected } = event.data;
  let lastUpdate = 0;
  const report = (data: object, force = false) => {
    const now = Date.now();
    if (force || now - lastUpdate >= 250) { lastUpdate = now; self.postMessage({ type: "progress", ...data }); }
  };
  if (!selected) {
    let latest: object = { mode: "grid", nodes: 0, solutions: 0, bestScore: null };
    const result = fillLayout(layout, entries, 100000, letters, true, progress => { latest = { mode: "grid", ...progress }; report(latest); });
    report(latest, true);
    self.postMessage(result);
    return;
  }
  const slot = layout.words.find(word => word.id === selected);
  if (!slot) return;
  const scores = indexWordScores(entries);
  const cells = wordCells(slot);
  const candidates = [...new Map(entries.filter(entry => answerLetters(entry.word).length === slot.length && fitsBreaks(slot, entry.word) && cells.every((cell, i) => !letters[`${cell.row},${cell.col}`] || letters[`${cell.row},${cell.col}`] === answerLetters(entry.word)[i])).map(entry => [entry.word, entry])).values()]
    .sort((a, b) => (scores.get(b.word) ?? 0) - (scores.get(a.word) ?? 0) || a.word.localeCompare(b.word, "da"));
  let checked = 0, uncertain = 0, attemptNodes = 0;
  report({ mode: "word", checked, total: candidates.length, uncertain, nodes: 0 }, true);
  for (const entry of candidates) {
    const fixed = { ...letters };
    cells.forEach((cell, i) => { fixed[`${cell.row},${cell.col}`] = answerLetters(entry.word)[i]; });
    attemptNodes = 0;
    const result = fillLayout(layout, entries, 10000, fixed, false, progress => { attemptNodes = progress.nodes; report({ mode: "word", checked, total: candidates.length, uncertain, nodes: attemptNodes }); });
    checked++;
    if (result.status === "invalid") { self.postMessage({ ...result, searchStats: { checked, total: candidates.length, uncertain, nodes: attemptNodes } }); return; }
    if (result.status === "limit") uncertain++;
    if (result.status === "solved") { report({ mode: "word", checked, total: candidates.length, uncertain, nodes: attemptNodes }, true); self.postMessage({ status: uncertain ? "limit" : "solved", answers: { [selected]: entry }, searchStats: { checked, total: candidates.length, uncertain, nodes: attemptNodes } }); return; }
    report({ mode: "word", checked, total: candidates.length, uncertain, nodes: attemptNodes }, true);
    if (uncertain >= 10) { self.postMessage({ status: "limit", searchStats: { checked, total: candidates.length, uncertain, nodes: attemptNodes } }); return; }
  }
  self.postMessage({ status: uncertain ? "limit" : "unsatisfiable", searchStats: { checked, total: candidates.length, uncertain, nodes: attemptNodes } });
};
