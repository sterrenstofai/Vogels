"""Voeg GBIF-synoniemen (tweedelige wetenschappelijke namen) toe aan data/namen.json.

Nodig om oude plaatonderschriften en bestandsnamen te herkennen (Anas penelope = smient).
Gebruik: python3 synoniemen.py ../data/namen.json
"""
import json, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

MIN_WAARNEMINGEN = 50


def synoniemen(k):
    url = f"https://api.gbif.org/v1/species/{k}/synonyms?limit=300"
    with urllib.request.urlopen(url, timeout=60) as r:
        res = json.load(r)["results"]
    return k, sorted({x["canonicalName"] for x in res if len((x.get("canonicalName") or "").split()) == 2})


def main(pad):
    N = json.load(open(pad))
    kern = [k for k, n in N.items() if n["wet_gbif"] and n["waarnemingen_twente"] >= MIN_WAARNEMINGEN]
    with ThreadPoolExecutor(8) as ex:
        for k, syn in ex.map(synoniemen, kern):
            N[k]["synoniemen"] = syn
    json.dump(N, open(pad, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
