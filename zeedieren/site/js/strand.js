// Wat vind je aan het strand? Wat aanspoelt per maand (Stichting ANEMOON, strandmonitoring, via GBIF, CC BY 4.0)
// en het getij (Rijkswaterstaat, astronomisch getij). Je locatie gebruiken we alleen in het geheugen, om het
// dichtstbijzijnde station te kiezen; we bewaren hem niet.
import { esc, MAANDEN, hoofd } from "/js/data.js";
import * as GETIJ from "/js/getij.js";
import * as MIJN from "/js/mijn.js";

const app = document.getElementById("app");
let maand = new Date().getMonth();
let S = null, ST = null, dierBeeld = {};

async function start() {
  [S, ST] = await Promise.all([fetch("/data/strand.json").then((r) => r.json()), GETIJ.stations()]);
  const D = await fetch("/data/dieren.json").then((r) => r.json());
  for (const d of D.dieren) dierBeeld[d.slug] = d.klein;
  app.innerHTML = `
    <p class="etiket">Aan het strand</p>
    <h1>Wat vind je aan het <span class="accent">strand</span>?</h1>
    <p class="inleiding">Wat spoelt er aan, en wanneer is het eb? Bij eb is het strand het breedst en vind je het meest langs de vloedlijn. Ga altijd samen met een volwassene, en raak kwallen en pietermannen niet aan.</p>
    <section aria-labelledby="getij">
      <h2 id="getij">Eb en vloed</h2>
      <div class="station-kies">
        <label class="sr" for="station">Kies een strand</label>
        <select id="station">${ST.stations.map((s) => `<option value="${s.code}">${esc(s.naam)}${s.soort === "wad" ? " (wad)" : ""}</option>`).join("")}</select>
        <button type="button" class="knop-pil" data-locatie>Dichtstbij mij</button>
      </div>
      <p class="noot" data-locatie-melding aria-live="polite"></p>
      <div data-getij></div>
      <p class="noot">Dit is het astronomisch getij van Rijkswaterstaat: een voorspelling van de maan en de zon, zonder wind. Bij harde wind of storm kan het water veel hoger of lager staan, en eerder of later komen. Tijden in Nederlandse tijd, hoogtes in centimeters ten opzichte van NAP. De lijn tussen hoog en laag is een tekening, geen meting.</p>
    </section>
    <section aria-labelledby="vondsten">
      <h2 id="vondsten">Wat spoelt er aan in <span data-maandnaam></span>?</h2>
      <div class="chips" role="group" aria-label="Kies een maand">${MAANDEN.map((m, i) => `<button type="button" class="chip" data-maand="${i}" aria-pressed="${i === maand}">${hoofd(m.slice(0, 3))}</button>`).join("")}</div>
      <p class="noot" data-uitleg></p>
      <ul class="vondst-lijst" data-lijst></ul>
      <p class="noot">Niet in de lijst: eikapsels van roggen en haaien (nixenbeurzen), zeehonden en vogels. Die telt de strandmonitoring niet. Tik op + als je het zelf gevonden hebt: dan staat het in <a href="/mijn">Mijn zee</a>, met de datum.</p>
    </section>
    <section class="veilig" aria-labelledby="veilig"><h2 id="veilig">Veilig aan het strand</h2>
      <p>Bij het water ben je altijd samen met een volwassene. Ga je dicht bij het water, doe dan een zwemvest aan.</p>
      <p>Kwallen en de pieterman niet aanraken, ook niet als ze op het strand liggen. Zie je een zeehond, blijf dan minstens 30 meter weg.</p>
      <p>Wadlopen doe je alleen met een gids. Wat je in een emmertje doet, zet je terug waar je het vond.</p></section>`;
  const kies = app.querySelector("#station");
  kies.value = GETIJ.gekozen();
  if (!kies.value) kies.value = "scheveningen";
  kies.addEventListener("change", () => { GETIJ.kies(kies.value); getij(kies.value); });
  app.querySelector("[data-locatie]").addEventListener("click", () => {
    const mel = app.querySelector("[data-locatie-melding]");
    if (!navigator.geolocation) { mel.textContent = "Je browser kan je locatie niet geven. Kies het strand in de lijst."; return; }
    mel.textContent = "Even zoeken…";
    navigator.geolocation.getCurrentPosition((p) => {
      const s = GETIJ.dichtstbij(ST.stations, p.coords.latitude, p.coords.longitude);   // alleen in het geheugen
      kies.value = s.code; GETIJ.kies(s.code); getij(s.code);
      mel.textContent = `Het dichtstbijzijnde station is ${s.naam}. Je locatie is niet bewaard.`;
    }, () => (mel.textContent = "Dat lukte niet. Kies het strand in de lijst."), { maximumAge: 600000, timeout: 15000 });
  });
  app.querySelector(".chips").addEventListener("click", (e) => { const c = e.target.closest("[data-maand]"); if (!c) return; maand = +c.dataset.maand; for (const x of app.querySelectorAll("[data-maand]")) x.setAttribute("aria-pressed", String(+x.dataset.maand === maand)); vondsten(); });
  getij(kies.value); vondsten();
  if (location.hash === "#getij") app.querySelector("#getij").scrollIntoView();
}

