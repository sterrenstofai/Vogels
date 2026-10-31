import json, math, sys
from concurrent.futures import ThreadPoolExecutor
from shapely.geometry import shape, box
from shapely.ops import unary_union
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from datacheck import get, basis, GBIF, OBS
from gemeenten import TWENTE, VAK
feats = json.load(open(sys.argv[1]))["features"]
alle = [shape(f["geometry"]) for f in feats]
gem = {f["properties"]["naam"]: shape(f["geometry"]) for f in feats if f["properties"]["naam"] in TWENTE}
tw = unary_union(list(gem.values())); minx, miny, maxx, maxy = tw.bounds
W = {}
for i in range(math.floor(miny/VAK), math.ceil(maxy/VAK)):
    for j in range(math.floor(minx/VAK), math.ceil(maxx/VAK)):
        h = (round(i*VAK,2), round(j*VAK,2)); cel = box(h[1], h[0], h[1]+VAK, h[0]+VAK)
        if not cel.intersects(tw): continue
        nl = sum(cel.intersection(a).area for a in alle if a.intersects(cel))
        w = {g: cel.intersection(x).area/nl for g, x in gem.items() if x.intersects(cel)}
        w = {g: v for g, v in w.items() if v > 0.001}
        if w: W[h] = w
def n(h):
    return get(f"{GBIF}/occurrence/search", {**basis(datasetKey=OBS, decimalLatitude=f"{h[0]},{h[0]}", decimalLongitude=f"{h[1]},{h[1]}"), "limit": 0})["count"]
with ThreadPoolExecutor(8) as ex: N = dict(zip(W, ex.map(n, W)))
naar_rato = {g: sum(w.get(g,0)*N[h] for h, w in W.items()) for g in TWENTE}
meerderheid = {g: 0 for g in TWENTE}; geen = {g: 0 for g in TWENTE}
for h, w in W.items():
    g = max(w, key=w.get); meerderheid[g] += N[h] * sum(w.values())
# grootste vak per gemeente: welk deel van de schatting komt uit één vak
top = {g: max((w.get(g,0)*N[h] for h, w in W.items()), default=0)/naar_rato[g] for g in TWENTE}
print(f"{'gemeente':16}{'naar rato':>10}{'meerderheid':>12}{'verschil':>9}{'grootste vak':>13}")
for g in TWENTE:
    a, b = naar_rato[g], meerderheid[g]
    print(f"{g:16}{a:>10.0f}{b:>12.0f}{(b-a)/a:>+9.0%}{top[g]:>13.0%}")
print("drukste vakken:", sorted(((N[h], h, {k: round(v,2) for k, v in W[h].items()}) for h in W), reverse=True)[:4])
