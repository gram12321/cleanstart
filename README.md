# Ordværk

A Danish crossword app with clues and arrows inside the grid. It generates connected crosswords in three sizes using a local Danish dictionary.

Select a clue or letter and type the answer. Click a crossing again to change direction. The app can check letters, reveal a letter, and clear the board. On narrow screens, scroll the board horizontally.

The dictionary combines a small hand-written list with short clues derived from DanNet. Automatically generated clues are not individually reviewed and may be broad, ambiguous, or unsuitable. Add entries under **Udvid ordbogen**, one per line in the form `ORD;ledetråd`. Custom entries are saved in the current browser and used the next time a puzzle is generated; a custom entry overrides built-in clues for the same word. Words must contain at least two Danish letters and fit in the chosen grid. Puzzle progress is not saved. The generator fills a fixed clues-in-squares layout for each size, or its transpose, without unused cells. It selects crossing words at random; most answers are two to four letters. Clues can have more than one plausible answer.

## Dictionary data and attribution

The bundled DanNet-derived data in `src/crossword/data/dannet.json` is based on [DanNet version 2026-10-02](https://github.com/kuhumcst/DanNet/releases/tag/v2026-10-02), copyright Centre for Language Technology, University of Copenhagen, and the Society for Danish Language and Literature (DSL). The DanNet dataset and this adapted data are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). We extract single-word Danish lemmas of 2–12 letters and derive clues from words in the same synset, direct hypernyms, and short definitions. A specific rule converts Danish city definitions to “Dansk by”. Clues are limited to two words and 18 characters, and cannot contain the answer. At most two clues are kept per answer and synset. The original synset identifier and part of speech are retained. This is a filtered and reformatted subset, not the complete DanNet dataset.

Regenerate the subset with `python scripts/import_dannet.py`; the script downloads the pinned release and verifies its SHA-256 checksum. Alternatively, provide the path to the same downloaded `.xml.gz` file as an argument. DanNet data is bundled locally; the application does not contact DanNet during play.

## Setup

Requires Node.js and pnpm. Install dependencies and start the local app:

```sh
pnpm install
pnpm dev
```

Run the production build and type check with `pnpm build` and `pnpm typecheck`. Run the generator and browser checks with `pnpm test:e2e`.

## Project guidance

- [AGENTS.md](./AGENTS.md) contains repository workflow and boundaries.
- [Working documentation](./docs/WorkingDocs/) holds approved decisions and project notes.
- [Skills](./skills/) contains reusable development and review workflows.

Git is intentionally not initialized in this folder.
