// Hoog- en laagwater uit site/data/getij/ (Rijkswaterstaat, astronomisch getij: een voorspelling zonder wind).
// Het station dat je kiest onthouden we op dit apparaat (localStorage). Je locatie gebruiken we alleen in het geheugen.
const SLEUTEL = "zeezicht-station";
let _stations = null;
export async function stations() { if (!_stations) _stations = fetch("/data/getij/stations.json").then((r) => r.json()); return _stations; }
const reeksen = new Map();
export function reeks(code) { if (!reeksen.has(code)) reeksen.set(code, fetch(`/data/getij/${code}.json`).then((r) => r.json())); return reeksen.get(code); }
export function gekozen() { try { return localStorage.getItem(SLEUTEL) || "scheveningen"; } catch { return "scheveningen"; } }
export function kies(code) { try { localStorage.setItem(SLEUTEL, code); } catch {} }
// Het dichtstbijzijnde station bij een plek (lat, lon). Wordt niet bewaard.
export function dichtstbij(lijst, lat, lon) {
  const k = Math.cos((lat * Math.PI) / 180);
  return lijst.reduce((b, s) => { const d = (s.lat - lat) ** 2 + ((s.lon - lon) * k) ** 2; return d < b.d ? { s, d } : b; }, { s: null, d: Infinity }).s;
}
export const tijd = (iso) => new Date(iso.replace("Z", ":00Z"));
const fmtTijd = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const fmtDag = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });
export const uur = (d) => fmtTijd.format(d);
export const dag = (d) => fmtDag.format(d);
// de komende extremen vanaf nu
export function komend(r, n = 4, vanaf = new Date()) { return r.extremen.filter(([t]) => tijd(t) >= vanaf).slice(0, n).map(([t, cm, s]) => ({ t: tijd(t), cm, hoog: s === "H" })); }
// stijgt of daalt het water nu? (tussen het vorige en het volgende extreem)
export function nuStand(r, nu = new Date()) {
  const i = r.extremen.findIndex(([t]) => tijd(t) > nu);
  if (i <= 0) return null;
  const v = r.extremen[i - 1], w = r.extremen[i];
  return { stijgt: w[2] === "H", volgend: { t: tijd(w[0]), cm: w[1], hoog: w[2] === "H" }, vorig: { t: tijd(v[0]), cm: v[1], hoog: v[2] === "H" } };
}
// een vloeiende lijn tussen de extremen (cosinus), voor een plaatje; geen echte meting
export function curve(r, van, tot, stappen = 200) {
  const ex = r.extremen.map(([t, cm]) => [tijd(t).getTime(), cm]);
  const pts = [];
  for (let k = 0; k <= stappen; k++) {
    const t = van.getTime() + ((tot - van) * k) / stappen, i = ex.findIndex(([x]) => x > t);
    if (i <= 0) continue;
    const [t0, h0] = ex[i - 1], [t1, h1] = ex[i], f = (t - t0) / (t1 - t0);
    pts.push([t, h0 + (h1 - h0) * (1 - Math.cos(Math.PI * f)) / 2]);
  }
  return pts;
}
