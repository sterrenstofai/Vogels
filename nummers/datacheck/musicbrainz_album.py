"""Tweede route: via het oorspronkelijke album. Credits staan in MusicBrainz
soms op het album (release) in plaats van op de opname. Telt beide voor het
nummer op het album met de meeste relaties. Schrijft uitkomsten/musicbrainz_album.json."""
import json, sys
from collections import Counter
from musicbrainz import get, samenvatten, UIT
from nummers import NUMMERS

def main():
    uit = {}
    for sleutel, artiest, titel, album, genre in NUMMERS:
        if not album:
            continue
        print(sleutel, file=sys.stderr)
        rels = get("release", query=f'release:"{album}" AND artist:"{artiest}" AND status:official', limit=25)["releases"]
        rels = [r for r in rels if r["title"].lower() == album.lower()][:8]
        beste = None
        for r in rels:
            rel = get("release/" + r["id"], inc="artist-rels+recordings+recording-level-rels+work-level-rels")
            album_rels = rel.get("relations", [])
            for medium in rel.get("media", []):
                for t in medium.get("tracks", []):
                    if t["title"].lower() != titel.lower():
                        continue
                    rec_rels = t["recording"].get("relations", [])
                    totaal = len(album_rels) + len(rec_rels)
                    if not beste or totaal > beste["totaal"]:
                        beste = {"release": rel["id"], "datum": rel.get("date"), "land": rel.get("country"),
                                 "recording": t["recording"]["id"], "totaal": totaal,
                                 "album_rels": dict(Counter(x["type"] for x in album_rels)),
                                 "album_instrumenten": dict(Counter(a for x in album_rels if x["type"] == "instrument" for a in x.get("attributes", []))),
                                 "opname_rels": dict(Counter(x["type"] for x in rec_rels)),
                                 "opname_instrumenten": dict(Counter(a for x in rec_rels if x["type"] == "instrument" for a in x.get("attributes", [])))}
        uit[sleutel] = beste
    (UIT / "musicbrainz_album.json").write_text(json.dumps(uit, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
