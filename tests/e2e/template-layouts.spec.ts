import { expect, test } from "@playwright/test";
import { createTemplateLayout } from "../../src/crossword/templateLayouts";
import { validateLayout } from "../../src/crossword/layout";

test("each template covers the entire grid with connected words and clues", () => {
  for (const size of [9, 11, 13]) {
    const layout = createTemplateLayout(size);
    expect(layout).not.toBeNull();
    expect(validateLayout(layout!)).toEqual([]);
    expect(layout!.words.length).toBeGreaterThan(20);
    if (size > 9) {
      expect(layout!.clues.some(clue => clue.width === 2)).toBe(true);
      expect(layout!.clues.some(clue => clue.height === 2)).toBe(true);
    }
  }
  expect(createTemplateLayout(8)).toBeNull();
});
