// Mijn fiets: welke onderdelen je in het echt hebt gezien, met de datum. Alleen in de browser van dit apparaat.
// Overgenomen van "Mijn hemel" bij De Ruimte.
const SLEUTEL = "fiets-mijn";
const luisteraars = new Set();
export function lees() { try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; } }
function schrijf(m) { try { localStorage.setItem(SLEUTEL, JSON.stringify(m)); } catch {} for (const fn of luisteraars) fn(m); }
export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }
export const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
export const datumTekst = (iso) => { const d = new Date(iso); return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`; };
export function wissel(sleutel, naam) { const m = lees(); if (m[sleutel]) delete m[sleutel]; else m[sleutel] = { naam, datum: new Date().toISOString() }; schrijf(m); return !!m[sleutel]; }
export function heeft(sleutel) { return !!lees()[sleutel]; }
export function aantal() { return Object.keys(lees()).length; }
export function wis() { schrijf({}); }
// Alle onderdelen die je kunt "zien"
export const ONDERDELEN = [
  ["wielen", "de wielen"], ["banden", "de banden"], ["ventiel", "het ventiel"], ["remmen", "de remmen"], ["stuur", "het stuur"], ["bel", "de bel"],
  ["koplamp", "de koplamp"], ["achterlicht", "het achterlicht"], ["zadel", "het zadel"], ["trappers", "de trappers"], ["ketting", "de ketting"],
  ["versnellingen", "de versnellingen"], ["frame", "het frame"], ["vork", "de voorvork"], ["motor", "een motor bij de trappers"], ["accu", "een fietsaccu"], ["standaard", "de standaard"], ["slot", "het slot"],
];
