// Mijn vogels: welke soorten je zelf gezien of gehoord hebt, met de datums.
// Staat alleen in de browser van dit apparaat (localStorage), net als het logboek van de onderzoekjes.

const SLEUTEL = "voggels-gespot";
const luisteraars = new Set();

export function lees() {
  try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; }
}
function schrijf(g) {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(g)); } catch {}
  for (const fn of luisteraars) fn(g);
}
export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }

// lokale datum en tijd, zoals 2026-11-01T18:20 (de tijd alleen voor de volgorde)
const vandaag = () => {
  const d = new Date(), t = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${t(d.getMonth() + 1)}-${t(d.getDate())}T${t(d.getHours())}:${t(d.getMinutes())}:${t(d.getSeconds())}`;
};

export function voegToe(key) {
  const g = lees();
  (g[key] = g[key] || []).push(vandaag());
  schrijf(g);
  return g[key].length;
}

export function haalWeg(key) {
  const g = lees();
  if (!g[key]) return 0;
  g[key].pop();
  if (!g[key].length) delete g[key];
  schrijf(g);
  return g[key]?.length || 0;
}

export function aantalVan(key) { return lees()[key]?.length || 0; }
export function soorten() { return Object.keys(lees()); }
