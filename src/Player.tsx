import { customEntryKey, parseCustomEntries, type CustomDictionary } from "./crossword/customDictionary";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { dictionary, type BuiltinDictionarySettings } from "./crossword/dictionary";
import { BuiltinDictionaryOptions } from "./crossword/BuiltinDictionaryOptions";
import { generatePuzzle, placementCells } from "./crossword/generator";
import { cluePresentation } from "./crossword/layout";
import type { Direction, Placement, Puzzle } from "./crossword/generator";

type Selection = { row: number; col: number; placementId: number };
type Answers = Record<string, string>;
const keyOf = (row: number, col: number) => `${row},${col}`;

function initialSelection(puzzle: Puzzle): Selection | null {
  const first = puzzle.placements[0];
  return first ? { row: first.row, col: first.col, placementId: first.id } : null;
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, JSX.Element> = {
    refresh: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0-2 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="M19 15v4M17 17h4" /></>,
    reset: <><path d="M4 10V5m0 0h5M4 5l3 3a7 7 0 1 1-1 8" /></>,
    book: <><path d="M12 6c-2-2-5-2-8-1v14c3-1 6-1 8 1 2-2 5-2 8-1V5c-3-1-6-1-8 1Z" /><path d="M12 6v14" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    expand: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></>,
    collapse: <><path d="M3 8h5V3M21 8h-5V3M8 21v-5H3M16 21v-5h5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

type LibraryItem = { id: string; name: string; puzzle: Puzzle };
type PlayState = { id: string; puzzle: Puzzle; answers: Answers };
export function Player({ published, library = [], preview = false, preferPublished = false, dictionaries, onDictionariesChange, builtinDictionarySettings, onBuiltinDictionarySettingsChange, savedPlay, onPlayChange }: { published: Puzzle | null; library?: LibraryItem[]; preview?: boolean; preferPublished?: boolean; dictionaries: CustomDictionary[]; onDictionariesChange: (next: CustomDictionary[]) => void; builtinDictionarySettings: BuiltinDictionarySettings; onBuiltinDictionarySettingsChange: (next: BuiltinDictionarySettings) => void; savedPlay?: { active?: PlayState; games?: Record<string, PlayState> }; onPlayChange: (value: { active: PlayState; games: Record<string, PlayState> }) => void }) {
  const customEntries = useMemo(() => dictionaries.filter(item => item.useAutofill).flatMap(item => item.entries), [dictionaries]);
  const builtinEntries = useMemo(() => dictionary.filter(entry => entry.source !== "custom" && builtinDictionarySettings[entry.source]), [builtinDictionarySettings]);
  const [dictionaryId, setDictionaryId] = useState(dictionaries[0]?.id ?? "");
  const selectedDictionary = dictionaries.find(item => item.id === dictionaryId) ?? dictionaries[0];
  const allEntries = useMemo(() => {
    const customWords = new Set(customEntries.map((entry) => entry.word));
    return [...builtinEntries.filter((entry) => !customWords.has(entry.word)), ...customEntries];
  }, [builtinEntries, customEntries]);
  const [size, setSize] = useState(11);
  const initial = !preview && !preferPublished && savedPlay?.active?.puzzle?.cells && savedPlay.active?.puzzle?.placements ? savedPlay.active : null;
  const [puzzleId, setPuzzleId] = useState(() => initial?.id ?? (library.at(-1)?.id || "generated"));
  const [puzzle, setPuzzle] = useState(() => initial?.puzzle ?? published ?? generatePuzzle(11, allEntries));
  const [selection, setSelection] = useState<Selection | null>(() => initialSelection(puzzle));
  const [answers, setAnswers] = useState<Answers>(() => initial?.answers ?? {});
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false);
  useEffect(() => {
    const updateFullscreenState = () => setIsBoardFullscreen(document.fullscreenElement === boardWrapRef.current);
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);
  const toggleBoardFullscreen = async () => {
    const boardWrap = boardWrapRef.current;
    if (!boardWrap) return;
    if (document.fullscreenElement === boardWrap) await document.exitFullscreen();
    else await boardWrap.requestFullscreen();
  };
  const [playStorageError, setPlayStorageError] = useState("");
  const savedPlayRef = useRef(savedPlay);
  savedPlayRef.current = savedPlay;
  useEffect(() => {
    if (preview) return;
    const current = { id: puzzleId, puzzle, answers };
    const data = { active: current, games: { ...savedPlayRef.current?.games, [puzzleId]: current } };
    const timer = window.setTimeout(() => {
      onPlayChange(data);
      setPlayStorageError("");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [puzzleId, puzzle, answers, preview, onPlayChange]);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [dictionaryText, setDictionaryText] = useState("");
  const [dictionaryMessage, setDictionaryMessage] = useState("");
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const selectedPlacement = selection ? puzzle.placements[selection.placementId] : undefined;
  const selectedCells = new Set(selectedPlacement ? placementCells(selectedPlacement).map(([row, col]) => keyOf(row, col)) : []);
  const letterCells = puzzle.cells.flat().filter((cell) => cell?.kind === "letter");
  const filled = Object.values(answers).filter(Boolean).length;
  const errors = puzzle.cells.flatMap((row, r) => row.flatMap((cell, c) => cell?.kind === "letter" && answers[keyOf(r, c)] && answers[keyOf(r, c)] !== cell.solution ? [keyOf(r, c)] : []));
  const completed = letterCells.length > 0 && filled === letterCells.length && errors.length === 0;
  const percent = letterCells.length ? Math.round((filled / letterCells.length) * 100) : 0;

  function focusCell(row: number, col: number) {
    requestAnimationFrame(() => cellRefs.current[keyOf(row, col)]?.focus());
  }

  function selectPlacement(placement: Placement) {
    setSelection({ row: placement.row, col: placement.col, placementId: placement.id });
    focusCell(placement.row, placement.col);
  }

  function selectCell(row: number, col: number) {
    const cell = puzzle.cells[row][col];
    if (cell?.kind !== "letter") return;
    let placementId = cell.placementIds.includes(selection?.placementId ?? -1) ? selection!.placementId : cell.placementIds[0];
    if (selection?.row === row && selection.col === col && cell.placementIds.length > 1) {
      placementId = cell.placementIds.find((id) => id !== placementId) ?? placementId;
    }
    setSelection({ row, col, placementId });
  }

  function moveAlong(placement: Placement, row: number, col: number, offset: number) {
    const cells = placementCells(placement);
    const index = cells.findIndex(([r, c]) => r === row && c === col);
    const next = cells[index + offset];
    if (next) {
      setSelection({ row: next[0], col: next[1], placementId: placement.id });
      focusCell(next[0], next[1]);
    }
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    const cell = puzzle.cells[row][col];
    if (cell?.kind !== "letter") return;
    const placement = puzzle.placements[cell.placementIds.includes(selection?.placementId ?? -1) ? selection!.placementId : cell.placementIds[0]];
    const letter = event.key.toLocaleUpperCase("da-DK");
    if (/^[A-ZÆØÅ]$/.test(letter) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setAnswers((current) => ({ ...current, [keyOf(row, col)]: letter }));
      setMessage("");
      moveAlong(placement, row, col, 1);
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setAnswers((current) => { const next = { ...current }; delete next[keyOf(row, col)]; return next; });
      if (event.key === "Backspace" && !answers[keyOf(row, col)]) moveAlong(placement, row, col, -1);
      setMessage("");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCell(row, col);
    } else if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const direction: Direction = event.key === "ArrowRight" || event.key === "ArrowLeft" ? "across" : "down";
      const matching = cell.placementIds.map((id) => puzzle.placements[id]).find((item) => item.direction === direction);
      if (matching) moveAlong(matching, row, col, event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1);
    }
  }

  function newPuzzle() {
    let next: Puzzle;
    try { next = generatePuzzle(size, allEntries); } catch {
      setMessage("Krydsordet kunne ikke udfyldes. Prøv igen.");
      return;
    }
    setPuzzleId("generated");
    setPuzzle(next);
    setSelection(initialSelection(next));
    setAnswers({});
    setChecked(false);
    setMessage("Et nyt krydsord er klar.");
  }

  function checkAnswers() {
    setChecked(true);
    setMessage(completed ? "Flot klaret! Du har løst krydsordet." : errors.length ? `${errors.length} ${errors.length === 1 ? "bogstav er" : "bogstaver er"} markeret. Prøv igen!` : "Alt, du har skrevet, er rigtigt indtil videre.");
  }

  function revealLetter() {
    if (!selectedPlacement) return;
    const cells = placementCells(selectedPlacement);
    const target = cells.find(([r, c]) => {
      const cell = puzzle.cells[r][c];
      return cell?.kind === "letter" && answers[keyOf(r, c)] !== cell.solution;
    });
    if (!target) { setMessage("Det valgte ord er allerede løst."); return; }
    const [row, col] = target;
    const cell = puzzle.cells[row][col];
    if (cell?.kind === "letter") {
      setAnswers((current) => ({ ...current, [keyOf(row, col)]: cell.solution }));
      setSelection({ row, col, placementId: selectedPlacement.id });
      focusCell(row, col);
      setMessage("Et bogstav er afsløret.");
    }
  }

  function addEntries() {
    const parsed = parseCustomEntries(dictionaryText);
    if (!parsed) {
      setDictionaryMessage("Skriv f.eks. Pigenavn: Hanne|Sigrid eller ORD;ledetråd.");
      return;
    }
    if (!selectedDictionary) { setDictionaryMessage("Opret først en ordbog i designerværkstedet."); return; }
    const merged = new Map(selectedDictionary.entries.map((entry) => [customEntryKey(entry), entry]));
    parsed.forEach((entry) => merged.set(customEntryKey(entry), entry));
    onDictionariesChange(dictionaries.map(item => item.id === selectedDictionary.id ? { ...item, entries: [...merged.values()] } : item));
    setDictionaryText("");
    setDictionaryMessage(`${parsed.length} ord er tilføjet. Lav et nyt krydsord for at bruge dem.`);
  }

  return (
    <div className="player-page"><div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Krydsværk, til forsiden"><span className="brand-mark"><span>K</span><span>R</span><span>Y</span><span>D</span></span><span>krydsværk<span className="brand-dot">.</span></span></a>
        <div className="topbar-note"><span className="note-dot" /> EN LILLE PAUSE TIL HOVEDET</div>
        <span className="topbar-edition">LAVET TIL ORDGLÆDE <span>✳</span></span>
      </header>

      <main id="top" className={`workspace${preview ? " preview-workspace" : ""}`}>
        {!preview && <section className="intro-panel">
          <div className="intro-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> DIT EGET KRYDSORD</div>
            <h1>Ord, der<br /><em>krydser.</em></h1>
            <p className="intro-description">Tag en pause, find ordene, og lad bogstaverne falde på plads.</p>
          </div>

          {library.length > 0 && <div className="settings-card"><div className="section-label"><span>01</span> FRA DESIGNEREN</div><label htmlFor="published-choice">Vælg krydsord</label><select id="published-choice" value={library.some(item => item.id === puzzleId) ? puzzleId : ""} onChange={event => { const item = library.find(entry => entry.id === event.target.value); if (!item) return; const previous = savedPlay?.games?.[item.id]; setPuzzleId(item.id); setPuzzle(item.puzzle); setAnswers(previous?.answers ?? {}); setSelection(initialSelection(item.puzzle)); setChecked(false); setMessage("Designerens krydsord er klar."); }}><option value="">Vælg krydsord</option>{library.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="primary-button" onClick={() => { const item = library.find(entry => entry.id === puzzleId) ?? library[library.length - 1]; const previous = savedPlay?.games?.[item.id]; setPuzzleId(item.id); setPuzzle(item.puzzle); setAnswers(previous?.answers ?? {}); setSelection(initialSelection(item.puzzle)); setChecked(false); setMessage("Designerens krydsord er klar."); }}>Åbn designerens krydsord <Icon name="arrow" /></button></div>}
          <div className="settings-card">
            <div className="section-label"><span>01</span> PRØV ET TILFÆLDIGT KRYDSORD</div>
            <label htmlFor="grid-size">Størrelse på feltet</label>
            <div className="select-wrap"><select id="grid-size" value={size} onChange={(event) => setSize(Number(event.target.value))}><option value={9}>Lille · 9 × 9</option><option value={11}>Mellem · 11 × 11</option><option value={13}>Stor · 13 × 13</option></select><span aria-hidden="true">⌄</span></div>
            <button className="primary-button" onClick={newPuzzle}><Icon name="refresh" /> Nyt krydsord <Icon name="arrow" /></button>
            <p className="setting-caption">Et nyt felt, hver gang du trykker.</p>
          </div>

          <div className="howto"><div className="howto-icon">✳</div><div><strong>Sådan spiller du</strong><p>Vælg et felt og skriv dit svar. Pilene viser, hvilken vej ordet går.</p></div></div>
          <div className="side-foot">LAVET MED <span>♥</span> OG GODE ORD</div>
        </section>}

        <section className="puzzle-panel" aria-label="Krydsord">{playStorageError && <p role="alert">{playStorageError}</p>}
          <div className="puzzle-header"><div><div className="section-label"><span>02</span> TID TIL AT TÆNKE</div><h2>Dit krydsord <span>✳</span></h2></div><div className="puzzle-header-actions"><button type="button" className="print-grid-button" onClick={() => window.print()}>Print gitter</button><button type="button" className="fullscreen-grid-button" onClick={() => void toggleBoardFullscreen()} aria-label={isBoardFullscreen ? "Afslut fuld skærm" : "Vis gitter i fuld skærm"} title={isBoardFullscreen ? "Afslut fuld skærm" : "Vis gitter i fuld skærm"}><Icon name={isBoardFullscreen ? "collapse" : "expand"} /><span>{isBoardFullscreen ? "Afslut" : "Fuld skærm"}</span></button><div className="puzzle-tag"><span /> KLAR TIL ORD</div></div></div>
          <div className="puzzle-meta"><span>{puzzle.size} × {puzzle.size} FELTER</span><span className="meta-separator" /> <span>{puzzle.placements.length} ORD</span><span className="meta-right">GOD FORNØJELSE!</span></div>

          <div ref={boardWrapRef} className="board-wrap" tabIndex={0} aria-label="Rul krydsordsfeltet vandret">{isBoardFullscreen && <button type="button" className="fullscreen-grid-exit" onClick={() => void toggleBoardFullscreen()}><Icon name="collapse" /> Afslut fuld skærm</button>}<div className="board" role="group" aria-label="Krydsordsfelt" style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${puzzle.size}, minmax(0, 1fr))` }}>
            {puzzle.cells.map((row, r) => row.map((cell, c) => {
              const key = keyOf(r, c);
              if (cell.kind === "covered") return null;
              if (cell.kind === "block") return <div key={key} className="cell cell-dark" style={{ gridRow: r + 1, gridColumn: c + 1 }} aria-label="Sort felt" />;
              if (cell.kind === "arrow") return <div key={key} className="cell cell-separator" style={{ gridRow: r + 1, gridColumn: c + 1 }} aria-label={cell.direction === "across" ? "Ordmellemrum, pil til højre" : "Ordmellemrum, pil ned"}>{cell.direction === "across" ? "→" : "↓"}</div>;
              if (cell.kind === "image") { const src = cell.illustration?.startsWith("data:") ? cell.illustration : cell.illustration?.startsWith("preset:") ? `/illustrations/${cell.illustration.slice(7)}.svg` : undefined; return <div key={key} className="cell cell-image" style={{ gridRow: `${r + 1} / span ${cell.height}`, gridColumn: `${c + 1} / span ${cell.width}` }} aria-label="Billedfelt">{src ? <img src={src} alt="" style={{ objectFit: cell.fit ?? "cover", objectPosition: `${cell.offsetX ?? 50}% ${cell.offsetY ?? 50}%` }} /> : <span aria-hidden="true">✦</span>}{(cell.placementIds ?? []).map(id => { const placement = puzzle.placements[id]; if (!placement.imageMarker) return null; return <button key={id} className={`image-cue-button${selection?.placementId === id ? " clue-active" : ""}`} style={{ left: `clamp(13px, ${placement.imageMarker.left}%, calc(100% - 13px))`, top: `clamp(13px, ${placement.imageMarker.top}%, calc(100% - 13px))` }} onClick={() => selectPlacement(placement)} aria-label={`${placement.direction === "across" ? "Vandret" : "Lodret"} svar, ${placement.length} bogstaver`}>{placement.imageMarker.arrow}</button>; })}</div>; }
              if (cell.kind === "clue") {
                const display = cluePresentation({ row: r, col: c, width: cell.width, height: cell.height }, cell.placementIds.map(id => puzzle.placements[id]));
                return <div key={key} className={`cell cell-clue ${cell.placementIds.length > 1 ? "clue-double" : ""} ${display.horizontal ? "clue-horizontal" : ""}`} style={{ gridRow: `${r + 1} / span ${cell.height}`, gridColumn: `${c + 1} / span ${cell.width}` }}>
                  {display.words.map(placement => {
                    const arrowPosition = cell.width > 1 && placement.direction === "down" && (!display.horizontal || display.words.length === 1) && placement.col >= c && placement.col < c + cell.width
                      ? { left: `${(placement.col - c + 0.5) * 100 / cell.width}%`, right: "auto", transform: "translateX(-50%)" }
                      : cell.height > 1 && placement.direction === "across" && (display.horizontal || display.words.length === 1) && placement.row >= r && placement.row < r + cell.height
                        ? { top: `${(placement.row - r + 0.5) * 100 / cell.height}%`, bottom: "auto", transform: "translateY(-50%)" }
                        : undefined;
                    return <button key={placement.id} className={selection?.placementId === placement.id ? "clue-active" : ""} onClick={() => selectPlacement(placement)} aria-label={`${placement.clue}, ${placement.direction === "across" ? "vandret" : "lodret"}, ${placement.length} bogstaver, starter i række ${placement.row + 1}, kolonne ${placement.col + 1}`}><span className="clue-text" style={{ fontSize: cell.placementIds.length > 1 ? `clamp(6px, min(calc(100cqi / ${Math.max(1, placement.clue.length)}), 40cqb), 14px)` : undefined }}>{placement.clue}</span><b aria-hidden="true" style={arrowPosition}>{placement.arrow}</b></button>;
                  })}
                </div>;
              }
              const isSelected = selection?.row === r && selection.col === c;
              const isError = checked && errors.includes(key);
              return <input key={key} style={{ gridRow: r + 1, gridColumn: c + 1 }} ref={(element) => { cellRefs.current[key] = element; }} className={`cell cell-letter ${selectedCells.has(key) ? "in-word" : ""} ${isSelected ? "selected" : ""} ${isError ? "incorrect" : ""}`} value={answers[key] ?? ""} autoComplete="off" autoCapitalize="characters" spellCheck={false} onClick={() => selectCell(r, c)} onKeyDown={(event) => handleKey(event, r, c)} onChange={(event) => {
                const letter = event.target.value.toLocaleUpperCase("da-DK").slice(-1);
                if (!letter) { setAnswers((current) => { const next = { ...current }; delete next[key]; return next; }); return; }
                if (!/^[A-ZÆØÅ]$/.test(letter)) return;
                setAnswers((current) => ({ ...current, [key]: letter }));
                const placement = puzzle.placements[cell.placementIds.includes(selection?.placementId ?? -1) ? selection!.placementId : cell.placementIds[0]];
                moveAlong(placement, r, c, 1);
              }} aria-label={`Række ${r + 1}, kolonne ${c + 1}`} />;
            }))}
          </div></div><p className="scroll-hint">Skub til siden for at se hele feltet ↔</p>

          <div className="active-clue"><div className="active-clue-icon">{selectedPlacement?.cueKind === "image" ? selectedPlacement.imageMarker?.arrow : selectedPlacement?.direction === "down" ? "↓" : "→"}</div><div><span>{selectedPlacement?.cueKind === "image" ? "BILLEDLEDTRÅD" : "VALGT LEDTRÅD"} · {selectedPlacement?.direction === "down" ? "LODRET" : "VANDRET"}</span><strong>{selectedPlacement?.cueKind === "image" ? "Se pilen på billedet" : selectedPlacement?.clue ?? "Vælg en ledetråd"}</strong></div><span className="clue-length">{selectedPlacement?.length ?? 0} BOGSTAVER</span></div>
          {!preview && <><div className="puzzle-actions"><button onClick={checkAnswers}><Icon name="check" /> Tjek svar</button><button onClick={revealLetter}><Icon name="spark" /> Vis et bogstav</button><button onClick={() => { setAnswers({}); setChecked(false); setMessage("Feltet er ryddet."); }}><Icon name="reset" /> Start forfra</button></div>
          <div className="progress-row"><div><strong>{completed ? "Krydsordet er løst!" : "Din fremgang"}</strong><span>{filled} af {letterCells.length} bogstaver</span></div><span>{percent}%</span></div><div className="progress-track"><div style={{ width: `${percent}%` }} /></div>
          <p className="status-message" role="status">{message || "Tip: Klik på et krydsende bogstav for at skifte retning."}</p>
          </>}
        </section>
      </main>
      {!preview && <section className="dictionary-section"><div className="dictionary-heading"><span className="dictionary-icon"><Icon name="book" size={21} /></span><div><h2>Flere ord at lege med</h2><p>{new Set(allEntries.map((entry) => entry.word)).size} ord kan bruges i nye krydsord. Vælg de indbyggede samlinger, og tilføj dine egne. DanNet-data er under CC BY-SA 4.0.</p></div></div><details><summary>Vælg ordbøger og tilføj egne ord <span>＋</span></summary><div className="dictionary-content"><BuiltinDictionaryOptions settings={builtinDictionarySettings} onChange={onBuiltinDictionarySettingsChange} /><label>Ordbog <select value={selectedDictionary?.id ?? ""} onChange={event => setDictionaryId(event.target.value)}>{dictionaries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label htmlFor="dictionary-input">Ledetråd: svar|svar eller ord;ledetråd;ledetråd pr. linje</label><textarea id="dictionary-input" value={dictionaryText} onChange={(event) => setDictionaryText(event.target.value)} placeholder={'Pigenavn: Hanne|Sigrid\nCYKEL;Køretøj med to hjul'} rows={4} /><div className="dictionary-bottom"><button onClick={addEntries}>Gem ord</button><p>Gemt i denne browser · {customEntries.length} {customEntries.length === 1 ? "eget ord" : "egne ord"}</p></div><p role="status">{dictionaryMessage}</p></div></details></section>}
      <footer className="footer"><span>KRYDSVÆRK <span>✳</span> EN PAUSE MED MENING</span><span>GOD FORNØJELSE MED ORDENE</span></footer>
    </div></div>
  );
}
