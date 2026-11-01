"""Per instrument of apparaat uit de testset: is er een vrije foto?

- (Wikidata: zie wikidata_sparql.py.) Heeft het item een afbeelding (P18)? Die staat op Wikimedia Commons,
  dus onder een vrije licentie; welke precies (CC0, CC BY, CC BY-SA) moet via
  de Commons-API, en die blokkeert vanaf deze machine (429). Dat gaat later via
  een GitHub Action, net als bij Voggels.
- Met Museum Open Access: hoeveel objecten in de afdeling Musical Instruments
  zijn publiek domein (CC0) en hebben een foto? Bekijkt maximaal 5 treffers.
Schrijft uitkomsten/met.json.
"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path
from nummers import UA

UIT = Path(__file__).parent / "uitkomsten"
# (Nederlandse naam, Wikidata-item, zoekterm Met)  — items met de hand opgezocht en gecontroleerd
INSTRUMENTEN = [
    ("Roland CR-78 (drumcomputer)", "Roland CR-78", None),
    ("Prophet-5 (synthesizer)", "Sequential Circuits Prophet-5", None),
    ("LinnDrum (drumcomputer)", "LinnDrum", None),
    ("E-mu Emulator (sampler)", "E-mu Emulator", None),
    ("Roland TR-808", "Roland TR-808", None),
    ("Akai MPC (sampler)", "Akai MPC", None),
    ("Technics SL-1200 (draaitafel)", "Technics SL-1200", None),
    ("vocoder", "vocoder", None),
    ("Fender Rhodes", "Rhodes piano", None),
    ("Wurlitzer elektrische piano", "Wurlitzer electronic piano", None),
    ("drumstel", "drum kit", "drum"),
    ("snaredrum", "snare drum", "snare drum"),
    ("basgitaar", "bass guitar", "bass guitar"),
    ("elektrische gitaar", "electric guitar", "electric guitar"),
    ("gitaar", "guitar", "guitar"),
    ("piano", "piano", "piano"),
    ("viool", "violin", "violin"),
    ("altviool", "viola", "viola"),
    ("cello", "cello", "violoncello"),
    ("contrabas", "double bass", "double bass"),
    ("harp", "harp", "harp"),
    ("trompet", "trumpet", "trumpet"),
    ("trombone", "trombone", "trombone"),
    ("altsaxofoon", "alto saxophone", "saxophone"),
    ("tenorsaxofoon", "tenor saxophone", "saxophone"),
    ("baritonsaxofoon", "baritone saxophone", "saxophone"),
    ("dwarsfluit", "western concert flute", "flute"),
    ("hobo", "oboe", "oboe"),
    ("klarinet", "clarinet", "clarinet"),
    ("fagot", "bassoon", "bassoon"),
    ("hoorn", "French horn", "horn"),
    ("celesta", "celesta", "celesta"),
    ("tamboerijn", "tambourine", "tambourine"),
]

def get(url):
    for poging in range(4):
        time.sleep(1.2)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            print("  opnieuw:", e, file=sys.stderr); time.sleep(30 * (poging + 1))
    return None

def wikidata(term):
    s = get("https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(
        {"action": "wbsearchentities", "search": term, "language": "en", "format": "json", "limit": 1}))
    if not s or not s["search"]:
        return None
    qid = s["search"][0]["id"]
    e = get(f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json")["entities"][qid]
    p18 = [c["mainsnak"]["datavalue"]["value"] for c in e["claims"].get("P18", []) if "datavalue" in c["mainsnak"]]
    nl = e.get("labels", {}).get("nl", {}).get("value")
    nlwiki = e.get("sitelinks", {}).get("nlwiki", {}).get("title")
    return {"qid": qid, "label": s["search"][0].get("label"), "nl": nl, "nlwiki": nlwiki, "afbeeldingen": p18}

def met(term):
    s = get("https://collectionapi.metmuseum.org/public/collection/v1.1/search?" + urllib.parse.urlencode(
        {"q": term, "hasImages": "true", "departmentId": 18}))
    if not s:
        return None
    ids = s.get("objectIDs") or []
    vrij = []
    for oid in ids[:5]:
        o = get(f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{oid}")
        if o and o.get("isPublicDomain") and o.get("primaryImage"):
            vrij.append({"id": oid, "titel": o["title"], "datum": o.get("objectDate"), "cultuur": o.get("culture")})
    return {"treffers": s.get("total", len(ids)), "bekeken": min(5, len(ids)), "cc0_met_foto": len(vrij), "voorbeelden": vrij[:3]}

def main():
    """Alleen het Met; Wikidata gaat via wikidata_sparql.py (losse vragen gaven 429)."""
    uit = {}
    for nl, term, metterm in INSTRUMENTEN:
        if metterm:
            print(nl, file=sys.stderr)
            uit[nl] = met(metterm)
    (UIT / "met.json").write_text(json.dumps(uit, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
