"""Download de gekozen platen van Wikimedia Commons en maak er webbeelden van.

Downloadt het originele bestand en verkleint het zelf.
Per soort: site/platen/<slug>.webp (1200 px breed) en site/platen/<slug>-k.webp (480 px).
Het papier van elke scan wordt naar wit getrokken (per kleurkanaal het 99,5e percentiel),
zodat de CSS de plaat met `mix-blend-mode: multiply` op één papiertint kan leggen.
Vereist Pillow. Gebruik: python3 platen_download.py ../data/platen.json ../data/soorten_slugs.json ../site/platen
"""
import io, json, os, sys, time, urllib.error, urllib.parse, urllib.request
from PIL import Image

UA = "VogelsInTwente/0.1 (https://github.com/sterrenstofai/Vogels)"
API = "https://commons.wikimedia.org/w/api.php"


def haal(url, json_=False):
    for poging in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
                data = r.read()
            time.sleep(5)  # Wikimedia knijpt snel af; rustig aan
            return json.loads(data) if json_ else data
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(int(e.headers.get("retry-after", 10)) + 5 * poging)
                continue
            raise
    raise RuntimeError(f"mislukt: {url}")


def thumburls(bestanden, breedte=1280):
    uit = {}
    for i in range(0, len(bestanden), 50):
        p = {"action": "query", "format": "json", "formatversion": 2, "prop": "imageinfo",
             "iiprop": "url", "iiurlwidth": breedte, "titles": "|".join(bestanden[i:i + 50])}
        d = haal(API + "?" + urllib.parse.urlencode(p), json_=True)
        for pg in d["query"]["pages"]:
            ii = (pg.get("imageinfo") or [{}])[0]
            uit[pg["title"]] = ii.get("thumburl") or ii.get("url")
        # normalisatie van titels (spaties/underscores) terugkoppelen
        for n in d["query"].get("normalized", []):
            if n["to"] in uit:
                uit[n["from"]] = uit[n["to"]]
    return uit


def papier_naar_wit(img):
    kanalen = []
    for k in img.split():
        hist = k.histogram()
        totaal, grens, som = sum(hist), 0, 0
        for waarde, n in enumerate(hist):
            som += n
            if som >= totaal * 0.995:
                grens = max(waarde, 1)
                break
        kanalen.append(k.point(lambda v, g=grens: min(255, round(v * 255 / g))))
    return Image.merge("RGB", kanalen)


def main(platen_pad, slugs_pad, uitmap):
    platen = json.load(open(platen_pad))["platen"]
    slugs = json.load(open(slugs_pad))
    os.makedirs(uitmap, exist_ok=True)
    # Thumbnails worden door Wikimedia snel afgeknepen (429); de originelen komen uit de cache.
    for k, p in platen.items():
        slug = slugs[k]
        doel = os.path.join(uitmap, slug + ".webp")
        if os.path.exists(doel):
            continue
        Image.MAX_IMAGE_PIXELS = None
        img = Image.open(io.BytesIO(haal(p["url"]))).convert("RGB")
        img = papier_naar_wit(img)
        groot = img.copy(); groot.thumbnail((1200, 1600))
        groot.save(doel, "WEBP", quality=78, method=6)
        klein = img.copy(); klein.thumbnail((480, 640))
        klein.save(os.path.join(uitmap, slug + "-k.webp"), "WEBP", quality=74, method=6)
        print(slug, groot.size, flush=True)
    # daarna: python3 platen_vrijstaand.py ../site/platen (papier wit, scanranden weg)


if __name__ == "__main__":
    main(*sys.argv[1:4])
