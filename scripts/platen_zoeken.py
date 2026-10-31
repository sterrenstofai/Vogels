"""Zoekt kandidaat-platen op Wikimedia Commons voor soorten zonder plaat, en maakt een contactblad om ze te bekijken.

Draait in de GitHub Action 'Platen zoeken' (Wikimedia knijpt ons eigen IP af).
Schrijft werk/kandidaten.json en werk/kandidaten-<n>.jpg (genummerde miniaturen per soort).
Gebruik: python3 scripts/platen_zoeken.py werk
"""
import io, json, os, sys, time, urllib.error, urllib.parse, urllib.request
from PIL import Image, ImageDraw

UA = "VogelsInTwente/0.1 (https://github.com/sterrenstofai/Vogels)"
API = "https://commons.wikimedia.org/w/api.php"

ZOEK = {
    "9752617": ("Grote zilverreiger", ["Silberreiher Naumann", "Ardea alba plate", "Egretta alba plate", "Great White Egret Gould", "Great Egret Audubon Birds of America", "Ardea egretta plate"]),
    "5232437": ("Grote Canadese gans", ["Canada Goose Audubon Birds of America", "Branta canadensis plate", "Anser canadensis plate"]),
    "2498344": ("Zwarte zwaan", ["Cygnus atratus Gould", "Black Swan Gould Birds of Australia", "Chenopis atrata plate"]),
    "2498167": ("Sneeuwgans", ["Snow Goose Audubon Birds of America", "Anser caerulescens plate", "Chen hyperboreus plate", "Blue-winged Goose Audubon"]),
    "2498387": ("Carolina-eend", ["Wood Duck Audubon Birds of America", "Aix sponsa plate", "natural history of the ducks Wood Duck"]),
    "2480830": ("Koereiger", ["Kuhreiher Naumann", "Ardea bubulcus plate", "Bubulcus ibis plate", "Buff-backed Heron Dresser"]),
    "7341522": ("Humes bladkoning", ["Phylloscopus humei plate", "Reguloides humei", "Phylloscopus superciliosus plate Gould", "Yellow-browed Warbler Dresser"]),
    "2480876": ("Kleine zilverreiger", ["Seidenreiher Naumann", "Egretta garzetta plate", "Ardea garzetta plate", "Little Egret Gould Birds of Europe"]),
    "2498034": ("Zwaangans", ["geese of Europe and Asia Swan Goose", "Cygnopsis cygnoides plate", "Anser cygnoides plate"]),
    "2498384": ("Ringtaling", ["natural history of the ducks Ringed Teal", "Callonetta leucophrys", "Anas torquata plate", "Nettion torquatum"]),
}


def haal(url, json_=False):
    for poging in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
                data = r.read()
            time.sleep(1.5)
            return json.loads(data) if json_ else data
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(int(e.headers.get("retry-after", 10)) + 5 * poging)
                continue
            raise
    raise RuntimeError(f"mislukt: {url}")


def main(uit):
    os.makedirs(uit, exist_ok=True)
    alles = {}
    for k, (nl, vragen) in ZOEK.items():
        titels = []
        for q in vragen:
            p = {"action": "query", "format": "json", "list": "search", "srsearch": f"{q} filetype:bitmap", "srnamespace": 6, "srlimit": 12}
            for r in haal(API + "?" + urllib.parse.urlencode(p), json_=True)["query"]["search"]:
                if r["title"] not in titels:
                    titels.append(r["title"])
        info = []
        for i in range(0, len(titels), 40):
            p = {"action": "query", "format": "json", "formatversion": 2, "prop": "imageinfo|categories", "cllimit": "max",
                 "iiprop": "url|size|extmetadata", "iiurlwidth": 260, "titles": "|".join(titels[i:i + 40])}
            for pg in haal(API + "?" + urllib.parse.urlencode(p), json_=True)["query"]["pages"]:
                ii = (pg.get("imageinfo") or [{}])[0]
                em = ii.get("extmetadata", {})
                info.append({
                    "bestand": pg["title"], "url": ii.get("url"), "thumb": ii.get("thumburl"), "pagina": ii.get("descriptionurl"),
                    "breedte": ii.get("width"), "hoogte": ii.get("height"),
                    "licentie": em.get("LicenseShortName", {}).get("value", ""),
                    "beschrijving": em.get("ImageDescription", {}).get("value", "")[:400],
                    "categorieen": [c["title"] for c in pg.get("categories", [])][:12],
                })
        info = [x for x in info if x["thumb"] and (x["breedte"] or 0) >= 700]
        alles[k] = {"nl": nl, "kandidaten": info}
        print(nl, len(info), flush=True)

        # contactblad: genummerde miniaturen
        tegels = []
        for n, x in enumerate(info[:30]):
            try:
                im = Image.open(io.BytesIO(haal(x["thumb"]))).convert("RGB")
                im.thumbnail((240, 240))
            except Exception as e:  # noqa: BLE001
                print("  miniatuur mislukt", x["bestand"], e)
                continue
            tegel = Image.new("RGB", (250, 270), "white")
            tegel.paste(im, (5, 5))
            ImageDraw.Draw(tegel).text((6, 250), f"{n}", fill="red")
            tegels.append(tegel)
        if tegels:
            kol = 6
            blad = Image.new("RGB", (250 * kol, 270 * ((len(tegels) + kol - 1) // kol)), "white")
            for n, t in enumerate(tegels):
                blad.paste(t, ((n % kol) * 250, (n // kol) * 270))
            blad.save(os.path.join(uit, f"kandidaten-{k}.jpg"), quality=80)
    json.dump(alles, open(os.path.join(uit, "kandidaten.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
