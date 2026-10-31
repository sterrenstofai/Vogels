// Laden en rekenen. Alles komt van de eigen site; alleen het adres gaat naar PDOK.
import { PDOK, KERN_MIN } from "./config.js";

const cache = new Map();
export function laad(pad) {
  if (!cache.has(pad)) {
    cache.set(pad, fetch(pad).then((r) => {
      if (!r.ok) throw new Error(`${pad}: ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(pad);
}

export const meta = () => laad("/data/meta.json");
export const soorten = () => laad("/data/soorten.json");
export const vakken = () => laad("/data/vakken.json");
export const kaart = () => laad("/data/kaart.json");

export const VAK = 0.05;
export const vakVan = (lat, lon) => `${(Math.floor(lat / VAK + 1e-9) * VAK).toFixed(2)},${(Math.floor(lon / VAK + 1e-9) * VAK).toFixed(2)}`;
export const vakUitSlug = (s) => s.replace("_", ",");
export const vakSlug = (v) => v.replace(",", "_");
export function buren(vak) {
  const [lat, lon] = vak.split(",").map(Number);
  const uit = [];
  for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
    uit.push(`${(lat + dy * VAK).toFixed(2)},${(lon + dx * VAK).toFixed(2)}`);
  }
  return uit;
}
export function vakMidden(vak) {
  const [lat, lon] = vak.split(",").map(Number);
  return [lat + VAK / 2, lon + VAK / 2];
}

export function afstand(lat1, lon1, lat2, lon2) {
  const r = 6371000, p = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * p / 2) ** 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin((lon2 - lon1) * p / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

// Tel per soort de maanden op over een set vakken
export function optellen(alleVakken, sleutels) {
  const uit = new Map();
  let n = 0;
  for (const v of sleutels) {
    const vak = alleVakken[v];
    if (!vak) continue;
    n += vak.n;
    for (const [soort, rij] of Object.entries(vak.s)) {
      const som = uit.get(soort) || new Array(12).fill(0);
      rij.forEach((c, i) => (som[i] += c));
      uit.set(soort, som);
    }
  }
  return { n, perSoort: uit };
}

export const inSeizoen = (rij, maanden) => maanden.reduce((s, m) => s + rij[m], 0);

export function splitsKern(lijst, alleSoorten) {
  const kern = [], rest = [];
  for (const item of lijst) (alleSoorten[item.key].n >= KERN_MIN ? kern : rest).push(item);
  return { kern, rest };
}

// Precieze meldingen rond een punt, uit het eigen vak en de buurvakken
export async function preciesRond(lat, lon, straal) {
  const m = await meta();
  const beschikbaar = new Set(m.precies_vakken);
  const delen = await Promise.all(buren(vakVan(lat, lon)).filter((v) => beschikbaar.has(v))
    .map((v) => laad(`/data/precies/${vakSlug(v)}.json`).catch(() => [])));
  return delen.flat()
    .map(([la, lo, soort, datum, bron]) => ({ soort, datum, bron, d: afstand(lat, lon, la, lo) }))
    .filter((r) => r.d <= straal)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
}

// PDOK Locatieserver: alleen adressen in de veertien Twentse gemeenten
export async function zoekAdres(q, signal) {
  const m = await meta();
  const codes = Object.keys(m.gemeentecodes).join(" ");
  const p = new URLSearchParams({ q, rows: "7", fl: "id,weergavenaam,type" });
  p.append("fq", "type:(adres OR postcode OR weg)");
  p.append("fq", `gemeentecode:(${codes})`);
  const r = await fetch(`${PDOK}/suggest?${p}`, { signal, referrerPolicy: "no-referrer" });
  if (!r.ok) throw new Error("PDOK");
  return (await r.json()).response.docs;
}

export async function haalAdres(id) {
  const p = new URLSearchParams({ id, fl: "weergavenaam,centroide_ll,gemeentecode,gemeentenaam" });
  const r = await fetch(`${PDOK}/lookup?${p}`, { referrerPolicy: "no-referrer" });
  if (!r.ok) throw new Error("PDOK");
  const doc = (await r.json()).response.docs[0];
  const [lon, lat] = doc.centroide_ll.replace("POINT(", "").replace(")", "").split(" ").map(Number);
  return { naam: doc.weergavenaam, lat, lon, gemeentecode: doc.gemeentecode };
}

// Gemeente van een vak: de gemeente waarin het midden ligt, anders de eerste die het vak raakt
export function gemeenteVanVak(k, vak) {
  const [la, lo] = vakMidden(vak);
  let eerste = null;
  for (const [naam, g] of Object.entries(k.gemeenten)) {
    if (!g.vakken.includes(vak)) continue;
    eerste = eerste || naam;
    if (inVorm(g.vorm, lo, la)) return naam;
  }
  return eerste;
}

function inVorm(geo, x, y) {
  const polys = geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates;
  return polys.some((ringen) => inRing(ringen[0], x, y) && !ringen.slice(1).some((r) => inRing(r, x, y)));
}
function inRing(ring, x, y) {
  let binnen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen;
  }
  return binnen;
}
