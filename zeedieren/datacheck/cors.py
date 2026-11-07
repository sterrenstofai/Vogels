"""Werken de API's vanuit de browser? Stuurt een Origin-kop mee en kijkt naar Access-Control-Allow-Origin."""
import json, urllib.request
O = "https://zeedieren.netlify.app"
URLS = {
 "WoRMS": "https://www.marinespecies.org/rest/AphiaRecordByAphiaID/138998",
 "GBIF": "https://api.gbif.org/v1/occurrence/search?taxonKey=2288103&limit=0",
 "OBIS": "https://api.obis.org/v3/occurrence?taxonid=138998&size=1",
 "Wikidata SPARQL": "https://query.wikidata.org/sparql?format=json&query=SELECT%20%3Fx%20WHERE%20%7B%7D",
 "Wikidata EntityData": "https://www.wikidata.org/wiki/Special:EntityData/Q21124.json",
 "Wikipedia API (origin=*)": "https://nl.wikipedia.org/w/api.php?action=query&titles=Kokkel&format=json&origin=*",
 "Commons API (origin=*)": "https://commons.wikimedia.org/w/api.php?action=query&titles=File:Example.jpg&format=json&origin=*",
 "RWS ddapi20 catalogus": "https://ddapi20-waterwebservices.rijkswaterstaat.nl/METADATASERVICES/OphalenCatalogus",
 "xeno-canto v3": "https://xeno-canto.org/api/3/recordings?query=sp:%22Haematopus%20ostralegus%22",
}
uit = {}
for k, u in URLS.items():
    data = json.dumps({"CatalogusFilter": {"Grootheden": True}}).encode() if "ddapi20" in u else None
    req = urllib.request.Request(u, data=data, headers={"Origin": O, "User-Agent": "zeedieren-datacheck/0.1", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            s, acao = r.status, r.headers.get("Access-Control-Allow-Origin")
    except urllib.error.HTTPError as e:
        s, acao = e.code, e.headers.get("Access-Control-Allow-Origin")
    except Exception as e:
        s, acao = str(e)[:40], None
    uit[k] = {"status": s, "allow_origin": acao}
    print(f"{k:28} {s!s:6} {acao}")
json.dump(uit, open("uitkomsten/cors.json", "w"), indent=1)
