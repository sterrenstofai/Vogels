"""Zet plaat en reden-voor-een-lege-plaat uit data/platen.json in site/data/soorten.json,
zonder de meldingen opnieuw op te halen. Zelfde opbouw als in bouw_sitedata.py.

Gebruik vanuit de repo-root: python3 scripts/platen_naar_site.py
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bouw_sitedata import WERKEN  # noqa: E402


def main():
    platen = json.load(open("data/platen.json"))
    pad = "site/data/soorten.json"
    S = json.load(open(pad))
    veranderd = 0
    for k, s in S.items():
        p = platen["platen"].get(k)
        plaat = None
        if p and os.path.exists(f"site/platen/{s['slug']}.webp"):
            werk = WERKEN[p["bron"]]
            if p["bron"] == "Gould" and "century" in p["bestand"].lower():
                werk = "J. Gould, A Century of Birds from the Himalaya Mountains (1831)"
            plaat = {"src": f"/platen/{s['slug']}.webp", "klein": f"/platen/{s['slug']}-k.webp", "werk": werk,
                     "pagina": p["pagina"], "ook": p.get("ook_op_plaat", [])}
        reden = platen["lege_plaat"].get(k, {}).get("reden")
        if plaat != s.get("plaat") or reden != s.get("geen_plaat"):
            s["plaat"], s["geen_plaat"] = plaat, reden
            veranderd += 1
            print(s["nl"], "plaat" if plaat else f"leeg: {reden}")
    json.dump(S, open(pad, "w"), ensure_ascii=False, separators=(",", ":"))
    print(veranderd, "soorten bijgewerkt")


if __name__ == "__main__":
    main()
