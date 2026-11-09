import { useEffect, useMemo, useState } from "react";
import { dictionary, type DictionaryEntry } from "./crossword/dictionary";
import { createTemplateLayout } from "./crossword/templateLayouts";
import { wordCells, type GridLayout, type GridWord } from "./crossword/layout";
import { puzzleFromLayout, type Puzzle } from "./crossword/generator";
import { Player } from "./Player";
import "./player.css";

const keyOf = (row: number, col: number) => `${row},${col}`;
function makeLayout(size: number): GridLayout {
  const layout = createTemplateLayout(size);
  if (!layout) throw new Error("Kunne ikke oprette et felt");
  return layout;
}
function loadCustom(): DictionaryEntry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("ordvaerk-ordbog") ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(entry => typeof entry?.word === "string" && /^[A-ZÆØÅ]{2,}$/.test(entry.word) && typeof entry.clue === "string" && entry.clue.trim()).map(entry => ({ word: entry.word, clue: entry.clue, length: entry.word.length, source: "custom" as const }));
  } catch { return []; }
}
const PUBLISHED_KEY = "ordvaerk-published-v1";
function loadPublished(): Puzzle | null {
  try { const saved = JSON.parse(localStorage.getItem(PUBLISHED_KEY) ?? "null"); return saved && Array.isArray(saved.cells) && Array.isArray(saved.placements) && typeof saved.size === "number" ? saved as Puzzle : null; } catch { return null; }
}
export function App() {
  const [page, setPage] = useState<"player" | "designer">("player");
  const [published, setPublished] = useState<Puzzle | null>(loadPublished);
  return <><nav className="site-nav" aria-label="Vælg side"><button aria-current={page === "player" ? "page" : undefined} onClick={() => setPage("player")}>Løs krydsord</button><button aria-current={page === "designer" ? "page" : undefined} onClick={() => setPage("designer")}>Designerværksted</button></nav><div hidden={page !== "player"}>{page === "player" && <Player key={published ? JSON.stringify(published) : "demo"} published={published} />}</div><div hidden={page !== "designer"}><Designer onPublish={setPublished} /></div></>;
}
function Designer({ onPublish }: { onPublish: (puzzle: Puzzle) => void }) {
  const [custom, setCustom] = useState(loadCustom);
  const entries = useMemo(() => { const words = new Set(custom.map(entry => entry.word)); return [...custom, ...dictionary.filter(entry => !words.has(entry.word))]; }, [custom]);
  const [size, setSize] = useState(9);
  const [layout, setLayout] = useState(() => makeLayout(9));
  const [selectedId, setSelectedId] = useState(layout.words[0]?.id);
  const [letters, setLetters] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [progress, setProgress] = useState({ checked: 0, total: 0, uncertain: 0, done: false });
  const [clues, setClues] = useState<Record<string, string>>({});
  const [publishMessage, setPublishMessage] = useState("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const selected = layout.words.find(word => word.id === selectedId);
  const selectedKeys = new Set(selected ? wordCells(selected).map(cell => keyOf(cell.row, cell.col)) : []);
  const byCell = useMemo(() => {
    const result = new Map<string, GridWord[]>();
    layout.words.forEach(word => wordCells(word).forEach(cell => { const key = keyOf(cell.row, cell.col); result.set(key, [...(result.get(key) ?? []), word]); }));
    return result;
  }, [layout]);
  useEffect(() => {
    setSuggestions([]); setProgress({ checked: 0, total: 0, uncertain: 0, done: false });
    if (!selectedId) return;
    const worker = new Worker(new URL("./crossword/suggestions.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = event => {
      const data = event.data;
      if (data.type === "candidate") setSuggestions(current => [...current, data.entry]);
      else setProgress({ checked: data.checked, total: data.total, uncertain: data.uncertain, done: data.type === "done" });
    };
    worker.postMessage({ layout, entries, selected: selectedId, letters });
    return () => worker.terminate();
  }, [layout, entries, selectedId, letters]);
  function newLayout() { const next = makeLayout(size); setLayout(next); setSelectedId(next.words[0]?.id); setLetters({}); setClues({}); setPublishMessage(""); }
  function chooseCell(row: number, col: number) {
    const words = byCell.get(keyOf(row, col)) ?? [];
    if (!words.length) return;
    setSelectedId(words.length > 1 && words.some(word => word.id === selectedId) ? words.find(word => word.id !== selectedId)!.id : words[0].id);
  }
  function applyWord(word: string) {
    if (!selected) return;
    setLetters(current => { const next = { ...current }; wordCells(selected).forEach((cell, i) => { next[keyOf(cell.row, cell.col)] = word[i]; }); return next; });
  }
  function addWords() {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const parsed = lines.map(line => { const [raw, ...rest] = line.split(";"); const word = raw.trim().toLocaleUpperCase("da-DK"); return { word, clue: rest.join(";").trim(), length: word.length, source: "custom" as const }; });
    if (!parsed.length || parsed.some(entry => !/^[A-ZÆØÅ]{2,}$/.test(entry.word) || !entry.clue)) { setMessage("Skriv ét ord og én ledetråd pr. linje, adskilt af semikolon."); return; }
    const merged = new Map(custom.map(entry => [entry.word, entry])); parsed.forEach(entry => merged.set(entry.word, entry));
    const next = [...merged.values()];
    try { localStorage.setItem("ordvaerk-ordbog", JSON.stringify(next)); setCustom(next); setText(""); setMessage(`${parsed.length} ord er gemt.`); } catch { setMessage("Ordene kunne ikke gemmes i browseren."); }
  }
  function publish() {
    const answers: Record<string, DictionaryEntry> = {};
    const used = new Set<string>();
    for (const word of layout.words) {
      const spelling = wordCells(word).map(cell => letters[keyOf(cell.row, cell.col)] ?? "").join("");
      if (spelling.length !== word.length) { setPublishMessage("Udfyld alle bogstavfelter før udgivelse."); return; }
      const entry = entries.find(item => item.word === spelling);
      if (!entry) { setPublishMessage(`Ordet ${spelling} findes ikke i ordbogen. Tilføj det før udgivelse.`); return; }
      if (used.has(spelling)) { setPublishMessage(`Ordet ${spelling} er brugt flere gange.`); return; }
      used.add(spelling);
      answers[word.id] = { ...entry, clue: clues[word.id]?.trim() || entry.clue };
    }
    const puzzle = puzzleFromLayout(layout, answers);
    try { localStorage.setItem(PUBLISHED_KEY, JSON.stringify(puzzle)); onPublish(puzzle); setPublishMessage("Krydsordet er udgivet på forsiden i denne browser."); }
    catch { setPublishMessage("Krydsordet kunne ikke gemmes i browseren."); }
  }
  const pattern = selected ? wordCells(selected).map(cell => letters[keyOf(cell.row, cell.col)] || "·").join("") : "";
  return <div className="editor-shell">
    <header className="editor-header"><div className="brand">ordværk<span className="brand-dot">.</span></div><span>KRYDSORDSVÆRKSTED</span></header>
    <main className="editor-main"><div className="editor-title"><div><p className="eyebrow">KONSTRUÉR ET KRYDSORD</p><h1>Find de rigtige <em>ord.</em></h1><p>Vælg et ord i feltet, og se hvilke muligheder der kan føre til en samlet løsning.</p></div><div className="layout-controls"><label htmlFor="size">Feltets størrelse</label><select id="size" value={size} onChange={event => setSize(Number(event.target.value))}><option value={9}>9 × 9</option><option value={11}>11 × 11</option><option value={13}>13 × 13</option></select><button onClick={newLayout}>Nyt tomt felt</button><button onClick={publish}>Udgiv krydsord</button><p role="status">{publishMessage}</p></div></div>
    <div className="editor-workspace"><section className="editor-board-panel"><div className="panel-heading"><div><span>01 / FELT</span><h2>Dit krydsord</h2></div><button className="subtle" onClick={() => setLetters({})}>Ryd alle bogstaver</button></div><p className="helper">Klik på et bogstavfelt for at vælge et ord. Klik igen for at skifte retning.</p><div className="board-wrap"><div className="editor-board" role="group" aria-label="Krydsordsfelt" style={{ gridTemplateColumns: `repeat(${layout.width}, 48px)`, gridTemplateRows: `repeat(${layout.height}, 48px)` }}>
    {Array.from({ length: layout.height }, (_, row) => Array.from({ length: layout.width }, (_, col) => { const key = keyOf(row, col); const words = byCell.get(key); if (words) return <input key={key} className={`editor-cell ${selectedKeys.has(key) ? "selected" : ""}`} aria-label={`Række ${row + 1}, kolonne ${col + 1}`} value={letters[key] ?? ""} maxLength={1} onClick={() => chooseCell(row, col)} onChange={event => { const value = event.target.value.toLocaleUpperCase("da-DK").slice(-1); if (value && !/^[A-ZÆØÅ]$/.test(value)) return; setLetters(current => { const next = { ...current }; if (value) next[key] = value; else delete next[key]; return next; }); }} />;
      const clue = layout.clues.find(area => area.row === row && area.col === col); if (clue) { const clueWords = layout.words.filter(word => word.clueId === clue.id); return <div key={key} className="editor-clue" style={{ gridRow: `${row + 1} / span ${clue.height}`, gridColumn: `${col + 1} / span ${clue.width}` }}>{clueWords.map(word => <button key={word.id} onClick={() => setSelectedId(word.id)} aria-label={`Vælg ${word.direction === "across" ? "vandret" : "lodret"} ord, række ${word.start.row + 1}, kolonne ${word.start.col + 1}`}>{word.direction === "across" ? "→" : "↓"}</button>)}</div>; }
      if (layout.clues.some(area => row >= area.row && row < area.row + area.height && col >= area.col && col < area.col + area.width)) return null;
      return <div key={key} className="editor-block" />;
    }))}</div></div><p className="helper">Bogstaver kan skrives direkte i feltet. Forslag indsættes ved at klikke på dem.</p></section>
    <aside className="suggestion-panel">{selected && <label className="clue-editor">Ledetråd til valgt ord<input value={clues[selected.id] ?? ""} onChange={event => setClues(current => ({ ...current, [selected.id]: event.target.value }))} placeholder="Brug ordbogens ledetråd" /></label>}<div className="panel-heading"><div><span>02 / ORDFORSLAG</span><h2>Mulige ord</h2></div></div>{selected ? <><div className="selection-info"><span>{selected.direction === "across" ? "→ VANDRET" : "↓ LODRET"} · {selected.length} BOGSTAVER</span><strong>{pattern}</strong><small>Række {selected.start.row + 1}, kolonne {selected.start.col + 1}</small></div><p className="helper">Hvert vist ord er afprøvet mod hele feltet med de nuværende bogstaver. Samme ord bruges højst én gang.</p><div className="suggestion-status" role="status">{progress.done ? (progress.checked < progress.total ? `Viser de første ${suggestions.length} mulige ord.` : `${suggestions.length} mulige ord fundet.`) : `Undersøger ord … ${progress.checked}${progress.total ? ` / ${progress.total}` : ""}`} {progress.uncertain > 0 && `${progress.uncertain} kunne ikke afgøres inden for beregningsgrænsen.`}</div><div className="suggestion-list">{suggestions.map(entry => <button key={entry.word} onClick={() => applyWord(entry.word)}><strong>{entry.word}</strong><span>{entry.clue}</span><b>＋</b></button>)}</div>{progress.done && suggestions.length === 0 && <p className="empty">Ingen bekræftede muligheder. Prøv at ændre eller fjerne bogstaver.</p>}<button className="subtle clear-word" onClick={() => { const next = { ...letters }; wordCells(selected).forEach(cell => delete next[keyOf(cell.row, cell.col)]); setLetters(next); }}>Ryd det valgte ord</button></> : <p>Vælg et ord i feltet.</p>}</aside></div>
    <details className="dictionary-editor"><summary>Udvid ordbogen · {custom.length} egne ord</summary><p>Tilføj ét ord og en ledetråd pr. linje, adskilt af semikolon. Ordene gemmes i denne browser.</p><textarea aria-label="Ord og ledetråde" value={text} onChange={event => setText(event.target.value)} placeholder={'CYKEL;Køretøj med to hjul\nHAV;Stort saltvand'} rows={4} /><button onClick={addWords}>Gem ord</button><p role="status">{message}</p></details>
    </main><footer className="editor-footer">Ord fra den lokale ordbog og <a href="https://wordnet.dk/dannet">DanNet</a> · CC BY-SA 4.0. Automatiske ledetråde er ikke individuelt gennemgået.</footer></div>;
}
