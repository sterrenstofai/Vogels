"""Alles wat via Wikimedia moet en vanaf een gewone machine een 429 geeft. Draait in een GitHub Action.
1. Licentie en maker van de Wikidata-foto's (P18) en van kandidaten uit Commons-zoekresultaten.
2. Oude platen (Bloch, Haeckel, Iconographia Zoologica, Sepp/Nozeman) en geluidsbestanden op Commons.
3. De tekst van het Nederlandse Wikipedia-artikel per dier (voor het kiezen van weetjes).
4. Als weetjes.json bestaat: staat elke controlezin letterlijk op de bronpagina?
Alleen standaardbibliotheek. Uitvoer in uitkomsten/."""
import html, json, re, time, urllib.parse, urllib.request
from pathlib import Path

HIER = Path(__file__).resolve().parent
UIT = HIER / "uitkomsten"
UA = "zeedieren-datacheck/0.1 (https://github.com/sterrenstofai/Vogels; datacheck)"
API = "https://commons.wikimedia.org/w/api.php"


def get(url, tries=4):
    for p in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                b = r.read()
            time.sleep(0.5)
            return b
        except Exception as e:
            print("  opnieuw", url[:100], e)
            time.sleep(5 * (p + 1))
    return None


def api(base, **params):
    params.update(format="json", formatversion="2")
    b = get(base + "?" + urllib.parse.urlencode(params))
    return json.loads(b) if b else {}


def schoon(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def bestandsinfo(titels):
    uit = {}
    for i in range(0, len(titels), 40):
        d = api(API, action="query", prop="imageinfo", iiprop="url|size|mime|extmetadata", iiurlwidth="800",
                titles="|".join("File:" + t.removeprefix("File:") for t in titels[i:i + 40]))
        for p in d.get("query", {}).get("pages", []):
            ii = (p.get("imageinfo") or [{}])[0]
            m = ii.get("extmetadata", {})
            v = lambda k: schoon(m.get(k, {}).get("value"))
            uit[p["title"].removeprefix("File:")] = {
                "licentie": v("LicenseShortName"), "licentie_url": v("LicenseUrl"), "maker": v("Artist"),
                "credit": v("Credit")[:200], "beschrijving": v("ImageDescription")[:300], "datum": v("DateTimeOriginal"),
                "breed": ii.get("width"), "hoog": ii.get("height"), "mime": ii.get("mime"),
                "thumb": ii.get("thumburl"), "pagina": ii.get("descriptionurl"), "ontbreekt": "missing" in p}
    return uit


def zoek(q, ns=6, n=12):
    d = api(API, action="query", list="search", srsearch=q, srnamespace=ns, srlimit=n)
    return [s["title"].removeprefix("File:") for s in d.get("query", {}).get("search", [])]


def wikitekst(url):
    titel = urllib.parse.unquote(url.rsplit("/wiki/", 1)[1])
    b = get("https://nl.wikipedia.org/wiki/" + urllib.parse.quote(titel))
    if not b:
        return None
    t = b.decode("utf-8", "replace")
    t = re.sub(r"(?s)<(script|style).*?</\1>", " ", t)
    # alleen de lopende tekst: alinea's en lijstitems uit de inhoud
    blok = t.split('id="mw-content-text"', 1)[-1]
    alineas = [schoon(a) for a in re.findall(r"(?s)<(?:p|li)[^>]*>(.*?)</(?:p|li)>", blok)]
    return "\n".join(a for a in alineas if len(a) > 40)


def norm(s):
    s = html.unescape(s).replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).lower()


def main():
    UIT.mkdir(exist_ok=True)
    soorten = json.loads((UIT / "soorten.json").read_text())
    platen_q = json.loads((HIER / "platen_zoekvragen.json").read_text())
    beeld = {}
    for slug, s in soorten.items():
        print("…", slug, flush=True)
        p18 = s["wikidata"].get("fotos", [])
        kand = zoek(f'"{s["wet"]}" filetype:bitmap', n=15)
        platen = []
        for q in platen_q.get(slug, []) + [f'"{s["wet"]}" Bloch', f'"{s["wet"]}" Haeckel', f'"{s["wet"]}" "Iconographia Zoologica"']:
            platen += [t for t in zoek(q, n=8) if t not in platen]
        audio = []
        for q in (f'"{s["wet"]}" filetype:audio', f'"{s["nl"]}" filetype:audio'):
            audio += [t for t in zoek(q, n=10) if t not in audio]
        info = bestandsinfo(list(dict.fromkeys(p18 + kand + platen + audio)))
        beeld[slug] = {"p18": {t: info.get(t) for t in p18}, "kandidaten": {t: info.get(t) for t in kand},
                       "platen": {t: info.get(t) for t in platen}, "audio": {t: info.get(t) for t in audio}}
    (UIT / "commons.json").write_text(json.dumps(beeld, indent=1, ensure_ascii=False))

    wd = UIT / "wiki"; wd.mkdir(exist_ok=True)
    for slug, s in soorten.items():
        url = s["wikidata"].get("nlwiki")
        if url:
            t = wikitekst(url)
            if t:
                (wd / f"{slug}.txt").write_text(url + "\n\n" + t)

    w = HIER / "weetjes.json"
    if w.exists():
        cache, uit = {}, {}
        for slug, lijst in json.loads(w.read_text()).items():
            r = []
            for sectie, tekst, bron, controle in lijst:
                if bron not in cache:
                    b = get(bron)
                    cache[bron] = norm(re.sub(r"<[^>]+>", " ", re.sub(r"(?s)<(script|style).*?</\1>", " ", b.decode("utf-8", "replace")))) if b else None
                ok = None if cache[bron] is None else norm(controle) in cache[bron]
                r.append({"sectie": sectie, "gevonden": ok, "controle": controle})
            uit[slug] = r
        (UIT / "weetjes_nagekeken.json").write_text(json.dumps(uit, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
