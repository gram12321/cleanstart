"""Create the bundled crossword data from a pinned DanNet WN-LMF release.

Usage: python scripts/import_dannet.py [path-to-dannet-wn-lmf.xml.gz]
Without a path the verified release is downloaded from GitHub.
"""
import gzip
import hashlib
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

VERSION = "2026-10-02"
URL = f"https://github.com/kuhumcst/DanNet/releases/download/v{VERSION}/dannet-wn-lmf.xml.gz"
SHA256 = "60e197e58156878fa4de0df54baa3072d301183f8b9bd45029a92839c06f7a05"
OUTPUT = Path(__file__).resolve().parents[1] / "src/crossword/data/dannet.json"

if len(sys.argv) > 1:
    compressed = Path(sys.argv[1]).read_bytes()
else:
    with urllib.request.urlopen(URL) as response:
        compressed = response.read()
if hashlib.sha256(compressed).hexdigest() != SHA256:
    raise SystemExit("DanNet archive checksum does not match the pinned release")

root = ET.fromstring(gzip.decompress(compressed))
synset_words = {}
word_senses = []
for entry in root.iter("LexicalEntry"):
    lemma = entry.find("Lemma")
    if lemma is None:
        continue
    spelling = lemma.get("writtenForm", "")
    word = spelling.upper()
    if not re.fullmatch(r"[A-ZÆØÅ]{2,12}", word):
        continue
    pos = lemma.get("partOfSpeech", "")
    for sense in entry.findall("Sense"):
        synset = sense.get("synset", "")
        synset_words.setdefault(synset, set()).add(spelling)
        word_senses.append((word, synset, pos))

synsets = {synset.attrib["id"]: synset for synset in root.iter("Synset")}
entries = set()
for word, synset_id, pos in word_senses:
    synset = synsets.get(synset_id)
    if synset is None:
        continue
    definition = " ".join((synset.findtext("Definition") or "").split())
    clues = [(1, clue) for clue in synset_words.get(synset_id, set())]
    for relation in synset.findall("SynsetRelation"):
        if relation.get("relType") == "hypernym":
            clues.extend((2, clue) for clue in synset_words.get(relation.get("target", ""), set()))
    # Preserve the geographic qualifier instead of displaying a full definition.
    if re.match(r"^by i Danmark(?:\b|,)", definition, flags=re.IGNORECASE):
        clues.append((0, "Dansk by"))
    if len(definition.split()) <= 2:
        clues.append((3, definition))
    accepted = set()
    for _, clue in sorted(clues, key=lambda item: (item[0], len(item[1]), item[1])):
        clue = " ".join(clue.split())
        if (not re.fullmatch(r"[A-Za-zÆØÅæøå]+(?: [A-Za-zÆØÅæøå]+)?", clue)
                or len(clue) > 18 or word.casefold() in clue.casefold()):
            continue
        accepted.add(clue[0].upper() + clue[1:])
        if len(accepted) == 2:
            break
    for clue in accepted:
        entries.add((word, clue, synset_id, pos))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(sorted(entries), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Wrote {len(entries)} answer/clue pairs for {len({e[0] for e in entries})} words to {OUTPUT}")
