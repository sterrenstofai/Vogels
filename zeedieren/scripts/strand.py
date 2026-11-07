"""Wat spoelt er aan, per maand? Uit het Strandmonitoringproject (SMP) van Stichting ANEMOON, via GBIF
(dataset 01f868e3-be61-436a-a94a-07e7c9e63796, CC BY 4.0, 1978-2021). Het SMP noteert per strandbezoek per soort
'aanwezig' of 'afwezig'. Per maand: in welk deel van de strandbezoeken werd een soort gevonden?
Schrijft site/data/strand.json. Alleen standaardbibliotheek. Draai: python3 scripts/strand.py"""
import json, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
A = "01f868e3-be61-436a-a94a-07e7c9e63796"
UA = "zeezicht-data/0.1"

def js(url):
    for p in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
                return json.loads(r.read())
        except Exception as e:
            print("  opnieuw", e); time.sleep(5 * (p + 1))
    return None

def main():
    soorten = json.loads((ROOT / "data" / "soorten.json").read_text())
    kern = {}
    for s in soorten:
        r = json.loads((ROOT / "data" / "ruw" / f"{s['slug']}.json").read_text())
        if r["gbif"].get("taxonKey"):
            kern[str(r["gbif"]["taxonKey"])] = s["slug"]
    namen, maanden = {}, {}
    basis = f"https://api.gbif.org/v1/occurrence/search?datasetKey={A}&limit=0"
    jaren = js(basis + "&facet=year&year.facetLimit=100")
    jr = sorted(int(c["name"]) for c in jaren["facets"][0]["counts"])
    for m in range(1, 13):
        b = js(basis + f"&month={m}&facet=eventId&eventId.facetLimit=20000")
        bezoeken = len(b["facets"][0]["counts"]) if b["facets"] else 0
        a = js(basis + f"&month={m}&occurrenceStatus=PRESENT&facet=speciesKey&speciesKey.facetLimit=600")
        rij = []
        for c in (a["facets"][0]["counts"] if a and a["facets"] else []):
            # per bezoek kan een soort twee keer staan (bijvoorbeeld 'oud' en 'vers'): tel verschillende bezoeken
            e = js(basis + f"&month={m}&occurrenceStatus=PRESENT&speciesKey={c['name']}&facet=eventId&eventId.facetLimit=20000")
            n = len(e["facets"][0]["counts"]) if e and e["facets"] else 0
            rij.append([c["name"], round(n / bezoeken, 3) if bezoeken else 0])
            namen.setdefault(c["name"], None)
        maanden[m] = {"bezoeken": bezoeken, "soorten": rij}
        print(m, bezoeken, len(rij), flush=True)
    info = {}
    hand = json.loads((ROOT / "data" / "strand_namen.json").read_text())   # Nederlandse namen, met de hand (ANEMOON-zoekkaarten)
    for k in namen:
        sp = js(f"https://api.gbif.org/v1/species/{k}") or {}
        vn = js(f"https://api.gbif.org/v1/species/{k}/vernacularNames?limit=200") or {"results": []}
        nl = [v["vernacularName"] for v in vn["results"] if v.get("language") in ("nld", "dut")]
        # de kortste gangbare naam, met een kleine letter (behalve als hij met een hoofdletter hoort, zoals Amerikaanse)
        nl = sorted(set(nl), key=lambda x: (len(x.split()), len(x)))
        wet = sp.get("canonicalName")
        info[k] = {"wet": wet, "nl": hand.get(wet) or (nl[0].lower() if nl else None), "groep": sp.get("class"), "slug": kern.get(k)}
    uit = {"bron": "Stichting ANEMOON, Strandmonitoringproject (SMP), via GBIF, CC BY 4.0", "dataset": A, "jaren": [jr[0], jr[-1]],
           "soorten": info, "maanden": maanden}
    (ROOT / "site" / "data" / "strand.json").write_text(json.dumps(uit, ensure_ascii=False, separators=(",", ":")))
    print(len(info), "soorten")

if __name__ == "__main__":
    main()
