"""Basiskaart van Twente voor de simulatiekaart, uit de vectortiles van de BRT-achtergrondkaart (PDOK).

Zoom 11: bos, heide, moeras, bebouwd gebied, water, hoofdwegen. Zoom 12: lokale wegen.
Vlakken worden per soort samengevoegd (naden tussen tegels weg), vereenvoudigd en afgerond.
Vereist shapely en mapbox-vector-tile.
Gebruik: python3 scripts/basiskaart.py datacheck/geo/gemeenten.json site/data/basiskaart.json
"""
import gzip, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import mapbox_vector_tile
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union, linemerge

URL = "https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1/tiles/WebMercatorQuad/{z}/{y}/{x}?f=mvt"
TWENTE_CODES = {"0141", "0147", "1774", "0153", "0158", "0163", "0164", "1735", "0168", "0173", "1742", "0183", "1700", "0189"}

VLAK = {"bos": "bos", "bos: dras, moeras, riet": "moeras", "heide": "heide", "heide: dras, moeras, riet": "moeras",
        "grasland: dras, moeras, riet": "moeras", "resterend: dras, moeras, riet": "moeras",
        "bebouwd gebied": "bebouwd", "zand": "heide"}
WEG = {"autosnelweg": "snelweg", "hoofdweg": "hoofdweg", "regionale weg": "regionaal", "regionale weg op brug": "regionaal",
       "lokale weg": "lokaal"}


def tegel(lat, lon, z):
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def naar_lonlat(px, py, x, y, z, extent=4096):
    n = 2 ** z
    lon = (x + px / extent) / n * 360 - 180
    merc_y = (y + 1 - py / extent) / n  # mapbox-vector-tile geeft y van onder naar boven
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * merc_y))))
    return lon, lat


CACHE = os.environ.get("TEGELCACHE", "/tmp/brt-tegels")


def haal(z, x, y):
    os.makedirs(CACHE, exist_ok=True)
    pad = os.path.join(CACHE, f"{z}_{x}_{y}.pbf")
    if not os.path.exists(pad):
        for poging in range(5):
            try:
                with urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=30) as r:
                    data = r.read()
                if data[:2] == b"\x1f\x8b":  # PDOK stuurt de tegels gzip-gecomprimeerd
                    data = gzip.decompress(data)
                open(pad, "wb").write(data)
                break
            except Exception:
                time.sleep(2 ** poging)
        else:
            return z, x, y, {}
    try:
        return z, x, y, mapbox_vector_tile.decode(open(pad, "rb").read())
    except Exception:
        os.remove(pad)  # kapotte of lege tegel: volgende keer opnieuw
        print(f"  tegel {z}/{x}/{y} onleesbaar", file=sys.stderr, flush=True)
        return z, x, y, {}


def omzetten(geom, x, y, z):
    def rec(c):
        if isinstance(c[0], (int, float)):
            return naar_lonlat(c[0], c[1], x, y, z)
        return [rec(i) for i in c]
    return shape({"type": geom["type"], "coordinates": rec(geom["coordinates"])})


def rond(o):
    if isinstance(o, float):
        return round(o, 4)
    if isinstance(o, (list, tuple)):
        return [rond(i) for i in o]
    return o


def main(gemeenten_pad, uit):
    feats = json.load(open(gemeenten_pad))["features"]
    twente = unary_union([shape(f["geometry"]) for f in feats if f["properties"]["code"] in TWENTE_CODES])
    kader = twente.buffer(0.04)
    minx, miny, maxx, maxy = kader.bounds
    taken = []
    for z, lagen in ((11, ("terreinvlak", "waterdeelvlak", "wegdeellijn", "spoorbaandeellijn")), (12, ("wegdeellijn",))):
        x0, y0 = tegel(maxy, minx, z)
        x1, y1 = tegel(miny, maxx, z)
        taken += [(z, x, y, lagen) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    print("tegels", len(taken), file=sys.stderr)

    vlakken, lijnen = {}, {}
    with ThreadPoolExecutor(6) as ex:
        res = list(ex.map(lambda t: (haal(*t[:3]), t[3]), taken))
    for (z, x, y, d), lagen in res:
        for laag in lagen:
            for f in d.get(laag, {}).get("features", []):
                vis = f["properties"].get("vistext", "")
                try:
                    g = omzetten(f["geometry"], x, y, z)
                except Exception:
                    continue
                if laag == "terreinvlak" and vis in VLAK:
                    vlakken.setdefault(VLAK[vis], []).append(g)
                elif laag == "waterdeelvlak":
                    vlakken.setdefault("water", []).append(g)
                elif laag == "wegdeellijn" and vis in WEG and (z == 12) == (WEG[vis] == "lokaal"):
                    lijnen.setdefault(WEG[vis], []).append(g)
                elif laag == "spoorbaandeellijn":
                    lijnen.setdefault("spoor", []).append(g)

    print("gedownload en gedecodeerd", {k: len(v) for k, v in {**vlakken, **lijnen}.items()}, file=sys.stderr, flush=True)
    uitvoer = {"vlakken": {}, "lijnen": {}}
    for soort, gs in vlakken.items():
        print("  samenvoegen", soort, len(gs), file=sys.stderr, flush=True)
        v = unary_union([g.buffer(0) for g in gs]).intersection(kader).simplify(0.0004)
        v = v.buffer(0)
        polys = [v] if v.geom_type == "Polygon" else [p for p in getattr(v, "geoms", []) if p.geom_type == "Polygon"]
        uitvoer["vlakken"][soort] = [rond(mapping(p)["coordinates"]) for p in polys if p.area > 2e-7]
    for soort, gs in lijnen.items():
        l = linemerge(unary_union(gs)).intersection(kader).simplify(0.0003)
        ls = [l] if l.geom_type == "LineString" else [g for g in getattr(l, "geoms", []) if g.geom_type == "LineString"]
        uitvoer["lijnen"][soort] = [rond(list(g.coords)) for g in ls if g.length > 0.001]
    json.dump(uitvoer, open(uit, "w"), separators=(",", ":"))
    print({k: len(v) for k, v in {**uitvoer["vlakken"], **uitvoer["lijnen"]}.items()}, file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:3])
