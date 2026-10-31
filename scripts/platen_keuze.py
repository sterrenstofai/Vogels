"""Kies per soort een plaat uit Naumann of Gould (Wikimedia Commons), en maak een lijst van de gaten.

Invoer: platen_raw.json uit datacheck/platen.py (bestandsnaam, categorieën, maten, licentie).
Voorkeur: minstens 800 px breed; Naumann (één stijl door de hele site), dan Gould;
een plaat met alleen deze soort; publiek domein of 'no restrictions'; de grootste.
Gebruik: python3 platen_keuze.py platen_raw.json ../data/namen.json > ../data/platen.json
"""
import json, re, sys

MIN_WAARNEMINGEN = 50
MIN_BREEDTE = 800
VRIJ = ("public domain", "no restrictions", "pd")


def norm(s):
    return re.sub(r"[^a-z]+", " ", s.lower())


def main(raw, namen):
    P = json.load(open(raw))
    N = {k: n for k, n in json.load(open(namen)).items()
         if n["wet_gbif"] and n["waarnemingen_twente"] >= MIN_WAARNEMINGEN}
    namen_per_soort = {k: {n["wet_gbif"], n["xc"]} | ({n["wet_ioc"]} if n["wet_ioc"] else set()) for k, n in N.items()}
    patronen = {k: [re.compile(rf"\b{norm(w).strip()}\b") for w in ws] for k, ws in namen_per_soort.items()}

    per_bestand = {}
    for f, v in P.items():
        tekst = norm(" | ".join([f[5:]] + v["cats"]))
        per_bestand[f] = {k for k, ps in patronen.items() if any(p.search(tekst) for p in ps)}

    uit, gaten = {}, []
    for k, n in N.items():
        kandidaten = []
        for f, soorten in per_bestand.items():
            v = P[f]
            if k not in soorten or not (v["licentie"] or "").lower().startswith(VRIJ):
                continue
            kandidaten.append((((v["b"] or 0) < MIN_BREEDTE, v["bron"] != "Naumann", len(soorten) > 1, -(v["b"] or 0)), f, v, soorten))
        kandidaten.sort(key=lambda x: x[0])
        if not kandidaten:
            gaten.append({"soort": k, "nl": n["nl"] or n["nl_gbif"], "wet": n["wet_ioc"] or n["wet_gbif"],
                          "exoot_of_ontsnapt": n["exoot"] or not n["nl"], "waarnemingen_twente": n["waarnemingen_twente"]})
            continue
        _, f, v, soorten = kandidaten[0]
        uit[k] = {"nl": n["nl"] or n["nl_gbif"], "bestand": f, "bron": v["bron"], "url": (v["url"] or "").split("?")[0],
                  "breedte": v["b"], "hoogte": v["h"], "licentie": v["licentie"],
                  "pagina": "https://commons.wikimedia.org/wiki/" + f.replace(" ", "_"),
                  "ook_op_plaat": sorted(N[s]["nl"] or N[s]["nl_gbif"] for s in soorten if s != k),
                  "alternatieven": len(kandidaten) - 1}
    gaten.sort(key=lambda g: -g["waarnemingen_twente"])
    json.dump({"platen": uit, "gaten": gaten}, sys.stdout, ensure_ascii=False, indent=1)
    print(f"met plaat {len(uit)}, gaten {len(gaten)}", file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:3])
