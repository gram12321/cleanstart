# Application Flow

## State owners

- `src/crossword/` owns dictionary entries, layouts and the constraint solver independently of React. A worker checks suggestions away from the interface thread.
- `src/App.tsx` owns the selected template and slot, entered letters and display state. Custom dictionary entries are stored in browser local storage.

## Designer interactions and rules

- A new template starts empty. Select a slot via its arrow or a letter cell. The shared direction control chooses which word a crossing selects for both writing and autofill; a cell with only one word selects that word. Changing direction also selects the corresponding word at the most recently selected cell, when present. Enter letters directly or insert a suggestion.
- Each displayed suggestion matches all entered letters and has a complete solution using distinct dictionary words. A bounded search may return an uncertain result; those candidates are counted but not presented as confirmed. At most 40 confirmed suggestions are displayed.
- Word autofill checks answers by score and alphabetically within equal scores. Grid autofill searches for the highest total score. Both retain entered letters and show search progress. If the limit is reached, a confirmed best-found answer or grid may be applied with a notice that optimality was not proven; without a confirmed solution, the grid is unchanged. Found-solution counts do not represent all possible solutions because the optimizer prunes branches.
- Changing letters, selection, template or dictionary cancels the previous calculation and starts a new one. Clearing a selected word also clears its crossing letters.
- Named custom dictionaries store word and clue pairs in browser local storage. Each dictionary can independently participate in designer suggestions and autofill; existing custom entries are retained in a default dictionary. The player adds entries to a selected dictionary and uses autofill-enabled dictionaries when generating a puzzle. Puzzle progress is not saved.
- Templates start with connected Scandinavian-style clue areas and slots. A toolbar selects letter entry or tools for replacing cells with letters, dark blocks, directional word separators, or 1 × 1, 2 × 1 and 1 × 2 clue areas. Slots and shared clues are derived from the edited grid, with arrows placed on the outward sides of shared clues. A temporarily invalid grid highlights affected cells, explains structural problems and cannot be searched or published; changing a slot removes its custom clue and replacing a letter removes that letter. Clues derived from DanNet are not individually reviewed.
- Designers select one image-area tool and drag across grid cells to mark a rectangle of any size. As with a dark block, adjacent unused clues and isolated unused letters are repaired. Words do not need to cross the rest of the grid, but each word needs a valid cue. Designers can fill an image area with one of three bundled illustrations or a local upload, then drag within it to adjust the crop. Images are unused as cues by default. Designers click the marker next to a row or column on the image to assign it to the nearest answer; each active assignment displays a directional arrow for players to select. The selected image, crop position and arrow links are included in preview and the locally published puzzle.
- Directional separators represent spaces within an answer; custom dictionary entries may contain spaces. Solving and player navigation skip the separator while retaining its location in the published puzzle.

- The designer can publish a complete grid with distinct dictionary words and optional per-slot clues. The latest published puzzle is stored locally in the browser and shown on the player page; publishing replaces the previous one. Player answers and unfinished designer work are not persisted.
- The restored player page can also generate a random puzzle. Checking and revealing compare against the selected puzzle solution.
