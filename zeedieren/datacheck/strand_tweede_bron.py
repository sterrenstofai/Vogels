"""Tweede bron voor de strandproef: alle GBIF-meldingen (vooral Observation.org, CC BY-NC) in hetzelfde vak,
in dezelfde maand, 2016-2025, alleen ongewervelden, vissen en zeezoogdieren uit zee. Telt meldingen, geen bezoeken."""
import json, sys, urllib.parse
import soorten
VAK = "POLYGON((4.17 52.03,4.30 52.03,4.30 52.13,4.17 52.13,4.17 52.03))"
maand = int(sys.argv[1]) if len(sys.argv) > 1 else 11
GROEPEN = {"Bivalvia", "Gastropoda", "Malacostraca", "Asteroidea", "Echinoidea", "Scyphozoa", "Hydrozoa", "Anthozoa",
           "Polychaeta", "Cephalopoda", "Tentaculata", "Actinopterygii", "Elasmobranchii", "Mammalia"}
basis = f"https://api.gbif.org/v1/occurrence/search?month={maand}&year=2016,2025&occurrenceStatus=PRESENT&limit=0&geometry=" + urllib.parse.quote(VAK)
d = soorten.js(basis + "&facet=speciesKey&speciesKey.facetLimit=400&facet=datasetKey")
rij = []
for c in d["facets"][0]["counts"]:
    sp = soorten.js(f"https://api.gbif.org/v1/species/{c['name']}") or {}
    if sp.get("class") not in GROEPEN or (sp.get("class") == "Mammalia" and sp.get("order") not in ("Carnivora", "Cetacea")):
        continue
    rij.append({"key": c["name"], "wet": sp.get("canonicalName"), "groep": sp.get("class"), "meldingen": c["count"]})
json.dump({"maand": maand, "vak": VAK, "datasets": d["facets"][1]["counts"], "soorten": rij},
          open(f"uitkomsten/strand_scheveningen_gbif_m{maand}.json", "w"), indent=1, ensure_ascii=False)
for r in rij[:30]:
    print(f"{r['meldingen']:5}  {r['wet']:30} {r['groep']}")
