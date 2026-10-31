import json, time, urllib.parse, urllib.request, urllib.error
UA = "VogelsInTwente-datacheck/0.1 (thijs@sterrenstof.ai)"
API = "https://commons.wikimedia.org/w/api.php"
def q(**p):
    p = {"format": "json", "formatversion": 2, **p}
    url = API + "?" + urllib.parse.urlencode(p)
    for poging in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                time.sleep(1.0)
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(int(e.headers.get("retry-after", 15)) + 1); continue
            if e.code >= 500:
                time.sleep(10 * (poging + 1)); continue
            raise
    raise RuntimeError("te vaak 429")
def leden(cat, soort="file|subcat"):
    out, cont = [], {}
    while True:
        d = q(action="query", list="categorymembers", cmtitle=cat, cmtype=soort, cmlimit=500, **cont)
        out += d["query"]["categorymembers"]
        if "continue" not in d: return out
        cont = d["continue"]
