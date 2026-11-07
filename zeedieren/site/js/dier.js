// Eén scherm per dier, zoals een soort bij Voggels: links de naam en de gegevens, in het midden een podium met tabjes
// (foto, plaat, op schaal, geluid, waar en wanneer), onderaan een strook met alle dieren, rechtsonder een kaartje.
// Daaronder de weetjes, elk met een bron en een zin die we letterlijk op de bronpagina terugvinden.
import { dieren, pad, esc, MAANDEN, MAAND_KORT, hoofd, kaal, lidwoord, PLEKKEN, naamMetAccent } from "/js/data.js";
import * as MIJN from "/js/mijn.js";
import * as G from "/js/geluid.js";

const app = document.getElementById("app");
const slug = new URLSearchParams(location.search).get("dier") || location.pathname.split("/").filter(Boolean).pop();
const maand = new Date().getMonth();
let D = null, kust = null;

const SECTIE = { uiterlijk: "Hoe ziet hij eruit", eten: "Wat eet hij", leefwijze: "Hoe leeft hij", waar: "Waar woont hij", grootte: "Hoe groot", jongen: "Jongen", bijzonder: "Bijzonder" };

async function start() {
  const [lijst, dier, k] = await Promise.all([
    dieren(),
    fetch(`/data/dier/${encodeURIComponent(slug)}.json`).then((r) => (r.ok ? r.json() : null)),
    fetch("/data/kust.json").then((r) => r.json()),
  ]);
  if (!dier) { location.replace("/404"); return; }
  D = dier; kust = k;
  document.title = `${hoofd(kaal(D.naam))} · Zeezicht`;
  tekenScherm(lijst);
}

function zin() {
  const m = MAANDEN[maand];
  if (D.strand && D.strand[maand] != null && D.strand[maand] > 0.04) {
    const p = Math.round(D.strand[maand] * 100);
    return `In ${m} vonden strandwachters van ANEMOON ${D.hem} bij ${p} van de 100 strandbezoeken.`;
  }
  const n = (D.maanden?.kust || [])[maand] || 0, tot = D.maanden?.kust?.reduce((a, b) => a + b, 0) || 0;
  if (D.plek.includes("oceaan") && tot < 200) return tot ? `${hoofd(D.hij)} komt bijna nooit langs de Nederlandse kust: ${tot} meldingen in tien jaar.` : `${hoofd(D.hij)} komt niet in de Noordzee. Je ziet ${D.hem} alleen op zee, ver weg.`;
  if (!tot) return "";
  const gem = tot / 12, keer = n / gem;
  const vergelijk = keer > 1.4 ? `, ${keer >= 1.95 ? Math.round(keer) + " keer" : "vaker dan"} zo vaak als in een gemiddelde maand` : keer < 0.6 ? ", minder dan in een gemiddelde maand" : "";
  return `In ${m} ${n.toLocaleString("nl-NL")} keer gemeld langs de Nederlandse kust (2016–2025)${vergelijk}.`;
}

