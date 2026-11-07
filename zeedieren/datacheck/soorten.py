"""Fase 1, datacheck per dier: WoRMS, Wikidata (SPARQL), GBIF en OBIS.
Alleen standaardbibliotheek. Schrijft uitkomsten/soorten.json en print een tabel.
Draai vanuit deze map: python3 soorten.py"""
import json, time, urllib.parse, urllib.request
from pathlib import Path

UA = "zeedieren-datacheck/0.1 (github.com/sterrenstofai)"
HIER = Path(__file__).resolve().parent
SOORTEN = json.loads((HIER / "testset.json").read_text())

# Nederlandse kust en Noordzee tot ongeveer 12 zeemijl, plus de Waddenzee, grof als veelhoek (lon lat).
KUST = "POLYGON((3.2 51.25,3.9 51.2,4.3 51.4,4.1 51.9,4.4 52.3,4.55 52.75,4.65 53.0,5.0 53.25,6.0 53.45,6.9 53.3,7.25 53.45,7.0 53.75,5.0 53.65,4.4 53.3,4.15 52.9,3.95 52.35,3.6 51.95,3.0 51.55,3.2 51.25))"
# Nederlands deel van de Noordzee (NCP), grof als rechthoek
NCP = "POLYGON((2.5 51.3,7.2 51.3,7.2 55.8,2.5 55.8,2.5 51.3))"


def get(url, headers=None, tries=3):
    for p in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, dict(r.headers), r.read()
        except urllib.error.HTTPError as e:
            if e.code in (204, 400, 404):
                return e.code, dict(e.headers), b""
            time.sleep(3 * (p + 1))
        except Exception:
            time.sleep(3 * (p + 1))
    return None, {}, b""


def js(url, **kw):
    s, h, b = get(url, **kw)
    return json.loads(b) if s == 200 and b else None


def worms(naam):
    q = urllib.parse.quote(naam)
    recs = js(f"https://www.marinespecies.org/rest/AphiaRecordsByName/{q}?like=false&marine_only=false") or []
    rec = next((r for r in recs if r.get("status") == "accepted"), recs[0] if recs else None)
    if not rec:
        return {}
    aid = rec["valid_AphiaID"] or rec["AphiaID"]
    vern = js(f"https://www.marinespecies.org/rest/AphiaVernacularsByAphiaID/{aid}") or []
    nl = [v["vernacular"] for v in vern if v.get("language_code") == "nld"]
    return {"aphia": aid, "status": rec["status"], "geldige_naam": rec["valid_name"], "rang": rec["rank"],
            "marien": rec.get("isMarine"), "nl_namen_worms": nl}


def wikidata(aphia, naam):
    q = f"""SELECT ?item ?nl ?foto ?lengte ?lengteEenheid ?massa ?massaEenheid ?nlwiki ?commonscat WHERE {{
      {{ ?item wdt:P850 "{aphia}" }} UNION {{ ?item wdt:P225 "{naam}" }}
      OPTIONAL {{ ?item rdfs:label ?nl FILTER(lang(?nl)="nl") }}
      OPTIONAL {{ ?item wdt:P18 ?foto }}
      OPTIONAL {{ ?item p:P2043/psv:P2043 [wikibase:quantityAmount ?lengte; wikibase:quantityUnit ?lengteEenheid] }}
      OPTIONAL {{ ?item p:P2067/psv:P2067 [wikibase:quantityAmount ?massa; wikibase:quantityUnit ?massaEenheid] }}
      OPTIONAL {{ ?nlwiki schema:about ?item; schema:isPartOf <https://nl.wikipedia.org/> }}
      OPTIONAL {{ ?item wdt:P373 ?commonscat }}
    }}"""
    d = js("https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(q),
           headers={"Accept": "application/sparql-results+json"})
    if not d:
        return {}
    rows = d["results"]["bindings"]
    if not rows:
        return {"gevonden": False}
    v = lambda r, k: r.get(k, {}).get("value")
    items = sorted({v(r, "item") for r in rows})
    r0 = rows[0]
    eenheid = lambda u: (u or "").rsplit("/", 1)[-1]
    return {"gevonden": True, "items": [i.rsplit("/", 1)[-1] for i in items], "nl": v(r0, "nl"),
            "fotos": sorted({urllib.parse.unquote(v(r, "foto").rsplit("/", 1)[-1]) for r in rows if v(r, "foto")}),
            "lengte": sorted({f"{v(r,'lengte')} {eenheid(v(r,'lengteEenheid'))}" for r in rows if v(r, "lengte")}),
            "massa": sorted({f"{v(r,'massa')} {eenheid(v(r,'massaEenheid'))}" for r in rows if v(r, "massa")}),
            "nlwiki": v(r0, "nlwiki") and urllib.parse.unquote(v(r0, "nlwiki")), "commonscat": v(r0, "commonscat")}


