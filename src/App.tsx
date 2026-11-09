import { useEffect, useMemo, useState } from "react";
import { dictionary, type DictionaryEntry } from "./crossword/dictionary";
import { createTemplateLayout } from "./crossword/templateLayouts";
import { answerLetters, cluePresentation, fitsBreaks, layoutIssues, wordCells, type GridLayout, type GridWord } from "./crossword/layout";
import { editLayout, sameSlot, type LayoutTool } from "./crossword/editLayout";
import { puzzleFromLayout, type Puzzle } from "./crossword/generator";
import { Player } from "./Player";
import "./player.css";

const keyOf = (row: number, col: number) => `${row},${col}`;
const tools: { id: "write" | LayoutTool; label: string; icon: string; shape?: string }[] = [
  { id: "write", label: "Bogstavfelt / vælg ord", icon: "A" },
  { id: "letter", label: "Gør til bogstavfelt", icon: "A", shape: "letter" },
  { id: "clue", label: "Ledetrådsfelt 1 × 1", icon: "↘", shape: "clue" },
  { id: "wide", label: "Ledetrådsfelt 2 × 1", icon: "↘", shape: "wide" },
  { id: "tall", label: "Ledetrådsfelt 1 × 2", icon: "↘", shape: "tall" },
  { id: "block", label: "Sort felt", icon: "", shape: "dark" },
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
      if (error.startsWith("Invalid word")) return `${location} skal have mindst ?t bogstav.`;
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
  if (error === "Words are not connected by crossings") return "Alle ord skal forbindes gennem krydsninger.";
  if (error === "No words") return "Feltet skal indeholde mindst ét ord.";
  return "Kontrollér feltets opbygning.";
}
function makeLayout(size: number): GridLayout {
  const layout = createTemplateLayout(size);
  if (!layout) throw new Error("Kunne ikke oprette et felt");
  return layout;
}
function loadCustom(): DictionaryEntry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("ordvaerk-ordbog") ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(entry => typeof entry?.word === "string" && /^[A-ZÆØÅ]+(?: [A-ZÆØÅ]+)*$/.test(entry.word) && answerLetters(entry.word).length >= 1 && typeof entry.clue === "string" && entry.clue.trim()).map(entry => ({ word: entry.word, clue: entry.clue, length: answerLetters(entry.word).length, source: "custom" as const }));
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
  const [tool, setTool] = useState<"write" | LayoutTool>("write");
  const [layoutMessage, setLayoutMessage] = useState("");
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
  const selected = layout.words.find(word => word.id === selectedId);
  const selectedKeys = new Set(selected ? wordCells(selected).map(cell => keyOf(cell.row, cell.col)) : []);
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
      if (data.type === "candidate") setSuggestions(current => [...current, data.entry]);
      else setProgress({ checked: data.checked, total: data.total, uncertain: data.uncertain, done: data.type === "done" });
    };
    worker.postMessage({ layout, entries, selected: selectedId, letters });
    return () => worker.terminate();
  }, [layout, entries, selectedId, letters, layoutErrors]);
  function newLayout() { const next = makeLayout(size); setLayout(next); setSelectedId(next.words[0]?.id); setLetters({}); setClues({}); setPublishMessage(""); setLayoutMessage(""); }
  function chooseCell(row: number, col: number) {
    const words = byCell.get(keyOf(row, col)) ?? [];
    if (!words.length) return;
    setSelectedId(words.length > 1 && words.some(word => word.id === selectedId) ? words.find(word => word.id !== selectedId)!.id : words[0].id);
  }
  function applyWord(word: string) {
    if (!selected) return;
    const spelling = answerLetters(word);
    setLetters(current => { const next = { ...current }; wordCells(selected).forEach((cell, i) => { next[keyOf(cell.row, cell.col)] = spelling[i]; }); return next; });
  }
  function changeCell(row: number, col: number) {
    if (tool === "write") return;
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
    setLayout(next);
    setSelectedId(current => next.words.some(word => word.id === current) ? current : next.words[0]?.id);
    setPublishMessage("");
    setLayoutMessage("Feltet er ændret. Ledetråde til ændrede ord er ryddet.");
  }
  function addWords() {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const parsed = lines.map(line => { const [raw, ...rest] = line.split(";"); const word = raw.trim().toLocaleUpperCase("da-DK").replace(/\s+/g, " "); return { word, clue: rest.join(";").trim(), length: answerLetters(word).length, source: "custom" as const }; });
    if (!parsed.length || parsed.some(entry => !/^[A-ZÆØÅ]+(?: [A-ZÆØÅ]+)*$/.test(entry.word) || entry.length < 1 || !entry.clue)) { setMessage("Skriv ét ord eller udtryk og én ledetråd pr. linje, adskilt af semikolon."); return; }
    const merged = new Map(custom.map(entry => [entry.word, entry])); parsed.forEach(entry => merged.set(entry.word, entry));
    const next = [...merged.values()];
    try { localStorage.setItem("ordvaerk-ordbog", JSON.stringify(next)); setCustom(next); setText(""); setMessage(`${parsed.length} ord er gemt.`); } catch { setMessage("Ordene kunne ikke gemmes i browseren."); }
  }
  function publish() {
    if (layoutErrors.length || !layout.words.length) { setPublishMessage("Ret feltets opbygning før udgivelse."); return; }
    const answers: Record<string, DictionaryEntry> = {};
    const used = new Set<string>();
    for (const word of layout.words) {
      const spelling = wordCells(word).map(cell => letters[keyOf(cell.row, cell.col)] ?? "").join("");
      if (spelling.length !== word.length) { setPublishMessage("Udfyld alle bogstavfelter før udgivelse."); return; }
      const entry = entries.find(item => answerLetters(item.word) === spelling && fitsBreaks(word, item.word));
      if (!entry) { setPublishMessage(`Ordet ${spelling} findes ikke i ordbogen. Tilføj det før udgivelse.`); return; }
      if (used.has(entry.word)) { setPublishMessage(`Ordet ${entry.word} er brugt flere gange.`); return; }
      used.add(entry.word);
      answers[word.id] = { ...entry, clue: clues[word.id]?.trim() || entry.clue };
    }
    const puzzle = puzzleFromLayout(layout, answers);
    try { localStorage.setItem(PUBLISHED_KEY, JSON.stringify(puzzle)); onPublish(puzzle); setPublishMessage("Krydsordet er udgivet på forsiden i denne browser."); }
    catch { setPublishMessage("Krydsordet kunne ikke gemmes i browseren."); }
  }
  const pattern = selected ? wordCells(selected).map((cell, i) => `${selected.breaks?.includes(i) ? " " : ""}${letters[keyOf(cell.row, cell.col)] || "·"}`).join("") : "";
  return <div className="editor-shell">
    <header className="editor-header"><div className="brand">ordværk<span className="brand-dot">.</span></div><span>KRYDSORDSVÆRKSTED</span></header>
    <main className="editor-main"><div className="editor-title"><div><p className="eyebrow">KONSTRUÉR ET KRYDSORD</p><h1>Find de rigtige <em>ord.</em></h1><p>Vælg et ord i feltet, og se hvilke muligheder der kan føre til en samlet løsning.</p></div><div className="layout-controls"><label htmlFor="size">Feltets størrelse</label><select id="size" value={size} onChange={event => setSize(Number(event.target.value))}><option value={9}>9 × 9</option><option value={11}>11 × 11</option><option value={13}>13 × 13</option></select><button onClick={newLayout}>Nyt tomt felt</button><button onClick={publish}>Udgiv krydsord</button><p role="status">{publishMessage}</p></div></div>
    <div className="editor-workspace"><section className="editor-board-panel"><div className="panel-heading"><div><span>01 / FELT</span><h2>Dit krydsord</h2></div><button className="subtle" onClick={() => setLetters({})}>Ryd alle bogstaver</button></div>
    <div className="layout-tool"><span>Rediger feltet</span><div className="layout-tool-buttons" role="group" aria-label="Redigeringsværktøjer">{tools.map(item => <button key={item.id} type="button" aria-label={item.label} title={item.label} aria-pressed={tool === item.id} onClick={() => setTool(item.id)}><span aria-hidden="true" className={`tool-icon ${item.shape ?? ""}`}>{item.icon}</span></button>)}</div><span className="tool-name">{tools.find(item => item.id === tool)?.label}</span></div>
    <p className="helper">{tool === "write" ? "Klik på et bogstavfelt for at vælge et ord. Klik igen for at skifte retning." : "Vælg et værktøj og klik på feltet. Store ledetrådsfelter starter i det valgte felt. Vælg bogstavfelt for at fjerne eller flytte en ledetråd."}</p>
    <p className="layout-status" role="status">{layoutMessage} {layoutErrors.length > 0 && `Feltet er ikke klar: ${layoutErrors.length} strukturelle problemer. Alle ord skal have mindst to bogstaver, en ledetråd og krydse de øvrige ord.`}</p>
    {layoutErrors.length > 0 && <details className="layout-errors"><summary>Se problemer i feltet</summary><ul>{[...new Set(layoutErrors.map(error => describeLayoutError(error, layout)))].map(error => <li key={error}>{error}</li>)}</ul></details>}
    <div className="board-wrap"><div className="editor-board" role="group" aria-label="Krydsordsfelt" style={{ gridTemplateColumns: `repeat(${layout.width}, 48px)`, gridTemplateRows: `repeat(${layout.height}, 48px)` }}>
    {Array.from({ length: layout.height }, (_, row) => Array.from({ length: layout.width }, (_, col) => {
      const key = keyOf(row, col);
      const clue = layout.clues.find(area => row >= area.row && row < area.row + area.height && col >= area.col && col < area.col + area.width);
      const image = layout.images.some(area => row >= area.row && row < area.row + area.height && col >= area.col && col < area.col + area.width);
      const block = layout.blocks?.some(item => item.row === row && item.col === col);
      const arrow = layout.arrows?.find(item => item.row === row && item.col === col);
      const style = { gridRow: row + 1, gridColumn: col + 1 };
      const problems = problemCells.get(key);
      const problemClass = problems ? " layout-problem" : "";
      const problemTitle = problems ? [...problems].join(" ") : undefined;
      if (tool !== "write") {
        const clueWords = clue ? layout.words.filter(word => word.clueId === clue.id) : [];
        const anchored = clue ? clueWords.filter(word => word.direction === "across"
          ? col === clue.col + clue.width - 1 && row === Math.max(clue.row, Math.min(clue.row + clue.height - 1, word.start.row))
          : row === clue.row + clue.height - 1 && col === Math.max(clue.col, Math.min(clue.col + clue.width - 1, word.start.col))) : [];
        const ordered = clue ? cluePresentation({ ...clue, row, col, width: 1, height: 1 }, anchored.map(word => ({ ...word, row: word.start.row, col: word.start.col }))).words : [];
        return <button key={key} style={style} className={`edit-tile ${clue ? "edit-clue" : image || block ? "edit-block" : arrow ? "edit-arrow" : ""}${problemClass}`} title={problemTitle} aria-invalid={!!problems} aria-label={`Rediger række ${row + 1}, kolonne ${col + 1}`} onClick={() => changeCell(row, col)}>{clue ? ordered.map(word => <span key={word.id} aria-hidden="true" className={`edit-clue-arrow ${word.direction === "across" ? "clue-arrow-across" : "clue-arrow-down"}${ordered.length > 1 ? " shared" : ""}`}>{word.direction === "across" ? "→" : "↓"}</span>) : arrow ? (arrow.direction === "across" ? "→" : "↓") : letters[key] ?? ""}</button>;
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
          return <button key={word.id} onClick={() => setSelectedId(word.id)} aria-invalid={clueProblems.length > 0} title={clueProblems.flatMap(item => [...item!]).join(" ") || undefined} aria-label={`Vælg ${word.direction === "across" ? "vandret" : "lodret"} ord, række ${word.start.row + 1}, kolonne ${word.start.col + 1}`}><span className={word.direction === "down" ? "clue-arrow-down" : "clue-arrow-across"} style={position}>{straight ? (word.direction === "across" ? "→" : "↓") : (word.direction === "across" ? "↓→" : "→↓")}</span></button>;
        })}</div>;
      }
      if (arrow) return <div key={key} className={`edit-arrow editor-separator${problemClass}`} title={problemTitle} style={style} aria-label={arrow.direction === "across" ? "Ordmellemrum, pil til højre" : "Ordmellemrum, pil ned"}>{arrow.direction === "across" ? "→" : "↓"}</div>;
      if (image || block) return <div key={key} className={`${block ? "editor-dark" : "editor-block"}${problemClass}`} title={problemTitle} style={style} />;
      return <input key={key} style={style} className={`editor-cell ${selectedKeys.has(key) ? "selected" : ""}${problemClass}`} title={problemTitle} aria-invalid={!!problems} aria-label={`Række ${row + 1}, kolonne ${col + 1}`} value={letters[key] ?? ""} maxLength={1} onClick={() => chooseCell(row, col)} onChange={event => { const value = event.target.value.toLocaleUpperCase("da-DK").slice(-1); if (value && !/^[A-ZÆØÅ]$/.test(value)) return; setLetters(current => { const next = { ...current }; if (value) next[key] = value; else delete next[key]; return next; }); }} />;
    }))}</div></div><p className="helper">Bogstaver kan skrives direkte i feltet. Forslag indsættes ved at klikke på dem.</p></section>
    <aside className="suggestion-panel">{selected && <label className="clue-editor">Ledetråd til valgt ord<input value={clues[selected.id] ?? ""} onChange={event => setClues(current => ({ ...current, [selected.id]: event.target.value }))} placeholder="Brug ordbogens ledetråd" /></label>}<div className="panel-heading"><div><span>02 / ORDFORSLAG</span><h2>Mulige ord</h2></div></div>{selected ? <><div className="selection-info"><span>{selected.direction === "across" ? "→ VANDRET" : "↓ LODRET"} · {selected.length} BOGSTAVER</span><strong>{pattern}</strong><small>Række {selected.start.row + 1}, kolonne {selected.start.col + 1}</small></div><p className="helper">Hvert vist ord er afprøvet mod hele feltet med de nuværende bogstaver. Samme ord bruges højst én gang.</p><div className="suggestion-status" role="status">{layoutErrors.length ? "Ret feltets opbygning for at se ordforslag." : progress.done ? (progress.checked < progress.total ? `Viser de første ${suggestions.length} mulige ord.` : `${suggestions.length} mulige ord fundet.`) : `Undersøger ord … ${progress.checked}${progress.total ? ` / ${progress.total}` : ""}`} {progress.uncertain > 0 && `${progress.uncertain} kunne ikke afgøres inden for beregningsgrænsen.`}</div><div className="suggestion-list">{suggestions.map(entry => <button key={entry.word} onClick={() => applyWord(entry.word)}><strong>{entry.word}</strong><span>{entry.clue}</span><b>＋</b></button>)}</div>{progress.done && suggestions.length === 0 && <p className="empty">Ingen bekræftede muligheder. Prøv at ændre eller fjerne bogstaver.</p>}<button className="subtle clear-word" onClick={() => { const next = { ...letters }; wordCells(selected).forEach(cell => delete next[keyOf(cell.row, cell.col)]); setLetters(next); }}>Ryd det valgte ord</button></> : <p>Vælg et ord i feltet.</p>}</aside></div>
    <details className="dictionary-editor"><summary>Udvid ordbogen · {custom.length} egne ord</summary><p>Tilføj ét ord og en ledetråd pr. linje, adskilt af semikolon. Ordene gemmes i denne browser.</p><textarea aria-label="Ord og ledetråde" value={text} onChange={event => setText(event.target.value)} placeholder={'CYKEL;Køretøj med to hjul\nHAV;Stort saltvand'} rows={4} /><button onClick={addWords}>Gem ord</button><p role="status">{message}</p></details>
    </main><footer className="editor-footer">Ord fra den lokale ordbog og <a href="https://wordnet.dk/dannet">DanNet</a> · CC BY-SA 4.0. Automatiske ledetråde er ikke individuelt gennemgået.</footer></div>;
}
