"""Eén SPARQL-vraag aan Wikidata voor alle instrumenten: afbeelding (P18),
Nederlandse naam en Nederlandse Wikipedia. Losse API-vragen gaven vanaf deze
machine 429. Zoekt op Engelse label. Schrijft uitkomsten/wikidata.json."""
import json, urllib.parse, urllib.request
from pathlib import Path
from beeld import INSTRUMENTEN
from nummers import UA

UIT = Path(__file__).parent / "uitkomsten"
labels = " ".join('"%s"@en' % t for _, t, _ in INSTRUMENTEN)
Q = """SELECT ?label ?item ?nl ?img ?nlwiki (COUNT(?site) AS ?sites) WHERE {
  VALUES ?label { %s }
  ?item rdfs:label ?label .
  OPTIONAL { ?item wdt:P18 ?img }
  OPTIONAL { ?item rdfs:label ?nl FILTER(LANG(?nl) = "nl") }
  OPTIONAL { ?nlwiki schema:about ?item ; schema:isPartOf <https://nl.wikipedia.org/> }
  OPTIONAL { ?site schema:about ?item }
} GROUP BY ?label ?item ?nl ?img ?nlwiki""" % labels
url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": Q, "format": "json"})
with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
    rijen = json.load(r)["results"]["bindings"]
uit = {}
for r in rijen:
    lab = r["label"]["value"]
    sites = int(r["sites"]["value"])
    rij = {"item": r["item"]["value"].rsplit("/", 1)[-1], "sites": sites, "nl": r.get("nl", {}).get("value"),
           "nlwiki": r.get("nlwiki", {}).get("value"), "img": r.get("img", {}).get("value")}
    # bij meerdere items met hetzelfde label: neem het item met de meeste Wikipedia's (het bekende)
    if lab not in uit or sites > uit[lab]["sites"]:
        uit[lab] = rij
(UIT / "wikidata.json").write_text(json.dumps(uit, ensure_ascii=False, indent=1))
for nl, t, _ in INSTRUMENTEN:
    r = uit.get(t)
    print(f"{nl:30s}", r and r["item"], r and r["nl"], "| foto:", r and r["img"] and urllib.parse.unquote(r["img"].rsplit("/", 1)[-1])[:60])