function tekenScherm(lijst) {
  const metMaand = !D.plek.includes("oceaan");
  const heeft = MIJN.heeft(D.slug);
  const tabs = [
    D.foto && ["foto", "Foto"], D.plaat && ["plaat", "Plaat"], D.lengte_cm && ["schaal", "Op schaal"],
    D.geluid && ["geluid", "Geluid"], ["waar", "Waar en wanneer"],
  ].filter(Boolean);
  if (!D.foto && !D.plaat) tabs.unshift(["foto", "Foto"]);
  const gevonden = D.weetjes.filter((w) => w.gevonden);
  app.innerHTML = `
  <section class="scherm" aria-labelledby="dier-titel">
    <div class="dier-kop">
      <h1 id="dier-titel">${naamMetAccent(D.naam)}${metMaand ? ` in <span class="accent">${MAANDEN[maand]}</span>` : ""}</h1>
      <div class="dier-acties">
        <button class="knop-plus" type="button" data-mijn aria-pressed="${heeft}"><span class="rondje" aria-hidden="true">${heeft ? "✓" : "+"}</span><span>${heeft ? "Gezien" : "Ik heb hem gezien"}</span></button>
        <a class="knop-pil" href="${pad(D, true)}">Voor kinderen</a>
      </div>
      <p class="dier-zin">${esc(D.kort)} ${esc(zin())}</p>
    </div>
    <div class="podium">
      <div class="podium-vlak licht" id="podium" role="tabpanel" aria-live="polite"></div>
      <div class="tabs" role="tablist" aria-label="Wat wil je zien?">${tabs.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="false" aria-controls="podium">${t}</button>`).join("")}</div>
    </div>
    <div class="dier-gegevens">
      <dl class="gegevens">
        <dt>Soort</dt><dd class="mono">${esc(D.wet)}</dd>
        <dt>Groep</dt><dd>${esc(hoofd(D.groep))}</dd>
        <dt>Waar</dt><dd>${D.plek.map((p) => PLEKKEN[p]).join(", ")}</dd>
        ${D.lengte_tekst ? `<dt>Hoe groot</dt><dd>${esc(D.lengte_tekst)}</dd>` : ""}
        ${D.vaakst != null && metMaand ? `<dt>Het vaakst</dt><dd>${MAANDEN[D.vaakst]}</dd>` : ""}
        ${D.foto ? `<dt>Foto</dt><dd>${bron(D.foto)}</dd>` : ""}
        ${D.plaat ? `<dt>Plaat</dt><dd>${esc(D.plaat.werk || D.plaat.maker)}${D.plaat.jaar ? ", " + esc(D.plaat.jaar) : ""}</dd>` : ""}
        <dt>Weetjes</dt><dd>${gevonden.length ? `<a href="#weetjes">${gevonden.length}, nagekeken bij de bron</a>` : "nog geen"}</dd>
      </dl>
    </div>
    <a class="dier-kaartje" href="#waar" data-naar-waar aria-label="Waar en wanneer: kaart en maanden">
      <p class="etiket">${metMaand ? "Meldingen langs de kust" : "Meldingen bij Nederland"}</p>
      ${kaartSvg(true)}
      <p>${D.vakken.length ? `${D.vakken.length} vakken met meldingen` : "Geen meldingen bij Nederland"} (OBIS)</p>
    </a>
    <nav class="dier-strook" aria-label="Alle dieren"><div class="strook">${lijst.map((d) => `<a class="strook-item" href="${pad(d)}"${d.slug === D.slug ? ' aria-current="true"' : ""}><span class="strook-beeld">${d.klein ? `<img src="${d.klein}" alt="" loading="lazy" width="168" height="128">` : ""}</span><span class="strook-naam">${esc(kaal(d.naam))}</span></a>`).join("")}</div></nav>
  </section>
  <section class="breed weetjes-blok" id="weetjes" aria-labelledby="weetjes-kop">
    <div class="blok-kop"><h2 id="weetjes-kop">Weetjes over ${esc(D.naam)}</h2><span class="label">nagekeken</span></div>
    ${gevonden.length ? `<ul class="weetjes-lijst">${gevonden.map((w) => `<li><p class="etiket">${esc(SECTIE[w.sectie] || w.sectie)}</p><p>${esc(w.tekst)}</p><small>Bron: <a href="${esc(w.bron)}" rel="noopener">${esc(w.bron_titel)}</a>, Wikipedia (CC BY-SA). De zin “${esc(w.controle)}” staat op die pagina; nagekeken op ${esc(w.datum || D.nagekeken || "")}.</small></li>`).join("")}</ul>` : `<p class="noot">Voor dit dier hebben we nog geen weetjes die we bij de bron kunnen nakijken.</p>`}
    ${D.veiligheid ? `<div class="veilig"><h2>Let op</h2>${D.veiligheid.zinnen.map((z) => `<p>${esc(z)}</p>`).join("")}${D.veiligheid.bronnen.length ? `<p class="fijn">Bron: ${D.veiligheid.bronnen.map(([t, u]) => `<a href="${esc(u)}" rel="noopener">${esc(t)}</a>`).join(", ")}.</p>` : ""}</div>` : ""}
    <p class="noot">Namen en indeling: <a href="${esc(D.worms)}" rel="noopener">WoRMS</a>. Meldingen: GBIF en OBIS (zie <a href="/hoe-dit-werkt">hoe dit werkt</a>).${D.wikipedia ? ` Meer lezen: <a href="${esc(D.wikipedia)}" rel="noopener">Wikipedia</a>.` : ""}</p>
  </section>`;

  const huidig = app.querySelector(".strook-item[aria-current]");
  if (huidig) huidig.parentElement.scrollLeft = huidig.offsetLeft - huidig.parentElement.clientWidth / 2 + 42;
  const tabKnoppen = [...app.querySelectorAll("[data-tab]")];
  const kies = (k) => { for (const b of tabKnoppen) b.setAttribute("aria-selected", String(b.dataset.tab === k)); toonTab(k); };
  for (const b of tabKnoppen) b.addEventListener("click", () => kies(b.dataset.tab));
  app.querySelector(".tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabKnoppen.findIndex((b) => b.getAttribute("aria-selected") === "true"), j = (i + (e.key === "ArrowRight" ? 1 : -1) + tabKnoppen.length) % tabKnoppen.length;
    tabKnoppen[j].focus(); kies(tabKnoppen[j].dataset.tab);
  });
  app.querySelector("[data-naar-waar]").addEventListener("click", (e) => { e.preventDefault(); kies("waar"); app.querySelector(".podium").scrollIntoView({ behavior: "smooth", block: "center" }); });
  const plus = app.querySelector("[data-mijn]");
  plus.addEventListener("click", () => {
    const aan = MIJN.wissel(D.slug, D.naam);
    plus.setAttribute("aria-pressed", String(aan));
    plus.innerHTML = `<span class="rondje" aria-hidden="true">${aan ? "✓" : "+"}</span><span>${aan ? "Gezien" : "Ik heb hem gezien"}</span>`;
  });
  const start = new URLSearchParams(location.search).get("tab");
  kies(tabs.some(([k]) => k === start) ? start : tabs[0][0]);
}

function bron(b) {
  return `${esc(b.maker || "onbekend")} · <a href="${esc(b.pagina)}" rel="noopener">${esc(b.licentie)}</a>`;
}

let stopGeluid = null;
function toonTab(k) {
  const vlak = document.getElementById("podium");
  stopGeluid?.(); stopGeluid = null;
  vlak.className = "podium-vlak " + (k === "geluid" ? "donker" : "licht");
  if (k === "foto") {
    vlak.innerHTML = D.foto
      ? `<figure class="beeld"><div class="beeld-vak"><img src="${D.foto.pad}" alt="${esc(D.foto.alt || "Foto van " + D.naam)}" width="${D.foto.breed}" height="${D.foto.hoog}"></div><figcaption><span class="label">foto</span><span>${bron(D.foto)}${D.foto.waar ? " · " + esc(D.foto.waar) : ""}</span></figcaption></figure>`
      : `<div class="leeg"><strong>Geen goede foto</strong>${esc(D.foto_niet || "We vonden geen vrije foto van dit dier in het wild. Liever niets dan een foto uit een bak, een tekening die doet alsof, of een gemaakt beeld.")}</div>`;
  } else if (k === "plaat") {
    vlak.innerHTML = `<figure class="beeld plaat"><div class="beeld-vak"><img src="${D.plaat.pad}" alt="${esc("Oude plaat van " + D.naam)}" width="${D.plaat.breed}" height="${D.plaat.hoog}"></div><figcaption><span class="label">tekening</span><span>${esc(D.plaat.werk || "")}${D.plaat.jaar ? ", " + esc(D.plaat.jaar) : ""} · ${bron(D.plaat)}</span></figcaption></figure>`;
  } else if (k === "schaal") {
    tekenSchaal(vlak);
  } else if (k === "geluid") {
    tekenGeluid(vlak);
  } else if (k === "waar") {
    tekenWaar(vlak);
  }
}

/* ---------- kaart ---------- */
function kaartSvg(klein = false) {
  const [lon0, lon1, lat0, lat1] = kust.kader, B = kust.breed, H = kust.hoog;
  const max = Math.max(1, ...D.vakken.map((v) => v[2]));
  const vakken = D.vakken.map(([lon, lat, n]) => {
    const x = ((lon - lon0) / (lon1 - lon0)) * B, y = ((lat1 - lat) / (lat1 - lat0)) * H, r = (klein ? 3 : 2.2) + (klein ? 5 : 7) * Math.sqrt(Math.log10(n + 1) / Math.log10(max + 1));
    return `<circle class="vak" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" opacity="${(0.35 + 0.55 * Math.log10(n + 1) / Math.log10(max + 1)).toFixed(2)}"/>`;
  }).join("");
  return `<svg class="kaart-svg" viewBox="0 0 ${B} ${H}" role="img" aria-label="Kaart van de Nederlandse kust met ${D.vakken.length} vakken waar ${esc(D.naam)} gemeld is"><rect class="zee" width="${B}" height="${H}"/><path class="land" d="${kust.land}"/>${vakken}</svg>`;
}
function tekenWaar(vlak) {
  const m = D.maanden?.kust?.map((x, i) => x + (D.maanden.ncp?.[i] || 0)) || [];
  const max = Math.max(1, ...m), tot = m.reduce((a, b) => a + b, 0);
  const strand = D.strand && D.strand.some((x) => x > 0) ? D.strand : null;
  vlak.innerHTML = `<div class="waar"><div class="waar-binnen">
    <div>${kaartSvg()}</div>
    <div class="maanden">
      <h2>Wanneer zie je ${esc(D.hem)}?</h2>
      ${tot ? `<div class="maandstrip" aria-hidden="true">${m.map((x, i) => `<span style="height:${Math.max(2, (x / max) * 100)}%"${i === maand ? ' class="nu"' : ""}></span>`).join("")}</div>
      <div class="maandletters" aria-hidden="true">${MAAND_KORT.map((x) => `<span>${x[0]}</span>`).join("")}</div>
      <p>Meldingen per maand langs de kust en in het Nederlandse deel van de Noordzee, 2016–2025 (${tot.toLocaleString("nl-NL")} in totaal). Het zijn meldingen van mensen, geen telling: in de zomer kijken er meer mensen.</p>` : `<p>Er zijn geen meldingen langs de Nederlandse kust in 2016–2025.</p>`}
      ${strand ? `<h2>Gevonden aan het strand</h2><div class="maandstrip" aria-hidden="true">${strand.map((x, i) => `<span style="height:${Math.max(2, x * 100)}%"${i === maand ? ' class="nu"' : ""}></span>`).join("")}</div><div class="maandletters" aria-hidden="true">${MAAND_KORT.map((x) => `<span>${x[0]}</span>`).join("")}</div><p>Deel van de strandbezoeken waarbij strandwachters van Stichting ANEMOON ${esc(D.hem)} vonden, per maand (100% = elke keer), ${esc(D.strand_jaren || "1978–2021")}.</p>` : ""}
      <table class="sr"><caption>Meldingen per maand</caption><tr>${MAANDEN.map((x, i) => `<th>${x}</th><td>${m[i] || 0}</td>`).join("")}</tr></table>
    </div></div>
    <div class="beeld-voet" style="background:var(--vlak);color:var(--zacht)"><span class="label">echte meldingen</span><span>Kaart: OBIS, vakken van ongeveer 5 bij 5 km (hoe donkerder, hoe meer meldingen). Kust: Natural Earth. Meldingen per maand: GBIF.</span></div></div>`;
}

