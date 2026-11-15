// Tab "Baan": een simulatie in de browser, op een donker paneel. Label "simulatie".
// - Om de zon: de banen van bovenaf, met de plek van vandaag (astronomy-engine of een Kepler-baan), en de tijd versneld.
// - Een maan: om zijn planeet, met de echte omlooptijd (versneld).
// - Een ster: geen baan om de zon; je ziet hoe hij in één nacht rond de Poolster lijkt te draaien (dat is de aarde die draait).
import { helio } from "./hemel.js";

const PAARS = "#B5B1E5", WIT = "#FFFFFF", ZACHT = "rgba(255,255,255,.45)", NACHT = "#1A1A1A";
const PLANETEN = ["mercurius", "venus", "aarde", "mars", "jupiter", "saturnus", "uranus", "neptunus"];

function baanGewoon(vak, item, D) {
  vak.innerHTML = `<div class="baan">
    <canvas class="baan-doek" aria-label="Simulatie van de baan van ${item.naam}"></canvas>
    <div class="baan-onder">
      <span class="label">simulatie</span>
      <label class="baan-snel"><span>Sneller</span><input type="range" min="0" max="4" step="1" value="2" aria-label="Snelheid van de simulatie"></label>
      <span class="baan-datum mono"></span>
    </div>
    <p class="noot baan-noot"></p>
  </div>`;
  const doek = vak.querySelector("canvas"), noot = vak.querySelector(".baan-noot"), datumVak = vak.querySelector(".baan-datum");
  const schuif = vak.querySelector("input");
  let t0 = Date.now(), sim = Date.now(), vorige = performance.now(), frame = 0, loopt = true;
  const zon = item.soort !== "maan" && item.soort !== "ster" && item.slug !== "zon";
  // dagen per seconde, per stand van de schuif
  const SNEL = zon ? (item.baan?.periode_d > 20000 ? [30, 365, 3650, 18250, 73000] : item.baan?.periode_d > 2000 ? [5, 30, 180, 730, 3650] : [0.5, 3, 15, 60, 240])
    : item.soort === "ster" ? [1 / 96, 1 / 24, 1 / 8, 1 / 3, 1] : [0.05, 0.3, 1.5, 6, 24];
  noot.textContent = zon ? "De banen van bovenaf gezien, op schaal. De bolletjes zijn veel te groot getekend: op deze schaal zou zelfs de zon kleiner zijn dan een stipje. Het begint vandaag, op de plek waar alles nu echt staat."
    : item.slug === "zon" ? "De zon staat in het midden; de planeten draaien eromheen. Op schaal, alleen de bolletjes zijn te groot getekend."
    : item.soort === "ster" ? "Een ster draait niet om de zon. Maar omdat de aarde draait, lijkt elke ster in een nacht een stukje van een cirkel te draaien om de Poolster. Hier zie je dat versneld; de kaart is naar het noorden gericht."
    : `${item.titel} om ${D.perSlug[item.ouder]?.naam || "zijn planeet"}, met de echte omlooptijd, versneld. Afstand op schaal; de bolletjes zijn te groot getekend.`;

  function maat() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = doek.clientWidth || 320, h = doek.clientHeight || 320;
    doek.width = Math.round(w * dpr); doek.height = Math.round(h * dpr);
    doek.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }
  let { w, h } = maat();
  const ro = new ResizeObserver(() => ({ w, h } = maat()));
  ro.observe(doek);

  function stip(c, x, y, r, kleur, label, sterk) {
    c.fillStyle = kleur; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    if (label) { c.fillStyle = sterk ? PAARS : ZACHT; c.font = `${sterk ? 600 : 500} ${sterk ? 13 : 11}px Geist, sans-serif`; c.textAlign = "left"; c.fillText(label, x + r + 4, y + 4); }
  }

  function tekenZon(c, datum) {
    const cx = w / 2, cy = h / 2;
    const binnen = item.slug === "zon" ? false : (item.baan?.a_km || 0) < 6e8 && !(item.baan?.e > 0.5);
    const lijst = PLANETEN.filter((s) => !binnen || ["mercurius", "venus", "aarde", "mars", "jupiter"].includes(s)).map((s) => D.perSlug[s]);
    let maxAE = binnen ? 5.6 : 31;
    if (item.baan?.kepler) maxAE = Math.max(maxAE, item.baan.kepler.a * (1 + item.baan.kepler.e) * 1.03);
    if (item.slug === "pluto") maxAE = 50;
    const s = (Math.min(w, h) / 2 - 18) / maxAE;
    c.fillStyle = "#FFD27A"; c.beginPath(); c.arc(cx, cy, 6, 0, 2 * Math.PI); c.fill();
    const teken = (it, sterk, zonderNaam = false) => {
      // de baan: het pad van de komende omloop
      const P = it.baan.periode_d, n = 160;
      c.strokeStyle = sterk ? "rgba(181,177,229,.6)" : "rgba(255,255,255,.14)"; c.lineWidth = sterk ? 1.5 : 1; c.beginPath();
      for (let k = 0; k <= n; k++) { const v = helio(it, new Date(+datum + (k / n) * P * 864e5)); if (!v) return; const x = cx + v.x * s, y = cy - v.y * s; k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
      const v = helio(it, datum);
      stip(c, cx + v.x * s, cy - v.y * s, sterk ? 5.5 : zonderNaam ? 2 : 3.5, sterk ? PAARS : WIT, zonderNaam ? "" : it.titel, sterk);
    };
    for (const p of lijst) if (p.slug !== item.slug) teken(p, false, maxAE > 20 && p.baan.a_km < 3e8);
    if (item.slug !== "zon") teken(item, true);
    c.fillStyle = ZACHT; c.font = "500 11px Geist Mono, monospace"; c.textAlign = "left";
    const ae = maxAE > 20 ? 10 : 1;
    c.fillRect(14, h - 22, ae * s, 2); c.fillText(`${ae} keer de afstand aarde–zon`, 14, h - 30);
  }

  function tekenMaan(c, datum) {
    const cx = w / 2, cy = h / 2, ouder = D.perSlug[item.ouder];
    const zussen = D.hemel.filter((x) => x.ouder === item.ouder && x.soort === "maan" && x.baan?.a_km);
    const maxA = Math.max(...zussen.map((x) => x.baan.a_km));
    const s = (Math.min(w, h) / 2 - 22) / maxA;
    const rOuder = Math.max(5, (ouder?.schaal?.diameter_km || 0) / 2 * s);
    c.fillStyle = "#D9D9D9"; c.beginPath(); c.arc(cx, cy, rOuder, 0, 2 * Math.PI); c.fill();
    c.fillStyle = ZACHT; c.font = "500 11px Geist, sans-serif"; c.textAlign = "center"; c.fillText(ouder?.titel || "", cx, cy + rOuder + 14);
    const dagen = (+datum - t0) / 864e5;
    for (const m of zussen) {
      const sterk = m.slug === item.slug, r = m.baan.a_km * s;
      c.strokeStyle = sterk ? "rgba(181,177,229,.6)" : "rgba(255,255,255,.14)"; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r, 0, 2 * Math.PI); c.stroke();
      const hoek = (m.slug === "triton" ? -1 : 1) * 2 * Math.PI * dagen / m.baan.periode_d + m.slug.length;
      stip(c, cx + r * Math.cos(hoek), cy - r * Math.sin(hoek), sterk ? 5 : 3, sterk ? PAARS : WIT, m.titel, sterk);
    }
  }

  function tekenSter(c, datum) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 22;
    const dec = item.baan?.ster?.dec ?? 89;
    const r = ((90 - dec) / 50) * R; // tot 50 graden van de pool past op de kaart
    stip(c, cx, cy - 2, 3.5, WIT, "Poolster"); // het punt waar de hemel om draait
    const uren = (+datum - t0) / 3600e3, hoek = (uren / 23.934) * 2 * Math.PI;
    c.strokeStyle = "rgba(181,177,229,.25)"; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, Math.min(r, R), 0, 2 * Math.PI); c.stroke();
    c.strokeStyle = "rgba(181,177,229,.8)"; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, Math.min(r, R), -Math.PI / 2 - Math.min(hoek, 2 * Math.PI), -Math.PI / 2, false); c.stroke();
    const a = -Math.PI / 2 - hoek;
    stip(c, cx + Math.min(r, R) * Math.cos(a), cy + Math.min(r, R) * Math.sin(a), 5, PAARS, item.titel, true);
    if (r > R) { c.fillStyle = ZACHT; c.font = "500 11px Geist, sans-serif"; c.textAlign = "center"; c.fillText(`${item.titel} staat verder van de Poolster dan deze kaart laat zien`, cx, h - 12); }
    c.fillStyle = ZACHT; c.font = "500 11px Geist Mono, monospace"; c.textAlign = "left"; c.fillText("NOORD", 12, 18);
  }

  function stap(nu) {
    if (!loopt || !doek.isConnected) return;
    const dt = Math.min(0.1, (nu - vorige) / 1000); vorige = nu;
    sim += dt * SNEL[+schuif.value] * 864e5;
    const c = doek.getContext("2d");
    c.fillStyle = NACHT; c.fillRect(0, 0, w, h);
    const datum = new Date(sim);
    if (item.soort === "maan" && item.ouder !== "aarde" || item.slug === "maan") tekenMaan(c, datum);
    else if (item.soort === "ster" && item.slug !== "zon") tekenSter(c, datum);
    else tekenZon(c, datum);
    if (++frame % 10 === 1) datumVak.textContent = item.soort === "ster" ? `+${Math.floor((sim - t0) / 3600e3)} uur ${Math.floor(((sim - t0) / 60e3) % 60)} min`
      : datum.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
    requestAnimationFrame(stap);
  }
  // wie niet van beweging houdt: stilstaand beeld van vandaag
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) schuif.value = 0;
  requestAnimationFrame(stap);
  return () => { loopt = false; ro.disconnect(); };
}

function stip(c, x, y, r, kleur, label, sterk) {
  c.fillStyle = kleur; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
  if (label) { c.fillStyle = sterk ? PAARS : ZACHT; c.font = `${sterk ? 600 : 500} ${sterk ? 13 : 11}px Geist, sans-serif`; c.textAlign = "left"; c.fillText(label, x + r + 4, y + 4); }
}
export function baan(vak, item, D) {
  return baanGewoon(vak, item, D);
}