async function getij(code) {
  const vak = app.querySelector("[data-getij]");
  const r = await GETIJ.reeks(code), nu = new Date();
  const ex = r.extremen.map(([t, cm, s]) => ({ t: GETIJ.tijd(t), cm, hoog: s === "H" })).filter((x) => x.t > new Date(nu - 864e5 / 2));
  const dagen = new Map();
  for (const x of ex) { const d = GETIJ.dag(x.t); if (!dagen.has(d)) dagen.set(d, []); if (dagen.size <= 3) dagen.get(d).push(x); }
  const stand = GETIJ.nuStand(r);
  // tekening van 24 uur
  const van = new Date(nu - 3 * 36e5), tot = new Date(+nu + 21 * 36e5), pts = GETIJ.curve(r, van, tot);
  const W = 800, H = 150, min = -220, max = 260, x = (t) => ((t - van) / (tot - van)) * W, y = (cm) => H - 18 - ((cm - min) / (max - min)) * (H - 30);
  const lijn = pts.map(([t, cm], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${y(cm).toFixed(1)}`).join("");
  const uren = [];
  for (let u = new Date(van); u <= tot; u = new Date(+u + 36e5)) if (+GETIJ.uur(u).slice(0, 2) % 6 === 0 && GETIJ.uur(u).endsWith(":00")) uren.push(u);
  vak.innerHTML = `${stand ? `<p class="oz-uitkomst">${stand.stijgt ? "Het water komt op" : "Het water gaat terug"}. ${stand.volgend.hoog ? "Hoogwater" : "Laagwater"} om <span class="accent">${GETIJ.uur(stand.volgend.t)}</span>.</p>` : ""}
    <svg class="getij-curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tekening van het getij in de komende 24 uur">
      ${pts.length ? `<path class="water" d="${lijn}L${W} ${H}L0 ${H}Z"/><path class="lijn" d="${lijn}"/>` : ""}
      <line class="nu" x1="${x(nu)}" y1="0" x2="${x(nu)}" y2="${H - 14}"/><text x="${x(nu) + 4}" y="12">nu</text>
      ${uren.map((u) => `<text x="${x(u)}" y="${H - 2}" text-anchor="middle">${GETIJ.uur(u)}</text>`).join("")}
    </svg>
    <div class="getij-dagen">${[...dagen].slice(0, 3).map(([d, l]) => `<div class="getij-dag"><h3>${esc(hoofd(d))}</h3><ul>${l.map((x) => `<li><span>${GETIJ.uur(x.t)}</span><b>${x.hoog ? "hoogwater" : "laagwater"}</b><span>${x.cm > 0 ? "+" : ""}${x.cm} cm</span></li>`).join("")}</ul></div>`).join("")}</div>`;
}

function vondsten() {
  const m = S.maanden[String(maand + 1)];
  app.querySelector("[data-maandnaam]").textContent = MAANDEN[maand];
  app.querySelector("[data-uitleg]").textContent = `Bij ${m.bezoeken} strandbezoeken in ${MAANDEN[maand]} (${S.jaren[0]}–${S.jaren[1]}) schreven strandwachters van Stichting ANEMOON op wat ze vonden. Het percentage is het deel van de bezoeken waarbij ze het vonden. Het is geen voorspelling: na een storm vind je meer en andere dingen.`;
  const mijn = MIJN.lees();
  app.querySelector("[data-lijst]").innerHTML = [...m.soorten].sort((a, b) => b[1] - a[1]).filter(([, f]) => f >= 0.01).map(([k, f]) => {
    const i = S.soorten[k], naam = i.nl || i.wet, sleutel = i.slug || "smp:" + k, heeft = !!mijn[sleutel];
    const beeld = i.slug && dierBeeld[i.slug] ? `<img src="${dierBeeld[i.slug]}" alt="" loading="lazy">` : esc((naam[0] || "").toUpperCase());
    return `<li><span class="duim">${beeld}</span><span class="naam">${i.slug ? `<a href="/${i.slug}">${esc(hoofd(naam))}</a>` : esc(hoofd(naam))}<small class="mono">${esc(i.wet)}</small></span>
      <span class="vondst-rechts"><span class="balkje" aria-hidden="true"><i style="width:${Math.round(f * 100)}%"></i></span>${Math.round(f * 100)}%
      <button type="button" class="vondst-plus" data-sleutel="${sleutel}" data-naam="${esc(naam)}" aria-pressed="${heeft}" aria-label="${esc(naam)}: ${heeft ? "gevonden" : "ik heb het gevonden"}">${heeft ? "✓ gevonden" : "+"}</button></span></li>`;
  }).join("");
  for (const b of app.querySelectorAll(".vondst-plus")) b.addEventListener("click", () => {
    const aan = MIJN.wissel(b.dataset.sleutel, b.dataset.naam);
    b.setAttribute("aria-pressed", String(aan)); b.textContent = aan ? "✓ gevonden" : "+";
    b.setAttribute("aria-label", `${b.dataset.naam}: ${aan ? "gevonden" : "ik heb het gevonden"}`);
  });
}

start();
