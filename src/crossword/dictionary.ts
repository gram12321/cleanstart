import dannetData from "./data/dannet.json" with { type: "json" };
import { shortClues } from "./data/shortClues";
import { starterEntries } from "./data/starter";
import { bindestrejsEntries } from "./data/bindestrejsord";

export interface DictionaryEntry {
  word: string;
  clue: string;
  /** Derived once when loading the dictionary so generators can filter by fit. */
  length: number;
  /** Shared concept for curated, interchangeable clue answers. */
  clueGroupId?: string;
  partOfSpeech?: string;
  source: "starter" | "shortClues" | "hyphen" | "custom" | "dannet";
}

export type BuiltinDictionarySource = Exclude<DictionaryEntry["source"], "custom">;

export const BUILTIN_DICTIONARY_COLLECTIONS: { source: BuiltinDictionarySource; label: string }[] = [
  { source: "starter", label: "Håndskrevne grundord" },
  { source: "shortClues", label: "Korte krydsordsledetråde" },
  { source: "hyphen", label: "Bindestrejsord" },
  { source: "dannet", label: "DanNet" },
];

export type BuiltinDictionarySettings = Record<BuiltinDictionarySource, boolean>;

export function parseBuiltinDictionarySettings(saved: unknown): BuiltinDictionarySettings {
  const value = typeof saved === "object" && saved !== null && !Array.isArray(saved)
    ? saved as Record<string, unknown>
    : {};
  return Object.fromEntries(BUILTIN_DICTIONARY_COLLECTIONS.map(({ source }) => [
    source,
    typeof value[source] === "boolean" ? value[source] : true,
  ])) as BuiltinDictionarySettings;
}

/** Crossword words may use spaces or hyphens as answer separators. */
export function isValidAnswerSpelling(word: string): boolean {
  return /^[A-ZÆØÅ]+(?:[ -][A-ZÆØÅ]+)*$/.test(word);
}

export type DictionaryByLength = ReadonlyMap<number, readonly DictionaryEntry[]>;

/** Source scores express word priority, not the quality of an individual clue. */
export const WORD_SOURCE_SCORES: Readonly<Record<DictionaryEntry["source"], number>> = {
  dannet: 1,
  starter: 1,
  shortClues: 2,
  hyphen: 2,
  custom: 3,
};

/** Score for one dictionary entry and its clue, rather than the spelling overall. */
export function getEntryScore(entry: Pick<DictionaryEntry, "source">): number {
  return WORD_SOURCE_SCORES[entry.source];
}

/** A spelling in multiple sources receives the highest source score, never a sum. */
export function indexWordScores(entries: readonly DictionaryEntry[]): ReadonlyMap<string, number> {
  const scores = new Map<string, number>();
  for (const { word, source } of entries) {
    scores.set(word, Math.max(scores.get(word) ?? 0, WORD_SOURCE_SCORES[source]));
  }
  return scores;
}

export function indexDictionaryByLength(entries: readonly DictionaryEntry[]): DictionaryByLength {
  const index = new Map<number, DictionaryEntry[]>();
  for (const entry of entries) {
    const bucket = index.get(entry.length) ?? [];
    bucket.push(entry);
    index.set(entry.length, bucket);
  }
  return index;
}

// Hand-curated collections live in separate data files by dictionary purpose.
const entries = starterEntries;

const starterDictionary: DictionaryEntry[] = entries.split("\n").flatMap((line) => {
  const parts = line.trim().split("|");
  const [word, ...fields] = parts;
  const hasMetadata = parts.at(-1) === "substantiv" && parts.length >= 4;
  const clues = hasMetadata ? fields.slice(0, -2) : fields;
  const clueGroupId = hasMetadata ? fields.at(-2) : undefined;
  const partOfSpeech = hasMetadata ? fields.at(-1) : undefined;
  return clues.map(clue => ({ word, clue, length: word.replace(/[ -]/g, "").length, clueGroupId, partOfSpeech, source: "starter" as const }));
}).filter(({ word, clue }) => /^[A-ZÆØÅ]+(?:[ -][A-ZÆØÅ]+)*$/.test(word) && Boolean(clue) && clue.length <= 18 && clue.trim().split(/\s+/).length <= 2);

const curatedShortDictionary: DictionaryEntry[] = shortClues.split("\n").flatMap((line) => {
  const [word, ...clues] = line.split("|");
  return clues.map(clue => ({ word, clue, length: word.replace(/[ -]/g, "").length, source: "shortClues" as const }));
});

const bindestrejsDictionary: DictionaryEntry[] = bindestrejsEntries.split("\n").filter(line => line.trim()).flatMap((line) => {
  const [word, ...clues] = line.trim().split("|");
  return clues.filter(clue => clue.length <= 18 && clue.trim().split(/\s+/).length <= 2)
    .map(clue => ({ word, clue, length: word.replace(/[ -]/g, "").length, source: "hyphen" as const }));
}).filter(({ word }) => /^[A-ZÆØÅ]+(?:-[A-ZÆØÅ]+)+$/.test(word));

const dannetDictionary: DictionaryEntry[] = dannetData.map(([word, clue, clueGroupId, partOfSpeech]) => ({
  word, clue, clueGroupId, partOfSpeech, length: word.replace(/[ -]/g, "").length, source: "dannet",
}));

export const dictionary: DictionaryEntry[] = [...curatedShortDictionary, ...starterDictionary, ...bindestrejsDictionary, ...dannetDictionary];
