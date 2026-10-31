"""Fase 1 datacheck: GBIF-vogelwaarnemingen rond drie Twentse locaties.

Alleen stdlib. Draaien: python3 -I datacheck.py > rapport.json
"""
import json, math, os, sys, time, urllib.parse, urllib.request
from collections import Counter

GBIF = "https://api.gbif.org/v1"
AVES = 212
PERIODE = os.environ.get("VOGGELS_PERIODE", "2021-11-01,2026-10-31")  # laatste 5 jaar
STRALEN = [500, 1000, 2000]
OBS = "8a863029-f435-446a-821e-275f4f641165"  # Observation.org

# Coördinaten via PDOK (adressen) en Wikipedia (natuurgebied), handmatig gecontroleerd.
LOCATIES = {
    "Rossum, Oranjestraat 1": (52.35197, 6.92325),
    "Enschede, Oude Markt 3A": (52.22050, 6.89491),
    "Engbertsdijksvenen": (52.47500, 6.66806),
}


def get(url, params=None):
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    for poging in range(5):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return json.load(r)
        except Exception:
            if poging == 4:
                raise
            time.sleep(2 ** (poging + 1))


def afstand(lat1, lon1, lat2, lon2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def basis(**extra):
    return {"taxonKey": AVES, "country": "NL", "hasCoordinate": "true",
            "occurrenceStatus": "PRESENT", "eventDate": PERIODE, **extra}


def count(params):
    return get(f"{GBIF}/occurrence/search", {**params, "limit": 0})["count"]


def alle_records(params):
    out, offset = [], 0
    while True:
        d = get(f"{GBIF}/occurrence/search", {**params, "limit": 300, "offset": offset})
        out += d["results"]
        if d["endOfRecords"] or offset > 99000:
            return out
        offset += 300


def unc_bucket(u):
    if u is None:
        return "onbekend"
    for grens, label in [(100, "<=100 m"), (500, "101-500 m"), (1000, "501-1000 m"), (5000, "1-5 km")]:
        if u <= grens:
            return label
    return ">5 km"


_datasets = {}
def dataset(key):
    if key not in _datasets:
        d = get(f"{GBIF}/dataset/{key}")
        _datasets[key] = d.get("title")
    return _datasets[key]


def samenvatting(recs):
    soorten = {r["speciesKey"] for r in recs if r.get("speciesKey")}
    gegen = Counter()
    for r in recs:
        g = r.get("informationWithheld") or r.get("dataGeneralizations")
        if g:
            gegen[g[:90]] += 1
    return {
        "waarnemingen": len(recs),
        "soorten": len(soorten),
        "maanden": {m: sum(1 for r in recs if r.get("month") == m) for m in range(1, 13)},
        "uncertainty": dict(Counter(unc_bucket(r.get("coordinateUncertaintyInMeters")) for r in recs)),
        "licenties": dict(Counter(r.get("license", "?").split("/licenses/")[-1] for r in recs)),
        "datasets": dict(Counter(dataset(r["datasetKey"]) for r in recs).most_common()),
        "vervaagd_volgens_bron": dict(gegen.most_common(6)),
        "basisOfRecord": dict(Counter(r.get("basisOfRecord") for r in recs)),
    }


def main():
    rapport = {}
    for naam, (lat, lon) in LOCATIES.items():
        recs = alle_records(basis(geoDistance=f"{lat},{lon},2000m"))
        for r in recs:
            r["_d"] = afstand(lat, lon, r["decimalLatitude"], r["decimalLongitude"])
        loc = {"lat": lat, "lon": lon, "stralen": {}}
        for straal in STRALEN:
            binnen = [r for r in recs if r["_d"] <= straal]
            precies = [r for r in binnen if r["datasetKey"] != OBS]
            loc["stralen"][straal] = {
                "gbif_count": count(basis(geoDistance=f"{lat},{lon},{straal}m")),
                "alles": samenvatting(binnen),
                "zonder_observation_org": samenvatting(precies),
                "observation_org_rasterhoeken": sorted({(r["decimalLatitude"], r["decimalLongitude"])
                                                        for r in binnen if r["datasetKey"] == OBS}),
            }
            print(naam, straal, len(binnen), file=sys.stderr)
        # Het 0,05-graad rastervak van Observation.org waarin de locatie valt
        clat, clon = math.floor(lat * 20) / 20, math.floor(lon * 20) / 20
        p = basis(datasetKey=OBS, decimalLatitude=f"{clat},{clat}", decimalLongitude=f"{clon},{clon}")
        d = get(f"{GBIF}/occurrence/search", {**p, "limit": 0, "facetLimit": 1000,
                                              "facet": ["month", "speciesKey"]})
        f = {x["field"]: {c["name"]: c["count"] for c in x["counts"]} for x in d["facets"]}
        loc["observation_org_vak"] = {
            "hoek": (clat, clon),
            "afmeting_km": (round(afstand(clat, clon, clat + 0.05, clon) / 1000, 2),
                            round(afstand(clat, clon, clat, clon + 0.05) / 1000, 2)),
            "waarnemingen": d["count"],
            "soorten": len(f.get("SPECIES_KEY", {})),
            "maanden": {int(k): v for k, v in sorted(f.get("MONTH", {}).items(), key=lambda x: int(x[0]))},
        }
        rapport[naam] = loc
    json.dump(rapport, sys.stdout, indent=1, ensure_ascii=False, default=list)


if __name__ == "__main__":
    main()
