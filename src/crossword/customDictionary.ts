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
      if (!/^[A-ZÆØÅ]+(?:[ -][A-ZÆØÅ]+)*$/.test(word) || !clue) return null;
      entries.push({ word, clue, length: answerLetters(word).length, source: "custom" });
    }
  }
  return entries;
}

export function customEntryKey(entry: DictionaryEntry): string {
  return `${entry.word}\u0000${entry.clue.toLocaleLowerCase("da-DK")}`;
}

export interface CustomDictionary {
  id: string;
  name: string;
  showSuggestions: boolean;
  useAutofill: boolean;
  entries: DictionaryEntry[];
  /** Shared dictionaries are read-only copies owned by another user. */
  shared?: boolean;
  ownerLabel?: string;
  /** User preference; shared dictionaries default to disabled. */
  enabled?: boolean;
}

export function parseCustomDictionaries(saved: unknown): CustomDictionary[] {
  try {
    if (Array.isArray(saved)) return saved.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.entries)).map(item => ({
      id: item.id, name: item.name, showSuggestions: item.showSuggestions !== false, useAutofill: item.useAutofill !== false,
      shared: item.shared === true, ownerLabel: typeof item.ownerLabel === "string" ? item.ownerLabel : undefined,
      enabled: item.enabled === true,
      entries: validEntries(item.entries),
    }));
    return [];
  } catch { return [{ id: "default", name: "Egen ordbog", showSuggestions: true, useAutofill: true, entries: [] }]; }
}
function validEntries(value: unknown): DictionaryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(entry => typeof entry?.word === "string" && /^[A-ZÆØÅ]+(?:[ -][A-ZÆØÅ]+)*$/.test(entry.word) && typeof entry.clue === "string" && entry.clue.trim()).map(entry => ({ ...entry, length: answerLetters(entry.word).length, source: "custom" as const }));
}
