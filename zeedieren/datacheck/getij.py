"""Hoog- en laagwater (astronomisch, dus een voorspelling zonder wind) voor Scheveningen
uit de Waterwebservices van Rijkswaterstaat (ddapi20). Geen CORS: ophalen via een GitHub Action.
Draai: python3 getij.py 2026-11-07 2026-11-09"""
import json, sys, urllib.request
from datetime import datetime

URL = "https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenWaarnemingen"

def extremen(locatie, van, tot):
    body = {"Locatie": {"Code": locatie},
            "AquoPlusWaarnemingMetadata": {"AquoMetadata": {"Compartiment": {"Code": "OW"}, "Grootheid": {"Code": "WATHTE"},
                                                            "Groepering": {"Code": "GETETBRKD2"}, "ProcesType": "astronomisch"}},
            "Periode": {"Begindatumtijd": f"{van}T00:00:00.000+01:00", "Einddatumtijd": f"{tot}T00:00:00.000+01:00"}}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "User-Agent": "zeedieren-datacheck/0.1"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read())
    uit = []
    for w in d.get("WaarnemingenLijst", []):
        for m in w["MetingenLijst"]:
            uit.append({"tijd": m["Tijdstip"], "cm_nap": m["Meetwaarde"].get("Waarde_Numeriek")})
    uit.sort(key=lambda x: x["tijd"])
    # hoog of laag: vergelijk met de buren
    for i, x in enumerate(uit):
        buren = [uit[j]["cm_nap"] for j in (i - 1, i + 1) if 0 <= j < len(uit)]
        x["soort"] = "hoogwater" if all(x["cm_nap"] > b for b in buren) else "laagwater"
    return uit

if __name__ == "__main__":
    van, tot = (sys.argv[1:3] + ["2026-11-07", "2026-11-09"])[:2]
    e = extremen("scheveningen", van, tot)
    json.dump(e, open(f"uitkomsten/getij_scheveningen_{van}.json", "w"), indent=1)
    for x in e:
        print(datetime.fromisoformat(x["tijd"]).strftime("%a %d %b %H:%M"), f"{x['cm_nap']:>5} cm NAP", x["soort"])
