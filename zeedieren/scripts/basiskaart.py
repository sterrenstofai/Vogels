"""Basiskaart voor het kaartje per dier: het land rond de Nederlandse kust uit Natural Earth (1:10 miljoen, 'land',
publiek domein), geknipt op het kader van het OBIS-raster en vereenvoudigd tot een SVG-pad
(projectie: lengtegraad x cos(52,5°)). Schrijft site/data/kust.json.
Draai: python3 scripts/basiskaart.py [ne_10m_land.geojson]  (zonder pad: downloaden van GitHub)"""
import json, math, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LON0, LON1, LAT0, LAT1 = 2.5, 7.3, 51.15, 54.0     # zelfde kader als het OBIS-raster in ruw_ophalen.py
K = math.cos(math.radians(52.5))
B = 1000
H = round(B * (LAT1 - LAT0) / ((LON1 - LON0) * K))
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson"

def xy(lon, lat):
    return ((lon - LON0) / (LON1 - LON0) * B, (LAT1 - lat) / (LAT1 - LAT0) * H)

def knip(ring):
    """Sutherland-Hodgman op het kader [0,B] x [0,H] (met een klein randje)."""
    m = 5
    for binnen, snij in (
        (lambda p: p[0] >= -m, lambda a, b: (-m, a[1] + (b[1] - a[1]) * (-m - a[0]) / (b[0] - a[0]))),
        (lambda p: p[0] <= B + m, lambda a, b: (B + m, a[1] + (b[1] - a[1]) * (B + m - a[0]) / (b[0] - a[0]))),
        (lambda p: p[1] >= -m, lambda a, b: (a[0] + (b[0] - a[0]) * (-m - a[1]) / (b[1] - a[1]), -m)),
        (lambda p: p[1] <= H + m, lambda a, b: (a[0] + (b[0] - a[0]) * (H + m - a[1]) / (b[1] - a[1]), H + m)),
    ):
        uit = []
        for i, p in enumerate(ring):
            q = ring[i - 1]
            if binnen(p):
                if not binnen(q):
                    uit.append(snij(q, p))
                uit.append(p)
            elif binnen(q):
                uit.append(snij(q, p))
        ring = uit
        if not ring:
            break
    return ring

def vereenvoudig(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    n = math.hypot(x2 - x1, y2 - y1)
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i]
        d = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / n if n else math.hypot(x0 - x1, y0 - y1)
        if d > dmax:
            dmax, idx = d, i
    if dmax > tol:
        return vereenvoudig(pts[:idx + 1], tol)[:-1] + vereenvoudig(pts[idx:], tol)
    return [pts[0], pts[-1]]

bron = sys.argv[1] if len(sys.argv) > 1 else None
d = json.loads(open(bron).read() if bron else urllib.request.urlopen(URL, timeout=300).read())
paden = []
for f in d["features"]:
    g = f["geometry"]
    for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
        buiten = poly[0]
        lons = [p[0] for p in buiten]; lats = [p[1] for p in buiten]
        if max(lons) < LON0 or min(lons) > LON1 or max(lats) < LAT0 or min(lats) > LAT1:
            continue
        ring = knip([xy(*p) for p in buiten])
        if len(ring) < 3:
            continue
        ver = max(range(len(ring)), key=lambda i: math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]))
        ring = vereenvoudig(ring[:ver + 1], 0.6)[:-1] + vereenvoudig(ring[ver:] + [ring[0]], 0.6)[:-1]
        if len(ring) >= 3:
            paden.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in ring) + "Z")
uit = {"bron": "Natural Earth, 1:10 miljoen, land (publiek domein)", "kader": [LON0, LON1, LAT0, LAT1], "breed": B, "hoog": H, "land": "".join(paden)}
(ROOT / "site" / "data").mkdir(parents=True, exist_ok=True)
(ROOT / "site" / "data" / "kust.json").write_text(json.dumps(uit))
print(len(paden), "stukken land,", len(uit["land"]) // 1024, "kB")
