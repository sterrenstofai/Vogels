"""Zoekt per dier kandidaten op Wikimedia Commons: foto's, oude platen en geluid, met licentie en maker,
en haalt de tekst van het Nederlandse Wikipedia-artikel op (om weetjes uit te kiezen).
Maakt contactbladen om de beelden met de hand te bekijken. Draait in een GitHub Action (Wikimedia geeft
vanaf gewone machines een 429). Uitvoer in werk/ (niet voor de site).
Gebruik: python3 scripts/beelden_zoeken.py [slug ...]"""
import html, io, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WERK = ROOT / "werk"
UA = "zeezicht-data/0.1 (https://github.com/sterrenstofai; beelden zoeken)"
API = "https://commons.wikimedia.org/w/api.php"


def get(url, tries=4):
    for p in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90) as r:
                b = r.read()
            time.sleep(0.4)
            return b
        except Exception as e:
            print("  opnieuw", url[:100], e); time.sleep(5 * (p + 1))
    return None


def api(**params):
    params.update(format="json", formatversion="2")
    b = get(API + "?" + urllib.parse.urlencode(params))
    return json.loads(b) if b else {}


def schoon(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def info(titels):
    uit = {}
    for i in range(0, len(titels), 40):
        d = api(action="query", prop="imageinfo", iiprop="url|size|mime|extmetadata", iiurlwidth="600",
                titles="|".join("File:" + t.removeprefix("File:") for t in titels[i:i + 40]))
        for p in d.get("query", {}).get("pages", []):
            ii = (p.get("imageinfo") or [{}])[0]; m = ii.get("extmetadata", {})
            v = lambda k: schoon(m.get(k, {}).get("value"))
            uit[p["title"].removeprefix("File:")] = {"licentie": v("LicenseShortName"), "maker": v("Artist")[:120], "beschrijving": v("ImageDescription")[:240],
                                                    "breed": ii.get("width"), "hoog": ii.get("height"), "mime": ii.get("mime"), "duur": ii.get("duration"),
                                                    "thumb": ii.get("thumburl"), "pagina": ii.get("descriptionurl")}
    return uit


def zoek(q, n=20):
    d = api(action="query", list="search", srsearch=q, srnamespace=6, srlimit=n)
    return [s["title"].removeprefix("File:") for s in d.get("query", {}).get("search", [])]


def wikitekst(url):
    titel = urllib.parse.unquote(url.rsplit("/wiki/", 1)[1])
    b = get("https://nl.wikipedia.org/wiki/" + urllib.parse.quote(titel))
    if not b:
        return None
    t = re.sub(r"(?s)<(script|style).*?</\1>", " ", b.decode("utf-8", "replace")).split('id="mw-content-text"', 1)[-1]
    return "\n".join(a for a in (schoon(x) for x in re.findall(r"(?s)<(?:p|li)[^>]*>(.*?)</(?:p|li)>", t)) if len(a) > 40)


VRIJ = ("cc0", "public domain", "pd", "cc by", "cc-by", "no restrictions")
def vrij(i):
    l = (i or {}).get("licentie", "").lower()
    return any(l.startswith(v) for v in VRIJ) and "nc" not in l and "nd" not in l


def contactblad(rijen, pad):
    from PIL import Image, ImageDraw
    W, H, PER = 250, 220, 12
    blad = Image.new("RGB", (W * PER + 120, H * len(rijen)), "white"); d = ImageDraw.Draw(blad)
    for r, (slug, lijst) in enumerate(rijen):
        d.text((5, r * H + 100), slug, fill="black")
        for k, (code, titel, i) in enumerate(lijst[:PER]):
            b = get(i["thumb"]) if i.get("thumb") else None
            x, y = 120 + k * W, r * H
            if b:
                try:
                    im = Image.open(io.BytesIO(b)).convert("RGB"); im.thumbnail((W - 10, H - 40)); blad.paste(im, (x + 5, y + 5))
                except Exception:
                    pass
            d.text((x + 5, y + H - 34), f"{code} | {i.get('licentie','')[:24]}", fill=(0, 110, 0) if vrij(i) else (190, 0, 0))
            d.text((x + 5, y + H - 20), titel[:38], fill="black")
    blad.save(pad, quality=80)


def main():
    soorten = json.loads((ROOT / "data" / "soorten.json").read_text())
    extra = json.loads((ROOT / "data" / "zoekvragen.json").read_text())
    kies = set(sys.argv[1:])
    WERK.mkdir(exist_ok=True); (WERK / "wiki").mkdir(exist_ok=True)
    alles = {}
    for s in soorten:
        if kies and s["slug"] not in kies:
            continue
        print("…", s["slug"], flush=True)
        ruw = json.loads((ROOT / "data" / "ruw" / f"{s['slug']}.json").read_text())
        wet = ruw["worms"].get("geldige_naam") or s["wet"]
        namen = list(dict.fromkeys([wet, s["wet"]]))
        q = extra.get(s["slug"], {})
        foto = list(ruw["wikidata"].get("fotos", []))
        for n in namen:
            for t in zoek(f'"{n}" filetype:bitmap', 24):
                if t not in foto: foto.append(t)
        for z in q.get("foto", []):
            for t in zoek(z, 16):
                if t not in foto: foto.append(t)
        plaat = []
        for z in q.get("plaat", []) + [f'"{namen[0]}" Bloch', f'"{namen[0]}" Haeckel', f'"{namen[0]}" "Iconographia Zoologica"', f'"{namen[0]}" lithograph']:
            for t in zoek(z, 10):
                if t not in plaat: plaat.append(t)
        geluid = []
        for z in q.get("geluid", []) + [f'"{n}" filetype:audio' for n in namen]:
            for t in zoek(z, 12):
                if t not in geluid and not re.match(r"^(Nl|De|En|Fr|LL)-", t): geluid.append(t)
        i = info(list(dict.fromkeys(foto + plaat + geluid)))
        alles[s["slug"]] = {"foto": {t: i.get(t) for t in foto if i.get(t)}, "plaat": {t: i.get(t) for t in plaat if i.get(t)},
                            "geluid": {t: i.get(t) for t in geluid if i.get(t)}}
        if ruw["wikidata"].get("nlwiki"):
            t = wikitekst(ruw["wikidata"]["nlwiki"])
            if t: (WERK / "wiki" / f"{s['slug']}.txt").write_text(ruw["wikidata"]["nlwiki"] + "\n\n" + t)
    (WERK / "kandidaten.json").write_text(json.dumps(alles, indent=1, ensure_ascii=False))
    # contactbladen: per blad 6 dieren; foto's (alleen vrije licenties en beelden) en platen apart
    for soort in ("foto", "plaat"):
        rijen = []
        for slug, d in alles.items():
            lijst = [(t, i) for t, i in d[soort].items() if (i.get("mime") or "").startswith("image") and vrij(i)]
            rijen.append((slug, [(f"{slug[:5]}{k}", t, i) for k, (t, i) in enumerate(lijst)]))
        index = {code: {"slug": slug, "bestand": t} for slug, lijst in rijen for code, t, _ in lijst[:12]}
        (WERK / f"blad_{soort}_index.json").write_text(json.dumps(index, indent=0, ensure_ascii=False))
        for b in range(0, len(rijen), 6):
            contactblad(rijen[b:b + 6], WERK / f"blad_{soort}_{b // 6 + 1}.jpg")


if __name__ == "__main__":
    main()
