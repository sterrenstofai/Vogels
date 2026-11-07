"""Maakt contactbladen van de foto- en plaatkandidaten uit uitkomsten/commons.json, zodat een mens
elke foto kan bekijken (in het wild, of in een bak, op een bord, gedroogd?). Draait in de Action (Pillow).
Per dier één rij: eerst de Wikidata-foto's (P18), dan Commons-kandidaten, dan platen."""
import io, json, time, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

HIER = Path(__file__).resolve().parent
UIT = HIER / "uitkomsten"
UA = "zeedieren-datacheck/0.1 (https://github.com/sterrenstofai/Vogels; datacheck)"
VRIJ = ("cc0", "public domain", "pd", "cc by", "cc-by", "no restrictions")
W, H, PER_RIJ = 260, 230, 8


def vrij(info):
    l = (info or {}).get("licentie", "").lower()
    return any(l.startswith(v) for v in VRIJ) and "nc" not in l and "nd" not in l


def laad(url):
    for p in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                b = r.read()
            time.sleep(0.3)
            return Image.open(io.BytesIO(b)).convert("RGB")
        except Exception as e:
            print("  opnieuw", url[:90], e); time.sleep(4 * (p + 1))
    return None


def main():
    c = json.loads((UIT / "commons.json").read_text())
    for soort in ("foto", "plaat"):
        rijen = []
        for slug, d in c.items():
            if soort == "foto":
                lijst = list(d["p18"].items()) + [(t, i) for t, i in d["kandidaten"].items() if t not in d["p18"]]
            else:
                lijst = list(d["platen"].items())
            lijst = [(t, i) for t, i in lijst if i and i.get("thumb") and (i.get("mime") or "").startswith("image")][:PER_RIJ]
            rijen.append((slug, lijst))
        blad = Image.new("RGB", (W * PER_RIJ + 130, H * len(rijen)), "white")
        tek = ImageDraw.Draw(blad)
        index = {}
        for r, (slug, lijst) in enumerate(rijen):
            tek.text((5, r * H + 100), slug, fill="black")
            for k, (titel, info) in enumerate(lijst):
                code = f"{slug[:4]}{k}"
                index[code] = {"slug": slug, "bestand": titel, "licentie": info.get("licentie"), "maker": info.get("maker"),
                               "p18": titel in c[slug]["p18"]}
                im = laad(info["thumb"])
                x, y = 130 + k * W, r * H
                if im:
                    im.thumbnail((W - 10, H - 45)); blad.paste(im, (x + 5, y + 5))
                kleur = (0, 110, 0) if vrij(info) else (190, 0, 0)
                tek.text((x + 5, y + H - 38), f"{code}{' P18' if titel in c[slug]['p18'] else ''} | {info.get('licentie','')[:22]}", fill=kleur)
                tek.text((x + 5, y + H - 24), titel[:40], fill="black")
        # in tweeën, anders te groot om te bekijken
        half = (len(rijen) + 1) // 2
        blad.crop((0, 0, blad.width, H * half)).save(UIT / f"contactblad_{soort}_1.jpg", quality=80)
        blad.crop((0, H * half, blad.width, blad.height)).save(UIT / f"contactblad_{soort}_2.jpg", quality=80)
        (UIT / f"contactblad_{soort}_index.json").write_text(json.dumps(index, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
