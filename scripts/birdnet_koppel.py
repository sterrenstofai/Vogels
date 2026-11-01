"""Koppelt de soortenlijst van BirdNET aan de soorten van Voggels, op wetenschappelijke naam (en synoniemen).

Schrijft site/data/birdnet.json: { "soorten": {index: key}, "geen_vogel": [index, ...] }
Alleen soorten die in Twente gemeld zijn, komen in de koppeling; de rest van de 6.500 soorten laat de site weg.
Gebruik vanuit de repo-root: python3 scripts/birdnet_koppel.py
"""
import json

S = json.load(open("site/data/soorten.json"))
N = json.load(open("data/namen.json"))
labels = [r.strip() for r in open("site/birdnet/v2.4/labels/en_us.txt", encoding="utf-8") if r.strip()]

naam_naar_key = {}
for k, s in S.items():
    n = N.get(k, {})
    for x in [s["wet"], n.get("wet_ioc"), n.get("wet_gbif"), n.get("xc"), *n.get("synoniemen", [])]:
        if x:
            naam_naar_key.setdefault(" ".join(x.split()[:2]).lower(), k)

koppel, geen_vogel = {}, []
for i, regel in enumerate(labels):
    wet, _, gewoon = regel.partition("_")
    if wet == gewoon or wet.split()[0] in ("Human", "Engine", "Dog", "Environmental", "Fireworks", "Gun", "Noise", "Power", "Siren"):
        geen_vogel.append(i)
        continue
    k = naam_naar_key.get(" ".join(wet.split()[:2]).lower())
    if k:
        koppel[i] = k

json.dump({"soorten": koppel, "geen_vogel": geen_vogel}, open("site/data/birdnet.json", "w"), separators=(",", ":"))
mis = [S[k]["nl"] for k in S if k not in koppel.values() and S[k]["n"] >= 50]
print(len(koppel), "gekoppeld,", len(geen_vogel), "geen vogel; Twentse soorten (50+) zonder BirdNET:", ", ".join(mis))
