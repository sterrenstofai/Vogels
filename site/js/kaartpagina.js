// Kaartpagina: "Twente in vogels", een simulatie op een donkere kaart.
import * as D from "./data.js";
import * as G from "./geluid.js";
import { Simulatie, KLEUREN, GROEPNAMEN } from "./simulatie.js";
import { MAANDNAMEN, lidwoord } from "./config.js";

const SCHAAL = 20; // meldingen per stip
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const getal = (n) => n.toLocaleString("nl-NL");

let sim = null, groepTimer = null;
export function verlaatKaart() {
  sim?.stop(); sim = null;
  clearInterval(groepTimer);
  document.body.classList.remove("kaartmodus");
}

const datumKort = (d) => { const [, m, dag] = d.split("-").map(Number); return `${dag} ${MAANDNAMEN[m - 1]}`; };
const klein = (t) => (t.startsWith("IJ") ? "ij" + t.slice(2) : t.charAt(0).toLowerCase() + t.slice(1));

export async function kaartPagina(app, toestand, opties = {}) {
  const [S, V, K, B, NU] = await Promise.all([D.soorten(), D.vakken(), D.kaart(), D.laad("/data/basiskaart.json"), D.laad("/data/nu.json").catch(() => null)]);
  document.body.classList.add("kaartmodus");
  const vanAdres = toestand.adres;
  const vanVak = opties.vak || (vanAdres ? D.vakVan(vanAdres.lat, vanAdres.lon) : toestand.laatsteVak);
  const vanSoort = opties.soort && S[opties.soort] ? opties.soort : null;
  let herkomst = null;

  app.innerHTML = `
  <section class="sim" aria-label="Simulatiekaart van Twente">
    <div class="sim-labels" aria-hidden="true"></div>
    <div class="sim-ui sim-boven">
      <button class="sim-chip sim-info-knop" type="button" aria-expanded="false" aria-controls="sim-info"><span class="sim-stip"></span>Simulatie</button>
      ${NU ? `<div class="sim-bron" role="group" aria-label="Welke meldingen"><button type="button" data-bron="maand" aria-pressed="true">Per maand</button><button type="button" data-bron="nu" aria-pressed="false"><span class="sim-live"></span>Nu</button></div>` : ""}
      ${vanSoort ? `<span class="sim-chip sim-van"><i style="background:${KLEUREN[S[vanSoort].groep]}"></i>Je kwam van ${lidwoord(S[vanSoort].nl)} ${esc(klein(S[vanSoort].nl))}</span>` : vanAdres ? `<span class="sim-chip sim-van">Je kwam van ${esc(vanAdres.naam.split(",")[0])}</span>` : ""}
    </div>
    <div class="sim-ui sim-info" id="sim-info" hidden>
      <p><strong>Een simulatie, geen kaart van echte vogels.</strong> Welke soorten in een vak van ongeveer 4 × 6 km zitten, en in welke verhouding, komt uit de meldingen. Drukke vakken zijn wat gedempt: een paar vogelaars die elke dag tellen, maken een vak anders onleesbaar.</p>
      <p>De vogels zoeken hun eigen plek: eenden op het water, spechten in het bos, kauwen in het dorp. <em>Per maand</em> is een gemiddelde over vijf jaar. <em>Nu</em> zijn de meldingen van de laatste twee weken${NU ? `, ${datumKort(NU.van)} tot en met ${datumKort(NU.tot)}` : ""}.</p>
      <p><a href="/hoe-dit-werkt#simulatie">Meer in Hoe dit werkt</a></p>
    </div>
    <p class="sim-ui sim-hint" aria-hidden="true">Sleep · knijp om te zoomen · tik op een stip</p>
    <div class="sim-ui sim-knoppen">
      <button class="knop-icoon" type="button" data-zoom="1.6" aria-label="Inzoomen">+</button>
      <button class="knop-icoon" type="button" data-zoom="0.625" aria-label="Uitzoomen">−</button>
      <button class="knop-icoon" type="button" data-kantel aria-label="Kantel de kaart" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17l3-10h8l3 10z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
    </div>
    <div class="sim-ui sim-paneel">
      <div class="sim-kaartje" hidden></div>
      <div class="sim-tijd">
        <button class="knop-speel" type="button" aria-label="Speel het jaar af" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="ico-speel" d="M8 5l11 7-11 7z"/><path class="ico-pauze" d="M8 5v14M16 5v14"/></svg></button>
        <div class="sim-maand"><span class="sim-maandnaam"></span><input type="range" min="0" max="11.99" step="0.01" aria-label="Maand"></div>
      </div>
      <p class="sim-noot">Twente in een gemiddelde maand, uit vijf jaar meldingen.</p>
      <div class="sim-groepen" role="group" aria-label="Vogelgroepen"></div>
    </div>
  </section>`;

  const wrap = app.querySelector(".sim");
  setTimeout(() => wrap.querySelector(".sim-hint")?.classList.add("weg"), 6000);
  const labelLaag = wrap.querySelector(".sim-labels");
  const kaartje = wrap.querySelector(".sim-kaartje");
  const schuif = wrap.querySelector('input[type="range"]');
  const maandNaam = wrap.querySelector(".sim-maandnaam");
  const speelKnop = wrap.querySelector(".knop-speel");
  const groepen = wrap.querySelector(".sim-groepen");
  const soortMet = (k) => ({ key: k, ...S[k] });

  verlaatKaart();
  document.body.classList.add("kaartmodus");
  sim = new Simulatie(wrap, {
    vakken: V, soorten: S, basis: B, kaart: K, nu: NU, schaal: SCHAAL,
    opTik: (stip, vak) => toonKaartje(stip, vak),
    opLabels: (lijst) => {
      // labels die elkaar overlappen laten we weg
      const geplaatst = [];
      labelLaag.innerHTML = lijst.filter((l) => {
        const b = S[l.soort].nl.length * 7.5 + 34, x0 = l.x - 8, y0 = l.y - 34;
        if (geplaatst.some((p) => x0 < p[0] + p[2] && p[0] < x0 + b && y0 < p[1] + 28 && p[1] < y0 + 28)) return false;
        geplaatst.push([x0, y0, b]); return true;
      }).map((l) => `<span class="sim-label" style="transform:translate(${l.x.toFixed(0)}px,${(l.y - 14).toFixed(0)}px)"><i style="background:${KLEUREN[l.groep]}"></i>${esc(S[l.soort].nl)}</span>`).join("")
        + (herkomst && sim ? (() => { const [x, y] = sim.naarScherm(herkomst.lon, herkomst.lat); return `<span class="sim-label sim-label-van" style="transform:translate(${x.toFixed(0)}px,${(y - 24).toFixed(0)}px)">Je kwam van ${esc(herkomst.tekst)}</span>`; })() : "");
    },
  });
  sim.vakEigen = vanVak || null;
  if (vanAdres) sim.pin = { lat: vanAdres.lat, lon: vanAdres.lon };
  // openingsanimatie: van plat en ver naar schuin en dichtbij, op de plek waar je vandaan kwam
  const passend = sim.cam.z;
  let doel = { lat: 52.31, lon: 6.72, z: passend };
  if (vanVak && V[vanVak]) {
    const [la, lo] = vanVak.split(",").map(Number);
    doel = vanAdres ? { lat: vanAdres.lat, lon: vanAdres.lon, z: passend * 3.4 } : { lat: la + D.VAK / 2, lon: lo + D.VAK / 2, z: passend * 3.4 };
    if (!vanAdres) sim.pin = { lat: la + D.VAK / 2, lon: lo + D.VAK / 2 };
  }
  // het doel iets boven het midden, zodat het vrij van de maandschuif staat
  const smal = sim.vw < 600; // op een telefoon nemen kop en maandschuif meer ruimte in
  doel.lat -= (sim.vh * (doel.z > passend ? (smal ? 0.27 : 0.2) : (smal ? 0.3 : 0.16))) / doel.z;
  herkomst = sim.pin ? { ...sim.pin, tekst: vanAdres ? vanAdres.naam.split(",")[0] : vanSoort ? `${lidwoord(S[vanSoort].nl)} ${klein(S[vanSoort].nl)}` : "dit vak" } : null;
  if (vanSoort && S[vanSoort]) sim.opGeland = () => sim.zetFocus(vanSoort);
  sim.opening(doel);

  const zetMaandLabel = (m) => {
    maandNaam.textContent = MAANDNAMEN[Math.floor(m) % 12];
    schuif.value = String(m);
  };
  zetMaandLabel(sim.maand);
  sim.opMaand = zetMaandLabel;
  schuif.addEventListener("input", () => { sim.speelt = false; speelKnop.setAttribute("aria-pressed", "false"); sim.zetMaand(+schuif.value); zetMaandLabel(+schuif.value); tekenGroepen(); });
  speelKnop.addEventListener("click", () => {
    sim.speelt = !sim.speelt;
    speelKnop.setAttribute("aria-pressed", String(sim.speelt));
    speelKnop.setAttribute("aria-label", sim.speelt ? "Pauzeer" : "Speel het jaar af");
  });

  // groepen als filterchips, met het aantal stippen
  const tekenGroepen = () => {
    const tel = {};
    for (const s of sim.stippen) if (!s.weg) tel[s.groep] = (tel[s.groep] || 0) + 1;
    groepen.innerHTML = Object.keys(GROEPNAMEN).filter((g) => tel[g]).sort((a, b) => tel[b] - tel[a]).map((g) =>
      `<button type="button" class="sim-groep" data-groep="${g}" aria-pressed="${!sim.uit.has(g)}"><i style="background:${KLEUREN[g]}"></i>${GROEPNAMEN[g]} <span>${tel[g]}</span></button>`).join("");
  };
  tekenGroepen();
  groepTimer = setInterval(() => { if (sim?.speelt) tekenGroepen(); }, 1500);
  groepen.addEventListener("click", (e) => {
    const b = e.target.closest("[data-groep]"); if (!b) return;
    const uit = new Set(sim.uit);
    uit.has(b.dataset.groep) ? uit.delete(b.dataset.groep) : uit.add(b.dataset.groep);
    sim.zetGroepen(uit); tekenGroepen();
  });

  // Per maand of Nu
  const noot = wrap.querySelector(".sim-noot"), tijd = wrap.querySelector(".sim-tijd");
  wrap.querySelectorAll("[data-bron]").forEach((k) => k.addEventListener("click", () => {
    const bron = k.dataset.bron;
    wrap.querySelectorAll("[data-bron]").forEach((x) => x.setAttribute("aria-pressed", String(x === k)));
    sim.speelt = false; speelKnop.setAttribute("aria-pressed", "false");
    sim.zetBron(bron);
    wrap.classList.toggle("sim-nu", bron === "nu");
    noot.textContent = bron === "nu" ? `Meldingen van ${datumKort(NU.van)} tot en met ${datumKort(NU.tot)}: ${getal(NU.meldingen)} in heel Twente.` : "Twente in een gemiddelde maand, uit vijf jaar meldingen.";
    maandNaam.textContent = bron === "nu" ? "Nu" : MAANDNAMEN[Math.floor(sim.maand) % 12];
    kaartje.hidden = true; sim.zetFocus(null);
    tekenGroepen();
  }));

  wrap.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => sim.zoom(+b.dataset.zoom)));
  wrap.querySelector("[data-kantel]").addEventListener("click", (e) => {
    const aan = sim.pitch < 5;
    sim.zetPitch(aan ? 38 : 0);
    e.currentTarget.setAttribute("aria-pressed", String(aan));
  });
  const infoKnop = wrap.querySelector(".sim-info-knop"), info = wrap.querySelector(".sim-info");
  infoKnop.addEventListener("click", () => { info.hidden = !info.hidden; infoKnop.setAttribute("aria-expanded", String(!info.hidden)); });

  function toonKaartje(stip, vak) {
    if (!stip) { kaartje.hidden = true; sim.zetFocus(null); return; }
    const s = soortMet(stip.soort);
    sim.zetFocus(stip.soort);
    const m = Math.round(sim.maand) % 12;
    const inVak = Math.round(sim.telling(stip.vak, stip.soort, m));
    const inTwente = sim.meldingenInMaand(stip.soort);
    const t = s.zang ? "zang" : "roep";
    kaartje.innerHTML = `
      <div class="sim-kaartje-beeld">${s.plaat ? `<img src="${s.plaat.klein}" alt="" width="96" height="120">` : `<span>${esc(s.nl)}</span>`}</div>
      <div class="sim-kaartje-tekst">
        <a class="sim-kaartje-naam" href="/soort/${s.slug}" data-link>${esc(s.nl)}</a>
        <span class="wet">${esc(s.wet)}</span>
        <p>${sim.bron === "nu" ? `${getal(inVak)} meldingen in dit vak in de laatste twee weken, ${getal(inTwente)} in heel Twente.` : `${getal(inVak)} meldingen in dit vak in ${MAANDNAMEN[m]}, ${getal(inTwente)} in heel Twente (vijf jaar).`}</p>
        <div class="sim-kaartje-acties">
          ${s[t] ? `<button class="knop-pil knop-donker" type="button" data-speel="${s.key}" data-type="${t}">▶ Hoor de ${t}</button>` : ""}
          <a class="knop-pil" href="/soort/${s.slug}" data-link>Meer</a>
        </div>
      </div>
      <button class="sim-kaartje-sluit" type="button" aria-label="Sluiten">×</button>`;
    kaartje.hidden = false;
    kaartje.querySelector(".sim-kaartje-sluit").addEventListener("click", () => { kaartje.hidden = true; sim.zetFocus(null); });
  }
}
