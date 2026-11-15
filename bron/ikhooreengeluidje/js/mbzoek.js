// Zoeken in alle nummers, rechtstreeks vanuit de browser:
// - iTunes Search API voor het vinden (die zet de bekende versie bovenaan) en voor het fragment;
// - MusicBrainz voor credits en samples (CC0), op exacte titel en artiest, de opname met de meeste uitgaven.
// Niets hiervan is met de hand nagekeken; de pagina zegt dat ook.
// MusicBrainz vraagt hooguit één verzoek per seconde: daarom een wachtrij. Antwoorden blijven in sessionStorage.

const MB = "https://musicbrainz.org/ws/2/";
let laatsteMb = 0;
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

async function haal(url, mb = false) {
  const sleutel = `ikhoor:${url}`;
  try { const c = sessionStorage.getItem(sleutel); if (c) return JSON.parse(c); } catch {}
  if (mb) {
    const nu = Date.now(), tijd = Math.max(0, laatsteMb + 1100 - nu);
    laatsteMb = nu + tijd;
    if (tijd) await wacht(tijd);
  }
  let r;
  for (let poging = 0; poging < 3; poging++) {
    r = await fetch(url, { referrerPolicy: "no-referrer" });
    if (r.status !== 503 && r.status !== 429) break;
    await wacht(2000 * (poging + 1)); // MusicBrainz is druk: even wachten en opnieuw
  }
  if (!r.ok) throw new Error(`${r.status}`);
  const d = await r.json();
  try { sessionStorage.setItem(sleutel, JSON.stringify(d)); } catch {}
  return d;
}

// "Under Pressure (Remastered 2011)" -> "Under Pressure"; "Queen & David Bowie" -> "Queen"
export const schoneTitel = (t) => t.replace(/\s*[([].*?(remaster|version|edit|mix|mono|stereo|live|feat\.?|ft\.|with |from ).*?[)\]]/gi, "").replace(/\s+-\s+.*(remaster|version|edit|mix|live).*$/i, "").trim();
export const hoofdArtiest = (a) => a.split(/\s*(?:,|&| feat\.?| ft\.| featuring| x | and | met )\s*/i)[0].trim();
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export async function zoekItunes(q) {
  const d = await haal("https://itunes.apple.com/search?" + new URLSearchParams({ term: q, entity: "song", limit: "30", country: "NL" }));
  const gezien = new Set(), uit = [];
  for (const r of d.results || []) {
    if (!r.previewUrl) continue;
    const k = norm(schoneTitel(r.trackName)) + "|" + norm(hoofdArtiest(r.artistName));
    if (gezien.has(k) || /karaoke|tribute|made famous|in the style of/i.test(`${r.collectionName} ${r.artistName}`)) continue;
    gezien.add(k);
    uit.push(r);
  }
  return uit.slice(0, 16);
}

export async function itunesTrack(id) {
  const d = await haal("https://itunes.apple.com/lookup?" + new URLSearchParams({ id, country: "NL" }));
  return (d.results || [])[0] || null;
}

const SLECHT = /live|remix|karaoke|instrumental|demo|a ?cappella|cover|acoustic|unplugged/i;
export async function mbOpname(titel, artiest) {
  const q = `recording:"${titel.replace(/"/g, "")}" AND artist:"${artiest.replace(/"/g, "")}"`;
  const d = await haal(MB + "recording?" + new URLSearchParams({ query: q, fmt: "json", limit: "100" }), true);
  const t = norm(titel);
  const kand = (d.recordings || []).filter((r) => norm(r.title) === t && !SLECHT.test(r.disambiguation || ""));
  kand.sort((a, b) => (b.releases?.length || 0) - (a.releases?.length || 0));
  if (!kand.length) return null;
  return haal(MB + `recording/${kand[0].id}?` + new URLSearchParams({ inc: "artist-rels+recording-rels+work-rels+isrcs+artist-credits+releases", fmt: "json" }), true);
}

/* ---------- Van MusicBrainz naar instrumenten (zelfde regels als scripts/bouw_site_data.py) ---------- */

