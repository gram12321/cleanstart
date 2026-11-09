# Ordværk

Ordværk har en forside til at løse krydsord og et værksted til at konstruere dem. Vælg et vandret eller lodret ord i designerens tomme felt, og indsæt et af forslagene. Du kan også skrive og slette bogstaver direkte. Klik igen på et krydsningsfelt for at skifte retning.

Hvert vist forslag er kontrolleret mod hele feltet: løseren har fundet en samlet udfyldning med de aktuelle bogstaver og uden gentagne ord. Højst 40 bekræftede forslag vises. Ord, hvor søgningen når beregningsgrænsen, er uafklarede og tælles særskilt. Ingen forslag betyder derfor ikke nødvendigvis, at en løsning er umulig. Et nyt felt starter fra en eksisterende skabelon; automatisk udfyldning er endnu ikke tilgængelig.

Over feltet kan designeren vælge værktøjsikoner til bogstavfelter, sorte felter og ledetrådsfelter på 1 × 1, 2 × 1 eller 1 × 2. Som standard vælges og skrives ord som før; brug **Gør til bogstavfelt** for at ændre et andet felt til et bogstavfelt. Klik på det øverste venstre felt for at placere et større ledetrådsfelt. Flyt en ledetråd ved at ændre det gamle felt til et bogstavfelt og placere et nyt ledetrådsfelt. Et ledetrådsfelt opdeles automatisk, når det starter to ord, og pilene placeres mod svarene. Ændringer kan midlertidigt gøre feltet ugyldigt; problemfelter markeres med rødt, og **Se problemer i feltet** forklarer dem. Ordforslag og udgivelse kræver et gyldigt, sammenhængende felt, hvor hvert ord har mindst ?t bogstav og en ledetråd umiddelbart før ordet. Bogstaver på felter, der bliver til andre felttyper, og ledetråde til ændrede ord fjernes.

Et ordmellemrum med pil indsættes mellem bogstaverne i et svar og viser, at svaret består af flere ord, f.eks. `NEW → YORK`. Tilføj hele udtrykket som `NEW YORK;Amerikansk by` i ordbogen. Pilen tæller ikke som et bogstav, og spilleren springer den over. Ledetrådsfelter og pile bestemmes automatisk ud fra ordenes placering; bøjet pil til en frit valgt ledetråd kan ikke tilføjes manuelt.

Når alle ord er udfyldt, kan designeren udgive krydsordet og bruge ordbogens ledetråde eller skrive sine egne. Det senest udgivne krydsord gemmes lokalt og åbnes på forsiden i samme browser; det deles ikke med andre enheder. Et nyt udgivet krydsord erstatter det forrige. Den ufærdige kladde gemmes ikke ved genindlæsning.

Den lokale ordbog indeholder en mindre håndskrevet liste og ord fra DanNet. Automatiske ledetråde er ikke individuelt gennemgået. Tilføj egne ord under **Udvid ordbogen**, ét pr. linje som `ORD;ledetråd`; de gemmes i browseren.

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
