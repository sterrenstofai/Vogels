"""Bouw de JSON-bestanden voor de site in site/data/.

- meta.json        peildatum, periode, totalen, gemeentecodes
- soorten.json     per soort: naam, status, plaat, opnames, maandtelling Twente
- vakken.json      per Observation.org-vak: aantal meldingen en per soort 12 maandtellingen
- kaart.json       gemeentegrenzen (vereenvoudigd) en welke vakken elke gemeente raakt
- precies/<vak>.json  precieze meldingen (onzekerheid <=500 m, of eBird-telpunt) per vak

Vereist shapely. Gebruik vanuit de repo-root:
python3 scripts/bouw_sitedata.py datacheck/twente_soorten.json datacheck/geo/gemeenten.json site/data
"""
import json, math, os, sys, time, urllib.parse, urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from shapely.geometry import shape, box, mapping
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

GBIF = "https://api.gbif.org/v1/occurrence/search"
PERIODE = tuple(os.environ.get("VOGGELS_PERIODE", "2021-11-01,2026-10-31").split(","))
PEILDATUM = PERIODE[1]
EBIRD = "4fa7b334-ce0d-4e88-aaae-2e0c138d049e"
VAK = 0.05
TWENTE = {"0141": "Almelo", "0147": "Borne", "1774": "Dinkelland", "0153": "Enschede", "0158": "Haaksbergen",
          "0163": "Hellendoorn", "0164": "Hengelo", "1735": "Hof van Twente", "0168": "Losser",
          "0173": "Oldenzaal", "1742": "Rijssen-Holten", "0183": "Tubbergen", "1700": "Twenterand", "0189": "Wierden"}
BRONNEN = {EBIRD: "eBird", "50c9509d-22c7-4a22-a47d-8c48425ef4a7": "iNaturalist",
           "6efaa343-80d2-4581-866a-eaa27bf5e352": "Vogeltrekstation", "6ff8b3b0-ef0f-4f79-a310-5a5615c6aa0b": "Birda",
           "b1047888-ae52-4179-9dd5-5448ea342a24": "xeno-canto", "6ac3f774-d9fb-4796-b3e9-92bf6c81c084": "naturgucker"}
WERKEN = {
    "Naumann": "J.F. Naumann e.a., Naturgeschichte der Vögel Mitteleuropas (1896–1905)",
    "Sepp": "C. Nozeman & J.C. Sepp, Nederlandsche Vogelen (1770–1829), Koninklijke Bibliotheek",
    "Gould": "J. Gould, The Birds of Europe (1832–1837)",
    "Alphéraky": "S. Alphéraky, The Geese of Europe and Asia (1905)",
    "Recueil": "Recueil de divers oiseaux étrangers et peu communs (18e eeuw)",
    "Phillips": "J.C. Phillips, A Natural History of the Ducks (1922–1926)",
}


def vak_van(lat, lon):
    return f"{math.floor(lat / VAK) * VAK:.2f},{math.floor(lon / VAK) * VAK:.2f}"


_pool = ThreadPoolExecutor(8)


