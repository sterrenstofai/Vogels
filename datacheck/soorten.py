"""Per Observation.org-vak in Twente: soorten x maanden. Plus soortnamen (wetenschappelijk + Nederlands)."""
import json, math, sys
from concurrent.futures import ThreadPoolExecutor
from shapely.geometry import shape, box
from shapely.ops import unary_union
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from datacheck import get, GBIF
from gemeenten import TWENTE, VAK, vak_data
feats = json.load(open(sys.argv[1]))["features"]
alle = [shape(f["geometry"]) for f in feats]
gem = {f["properties"]["naam"]: shape(f["geometry"]) for f in feats if f["properties"]["naam"] in TWENTE}
tw = unary_union(list(gem.values())); minx, miny, maxx, maxy = tw.bounds
hoeken = []
for i in range(math.floor(miny/VAK), math.ceil(maxy/VAK)):
    for j in range(math.floor(minx/VAK), math.ceil(maxx/VAK)):
        h = (round(i*VAK,2), round(j*VAK,2))
        if box(h[1], h[0], h[1]+VAK, h[0]+VAK).intersection(tw).area > 1e-6: hoeken.append(h)
with ThreadPoolExecutor(8) as ex: vakken = dict(ex.map(vak_data, hoeken))
totaal = {}
for v in vakken.values():
    for s, c in v["soorten"].items(): totaal[s] = totaal.get(s, 0) + c
def naam(k):
    d = get(f"{GBIF}/species/{k}")
    vn = get(f"{GBIF}/species/{k}/vernacularNames", {"limit": 200})["results"]
    nl = [x["vernacularName"] for x in vn if x.get("language") == "nld"]
    return k, {"wet": d.get("canonicalName"), "nl": nl[0] if nl else None, "familie": d.get("family"), "orde": d.get("order")}
with ThreadPoolExecutor(8) as ex: namen = dict(ex.map(naam, totaal))
json.dump({"vakken": {f"{h[0]},{h[1]}": v for h, v in vakken.items()}, "totaal": totaal, "namen": namen},
          open("twente_soorten.json", "w"), ensure_ascii=False)
ge50 = sorted((c, namen[s]["nl"], namen[s]["wet"]) for s, c in totaal.items() if c >= 50)
print("vakken", len(vakken), "soorten", len(totaal), ">=50", len(ge50), "zonder NL-naam", sum(1 for s in totaal if not namen[s]["nl"]))
print("minst:", ge50[:6]); print("meest:", ge50[-6:])
