// Mijn hemel: wat je zelf echt aan de hemel hebt gezien, met de datum.
// Staat alleen in de browser van dit apparaat (localStorage). Overgenomen van "Mijn vogels" bij Voggels
// en "Mijn nummers" bij ikhooreengeluidje.

const SLEUTEL = "ruimte-mijn-hemel";
const luisteraars = new Set();

export function lees() {
  try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; }
}
function schrijf(m) {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(m)); } catch {}
  for (const fn of luisteraars) fn(m);
}
export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }

const nu = () => {
  const d = new Date(), t = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${t(d.getMonth() + 1)}-${t(d.getDate())}T${t(d.getHours())}:${t(d.getMinutes())}`;
};

// sleutel: de slug (uit de lijst) of "wd:Q123" (gevonden via Wikidata)
// info: { titel, naam, beeld, pad } zodat Mijn hemel ook zonder de lijst werkt
export function wissel(sleutel, info) {
  const m = lees();
  if (m[sleutel]) delete m[sleutel];
  else m[sleutel] = { ...info, datum: nu() };
  schrijf(m);
  return !!m[sleutel];
}
export function heeft(sleutel) { return !!lees()[sleutel]; }
export function aantal() { return Object.keys(lees()).length; }
export function wis() { schrijf({}); }
