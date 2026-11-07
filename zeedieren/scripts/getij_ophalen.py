"""Hoog- en laagwater (astronomisch getij: een voorspelling zonder wind) voor stations langs de kust,
uit de Waterwebservices van Rijkswaterstaat (ddapi20). De API heeft geen CORS, dus dit draait maandelijks
in een GitHub Action en de site leest site/data/getij/<station>.json. Tijden in UTC (ISO), hoogte in cm NAP.
Alleen standaardbibliotheek. Draai: python3 scripts/getij_ophalen.py [maanden vooruit, standaard 14]"""
import json, sys, time, urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = "https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenWaarnemingen"
# code bij Rijkswaterstaat, naam op de site, soort plek
STATIONS = [
    ("cadzand.2", "Cadzand", "strand"), ("vlissingen", "Vlissingen", "strand"), ("westkapelle", "Westkapelle en Domburg", "strand"),
    ("hoekvanholland", "Hoek van Holland", "strand"), ("scheveningen", "Scheveningen en Kijkduin", "strand"),
    ("ijmuiden.buitenhaven", "IJmuiden en Zandvoort", "strand"),
    ("denhelder.marsdiep", "Den Helder", "strand"), ("texel.noordzee", "Texel, Noordzeekant", "strand"),
    ("vlieland.haven", "Vlieland", "wad"), ("terschelling.noordzee", "Terschelling, Noordzeekant", "strand"), ("ameland.nes", "Ameland, Nes", "wad"),
    ("schiermonnikoog.waddenzee", "Schiermonnikoog", "wad"), ("harlingen.waddenzee", "Harlingen", "wad"), ("holwerd.veersteiger", "Holwerd", "wad"),
    ("lauwersoog.waddenzee", "Lauwersoog", "wad"), ("delfzijl", "Delfzijl", "wad"),
]


def haal(code, van, tot):
    body = {"Locatie": {"Code": code},
            "AquoPlusWaarnemingMetadata": {"AquoMetadata": {"Compartiment": {"Code": "OW"}, "Grootheid": {"Code": "WATHTE"},
                                                            "Groepering": {"Code": "GETETBRKD2"}, "ProcesType": "astronomisch"}},
            "Periode": {"Begindatumtijd": f"{van}T00:00:00.000+00:00", "Einddatumtijd": f"{tot}T00:00:00.000+00:00"}}
    for p in range(3):
        try:
            req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "User-Agent": "zeezicht-getij/0.1"})
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.loads(r.read())
            break
        except Exception as e:
            print("  opnieuw", code, e); time.sleep(6 * (p + 1)); d = {}
    uit = []
    for w in d.get("WaarnemingenLijst", []):
        for m in w["MetingenLijst"]:
            v = m["Meetwaarde"].get("Waarde_Numeriek")
            if v is None or v > 9000:
                continue
            t = datetime.fromisoformat(m["Tijdstip"]).astimezone(timezone.utc)
            uit.append([t.strftime("%Y-%m-%dT%H:%MZ"), round(v)])
    uit.sort()
    # hoog of laag: vergelijk met de buren
    for i, x in enumerate(uit):
        buren = [uit[j][1] for j in (i - 1, i + 1) if 0 <= j < len(uit)]
        x.append("H" if all(x[1] > b for b in buren) else "L")
    return uit


def main():
    maanden = int(sys.argv[1]) if len(sys.argv) > 1 else 14
    van = date.today().replace(day=1)
    eind = (van + timedelta(days=31 * maanden)).replace(day=1)
    (ROOT / "site" / "data" / "getij").mkdir(parents=True, exist_ok=True)
    lijst = []
    for code, naam, soort in STATIONS:
        reeks, d = [], van
        while d < eind:                                   # per kwartaal, om grote antwoorden te vermijden
            e = min(eind, (d + timedelta(days=93)).replace(day=1))
            reeks += haal(code, d.isoformat(), e.isoformat()); d = e
        reeks = [list(x) for x in dict((x[0], x) for x in reeks).values()]
        print(code, len(reeks))
        if not reeks:
            continue
        (ROOT / "site" / "data" / "getij" / f"{code}.json").write_text(json.dumps({"station": code, "naam": naam, "extremen": reeks}, separators=(",", ":")))
        lijst.append({"code": code, "naam": naam, "soort": soort})
    # coördinaten uit de catalogus zijn bekend; schrijf ze mee voor "dichtstbijzijnde station"
    plek = {"cadzand.2": [51.379, 3.376], "vlissingen": [51.442, 3.6], "westkapelle": [51.521, 3.44], "hoekvanholland": [51.977, 4.12],
            "scheveningen": [52.099, 4.264], "noordwijk.meetpost": [52.273, 4.295], "ijmuiden.buitenhaven": [52.463, 4.555], "petten.zuid": [52.773, 4.65],
            "denhelder.marsdiep": [52.964, 4.745], "texel.noordzee": [53.121, 4.733], "vlieland.haven": [53.296, 5.091], "terschelling.noordzee": [53.442, 5.333],
            "ameland.nes": [53.43, 5.759], "schiermonnikoog.waddenzee": [53.469, 6.203], "harlingen.waddenzee": [53.176, 5.409], "holwerd.veersteiger": [53.396, 5.878],
            "lauwersoog.waddenzee": [53.408, 6.196], "delfzijl": [53.328, 6.931]}
    for s in lijst:
        s["lat"], s["lon"] = plek[s["code"]]
    (ROOT / "site" / "data" / "getij" / "stations.json").write_text(json.dumps({"bron": "Rijkswaterstaat, Waterwebservices (astronomisch getij)", "opgehaald": date.today().isoformat(), "stations": lijst}, indent=0, ensure_ascii=False))


if __name__ == "__main__":
    main()
