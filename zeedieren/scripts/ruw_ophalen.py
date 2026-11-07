"""Haalt per dier de ruwe gegevens op uit open bronnen en schrijft data/ruw/<slug>.json:
- WoRMS (CC BY 4.0): AphiaID, geldige naam, Nederlandse namen;
- Wikidata (CC0, via SPARQL): item, Nederlands Wikipedia-artikel, foto's (P18);
- GBIF: meldingen langs de Nederlandse kust en in het Nederlandse deel van de Noordzee, per maand (2016-2025),
  met licenties per dataset;
- OBIS: aantallen per vak (geohash 5, ongeveer 4 bij 5 km) in en rond Nederland, voor het kaartje.
Alleen standaardbibliotheek. Draai vanuit de projectmap: python3 scripts/ruw_ophalen.py [slug ...]"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "zeezicht-data/0.1 (github.com/sterrenstofai)"
KUST = "POLYGON((3.2 51.25,3.9 51.2,4.3 51.4,4.1 51.9,4.4 52.3,4.55 52.75,4.65 53.0,5.0 53.25,6.0 53.45,6.9 53.3,7.25 53.45,7.0 53.75,5.0 53.65,4.4 53.3,4.15 52.9,3.95 52.35,3.6 51.95,3.0 51.55,3.2 51.25))"
NCP = "POLYGON((2.5 51.3,7.2 51.3,7.2 55.8,2.5 55.8,2.5 51.3))"
KAART = "POLYGON((2.5 51.15,7.3 51.15,7.3 54.0,2.5 54.0,2.5 51.15))"


def js(url, headers=None, tries=4):
    for p in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (204, 400, 404):
                return None
            time.sleep(4 * (p + 1))
        except Exception:
            time.sleep(4 * (p + 1))
    return None


def worms(naam):
    recs = js(f"https://www.marinespecies.org/rest/AphiaRecordsByName/{urllib.parse.quote(naam)}?like=false&marine_only=false") or []
    rec = next((r for r in recs if r.get("status") == "accepted"), recs[0] if recs else None)
    if not rec:
        return {}
    aid = rec["valid_AphiaID"] or rec["AphiaID"]
    geldig = js(f"https://www.marinespecies.org/rest/AphiaRecordByAphiaID/{aid}") or rec
    vern = js(f"https://www.marinespecies.org/rest/AphiaVernacularsByAphiaID/{aid}") or []
    return {"aphia": aid, "geldige_naam": geldig.get("valid_name") or geldig.get("scientificname"), "auteur": geldig.get("valid_authority"),
            "klasse": geldig.get("class"), "orde": geldig.get("order"), "familie": geldig.get("family"),
            "nl_namen": sorted({v["vernacular"] for v in vern if v.get("language_code") == "nld"}),
            "url": f"https://www.marinespecies.org/aphia.php?p=taxdetails&id={aid}"}


def wikidata(aphia, naam):
    q = f"""SELECT ?item ?nl ?foto ?nlwiki WHERE {{
      {{ ?item wdt:P850 "{aphia}" }} UNION {{ ?item wdt:P225 "{naam}" }}
      OPTIONAL {{ ?item rdfs:label ?nl FILTER(lang(?nl)="nl") }}
      OPTIONAL {{ ?item wdt:P18 ?foto }}
      OPTIONAL {{ ?nlwiki schema:about ?item; schema:isPartOf <https://nl.wikipedia.org/> }}
    }}"""
    for p in range(6):
        d = js("https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(q), headers={"Accept": "application/sparql-results+json"})
        if d is not None:
            break
        time.sleep(8)
    if not d:
        return {}
    rows = d["results"]["bindings"]
    v = lambda r, k: r.get(k, {}).get("value")
    if not rows:
        return {"gevonden": False}
    wiki = next((v(r, "nlwiki") for r in rows if v(r, "nlwiki")), None)
    return {"gevonden": True, "items": sorted({v(r, "item").rsplit("/", 1)[-1] for r in rows}), "nl": v(rows[0], "nl"),
            "fotos": sorted({urllib.parse.unquote(v(r, "foto").rsplit("/", 1)[-1]) for r in rows if v(r, "foto")}),
            "nlwiki": urllib.parse.unquote(wiki) if wiki else None}


def gbif(naam):
    m = js("https://api.gbif.org/v1/species/match?name=" + urllib.parse.quote(naam))
    if not m or "usageKey" not in m:
        return {}
    key = m.get("acceptedUsageKey") or m["usageKey"]
    uit = {"taxonKey": key}
    for label, g in (("kust", KUST), ("ncp", NCP)):
        d = js(f"https://api.gbif.org/v1/occurrence/search?taxonKey={key}&hasCoordinate=true&occurrenceStatus=PRESENT&limit=0"
               f"&year=2016,2025&facet=month&facet=license&month.facetLimit=12&geometry=" + urllib.parse.quote(g))
        if not d:
            continue
        f = {x["field"]: {c["name"]: c["count"] for c in x["counts"]} for x in d.get("facets", [])}
        uit[label] = {"totaal": d["count"], "per_maand": [f.get("MONTH", {}).get(str(i), 0) for i in range(1, 13)],
                      "licenties": f.get("LICENSE", {})}
    return uit


def obis(aphia):
    d = js(f"https://api.obis.org/v3/occurrence/grid/5?taxonid={aphia}&geometry=" + urllib.parse.quote(KAART))
    if not d:
        return None
    vakken = []
    for f in d.get("features", []):
        c = f["geometry"]["coordinates"][0]
        lon = round((c[0][0] + c[2][0]) / 2, 3); lat = round((c[0][1] + c[2][1]) / 2, 3)
        vakken.append([lon, lat, f["properties"]["n"]])
    return {"precisie": "geohash 5", "vakken": vakken}


def main():
    soorten = json.loads((ROOT / "data" / "soorten.json").read_text())
    kies = set(sys.argv[1:])
    (ROOT / "data" / "ruw").mkdir(parents=True, exist_ok=True)
    for s in soorten:
        if kies and s["slug"] not in kies:
            continue
        print("…", s["slug"], flush=True)
        w = worms(s["wet"])
        r = {"slug": s["slug"], "wet": s["wet"], "worms": w, "wikidata": wikidata(w.get("aphia", 0), s["wet"]),
             "gbif": gbif(s["wet"]), "obis": obis(w["aphia"]) if w else None, "opgehaald": time.strftime("%Y-%m-%d")}
        if s.get("nlwiki"):          # met de hand, als Wikidata het artikel niet aan dit item koppelt
            r["wikidata"]["nlwiki"] = s["nlwiki"]
        (ROOT / "data" / "ruw" / f"{s['slug']}.json").write_text(json.dumps(r, ensure_ascii=False, indent=0))
        time.sleep(1)


if __name__ == "__main__":
    main()
