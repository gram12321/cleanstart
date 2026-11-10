import type { DictionaryEntry } from "./dictionary";
import { answerLetters } from "./layout";

export function parseCustomEntries(text: string): DictionaryEntry[] | null {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return null;
  const entries: DictionaryEntry[] = [];
  for (const line of lines) {
    const colon = line.indexOf(":");
    const pairs = colon >= 0
      ? line.slice(colon + 1).split("|").map(word => [word, line.slice(0, colon)])
      : (() => { const [word, ...clues] = line.split(";"); return clues.map(clue => [word, clue]); })();
    if (!pairs.length) return null;
    for (const [rawWord, rawClue] of pairs) {
      const word = rawWord.trim().toLocaleUpperCase("da-DK").replace(/\s+/g, " ");
      const clue = rawClue.trim();
      if (!/^[A-ZÆØÅ]+(?: [A-ZÆØÅ]+)*$/.test(word) || !clue) return null;
      entries.push({ word, clue, length: answerLetters(word).length, source: "custom" });
    }
  }
  return entries;
}

export function customEntryKey(entry: DictionaryEntry): string {
  return `${entry.word}\u0000${entry.clue.toLocaleLowerCase("da-DK")}`;
}
