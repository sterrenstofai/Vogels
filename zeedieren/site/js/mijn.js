// Mijn zee: wat je zelf echt gezien of gevonden hebt, met de datum. Alleen in de browser van dit apparaat.
// Overgenomen van "Mijn hemel" bij De Ruimte en "Mijn fiets" bij Voertuigen.
// Sleutel: de slug van een dier, of "smp:<GBIF-sleutel>" voor een vondst uit de strandlijst die geen eigen pagina heeft.
const SLEUTEL = "zeezicht-mijn";
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
addEventListener("storage", (e) => { if (e.key === SLEUTEL) for (const fn of luisteraars) fn(lees()); });
