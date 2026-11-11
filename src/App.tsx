import { customEntryKey, parseCustomEntries, loadCustomDictionaries, saveCustomDictionaries, type CustomDictionary } from "./crossword/customDictionary";
import { useEffect, useMemo, useRef, useState } from "react";
import { dictionary, indexWordScores, type DictionaryEntry } from "./crossword/dictionary";
import { createTemplateLayout } from "./crossword/templateLayouts";
import { answerLetters, cluePresentation, fitsBreaks, imageCueTargets, layoutIssues, wordCells, type GridLayout, type GridWord } from "./crossword/layout";
import { editLayout, resizeImageArea, sameSlot, type LayoutTool } from "./crossword/editLayout";
import { puzzleFromLayout, type Puzzle } from "./crossword/generator";
import { Player } from "./Player";
import "./player.css";

const keyOf = (row: number, col: number) => `${row},${col}`;
const tools: { id: "write" | "autofill" | LayoutTool; label: string; icon: string; shape?: string }[] = [
  { id: "write", label: "Bogstavfelt / vælg ord", icon: "A" },
  { id: "autofill", label: "Autofyld ord", icon: "?" },
  { id: "letter", label: "Gør til bogstavfelt", icon: "A", shape: "letter" },
  { id: "clue", label: "Ledetrådsfelt 1 × 1", icon: "↘", shape: "clue" },
  { id: "wide", label: "Ledetrådsfelt 2 × 1", icon: "↘", shape: "wide" },
  { id: "tall", label: "Ledetrådsfelt 1 × 2", icon: "↘", shape: "tall" },
  { id: "block", label: "Sort felt", icon: "", shape: "dark" },
  { id: "image-area", label: "Billedområde · træk over felter", icon: "▧", shape: "wide" },
  { id: "arrow-across", label: "Ordmellemrum →", icon: "→", shape: "clue" },
  { id: "arrow-down", label: "Ordmellemrum ↓", icon: "↓", shape: "clue" },
];
function describeLayoutError(error: string, layout: GridLayout): string {
  const wordId = /^(?:Missing clue for|Invalid word:|Clue cannot point to|Word outside grid:|Missing arrow in) (.+)$/.exec(error)?.[1];
  if (wordId) {
    const word = layout.words.find(item => item.id === wordId);
    if (word) {
      const location = `Ord fra række ${word.start.row + 1}, kolonne ${word.start.col + 1} (${word.direction === "across" ? "vandret" : "lodret"})`;
      if (error.startsWith("Missing clue")) return `${location} mangler et ledetrådsfelt.`;
      if (error.startsWith("Invalid word")) return `${location} skal have mindst ét bogstav.`;
      if (error.startsWith("Clue cannot")) return `${location} skal have en fri pil fra ledetrådsfeltet.`;
      if (error.startsWith("Missing arrow")) return `${location} mangler en pil ved ordmellemrummet.`;
      return `${location} går uden for feltet.`;
    }
  }
  const location = /(?:at )(\d+),(\d+)/.exec(error);
  if (location) {
    const position = `række ${Number(location[1]) + 1}, kolonne ${Number(location[2]) + 1}`;
    if (error.startsWith("Unused arrow")) return `Pilen i ${position} skal forbinde to dele af et svar.`;
    if (error.startsWith("Empty cell")) return `Bogstavfeltet i ${position} mangler et ord.`;
    return `Kontrollér feltet i ${position}.`;
  }
  const clueId = /^Clue (.+) must/.exec(error)?.[1];
  const clue = layout.clues.find(item => item.id === clueId);
  if (clue) return `Ledetrådsfeltet i række ${clue.row + 1}, kolonne ${clue.col + 1} skal pege på ét eller to ord.`;
  if (error === "No words") return "Feltet skal indeholde mindst ét ord.";
  return "Kontrollér feltets opbygning.";
}
function makeLayout(size: number): GridLayout {
  const layout = createTemplateLayout(size);
  if (!layout) throw new Error("Kunne ikke oprette et felt");
  return layout;
}
type PublishedItem = { id: string; name: string; puzzle: Puzzle };
type Draft = { id: string; name: string; size: number; layout: GridLayout; letters: Record<string, string>; clues: Record<string, string> };
const LIBRARY_KEY = "ordvaerk-library-v1";
const DRAFTS_KEY = "ordvaerk-drafts-v1";
function loadList<T>(key: string): T[] {
  try { const value = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function loadLibrary(): { items: PublishedItem[]; error: string } {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    const saved: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(saved) || !saved.every(item => item && typeof item.id === "string" && typeof item.name === "string" && item.puzzle && Array.isArray(item.puzzle.cells) && Array.isArray(item.puzzle.placements))) throw new Error("Invalid library");
    return { items: saved as PublishedItem[], error: "" };
  } catch {
    return { items: [], error: "Krydsordsbiblioteket kunne ikke indlæses eller gemmes. De eksisterende data er ikke ændret." };
  }
}
export function App() {
  const [dictionaries, setDictionaries] = useState(loadCustomDictionaries);
  const [initialLibrary] = useState(loadLibrary);
  const [storageError, setStorageError] = useState(initialLibrary.error);
  function updateDictionaries(next: CustomDictionary[]) {
    try { saveCustomDictionaries(next); setDictionaries(next); setStorageError(""); }
    catch { setStorageError("Ordbøgerne kunne ikke gemmes i browseren."); }
  }
  const [page, setPage] = useState<"player" | "designer" | "preview">("player");
  const [justPublished, setJustPublished] = useState(false);
  const [library, setLibrary] = useState<PublishedItem[]>(initialLibrary.items);
  function publishPuzzle(puzzle: Puzzle, name: string) {
    if (initialLibrary.error) throw new Error("Library unavailable");
    const next = [...library, { id: crypto.randomUUID(), name, puzzle }];
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    setLibrary(next);
    setJustPublished(true);
  }
  const published = library.at(-1)?.puzzle ?? null;
  const [preview, setPreview] = useState<Puzzle | null>(null);
  return <><nav className="site-nav" aria-label="Vælg side"><button aria-current={page === "player" ? "page" : undefined} onClick={() => setPage("player")}>Løs krydsord</button><button aria-current={page === "designer" ? "page" : undefined} onClick={() => { setJustPublished(false); setPage("designer"); }}>Designerværksted</button></nav>{storageError && <p role="alert">{storageError}</p>}<div hidden={page !== "player"}>{page === "player" && <Player published={published} library={library} preferPublished={justPublished} dictionaries={dictionaries} onDictionariesChange={updateDictionaries} />}</div><div hidden={page !== "designer"}><Designer dictionaries={dictionaries} onDictionariesChange={updateDictionaries} onPublish={publishPuzzle} onPreview={puzzle => { setPreview(puzzle); setPage("preview"); }} /></div>{page === "preview" && preview && <><div className="preview-notice"><strong>Forhåndsvisning af kladde</strong><span>Krydsordet er ikke udgivet. Her kan du se feltet og ledetrådene, som spilleren vil se dem.</span><button onClick={() => setPage("designer")}>Tilbage til designeren</button></div><Player published={preview} preview dictionaries={dictionaries} onDictionariesChange={updateDictionaries} /></>}</>;
}
function Designer({ onPublish, onPreview, dictionaries, onDictionariesChange }: { onPublish: (puzzle: Puzzle, name: string) => void; onPreview: (puzzle: Puzzle) => void; dictionaries: CustomDictionary[]; onDictionariesChange: (next: CustomDictionary[]) => void }) {
  const entries = useMemo(() => [...dictionaries.filter(item => item.showSuggestions).flatMap(item => item.entries), ...dictionary], [dictionaries]);
  const autofillEntries = useMemo(() => [...dictionaries.filter(item => item.useAutofill).flatMap(item => item.entries), ...dictionary], [dictionaries]);
  const allEntries = useMemo(() => [...dictionaries.flatMap(item => item.entries), ...dictionary], [dictionaries]);
  const [dictionaryId, setDictionaryId] = useState(dictionaries[0]?.id ?? "");
  const [designerTab, setDesignerTab] = useState<"workshop" | "dictionaries">("workshop");
  const currentDictionary = dictionaries.find(item => item.id === dictionaryId) ?? dictionaries[0];
  const [newName, setNewName] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const wordScores = useMemo(() => indexWordScores(entries), [entries]);
  const [drafts, setDrafts] = useState<Draft[]>(() => loadList<Draft>(DRAFTS_KEY).filter(item => item && typeof item.id === "string" && typeof item.name === "string" && item.layout && Array.isArray(item.layout.words) && Array.isArray(item.layout.images) && item.letters && item.clues));
  const [draftId, setDraftId] = useState("");
  const [designName, setDesignName] = useState("");
  const [size, setSize] = useState(9);
  const [layout, setLayout] = useState(() => makeLayout(9));
  const [selectedId, setSelectedId] = useState(layout.words[0]?.id);
  const [direction, setDirection] = useState<"across" | "down">(layout.words[0]?.direction ?? "across");
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [letters, setLetters] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<{ entry: DictionaryEntry; clues: { clue: string; score: number }[] }[]>([]);
  const [suggestionSort, setSuggestionSort] = useState<"score" | "alphabetical">("score");
  const [showEachWordOnce, setShowEachWordOnce] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0, uncertain: 0, done: false });
  const [clues, setClues] = useState<Record<string, string>>({});
  const [publishMessage, setPublishMessage] = useState("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [tool, setTool] = useState<"write" | "autofill" | LayoutTool>("write");
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [illustration, setIllustration] = useState("preset:landscape");
  const [imageDrag, setImageDrag] = useState<{ start: { row: number; col: number }; end: { row: number; col: number } } | null>(null);
  const imageDragRef = useRef<typeof imageDrag>(null);
  const imagePanRef = useRef<{ row: number; col: number; x: number; y: number; offsetX: number; offsetY: number; availableX: number; availableY: number } | null>(null);
  const [layoutMessage, setLayoutMessage] = useState("");
  const [autofillProgress, setAutofillProgress] = useState<string | null>(null);
  const issues = useMemo(() => layoutIssues(layout), [layout]);
  const layoutErrors = useMemo(() => issues.map(issue => issue.message), [issues]);
  const problemCells = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const issue of issues) for (const cell of issue.cells) {
      const key = keyOf(cell.row, cell.col);
      const messages = result.get(key) ?? new Set<string>();
      messages.add(describeLayoutError(issue.message, layout));
      result.set(key, messages);
    }
    return result;
  }, [issues, layout]);
  const selectedImage = layout.images.find(image => image.id === selectedImageId);
  const selected = layout.words.find(word => word.id === selectedId);
  const selectedKeys = new Set(selected ? wordCells(selected).map(cell => keyOf(cell.row, cell.col)) : []);
  const sortedSuggestions = [...suggestions].sort((a, b) => suggestionSort === "score"
    ? (wordScores.get(b.entry.word) ?? 0) - (wordScores.get(a.entry.word) ?? 0) || a.entry.word.localeCompare(b.entry.word, "da")
    : a.entry.word.localeCompare(b.entry.word, "da"));
  const sortedSuggestionClues = suggestions.flatMap(({ entry, clues }) => clues.map(item => ({ entry, ...item }))).sort((a, b) => suggestionSort === "score"
    ? b.score - a.score || a.entry.word.localeCompare(b.entry.word, "da") || a.clue.localeCompare(b.clue, "da")
    : a.entry.word.localeCompare(b.entry.word, "da") || a.clue.localeCompare(b.clue, "da"));
  const byCell = useMemo(() => {
    const result = new Map<string, GridWord[]>();
    layout.words.forEach(word => wordCells(word).forEach(cell => { const key = keyOf(cell.row, cell.col); result.set(key, [...(result.get(key) ?? []), word]); }));
    return result;
  }, [layout]);
  useEffect(() => {
    setSuggestions([]); setProgress({ checked: 0, total: 0, uncertain: 0, done: false });
    if (!selectedId || layoutErrors.length) return;
    const worker = new Worker(new URL("./crossword/suggestions.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = event => {
      const data = event.data;
      if (data.type === "candidate") setSuggestions(current => [...current, { entry: data.entry, clues: data.clues }]);
      else setProgress({ checked: data.checked, total: data.total, uncertain: data.uncertain, done: data.type === "done" });
    };
    worker.postMessage({ layout, entries, selected: selectedId, letters });
    return () => worker.terminate();
  }, [layout, entries, selectedId, letters, layoutErrors]);
  useEffect(() => {
    if (!imageDrag) return;
    const finish = () => finishImageArea();
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [!!imageDrag]);
  const autofillWorker = useRef<Worker | null>(null);
  useEffect(() => () => { if (autofillWorker.current) { autofillWorker.current.terminate(); autofillWorker.current = null; setAutofillProgress(null); } }, [layout, autofillEntries, letters]);
  function cancelAutofill() {
    autofillWorker.current?.terminate(); autofillWorker.current = null;
    setAutofillProgress(null); setLayoutMessage("Autofyldning afbrudt.");
  }
  function startAutofill(id?: string) {
    if (layoutErrors.length) { setLayoutMessage("Ret feltets opbygning før autofyldning."); return; }
    autofillWorker.current?.terminate();
    const worker = new Worker(new URL("./crossword/autofill.worker.ts", import.meta.url), { type: "module" });
    autofillWorker.current = worker;
    setLayoutMessage("Søger efter den bedste udfyldning …");
    setAutofillProgress(id ? "Undersøger ord …" : "Undersøger muligheder …");
    worker.onmessage = event => {
      const result = event.data;
      if (result.type === "progress") {
        setAutofillProgress(result.mode === "grid"
          ? `${result.nodes.toLocaleString("da-DK")} søgetrin undersøgt · ${result.solutions.toLocaleString("da-DK")} gyldige løsninger fundet${result.bestScore === null ? "" : ` · bedste score: ${result.bestScore} point`}. Antallet er fundne løsninger, ikke det samlede antal.`
          : `${result.checked.toLocaleString("da-DK")} af ${result.total.toLocaleString("da-DK")} ord undersøgt · ${result.uncertain} uafklarede · ${result.nodes.toLocaleString("da-DK")} søgetrin for det aktuelle ord.`);
        return;
      }
      worker.terminate(); autofillWorker.current = null;
      if (id && result.searchStats) {
        const stats = result.searchStats as { checked: number; total: number; uncertain: number; nodes: number };
        const summary = result.status === "solved"
          ? `Bedste ord fundet efter at have afprøvet ${stats.checked} af ${stats.total} kandidater. De resterende blev sprunget over, fordi ordene afprøves i scoreorden.`
          : result.answers
            ? `Et muligt ord blev fundet efter ${stats.checked} af ${stats.total} kandidater. ${stats.uncertain} kandidater med højere prioritet var uafklarede, så det er ikke sikkert, at ordet har den højeste score.`
            : `Afprøvet ${stats.checked} af ${stats.total} kandidater; ${stats.uncertain} var uafklarede. Der blev ikke fundet en bekræftet løsning.`;
        setAutofillProgress(`${summary} Sidste søgning: ${stats.nodes.toLocaleString("da-DK")} søgetrin.`);
      }
      if (!result.answers) { setLayoutMessage(result.status === "limit" ? "Beregningsgrænsen blev nået uden en bekræftet løsning. Prøv med flere bogstaver." : "Ingen udfyldning passer til de nuværende bogstaver."); return; }
      const next = { ...letters };
      for (const word of layout.words) {
        const entry = result.answers[word.id] as DictionaryEntry | undefined;
        if (entry) wordCells(word).forEach((cell, i) => { next[keyOf(cell.row, cell.col)] = answerLetters(entry.word)[i]; });
      }
      updateLetters(next);
      setLayoutMessage(result.status === "limit" ? (id ? "Et gyldigt ord er indsat. Nogle højere prioriterede ord kunne ikke afklares inden for beregningsgrænsen." : "Den bedste fundne løsning er indsat. Beregningsgrænsen blev nået, så en højere score kan være mulig.") : id ? "Ordet er autofyldt." : "Feltet er udfyldt med højest mulig samlet ordscore.");
    };
    worker.postMessage({ layout, entries: autofillEntries, letters, selected: id });
  }
  function newLayout() { setDraftId(""); setDesignName(""); const next = makeLayout(size); setLayout(next); setSelectedId(next.words[0]?.id); setDirection(next.words[0]?.direction ?? "across"); setSelectedCell(null); setLetters({}); setClues({}); setPublishMessage(""); setLayoutMessage(""); }
  function chooseDirection(next: "across" | "down") {
    if (autofillWorker.current) cancelAutofill();
    setDirection(next);
    const word = selectedCell && byCell.get(selectedCell)?.find(item => item.direction === next);
    if (word) setSelectedId(word.id);
  }
  function chooseCell(row: number, col: number) {
    const key = keyOf(row, col);
    const words = byCell.get(key) ?? [];
    if (!words.length) return;
    const word = words.find(item => item.direction === direction) ?? words[0];
    if (tool !== "autofill" && autofillWorker.current) cancelAutofill();
    setSelectedCell(key);
    setSelectedId(word.id);
    if (tool === "autofill") startAutofill(word.id);
  }
  function changeWordCue(target: GridWord, cueId: string) {
    const wordId = target.id;
    const current = layout.words.find(word => word.id === wordId);
    if (!current) {
      setLayout({ ...layout, words: [...layout.words, { ...target, clueId: cueId, textClueId: target.clueId }] });
      setPublishMessage("");
      return;
    }
    const toImage = layout.images.some(image => image.id === cueId);
    const removeAddedWord = !toImage && current.textClueId?.startsWith("missing-");
    const next = { ...layout, words: layout.words.filter(word => !removeAddedWord || word.id !== wordId).map(word => word.id !== wordId ? word : {
      ...word,
      clueId: cueId,
      ...(toImage ? { textClueId: word.textClueId ?? word.clueId } : { textClueId: undefined }),
    }) };
    setLayout(next);
    setPublishMessage("");
  }
  function updateLetters(next: Record<string, string>, choice?: { id: string; clue: string }) {
    const changed = new Set([...Object.keys(letters), ...Object.keys(next)].filter(key => letters[key] !== next[key]));
    const affected = new Set(layout.words.filter(word => wordCells(word).some(cell => changed.has(keyOf(cell.row, cell.col)))).map(word => word.id));
    setLetters(next);
    setClues(current => {
      const retained = Object.fromEntries(Object.entries(current).filter(([id]) => !affected.has(id)));
      if (choice) retained[choice.id] = choice.clue;
      return retained;
    });
  }
  function applyWord(word: string, clue: string) {
    if (!selected) return;
    const spelling = answerLetters(word);
    const next = { ...letters };
    wordCells(selected).forEach((cell, i) => { next[keyOf(cell.row, cell.col)] = spelling[i]; });
    updateLetters(next, { id: selected.id, clue });
  }
  function changeCell(row: number, col: number) {
    if (tool === "write" || tool === "autofill") return;
    if (tool === "image-area") return;
    const next = editLayout(layout, { row, col }, tool);
    if (!next) { setLayoutMessage("Feltet er for tæt på kanten til den valgte størrelse."); return; }
    const surviving = new Set(next.words.filter(word => {
      const old = layout.words.find(item => item.id === word.id);
      return old && sameSlot(old, word);
    }).map(word => word.id));
    setClues(current => Object.fromEntries(Object.entries(current).filter(([id]) => surviving.has(id))));
    setLetters(current => Object.fromEntries(Object.entries(current).filter(([key]) => {
      const [r, c] = key.split(",").map(Number);
      return !next.clues.some(area => r >= area.row && r < area.row + area.height && c >= area.col && c < area.col + area.width)
        && !next.images.some(area => r >= area.row && r < area.row + area.height && c >= area.col && c < area.col + area.width)
        && !next.blocks?.some(item => item.row === r && item.col === c)
        && !next.arrows?.some(item => item.row === r && item.col === c);
    })));
    if (tool.startsWith("image-")) {
      const chosen = illustration;
      next.images = next.images.map(area => area.row === row && area.col === col ? { ...area, illustration: chosen } : area);
    }
    setLayout(next);
    setSelectedId(current => next.words.some(word => word.id === current) ? current : next.words[0]?.id);
    setPublishMessage("");
    setLayoutMessage("Feltet er ændret. Ledetråde til ændrede ord er ryddet.");
  }
  function applyImageArea(selection: NonNullable<typeof imageDrag>) {
    const row = Math.min(selection.start.row, selection.end.row);
    const col = Math.min(selection.start.col, selection.end.col);
    const width = Math.abs(selection.end.col - selection.start.col) + 1;
    const height = Math.abs(selection.end.row - selection.start.row) + 1;
    const next = editLayout(layout, { row, col }, "image-area", { width, height });
    if (!next) return;
    next.images = next.images.map(area => area.row === row && area.col === col && area.width === width && area.height === height ? { ...area, illustration } : area);
    const surviving = new Set(next.words.filter(word => {
      const old = layout.words.find(item => item.id === word.id);
      return old && sameSlot(old, word);
    }).map(word => word.id));
    setClues(current => Object.fromEntries(Object.entries(current).filter(([id]) => surviving.has(id))));
    setLetters(current => Object.fromEntries(Object.entries(current).filter(([cellKey]) => {
      const [r, c] = cellKey.split(",").map(Number);
      return !next.clues.some(area => r >= area.row && r < area.row + area.height && c >= area.col && c < area.col + area.width)
        && !next.images.some(area => r >= area.row && r < area.row + area.height && c >= area.col && c < area.col + area.width)
        && !next.blocks?.some(item => item.row === r && item.col === c)
        && !next.arrows?.some(item => item.row === r && item.col === c);
    })));
    setLayout(next);
    setSelectedId(current => next.words.some(word => word.id === current) ? current : next.words[0]?.id);
    setPublishMessage("");
    setLayoutMessage(`Billedområde på ${width} × ${height} felter er markeret.`);
    setTool("write");
  }
  function startImageArea(row: number, col: number) {
    if (tool !== "image-area") return;
    const existing = layout.images.find(area => row >= area.row && row < area.row + area.height && col >= area.col && col < area.col + area.width);
    if (existing) { setSelectedImageId(existing.id); return; }
    setSelectedImageId(null);
    const selection = { start: { row, col }, end: { row, col } };
    imageDragRef.current = selection;
    setImageDrag(selection);
  }
  function extendImageArea(row: number, col: number) {
    if (tool !== "image-area" || !imageDragRef.current) return;
    const selection = { ...imageDragRef.current, end: { row, col } };
    imageDragRef.current = selection;
    setImageDrag(selection);
  }
  function finishImageArea() {
    const selection = imageDragRef.current;
    imageDragRef.current = null;
    setImageDrag(null);
    if (selection) applyImageArea(selection);
  }
  function updateSelectedImage(changes: Partial<Pick<NonNullable<typeof selectedImage>, "fit" | "offsetX" | "offsetY" | "illustration">>) {
    if (!selectedImage) return;
    setLayout(current => ({ ...current, images: current.images.map(image => image.id === selectedImage.id ? { ...image, ...changes } : image) }));
    setPublishMessage("");
  }
  function resizeSelectedImage(width: number, height: number) {
    if (!selectedImage) return;
    const next = resizeImageArea(layout, selectedImage.id, width, height);
    if (!next) { setLayoutMessage("Billedområdet kan ikke ændres til den størrelse eller overlappe et andet billede."); return; }
    const surviving = new Set(next.words.filter(word => { const old = layout.words.find(item => item.id === word.id); return old && sameSlot(old, word); }).map(word => word.id));
    setClues(current => Object.fromEntries(Object.entries(current).filter(([id]) => surviving.has(id))));
    setLetters(current => Object.fromEntries(Object.entries(current).filter(([cellKey]) => {
      const [r, c] = cellKey.split(",").map(Number);
      return !next.clues.some(area => r >= area.row && r < area.row + area.height && c >= area.col && c < area.col + area.width)
        && !next.images.some(area => r >= area.row && r < area.row + area.height && c >= area.col && c < area.col + area.width)
        && !next.blocks?.some(item => item.row === r && item.col === c) && !next.arrows?.some(item => item.row === r && item.col === c);
    })));
    setLayout(next);
    setSelectedId(current => next.words.some(word => word.id === current) ? current : next.words[0]?.id);
    setLayoutMessage(`Billedområdet er nu ${width} × ${height} felter.`);
    setPublishMessage("");
  }
  function updateDictionary(next: CustomDictionary) {
    onDictionariesChange(dictionaries.map(item => item.id === next.id ? next : item));
  }
  function addWords() {
    const parsed = parseCustomEntries(text);
    if (!parsed || !currentDictionary) { setMessage("Skriv f.eks. Pigenavn: Hanne|Sigrid eller ORD;ledetråd."); return; }
    const merged = new Map(currentDictionary.entries.map(entry => [customEntryKey(entry), entry]));
    parsed.forEach(entry => merged.set(customEntryKey(entry), entry));
    updateDictionary({ ...currentDictionary, entries: [...merged.values()] });
    setText(""); setMessage(`${parsed.length} ord er gemt.`);
  }
  function transferEntry(entry: DictionaryEntry, targetId: string, move: boolean) {
    if (!currentDictionary || !targetId || targetId === currentDictionary.id) return;
    const target = dictionaries.find(item => item.id === targetId);
    if (!target) return;
    const key = customEntryKey(entry);
    const targetEntries = new Map(target.entries.map(item => [customEntryKey(item), item]));
    targetEntries.set(key, entry);
    onDictionariesChange(dictionaries.map(item => {
      if (item.id === target.id) return { ...item, entries: [...targetEntries.values()] };
      if (move && item.id === currentDictionary.id) return { ...item, entries: item.entries.filter(sourceEntry => customEntryKey(sourceEntry) !== key) };
      return item;
    }));
    setMessage(move ? `"${entry.word}" blev flyttet til ${target.name}.` : `"${entry.word}" blev kopieret til ${target.name}.`);
  }
  function saveEdit(key: string) {
    if (!currentDictionary) return;
    const parsed = parseCustomEntries(editText);
    if (!parsed || parsed.length !== 1) { setMessage("Skriv ét ord og én ledetråd som ORD;ledetråd."); return; }
    const merged = new Map(currentDictionary.entries.filter(entry => customEntryKey(entry) !== key).map(entry => [customEntryKey(entry), entry]));
    merged.set(customEntryKey(parsed[0]), parsed[0]);
    updateDictionary({ ...currentDictionary, entries: [...merged.values()] });
    setEditingKey(null); setMessage("Ordet er opdateret.");
  }
  function previewPuzzle() {
    if (layoutErrors.length || !layout.words.length) { setPublishMessage("Ret feltets opbygning før forhåndsvisning."); return; }
    const answers: Record<string, DictionaryEntry> = {};
    for (const word of layout.words) {
      const spelling = wordCells(word).map(cell => letters[keyOf(cell.row, cell.col)] ?? "?").join("");
      const entry = allEntries.find(item => answerLetters(item.word) === spelling && fitsBreaks(word, item.word));
      answers[word.id] = { word: entry?.word ?? spelling, length: word.length, clue: clues[word.id]?.trim() || entry?.clue || "", source: entry?.source ?? "custom" };
    }
    setPublishMessage("");
    onPreview(puzzleFromLayout(layout, answers));
  }
  function saveDraft() {
    const name = designName.trim();
    if (!name) { setPublishMessage("Giv designet et navn før det gemmes."); return; }
    const id = draftId || crypto.randomUUID();
    const draft = { id, name, size: layout.width, layout, letters, clues };
    const next = [...drafts.filter(item => item.id !== id), draft];
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(next)); setDrafts(next); setDraftId(id); setPublishMessage("Kladden er gemt i denne browser."); }
    catch { setPublishMessage("Kladden kunne ikke gemmes i browseren. Kontrollér pladsen i browseren."); }
  }
  function openDraft(id: string) {
    const draft = drafts.find(item => item.id === id);
    if (!draft) return;
    autofillWorker.current?.terminate(); autofillWorker.current = null;
    setDraftId(id); setDesignName(draft.name); setSize(draft.size); setLayout(draft.layout); setLetters(draft.letters); setClues(draft.clues);
    setSelectedId(draft.layout.words[0]?.id); setDirection(draft.layout.words[0]?.direction ?? "across"); setSelectedCell(null); setSelectedImageId(null); setTool("write"); setPublishMessage("Kladden er åbnet."); setLayoutMessage("");
  }
  function publish() {
    if (layoutErrors.length || !layout.words.length) { setPublishMessage("Ret feltets opbygning før udgivelse."); return; }
    const answers: Record<string, DictionaryEntry> = {};
    const used = new Set<string>();
    for (const word of layout.words) {
      const spelling = wordCells(word).map(cell => letters[keyOf(cell.row, cell.col)] ?? "").join("");
      if (spelling.length !== word.length) { setPublishMessage("Udfyld alle bogstavfelter før udgivelse."); return; }
      const entry = allEntries.find(item => answerLetters(item.word) === spelling && fitsBreaks(word, item.word));
      if (!entry) { setPublishMessage(`Ordet ${spelling} findes ikke i ordbogen. Tilføj det før udgivelse.`); return; }
      if (used.has(entry.word)) { setPublishMessage(`Ordet ${entry.word} er brugt flere gange.`); return; }
      used.add(entry.word);
      answers[word.id] = { ...entry, clue: clues[word.id]?.trim() || entry.clue };
    }
    const puzzle = puzzleFromLayout(layout, answers);
    try { onPublish(puzzle, designName.trim() || `Krydsord ${new Date().toLocaleString("da-DK")}`); setPublishMessage("Krydsordet er udgivet på forsiden i denne browser."); }
    catch { setPublishMessage("Krydsordet kunne ikke gemmes i browseren."); }
  }
  const pattern = selected ? wordCells(selected).map((cell, i) => `${selected.breaks?.includes(i) ? " " : ""}${letters[keyOf(cell.row, cell.col)] || "·"}`).join("") : "";
  return <div className="editor-shell">
    <header className="editor-header"><div className="brand">ordværk<span className="brand-dot">.</span></div><span>KRYDSORDSVÆRKSTED</span></header>
    <main className="editor-main">
      <div className="editor-title"><div><p className="eyebrow">{designerTab === "workshop" ? "KONSTRUÉR ET KRYDSORD" : "DIT PERSONLIGE ORDARKIV"}</p><h1>{designerTab === "workshop" ? <>Find de rigtige <em>ord.</em></> : <>Dine egne <em>ordbøger.</em></>}</h1><p>{designerTab === "workshop" ? "Vælg et ord i feltet, og se hvilke muligheder der kan føre til en samlet løsning." : "Saml og vedligehold dine egne ord og ledetråde."}</p></div></div>

    <nav className="designer-tabs" aria-label="Designerens værktøjer"><button type="button" aria-current={designerTab === "workshop" ? "page" : undefined} onClick={() => setDesignerTab("workshop")}>Krydsord</button><button type="button" aria-current={designerTab === "dictionaries" ? "page" : undefined} onClick={() => setDesignerTab("dictionaries")}>Egne ordbøger <span>{dictionaries.length}</span></button></nav>
          {designerTab === "workshop" && <section className="designer-control-bar" aria-label="Indstillinger for krydsord">
        <div className="designer-control-group grid-setup"><span className="designer-control-label">GITTER</span><div className="designer-control-row"><label htmlFor="size">Feltets størrelse</label><select id="size" value={size} onChange={event => setSize(Number(event.target.value))}><option value={9}>9 × 9</option><option value={11}>11 × 11</option><option value={13}>13 × 13</option></select><button type="button" className="secondary-action" onClick={newLayout}>Nyt tomt felt</button></div></div>
        <div className="designer-control-group draft-setup"><span className="designer-control-label">KLADDE</span><div className="designer-control-row"><input aria-label="Designets navn" value={designName} onChange={event => setDesignName(event.target.value)} placeholder="Navngiv designet" /><button type="button" className="secondary-action" onClick={saveDraft}>Gem kladde</button>{drafts.length > 0 && <select aria-label="Åbn gemt kladde" value={draftId} onChange={event => openDraft(event.target.value)}><option value="">Åbn gemt kladde</option>{drafts.map(draft => <option key={draft.id} value={draft.id}>{draft.name}</option>)}</select>}</div></div>
        <div className="designer-control-group publish-setup"><span className="designer-control-label">KRYDSORD</span><div className="designer-control-row"><button type="button" className="secondary-action" onClick={previewPuzzle}>Forhåndsvis</button><button type="button" className="primary-action" onClick={publish}>Udgiv krydsord</button></div></div>
        <p className="designer-control-status" role="status">{publishMessage}</p>
      </section>}
    {designerTab === "workshop" && <div className="editor-workspace"><section className="editor-board-panel"><div className="panel-heading"><div><span>01 / FELT</span><h2>Dit krydsord</h2></div><div><button className="subtle" onClick={() => startAutofill()}>Fyld gitteret</button><button className="subtle" onClick={() => updateLetters({})}>Ryd alle bogstaver</button></div></div>
    <div className="layout-tool"><span>Rediger feltet</span><div className="layout-tool-buttons" role="group" aria-label="Redigeringsværktøjer">{tools.map(item => <button key={item.id} type="button" aria-label={item.label} title={item.label} aria-pressed={tool === item.id} onClick={() => setTool(item.id)}><span aria-hidden="true" className={`tool-icon ${item.shape ?? ""}`}>{item.icon}</span></button>)}</div><span className="tool-name">{tools.find(item => item.id === tool)?.label}</span></div>
    <div className="direction-control" role="group" aria-label="Ordretning"><span>Ordretning</span><button type="button" aria-pressed={direction === "across"} onClick={() => chooseDirection("across")}>→ Vandret</button><button type="button" aria-pressed={direction === "down"} onClick={() => chooseDirection("down")}>↓ Lodret</button></div>
    {tool === "image-area" && <div className="image-choices"><label>Fyld billedområdet med<select aria-label="Vælg illustration" value={(selectedImage?.illustration ?? illustration).startsWith("data:") ? "upload" : (selectedImage?.illustration ?? illustration)} onChange={event => { if (event.target.value !== "upload") { setIllustration(event.target.value); updateSelectedImage({ illustration: event.target.value }); } }}><option value="preset:landscape">Landskab</option><option value="preset:flower">Blomst</option><option value="preset:house">Hus</option><option value="upload">Upload eget billede</option></select></label><input aria-label="Upload billede" type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === "string") { setIllustration(reader.result); updateSelectedImage({ illustration: reader.result }); } }; reader.readAsDataURL(file); }} /></div>}
    {tool === "image-area" && selectedImage && <div className="image-controls" role="group" aria-label="Indstillinger for valgt billede">
      <strong>Valgt billedområde · række {selectedImage.row + 1}, kolonne {selectedImage.col + 1}</strong>
      <div className="image-size-controls"><span>Bredde: {selectedImage.width}</span><button type="button" aria-label="Formindsk billedområdets bredde" disabled={selectedImage.width <= 1} onClick={() => resizeSelectedImage(selectedImage.width - 1, selectedImage.height)}>−</button><button type="button" aria-label="Forøg billedområdets bredde" disabled={selectedImage.col + selectedImage.width >= layout.width} onClick={() => resizeSelectedImage(selectedImage.width + 1, selectedImage.height)}>+</button><span>Højde: {selectedImage.height}</span><button type="button" aria-label="Formindsk billedområdets højde" disabled={selectedImage.height <= 1} onClick={() => resizeSelectedImage(selectedImage.width, selectedImage.height - 1)}>−</button><button type="button" aria-label="Forøg billedområdets højde" disabled={selectedImage.row + selectedImage.height >= layout.height} onClick={() => resizeSelectedImage(selectedImage.width, selectedImage.height + 1)}>+</button></div>
      <label>Tilpasning<select aria-label="Billedtilpasning" value={selectedImage.fit ?? "cover"} onChange={event => updateSelectedImage({ fit: event.target.value as "cover" | "contain" })}><option value="cover">Fyld boksen (beskær)</option><option value="contain">Tilpas hele billedet til boksen</option></select></label>
      <button type="button" onClick={() => updateSelectedImage({ offsetX: 50, offsetY: 50 })}>Centrér billedet</button>
      <p>Størrelsen ændres fra øverste venstre hjørne. Frigivne felter bliver sorte; udvidelse erstatter indholdet i de nye felter.</p>
    </div>}
    <p className="helper">{tool === "write" ? "Vælg ordretning, og klik på et bogstavfelt for at vælge et ord. Træk i et billede for at flytte det." : tool === "autofill" ? "Vælg ordretning, og klik på et bogstavfelt for at autofylde ordet." : tool === "image-area" ? "Træk over felterne for at oprette et billedområde, eller klik på et eksisterende område for at ændre det." : "Vælg et værktøj og klik på feltet. Store ledetrådsfelter starter i det valgte felt. Vælg bogstavfelt for at fjerne eller flytte en ledetråd."}</p>
    <p className="layout-status" role="status">{layoutMessage} {layoutErrors.length > 0 && `Feltet er ikke klar: ${layoutErrors.length} strukturelle problemer. Alle ord skal have mindst ét bogstav og en ledetråd.`}</p>
    {autofillProgress && <div className="autofill-progress"><p role="status">{autofillWorker.current ? "Søgning: " : "Seneste søgning: "}{autofillProgress}</p>{autofillWorker.current && <button type="button" className="subtle" onClick={cancelAutofill}>Afbryd søgning</button>}</div>}
    {layoutErrors.length > 0 && <details className="layout-errors"><summary>Se problemer i feltet</summary><ul>{[...new Set(layoutErrors.map(error => describeLayoutError(error, layout)))].map(error => <li key={error}>{error}</li>)}</ul></details>}
    <div className="board-wrap"><div className={`editor-board${tool === "image-area" ? " image-area-tool" : ""}`} role="group" aria-label="Krydsordsfelt" onPointerUp={finishImageArea} style={{ gridTemplateColumns: `repeat(${layout.width}, 48px)`, gridTemplateRows: `repeat(${layout.height}, 48px)` }}>
    {Array.from({ length: layout.height }, (_, row) => Array.from({ length: layout.width }, (_, col) => {
      const key = keyOf(row, col);
      const clue = layout.clues.find(area => row >= area.row && row < area.row + area.height && col >= area.col && col < area.col + area.width);
      const imageArea = layout.images.find(area => row >= area.row && row < area.row + area.height && col >= area.col && col < area.col + area.width);
      const image = !!imageArea;
      const block = layout.blocks?.some(item => item.row === row && item.col === col);
      const arrow = layout.arrows?.find(item => item.row === row && item.col === col);
      const style = { gridRow: row + 1, gridColumn: col + 1 };
      const problems = problemCells.get(key);
      const problemClass = problems ? " layout-problem" : "";
      const problemTitle = problems ? [...problems].join(" ") : undefined;
      const selectedForImage = tool === "image-area" && imageDrag && row >= Math.min(imageDrag.start.row, imageDrag.end.row) && row <= Math.max(imageDrag.start.row, imageDrag.end.row) && col >= Math.min(imageDrag.start.col, imageDrag.end.col) && col <= Math.max(imageDrag.start.col, imageDrag.end.col);
      if (tool === "image-area" && imageArea) {
        if (imageArea.row !== row || imageArea.col !== col) return null;
        const src = imageArea.illustration?.startsWith("data:") ? imageArea.illustration : imageArea.illustration?.startsWith("preset:") ? `/illustrations/${imageArea.illustration.slice(7)}.svg` : undefined;
        return <button key={key} type="button" className={`edit-image-area${imageArea.id === selectedImageId ? " selected" : ""}`} style={{ gridRow: `${row + 1} / span ${imageArea.height}`, gridColumn: `${col + 1} / span ${imageArea.width}` }} aria-label={`Rediger række ${row + 1}, kolonne ${col + 1}`} aria-pressed={imageArea.id === selectedImageId} onClick={() => setSelectedImageId(imageArea.id)}>{src ? <img src={src} alt="" draggable={false} style={{ objectFit: imageArea.fit ?? "cover", objectPosition: `${imageArea.offsetX ?? 50}% ${imageArea.offsetY ?? 50}%` }} /> : "✦"}</button>;
      }
      if (tool !== "write" && tool !== "autofill") {
        const clueWords = clue ? layout.words.filter(word => word.clueId === clue.id) : [];
        const anchored = clue ? clueWords.filter(word => word.direction === "across"
          ? col === clue.col + clue.width - 1 && row === Math.max(clue.row, Math.min(clue.row + clue.height - 1, word.start.row))
          : row === clue.row + clue.height - 1 && col === Math.max(clue.col, Math.min(clue.col + clue.width - 1, word.start.col))) : [];
        const ordered = clue ? cluePresentation({ ...clue, row, col, width: 1, height: 1 }, anchored.map(word => ({ ...word, row: word.start.row, col: word.start.col }))).words : [];
        return <button key={key} style={style} className={`edit-tile ${clue ? "edit-clue" : image || block ? "edit-block" : arrow ? "edit-arrow" : ""}${selectedForImage || (tool === "image-area" && imageArea?.id === selectedImageId) ? " image-selection" : ""}${problemClass}`} title={problemTitle} aria-invalid={!!problems} aria-label={`Rediger række ${row + 1}, kolonne ${col + 1}`} onPointerDown={() => startImageArea(row, col)} onPointerEnter={() => extendImageArea(row, col)} onClick={() => changeCell(row, col)}>{clue ? ordered.map(word => <span key={word.id} aria-hidden="true" className={`edit-clue-arrow ${word.direction === "across" ? "clue-arrow-across" : "clue-arrow-down"}${ordered.length > 1 ? " shared" : ""}`}>{word.direction === "across" ? "→" : "↓"}</span>) : arrow ? (arrow.direction === "across" ? "→" : "↓") : letters[key] ?? ""}</button>;
      }
      if (clue) {
        if (clue.row !== row || clue.col !== col) return null;
        const clueWords = layout.words.filter(word => word.clueId === clue.id).map(word => ({ ...word, row: word.start.row, col: word.start.col }));
        const display = cluePresentation(clue, clueWords);
        const clueProblems = Array.from({ length: clue.width * clue.height }, (_, i) => problemCells.get(keyOf(row + Math.floor(i / clue.width), col + i % clue.width))).filter(Boolean);
        return <div key={key} className={`editor-clue ${display.horizontal ? "clue-horizontal" : ""} ${clueProblems.length ? "layout-problem" : ""}`} title={clueProblems.flatMap(item => [...item!]).join(" ") || undefined} style={{ gridRow: `${row + 1} / span ${clue.height}`, gridColumn: `${col + 1} / span ${clue.width}` }}>{display.words.map(word => {
          const straight = word.direction === "across" ? word.start.row >= clue.row && word.start.row < clue.row + clue.height && word.start.col === clue.col + clue.width : word.start.col >= clue.col && word.start.col < clue.col + clue.width && word.start.row === clue.row + clue.height;
          const position = word.direction === "down" && clue.width > 1 && (!display.horizontal || display.words.length === 1) && word.col >= clue.col && word.col < clue.col + clue.width
            ? { left: `${(word.col - clue.col + 0.5) * 100 / clue.width}%`, transform: "translateX(-50%)" }
            : word.direction === "across" && clue.height > 1 && (display.horizontal || display.words.length === 1) && word.row >= clue.row && word.row < clue.row + clue.height
              ? { top: `${(word.row - clue.row + 0.5) * 100 / clue.height}%`, transform: "translateY(-50%)" }
              : undefined;
          const chosenClue = clues[word.id]?.trim();
          return <button key={word.id} className={selectedId === word.id ? "editor-clue-selected" : ""} onClick={() => { setSelectedId(word.id); setDirection(word.direction); setSelectedCell(null); }} aria-invalid={clueProblems.length > 0} title={chosenClue || clueProblems.flatMap(item => [...item!]).join(" ") || undefined} aria-label={`Vælg ${word.direction === "across" ? "vandret" : "lodret"} ord, række ${word.start.row + 1}, kolonne ${word.start.col + 1}${chosenClue ? `, ledetråd: ${chosenClue}` : ""}`}><span className="editor-clue-text" style={position}>{chosenClue || ""}</span><span aria-hidden="true" className={word.direction === "down" ? "clue-arrow-down" : "clue-arrow-across"} style={position}>{straight ? (word.direction === "across" ? "→" : "↓") : (word.direction === "across" ? "↓→" : "→↓")}</span></button>;
        })}</div>;
      }
      if (arrow) return <div key={key} className={`edit-arrow editor-separator${problemClass}`} title={problemTitle} style={style} aria-label={arrow.direction === "across" ? "Ordmellemrum, pil til højre" : "Ordmellemrum, pil ned"}>{arrow.direction === "across" ? "→" : "↓"}</div>;
      if (imageArea) {
        if (imageArea.row !== row || imageArea.col !== col) return null;
        const src = imageArea.illustration?.startsWith("data:") ? imageArea.illustration : imageArea.illustration?.startsWith("preset:") ? `/illustrations/${imageArea.illustration.slice(7)}.svg` : undefined;
        return <div key={key} className={`editor-image${tool === "write" && src ? " editor-image-draggable" : ""}${problemClass}`} style={{ ...style, gridRow: `${row + 1} / span ${imageArea.height}`, gridColumn: `${col + 1} / span ${imageArea.width}` }} onPointerDown={event => { if (tool !== "write" || !src) return; event.currentTarget.setPointerCapture(event.pointerId); const rect = event.currentTarget.getBoundingClientRect(); const img = event.currentTarget.querySelector("img"); if (!img || !img.naturalWidth || !img.naturalHeight) return; const scale = (imageArea.fit ?? "cover") === "contain" ? Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight) : Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight); imagePanRef.current = { row, col, x: event.clientX, y: event.clientY, offsetX: imageArea.offsetX ?? 50, offsetY: imageArea.offsetY ?? 50, availableX: rect.width - img.naturalWidth * scale, availableY: rect.height - img.naturalHeight * scale }; }} onPointerMove={event => { const pan = imagePanRef.current; if (!pan || pan.row !== row || pan.col !== col) return; const offsetX = Math.max(0, Math.min(100, pan.offsetX + (Math.abs(pan.availableX) > 0.5 ? (event.clientX - pan.x) / pan.availableX * 100 : 0))); const offsetY = Math.max(0, Math.min(100, pan.offsetY + (Math.abs(pan.availableY) > 0.5 ? (event.clientY - pan.y) / pan.availableY * 100 : 0))); setLayout(current => ({ ...current, images: current.images.map(area => area.row === row && area.col === col ? { ...area, offsetX, offsetY } : area) })); setPublishMessage(""); }} onPointerUp={() => { imagePanRef.current = null; }} onPointerCancel={() => { imagePanRef.current = null; }}>{src ? <img src={src} alt="" draggable={false} style={{ objectFit: imageArea.fit ?? "cover", objectPosition: `${imageArea.offsetX ?? 50}% ${imageArea.offsetY ?? 50}%` }} /> : "✦"}{imageCueTargets(imageArea, layout).map(({ word, marker }) => { const active = word.clueId === imageArea.id; const direction = word.direction === "across" ? "vandret" : "lodret"; return <button key={word.id} type="button" className={`image-cue-target${active ? " active" : ""}`} style={{ left: `${marker.left}%`, top: `${marker.top}%` }} aria-pressed={active} aria-label={`${active ? "Fjern billedet som cue" : "Brug billedet som cue"} for ${direction} svar i række ${word.start.row + 1}, kolonne ${word.start.col + 1}`} title={`${active ? "Fjern billedet som cue" : "Brug billedet som cue"} for ${direction} svar`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); changeWordCue(word, active ? (word.textClueId ?? `missing-${word.direction}-${word.start.row}-${word.start.col}`) : imageArea.id); }}>{active ? marker.arrow : "+"}</button>; })}</div>;
      }
      if (block) return <div key={key} className={`${block ? "editor-dark" : "editor-block"}${problemClass}`} title={problemTitle} style={style} />;
      return <input key={key} style={style} className={`editor-cell ${selectedKeys.has(key) ? "selected" : ""}${problemClass}`} title={problemTitle} aria-invalid={!!problems} aria-label={`Række ${row + 1}, kolonne ${col + 1}`} value={letters[key] ?? ""} maxLength={1} onClick={() => chooseCell(row, col)} onChange={event => { const value = event.target.value.toLocaleUpperCase("da-DK").slice(-1); if (value && !/^[A-ZÆØÅ]$/.test(value)) return; const next = { ...letters }; if (value) next[key] = value; else delete next[key]; updateLetters(next); }} />;
    }))}</div></div><p className="helper">Bogstaver kan skrives direkte i feltet. Forslag indsættes ved at klikke på dem.</p></section>
    <aside className="suggestion-panel">
      {selected && <label className="clue-editor">Tekstledetråd til valgt ord<input value={clues[selected.id] ?? ""} onChange={event => setClues(current => ({ ...current, [selected.id]: event.target.value }))} placeholder="Brug ordbogens ledetråd" /></label>}
      <div className="panel-heading"><div><span>02 / ORDFORSLAG</span><h2>Vælg ord og ledetråd</h2></div></div>
      {dictionaries.length > 0 && <div className="dictionary-picker"><label>Vælg ordbog <select aria-label="Vælg ordbog" value={currentDictionary?.id ?? ""} onChange={event => { setDictionaryId(event.target.value); setEditingKey(null); setMessage(""); }}>{dictionaries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{currentDictionary && <><label><input type="checkbox" aria-label="Vis i ordforslag" checked={currentDictionary.showSuggestions} onChange={event => updateDictionary({ ...currentDictionary, showSuggestions: event.target.checked })} /> Vis i ordforslag</label><label><input type="checkbox" aria-label="Brug til autofyldning" checked={currentDictionary.useAutofill} onChange={event => updateDictionary({ ...currentDictionary, useAutofill: event.target.checked })} /> Brug til autofyldning</label></>}</div>}
      {selected ? <><div className="selection-info"><span>{selected.direction === "across" ? "→ VANDRET" : "↓ LODRET"} · {selected.length} BOGSTAVER</span><strong>{pattern}</strong><small>Række {selected.start.row + 1}, kolonne {selected.start.col + 1}</small></div>
      <p className="helper">Hvert vist ord er afprøvet mod hele feltet med de nuværende bogstaver. Samme ord bruges højst én gang.</p>
      <div className="suggestion-status" role="status">{layoutErrors.length ? "Ret feltets opbygning for at se ordforslag." : progress.done ? (progress.checked < progress.total ? `Viser de første ${suggestions.length} mulige ord.` : `${suggestions.length} mulige ord fundet.`) : `Undersøger ord … ${progress.checked}${progress.total ? ` / ${progress.total}` : ""}`} {progress.uncertain > 0 && `${progress.uncertain} kunne ikke afgøres inden for beregningsgrænsen.`}</div>
      <label className="suggestion-sort">Sortér efter<select aria-label="Sortér ordforslag" value={suggestionSort} onChange={event => setSuggestionSort(event.target.value as "score" | "alphabetical")}><option value="score">Højeste kildescore</option><option value="alphabetical">Alfabetisk</option></select></label>
      <label className="unique-words-toggle"><input type="checkbox" checked={showEachWordOnce} onChange={event => setShowEachWordOnce(event.target.checked)} />Vis hvert ord én gang</label>
      <div className={`suggestion-list${showEachWordOnce ? " unique-words" : ""}`}>{showEachWordOnce ? sortedSuggestions.map(({ entry, clues }) => <div className="suggestion-word" key={entry.word}><strong>{entry.word}</strong><small title="Ordets højeste kildescore">{wordScores.get(entry.word) ?? 0} point</small><div className="suggestion-clues">{clues.map(({ clue, score }) => <button key={clue} onClick={() => applyWord(entry.word, clue)}>{clue}<small title="Ledetrådens kildescore">{score} point</small><b>+</b></button>)}</div></div>) : sortedSuggestionClues.map(({ entry, clue, score }) => <button key={`${entry.word}:${clue}`} onClick={() => applyWord(entry.word, clue)}><strong>{entry.word}</strong><span>{clue}</span><small title="Ledetrådens kildescore">{score} point</small><b>+</b></button>)}</div>
      {progress.done && suggestions.length === 0 && <p className="empty">Ingen bekræftede muligheder. Prøv at ændre eller fjerne bogstaver.</p>}
      <button className="subtle clear-word" onClick={() => { const next = { ...letters }; wordCells(selected).forEach(cell => delete next[keyOf(cell.row, cell.col)]); updateLetters(next); }}>Ryd det valgte ord</button></> : <p>Vælg et ord i feltet.</p>}
    </aside></div>}
    {designerTab === "dictionaries" && <section className="dictionary-manager" aria-label="Egne ordbøger">
      <header className="dictionary-manager-header"><div><span className="eyebrow">DIT PERSONLIGE ORDARKIV</span><h2>Egne ordbøger</h2><p>Hold dine ord samlet i navngivne ordbøger. Vælg selv, hvilke der bidrager til forslag og autofyldning.</p></div><div className="dictionary-create"><label htmlFor="new-dictionary-name">Ny ordbog</label><div><input id="new-dictionary-name" value={newName} onChange={event => setNewName(event.target.value)} placeholder="Fx Steder eller Fagord" /><button type="button" onClick={() => { const name = newName.trim(); if (!name) { setMessage("Skriv et navn til ordbogen."); return; } const item: CustomDictionary = { id: crypto.randomUUID(), name, entries: [], showSuggestions: true, useAutofill: true }; onDictionariesChange([...dictionaries, item]); setDictionaryId(item.id); setNewName(""); setText(""); setMessage(""); }}>Opret ordbog</button></div></div></header>
      <div className="dictionary-manager-body"><aside className="dictionary-list" aria-label="Dine ordbøger"><div className="dictionary-list-heading"><span>DINE ORDBØGER</span><strong>{dictionaries.length}</strong></div>{dictionaries.map(item => <button type="button" key={item.id} className={currentDictionary?.id === item.id ? "active" : ""} aria-current={currentDictionary?.id === item.id ? "true" : undefined} onClick={() => { setDictionaryId(item.id); setEditingKey(null); setText(""); setMessage(""); }}><span>{item.name}</span><small>{item.entries.length} ord</small></button>)}{dictionaries.length === 0 && <p>Opret din første ordbog ovenfor.</p>}</aside>
      {currentDictionary ? <div className="dictionary-workspace"><div className="dictionary-workspace-top"><div><span className="eyebrow">VALGT ORDBOG</span><h3>{currentDictionary.name}</h3><p>{currentDictionary.entries.length} gemte ord og ledetråde</p></div><label className="dictionary-name-edit">Navn<input aria-label="Ordbogens navn" key={currentDictionary.id} defaultValue={currentDictionary.name} onBlur={event => { const name = event.target.value.trim(); if (name) updateDictionary({ ...currentDictionary, name }); else event.target.value = currentDictionary.name; }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label><button className="danger-button" type="button" onClick={() => { if (window.confirm(`Slet ordbogen "${currentDictionary.name}" og alle dens ord?`)) { const remaining = dictionaries.filter(item => item.id !== currentDictionary.id); onDictionariesChange(remaining); setDictionaryId(remaining[0]?.id ?? ""); setEditingKey(null); setText(""); setMessage(""); } }}>Slet ordbog</button></div>
      <div className="dictionary-entry-add"><div><h4>Tilføj ord og ledetråde</h4><p>Et ord pr. linje: <code>ORD;ledetråd</code>. Flere ledetråde kan følge efter semikolon.</p></div><textarea aria-label="Ord og ledetråde" value={text} onChange={event => setText(event.target.value)} placeholder={'Pigenavn: Hanne|Sigrid\nCYKEL;Køretøj med to hjul'} rows={3} /><button type="button" onClick={addWords}>Tilføj ord</button></div>
      <div className="dictionary-entries-heading"><div><h4>Ord i denne ordbog</h4><p>Redigér eller fjern enkelte poster efter behov.</p></div><span>{currentDictionary.entries.length}</span></div><div className="dictionary-entry-list">{currentDictionary.entries.map(entry => { const key = customEntryKey(entry); return <div className="dictionary-entry" key={key}>{editingKey === key ? <><input aria-label="Rediger ord og ledetråd" value={editText} onChange={event => setEditText(event.target.value)} onKeyDown={event => { if (event.key === "Enter") saveEdit(key); }} /><button type="button" onClick={() => saveEdit(key)}>Gem</button><button className="text-button" type="button" onClick={() => setEditingKey(null)}>Annuller</button></> : <><span><strong>{entry.word}</strong><span>{entry.clue}</span></span>{dictionaries.length > 1 && <div className="dictionary-entry-actions"><select aria-label={`Målordbog for ${entry.word}: ${entry.clue}`} value={transferTargets[key] ?? ""} onChange={event => setTransferTargets(current => ({ ...current, [key]: event.target.value }))}><option value="">Vælg ordbog</option>{dictionaries.filter(item => item.id !== currentDictionary.id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="text-button" type="button" disabled={!transferTargets[key]} onClick={() => transferEntry(entry, transferTargets[key], false)}>Kopiér</button><button className="text-button" type="button" disabled={!transferTargets[key]} onClick={() => transferEntry(entry, transferTargets[key], true)}>Flyt</button></div>}<button className="text-button" type="button" aria-label={`Rediger ${entry.word}: ${entry.clue}`} onClick={() => { setEditingKey(key); setEditText(`${entry.word};${entry.clue}`); }}>Rediger</button><button className="text-button remove" type="button" aria-label={`Fjern ${entry.word}: ${entry.clue}`} onClick={() => updateDictionary({ ...currentDictionary, entries: currentDictionary.entries.filter(item => customEntryKey(item) !== key) })}>Fjern</button></>}</div>; })}{currentDictionary.entries.length === 0 && <p className="dictionary-empty">Denne ordbog er tom endnu. Tilføj ord ovenfor.</p>}</div><p className="dictionary-message" role="status">{message}</p></div> : <div className="dictionary-no-selection"><h3>Ingen ordbøger endnu</h3><p>Opret en ordbog for at begynde at samle dine egne ord.</p></div>}</div>
    </section>}
    </main><footer className="editor-footer">Ord fra den indbyggede ordbog og <a href="https://wordnet.dk/dannet">DanNet</a> · CC BY-SA 4.0. Automatiske ledetråde er ikke individuelt gennemgået.</footer></div>;
}
