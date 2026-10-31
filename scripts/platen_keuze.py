"""Kies per soort een plaat uit Naumann, Nozeman & Sepp of Gould (Wikimedia Commons), en maak een lijst van de gaten.

Invoer: een of meer *_raw.json-bestanden (bestandsnaam -> bron, categorieën, maten, licentie)
uit datacheck/platen.py en de KB-scans van Nederlandsche Vogelen, plus data/namen.json met synoniemen.
Voorkeur: minstens 800 px breed; Naumann, dan Sepp (beide vogels in een landschap), dan Gould
(witte achtergrond); een plaat met alleen deze soort; publiek domein of 'no restrictions'; de grootste.
Handmatig gecontroleerde keuzes en redenen voor een lege plaat staan in data/platen_handmatig.json
(naast namen.json) en gaan voor.
Gebruik: python3 platen_keuze.py ../data/namen.json platen_raw.json sepp_raw.json > ../data/platen.json
"""
import json, os, re, sys

MIN_WAARNEMINGEN = 50
MIN_BREEDTE = 800
VRIJ = ("public domain", "no restrictions", "pd")
VOORKEUR = {"Naumann": 0, "Sepp": 1, "Gould": 2}


def norm(s):
    return re.sub(r"[^a-z]+", " ", s.lower())


def main(namen, *raws):
    P = {}
    for raw in raws:
        P.update(json.load(open(raw)))
    N = {k: n for k, n in json.load(open(namen)).items()
         if n["wet_gbif"] and n["waarnemingen_twente"] >= MIN_WAARNEMINGEN}
    hoofdnamen = {n[v] for n in N.values() for v in ("wet_gbif", "xc", "wet_ioc") if n[v]}
    # Synoniemen alleen als ze niet de geldende naam van een andere soort zijn
    namen_per_soort = {k: {n["wet_gbif"], n["xc"]} | ({n["wet_ioc"]} if n["wet_ioc"] else set())
                       | (set(n.get("synoniemen", [])) - hoofdnamen) for k, n in N.items()}
    patronen = {k: [re.compile(rf"\b{norm(w).strip()}\b") for w in ws] for k, ws in namen_per_soort.items()}

    per_bestand = {}
    for f, v in P.items():
        tekst = norm(" | ".join([f[5:]] + v["cats"]))
        per_bestand[f] = {k for k, ps in patronen.items() if any(p.search(tekst) for p in ps)}

    pad_hand = os.path.join(os.path.dirname(namen), "platen_handmatig.json")
    H = json.load(open(pad_hand)) if os.path.exists(pad_hand) else {}

    uit, gaten, leeg = {}, [], {}
    for k, n in N.items():
        if k in H:
            h = H[k]
            if "geen_plaat" in h:
                leeg[k] = {"nl": n["nl"] or n["nl_gbif"], "reden": h["geen_plaat"]}
            else:
                uit[k] = {"nl": n["nl"] or n["nl_gbif"], **h, "handmatig": True,
                          "pagina": "https://commons.wikimedia.org/wiki/" + h["bestand"].replace(" ", "_")}
            continue
        kandidaten = []
        for f, soorten in per_bestand.items():
            v = P[f]
            if k not in soorten or not (v["licentie"] or "").lower().startswith(VRIJ):
                continue
            kandidaten.append((((v["b"] or 0) < MIN_BREEDTE, VOORKEUR[v["bron"]], len(soorten) > 1, -(v["b"] or 0)), f, v, soorten))
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
    json.dump({"platen": uit, "lege_plaat": leeg, "gaten": gaten}, sys.stdout, ensure_ascii=False, indent=1)
    print(f"met plaat {len(uit)}, lege plaat {len(leeg)}, gaten {len(gaten)}", file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:])
