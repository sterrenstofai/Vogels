"""Neemt per nummer de opname met de meeste relaties uit beide routes (zoeken
op opname, of via het album) en haalt die opnieuw op, met de artiest van elk
sample erbij. Schrijft uitkomsten/musicbrainz_vast.json."""
import json
from musicbrainz import get, samenvatten, werk_samples, INC, UIT

def main():
    a = json.loads((UIT / "musicbrainz.json").read_text())
    b = json.loads((UIT / "musicbrainz_album.json").read_text())
    uit = {}
    for k, s in a.items():
        if k == "bolero":
            uit[k] = s; continue
        kandidaten = [s["id"]] + ([b[k]["recording"]] if b.get(k) else [])
        beste = None
        for rid in dict.fromkeys(kandidaten):
            rec = get("recording/" + rid, inc=INC)
            z = samenvatten(rec)
            if not beste or z["relaties"] > beste[0]["relaties"]:
                beste = (z, rec)
        z, rec = beste
        for lijst in (z["samples_erin"], z["gesampled_door"]):
            for x in lijst:
                r = get("recording/" + x["id"], inc="artist-credits")
                x["artiest"] = "".join(c["name"] + c.get("joinphrase", "") for c in r.get("artist-credit", []))
        z["werk"], z["werk_opnames"], z["werk_samples"] = werk_samples(rec)
        uit[k] = z
    (UIT / "musicbrainz_vast.json").write_text(json.dumps(uit, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
