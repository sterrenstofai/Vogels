"""Proef: wat spoelt er in november aan bij Scheveningen/Kijkduin?
Bron: ANEMOON Strandmonitoringproject (SMP) via GBIF, CC BY 4.0. Het SMP noteert per strandbezoek
per soort aanwezig of afwezig. We rekenen per soort uit in welk deel van de novemberbezoeken hij gevonden is.
Draai: python3 strand_november.py [maand]"""
import json, sys, collections, urllib.parse
import soorten

A = "01f868e3-be61-436a-a94a-07e7c9e63796"
VAK = "POLYGON((4.17 52.03,4.30 52.03,4.30 52.13,4.17 52.13,4.17 52.03))"  # Kijkduin tot Scheveningen
maand = int(sys.argv[1]) if len(sys.argv) > 1 else 11
aan, bezoek, alle_bezoeken, namen, jaren = collections.Counter(), collections.defaultdict(set), set(), {}, set()
off = 0
while True:
    d = soorten.js(f"https://api.gbif.org/v1/occurrence/search?datasetKey={A}&month={maand}&limit=300&offset={off}&geometry=" + urllib.parse.quote(VAK))
    for r in d["results"]:
        ev = r.get("eventID") or r.get("eventDate")
        alle_bezoeken.add(ev); jaren.add(r.get("year"))
        if r["occurrenceStatus"] == "PRESENT":
            aan[r.get("speciesKey") or r["taxonKey"]] += 1
            namen[r.get("speciesKey") or r["taxonKey"]] = (r.get("species") or r["scientificName"], r.get("vernacularName"))
            bezoek[r.get("speciesKey") or r["taxonKey"]].add(ev)
    off += 300
    if d["endOfRecords"] or off >= 100000:
        break
n = len(alle_bezoeken)
rij = sorted(((len(bezoek[k]) / n, namen[k][0], k) for k in aan), reverse=True)
uit = {"maand": maand, "bezoeken": n, "jaren": [min(jaren), max(jaren)], "soorten": [{"wet": w, "key": k, "aandeel": round(f, 3)} for f, w, k in rij]}
json.dump(uit, open(f"uitkomsten/strand_scheveningen_m{maand}.json", "w"), indent=1, ensure_ascii=False)
print(f"{n} strandbezoeken in maand {maand}, jaren {min(jaren)}-{max(jaren)}")
for f, w, k in rij[:40]:
    print(f"{f:5.0%}  {w}")
