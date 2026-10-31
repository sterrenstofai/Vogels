"""Maakt van een plaat een pentekening: duizenden korte streken die de vorm en kleur van de plaat volgen.

De streken lopen langs de richting van het beeld (structuurtensor), hun kleur komt uit de plaat zelf.
Er wordt niets verzonnen of bijgetekend: elke streek staat op een plek waar de plaat ook verf heeft.

Gebruik: python3 scripts/tekening.py roodborst [merel ...]
Schrijft site/data/tekening/<slug>.json
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BREED = 560  # werkbreedte in pixels; de browser schaalt mee
DOEL = 5200  # zoveel kleurstreken ongeveer, ook op drukke schilderijen


def vervaag(a, sigma):
    r = max(1, int(sigma * 3))
    x = np.arange(-r, r + 1)
    k = np.exp(-(x ** 2) / (2 * sigma ** 2))
    k /= k.sum()
    a = np.apply_along_axis(lambda m: np.convolve(np.pad(m, r, mode="edge"), k, "valid"), 0, a)
    a = np.apply_along_axis(lambda m: np.convolve(np.pad(m, r, mode="edge"), k, "valid"), 1, a)
    return a


def maak(slug, seed=7):
    rng = np.random.default_rng(seed)
    im = Image.open(ROOT / "site/platen" / f"{slug}.webp").convert("RGB")
    h = round(im.height * BREED / im.width)
    rgb = np.asarray(im.resize((BREED, h), Image.LANCZOS), dtype=np.float32) / 255
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

    # papier: bijna wit en weinig kleur. Op schilderijen zonder papier is alles beeld.
    verzadiging = rgb.max(2) - rgb.min(2)
    papier = (lum > 0.90) & (verzadiging < 0.10)
    beeld = ~papier

    # richting van het beeld: structuurtensor op een licht vervaagde lichtheid
    l2 = vervaag(lum, 1.2)
    gy, gx = np.gradient(l2)
    jxx, jxy, jyy = (vervaag(v, 3.0) for v in (gx * gx, gx * gy, gy * gy))
    hoek = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + math.pi / 2  # langs de rand, niet erdwars
    sterk = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2)
    samenhang = sterk / (jxx + jyy + 1e-6)
    rand = np.hypot(gx, gy)
    randnorm = np.clip(rand / (np.percentile(rand[beeld], 97) + 1e-6), 0, 1)

    def trek(x, y, maxlen, basis):
        punten = [(x, y)]
        for richting in (1, -1):
            px, py = x, y
            vorige = None
            for _ in range(int(maxlen / 1.6)):
                ix, iy = int(px), int(py)
                if not (0 <= ix < BREED and 0 <= iy < h) or not beeld[iy, ix]:
                    break
                a = hoek[iy, ix]
                vx, vy = math.cos(a), math.sin(a)
                if vorige and vx * vorige[0] + vy * vorige[1] < 0:
                    vx, vy = -vx, -vy
                vorige = (vx, vy)
                px += richting * vx * 1.6
                py += richting * vy * 1.6
                ix, iy = int(px), int(py)
                if not (0 <= ix < BREED and 0 <= iy < h):
                    break
                if np.abs(rgb[iy, ix] - basis).sum() > 0.32:  # andere kleur: hier houdt de veer op
                    break
                if richting == 1:
                    punten.append((px, py))
                else:
                    punten.insert(0, (px, py))
        return punten

    streken = []
    # 1. kleurstreken: dichter waar het donker of druk is, en ongeveer DOEL streken per plaat
    kandidaten = rng.random((int(BREED * h * 0.3), 2)) * [BREED, h]
    ix, iy = kandidaten[:, 0].astype(int), kandidaten[:, 1].astype(int)
    kans = np.where(beeld[iy, ix], 0.25 + 0.6 * (1 - lum[iy, ix]) ** 1.2 + 0.5 * randnorm[iy, ix], 0)
    kans *= DOEL / max(1, kans.sum())
    for (x, y), k in zip(kandidaten, kans):
        if k <= 0 or rng.random() > k:
            continue
        cx, cy = int(x), int(y)
        basis = rgb[cy, cx]
        donker = 1 - lum[cy, cx]
        lengte = 7 + 22 * samenhang[cy, cx] * (1 - 0.5 * randnorm[cy, cx])
        p = trek(x, y, lengte, basis)
        if len(p) < 3:
            continue
        pts = np.array(p)
        kleur = np.array([rgb[int(b), int(a)] for a, b in pts]).mean(0)
        breedte = 0.8 + 1.6 * donker
        streken.append((0, kleur, breedte, pts))

    # 2. inktlijnen langs de sterkste randen, als laatste getekend
    kandidaten = rng.random((int(BREED * h * 0.05), 2)) * [BREED, h]
    inkt = 0
    for x, y in kandidaten:
        ix, iy = int(x), int(y)
        if inkt > 1400 or not beeld[iy, ix] or randnorm[iy, ix] < 0.55 or rng.random() > 0.55:
            continue
        p = trek(x, y, 14, rgb[iy, ix])
        if len(p) < 3:
            continue
        pts = np.array(p)
        kleur = np.array([rgb[int(b), int(a)] for a, b in pts]).mean(0) * 0.45
        streken.append((1, kleur, 0.6 + 0.5 * randnorm[iy, ix], pts))
        inkt += 1

    # volgorde: eerst lichte kleuren, dan donkere, dan de inkt. Binnen een laag van boven naar onder, met ruis.
    def sleutel(s):
        laag, kleur, _, pts = s
        l = float(kleur @ np.array([0.299, 0.587, 0.114]))
        return (laag, round((1 - l) * 3), pts[:, 1].mean() / h + rng.random() * 0.35)

    streken.sort(key=sleutel)
    uit = []
    for laag, kleur, breedte, pts in streken:
        # vereenvoudigen: om de twee punten, plus het eind
        pts = np.vstack([pts[::2], pts[-1:]]) if len(pts) > 4 else pts
        q = np.round(pts * 2).astype(int)
        d = np.diff(q, axis=0)
        r, g, b = (np.clip(kleur, 0, 1) * 255).round().astype(int)
        uit.append([laag, int(r), int(g), int(b), int(round(breedte * 10)), int(q[0, 0]), int(q[0, 1]), *d.flatten().tolist()])

    doel = ROOT / "site/data/tekening"
    doel.mkdir(parents=True, exist_ok=True)
    (doel / f"{slug}.json").write_text(json.dumps({"b": BREED, "h": h, "s": uit}, separators=(",", ":")))
    print(slug, len(uit), "streken", round((doel / f"{slug}.json").stat().st_size / 1024), "kB")


if __name__ == "__main__":
    for s in sys.argv[1:]:
        maak(s)
