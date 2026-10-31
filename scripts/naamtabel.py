"""Naamtabel: GBIF-soort -> Nederlandse naam, status in Nederland, naam bij xeno-canto.

Bronnen: Wikipedia NL, 'Lijst van vogels in de Benelux' (status Nederland) en
'Lijst van vogels in Europa' (oudere taxonomie, voor synoniemen).
Gebruik: python3 naamtabel.py twente_soorten.json benelux.txt europa.txt > ../data/namen.json
"""
import json, re, sys

def schoon(cel):
    cel = re.sub(r"<ref.*?(</ref>|/>)", "", cel)
    cel = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", cel)
    return re.sub(r"''|&nbsp;|style=\"[^\"]*\"\s*\|", "", cel).strip()

def rijen(wikitext):
    for blok in wikitext.split("|-"):
        cellen = [schoon(c) for c in re.split(r"\|\||\n\|", "\n" + blok.strip()) if c.strip()]
        cellen = [c for c in cellen if not c.startswith(("colspan", "{", "!"))]
        if len(cellen) >= 2 and re.fullmatch(r"[A-Z][a-z]+ [a-z-]+", cellen[1]):
            yield cellen

def naam_zonder_haakjes(n):
    return re.sub(r"\s*\(.*?\)", "", n).strip()

def main(twente, benelux, europa):
    T = json.load(open(twente))
    bnl = {}
    for c in rijen(open(benelux).read()):
        bnl[c[1]] = {"nl": naam_zonder_haakjes(c[0]), "status": c[3] if len(c) > 3 else (c[2] if len(c) > 2 else "")}
    per_nlnaam = {v["nl"].lower(): (k, v) for k, v in bnl.items()}
    eur = {c[1]: naam_zonder_haakjes(c[0]) for c in rijen(open(europa).read())}

    # Bekende verschillen tussen GBIF-backbone en IOC/xeno-canto
    xc_naam = {"Sylvia communis": "Curruca communis", "Sylvia curruca": "Curruca curruca",
               "Phylloscopus sibillatrix": "Phylloscopus sibilatrix", "Porzana parva": "Zapornia parva"}
    uit, open_eind = {}, []
    for k, n in T["namen"].items():
        wet = n["wet"]
        treffer, via = None, None
        for kandidaat in [wet, xc_naam.get(wet)]:
            if kandidaat in bnl:
                treffer, via = (kandidaat, bnl[kandidaat]), "wetenschappelijk"
                break
        if not treffer and wet in eur and eur[wet].lower() in per_nlnaam:
            treffer, via = per_nlnaam[eur[wet].lower()], "via Europa-lijst"
        if not treffer and n["nl"] and n["nl"].lower() in per_nlnaam:
            treffer, via = per_nlnaam[n["nl"].lower()], "via GBIF-naam"
        status = treffer[1]["status"] if treffer else ""
        uit[k] = {"wet_gbif": wet, "wet_ioc": treffer[0] if treffer else None,
                  "xc": xc_naam.get(wet, wet), "nl": treffer[1]["nl"] if treffer else None,
                  "nl_gbif": n["nl"], "status_nl": status, "exoot": "exoot" in status,
                  "koppeling": via, "waarnemingen_twente": T["totaal"][k]}
        if not treffer:
            open_eind.append((T["totaal"][k], wet, n["nl"]))
    json.dump(uit, sys.stdout, ensure_ascii=False, indent=1)
    print(f"benelux {len(bnl)}, europa {len(eur)}, soorten {len(uit)}, zonder koppeling {len(open_eind)}", file=sys.stderr)
    for r in sorted(open_eind, key=lambda r: -r[0]):
        print("  open:", r, file=sys.stderr)

if __name__ == "__main__":
    main(*sys.argv[1:4])
