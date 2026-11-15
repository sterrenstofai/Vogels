// Zoeken buiten de vaste lijst: Wikidata, rechtstreeks vanuit je browser (CORS staat open).
// Alles hiervan is "niet nagekeken". Rustig aan: hooguit één vraag per seconde, antwoorden bewaard in sessionStorage.
// Bij 429 of 503 een eerlijke melding ("te druk"), niet "niets gevonden".
const API = "https://www.wikidata.org/w/api.php";
const SPARQL = "https://query.wikidata.org/sparql";
let laatste = 0;
async function rij() { const wacht = Math.max(0, laatste + 1100 - Date.now()); laatste = Date.now() + wacht; if (wacht) await new Promise((r) => setTimeout(r, wacht)); }
async function haal(url) {
  const k = "ruimte-wd:" + url;
  try { const c = sessionStorage.getItem(k); if (c) return JSON.parse(c); } catch {}
  await rij();
  const r = await fetch(url, { headers: { Accept: "application/sparql-results+json, application/json" }, referrerPolicy: "no-referrer" });
  if (r.status === 429 || r.status === 503) throw new Error("druk");
  if (!r.ok) throw new Error("fout " + r.status);
  const j = await r.json();
  try { sessionStorage.setItem(k, JSON.stringify(j)); } catch {}
  return j;
}
const sparql = (q) => haal(`${SPARQL}?${new URLSearchParams({ query: q, format: "json" })}`).then((j) => j.results.bindings);

// Zoek op naam (Nederlands of Engels), en houd alleen hemellichamen over (subklasse van "astronomisch object")
export async function zoek(q) {
  const p = new URLSearchParams({ action: "wbsearchentities", search: q, language: "nl", uselang: "nl", type: "item", limit: "15", format: "json", origin: "*" });
  const j = await haal(`${API}?${p}`);
  const ids = (j.search || []).map((s) => s.id);
  if (!ids.length) return [];
  const rijen = await sparql(`SELECT DISTINCT ?item WHERE { VALUES ?item { ${ids.map((i) => "wd:" + i).join(" ")} }
    { ?item wdt:P31/wdt:P279* wd:Q6999 } UNION { ?item wdt:P31/wdt:P279* wd:Q40218 } }`);
  const ok = new Set(rijen.map((r) => r.item.value.split("/").pop()));
  return j.search.filter((s) => ok.has(s.id)).map((s) => ({ id: s.id, label: s.label, beschrijving: s.description }));
}

const EENHEID = { "kilogram": "kg", "kilometre": "km", "metre": "m", "solar mass": "zonsmassa", "solar radius": "zonsstraal", "light-year": "lichtjaar", "parsec": "parsec", "astronomical unit": "AE", "day": "dagen", "year": "jaar", "hour": "uur", "kelvin": "K", "degree Celsius": "°C", "Earth mass": "aardmassa", "Jupiter mass": "Jupitermassa", "Earth radius": "aardstraal", "Jupiter radius": "Jupiterstraal", "1": "" };
const getal = (v) => { const x = parseFloat(v); return Math.abs(x) >= 1e6 || (Math.abs(x) < 0.01 && x !== 0) ? x.toExponential(2).replace(".", ",").replace("e+", " × 10^").replace("e-", " × 10^-") : x.toLocaleString("nl-NL", { maximumFractionDigits: 2 }); };

export async function details(qid) {
  if (!/^Q\d+$/.test(qid)) return null;
  const q = `SELECT ?p ?v ?unitLabel ?vLabel WHERE {
    VALUES ?item { wd:${qid} }
    VALUES (?p ?prop ?psv ?ps) { ("massa" p:P2067 psv:P2067 ps:P2067) ("straal" p:P2120 psv:P2120 ps:P2120) ("diameter" p:P2386 psv:P2386 ps:P2386)
      ("afstand tot de aarde" p:P2583 psv:P2583 ps:P2583) ("helderheid" p:P1215 psv:P1215 ps:P1215) ("omlooptijd" p:P2146 psv:P2146 ps:P2146) ("temperatuur" p:P2076 psv:P2076 ps:P2076) }
    ?item ?prop ?st . ?st ?ps ?v . OPTIONAL { ?st ?psv ?vn . ?vn wikibase:quantityUnit ?unit . ?unit rdfs:label ?unitLabel FILTER(LANG(?unitLabel)="en") }
  }`;
  const q2 = `SELECT ?label ?en ?besch ?img ?wiki ?soortLabel ?ouderLabel ?beeldLabel ?ontdekt ?ra ?dec WHERE {
    BIND(wd:${qid} AS ?item)
    OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label)="nl") } OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en)="en") }
    OPTIONAL { ?item schema:description ?besch FILTER(LANG(?besch)="nl") }
    OPTIONAL { ?item wdt:P18 ?img } OPTIONAL { ?wiki schema:about ?item ; schema:isPartOf <https://nl.wikipedia.org/> }
    OPTIONAL { ?item wdt:P31 ?soort } OPTIONAL { ?item wdt:P397 ?ouder } OPTIONAL { ?item wdt:P59 ?beeld }
    OPTIONAL { ?item wdt:P575 ?ontdekt } OPTIONAL { ?item wdt:P6257 ?ra } OPTIONAL { ?item wdt:P6258 ?dec }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
  } LIMIT 1`;
  const [waarden, [b]] = await Promise.all([sparql(q), sparql(q2)]);
  if (!b) return null;
  const v = (x) => b[x]?.value;
  const cijfers = [];
  if (v("soortLabel")) cijfers.push(["Soort", v("soortLabel")]);
  if (v("ouderLabel")) cijfers.push(["Draait om", v("ouderLabel")]);
  if (v("beeldLabel")) cijfers.push(["Sterrenbeeld", v("beeldLabel")]);
  if (v("ontdekt")) cijfers.push(["Ontdekt", v("ontdekt").slice(0, 4).replace(/^0+/, "")]);
  const gezien = new Set();
  for (const w of waarden) {
    if (gezien.has(w.p.value)) continue; // alleen de eerste waarde; Wikidata heeft er soms meerdere
    gezien.add(w.p.value);
    const e = EENHEID[w.unitLabel?.value] ?? w.unitLabel?.value ?? "";
    cijfers.push([w.p.value[0].toUpperCase() + w.p.value.slice(1), `${getal(w.v.value)} ${e}`.trim()]);
  }
  const bestand = v("img") ? decodeURIComponent(v("img").split("/").pop()) : null;
  return {
    label: v("label") || v("en") || qid, beschrijving: v("besch"), wiki: v("wiki"), soort: v("soortLabel"),
    thumb: bestand ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(bestand)}?width=640` : null,
    bestand: bestand ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(bestand)}` : null,
    ra: v("ra") != null ? +v("ra") : null, dec: v("dec") != null ? +v("dec") : null, cijfers,
  };
}
