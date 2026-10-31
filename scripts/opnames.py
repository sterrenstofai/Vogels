"""Kies per soort een zang- en een roepopname bij xeno-canto, plus reserves.

Regels, in volgorde van gewicht:
- geen ND-licentie (dan is een meelopend spectrogram geen licentievraag)
- kwaliteit A, anders B
- Nederland, dan België of Duitsland, dan de rest van Europa
- geen playback gebruikt, weinig andere soorten op de achtergrond
- lengte bij voorkeur 30 s tot 2 min

Gebruik: XC_KEY=... python3 opnames.py ../data/namen.json > ../data/opnames.json
"""
import json, os, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

KEY = os.environ["XC_KEY"]  # nooit in de repo
URL = "https://xeno-canto.org/api/3/recordings"
MIN_WAARNEMINGEN = 50


def get(params):
    url = URL + "?" + urllib.parse.urlencode(params)
    for poging in range(5):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return json.load(r)
        except Exception:
            if poging == 4:
                raise
            time.sleep(2 ** (poging + 1))


def opnames(naam):
    gen, sp = naam.split()[:2]
    out, page = [], 1
    while True:
        d = get({"query": f"gen:{gen} sp:{sp} area:europe", "key": KEY, "per_page": 500, "page": page})
        out += d.get("recordings", [])
        if page >= int(d.get("numPages", 1)):
            return out
        page += 1
        time.sleep(0.5)


def seconden(lengte):
    delen = [int(x) for x in lengte.split(":")]
    return sum(x * 60 ** i for i, x in enumerate(reversed(delen)))


def score(r):
    land = {"Netherlands": 0, "Belgium": 1, "Germany": 1}.get(r["cnt"], 2)
    s = seconden(r["length"] or "0")
    lengte = 0 if 30 <= s <= 120 else (1 if 15 <= s <= 240 else 2)
    return (r["q"] != "A", land, r.get("playback-used") == "yes", min(len(r.get("also") or []), 3), lengte)


def kort(r):
    return {"id": r["id"], "opnemer": r["rec"], "land": r["cnt"], "plek": r["loc"], "datum": r["date"],
            "type": r["type"], "kwaliteit": r["q"], "licentie": "https:" + r["lic"] if r["lic"].startswith("//") else r["lic"],
            "lengte": r["length"], "bestand": r["file"], "pagina": r["url"], "achtergrond": len(r.get("also") or [])}


def kies(item):
    k, n = item
    recs = [r for r in opnames(n["xc"])
            if r["q"] in ("A", "B") and "-nd" not in r["lic"] and seconden(r["length"] or "0") >= 5]
    zang = sorted((r for r in recs if "song" in r["type"].lower()), key=score)
    roep = sorted((r for r in recs if "call" in r["type"].lower() and "song" not in r["type"].lower()), key=score)
    return k, {"nl": n["nl"] or n["nl_gbif"], "wet": n["wet_ioc"] or n["wet_gbif"], "kandidaten": len(recs),
               "zang": [kort(r) for r in zang[:3]], "roep": [kort(r) for r in roep[:3]]}


def main(pad):
    namen = json.load(open(pad))
    soorten = [(k, n) for k, n in namen.items()
               if n["wet_gbif"] and n["waarnemingen_twente"] >= MIN_WAARNEMINGEN]
    with ThreadPoolExecutor(3) as ex:
        uit = dict(ex.map(kies, soorten))
    json.dump(uit, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
