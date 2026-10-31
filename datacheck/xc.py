"""xeno-canto v3: per Twentse soort (>=50 waarn.) de Europese opnames, met kwaliteit, licentie en type."""
import json, os, sys, time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from datacheck import get
KEY = os.environ["XC_KEY"]  # xeno-canto API v3-sleutel, nooit in de repo
URL = "https://xeno-canto.org/api/3/recordings"
BUREN = {"Netherlands", "Belgium", "Germany"}

def opnames(query):
    out, page = [], 1
    while True:
        d = get(URL, {"query": query, "key": KEY, "per_page": 500, "page": page})
        out += d.get("recordings", [])
        if page >= int(d.get("numPages", 1)): return out
        page += 1; time.sleep(0.5)

def lic(u): return u.rstrip("/").split("/licenses/")[-1].split("/")[0] if "/licenses/" in u else u

def check(item):
    k, n = item
    gen, sp = n["wet"].split()[:2]
    recs = opnames(f"gen:{gen} sp:{sp} area:europe")
    goed = [r for r in recs if r["q"] in ("A", "B")]
    dichtbij = [r for r in goed if r["cnt"] in BUREN]
    zonder_nd = [r for r in dichtbij if "nd" not in lic(r["lic"])]
    def heeft(rs, t): return sum(1 for r in rs if t in r["type"].lower())
    return k, {"nl": n["nl"], "wet": n["wet"], "europa": len(recs), "europa_AB": len(goed),
               "NL_BE_DE_AB": len(dichtbij), "NL_BE_DE_AB_zonder_ND": len(zonder_nd),
               "zang": heeft(zonder_nd, "song"), "roep": heeft(zonder_nd, "call"),
               "licenties_AB": dict(Counter(lic(r["lic"]) for r in goed)),
               "opnemers_zonder_ND": len({r["rec"] for r in zonder_nd}),
               "zonder_opnemer": sum(1 for r in recs if not r.get("rec"))}

if __name__ == "__main__":
    T = json.load(open("twente_soorten.json"))
    soorten = [(k, T["namen"][k]) for k, c in T["totaal"].items() if c >= 50]
    with ThreadPoolExecutor(3) as ex: res = dict(ex.map(check, soorten))
    json.dump(res, open("xc_rapport.json", "w"), ensure_ascii=False, indent=1)
    print("soorten", len(res))
