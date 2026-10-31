"""Vogelgroepen voor de simulatiekaart: kleur en gedrag per groep, op basis van familie en orde (GBIF).

Gebruik los: python3 scripts/vogelgroepen.py datacheck/twente_soorten.json site/data/soorten.json
(voegt het veld "groep" toe aan soorten.json)
"""
import json, sys

GROEPEN = {
    # sleutel: (naam, gedrag)
    "zang": ("Zangvogels", "springen"),
    "kraai": ("Kraaien", "lopen"),
    "zwaluw": ("Zwaluwen en gierzwaluwen", "jagen"),
    "eend": ("Eenden, futen en rallen", "drijven"),
    "gans": ("Ganzen en zwanen", "zwerm"),
    "meeuw": ("Meeuwen en sterns", "zweven"),
    "steltloper": ("Steltlopers", "zwerm"),
    "reiger": ("Reigers, ooievaars en kraanvogels", "staan"),
    "roof": ("Roofvogels en uilen", "cirkelen"),
    "duif": ("Duiven", "lopen"),
    "specht": ("Spechten", "springen"),
    "overig": ("Overige vogels", "springen"),
}

ZWERM_SOORTEN = {"Sturnus vulgaris", "Grus grus", "Chroicocephalus ridibundus", "Pluvialis apricaria", "Vanellus vanellus"}


def groep(familie, orde, wet):
    familie, orde = familie or "", orde or ""
    if familie == "Corvidae":
        return "kraai"
    if familie in ("Apodidae", "Hirundinidae"):
        return "zwaluw"
    if orde == "Passeriformes":
        return "zang"
    if familie == "Anatidae":
        return "gans" if wet.split()[0] in ("Anser", "Branta", "Cygnus") else "eend"
    if familie in ("Podicipedidae", "Rallidae", "Phalacrocoracidae", "Gaviidae"):
        return "eend"
    if familie in ("Laridae", "Sternidae"):
        return "meeuw"
    if orde == "Charadriiformes":
        return "steltloper"
    if familie in ("Ardeidae", "Ciconiidae", "Threskiornithidae", "Gruidae"):
        return "reiger"
    if orde in ("Accipitriformes", "Falconiformes", "Strigiformes"):
        return "roof"
    if orde == "Columbiformes":
        return "duif"
    if orde == "Piciformes":
        return "specht"
    return "overig"


def voeg_toe(twente_pad, soorten_pad):
    namen = json.load(open(twente_pad))["namen"]
    S = json.load(open(soorten_pad))
    for k, s in S.items():
        n = namen.get(k, {})
        s["groep"] = groep(n.get("familie"), n.get("orde"), n.get("wet") or s["wet"])
        if (n.get("wet") or s["wet"]) in ZWERM_SOORTEN:
            s["zwerm"] = True
    json.dump(S, open(soorten_pad, "w"), ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    print(Counter(s["groep"] for s in S.values()))


if __name__ == "__main__":
    voeg_toe(*sys.argv[1:3])
