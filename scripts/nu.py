"""Verse meldingen voor de simulatiekaart: de laatste 14 dagen in Twente, per vak en soort opgeteld.

Bron: GBIF (vooral Observation.org). Alleen tellingen per vak van ongeveer 4 x 6 km, net zo grof als de rest
van de site; vervaagde meldingen blijven vervaagd. Draait elke dag in de GitHub Action 'Nu verversen'.
Gebruik vanuit de repo-root: python3 scripts/nu.py
Schrijft site/data/nu.json: { van, tot (nieuwste melding), meldingen, vakken: { vak: { soort: n } } }
"""
import datetime as dt, json, math, sys, time, urllib.parse, urllib.request

GBIF = "https://api.gbif.org/v1/occurrence/search"
DAGEN = 14
VAK = 0.05


def haal(params):
    url = GBIF + "?" + urllib.parse.urlencode(params, doseq=True)
    for poging in range(6):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except Exception:  # noqa: BLE001
            if poging == 5:
                raise
            time.sleep(2 ** (poging + 1))


def vak_van(lat, lon):
    # kleine marge: 52.2 / 0.05 is in drijvende komma net geen 1044
    return f"{math.floor(lat / VAK + 1e-6) * VAK:.2f},{math.floor(lon / VAK + 1e-6) * VAK:.2f}"


def main():
    S = json.load(open("site/data/soorten.json"))
    V = json.load(open("site/data/vakken.json"))
    lats = [float(v.split(",")[0]) for v in V]
    lons = [float(v.split(",")[1]) for v in V]
    # GBIF loopt een paar dagen achter: haal ruim op en neem de 14 dagen tot en met de nieuwste melding
    tot = dt.date.today()
    van = tot - dt.timedelta(days=DAGEN + 14)
    basis = {"taxonKey": 212, "country": "NL", "hasCoordinate": "true", "occurrenceStatus": "PRESENT",
             "eventDate": f"{van},{tot}",
             "decimalLatitude": f"{min(lats)},{max(lats) + VAK}", "decimalLongitude": f"{min(lons)},{max(lons) + VAK}"}
    aantal = haal({**basis, "limit": 0})["count"]
    rijen = []
    for offset in range(0, min(aantal, 9900), 300):
        for r in haal({**basis, "limit": 300, "offset": offset})["results"]:
            k = str(r.get("speciesKey") or "")
            d = (r.get("eventDate") or "")[:10]
            if k not in S or r.get("decimalLatitude") is None or len(d) < 10:
                continue
            vak = vak_van(r["decimalLatitude"], r["decimalLongitude"])
            if vak in V:
                rijen.append((d, vak, k))
    laatste = max(d for d, _, _ in rijen)
    van = str(dt.date.fromisoformat(laatste) - dt.timedelta(days=DAGEN - 1))
    vakken, n = {}, 0
    for d, vak, k in rijen:
        if d < van:
            continue
        vakken.setdefault(vak, {})
        vakken[vak][k] = vakken[vak].get(k, 0) + 1
        n += 1
    uit = {"van": van, "tot": laatste, "meldingen": n, "vakken": vakken}
    json.dump(uit, open("site/data/nu.json", "w"), separators=(",", ":"))
    print(f"{n} meldingen van {van} t/m {laatste} in {len(vakken)} vakken", file=sys.stderr)


if __name__ == "__main__":
    main()