/* ---------- op schaal ---------- */
const VORM = {
  vis: "M0 50 C20 20 60 15 80 40 L100 20 L96 50 L100 80 L80 60 C60 85 20 80 0 50Z",
  walvis: "M0 55 C10 30 50 22 80 36 L92 26 L100 22 L96 40 L100 56 L90 50 C70 70 30 76 8 66 Z",
  zeehond: "M0 62 C6 44 22 38 40 42 C60 46 78 48 92 58 L100 54 L98 66 L100 76 L88 70 C60 80 20 80 0 62Z",
  schelp: "M10 80 C0 40 30 10 50 10 C70 10 100 40 90 80 Z",
  slak: "M20 85 C5 60 25 25 50 20 C80 15 95 45 80 70 C70 85 45 90 20 85Z",
  krab: "M15 55 C15 35 85 35 85 55 C85 70 15 70 15 55Z M10 45 L0 30 M90 45 L100 30 M20 65 L8 80 M80 65 L92 80",
  ster: "M50 0 L60 38 L100 38 L68 60 L80 100 L50 76 L20 100 L32 60 L0 38 L40 38Z",
  kwal: "M5 45 C5 10 95 10 95 45 Z M20 45 L18 95 M40 45 L42 90 M60 45 L58 95 M80 45 L82 88",
  worm: "M0 55 C15 35 30 75 45 55 C60 35 75 75 90 55 L100 52",
  inktvis: "M30 10 C10 10 10 50 30 55 L70 55 C90 50 90 10 70 10Z M30 55 L20 95 M42 55 L38 98 M58 55 L62 98 M70 55 L80 95",
  rog: "M50 10 L100 45 L55 60 L52 100 L48 100 L45 60 L0 45Z",
  garnaal: "M5 55 C20 25 70 25 90 45 L100 40 M90 45 C70 70 30 75 15 70",
};
const GROEPVORM = { "schelpen en slakken": "schelp", "krabben en garnalen": "krab", "zeesterren en zee-egels": "ster", kwallen: "kwal", wormen: "worm", inktvissen: "inktvis", vissen: "vis", "haaien en roggen": "vis", zeezoogdieren: "walvis" };
function vormVan() {
  if (D.vorm) return D.vorm;
  if (/zeehond/.test(D.slug)) return "zeehond";
  if (/rog/.test(D.slug)) return "rog";
  if (D.slug === "garnaal") return "garnaal";
  if (/wulk|alikruik/.test(D.slug)) return "slak";
  return GROEPVORM[D.groep] || "vis";
}
const KIND = 105; // cm: een kind van vier, ongeveer
function tekenSchaal(vlak, keuze) {
  const L = D.lengte_cm;
  const opties = L < 30 ? ["hand", "kind"] : L > 400 ? ["kind", "bus"] : ["kind", "hand"];
  keuze ||= opties[0];
  const ref = { hand: { cm: 18, naam: "een hand van een volwassene (ongeveer 18 cm)" }, kind: { cm: KIND, naam: "een kind van vier (ongeveer 1,05 m)" }, bus: { cm: 1200, naam: "een bus (ongeveer 12 m)" } }[keuze];
  const breedte = Math.max(L, keuze === "bus" ? ref.cm : ref.cm * 0.5) * 1.25, schaal = 900 / breedte;
  const vorm = vormVan(), dierB = L * schaal, dierH = Math.max(8, dierB * (["ster", "schelp", "krab", "kwal", "slak"].includes(vorm) ? 0.95 : vorm === "worm" ? 0.25 : 0.42));
  const grond = 360, x0 = 60;
  const refB = ref.cm * schaal;
  let refSvg = "";
  if (keuze === "kind") {
    const h = refB, b = h * 0.32, x = x0 + dierB + 60;
    refSvg = `<g transform="translate(${x} ${grond - h}) scale(${b / 32} ${h / 100})"><circle class="vergelijk" cx="16" cy="9" r="8"/><path class="vergelijk" d="M16 17 V60 M16 60 L6 100 M16 60 L26 100 M16 28 L2 50 M16 28 L30 50"/></g>`;
    refSvg += `<text x="${x + b / 2}" y="${grond - h - 10}" text-anchor="middle">kind</text>`;
  } else if (keuze === "hand") {
    const h = refB, x = x0 + dierB + 50;
    refSvg = `<g transform="translate(${x} ${grond - h}) scale(${h / 100})"><path class="vergelijk" d="M20 100 L20 55 L8 35 C5 30 12 26 15 31 L22 42 L22 8 C22 3 30 3 30 8 L30 40 L32 2 C32 -3 40 -3 40 2 L40 40 L43 6 C43 1 51 1 51 6 L50 42 L54 14 C54 9 62 9 62 14 L58 62 C56 80 50 92 48 100"/></g><text x="${x + h * 0.35}" y="${grond - h - 10}" text-anchor="middle">hand</text>`;
  } else {
    const h = refB * 0.26, x = x0 + dierB + 40;
    refSvg = `<rect class="vergelijk" x="${x}" y="${grond - h}" width="${refB}" height="${h * 0.86}" rx="8"/><circle class="vergelijk" cx="${x + refB * 0.18}" cy="${grond - h * 0.12}" r="${h * 0.12}"/><circle class="vergelijk" cx="${x + refB * 0.82}" cy="${grond - h * 0.12}" r="${h * 0.12}"/><text x="${x + refB / 2}" y="${grond - h - 10}" text-anchor="middle">bus</text>`;
  }
  const W = Math.max(1040, x0 + dierB + 80 + (keuze === "bus" ? refB : refB * 0.6) + 40);
  const pad = VORM[vorm];
  const open = ["krab", "kwal", "worm", "inktvis", "garnaal"].includes(vorm);
  vlak.innerHTML = `<div class="schaal"><svg viewBox="0 0 ${W} 420" role="img" aria-label="${esc(hoofd(D.naam))} op schaal naast ${ref.naam}">
      <line class="grond" x1="20" y1="${grond}" x2="${W - 20}" y2="${grond}"/>
      <g transform="translate(${x0} ${grond - dierH}) scale(${dierB / 100} ${dierH / 100})"><path class="dier" d="${pad}" ${open ? 'style="fill:none;stroke-width:' + (300 / dierB).toFixed(2) + '"' : 'style="stroke-width:' + (150 / Math.max(dierB, dierH)).toFixed(2) + '"'} vector-effect="non-scaling-stroke"/></g>
      <line class="maatlijn" x1="${x0}" y1="${grond + 22}" x2="${x0 + dierB}" y2="${grond + 22}"/><line class="maatlijn" x1="${x0}" y1="${grond + 14}" x2="${x0}" y2="${grond + 30}"/><line class="maatlijn" x1="${x0 + dierB}" y1="${grond + 14}" x2="${x0 + dierB}" y2="${grond + 30}"/>
      <text x="${x0 + dierB / 2}" y="${grond + 50}" text-anchor="middle">${esc(kaal(D.naam))} ${esc(D.lengte_kort || "")}</text>
      ${refSvg}
    </svg>
    <div class="schaal-voet"><span><span class="label">tekening</span> Op schaal: ${esc(D.lengte_tekst)}${D.lengte_bron ? ` (<a href="#weetjes">weetje</a>)` : ""}. De vorm is een eenvoudige tekening, niet het echte dier.</span>
      <span class="schaal-kies" role="group" aria-label="Vergelijk met">${opties.map((o) => `<button type="button" data-ref="${o}" aria-pressed="${o === keuze}">${o === "hand" ? "Hand" : o === "kind" ? "Kind" : "Bus"}</button>`).join("")}</span></div></div>`;
  for (const b of vlak.querySelectorAll("[data-ref]")) b.addEventListener("click", () => tekenSchaal(vlak, b.dataset.ref));
}

