// Eigen SVG-kaart van Twente: vakken, gemeentegrenzen, geen kaarttegels (niets lekt weg).
import { VAK } from "./data.js";

const COS = Math.cos(52.3 * Math.PI / 180);
const SCHAAL = 1000; // svg-eenheden per graad breedte

function projectie(twente) {
  const punten = (twente.type === "Polygon" ? [twente.coordinates] : twente.coordinates).flat(2);
  const xs = punten.map((p) => p[0]), ys = punten.map((p) => p[1]);
  const minX = Math.min(...xs) - 0.03, maxX = Math.max(...xs) + 0.03;
  const minY = Math.min(...ys) - 0.03, maxY = Math.max(...ys) + 0.03;
  const x = (lon) => (lon - minX) * COS * SCHAAL;
  const y = (lat) => (maxY - lat) * SCHAAL;
  return { x, y, b: (maxX - minX) * COS * SCHAAL, h: (maxY - minY) * SCHAAL };
}

function pad(geo, x, y) {
  const polys = geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates;
  return polys.map((ringen) => ringen.map((r) => "M" + r.map(([lo, la]) => `${x(lo).toFixed(1)},${y(la).toFixed(1)}`).join("L") + "Z").join("")).join("");
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// opties: waarden (vak -> getal), eigen, buren[], gemeente, punt [lat, lon], klik (bool), label
export function tekenKaart(k, vakkenData, opties = {}) {
  const { x, y, b, h } = projectie(k.twente);
  const waarden = opties.waarden || Object.fromEntries(Object.entries(vakkenData).map(([v, d]) => [v, Object.keys(d.s).length]));
  const max = Math.max(1, ...Object.values(waarden));
  // logaritmisch: één druk vak (zoals het Kristalbad) mag de rest niet wegdrukken
  const stap = (w) => (w <= 0 ? -1 : Math.min(4, Math.floor((Math.log1p(w) / Math.log1p(max)) * 5)));
  const delen = [];
  for (const vak of Object.keys(vakkenData)) {
    const [la, lo] = vak.split(",").map(Number);
    const w = waarden[vak] || 0, s = stap(w);
    const kleur = s < 0 ? "url(#arcering)" : `var(--schaal-${s})`;
    const titel = opties.titel ? opties.titel(vak, w) : `${w}`;
    delen.push(`<rect class="vak${opties.klik ? " klik" : ""}" data-vak="${vak}" x="${x(lo).toFixed(1)}" y="${y(la + VAK).toFixed(1)}" width="${(VAK * COS * SCHAAL).toFixed(1)}" height="${(VAK * SCHAAL).toFixed(1)}" fill="${kleur}"><title>${esc(titel)}</title></rect>`);
  }
  for (const [naam, g] of Object.entries(k.gemeenten)) {
    delen.push(`<path class="${naam === opties.gemeente ? "gemeente-eigen" : "gemeente"}" d="${pad(g.vorm, x, y)}"><title>${esc(naam)}</title></path>`);
  }
  delen.push(`<path class="twente" d="${pad(k.twente, x, y)}"/>`);
  for (const v of opties.buren || []) {
    const [la, lo] = v.split(",").map(Number);
    delen.push(`<rect class="vak-buur" x="${x(lo)}" y="${y(la + VAK)}" width="${VAK * COS * SCHAAL}" height="${VAK * SCHAAL}"/>`);
  }
  if (opties.eigen) {
    const [la, lo] = opties.eigen.split(",").map(Number);
    delen.push(`<rect class="vak-eigen" x="${x(lo)}" y="${y(la + VAK)}" width="${VAK * COS * SCHAAL}" height="${VAK * SCHAAL}"/>`);
  }
  if (opties.punt) delen.push(`<circle class="punt" cx="${x(opties.punt[1])}" cy="${y(opties.punt[0])}" r="6"/>`);
  return `<svg viewBox="0 0 ${b.toFixed(0)} ${h.toFixed(0)}" role="img" aria-label="${esc(opties.label || "Kaart van Twente in vakken")}">
    <defs><pattern id="arcering" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--papier)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--arcering)" stroke-width="2"/></pattern></defs>
    ${delen.join("")}</svg>`;
}

export function legenda(max, eenheid) {
  const stappen = [0, 1, 2, 3, 4].map((s) => `<span><i style="background:var(--schaal-${s})"></i>${s === 4 ? `tot ${max} ${eenheid}` : ""}</span>`).join("");
  return `<div class="kaart-legenda mono zacht">${stappen}<span><i style="background:repeating-linear-gradient(45deg,var(--papier) 0 2px,var(--arcering) 2px 4px)"></i>niets gemeld</span></div>`;
}
