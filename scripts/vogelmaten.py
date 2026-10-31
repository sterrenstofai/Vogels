"""Koppelt lichaamsmaten uit AVONET aan onze soorten, voor de abstracte 3D-vogel.

AVONET (Tobias et al. 2022, Ecology Letters 25: 581-597), CC BY 4.0.
Gemiddelde maten per soort van gemeten museumvogels: snavel, vleugel, staart, loopbeen, gewicht.

Gebruik: python3 scripts/vogelmaten.py pad/naar/AVONET\\ Supplementary\\ dataset\\ 1.xlsx
Schrijft site/data/maten.json: { key: [snavel, snavelbreedte, snavelhoogte, loopbeen, vleugel, kipp, staart, gewicht, leefwijze, aantal gemeten vogels] }
Lengtes in millimeters, gewicht in grammen.
"""
import json
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
VELDEN = ["Beak.Length_Culmen", "Beak.Width", "Beak.Depth", "Tarsus.Length", "Wing.Length", "Kipps.Distance", "Tail.Length", "Mass"]


def lees(ws):
    rijen = ws.iter_rows(values_only=True)
    kop = list(next(rijen))
    naam = next(k for k in kop if k and str(k).startswith("Species"))
    uit = {}
    for r in rijen:
        d = dict(zip(kop, r))
        if isinstance(d[naam], str):
            uit[d[naam].strip()] = d
    return uit


def main(pad):
    wb = openpyxl.load_workbook(pad, read_only=True)
    bladen = [lees(wb["AVONET2_eBird"]), lees(wb["AVONET1_BirdLife"]), lees(wb["AVONET3_BirdTree"])]
    S = json.loads((ROOT / "site/data/soorten.json").read_text())
    N = json.loads((ROOT / "data/namen.json").read_text())
    maten, mis = {}, []
    for key, s in S.items():
        n = N.get(key, {})
        namen = [s["wet"], n.get("wet_ioc"), n.get("wet_gbif"), n.get("xc"), *n.get("synoniemen", [])]
        namen = [" ".join(x.split()[:2]) for x in namen if x]
        d = next((b[x] for x in namen for b in bladen if x in b), None)
        if not d:
            mis.append(s["nl"])
            continue
        waarden = []
        for v in VELDEN:
            w = d.get(v)
            waarden.append(round(float(w), 1) if w not in (None, "NA") else None)
        waarden.append(d.get("Primary.Lifestyle") or "")
        n_gemeten = d.get("Total.individuals")
        waarden.append(int(n_gemeten) if isinstance(n_gemeten, (int, float)) else None)
        maten[key] = waarden
    (ROOT / "site/data/maten.json").write_text(json.dumps(maten, separators=(",", ":"), ensure_ascii=False))
    print(len(maten), "soorten met maten,", len(mis), "zonder:", ", ".join(mis))


if __name__ == "__main__":
    main(sys.argv[1])
