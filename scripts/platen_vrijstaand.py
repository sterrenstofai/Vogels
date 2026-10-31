"""Maak de platen 'vrijstaand': bijna-wit papier wordt helemaal wit en donkere scanranden worden weggesneden.

Zo valt het papier met mix-blend-mode: multiply weg tegen de lichte achtergrond van de site
en staat de vogel vrij op de pagina. Werkt op de al gemaakte webp-bestanden in site/platen.
Gebruik: python3 scripts/platen_vrijstaand.py site/platen
Let op: bewerkt ter plekke. Eén keer draaien op verse bestanden uit platen_download.py.
"""
import os, sys
import numpy as np
from PIL import Image


def snij_randen(a, lum):
    """Snij donkere randen (boekrand, schaduw van de scan) weg, maximaal 9% per kant."""
    h, w = lum.shape
    def rand(profiel, n):
        i = 0
        while i < int(n * 0.09) and profiel[i] < 0.80:
            i += 1
        return i + (2 if i else 0)
    boven = rand(lum.mean(axis=1), h)
    onder = rand(lum.mean(axis=1)[::-1], h)
    links = rand(lum.mean(axis=0), w)
    rechts = rand(lum.mean(axis=0)[::-1], w)
    return a[boven:h - onder or h, links:w - rechts or w]


def vrijstaand(pad):
    img = Image.open(pad).convert("RGB")
    a = np.asarray(img).astype(np.float32) / 255
    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    # Geschilderde platen met een eigen achtergrond (Naumann) blijven zoals ze zijn: de knik zou hun
    # lucht vlekkerig maken en de randsnijder ziet een donkere staart aan voor een scanrand.
    # Herkenbaar aan weinig bijna-wit papier.
    if (lum > 0.86).mean() < 0.3:
        return
    a = snij_randen(a, lum)
    # papierkleur = het lichtste deel van de plaat; per kanaal naar wit schalen
    papier = np.percentile(a.reshape(-1, 3), 94, axis=0)
    a = np.clip(a / np.maximum(papier, 0.5), 0, 1)
    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    # zachte knik: alles wat bijna wit is, wordt wit (geen harde rand rond de vogel)
    t = np.clip((lum - 0.87) / (0.97 - 0.87), 0, 1)
    t = t * t * (3 - 2 * t)
    a = a + (1 - a) * t[..., None]
    uit = Image.fromarray((a * 255).astype(np.uint8))
    uit.save(pad, "WEBP", quality=80, method=6)


if __name__ == "__main__":
    map_ = sys.argv[1]
    bestanden = sorted(f for f in os.listdir(map_) if f.endswith(".webp"))
    for f in bestanden:
        vrijstaand(os.path.join(map_, f))
    print("bewerkt:", len(bestanden))