export const NAMEN = {
  zang: "zang", achtergrondzang: "achtergrondzang", rap: "rap", drumstel: "drumstel", drumcomputer: "drumcomputer", slagwerk: "slagwerk",
  handgeklap: "handgeklap", vingerknippen: "vingerknippen", tamboerijn: "tamboerijn", congas: "conga's", pauken: "pauken",
  basgitaar: "basgitaar", contrabas: "contrabas", gitaar: "gitaar", "elektrische-gitaar": "elektrische gitaar", "akoestische-gitaar": "akoestische gitaar",
  viool: "viool", altviool: "altviool", cello: "cello", strijkers: "strijkers", harp: "harp", piano: "piano", rhodes: "Rhodes-piano",
  "elektrische-piano": "elektrische piano", keyboard: "keyboard", orgel: "orgel", clavinet: "clavinet", synthesizer: "synthesizer", sampler: "sampler",
  vocoder: "vocoder", talkbox: "talkbox", draaitafel: "draaitafel", trompet: "trompet", trombone: "trombone", saxofoon: "saxofoon",
  altsaxofoon: "altsaxofoon", tenorsaxofoon: "tenorsaxofoon", baritonsaxofoon: "baritonsaxofoon", blazers: "blazers", dwarsfluit: "dwarsfluit",
  hoorn: "hoorn", klarinet: "klarinet", hobo: "hobo", fagot: "fagot", celesta: "celesta", "kleine-trom": "kleine trom",
};
const PATRONEN = [
  [/background|backing|chorus|choir/i, "achtergrondzang"], [/\brap/i, "rap"], [/vocal|voice/i, "zang"],
  [/drum machine/i, "drumcomputer"], [/drums? \(drum set\)|^drums$|^drums\b|drum kit/i, "drumstel"],
  [/handclap/i, "handgeklap"], [/finger snap/i, "vingerknippen"], [/tambourine/i, "tamboerijn"], [/conga/i, "congas"],
  [/timpani/i, "pauken"], [/percussion/i, "slagwerk"],
  [/double bass|upright bass|contrabass/i, "contrabas"], [/bass/i, "basgitaar"],
  [/electric guitar|lead guitar|rhythm guitar/i, "elektrische-gitaar"], [/acoustic guitar/i, "akoestische-gitaar"], [/guitar/i, "gitaar"],
  [/viola/i, "altviool"], [/violin/i, "viool"], [/cello/i, "cello"], [/strings/i, "strijkers"], [/harp/i, "harp"],
  [/rhodes/i, "rhodes"], [/wurlitzer|electric piano/i, "elektrische-piano"], [/clavinet/i, "clavinet"],
  [/organ/i, "orgel"], [/piano/i, "piano"], [/keyboard/i, "keyboard"],
  [/vocoder/i, "vocoder"], [/talk ?box/i, "talkbox"], [/sampler|emulator/i, "sampler"], [/synth|moog/i, "synthesizer"],
  [/turntable|scratch/i, "draaitafel"],
  [/trumpet|flugelhorn/i, "trompet"], [/trombone/i, "trombone"], [/alto sax/i, "altsaxofoon"], [/tenor sax/i, "tenorsaxofoon"],
  [/baritone sax/i, "baritonsaxofoon"], [/sax/i, "saxofoon"], [/french horn|^horn$/i, "hoorn"], [/horns|brass/i, "blazers"],
  [/flute/i, "dwarsfluit"], [/clarinet/i, "klarinet"], [/oboe/i, "hobo"], [/bassoon/i, "fagot"],
];
const instrument = (rol) => PATRONEN.find(([p]) => p.test(rol))?.[1] || null;
const PRODUCTIE = [[/producer/i, "productie"], [/mix/i, "mix"], [/engineer|recording/i, "opname"], [/master/i, "mastering"], [/arrang/i, "arrangement"], [/programm/i, "programmeren"], [/conductor/i, "dirigent"]];
const artiestVan = (r) => (r["artist-credit"] || []).map((c) => c.name + (c.joinphrase || "")).join("");

// Maakt een nummer in dezelfde vorm als site/data/nummers.json
export function maakNummer(track, rec, kernPerMb, mbFout = false) {
  const spel = new Map(), prod = {};
  for (const x of rec?.relations || []) {
    if (x["target-type"] !== "artist") continue;
    const naam = x.artist.name;
    let keys = [];
    if (x.type === "instrument") keys = (x.attributes?.length ? x.attributes : ["instrument"]).map(instrument).filter(Boolean);
    else if (x.type === "vocal") keys = [instrument((x.attributes || []).join(" ") || "vocal") || "zang"];
    else { const p = PRODUCTIE.find(([re]) => re.test(x.type)); if (p) (prod[p[1]] = prod[p[1]] || new Set()).add(naam); }
    for (const k of keys) { if (!spel.has(k)) spel.set(k, new Set()); spel.get(k).add(naam); }
  }
  const volgorde = Object.keys(NAMEN);
  const credits = [...spel.entries()].sort((a, b) => volgorde.indexOf(a[0]) - volgorde.indexOf(b[0]))
    .map(([k, namen]) => ({ key: k, nl: NAMEN[k], wie: [...namen].sort().map((n) => ({ naam: n, bron: ["MusicBrainz"] })) }));
  const samples = (rec?.relations || []).filter((x) => x.type === "samples material" && x.recording);
  const omzetten = (x) => ({ titel: x.recording.title, artiest: artiestVan(x.recording), mb: x.recording.id, slug: kernPerMb[x.recording.id] || null, type: "sample", bron: `https://musicbrainz.org/recording/${rec.id}` });
  const erin = samples.filter((x) => x.direction === "forward").map(omzetten);
  const door = samples.filter((x) => x.direction === "backward").map(omzetten);
  const jaar = parseInt((rec?.["first-release-date"] || track.releaseDate || "").slice(0, 4), 10) || null;
  return {
    slug: `it-${track.trackId}`, titel: schoneTitel(track.trackName), artiest: track.artistName, jaar, album: track.collectionName,
    klassiek: false, nagekeken: false, gevonden: true,
    credits, productie: Object.fromEntries(Object.entries(prod).map(([k, v]) => [k, [...v].sort()])),
    apparaten: [], weetjes: [], samples_erin: erin, gesampled_door: door.slice(0, 10), gesampled_door_totaal: door.length,
    isrc: rec?.isrcs?.[0] || null,
    bronnen: { musicbrainz: rec ? `https://musicbrainz.org/recording/${rec.id}` : null },
    mbId: rec?.id || null, mbFout,
    preview: { url: track.previewUrl, winkel: track.trackViewUrl, hoes: track.artworkUrl100.replace("100x100bb", "600x600bb"), hoes_klein: track.artworkUrl100.replace("100x100bb", "200x200bb"), van: `${track.artistName}, ${track.trackName} (${track.collectionName})` },
  };
}
