# Application Flow

Document state ownership, domain rules, and user interactions here after they are approved and implemented.

## State owners

- `src/crossword/` owns the dictionary entries, derived word-length index, generated grid and placement rules, independently of React.
- `src/App.tsx` owns the current puzzle, selection, entered letters and display state. Custom dictionary entries are stored in browser local storage.

## Actions and interactions

- Generating a puzzle resets the board. Selecting a clue selects its word; selecting a crossing again switches direction. Players can enter letters, check them, reveal a letter and clear the board.
- Custom entries are added as `WORD;clue` lines and take effect on the next generation.
- The local dictionary includes a reproducibly filtered DanNet release. Short clues are derived from same-synset words, direct hypernyms, short definitions and a Danish city rule; each is tied to the answer's synset. Multiple meanings of a word remain separate candidates. A custom word overrides all built-in candidates for that spelling.
- Dictionary entries store their answer length and source. Older custom entries in local storage are upgraded in memory when loaded; newly saved entries include the derived length and custom source.

## Domain rules

- Each grid is completely covered by letter cells and clue areas. Clue areas may span one or two cells and contain one or two clues. Arrows can turn before an answer starts; selecting a clue highlights its answer.
- The generator chooses a predefined connected layout for the selected size, optionally transposes it, and fills all slots together using indexed crossing constraints and bounded backtracking. It reports an error and keeps the existing puzzle if it cannot fill a new one.
- Answers are distinct and drawn from the supplied dictionary; custom clues override built-in clues for the same spelling. Answers in the current layouts are two to four letters. Automatic clues are not individually reviewed and solutions are not guaranteed unique.
- The layouts currently use clue areas only; the layout model supports image areas, but the playable layouts do not yet include images.
