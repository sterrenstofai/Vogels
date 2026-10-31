"""Platen van Naumann en Gould op Commons koppelen aan de Twentse soorten."""
import json, re, sys
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from commons import q, leden
WORTELS = {"Naumann": "Category:Naturgeschichte der Vögel Mitteleuropas",
           "Gould": "Category:The Birds of Europe (Gould)"}
def alle_bestanden(cat, diepte=3, gezien=None):
    gezien = gezien if gezien is not None else set()
    if cat in gezien or diepte < 0: return set()
    gezien.add(cat)
    out = set()
    for x in leden(cat):
        if x["ns"] == 6: out.add(x["title"])
        elif x["ns"] == 14: out |= alle_bestanden(x["title"], diepte - 1, gezien)
    return out
bestanden = {}
for bron, wortel in WORTELS.items():
    for f in alle_bestanden(wortel):
        if not f.lower().endswith((".pdf", ".djvu")): bestanden[f] = bron
print("bestanden", len(bestanden), file=sys.stderr)
info = {}
titels = sorted(bestanden)
for i in range(0, len(titels), 50):
    d = q(action="query", titles="|".join(titels[i:i+50]), prop="categories|imageinfo", cllimit="max",
          iiprop="size|extmetadata|url", iiextmetadatafilter="LicenseShortName|Artist|DateTimeOriginal", clshow="!hidden")
    for p in d["query"]["pages"]:
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata", {})
        info[p["title"]] = {"bron": bestanden.get(p["title"]), "cats": [c["title"][9:] for c in p.get("categories", [])],
                            "b": ii.get("width"), "h": ii.get("height"), "url": ii.get("url"),
                            "licentie": meta.get("LicenseShortName", {}).get("value")}
json.dump(info, open("platen_raw.json", "w"), ensure_ascii=False, indent=0)