def _lees(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def get(params):
    """GBIF-verzoek met een harde deadline: een verbinding die halverwege stilvalt, begint opnieuw."""
    url = GBIF + "?" + urllib.parse.urlencode(params, doseq=True)
    for poging in range(6):
        try:
            return _pool.submit(_lees, url).result(timeout=60)
        except Exception:
            if poging == 5:
                raise
            time.sleep(2 ** (poging + 1))


def halfjaren():
    """Perioden van een half jaar: GBIF stokt bij diep doorbladeren (offset boven 10.000)."""
    van = PERIODE[0]
    j, m = int(van[:4]), int(van[5:7])
    while True:
        j2, m2 = (j, m + 6) if m + 6 <= 12 else (j + 1, m - 6)
        eind = f"{j2:04d}-{m2:02d}-01"
        yield f"{j:04d}-{m:02d}-01,{min(eind, PERIODE[1])}"
        if eind > PERIODE[1]:
            return
        j, m = j2, m2


def precieze_meldingen(wkt):
    basis = {"taxonKey": 212, "country": "NL", "hasCoordinate": "true", "occurrenceStatus": "PRESENT", "geometry": wkt}
    recs = {}
    for extra in ({"coordinateUncertaintyInMeters": "0,500"}, {"datasetKey": EBIRD}):
        for periode in halfjaren():
            q = {**basis, **extra, "eventDate": periode}
            aantal = get({**q, "limit": 0})["count"]
            assert aantal < 10000, f"te veel voor één deelvraag: {periode} {aantal}"
            with ThreadPoolExecutor(4) as ex:
                for d in ex.map(lambda o: get({**q, "limit": 300, "offset": o}), range(0, aantal, 300)):
                    for r in d["results"]:
                        if (r.get("coordinateUncertaintyInMeters") or 0) <= 500 and r.get("speciesKey"):
                            recs[r["key"]] = r
            print(f"  precies: {extra} {periode} {aantal}", file=sys.stderr, flush=True)
    return recs.values()


def main(twente_pad, gemeenten_pad, uit):
    os.makedirs(os.path.join(uit, "precies"), exist_ok=True)
    T = json.load(open(twente_pad))
    N = json.load(open("data/namen.json"))
    slugs = json.load(open("data/soorten_slugs.json"))
    platen = json.load(open("data/platen.json"))
    opnames = json.load(open("data/opnames.json"))

    # Vakken: alleen echte soorten (geen hybriden)
    vakken = {}
    twente_maand = defaultdict(lambda: [0] * 12)
    for sleutel, v in T["vakken"].items():
        lat, lon = map(float, sleutel.split(","))
        s = {}
        for m in range(1, 13):
            for soort, c in v["soort_maand"].get(str(m), {}).items():
                if soort in slugs:
                    s.setdefault(soort, [0] * 12)[m - 1] = c
        for soort, rij in s.items():
            for i, c in enumerate(rij):
                twente_maand[soort][i] += c
        vakken[f"{lat:.2f},{lon:.2f}"] = {"n": v["n"], "s": s}

    # Soorten
    soorten = {}
    for k, slug in slugs.items():
        n = N[k]
        p = platen["platen"].get(k)
        plaat = None
        if p:
            werk = WERKEN[p["bron"]]
            if p["bron"] == "Gould" and "century" in p["bestand"].lower():
                werk = "J. Gould, A Century of Birds from the Himalaya Mountains (1831)"
            plaat = {"src": f"/platen/{slug}.webp", "klein": f"/platen/{slug}-k.webp", "werk": werk,
                     "pagina": p["pagina"], "ook": p.get("ook_op_plaat", [])}
        o = opnames.get(k, {})
        soorten[k] = {
            "slug": slug, "nl": n["nl"] or n["nl_gbif"] or n["wet_gbif"], "wet": n["wet_ioc"] or n["wet_gbif"],
            "status": n["status_nl"] or ("ontsnapt of uitgezet" if not n["nl"] else ""),
            "exoot": bool(n["exoot"] or not n["nl"]),
            "twente": twente_maand[k], "n": sum(twente_maand[k]),
            "plaat": plaat, "geen_plaat": platen["lege_plaat"].get(k, {}).get("reden"),
            "zang": (o.get("zang") or [None])[0], "roep": (o.get("roep") or [None])[0],
            "zang_reserve": (o.get("zang") or [])[1:3], "roep_reserve": (o.get("roep") or [])[1:3],
        }

    # Kaart: gemeenten en de vakken die ze raken
    feats = json.load(open(gemeenten_pad))["features"]
    gem = {TWENTE[f["properties"]["code"]]: shape(f["geometry"]) for f in feats if f["properties"]["code"] in TWENTE}
    kaart = {"gemeenten": {}, "twente": None}
    for naam, geo in gem.items():
        raakt = [h for h in vakken
                 if box(float(h.split(",")[1]), float(h.split(",")[0]),
                        float(h.split(",")[1]) + VAK, float(h.split(",")[0]) + VAK).intersection(geo).area > 1e-7]
        g = geo.simplify(0.002)
        kaart["gemeenten"][naam] = {"vakken": sorted(raakt),
                                    "vorm": json.loads(json.dumps(mapping(g), default=list))}
    tw = unary_union(list(gem.values()))
    kaart["twente"] = json.loads(json.dumps(mapping(tw.simplify(0.002)), default=list))

    def rond(o):
        if isinstance(o, float):
            return round(o, 4)
        if isinstance(o, (list, tuple)):
            return [rond(x) for x in o]
        if isinstance(o, dict):
            return {k: rond(v) for k, v in o.items()}
        return o
    kaart = rond(kaart)

    # Precieze meldingen per vak
    wkt = orient(tw.buffer(0.01).simplify(0.005), sign=1.0).wkt
    per_vak = defaultdict(list)
    bronnen = defaultdict(int)
    for r in precieze_meldingen(wkt):
        k = str(r["speciesKey"])
        if k not in slugs:
            continue
        bron = BRONNEN.get(r["datasetKey"], "overig")
        bronnen[bron] += 1
        per_vak[vak_van(r["decimalLatitude"], r["decimalLongitude"])].append(
            [round(r["decimalLatitude"], 5), round(r["decimalLongitude"], 5), k, (r.get("eventDate") or "")[:10], bron])
    for v, rij in per_vak.items():
        json.dump(sorted(rij, key=lambda x: x[3], reverse=True),
                  open(os.path.join(uit, "precies", v.replace(",", "_") + ".json"), "w"), separators=(",", ":"))

    meta = {"peildatum": PEILDATUM, "periode": PERIODE, "vakken": len(vakken),
            "meldingen_vakken": sum(v["n"] for v in vakken.values()),
            "soorten": len(soorten), "precies": sum(bronnen.values()), "precies_bronnen": dict(bronnen),
            "precies_vakken": sorted(per_vak), "gemeentecodes": TWENTE, "vakgrootte": VAK}
    for naam, data in [("meta", meta), ("soorten", soorten), ("vakken", vakken), ("kaart", kaart)]:
        json.dump(data, open(os.path.join(uit, naam + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    # vogelgroep per soort (kleur en gedrag op de simulatiekaart)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from vogelgroepen import voeg_toe
    voeg_toe(twente_pad, os.path.join(uit, "soorten.json"))
    print(json.dumps({k: v for k, v in meta.items() if k not in ("precies_vakken",)}, ensure_ascii=False))


if __name__ == "__main__":
    main(*sys.argv[1:4])
