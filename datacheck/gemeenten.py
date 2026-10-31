"""Schatting per Twentse gemeente.

Observation.org-records zijn in GBIF vergroofd naar 0,05-graadvakken. We verdelen elk vak
over gemeenten naar rato van het Nederlandse landoppervlak dat in die gemeente valt.
Aanname: waarnemingen liggen gelijkmatig verspreid binnen een vak (dat is niet zo).
Overige bronnen (eBird, iNaturalist, ...) tellen we echt binnen de gemeentegrens.

Draaien: python3 -I gemeenten.py <pad/naar/gemeenten.json> > gemeenten_rapport.json
"""
import json, math, sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from shapely.geometry import shape, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from datacheck import get, basis, GBIF, OBS

TWENTE = ["Almelo", "Borne", "Dinkelland", "Enschede", "Haaksbergen", "Hellendoorn",
          "Hengelo (O)", "Hof van Twente", "Losser", "Oldenzaal", "Rijssen-Holten",
          "Tubbergen", "Twenterand", "Wierden"]
VAK = 0.05


def facets(params, velden):
    d = get(f"{GBIF}/occurrence/search", {**params, "limit": 0, "facetLimit": 2000, "facet": velden})
    return d["count"], {f["field"]: {c["name"]: c["count"] for c in f["counts"]} for f in d["facets"]}


def vak_data(hoek):
    clat, clon = hoek
    p = basis(datasetKey=OBS, decimalLatitude=f"{clat},{clat}", decimalLongitude=f"{clon},{clon}")
    n, f = facets(p, ["month", "speciesKey"])
    per_maand = {}
    for m in range(1, 13):
        per_maand[m] = facets({**p, "month": m}, ["speciesKey"])[1].get("SPECIES_KEY", {}) if n else {}
    return hoek, {"n": n, "maanden": {int(k): v for k, v in f.get("MONTH", {}).items()},
                  "soorten": f.get("SPECIES_KEY", {}), "soort_maand": per_maand}


def overige_bronnen(geom):
    g = orient(geom.simplify(0.003), sign=1.0)
    wkt = g.wkt
    n, f = facets(basis(geometry=wkt), ["datasetKey"])
    keys = [k for k in f.get("DATASET_KEY", {}) if k != OBS]
    if not keys:
        return {"n": 0, "soorten": 0, "maanden": {}, "datasets": {}}
    m, f2 = facets(basis(geometry=wkt, datasetKey=keys), ["month", "speciesKey", "recordedBy"])
    top = max(f2.get("RECORDED_BY", {"": 0}).values())
    return {"n": m, "soorten": len(f2.get("SPECIES_KEY", {})),
            "maanden": {int(k): v for k, v in f2.get("MONTH", {}).items()},
            "datasets": {k: f["DATASET_KEY"][k] for k in keys},
            "aandeel_grootste_waarnemer": round(top / m, 2) if m else None}


def main(pad):
    feats = json.load(open(pad))["features"]
    alle = [shape(f["geometry"]) for f in feats]
    gem = {f["properties"]["naam"]: shape(f["geometry"]) for f in feats if f["properties"]["naam"] in TWENTE}
    twente = unary_union(list(gem.values()))
    minx, miny, maxx, maxy = twente.bounds

    # Vakken en gewichten: aandeel van het NL-landdeel van het vak dat in elke gemeente ligt.
    gewichten = {}
    for i in range(math.floor(miny / VAK), math.ceil(maxy / VAK)):
        for j in range(math.floor(minx / VAK), math.ceil(maxx / VAK)):
            hoek = (round(i * VAK, 2), round(j * VAK, 2))
            cel = box(hoek[1], hoek[0], hoek[1] + VAK, hoek[0] + VAK)
            if not cel.intersects(twente):
                continue
            nl = sum(cel.intersection(a).area for a in alle if a.intersects(cel))
            w = {g: cel.intersection(geo).area / nl for g, geo in gem.items() if geo.intersects(cel)}
            w = {g: v for g, v in w.items() if v > 0.001}
            if w:
                gewichten[hoek] = w

    with ThreadPoolExecutor(8) as ex:
        vakken = dict(ex.map(vak_data, gewichten))
        overig = dict(zip(gem, ex.map(overige_bronnen, gem.values())))

    rapport = {}
    for g in TWENTE:
        n, gedeeld = 0.0, 0.0
        maanden, soorten, soort_maand = defaultdict(float), defaultdict(float), defaultdict(lambda: defaultdict(float))
        bovengrens = set()
        for hoek, w in gewichten.items():
            if g not in w:
                continue
            v, wg = vakken[hoek], w[g]
            n += wg * v["n"]
            if wg < 0.9:
                gedeeld += wg * v["n"]
            for m, c in v["maanden"].items():
                maanden[m] += wg * c
            for s, c in v["soorten"].items():
                soorten[s] += wg * c
                bovengrens.add(s)
            for m, sc in v["soort_maand"].items():
                for s, c in sc.items():
                    soort_maand[s][m] += wg * c
        km2 = gem[g].area * (111.32 ** 2) * math.cos(math.radians(gem[g].centroid.y))
        rapport[g] = {
            "km2": round(km2),
            "vakken": sum(1 for w in gewichten.values() if g in w),
            "obs_geschat": round(n),
            "obs_aandeel_uit_gedeelde_vakken": round(gedeeld / n, 2) if n else None,
            "obs_maanden": {m: round(maanden[m]) for m in range(1, 13)},
            "obs_soorten_geschat_min1": sum(1 for c in soorten.values() if c >= 1),
            "obs_soorten_bovengrens": len(bovengrens),
            "obs_soorten_ge50": sum(1 for c in soorten.values() if c >= 50),
            # soorten met per maand genoeg data (>=5 geschatte records in elke maand waarin ze voorkomen is te streng;
            # we tellen soorten die in minstens 1 maand >=10 en in totaal >=50 hebben)
            "obs_soorten_kalender": sum(1 for s, mm in soort_maand.items()
                                        if sum(mm.values()) >= 50 and max(mm.values()) >= 10),
            "overig": overig[g],
        }
    # Twente als geheel, voor de seizoenskalender
    tw_soort = defaultdict(float)
    for hoek, w in gewichten.items():
        t = sum(w.values())
        for s, c in vakken[hoek]["soorten"].items():
            tw_soort[s] += t * c
    rapport["_Twente"] = {"vakken": len(gewichten),
                          "obs_geschat": round(sum(sum(w.values()) * vakken[h]["n"] for h, w in gewichten.items())),
                          "soorten_min1": sum(1 for c in tw_soort.values() if c >= 1),
                          "soorten_ge50": sum(1 for c in tw_soort.values() if c >= 50),
                          "soorten_ge500": sum(1 for c in tw_soort.values() if c >= 500)}
    json.dump(rapport, sys.stdout, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1])
