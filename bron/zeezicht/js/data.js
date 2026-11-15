// De lijst met dieren (site/data/dieren.json, gebouwd door scripts/bouw_site_data.py) en kleine hulpjes.
let _lijst = null;
export async function dieren() {
  if (!_lijst) _lijst = fetch("/data/dieren.json").then((r) => r.json()).then((d) => d.dieren);
  return _lijst;
}
export const pad = (d, kind = false) => (kind ? "/kinderen/" : "/") + d.slug;
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
export const MAAND_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
export const hoofd = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
// "de kokkel" -> "kokkel"; "het nonnetje" -> "nonnetje"
export const kaal = (naam) => naam.replace(/^(de|het)\s+/, "");
export const lidwoord = (naam) => (naam.match(/^(de|het)\s/) || [, ""])[1];
export const PLEKKEN = { strand: "aan het strand", wad: "op het wad", noordzee: "in de Noordzee", oceaan: "verder weg" };
// "de Amerikaanse zwaardschede" -> accent op het laatste woord
export function naamMetAccent(naam, hoofdletter = true) {
  const w = naam.split(" "), lw = /^(de|het)$/.test(w[0]) ? w.shift() : "";
  const laatste = w.pop();
  const voor = [lw && (hoofdletter ? hoofd(lw) : lw), ...w].filter(Boolean).join(" ");
  return `${esc(voor)}${voor ? " " : ""}<span class="accent">${esc(laatste)}</span>`;
}
