import { expect, test } from "@playwright/test";
import { dictionary, indexWordScores, type DictionaryEntry } from "../../src/crossword/dictionary";

test("word scores use the highest source score regardless of clue count or order", () => {
  const entry = (word: string, source: DictionaryEntry["source"], clue: string): DictionaryEntry =>
    ({ word, source, clue, length: word.length });
  const entries = [
    entry("ET", "dannet", "En"),
    entry("TO", "starter", "To"),
    entry("TRE", "custom", "Tre"),
    entry("FIRE", "custom", "Egen"),
    entry("FIRE", "dannet", "Første"),
    entry("FIRE", "dannet", "Anden"),
  ];
  const expected = [["ET", 1], ["TO", 2], ["TRE", 3], ["FIRE", 3]];
  expect([...indexWordScores(entries)]).toEqual(expected);
  expect(indexWordScores([...entries].reverse()).get("FIRE")).toBe(3);
});

test("the bundled dictionary retains both handwritten and DanNet source scores", () => {
  const scores = indexWordScores(dictionary);
  const dannetOnly = dictionary.find(entry => entry.source === "dannet" && scores.get(entry.word) === 1);
  const handwritten = dictionary.find(entry => entry.source === "starter");
  const curatedShort = dictionary.find(entry => entry.source === "shortClues");
  expect(dannetOnly).toBeDefined();
  expect(scores.get(handwritten!.word)).toBe(1);
  expect(scores.get(curatedShort!.word)).toBe(2);
});