/* ---------- geluid ---------- */
function tekenGeluid(vlak) {
  const g = D.geluid, id = "dier:" + D.slug;
  vlak.innerHTML = `<div class="geluid"><div class="geluid-midden">
      <canvas aria-hidden="true"></canvas>
      <button class="knop-speel" type="button" aria-label="Luister naar ${esc(D.naam)}"><svg class="ico-speel" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z" fill="currentColor"/></svg><svg class="ico-pauze" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>
      ${g.noot ? `<p class="geluid-noot">${esc(g.noot)}</p>` : ""}
    </div><div class="beeld-voet"><span class="label label-donker">opname</span><span>${esc(g.wat || "")} ${bron(g)}</span></div></div>`;
  const knop = vlak.querySelector(".knop-speel"), doek = vlak.querySelector("canvas");
  let sp = null, raf = 0;
  const teken = () => { if (sp) G.tekenSpectrogram(doek, sp, G.isHuidig(id) ? G.positie() : 0); if (G.isHuidig(id) && G.speelt()) raf = requestAnimationFrame(teken); };
  const bij = () => { const aan = G.isHuidig(id) && G.speelt(); knop.classList.toggle("speelt", aan); knop.setAttribute("aria-label", aan ? "Stop het geluid" : `Luister naar ${D.naam}`); cancelAnimationFrame(raf); teken(); };
  knop.addEventListener("click", () => G.speel({ id, url: g.pad, titel: D.naam }));
  const weg = G.opVerandering(bij);
  G.spectrogram(g.pad).then((s) => { sp = s; teken(); }).catch(() => (doek.hidden = true));
  addEventListener("resize", teken);
  stopGeluid = () => { weg(); cancelAnimationFrame(raf); removeEventListener("resize", teken); if (G.isHuidig(id)) G.stop(); };
}

start();
