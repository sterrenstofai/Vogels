"""Per testnummer: credits in Discogs, via de hoofdrelease van het album (of de single).

Telt credits die voor dit nummer gelden: credits op de track zelf, plus
release-credits zonder trackbeperking of met dit tracknummer. Zonder token
(25 verzoeken per minuut). Schrijft uitkomsten/discogs.json.
"""
import json, re, sys, time, urllib.parse, urllib.request
from collections import Counter
from pathlib import Path
from nummers import NUMMERS, UA

UIT = Path(__file__).parent / "uitkomsten"

def get(url):
    for poging in range(5):
        time.sleep(2.6)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            print("  opnieuw:", e, file=sys.stderr); time.sleep(10 * (poging + 1))
    raise RuntimeError(url)

# Rollen die over het maken van geluid gaan (Discogs-rollen zijn vrije tekst met vaste woorden)
SPEL = re.compile(r"drum|bass|guitar|keyboard|synth|piano|organ|vocal|sax|trumpet|trombone|horn|violin|viola|cello|string|percussion|programm|sampl|clap|harp|flute|vocoder|rhodes|clavinet|tambourine|conga|bongo|scratch|turntable|mellotron|instruments|backing", re.I)
ANDERS = re.compile(r"produc|engineer|mix|master|record|arrang|written|lyrics|music by|composed", re.I)

def track_past(tracks, positie):
    if not tracks:
        return True
    delen = [t.strip() for t in re.split(r",|&", tracks)]
    for d in delen:
        if d == positie:
            return True
        m = re.match(r"(\w+)\s+to\s+(\w+)", d)
        if m:
            return True  # bereik: neem mee, Discogs-bereiken zijn niet eenvoudig te ontleden
    return False

def alle_tracks(rel):
    for t in rel.get("tracklist", []):
        yield t
        yield from t.get("sub_tracks", [])

# Met de hand gekozen master waar het zoeken een verkeerde vindt (Rehab: de "sampler")
MASTER = {"rehab": 51256}

def main():
    uit = {}
    for sleutel, artiest, titel, album, genre in NUMMERS:
        print(sleutel, file=sys.stderr)
        zoek = album or titel
        q = urllib.parse.urlencode({"artist": artiest if sleutel != "bolero" else "Ravel", "release_title": zoek, "type": "master"})
        res = get("https://api.discogs.com/database/search?" + q)["results"]
        if not res:
            q = urllib.parse.urlencode({"q": f"{artiest} {titel}", "type": "master"})
            res = get("https://api.discogs.com/database/search?" + q)["results"]
        if not res:
            uit[sleutel] = None; continue
        # oudste master met precies deze titel (anders kom je bij dvd's en heruitgaven)
        res.sort(key=lambda r: (zoek.lower() != r["title"].lower().split(" - ", 1)[-1], int(r.get("year") or 9999)))
        master = get(f"https://api.discogs.com/masters/{MASTER[sleutel]}" if sleutel in MASTER else res[0]["resource_url"])
        versies = get(master["resource_url"] + "/versions?per_page=100&sort=released&sort_order=asc").get("versions", [])
        # de hoofdrelease plus de twaalf oudste versies; neem die met de meeste credits
        ids = [master["main_release"]] + [v["id"] for v in versies[:12]]
        rel, beste = None, -1
        for rid in dict.fromkeys(ids):
            r = get(f"https://api.discogs.com/releases/{rid}")
            n = len(r.get("extraartists", [])) + sum(len(t.get("extraartists", [])) for t in alle_tracks(r))
            if n > beste:
                rel, beste = r, n
        positie, track = None, None
        for t in alle_tracks(rel):
            if t["title"].lower().startswith(titel.lower()[:10]) or titel.lower() in t["title"].lower():
                positie, track = t["position"], t; break
        credits = []
        for c in (track or {}).get("extraartists", []):
            credits.append((c["role"], c["name"], "track"))
        for c in rel.get("extraartists", []):
            if positie is None or track_past(c.get("tracks", ""), positie):
                credits.append((c["role"], c["name"], "release" + (" (alle tracks)" if not c.get("tracks") else "")))
        spel = [c for c in credits if SPEL.search(c[0])]
        anders = [c for c in credits if not SPEL.search(c[0]) and ANDERS.search(c[0])]
        uit[sleutel] = {
            "master": master["id"], "release": rel["id"], "release_titel": rel["title"], "jaar": rel.get("year"),
            "versies_van_master": len(versies), "track": positie,
            "credits_totaal": len(credits), "spelcredits": len(spel), "productiecredits": len(anders),
            "rollen": dict(Counter(c[0] for c in spel)),
            "voorbeeld": spel[:12],
            "notities_lengte": len(rel.get("notes", "") or ""),
        }
    (UIT / "discogs.json").write_text(json.dumps(uit, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
