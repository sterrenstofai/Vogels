"""Steekproef: hoeveel precieze waarnemingen (niet Observation.org, onzekerheid <=500 m of eBird-punt)
liggen binnen 500 m van een willekeurig Twents adres?"""
import json, random, sys
from concurrent.futures import ThreadPoolExecutor
from shapely.geometry import shape, Point
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from datacheck import get, basis, GBIF, OBS, afstand
from gemeenten import TWENTE
random.seed(1)
feats = json.load(open(sys.argv[1]))["features"]
gem = {f["properties"]["naam"]: shape(f["geometry"]) for f in feats if f["properties"]["naam"] in TWENTE}
def adres(_):
    while True:
        g = random.choice(TWENTE); geo = gem[g]; minx, miny, maxx, maxy = geo.bounds
        p = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if not geo.contains(p): continue
        d = get("https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse",
                {"lat": p.y, "lon": p.x, "type": "adres", "rows": 1, "distance": 150, "fl": "weergavenaam,centroide_ll"})["response"]["docs"]
        if d:
            lon, lat = map(float, d[0]["centroide_ll"][6:-1].split())
            return g, d[0]["weergavenaam"], lat, lon
EBIRD = "4fa7b334-ce0d-4e88-aaae-2e0c138d049e"
def ophalen(params):
    recs, off = [], 0
    while off < 6000:
        d = get(f"{GBIF}/occurrence/search", {**params, "limit": 300, "offset": off})
        recs += d["results"]
        if d["endOfRecords"]: break
        off += 300
    return recs
def precies(a):
    g, naam, lat, lon = a
    p = basis(geoDistance=f"{lat},{lon},500m")
    # Observation.org valt af door de onzekerheidsfilter (altijd 5000 m); eBird geeft geen onzekerheid op
    recs = ophalen({**p, "coordinateUncertaintyInMeters": "0,500"}) + ophalen({**p, "datasetKey": EBIRD})
    goed = {r["key"]: r for r in recs if (r.get("coordinateUncertaintyInMeters") or 0) <= 500}.values()
    return {"gemeente": g, "adres": naam, "n": len(goed), "soorten": len({r.get("speciesKey") for r in goed}),
            "dagen": len({r.get("eventDate", "")[:10] for r in goed})}
with ThreadPoolExecutor(8) as ex:
    adressen = list(ex.map(adres, range(140)))
    res = list(ex.map(precies, adressen))
json.dump(res, open("straat_rapport.json", "w"), ensure_ascii=False, indent=1)
n = len(res)
for drempel in [0, 1, 10, 50]:
    print(f"adressen met >{drempel} precieze waarn. binnen 500 m: {sum(r['n'] > drempel for r in res)}/{n}")
print("adressen met >=5 verschillende dagen:", sum(r["dagen"] >= 5 for r in res), "/", n)
print("mediaan soorten:", sorted(r["soorten"] for r in res)[n // 2])
