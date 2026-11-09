# Application Flow

## State owners

- `src/crossword/` owns dictionary entries, layouts and the constraint solver independently of React. A worker checks suggestions away from the interface thread.
- `src/App.tsx` owns the selected template and slot, entered letters and display state. Custom dictionary entries are stored in browser local storage.

## Designer interactions and rules

- A new template starts empty. Select a slot via its arrow or a letter cell; clicking a crossing again changes direction. Enter letters directly or insert a suggestion.
- Each displayed suggestion matches all entered letters and has a complete solution using distinct dictionary words. A bounded search may return an uncertain result; those candidates are counted but not presented as confirmed. At most 40 confirmed suggestions are displayed.
- Changing letters, selection, template or dictionary cancels the previous calculation and starts a new one. Clearing a selected word also clears its crossing letters.
- Custom entries use `WORD;clue` and override built-in entries of the same spelling. Puzzle progress is not saved.
- Templates start with connected Scandinavian-style clue areas and slots. A toolbar selects letter entry or tools for replacing cells with letters, dark blocks, directional word separators, or 1 × 1, 2 × 1 and 1 × 2 clue areas. Slots and shared clues are derived from the edited grid, with arrows placed on the outward sides of shared clues. A temporarily invalid grid highlights affected cells, explains structural problems and cannot be searched or published; changing a slot removes its custom clue and replacing a letter removes that letter. Clues derived from DanNet are not individually reviewed.
- Directional separators represent spaces within an answer; custom dictionary entries may contain spaces. Solving and player navigation skip the separator while retaining its location in the published puzzle.

- The designer can publish a complete grid with distinct dictionary words and optional per-slot clues. The latest published puzzle is stored locally in the browser and shown on the player page; publishing replaces the previous one. Player answers and unfinished designer work are not persisted.
- The restored player page can also generate a random puzzle. Checking and revealing compare against the selected puzzle solution.
