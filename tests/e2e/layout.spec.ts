import { expect, test } from "@playwright/test";
import { fillLayout } from "../../src/crossword/fillLayout";
import { validateLayout, type GridLayout } from "../../src/crossword/layout";
import type { DictionaryEntry } from "../../src/crossword/dictionary";

const layout: GridLayout = {
  width: 3, height: 3,
  images: [{ row: 0, col: 0, width: 1, height: 1 }],
  clues: [
    { id: "top-left", row: 0, col: 1, width: 1, height: 1 },
    { id: "top-right", row: 0, col: 2, width: 1, height: 1 },
    { id: "left-top", row: 1, col: 0, width: 1, height: 1 },
    { id: "left-bottom", row: 2, col: 0, width: 1, height: 1 },
  ],
  words: [
    { id: "across-1", clueId: "top-left", start: { row: 1, col: 1 }, direction: "across", length: 2 },
    { id: "across-2", clueId: "left-bottom", start: { row: 2, col: 1 }, direction: "across", length: 2 },
    { id: "down-1", clueId: "left-top", start: { row: 1, col: 1 }, direction: "down", length: 2 },
    { id: "down-2", clueId: "top-right", start: { row: 1, col: 2 }, direction: "down", length: 2 },
  ],
};
const entries = (words: string[]): DictionaryEntry[] => words.map(word => ({ word, length: word.length, clue: word, source: "custom" }));

test("complete layouts support bent clues and solve consistent crossing words", () => {
  expect(validateLayout(layout)).toEqual([]);
  const result = fillLayout(layout, entries(["AB", "CD", "AC", "BD"]));
  expect(result.status).toBe("solved");
  if (result.status !== "solved") return;
  const { answers } = result;
  expect(answers["across-1"].word[0]).toBe(answers["down-1"].word[0]);
  expect(answers["across-1"].word[1]).toBe(answers["down-2"].word[0]);
  expect(answers["across-2"].word[0]).toBe(answers["down-1"].word[1]);
  expect(answers["across-2"].word[1]).toBe(answers["down-2"].word[1]);
  expect(new Set(Object.values(answers).map(entry => entry.word)).size).toBe(4);
});

test("a two-cell clue area can contain both clues", () => {
  const combined: GridLayout = {
    ...layout,
    clues: [{ id: "top", row: 0, col: 1, width: 2, height: 1 }, ...layout.clues.slice(2)],
    words: layout.words.map(word => word.clueId.startsWith("top-") ? { ...word, clueId: "top" } : word),
  };
  expect(validateLayout(combined)).toEqual([]);
});

test("invalid, unsatisfiable and search-limited puzzles are not returned as solved", () => {
  const empty = { ...layout, images: [] };
  expect(validateLayout(empty)).toContain("Empty cell at 0,0");
  expect(fillLayout(empty, entries(["AB"])).status).toBe("invalid");
  expect(fillLayout(layout, entries(["AB"])).status).toBe("unsatisfiable");
  expect(fillLayout(layout, entries(["AB", "CD", "AC", "BD"]), 0).status).toBe("limit");
});

test("crossing domains work beyond 32 candidates and retain custom overrides", () => {
  const words = "ABCDEF".split("").flatMap(a => "ABCDEF".split("").map(b => a + b));
  const builtIn = words.map(word => ({ word, length: 2, clue: "built-in", source: "starter" as const }));
  const custom = words.map(word => ({ word, length: 2, clue: "custom", source: "custom" as const }));
  const result = fillLayout(layout, [...builtIn, ...custom]);
  expect(result.status).toBe("solved");
  if (result.status === "solved") {
    const answers = Object.values(result.answers);
    expect(answers.every(entry => entry.source === "custom")).toBe(true);
    expect(new Set(answers.map(entry => entry.word)).size).toBe(4);
  }
});

test("fixed letters constrain the entire solution, including crossings", () => {
  const words = entries(["AB", "CD", "AC", "BD", "AX"]);
  expect(fillLayout(layout, words, 10000, { "1,1": "A", "1,2": "B" }).status).toBe("solved");
  expect(fillLayout(layout, words, 10000, { "1,1": "A", "1,2": "X" }).status).toBe("unsatisfiable");
  expect(fillLayout(layout, words, 10000, { "1,1": "Z" }).status).toBe("unsatisfiable");
});