def gbif(naam):
    m = js("https://api.gbif.org/v1/species/match?name=" + urllib.parse.quote(naam))
    if not m or "usageKey" not in m:
        return {}
    key = m.get("acceptedUsageKey") or m["usageKey"]
    uit = {"taxonKey": key, "match": m.get("matchType")}
    for label, extra in (("nl_kust", "&geometry=" + urllib.parse.quote(KUST)),
                         ("ncp", "&geometry=" + urllib.parse.quote(NCP)),
                         ("land_NL", "&country=NL")):
        base = f"https://api.gbif.org/v1/occurrence/search?taxonKey={key}&hasCoordinate=true&occurrenceStatus=PRESENT&limit=0{extra}"
        d = js(base + "&year=2016,2025&facet=month&facet=license&facet=datasetKey&facetLimit=12&month.facetLimit=12")
        if not d:
            continue
        f = {x["field"]: {c["name"]: c["count"] for c in x["counts"]} for x in d.get("facets", [])}
        uit[label] = {"totaal_2016_2025": d["count"],
                      "per_maand": {int(k): v for k, v in sorted(f.get("MONTH", {}).items(), key=lambda kv: int(kv[0]))},
                      "licenties": f.get("LICENSE", {}), "datasets": f.get("DATASET_KEY", {})}
    # nauwkeurigheid: steekproef van 300 recente meldingen langs de kust
    d = js(f"https://api.gbif.org/v1/occurrence/search?taxonKey={key}&hasCoordinate=true&limit=300&year=2023,2025&geometry=" + urllib.parse.quote(KUST))
    if d:
        u = [r.get("coordinateUncertaintyInMeters") for r in d["results"]]
        bekend = sorted(x for x in u if x is not None)
        uit["onzekerheid_steekproef"] = {"n": len(u), "onbekend": len(u) - len(bekend),
                                        "mediaan_m": bekend[len(bekend) // 2] if bekend else None,
                                        "max_m": bekend[-1] if bekend else None}
    return uit


def obis(aphia):
    uit = {}
    for label, g in (("nl_kust", KUST), ("ncp", NCP)):
        d = js(f"https://api.obis.org/v3/occurrence?taxonid={aphia}&size=1&startdate=2016-01-01&geometry=" + urllib.parse.quote(g))
        uit[label] = d.get("total") if d else None
    return uit


def main():
    alles = {}
    for s in SOORTEN:
        print("…", s["nl"], flush=True)
        w = worms(s["wet"])
        r = {"nl": s["nl"], "wet": s["wet"], "plek": s["plek"], "worms": w,
             "wikidata": wikidata(w.get("aphia", 0), s["wet"]), "gbif": gbif(s["wet"]),
             "obis": obis(w["aphia"]) if w else {}}
        alles[s["slug"]] = r
    (HIER / "uitkomsten" / "soorten.json").write_text(json.dumps(alles, indent=1, ensure_ascii=False))
    print(f"\n{'dier':22} {'aphia':>8} {'WD':3} {'foto':4} {'nlwiki':6} {'GBIF kust':>9} {'GBIF NCP':>9} {'OBIS kust':>9}")
    for k, r in alles.items():
        wd = r["wikidata"]
        print(f"{r['nl']:22} {r['worms'].get('aphia',''):>8} {'ja' if wd.get('gevonden') else 'nee':3} "
              f"{len(wd.get('fotos',[])):4} {'ja' if wd.get('nlwiki') else 'nee':6} "
              f"{r['gbif'].get('nl_kust',{}).get('totaal_2016_2025',''):>9} {r['gbif'].get('ncp',{}).get('totaal_2016_2025',''):>9} "
              f"{r['obis'].get('nl_kust',''):>9}")


if __name__ == "__main__":
    main()
