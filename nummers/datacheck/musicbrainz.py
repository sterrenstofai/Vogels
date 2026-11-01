"""Per testnummer: credits en samples in MusicBrainz.

Kiest per nummer de studio-opname met de meeste relaties (live, remix en
DJ-mix vallen af), en telt de relaties op opname-niveau. Schrijft
uitkomsten/musicbrainz.json. MusicBrainz vraagt maximaal 1 verzoek per seconde.
"""
import json, re, sys, time, urllib.parse, urllib.request
from collections import Counter
from pathlib import Path
from nummers import NUMMERS, UA

API = "https://musicbrainz.org/ws/2/"
UIT = Path(__file__).parent / "uitkomsten"

def get(path, **params):
    params["fmt"] = "json"
    url = API + path + "?" + urllib.parse.urlencode(params)
    for poging in range(5):
        time.sleep(1.1)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            print("  opnieuw:", e, file=sys.stderr); time.sleep(3 * (poging + 1))
    raise RuntimeError(url)

SLECHT = re.compile(r"live|remix|mix|edit|demo|instrumental|acapella|a cappella|karaoke|version|cover", re.I)
INC = "artist-rels+recording-rels+work-rels+releases+isrcs"

def kandidaten(artiest, titel, album):
    q = f'recording:"{titel}" AND artist:"{artiest}" AND status:official'
    if album:
        q += f' AND release:"{album}"'
    res = get("recording", query=q, limit=25)["recordings"]
    if not res and album:
        res = get("recording", query=f'recording:"{titel}" AND artist:"{artiest}"', limit=25)["recordings"]
    breed = get("recording", query=f'recording:"{titel}" AND artist:"{artiest}"', limit=60)["recordings"]
    gezien, alle = set(), []
    for r in res + breed:
        if r["id"] not in gezien:
            gezien.add(r["id"]); alle.append(r)
    goed = [r for r in alle if not SLECHT.search(r.get("disambiguation", "")) and r["title"].lower() == titel.lower()]
    # de opname op de meeste releases is meestal het origineel
    goed.sort(key=lambda r: -len(r.get("releases", [])))
    return (goed or alle)[:8]

def samenvatten(rec):
    rels = rec.get("relations", [])
    per_type = Counter(r["type"] for r in rels)
    instrumenten = Counter()
    mensen = {}
    for r in rels:
        if r.get("target-type") != "artist":
            continue
        naam = r["artist"]["name"]
        if r["type"] == "instrument":
            for a in r.get("attributes", []) or ["(instrument onbekend)"]:
                instrumenten[a] += 1
                mensen.setdefault(a, []).append(naam)
        elif r["type"] == "vocal":
            a = ", ".join(r.get("attributes", [])) or "vocal"
            instrumenten["zang: " + a] += 1
            mensen.setdefault("zang: " + a, []).append(naam)
    samples = [
        {"richting": r["direction"], "titel": r["recording"]["title"],
         "artiest": r["recording"].get("artist-credit-phrase") or None,
         "id": r["recording"]["id"]}
        for r in rels if r["type"] == "samples material"
    ]
    return {
        "id": rec["id"], "titel": rec["title"], "lengte_ms": rec.get("length"),
        "relaties": len(rels), "per_type": dict(per_type),
        "instrumenten": dict(instrumenten), "wie": mensen,
        "samples_erin": [s for s in samples if s["richting"] == "forward"],
        "gesampled_door": [s for s in samples if s["richting"] == "backward"],
        "isrcs": rec.get("isrcs", []),
    }

def werk_samples(rec):
    """Samples worden soms op werk-niveau gelegd; tel die ook."""
    uit = []
    for r in rec.get("relations", []):
        if r.get("target-type") == "work":
            w = get("work/" + r["work"]["id"], inc="work-rels+recording-rels")
            for wr in w.get("relations", []):
                if "sampl" in wr["type"] or wr["type"] in ("based on", "medley"):
                    uit.append({"type": wr["type"], "richting": wr["direction"],
                                "doel": (wr.get("work") or wr.get("recording") or {}).get("title")})
            return w["title"], len([x for x in w.get("relations", []) if x.get("target-type") == "recording"]), uit
    return None, 0, uit

def main():
    alles = {}
    for sleutel, artiest, titel, album, genre in NUMMERS:
        print(sleutel, file=sys.stderr)
        if sleutel == "bolero":
            alles[sleutel] = bolero(); continue
        beste = None
        geprobeerd = []
        for k in kandidaten(artiest, titel, album):
            rec = get("recording/" + k["id"], inc=INC)
            s = samenvatten(rec)
            geprobeerd.append((s["id"], s["relaties"]))
            if not beste or s["relaties"] > beste[0]["relaties"]:
                beste = (s, rec)
        s, rec = beste
        s["werk"], s["werk_opnames"], s["werk_samples"] = werk_samples(rec)
        s["kandidaten"] = geprobeerd
        alles[sleutel] = s
    (UIT / "musicbrainz.json").write_text(json.dumps(alles, ensure_ascii=False, indent=1))

def bolero():
    w = get("work", query='work:"Boléro" AND artist:"Maurice Ravel"', limit=5)["works"][0]
    werk = get("work/" + w["id"], inc="recording-rels")
    opnames = [r["recording"] for r in werk.get("relations", []) if r.get("target-type") == "recording"]
    # zes opnames bekijken: hoeveel hebben uitvoerders (orkest, dirigent, instrument)?
    steek = []
    for o in opnames[:: max(1, len(opnames) // 6)][:6]:
        rec = get("recording/" + o["id"], inc=INC)
        s = samenvatten(rec)
        steek.append({"id": s["id"], "titel": s["titel"], "relaties": s["relaties"], "per_type": s["per_type"],
                      "instrumenten": s["instrumenten"]})
    return {"werk": werk["title"], "werk_id": werk["id"], "werk_opnames": len(opnames), "steekproef": steek}

if __name__ == "__main__":
    main()
