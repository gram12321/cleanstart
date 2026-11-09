# Design

Record approved product direction and user-facing decisions here. Keep proposals separate from confirmed decisions.

## Product direction

Ordværk generates and plays Danish-style crosswords, with clues and direction arrows in the grid.

## Confirmed decisions

- Generate connected horizontal and vertical words of varying lengths from Danish words and clues.
- The dictionary combines short clues from a local starting list with clues derived from DanNet; users can add their own word and clue pairs.
- Dictionary answers carry their normalized spelling, derived letter count, source, and optional linguistic/concept metadata. Length buckets are derived from the entries for generator lookup.
- Curated answers that can serve the same clue concept share a `clueGroupId`; each answer still has its own spelling, clue, and length so the generator can choose a crossing-compatible variant.
- Imported DanNet clues are one or two words derived from the source synset, a direct hypernym, a short definition, or the Danish city rule. Entries retain their source synset as a clue group. Automatically derived clues have not been individually reviewed.

- The intended crossword format is Scandinavian clues in squares: fill the grid with letters, clues and optional images rather than unused blocks. Clues can share a square, occupy rectangular areas, and use bent arrows to indicate their answers. Grid layouts and answers must be planned together.

## Implemented layout scope

- The editor uses connected generated templates for each supported size. The current layouts favour answers of two to four letters.
- The layout model supports clue and image areas; the editor displays template non-letter areas as clue or placeholder cells.

## Designer workflow

- Select a horizontal or vertical slot and see words matching its length and current letters. A displayed suggestion must have a verified complete solution for the current grid. Search-limited candidates are reported as uncertain.
- The editor starts from a generated template and supports manual letter entry, inserting suggestions, and editing cell types through a toolbar. It derives slots and up to two outward-facing arrows per clue area; rectangular clue areas, dark blocks and directional separators within multi-word answers are supported. Invalid intermediate layouts highlight affected cells and cannot be searched or published. Automatic completion is not yet implemented. The designer can set per-word clues and publish one completed puzzle locally to the player page.
