"""Controleert de gegevens van de site.

Gebruik: python3 scripts/controleer_data.py
Stopt met een foutcode als er iets niet klopt, zodat je dit voor een
publicatie kunt draaien.
"""
import json
import pathlib
import re
import sys

DATA = pathlib.Path(__file__).resolve().parent.parent / "src" / "data"

SECTOREN = {"Retail", "Financiën", "Zorg", "Overheid", "Mobiliteit", "Media", "Zakelijke software", "Industrie", "Onderwijs", "Juridisch", "Logistiek", "Energie", "Agri en food", "Reizen"}
TYPES = {"Assistent voor klanten", "Assistent voor medewerkers", "Agent", "Voorspelmodel", "Beeldherkenning", "Spraak en verslaglegging", "Taalmodel"}
STATUSSEN = {"In productie", "Pilot", "In ontwikkeling"}
HERKOMST_CIJFER = {"onafhankelijk", "organisatie", "leverancier"}
HERKOMST = {"redactie", "inzending"}
CRITERIA = {"impact", "betrouwbaarheid", "ervaring", "verantwoord", "originaliteit"}
DATUM = re.compile(r"^\d{4}(-\d{2}-\d{2})?$")

fouten = []


def fout(waar, wat):
    fouten.append(f"{waar}: {wat}")


def tekst(waarde):
    return isinstance(waarde, str) and waarde.strip() != ""


oplossingen = json.loads((DATA / "oplossingen.json").read_text(encoding="utf-8"))
jury = json.loads((DATA / "jury.json").read_text(encoding="utf-8"))
beoordelingen = json.loads((DATA / "beoordelingen.json").read_text(encoding="utf-8"))

ids = set()
for o in oplossingen:
    waar = o.get("id", "(zonder id)")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", str(o.get("id", ""))):
        fout(waar, "id moet uit kleine letters, cijfers en streepjes bestaan")
    if o.get("id") in ids:
        fout(waar, "id komt twee keer voor")
    ids.add(o.get("id"))
    for veld in ("naam", "organisatie", "kort", "beschrijving"):
        if not tekst(o.get(veld)):
            fout(waar, f"{veld} ontbreekt")
    if tekst(o.get("kort")) and len(o["kort"]) > 140:
        fout(waar, f"kort is {len(o['kort'])} tekens, hooguit 140")
    if o.get("sector") not in SECTOREN:
        fout(waar, f"onbekende sector {o.get('sector')!r}")
    if o.get("type") not in TYPES:
        fout(waar, f"onbekend type {o.get('type')!r}")
    if o.get("status") not in STATUSSEN:
        fout(waar, f"onbekende status {o.get('status')!r}")
    if o.get("herkomst") not in HERKOMST:
        fout(waar, f"herkomst moet redactie of inzending zijn")
    if o.get("sinds") is not None and not re.fullmatch(r"\d{4}", str(o["sinds"])):
        fout(waar, "sinds moet een jaartal zijn of null")
    if not isinstance(o.get("gebouwdMet", []), list):
        fout(waar, "gebouwdMet moet een lijst zijn")
    r = o.get("resultaat")
    if r is not None and (not tekst(r.get("tekst")) or r.get("herkomst") not in HERKOMST_CIJFER):
        fout(waar, "resultaat heeft een tekst en een geldige herkomst nodig")
    bronnen = o.get("bronnen") or []
    if not bronnen:
        fout(waar, "minstens één bron is verplicht")
    for b in bronnen:
        if not tekst(b.get("titel")) or not str(b.get("url", "")).startswith("https://"):
            fout(waar, f"bron zonder titel of zonder https-adres: {b.get('url')!r}")
        if b.get("datum") is not None and not DATUM.match(str(b["datum"])):
            fout(waar, f"datum van bron is geen JJJJ of JJJJ-MM-DD: {b.get('datum')!r}")
    for veld in ("toegevoegd", "gecontroleerd"):
        if o.get(veld) is not None and not DATUM.match(str(o[veld])):
            fout(waar, f"{veld} is geen datum")
    if any("—" in str(o.get(v, "")) for v in ("kort", "beschrijving", "opvallend")):
        fout(waar, "gedachtestreepje in de tekst")

juryleden = set()
for j in jury:
    if not tekst(j.get("id")) or not tekst(j.get("naam")):
        fout("jury", f"jurylid zonder id of naam: {j!r}")
    juryleden.add(j.get("id"))

for b in beoordelingen:
    waar = f"beoordeling {b.get('oplossing')} door {b.get('jurylid')}"
    if b.get("oplossing") not in ids:
        fout(waar, "onbekende oplossing")
    if b.get("jurylid") not in juryleden:
        fout(waar, "onbekend jurylid")
    scores = b.get("scores") or {}
    if set(scores) != CRITERIA:
        fout(waar, "scores moeten precies de vijf criteria bevatten")
    for c, s in scores.items():
        if not isinstance(s, (int, float)) or not 1 <= s <= 10:
            fout(waar, f"cijfer voor {c} moet tussen 1 en 10 liggen")
    if not DATUM.match(str(b.get("datum", ""))):
        fout(waar, "datum ontbreekt")

if fouten:
    print("\n".join(fouten))
    sys.exit(f"{len(fouten)} fouten in de gegevens")
print(f"gegevens in orde: {len(oplossingen)} oplossingen, {len(jury)} juryleden, {len(beoordelingen)} beoordelingen")
