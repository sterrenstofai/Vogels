"""Kijkt elk weetje in data/handwerk/ na: staat de controlezin letterlijk op de bronpagina?
Schrijft data/nagekeken.json: per dier per weetje ja/nee, met de datum.
Een dier krijgt op de site het label "nagekeken" alleen als alle weetjes kloppen
(en een mens de weetjes zelf heeft geschreven en gelezen; dit script vangt verschuivingen
en tikfouten op, niet of de vertaling goed is).
Draait maandelijks in een GitHub Action, zodat we merken als een bronpagina verandert."""
import html, json, re, time, urllib.request
# Overgenomen uit sterrenstofai/deruimte (scripts/nakijken.py).
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (zeezicht-nakijken; github.com/sterrenstofai)"

def norm(s):
    s = html.unescape(s).replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace(" ", " ")
    return re.sub(r"\s+", " ", s).lower()

def tekst(url, cache={}):
    if url not in cache:
        for p in range(3):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                    t = r.read().decode("utf-8", "replace")
                t = re.sub(r"(?s)<(script|style).*?</\1>", " ", t)
                cache[url] = norm(re.sub(r"<[^>]+>", " ", t)); break
            except Exception as e:
                print("  opnieuw", url, e); time.sleep(5 * (p + 1)); cache[url] = None
        time.sleep(1)
    return cache[url]

def main():
    pad = ROOT / "data" / "nagekeken.json"
    vorig = json.loads(pad.read_text()) if pad.exists() else {}
    uit, fout = {}, 0
    for f in sorted((ROOT / "data" / "handwerk").glob("*.json")):
        h = json.loads(f.read_text())
        r = []
        for i, w in enumerate(h.get("weetjes", [])):
            t = tekst(w["bron"])
            if t is None:  # bron nu niet bereikbaar (Wikipedia blokkeert soms): de vorige uitkomst houden
                oud = vorig.get(f.stem, {}).get("weetjes", [])
                r.append(oud[i] if i < len(oud) else False); print(f"  niet bereikbaar, vorige uitkomst gehouden: {w['bron']}"); continue
            ok = norm(w["controle"]) in t
            r.append(ok)
            if not ok:
                fout += 1; print(f"  NIET GEVONDEN {f.stem}: {w['controle'][:60]} ({w['bron']})")
        uit[f.stem] = {"weetjes": r, "alles": all(r) and bool(r), "datum": date.today().isoformat()}
    pad.write_text(json.dumps(uit, indent=1))
    print(f"{sum(v['alles'] for v in uit.values())} van {len(uit)} helemaal nagekeken; {fout} weetjes niet gevonden")

if __name__ == "__main__":
    main()
