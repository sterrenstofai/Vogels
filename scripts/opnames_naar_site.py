"""Zet de gekozen opnames (eerste keus plus reserves) in site/data/soorten.json.

Gebruik: python3 scripts/opnames_naar_site.py data/opnames.json site/data/soorten.json
"""
import json, sys


def main(opnames_pad, soorten_pad):
    O = json.load(open(opnames_pad))
    S = json.load(open(soorten_pad))
    for k, s in S.items():
        o = O.get(k, {})
        for t in ("zang", "roep"):
            lijst = o.get(t) or []
            s[t] = lijst[0] if lijst else None
            s[f"{t}_reserve"] = lijst[1:3]
    json.dump(S, open(soorten_pad, "w"), ensure_ascii=False, separators=(",", ":"))
    print("soorten met zang", sum(1 for s in S.values() if s["zang"]), "met roep", sum(1 for s in S.values() if s["roep"]))


if __name__ == "__main__":
    main(*sys.argv[1:3])
