# Ordværk

Ordværk har en forside til at løse krydsord og et værksted til at konstruere dem. Vælg et vandret eller lodret ord i designerens tomme felt, og indsæt et af forslagene. Du kan også skrive og slette bogstaver direkte. Vælg **Vandret** eller **Lodret** over feltet for at bestemme, hvilket ord et klik på et krydsningsfelt vælger. Et felt med kun ét ord vælger dette ord.

Hvert vist forslag er kontrolleret mod hele feltet: løseren har fundet en samlet udfyldning med de aktuelle bogstaver og uden gentagne ord. Højst 40 bekræftede forslag vises. Ord, hvor søgningen når beregningsgrænsen, er uafklarede og tælles særskilt. Ingen forslag betyder derfor ikke nødvendigvis, at en løsning er umulig. Et nyt felt starter fra en eksisterende skabelon. Vælg **Autofyld ord** og klik på et felt for at søge efter et muligt ord med højest score; ved samme score prioriteres alfabetisk. **Fyld gitteret** søger efter en samlet udfyldning med højest mulig score. Eksisterende bogstaver bevares. Under søgningen vises fremskridt og fundne løsninger. Hvis beregningsgrænsen nås, indsættes den bedste bekræftede løsning, der er fundet, og det vises, at den ikke nødvendigvis er optimal. Hvis ingen løsning er fundet, ændres feltet ikke.

Over feltet kan designeren vælge værktøjsikoner til bogstavfelter, sorte felter, ledetrådsfelter på 1 × 1, 2 × 1 eller 1 × 2 samt ét billedområdeværktøj, hvor designeren trækker et rektangel i den ønskede størrelse. Billedområder kan fyldes med en indbygget landskabs-, blomster- eller husillustration eller et billede fra computeren. Træk i billedet for at justere beskæringen. Billedet bruges ikke automatisk som cue. Designeren klikker på markøren ud for en række eller kolonne på billedet for at knytte det til det nærmeste svar; en aktiv tilknytning viser en klikbar pil, som spilleren bruger til at vælge svaret. Billedet vises i forhåndsvisningen og følger med det lokalt udgivne krydsord. Som standard vælges og skrives ord som før; brug **Gør til bogstavfelt** for at ændre et andet felt til et bogstavfelt. Klik på feltets øverste venstre celle for at placere et større ledetrådsfelt. Et ledetrådsfelt opdeles automatisk, når det starter to ord, og pilene placeres mod svarene. Ændringer kan midlertidigt gøre feltet ugyldigt; problemfelter markeres med rødt, og **Se problemer i feltet** forklarer dem. Ordforslag og udgivelse kræver et gyldigt felt, hvor hvert ord har mindst ét bogstav og et ledetrådsfelt eller billedområde som cue. Ord behøver ikke at krydse resten af feltet. Bogstaver på felter, der bliver til andre felttyper, og ledetråde til ændrede ord fjernes.

Et ordmellemrum med pil indsættes mellem bogstaverne i et svar og viser, at svaret består af flere ord, f.eks. `NEW → YORK`. Tilføj hele udtrykket som `NEW YORK;Amerikansk by` i ordbogen. Pilen tæller ikke som et bogstav, og spilleren springer den over. Ledetrådsfelter og pile bestemmes automatisk ud fra ordenes placering; bøjet pil til en frit valgt ledetråd kan ikke tilføjes manuelt.

Når alle ord er udfyldt, kan designeren udgive krydsordet og bruge ordbogens ledetråde eller skrive sine egne. Udgivne krydsord gemmes lokalt og kan vælges på forsiden i samme browser; de deles ikke med andre enheder. Spillerens fremgang gemmes automatisk. Designeren kan navngive og gemme flere ufærdige kladder og åbne dem igen senere. Udgivelse tilføjer en ny kopi til spillerens liste.

Den indbyggede ordbog indeholder håndskrevne lister og ord fra DanNet. Automatiske ledetråde er ikke individuelt gennemgået. Tilføj egne ord under **Udvid ordbogen**, ét pr. linje som `ORD;ledetråd`; de gemmes i browseren.

Ord har en kildescore til prioritering af forslag: den håndskrevne grundliste og DanNet giver 1 point, `ShortClues` giver 2 point og egne ord 3 point. Forslagets viste point følger kilden til den enkelte ledetråd; samme ord kan derfor vise forskellige point ved forskellige ledetråde. Når ord prioriteres i autofyldning, bruges den højeste score blandt dets ordbogskilder; pointene lægges ikke sammen.

Samme svar kan have flere ledetråde, og samme ledetråd kan bruges til flere svar. I den indbyggede ordbog står flere ledetråde på samme linje, adskilt af `|`, for eksempel `Å|Lille vandløb|Alternativet`. For egne ord i værkstedet skrives ledetrådene på samme linje efter svaret, adskilt af semikolon: `Å;Lille vandløb;Alternativet`. Flere svar til samme ledetråd kan også skrives som `Pigenavn: Hanne|Sigrid`. Begge formater kan bruges både på forsiden og i værkstedet. Hver kombination vises som et separat valg under ordforslag; klik på den ønskede kombination for at indsætte svaret og vælge ledetråden. Ændres svarbogstaverne efterfølgende, ryddes ledetråden for berørte ord.

Den håndskrevne samling indeholder også korte krydsordssvar, blandt andet landekoder, partibogstaver og symboler for måleenheder. Symboler skrives med store bogstaver i feltet, selv når deres normale skrivemåde bruger små bogstaver. Landekoder følger [ISO 3166](https://www.iso.org/iso-3166-country-codes.html), og enhedssymbolerne følger [SI-systemet](https://www.bipm.org/en/measurement-units).

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
