"""Haalt de gekozen foto's, platen en geluiden op van Wikimedia Commons (data/beeld_keuze.json), met maker en licentie,
en zet ze klaar voor de site: site/fotos/<slug>.webp (breed 1600) en site/fotos/klein/<slug>.webp (480),
site/platen/<slug>.webp (hoog 1600) en klein, site/klanken/<slug>.m4a (AAC, hoogstens 45 s, via ffmpeg).
Schrijft data/beelden.json. Draait in een GitHub Action (Commons geeft vanaf gewone machines een 429).
Vereist Pillow en ffmpeg. Gebruik: python3 scripts/beelden_ophalen.py [slug ...]"""
import html, io, json, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
UA = "zeezicht-data/0.1 (https://github.com/sterrenstofai; beelden ophalen)"
API = "https://commons.wikimedia.org/w/api.php"

def get(url, tries=5):
    for p in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
                b = r.read()
            time.sleep(0.5)
            return b
        except Exception as e:
            print("  opnieuw", url[:90], e); time.sleep(6 * (p + 1))
    raise RuntimeError("niet gelukt: " + url)

schoon = lambda s: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def info(titel, breedte=None):
    p = {"action": "query", "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "titles": "File:" + titel, "format": "json", "formatversion": "2"}
    if breedte:
        p["iiurlwidth"] = str(breedte)
    d = json.loads(get(API + "?" + urllib.parse.urlencode(p)))
    pg = d["query"]["pages"][0]; ii = pg["imageinfo"][0]; m = ii.get("extmetadata", {})
    v = lambda k: schoon(m.get(k, {}).get("value"))
    maker = v("Artist") or v("Credit")
    maker = re.sub(r"^(Photo|Foto|Photograph):?\s*", "", maker)[:90]
    return ii, {"titel": titel, "maker": maker or "onbekend", "licentie": v("LicenseShortName"), "licentie_url": v("LicenseUrl"),
                "pagina": ii.get("descriptionurl"), "beschrijving": v("ImageDescription")[:300], "datum": v("DateTimeOriginal")[:40]}

def beeld(titel, doel, klein, staand=False):
    ii, meta = info(titel, 1600)
    b = get(ii.get("thumburl") or ii["url"])
    im = Image.open(io.BytesIO(b)); im.load()
    im = im.convert("RGB")
    groot = im.copy(); groot.thumbnail((1600, 1600) if staand else (1600, 1200))
    groot.save(doel, "WEBP", quality=82)
    kl = im.copy(); kl.thumbnail((480, 480)); kl.save(klein, "WEBP", quality=78)
    meta.update(breed=groot.width, hoog=groot.height)
    return meta

def geluid(titel, doel):
    ii, meta = info(titel)
    b = get(ii["url"])
    with tempfile.NamedTemporaryFile(suffix=Path(ii["url"]).suffix) as f:
        f.write(b); f.flush()
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f.name, "-t", "45", "-vn", "-ac", "1", "-ar", "44100", "-c:a", "aac", "-b:a", "96k", str(doel)], check=True)
    meta["duur"] = ii.get("duration")
    return meta

def main():
    keuze = json.loads((ROOT / "data" / "beeld_keuze.json").read_text())
    pad = ROOT / "data" / "beelden.json"
    uit = json.loads(pad.read_text()) if pad.exists() else {}
    kies = set(sys.argv[1:])
    for d in ("fotos/klein", "platen/klein", "klanken"):
        (SITE / d).mkdir(parents=True, exist_ok=True)
    for slug, k in keuze.items():
        if kies and slug not in kies:
            continue
        print("…", slug, flush=True)
        r = {}
        if k.get("foto"):
            r["foto"] = beeld(k["foto"], SITE / "fotos" / f"{slug}.webp", SITE / "fotos" / "klein" / f"{slug}.webp")
        if k.get("plaat"):
            r["plaat"] = beeld(k["plaat"], SITE / "platen" / f"{slug}.webp", SITE / "platen" / "klein" / f"{slug}.webp", staand=True)
        if k.get("geluid"):
            r["geluid"] = geluid(k["geluid"]["bestand"], SITE / "klanken" / f"{slug}.m4a")
        uit[slug] = r
    pad.write_text(json.dumps(uit, indent=1, ensure_ascii=False))

if __name__ == "__main__":
    main()
