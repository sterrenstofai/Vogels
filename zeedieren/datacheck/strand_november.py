"""Proef: wat spoelt er in een maand aan bij Kijkduin-Scheveningen?
Bron: ANEMOON Strandmonitoringproject (SMP) via GBIF, CC BY 4.0. Het SMP noteert per strandbezoek
per soort 'aanwezig' of 'afwezig'. Per soort: in welk deel van de bezoeken in die maand is hij gevonden?
Draai: python3 strand_november.py [maand]"""
import json, sys, urllib.parse
import soorten

A = "01f868e3-be61-436a-a94a-07e7c9e63796"
VAK = "POLYGON((4.17 52.03,4.30 52.03,4.30 52.13,4.17 52.13,4.17 52.03))"  # Kijkduin tot Scheveningen
maand = int(sys.argv[1]) if len(sys.argv) > 1 else 11
basis = f"https://api.gbif.org/v1/occurrence/search?datasetKey={A}&month={maand}&limit=0&geometry=" + urllib.parse.quote(VAK)
alle = soorten.js(basis + "&facet=eventId&eventId.facetLimit=2000&facet=year&year.facetLimit=100")
f = {x["field"]: x["counts"] for x in alle["facets"]}
bezoeken = len(f["EVENT_ID"]); jaren = sorted(int(c["name"]) for c in f["YEAR"])
aan = soorten.js(basis + "&occurrenceStatus=PRESENT&facet=speciesKey&speciesKey.facetLimit=500")
rij = []
for c in aan["facets"][0]["counts"]:
    k = c["name"]
    sp = soorten.js(f"https://api.gbif.org/v1/species/{k}") or {}
    vn = soorten.js(f"https://api.gbif.org/v1/species/{k}/vernacularNames?limit=100") or {"results": []}
    nl = sorted({v["vernacularName"].lower() for v in vn["results"] if v.get("language") == "nld"})
    rij.append({"key": k, "wet": sp.get("canonicalName"), "nl": nl[:3], "groep": sp.get("class"), "bezoeken_aanwezig": c["count"], "aandeel": round(c["count"] / bezoeken, 3)})
uit = {"bron": "ANEMOON SMP via GBIF (CC BY 4.0), dataset " + A, "vak": VAK, "maand": maand, "bezoeken": bezoeken, "jaren": jaren, "soorten": rij}
json.dump(uit, open(f"uitkomsten/strand_scheveningen_m{maand}.json", "w"), indent=1, ensure_ascii=False)
print(f"{bezoeken} strandbezoeken in maand {maand}, jaren {jaren[0]}-{jaren[-1]} ({len(jaren)} jaar)")
for r in rij[:45]:
    print(f"{r['aandeel']:5.0%}  {r['wet']:30} {', '.join(r['nl'][:2]):40} {r['groep']}")
