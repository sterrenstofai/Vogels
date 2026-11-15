// Onderzoekjes met Fos: zes opdrachten met de zee. Eerst op de site, dan naar het strand, het wad of een aquarium.
// Overgenomen van Voertuigen en De Ruimte: wat heb je nodig, zo doe je het, een interactief stuk, "En dan naar buiten",
// een logboek, een stempel "Gedaan", een voortgangsbalk en een certificaat (A4-PNG). Alles in localStorage.
import * as STEM from "/js/stem.js";
import * as GETIJ from "/js/getij.js";
import { dieren, esc, hoofd, kaal, MAANDEN } from "/js/data.js";

const SLEUTEL = "zeezicht-onderzoekjes";
const lees = () => { try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; } };
const schrijf = (lb) => { try { localStorage.setItem(SLEUTEL, JSON.stringify(lb)); } catch {} };
const bewaar = (slug, veld, w) => { const lb = lees(); lb[slug] = { ...(lb[slug] || {}), [veld]: w }; schrijf(lb); };
const vandaag = () => { const d = new Date(); return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`; };

const OZ = [
  { slug: "schelpen-zoeken", titel: "Schelpen zoeken", kort: "Leer vijf schelpen herkennen op de site. Welke vind je aan het strand?",
    nodig: ["Een emmertje of een zakje", "Laarzen of blote voeten (niet in het water zonder volwassene)", "Een volwassene"],
    stappen: ["Speel het spel op de site: welke schelp is het?", "Ga naar het strand en loop langs de vloedlijn: de streep met schelpen en wier.", "Tel welke schelpen je vindt. Tik op de plus bij elke schelp."],
    zelf: ["Welke schelp vond je het meest?", "Vind je een schelp met een gaatje? Daar heeft een slak een gat in geboord.", "Lege schelpen mag je meenemen. Levende dieren zet je terug."] },
  { slug: "wat-spoelt-er-aan", titel: "Wat spoelt er aan?", kort: "Na een storm of bij eb langs de vloedlijn lopen. Wat vind je allemaal?",
    nodig: ["Laarzen", "Een volwassene", "Na een storm vind je het meest"],
    stappen: ["Kijk op de site wat er deze maand vaak aanspoelt.", "Loop langs de vloedlijn en zoek. Raak kwallen niet aan: sommige steken, ook op het strand.", "Vink af wat je vond."],
    zelf: ["Vind je een zwart zakje met vier puntjes? Dat is een eikapsel van een rog: een nixenbeurs.", "Zie je een kwal? Kijk goed, maar raak hem niet aan.", "Ligt er een zeehond op het strand? Blijf minstens 30 meter weg."] },
  { slug: "drijft-een-ei", titel: "Drijft een ei?", kort: "Een ei in kraanwater en in zout water. Wat gebeurt er?",
    nodig: ["Twee glazen of potten", "Een rauw ei", "Zout en een lepel", "Een volwassene"],
    stappen: ["Probeer het eerst op de site: doe zout in het water.", "Vul twee glazen met kraanwater. Doe in één glas veel zout en roer tot het weg is.", "Leg het ei voorzichtig in het gewone water, en daarna in het zoute water."],
    zelf: ["In welk glas zinkt het ei, en in welk glas drijft het?", "Zeewater is zout. Drijf jij makkelijker in zee dan in het zwembad?", "Proef een heel klein beetje zeewater (bij het strand, met een volwassene). Hoe smaakt het?"] },
  { slug: "eb-en-vloed", titel: "Eb en vloed", kort: "De site zegt wanneer het eb en vloed is. Komt het water dichterbij?",
    nodig: ["Een strand of een dijk aan het wad", "Een steentje of een stokje", "Een klok of telefoon", "Een volwassene"],
    stappen: ["Kies op de site je strand en kijk wanneer het hoogwater en laagwater is.", "Leg op het strand een steentje net boven de waterlijn. Blijf zelf op het droge.", "Wacht een uur. Waar is het water nu?"],
    zelf: ["Ligt het steentje nu in het water, of is het water verder weg?", "Klopt dat met wat de site zei?", "Wadlopen doe je alleen met een gids: het water komt snel terug."] },
  { slug: "hoe-groot-is-een-walvis", titel: "Hoe groot is een walvis?", kort: "Zet de walvis op schaal in de tuin of op het strand. Hoeveel stappen is dat?",
    nodig: ["Een tuin, een plein of een strand", "Je eigen voeten", "Een touw (als je wilt)"],
    stappen: ["Kies op de site een walvis en vul in hoe lang jouw stap is.", "De site rekent uit hoeveel stappen de walvis lang is.", "Zet buiten een steen neer, loop het aantal stappen en zet daar weer een steen."],
    zelf: ["Ga tussen de twee stenen liggen. Hoeveel kinderen passen erin?", "Hoeveel stappen is een bruinvis? En een blauwe vinvis?", "Leg een touw van steen tot steen: zo lang is de walvis."] },
  { slug: "garnalen-kijken", titel: "Garnalen kijken", kort: "Bij eb in een poeltje kijken met een schepnetje. Of naar een aquarium.",
    nodig: ["Een schepnetje en een emmertje met zeewater", "Laarzen", "Een volwassene, altijd", "Of: een bezoek aan een aquarium of zeehondencentrum"],
    stappen: ["Kijk op de site wanneer het laagwater is.", "Zoek bij eb een poeltje. Schep voorzichtig door het zand en het wier.", "Kijk in het emmertje wat je vond, tel het, en zet alles terug waar je het vond."],
    zelf: ["Hoeveel garnalen zag je? Ze zijn bijna doorzichtig.", "Vond je een krabbetje? Kijk hoe hij zijwaarts loopt.", "Zet alles terug, in het water waar je het vond."] },
];

const app = document.getElementById("app");
const pad = location.pathname.replace(/\/$/, "").split("/").filter(Boolean);
let DIER = [];

async function start() {
  DIER = await dieren();
  if (pad[1] && een(pad[1])) return;
  overzicht();
}

function aantalKlaar(lb) { return OZ.filter((o) => lb[o.slug]?.klaar).length; }
function voortgang(lb, hier = null) {
  const n = aantalKlaar(lb);
  return `<div class="oz-voortgang" role="progressbar" aria-label="Voortgang" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${n}">
    <ol>${OZ.map((o) => `<li class="${lb[o.slug]?.klaar ? "klaar" : ""}${o.slug === hier ? " hier" : ""}" title="${esc(o.titel)}"></li>`).join("")}</ol>
    <p>${n === 6 ? "Alle zes gedaan. Tijd voor je certificaat!" : `${n} van de 6 gedaan`}</p></div>`;
}

function overzicht() {
  const lb = lees();
  document.title = "Onderzoekjes met Fos · Zeezicht";
  app.innerHTML = `
    <p class="etiket">Samen op onderzoek</p>
    <h1>Onderzoekjes met <span class="accent">Fos</span></h1>
    <p class="inleiding">Zes opdrachten met de zee. Eerst kijken en tellen op de site, dan naar het strand, het wad of een aquarium. Altijd samen met een volwassene. Ga je dicht bij het water, doe dan een zwemvest aan.</p>
    ${voortgang(lb)}
    <div class="oz-lijst">${OZ.map((o, i) => `<a class="oz-kaart" href="/onderzoekjes/${o.slug}"><span class="oz-nummer">${i + 1}</span><span><strong>${esc(o.titel)}</strong><span>${esc(o.kort)}</span></span>${lb[o.slug]?.klaar ? `<span class="oz-stempel klein">Gedaan</span>` : `<span class="oz-pijl" aria-hidden="true">→</span>`}</a>`).join("")}</div>
    ${certificaat(lb)}
    ${OZ.some((o) => lb[o.slug]) ? `<div class="oz-opnieuw"><button type="button" class="knop licht" data-opnieuw>Opnieuw beginnen</button><span class="oz-vraag" hidden>Alle stempels en logboeken gaan weg. Zeker weten? <button type="button" class="knop" data-ja>Ja</button> <button type="button" class="knop licht" data-nee>Nee</button></span></div>` : ""}
    <p class="zacht fijn">Wat je invult en de naam op het certificaat blijven op dit apparaat. Het gaat niet naar ons of naar iemand anders.</p>`;
  const o = app.querySelector("[data-opnieuw]");
  if (o) {
    const v = app.querySelector(".oz-vraag");
    o.addEventListener("click", () => { v.hidden = false; o.hidden = true; });
    app.querySelector("[data-nee]").addEventListener("click", () => { v.hidden = true; o.hidden = false; });
    app.querySelector("[data-ja]").addEventListener("click", () => { const naam = lees()._naam; schrijf(naam ? { _naam: naam } : {}); overzicht(); });
  }
  bindCertificaat();
}

function een(slug) {
  const i = OZ.findIndex((o) => o.slug === slug);
  if (i < 0) return false;
  const o = OZ[i], lb = lees()[slug] || {};
  document.title = `${o.titel} · Onderzoekjes · Zeezicht`;
  app.innerHTML = `
    <a class="terug" href="/onderzoekjes">← Alle onderzoekjes</a>
    <p class="etiket">Onderzoekje ${i + 1} van 6</p>
    <h1>${esc(o.titel)}</h1>
    <p class="inleiding">${esc(o.kort)}</p>
    ${voortgang(lees(), slug)}
    <div class="oz-twee"><div class="oz-blok"><h2>Wat heb je nodig?</h2><ul>${o.nodig.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>
      <div class="oz-blok"><h2>Zo doe je het</h2><ol>${o.stappen.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div></div>
    <section class="oz-werk" aria-live="polite"></section>
    <div class="oz-buiten"><h2>En dan naar buiten</h2><ul>${o.zelf.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>
    <section class="oz-logboek"><h2>Logboek</h2>
      <label><span class="mono">Wat ontdekte je?</span><textarea id="notitie" rows="4" placeholder="Schrijf, of laat iemand voor je schrijven…">${esc(lb.notitie || "")}</textarea></label>
      <div class="oz-klaar">${lb.klaar ? `<span class="oz-stempel">Gedaan<small>${esc(lb.klaar)}</small></span>` : `<button type="button" class="knop" data-klaar>Klaar! Zet de stempel</button>`}</div>
      ${OZ[i + 1] ? `<p><a class="knop licht" href="/onderzoekjes/${OZ[i + 1].slug}">Volgend onderzoekje: ${esc(OZ[i + 1].titel)}</a></p>` : `<p><a class="knop licht" href="/onderzoekjes">Naar alle onderzoekjes</a></p>`}
    </section>`;
  app.querySelector("#notitie").addEventListener("input", (e) => bewaar(slug, "notitie", e.target.value));
  app.querySelector("[data-klaar]")?.addEventListener("click", () => {
    const t = vandaag(); bewaar(slug, "klaar", t); STEM.klik();
    const alles = aantalKlaar(lees()) === 6;
    app.querySelector(".oz-klaar").innerHTML = `<span class="oz-stempel nieuw">Gedaan<small>${t}</small></span>${alles ? ` <a class="knop" href="/onderzoekjes#certificaat">Alles gedaan! Haal je certificaat</a>` : ""}`;
    app.querySelector(".oz-voortgang").outerHTML = voortgang(lees(), slug);
  });
  ({ "schelpen-zoeken": schelpen, "wat-spoelt-er-aan": spoelt, "drijft-een-ei": ei, "eb-en-vloed": eb, "hoe-groot-is-een-walvis": walvis, "garnalen-kijken": garnalen })[slug](app.querySelector(".oz-werk"), slug);
  return true;
}

/* ---------- de interactieve stukken ---------- */
const dier = (s) => DIER.find((d) => d.slug === s);

// tellijst: plaatjes met een plus en een min, bewaard per onderzoekje
function tellijst(werk, slug, items, kop) {
  const tel = lees()[slug]?.telling || {};
  werk.insertAdjacentHTML("beforeend", `<h2>${esc(kop)}</h2><div class="oz-tellen">${items.map(([k, naam, beeld]) => `<div class="oz-tel">${beeld ? `<img src="${beeld}" alt="" loading="lazy">` : '<span></span>'}<span>${esc(hoofd(naam))}</span><span class="oz-knoppen"><button type="button" data-min="${k}" aria-label="${esc(naam)}: één minder">−</button><output data-n="${k}">${tel[k] || 0}</output><button type="button" data-plus="${k}" aria-label="${esc(naam)}: één meer">+</button></span></div>`).join("")}</div>`);
  werk.addEventListener("click", (e) => {
    const b = e.target.closest("[data-plus],[data-min]"); if (!b) return;
    const k = b.dataset.plus || b.dataset.min, t = lees()[slug]?.telling || {};
    t[k] = Math.max(0, (t[k] || 0) + (b.dataset.plus ? 1 : -1)); bewaar(slug, "telling", t); STEM.klik();
    werk.querySelector(`[data-n="${k}"]`).textContent = t[k];
  });
}

function schelpen(werk, slug) {
  const SCHELP = ["kokkel", "mossel", "zwaardschede", "nonnetje", "wulk"].map(dier).filter((d) => d && d.klein);
  let vraag = 0, goed = 0;
  const volgorde = [...SCHELP].sort(() => Math.random() - 0.5);
  const teken = () => {
    if (vraag >= volgorde.length) {
      werk.innerHTML = `<h2>Welke schelp is het?</h2><p class="oz-uitkomst">${goed} van de ${volgorde.length} goed${goed === volgorde.length ? ". Je bent een echte schelpenkenner." : "."}</p><p><button type="button" class="knop licht" data-opnieuw>Nog een keer</button></p>`;
      werk.querySelector("[data-opnieuw]").addEventListener("click", () => { vraag = goed = 0; volgorde.sort(() => Math.random() - 0.5); teken(); });
      tellijst(werk, slug, SCHELP.map((d) => [d.slug, kaal(d.naam), d.klein]), "Tel aan het strand");
      return;
    }
    const d = volgorde[vraag];
    werk.innerHTML = `<h2>Welke schelp is het? <span class="mono zacht">${vraag + 1}/${volgorde.length}</span></h2>
      <div class="oz-quiz"><img src="${d.beeld}" alt="Een schelp: welke is het?" style="width:100%;max-height:300px;object-fit:contain;background:var(--vlak);border-radius:14px">
      <div class="oz-keuzes">${[...SCHELP].sort((a, b) => a.naam.localeCompare(b.naam)).map((x) => `<button type="button" class="oz-keuze" data-s="${x.slug}">${esc(hoofd(kaal(x.naam)))}</button>`).join("")}</div>
      <p class="oz-uitleg" aria-live="polite"></p></div>`;
    for (const b of werk.querySelectorAll(".oz-keuze")) b.addEventListener("click", () => {
      const ok = b.dataset.s === d.slug;
      if (ok) goed++;
      for (const x of werk.querySelectorAll(".oz-keuze")) { x.disabled = true; if (x.dataset.s === d.slug) x.classList.add("goed"); else if (x === b) x.classList.add("fout"); }
      STEM.zeg(ok ? `Goed! Dat is ${d.naam}.` : `Het is ${d.naam}.`, { kind: true });
      werk.querySelector(".oz-uitleg").innerHTML = `${ok ? "Goed!" : "Bijna."} Dit is ${esc(d.naam)}. <button type="button" class="knop" data-verder>Volgende</button>`;
      werk.querySelector("[data-verder]").addEventListener("click", () => { vraag++; teken(); });
    });
  };
  teken();
}

async function spoelt(werk, slug) {
  const s = await fetch("/data/strand.json").then((r) => r.json()), m = new Date().getMonth();
  const top = [...s.maanden[String(m + 1)].soorten].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const items = top.map(([k]) => { const i = s.soorten[k]; return [k, i.nl || i.wet, i.slug ? dier(i.slug)?.klein : null]; });
  items.push(["eikapsel", "eikapsel van een rog (nixenbeurs)", dier("stekelrog")?.klein]);
  werk.innerHTML = `<p>Dit vonden strandwachters van Stichting ANEMOON het vaakst in ${MAANDEN[m]}. Meer op de <a href="/strand">strandpagina</a>.</p>`;
  tellijst(werk, slug, items, `Wat vond jij in ${MAANDEN[m]}?`);
}

function ei(werk) {
  // simulatie: een ei zinkt in kraanwater en gaat drijven als er genoeg zout in het water zit
  let lepels = 0;
  const teken = () => {
    const zout = lepels * 6;                       // een volle theelepel zout is ongeveer 6 gram
    const perLiter = zout * 4;                     // in een glas van 250 ml
    const zweeft = perLiter >= 60, half = perLiter >= 35 && !zweeft;
    const y = zweeft ? 60 : half ? 120 : 175;
    werk.innerHTML = `<h2>Probeer het op de site <span class="label">simulatie</span></h2>
      <div class="oz-spel" style="display:grid;gap:1rem;align-items:center;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))">
        <svg class="oz-ei" viewBox="0 0 220 230" role="img" aria-label="Een glas water met een ei, ${zweeft ? "het ei drijft" : half ? "het ei zweeft" : "het ei ligt op de bodem"}">
          <path d="M40 20 L52 215 Q110 225 168 215 L180 20" fill="none" stroke="#1E1E1E" stroke-width="3"/>
          <path d="M44 50 L52 213 Q110 223 168 213 L176 50 Z" fill="#DDF0F6"/>
          <ellipse cx="110" cy="${y}" rx="24" ry="31" fill="#F6EAD7" stroke="#1E1E1E" stroke-width="2.5"/>
          ${Array.from({ length: Math.min(lepels, 8) * 6 }, (_, k) => `<circle cx="${60 + ((k * 37) % 100)}" cy="${206 - ((k * 13) % 14)}" r="1.6" fill="#fff" stroke="#1E1E1E" stroke-width=".6"/>`).join("")}
        </svg>
        <div><p class="oz-uitkomst">${lepels} ${lepels === 1 ? "lepel" : "lepels"} zout</p>
          <div class="oz-knoppen"><button type="button" data-min aria-label="Een lepel minder">−</button><button type="button" data-plus aria-label="Een lepel zout erbij">+</button></div>
          <p>${zweeft ? "Het ei drijft!" : half ? "Het ei komt los van de bodem." : "Het ei ligt op de bodem."}</p>
          <p class="noot">Een tekening, geen proef: hoeveel zout er nodig is, hangt af van het ei. Probeer het echt, met een volwassene. Zeewater is zout; in een emmer van 10 liter Noordzeewater zit ongeveer 300 tot 350 gram zout.</p></div>
      </div>`;
    werk.querySelector("[data-plus]").addEventListener("click", () => { lepels = Math.min(12, lepels + 1); STEM.klik(); teken(); });
    werk.querySelector("[data-min]").addEventListener("click", () => { lepels = Math.max(0, lepels - 1); teken(); });
  };
  teken();
}

async function eb(werk) {
  const st = await GETIJ.stations();
  const teken = async (code) => {
    const r = await GETIJ.reeks(code), info = st.stations.find((s) => s.code === code), nu = new Date();
    const k = GETIJ.komend(r, 4), stand = GETIJ.nuStand(r);
    const p = GETIJ.curve(r, nu, new Date(+nu + 36e5), 2), verschil = p.length === 3 ? Math.round(p[2][1] - p[0][1]) : null;
    werk.innerHTML = `<h2>Eb en vloed bij ${esc(info.naam)}</h2>
      <div class="station-kies"><label class="sr" for="oz-station">Kies een strand</label><select id="oz-station">${st.stations.map((s) => `<option value="${s.code}"${s.code === code ? " selected" : ""}>${esc(s.naam)}</option>`).join("")}</select></div>
      ${stand ? `<p class="oz-uitkomst">${stand.stijgt ? "Het water komt op" : "Het water gaat terug"}.</p>` : ""}
      ${verschil != null ? `<p>Het komende uur ${verschil > 0 ? "stijgt" : "zakt"} het water volgens de voorspelling ongeveer <b>${Math.abs(verschil)} cm</b>. Op een vlak strand is dat vaak een paar meter verder of dichterbij.</p>` : ""}
      <ul>${k.map((x) => `<li>${x.hoog ? "Hoogwater" : "Laagwater"}: ${GETIJ.dag(x.t)}, ${GETIJ.uur(x.t)}</li>`).join("")}</ul>
      <p class="noot">Een voorspelling van Rijkswaterstaat, zonder wind. De centimeters per uur komen uit een tekening tussen hoog en laag, geen meting. <a href="/strand#getij">Meer over het getij</a></p>`;
    werk.querySelector("#oz-station").addEventListener("change", (e) => { GETIJ.kies(e.target.value); teken(e.target.value); });
  };
  teken(GETIJ.gekozen());
}

function walvis(werk, slug) {
  const keus = ["bruinvis", "orka", "bultrug", "potvis", "blauwe-vinvis"].map(dier).filter((d) => d && d.lengte_cm);
  let kies = lees()[slug]?.dier || (keus.find((d) => d.slug === "bultrug") || keus[0])?.slug;
  let stap = lees()[slug]?.stap || 40;
  if (!keus.length) { werk.innerHTML = "<p>De lengtes zijn nog niet nagekeken.</p>"; return; }
  const teken = () => {
    const d = dier(kies), n = Math.round(d.lengte_cm / stap);
    werk.innerHTML = `<h2>Hoe groot is ${esc(d.naam)}?</h2>
      <div class="chips" role="group" aria-label="Kies een dier">${keus.map((x) => `<button type="button" class="chip" data-d="${x.slug}" aria-pressed="${x.slug === kies}">${esc(hoofd(kaal(x.naam)))}</button>`).join("")}</div>
      <label class="oz-schuif"><span>Hoe lang is jouw stap? <b>${stap} cm</b> (een kind van vier zet stappen van ongeveer 30 tot 45 cm)</span><input type="range" min="25" max="90" step="1" value="${stap}" data-stap></label>
      <p class="oz-uitkomst">${esc(hoofd(d.naam))} is ongeveer ${(d.lengte_cm / 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} meter: dat zijn <span class="accent">${n} stappen</span>.</p>
      <p class="noot">De lengte komt uit een <a href="/${d.slug}#weetjes">weetje</a> dat we bij de bron nakijken. Het is de lengte van een groot, volwassen dier.</p>`;
    for (const b of werk.querySelectorAll("[data-d]")) b.addEventListener("click", () => { kies = b.dataset.d; bewaar(slug, "dier", kies); STEM.klik(); teken(); });
    werk.querySelector("[data-stap]").addEventListener("change", (e) => { stap = +e.target.value; bewaar(slug, "stap", stap); teken(); });
    werk.querySelector("[data-stap]").addEventListener("input", (e) => { werk.querySelector(".oz-schuif b").textContent = e.target.value + " cm"; });
  };
  teken();
}

function garnalen(werk, slug) {
  const items = ["garnaal", "strandkrab", "zeester", "alikruik", "heremietkreeft", "kokkel"].map(dier).filter(Boolean).map((d) => [d.slug, kaal(d.naam), d.klein]);
  werk.innerHTML = `<p>Tel wat je in het poeltje of in het emmertje ziet. Zet daarna alles terug waar je het vond.</p>`;
  tellijst(werk, slug, items, "Wat zag je?");
}

/* ---------- certificaat ---------- */
function certificaat(lb) {
  const n = aantalKlaar(lb);
  if (n < 6) return `<div class="oz-cert dicht" id="certificaat"><div><h2>Certificaat</h2><p>Zet bij alle zes de stempel, dan krijg je hier een certificaat met je naam. Om te printen en op te hangen.</p></div><span class="oz-slot">${6 - n}</span></div>`;
  return `<div class="oz-cert" id="certificaat"><div><h2>Je certificaat</h2><p>Alle onderzoekjes zijn gedaan. Vul de naam in en download het certificaat.</p>
    <label><span class="mono">Naam</span><input type="text" id="naam" maxlength="40" autocomplete="off" value="${esc(lb._naam || "")}" placeholder="Bijvoorbeeld Fos"></label>
    <p><button type="button" class="knop" data-cert>Download certificaat</button></p></div><canvas class="oz-cert-voorbeeld" width="1240" height="877" aria-label="Voorbeeld van het certificaat"></canvas></div>`;
}
function bindCertificaat() {
  const knop = app.querySelector("[data-cert]"); if (!knop) return;
  const veld = app.querySelector("#naam"), vb = app.querySelector(".oz-cert-voorbeeld");
  const ververs = () => tekenCert(vb, veld.value.trim() || "Fos");
  veld.addEventListener("input", () => { const lb = lees(); lb._naam = veld.value; schrijf(lb); ververs(); });
  ververs();
  knop.addEventListener("click", async () => {
    const naam = veld.value.trim(); if (!naam) { veld.focus(); return; }
    const d = document.createElement("canvas"); d.width = 3508; d.height = 2480; await tekenCert(d, naam);
    d.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `certificaat-zeeonderzoeker-${naam.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "fos"}.png`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, "image/png");
  });
}
async function tekenCert(doek, naam) {
  await Promise.all([document.fonts.load('500 100px "Geist"'), document.fonts.load('400 40px "Geist Mono"')]).catch(() => {});
  const W = doek.width, H = doek.height, u = W / 1000, c = doek.getContext("2d"), inkt = "#1E1E1E", zee = "#9FD6E8", zacht = "#5F5D58";
  c.fillStyle = "#F1EEE8"; c.fillRect(0, 0, W, H);
  c.strokeStyle = inkt; c.lineWidth = 1.2 * u; c.strokeRect(30 * u, 30 * u, W - 60 * u, H - 60 * u);
  const x = 70 * u, label = (t, lx, ly, k = inkt) => { c.fillStyle = k; c.font = `400 ${11 * u}px "Geist Mono", monospace`; c.fillText(t.toUpperCase(), lx, ly); };
  c.fillStyle = inkt; c.fillRect(x, 92 * u, 7 * u, 7 * u); label("Zeezicht · Onderzoekjes met Fos", x + 16 * u, 99 * u);
  c.font = `500 ${80 * u}px "Geist", sans-serif`; c.fillText("Certificaat", x - 4 * u, 195 * u);
  label("Dit certificaat is voor", x, 262 * u, zacht);
  let maat = 92; do { c.font = `500 ${maat * u}px "Geist", sans-serif`; maat -= 4; } while (c.measureText(naam).width > 430 * u && maat > 30);
  const nb = c.measureText(naam).width;
  c.fillStyle = zee; c.fillRect(x - 6 * u, 352 * u - maat * 0.85 * u, nb + 12 * u, maat * 1.05 * u);
  c.fillStyle = inkt; c.fillText(naam, x, 352 * u);
  c.font = `400 ${18 * u}px "Geist", sans-serif`;
  ["heeft als echte zeeonderzoeker alle zes", "onderzoekjes gedaan: schelpen, de vloedlijn, een ei,", "eb en vloed, een walvis en garnalen."].forEach((r, i) => c.fillText(r, x, 420 * u + i * 26 * u));
  OZ.forEach((o, i) => { const bx = x + (i % 2) * 225 * u, by = 530 * u + Math.floor(i / 2) * 42 * u; c.font = `500 ${20 * u}px "Geist", sans-serif`; c.fillText(String(i + 1), bx, by); c.font = `400 ${13 * u}px "Geist", sans-serif`; c.fillText(o.titel, bx + 26 * u, by - 3 * u); });
  // golven en een vis in lijnen, rechts
  c.strokeStyle = inkt; c.lineWidth = 2.2 * u; c.lineCap = "round";
  for (let r = 0; r < 3; r++) { c.beginPath(); for (let k = 0; k <= 40; k++) { const gx = W * 0.56 + k * 9 * u, gy = H * 0.66 + r * 26 * u + Math.sin(k / 2.5) * 6 * u; k ? c.lineTo(gx, gy) : c.moveTo(gx, gy); } c.stroke(); }
  const fx = W * 0.68, fy = H * 0.42, s = 90 * u;
  c.beginPath(); c.moveTo(fx - s, fy); c.bezierCurveTo(fx - s * 0.4, fy - s * 0.7, fx + s * 0.5, fy - s * 0.6, fx + s * 0.8, fy); c.bezierCurveTo(fx + s * 0.5, fy + s * 0.6, fx - s * 0.4, fy + s * 0.7, fx - s, fy); c.stroke();
  c.beginPath(); c.moveTo(fx + s * 0.8, fy); c.lineTo(fx + s * 1.25, fy - s * 0.4); c.lineTo(fx + s * 1.25, fy + s * 0.4); c.closePath(); c.stroke();
  c.beginPath(); c.arc(fx - s * 0.55, fy - s * 0.08, 5 * u, 0, Math.PI * 2); c.fillStyle = inkt; c.fill();
  c.save(); c.translate(W - 150 * u, H - 140 * u); c.rotate(-0.12); c.fillStyle = zee; c.beginPath(); c.arc(0, 0, 62 * u, 0, Math.PI * 2); c.fill(); c.lineWidth = 2.5 * u; c.stroke(); c.textAlign = "center"; c.fillStyle = inkt; c.font = `600 ${22 * u}px "Geist", sans-serif`; c.fillText("Gedaan", 0, 8 * u); c.restore(); c.textAlign = "left";
  label(`${vandaag()} · Zeezicht`, x, H - 52 * u, zacht);
}

start();
