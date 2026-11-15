// Mijn nummers: welke nummers je zelf hebt ontdekt, met de datum.
// Staat alleen in de browser van dit apparaat (localStorage), net als het logboek van de onderzoekjes.
// Overgenomen van "Mijn vogels" bij Voggels. Werkt ook voor nummers die je via MusicBrainz vindt.

const SLEUTEL = "ikhoor-mijn-nummers";
const luisteraars = new Set();

export function lees() {
  try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; }
}
function schrijf(m) {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(m)); } catch {}
  for (const fn of luisteraars) fn(m);
}
export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }

const vandaag = () => {
  const d = new Date(), t = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${t(d.getMonth() + 1)}-${t(d.getDate())}T${t(d.getHours())}:${t(d.getMinutes())}`;
};

// sleutel: de slug (nummers uit de lijst) of "mb:<id>" (gezocht via MusicBrainz)
// info: { titel, artiest, hoes, pad } zodat de pagina Mijn nummers ook zonder de lijst werkt
export function wissel(sleutel, info) {
  const m = lees();
  if (m[sleutel]) delete m[sleutel];
  else m[sleutel] = { ...info, datum: vandaag() };
  schrijf(m);
  return !!m[sleutel];
}
export function heeft(sleutel) { return !!lees()[sleutel]; }
export function aantal() { return Object.keys(lees()).length; }
