import { TITEL, ONDERTITEL, SEIZOENEN, MAANDLETTERS, MAANDNAMEN, STRAAL_M, KERN_MIN, lidwoord } from "./config.js";
import * as D from "./data.js";
import { tekenKaart, legenda } from "./kaart.js";
import * as G from "./geluid.js";
import { Rondom, maten as vogelmaten } from "./rondom.js";
import { GROEPNAMEN, KLEUREN } from "./simulatie.js";
import * as SP from "./gespot.js";

const app = document.getElementById("app");
const toestand = {
  adres: null,            // alleen in het geheugen: { naam, lat, lon, gemeentecode }
  seizoen: huidigSeizoen(),
  laatsteVak: null,
};
let paginaDoeken = [];
let SOORTEN_CACHE = {};
D.soorten().then((S) => (SOORTEN_CACHE = S));
let kaartModule = null, kinderModule = null, luisterModule = null;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const getal = (n) => Math.round(n).toLocaleString("nl-NL");
const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const datum = (iso) => { const [j, m, d] = iso.split("-"); return d ? `${+d} ${KORT[+m - 1]} ${j}` : iso; };
const klein = (s) => (s.startsWith("IJ") ? "ij" + s.slice(2) : s.charAt(0).toLowerCase() + s.slice(1)); // IJsvogel -> ijsvogel
const metKey = (S, k) => ({ key: k, ...S[k] });

function huidigSeizoen() {
  const m = new Date().getMonth();
  return m >= 2 && m <= 4 ? "lente" : m >= 5 && m <= 7 ? "zomer" : m >= 8 && m <= 10 ? "herfst" : "winter";
}

/* ---------- Router ---------- */

// Waar je vandaan komt, voor de terugknop: de vorige pagina, met zijn naam en hoe ver je had gescrold
const TERUG_NAMEN = [["/soorten", "Alle vogels"], ["/gespot", "Mijn vogels"], ["/hier/", "Je vak"], ["/soort/", "Vorige vogel"],
  ["/kaart", "De kaart"], ["/onderzoekjes", "Onderzoekjes"], ["/luister", "Luister mee"], ["/ontdek", "Ontdekken"], ["/", "Begin"]];
function terugNaam(pad) { return (TERUG_NAMEN.find(([p]) => (p.endsWith("/") && p.length > 1 ? pad.startsWith(p) : pad === p)) || [, "Terug"])[1]; }

function naar(pad, vervang = false) {
  const hier = location.pathname + location.search;
  if (vervang) history.replaceState({ ...(history.state || {}) }, "", pad);
  else {
    history.replaceState({ ...(history.state || {}), scroll: window.scrollY }, "", hier); // plek onthouden
    history.pushState({ van: { url: hier, naam: terugNaam(location.pathname.replace(/\/+$/, "") || "/") } }, "", pad);
  }
  toon(true);
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("a[data-terug]");
  if (t && !e.metaKey && !e.ctrlKey && history.state?.van) { e.preventDefault(); history.back(); return; }
  const a = e.target.closest("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
  e.preventDefault();
  naar(a.getAttribute("href"));
});
window.addEventListener("popstate", () => toon(true, true));

let vorigPad = null;
async function toon(navigatie = false, terug = false) {
  const pad = location.pathname.replace(/\/+$/, "") || "/";
  const anderPad = pad !== vorigPad;
  vorigPad = pad;
  SOORTEN_CACHE = await D.soorten();
  document.body.classList.toggle("met-over", pad === "/" || pad.startsWith("/hier/") || pad.startsWith("/soort/"));
  document.body.classList.toggle("kindermodus", pad === "/kinderen");
  const doe = async () => {
    for (const d of paginaDoeken) G.ontkoppelDoek(d);
    paginaDoeken = [];
    kaartModule?.verlaatKaart();
    kinderModule?.verlaat();
    luisterModule?.verlaat();
    try {
      if (pad === "/") await home();
      else if (pad.startsWith("/hier/")) await hier(D.vakUitSlug(pad.slice(6)));
      else if (pad.startsWith("/soort/")) await soortPagina(decodeURIComponent(pad.slice(7)));
      else if (pad === "/soorten") await soortenIndex();
      else if (pad === "/ontdek") await ontdek();
      else if (pad === "/gespot") await mijnVogels();
      else if (pad === "/luister") {
        luisterModule = luisterModule || await import("./luister.js");
        document.title = `Luister mee · ${TITEL}`;
        luisterModule.luisterPagina(app, SOORTEN_CACHE);
      }
      else if (pad === "/kinderen") {
        kinderModule = kinderModule || await import("./kinderen.js");
        document.title = `Voggels voor kinderen`;
        kinderModule.kinderPagina(app, SOORTEN_CACHE);
      }
      else if (pad === "/onderzoekjes" || pad.startsWith("/onderzoekjes/")) {
        const OZ = await import("./onderzoekjes.js");
        document.title = `Onderzoekjes met Fos · ${TITEL}`;
        if (pad === "/onderzoekjes") await OZ.overzicht(app);
        else if (!(await OZ.onderzoekje(app, pad.slice(14), toestand, (d) => { G.koppelDoek(d); paginaDoeken.push(d); }))) nietGevonden();
      }
      else if (pad === "/kaart") {
        kaartModule = kaartModule || await import("./kaartpagina.js");
        document.title = `Twente in vogels · ${TITEL}`;
        const zoek = new URLSearchParams(location.search), vak = zoek.get("vak"), slug = zoek.get("soort");
        const S = slug ? await D.soorten() : {};
        const soortKey = slug ? Object.keys(S).find((k) => S[k].slug === slug) : null;
        await kaartModule.kaartPagina(app, toestand, { vak: vak ? D.vakUitSlug(vak) : null, soort: soortKey });
      } else nietGevonden();
    } catch (err) {
      console.error(err);
      app.innerHTML = `<section class="kolom tekst"><h1>Er ging iets mis</h1><p>De gegevens konden niet worden geladen. Probeer het later opnieuw.</p></section>`;
    }
    werkKnoppenBij();
  };
  if (navigatie && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    await document.startViewTransition(doe).updateCallbackDone;
  } else await doe();
  if (terug && history.state?.scroll != null) requestAnimationFrame(() => window.scrollTo(0, history.state.scroll));
  else if (navigatie && anderPad) { window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
}

function nietGevonden() {
  document.title = `Niet gevonden · ${TITEL}`;
  app.innerHTML = `<section class="kolom tekst"><h1>Deze pagina bestaat niet</h1><p><a href="/" data-link>Terug naar het begin</a></p></section>`;
}

/* ---------- Bouwstenen ---------- */

function knop(soort, type, extraKlasse = "") {
  const t = soort[type] ? type : soort.zang ? "zang" : "roep";
  if (!soort[t]) return "";
  return `<button class="knop-rond ${extraKlasse}" type="button" data-speel="${soort.key}" data-type="${t}" aria-label="Speel de ${t} van ${lidwoord(soort.nl)} ${esc(klein(soort.nl))}">
    <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="20"/><circle class="ring" cx="22" cy="22" r="20"/><path class="ico-pauze" d="M17 15v14M27 15v14"/><path class="ico-speel" d="M18 14l12 8-12 8z"/></svg></button>`;
}

function legePlaat(soort, kort = false) {
  const reden = soort.geen_plaat || (soort.exoot
    ? "Ontsnapt of uitgezet. Geen plaat gevonden in de oude Europese vogelboeken."
    : "Nog geen historische plaat gevonden voor deze soort.");
  return `<div class="lege-plaat"><div><div class="lege-plaat-naam">${esc(soort.nl)}</div>${kort ? "" : `<p>${esc(reden)}</p>`}</div></div>`;
}

function maandStrip(rij, actief) {
  const max = Math.max(1, ...rij);
  const cellen = rij.map((c, i) => {
    const o = c ? 0.14 + 0.86 * Math.pow(c / max, 0.6) : 0;
    const titel = `${MAANDNAMEN[i]}: ${getal(c)}`;
    return c ? `<i style="opacity:${o.toFixed(2)}" title="${titel}"></i>` : `<i class="uit" style="background:transparent" title="${titel}"></i>`;
  }).join("");
  const letters = MAANDLETTERS.map((l, i) => `<span${actief.includes(i) ? ' class="aan"' : ""}>${l}</span>`).join("");
  return `<div class="maanden" aria-hidden="true">${cellen}</div><div class="maanden-letters" aria-hidden="true">${letters}</div>`;
}

function labelVoor(soort) {
  return soort.exoot ? `<span class="label">${soort.status.includes("exoot") ? "exoot" : "ontsnapt"}</span>` : "";
}

// Wanneer is een vogel in Twente? Uit de meldingen per maand: mei-juli tegen december-februari, en de trekmaanden.
const AARD = { jaarrond: "Het hele jaar", zomergast: "Zomergast", wintergast: "Wintergast", doortrekker: "Doortrekker" };
const AARD_UITLEG = { jaarrond: "Het hele jaar in Twente", zomergast: "Zomergast: komt in het voorjaar, vertrekt in de nazomer", wintergast: "Wintergast: komt in de herfst, vertrekt in het voorjaar", doortrekker: "Doortrekker: vooral in het voor- en najaar, op weg naar elders" };
function aardVan(t) {
  const gem = (ms) => ms.reduce((a, m) => a + t[m], 0) / ms.length;
  const Z = gem([4, 5, 6]), W = gem([11, 0, 1]), T = Math.max(gem([2, 3]), gem([8, 9])), mx = Math.max(Z, W, T) || 1;
  if (Z < 0.15 * mx && W < 0.15 * mx) return "doortrekker";
  if (W < 0.12 * Z) return "zomergast";
  if (Z < 0.12 * W) return "wintergast";
  return "jaarrond";
}
// is de soort in maand m in Twente: minstens 15% van zijn drukste maand
const erIn = (t, m) => t[m] >= 0.15 * Math.max(...t) && t[m] > 0;

// de plus: een vogel die je zelf gezien of gehoord hebt
function gespotKnop(soort, klein = false) {
  const n = SP.aantalVan(soort.key);
  return `<button type="button" class="gespot${klein ? " gespot-klein" : ""}${n ? " ja" : ""}" data-gespot="${soort.key}" aria-label="${n ? `${esc(soort.nl)}: ${n}× gespot. Nog een keer gespot` : `Ik heb ${lidwoord(soort.nl)} ${esc(soort.nl.toLowerCase())} gespot`}"><span class="gespot-plus" aria-hidden="true">+</span>${klein ? (n ? `<span class="gespot-n">${n}</span>` : "") : `<span class="gespot-tekst">${n ? `Gespot <b>${n}×</b>` : "Gespot"}</span>`}</button>`;
}

function kaartje(soort, rij, maanden, telling) {
  const beeld = soort.plaat
    ? `<img src="${soort.plaat.klein}" alt="" loading="lazy" decoding="async" width="480" height="600">`
    : legePlaat(soort, true);
  return `<article class="soort">
    <a class="soort-beeld" href="/soort/${soort.slug}" data-link tabindex="-1" aria-hidden="true">${beeld}</a>
    ${soort.key ? gespotKnop(soort, true) : ""}
    <div class="soort-tekst">
      <div><a class="soort-naam" href="/soort/${soort.slug}" data-link>${esc(soort.nl)}</a><span class="wet">${esc(soort.wet)}</span>${labelVoor(soort)}<span class="label label-aard">${AARD[aardVan(soort.twente)]}</span></div>
      ${knop(soort, "zang")}
    </div>
    ${maandStrip(rij, maanden)}
    <div class="soort-telling">${telling}</div>
  </article>`;
}

/* ---------- Het scherm: één vogel, de weetjes, de strook en het kaartje ---------- */

// korte bron voor de weetjes: maker of boek, met de jaren uit de volledige bronregel
const PLAAT_KORT = [["Sepp", "Nozeman & Sepp"], ["Naumann", "Naumann"], ["Gould", "Gould"], ["Audubon", "Audubon"], ["van Oort", "Ornithologia Neerlandica"],
  ["Alphéraky", "Alphéraky"], ["Phillips", "Phillips"], ["Égypte", "Description de l'Égypte"], ["Prževalski", "Prževalski"], ["Recueil", "Recueil"]];
function plaatKort(p) {
  const naam = (PLAAT_KORT.find(([b]) => p.werk.includes(b)) || [, p.werk.split(",")[0]])[1];
  const jaren = p.werk.match(/\((\d{4}[^)]*|\d{2}e eeuw)\)/);
  return jaren ? `${naam}, ${jaren[1]}` : naam;
}

// opties: kop, sub, weetjes [[label, html]], strook {label, lijst [{key, tekst}], href(slug)}, omgeving {html, href, label}
function scherm(soort, { kop, sub, weetjes = [], strook, omgeving }) {
  const types = ["zang", "roep"].filter((t) => soort[t]);
  const plaat = soort.plaat
    ? `<img src="${soort.plaat.src}" alt="Historische plaat van ${lidwoord(soort.nl)} ${esc(klein(soort.nl))}${soort.plaat.ook.length ? `, samen met ${esc(soort.plaat.ook.join(", ").toLowerCase())}` : ""}" width="1200" height="1500" fetchpriority="high">`
    : legePlaat(soort);
  const van = history.state?.van;
  const terug = van && van.url !== location.pathname + location.search
    ? `<a class="scherm-terug" href="${esc(van.url)}" data-terug><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(van.naam)}</a>` : "";
  return `<section class="scherm" data-held="${soort.key}">
    ${terug}
    <div class="podium">
      <div class="podium-paneel podium-plaat onthul" data-paneel="plaat">${plaat}</div>
      <div class="podium-paneel podium-rondom" data-paneel="rondom" hidden>
        <canvas role="img" aria-label="Draaibare schets van ${lidwoord(soort.nl)} ${esc(klein(soort.nl))} in 3D, opgebouwd uit gemeten maten"></canvas>
        <p class="rondom-hint" aria-hidden="true">Schets uit gemeten maten · sleep om te draaien</p>
        <p class="rondom-bron"></p>
      </div>
      <div class="podium-paneel podium-geluid" data-paneel="geluid" hidden>
        <div class="spectro-vlak"><canvas aria-hidden="true"></canvas><div class="spectro-as"><span>11 kHz</span><span>5,5</span><span>0</span></div><div class="spectro-hint">Even laden…</div></div>
      </div>
      <div class="weergave" role="tablist" aria-label="Weergave">
        <button type="button" role="tab" data-weergave="plaat" aria-selected="true">Plaat</button>
        <button type="button" role="tab" data-weergave="rondom" aria-selected="false">3D</button>
        ${types.map((t) => `<button type="button" role="tab" data-weergave="${t}" aria-selected="false">${t === "zang" ? "Zang" : "Roep"}</button>`).join("")}
      </div>
      <div class="rondomknoppen" hidden>${types.length ? `<button type="button" class="knop-mini" data-laat-zingen>Laat zingen</button>` : ""}<button type="button" class="knop-mini" data-maten aria-pressed="true">Maten</button></div>
      <div class="zoomknoppen"><button type="button" class="knop-rondje" data-zoom="-1" aria-label="Uitzoomen">−</button><button type="button" class="knop-rondje" data-zoom="1" aria-label="Inzoomen">+</button></div>
    </div>
    <div class="scherm-titel">
      <h1>${kop}</h1>
      ${gespotKnop(soort)}
      ${sub ? `<p class="scherm-sub">${sub}</p>` : ""}
      <dl class="weetjes">${weetjes.filter(Boolean).map(([l, w]) => `<dt>${esc(l)}</dt><dd>${w}</dd>`).join("")}</dl>
    </div>
    ${strook ? `<div class="scherm-strook">
      <div class="strook" role="list" aria-label="${esc(strook.label)}">
        ${strook.lijst.map((x) => { const s = SOORTEN_CACHE[x.key]; return `<a class="strook-item${x.key === soort.key ? " actief" : ""}" role="listitem" href="${strook.href(s.slug)}" data-link aria-label="${esc(s.nl)}">
          <span class="strook-beeld">${s.plaat ? `<img src="${s.plaat.klein}" alt="" loading="lazy" width="480" height="600">` : `<i>${esc(s.nl.slice(0, 1))}</i>`}</span>
          <span class="strook-naam">${esc(klein(s.nl))}${x.tekst ? ` · ${x.tekst}` : ""}</span></a>`; }).join("")}
      </div>
      ${omgeving ? `<div class="omgeving"><p class="omgeving-label">${esc(strook.label)}</p>${omgeving.html}<a class="knop-mini" href="${omgeving.href}" data-link>Grote kaart</a></div>` : ""}
    </div>` : ""}
  </section>`;
}

function bindScherm(root, soort) {
  const sch = root.querySelector(".scherm");
  if (!sch) return;
  const doek = sch.querySelector(".podium-geluid canvas");
  const img = sch.querySelector(".podium-plaat img");
  // liggende platen schuiven op een breed scherm naast de titel, staande blijven in het midden
  if (img) {
    const meet = () => img.closest(".podium-plaat").classList.toggle("liggend", img.naturalWidth > img.naturalHeight * 1.05);
    if (img.complete && img.naturalWidth) meet(); else img.addEventListener("load", meet, { once: true });
  }
  let zoom = 0, rondom = null;
  const rondomknoppen = sch.querySelector(".rondomknoppen");
  const toon = (naam) => {
    const paneel = naam === "plaat" || naam === "rondom" ? naam : "geluid";
    sch.querySelectorAll("[data-paneel]").forEach((p) => (p.hidden = p.dataset.paneel !== paneel));
    sch.querySelectorAll("[data-weergave]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.weergave === naam)));
    sch.querySelector(".zoomknoppen").hidden = naam !== "plaat";
    if (rondomknoppen) rondomknoppen.hidden = naam !== "rondom";
    if (naam === "rondom") {
      const paneelEl = sch.querySelector(".podium-rondom");
      if (rondom) rondom.start();
      else vogelmaten().then((M) => {
        const m = M[soort.key];
        if (!m) { paneelEl.querySelector(".rondom-hint").textContent = "Voor deze soort zijn geen maten bekend."; return; }
        rondom = new Rondom(paneelEl, soort, m);
        paneelEl.querySelector(".rondom-bron").innerHTML = `Gebouwd uit de gemiddelde maten van ${m[9] ? `${m[9]} gemeten ${m[9] === 1 ? "vogel" : "vogels"}` : "gemeten vogels"} (<a href="https://doi.org/10.1111/ele.13898">AVONET</a>). Gewicht ${fmtGetal(m[7])} gram. De vorm is een schets, de maten kloppen.`;
        rondom.start();
      });
    } else if (naam !== "plaat") {
      if (doek && !paginaDoeken.includes(doek)) { G.koppelDoek(doek); paginaDoeken.push(doek); }
      // in de tik zelf afspelen (iOS)
      G.speel(soort, naam);
      const o = soort[naam];
      const geluidWeetje = sch.querySelector("[data-weetje-geluid]");
      if (o && geluidWeetje) geluidWeetje.innerHTML = opnameTekst(o);
    }
  };
  sch.querySelectorAll("[data-weergave]").forEach((b) => b.addEventListener("click", () => toon(b.dataset.weergave)));
  sch.querySelector("[data-maten]")?.addEventListener("click", (e) => {
    if (!rondom) return;
    rondom.maten = !rondom.maten;
    e.currentTarget.setAttribute("aria-pressed", String(rondom.maten));
    rondom.wek();
  });
  // zingen zonder van weergave te wisselen: de snavel gaat open op de maat van de opname
  sch.querySelector("[data-laat-zingen]")?.addEventListener("click", () => G.speel(soort, soort.zang ? "zang" : "roep"));
  sch.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
    zoom = Math.max(0, Math.min(2, zoom + +b.dataset.zoom));
    if (img) img.style.transform = `scale(${[1, 1.6, 2.4][zoom]})`;
  }));
  // de gekozen vogel midden in de strook, zonder de pagina zelf te laten scrollen
  const actief = sch.querySelector(".strook-item.actief"), strook = sch.querySelector(".strook");
  if (actief && strook) requestAnimationFrame(() => { strook.scrollLeft = actief.offsetLeft - strook.clientWidth / 2 + actief.offsetWidth / 2; });
}

const fmtGetal = (v) => (v >= 100 ? Math.round(v).toLocaleString("nl-NL") : String(Math.round(v * 10) / 10).replace(".", ","));

function opnameTekst(o) {
  const land = { Netherlands: "Nederland", Belgium: "België", Germany: "Duitsland" }[o.land] || o.land;
  return `<a href="${o.pagina}">XC${o.id}</a>, ${esc(o.opnemer)}, ${esc(land)} · <a href="${o.licentie}">${licentieNaam(o.licentie)}</a>`;
}

function weetjesVoor(soort, extra = []) {
  const piek = soort.twente.indexOf(Math.max(...soort.twente));
  const o = soort.zang || soort.roep;
  return [
    ["Soort", `<em>${esc(soort.wet)}</em>`],
    soort.status ? ["Status", esc(soort.status.charAt(0).toUpperCase() + soort.status.slice(1))] : null,
    ["Wanneer", esc(AARD_UITLEG[aardVan(soort.twente)])],
    ...extra,
    ["Het vaakst", MAANDNAMEN[piek]],
    o ? ["Geluid", `<span data-weetje-geluid>${opnameTekst(o)}</span>`] : null,
    soort.plaat ? ["Plaat", `<a href="${soort.plaat.pagina}">${esc(plaatKort(soort.plaat))}</a>`] : null,
  ];
}

function licentieNaam(url) {
  const m = url.match(/licenses\/([a-z-]+)\/([\d.]+)/);
  if (m) return `CC ${m[1].toUpperCase()} ${m[2]}`;
  return url.includes("publicdomain") ? "CC0" : "licentie";
}

function kernMetGeluid(S) {
  return Object.keys(S).filter((k) => S[k].n >= KERN_MIN && S[k].plaat && (S[k].zang || S[k].roep));
}

const kaartjeKlein = (K, V, opties) => tekenKaart(K, V, { ...opties, label: opties.label || "Kaartje van Twente" });

/* ---------- Start ---------- */

async function home() {
  document.title = `${TITEL} · ${ONDERTITEL}`;
  const [S, V, K, M] = await Promise.all([D.soorten(), D.vakken(), D.kaart(), D.meta()]);
  const m = new Date().getMonth();
  const gevraagd = new URLSearchParams(location.search).get("soort");
  const kandidaten = kernMetGeluid(S).filter((k) => !S[k].exoot && S[k].twente[m] >= 300);
  const score = (k) => { const r = S[k].twente; const gem = r.reduce((a, b) => a + b, 0) / 12; return (r[m] / (gem + 5)) * Math.log(1 + r[m]); };
  const k = Object.keys(S).find((x) => S[x].slug === gevraagd) || kandidaten.sort((a, b) => score(b) - score(a))[0];
  const soort = metKey(S, k);
  const r = soort.twente, gem = r.reduce((a, b) => a + b, 0) / 12;
  const nu = Object.keys(S).filter((x) => S[x].n >= KERN_MIN && S[x].plaat).map((x) => ({ key: x, c: S[x].twente[m] })).filter((x) => x.c > 0).sort((a, b) => b.c - a.c).slice(0, 40);
  const waarden = Object.fromEntries(Object.entries(V).map(([v, d]) => [v, d.s[k]?.[m] || 0]));

  app.innerHTML = `
    ${scherm(soort, {
      kop: `${lidwoord(soort.nl, true)} <em>${esc(klein(soort.nl))}</em> in <em>${MAANDNAMEN[m]}</em>`,
      sub: `In ${MAANDNAMEN[m]} ${getal(r[m])} keer gemeld in Twente${r[m] > gem * 1.4 ? `, ${(r[m] / gem).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} keer zo vaak als in een gemiddelde maand` : ""}.`,
      weetjes: weetjesVoor(soort, [["In Twente", `${getal(soort.n)} meldingen in vijf jaar`]]),
      strook: { label: `${nu.length} soorten nu in Twente`, lijst: nu.map((x) => ({ key: x.key })), href: (slug) => `/?soort=${slug}` },
      omgeving: { html: kaartjeKlein(K, V, { waarden, label: `Waar ${lidwoord(soort.nl)} ${klein(soort.nl)} in ${MAANDNAMEN[m]} gemeld wordt` }), href: `/kaart?soort=${soort.slug}` },
    })}
    <section class="breed blok">
      <a class="oz-teaser" href="/onderzoekjes" data-link>
        <span class="oz-teaser-tekst"><span class="oz-boventitel">Elke week op onderzoek</span><strong>Onderzoekjes met Fos</strong><span>Zes opdrachten om samen met een kleine onderzoeker te doen: eerst op de site, dan buiten. Met een certificaat als alles af is.</span></span>
        <span class="knop-pil knop-accent">Begin</span>
      </a>
    </section>
    <section class="breed blok">
      <a class="kaart-teaser" href="/kaart" data-link>
        <span class="kaart-teaser-stippen" aria-hidden="true"></span>
        <span class="kaart-teaser-tekst"><strong>Twente in vogels</strong><span>Een simulatie van ${getal(M.meldingen_vakken)} meldingen op een nachtkaart. Speel het jaar af en zie de ganzen komen en de gierzwaluwen gaan.</span></span>
        <span class="knop-pil knop-licht">Open de kaart</span>
      </a>
    </section>`;
  bindScherm(app, soort);
}

/* ---------- Zoeken (in de vaste balk) ---------- */

function zoekveld(wrap) {
  const input = wrap.querySelector("input"), lijst = wrap.querySelector("ul"), melding = wrap.querySelector(".zoek-melding");
  let docs = [], keuze = -1, ctrl = null, timer = null;
  const sluit = () => { lijst.hidden = true; input.setAttribute("aria-expanded", "false"); keuze = -1; };
  const teken = () => {
    lijst.innerHTML = docs.map((d, i) => `<li role="option" id="optie-${i}" data-i="${i}" aria-selected="${i === keuze}">${esc(d.weergavenaam)}${d.type !== "adres" ? ` <span class="zacht">· ${esc(d.type)}</span>` : ""}</li>`).join("");
    lijst.hidden = !docs.length;
    input.setAttribute("aria-expanded", String(!!docs.length));
    if (keuze >= 0) input.setAttribute("aria-activedescendant", `optie-${keuze}`); else input.removeAttribute("aria-activedescendant");
  };
  const kies = async (i) => {
    const d = docs[i]; if (!d) return;
    sluit(); input.value = d.weergavenaam; melding.textContent = "Even zoeken…";
    try {
      const a = await D.haalAdres(d.id);
      toestand.adres = a;
      melding.textContent = "";
      naar(`/hier/${D.vakSlug(D.vakVan(a.lat, a.lon))}`);
    } catch { melding.textContent = "Dit adres kon niet worden opgezocht. Probeer het opnieuw."; }
  };
  const zoek = async (q) => {
    ctrl?.abort(); ctrl = new AbortController();
    try {
      docs = await D.zoekAdres(q, ctrl.signal); keuze = -1; teken();
      melding.textContent = docs.length ? "" : "Geen adres in Twente gevonden. Deze site werkt alleen voor de veertien Twentse gemeenten.";
    } catch (e) { if (e.name !== "AbortError") melding.textContent = "Zoeken lukt nu niet. Probeer het zo opnieuw."; }
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { docs = []; teken(); melding.textContent = ""; return; }
    timer = setTimeout(() => zoek(q), 180);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { keuze = Math.min(docs.length - 1, keuze + 1); teken(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { keuze = Math.max(0, keuze - 1); teken(); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); kies(keuze >= 0 ? keuze : 0); }
    else if (e.key === "Escape") sluit();
  });
  lijst.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) kies(+li.dataset.i); });
  input.addEventListener("blur", () => setTimeout(sluit, 200));
  wrap.querySelector(".zoek-knop").addEventListener("click", async () => {
    const q = input.value.trim();
    if (q.length < 3) { input.focus(); melding.textContent = "Typ eerst een adres in Twente."; return; }
    if (!docs.length) await zoek(q);
    kies(0);
  });
  wrap.querySelector(".zoek-locatie").addEventListener("click", () => {
    if (!navigator.geolocation) { melding.textContent = "Je browser kan je locatie niet doorgeven."; return; }
    melding.textContent = "Locatie opvragen… Die blijft in je browser.";
    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude: lat, longitude: lon } = p.coords;
      const V = await D.vakken();
      const vak = D.vakVan(lat, lon);
      if (!V[vak]) { melding.textContent = "Je bent niet in Twente, of net buiten de vakken die we kennen."; return; }
      toestand.adres = { naam: "Je locatie", lat, lon, gemeentecode: null };
      melding.textContent = "";
      naar(`/hier/${D.vakSlug(vak)}`);
    }, () => { melding.textContent = "Je locatie kon niet worden bepaald. Typ je adres."; }, { maximumAge: 60000, timeout: 10000 });
  });
}

/* ---------- Je plek ---------- */

async function hier(vak) {
  const [S, V, K, M] = await Promise.all([D.soorten(), D.vakken(), D.kaart(), D.meta()]);
  if (!V[vak]) return nietGevonden();
  toestand.laatsteVak = vak;
  const adres = toestand.adres && D.vakVan(toestand.adres.lat, toestand.adres.lon) === vak ? toestand.adres : null;
  const gemeente = (adres && M.gemeentecodes[adres.gemeentecode]) || D.gemeenteVanVak(K, vak);
  const buren = D.buren(vak);
  const [la, lo] = vak.split(",").map(Number);
  const plekNaam = adres ? (adres.naam === "Je locatie" ? "jou in de buurt" : adres.naam.split(",")[0]) : `vak ${la.toFixed(2).replace(".", ",")} N · ${lo.toFixed(2).replace(".", ",")} O`;
  document.title = `${adres ? adres.naam : `Vak ${vak}`} · ${TITEL}`;
  const precies = adres ? await D.preciesRond(adres.lat, adres.lon, STRAAL_M) : null;
  const gevraagd = new URLSearchParams(location.search).get("soort");

  const teken = () => {
    const maanden = SEIZOENEN[toestand.seizoen].maanden;
    const gezien = new Set();
    const laag = (sleutels) => {
      const { n, perSoort } = D.optellen(V, sleutels);
      const lijst = [...perSoort.entries()].map(([key, rij]) => ({ key, rij, s: D.inSeizoen(rij, maanden) })).filter((x) => x.s > 0);
      const nieuw = lijst.filter((x) => !gezien.has(x.key)).sort((a, b) => b.s - a.s);
      lijst.forEach((x) => gezien.add(x.key));
      return { n, totaal: lijst.length, nieuw, vakken: sleutels.filter((v) => V[v]).length };
    };
    const l2 = laag([vak]), l3 = laag(buren);
    const l4 = laag([...new Set([...(K.gemeenten[gemeente]?.vakken || []), ...buren])]);
    const l5 = laag(Object.keys(V));
    const seizoenNaam = toestand.seizoen === "jaar" ? "in vijf jaar" : `in de ${SEIZOENEN[toestand.seizoen].naam.toLowerCase()}`;
    const waarden = Object.fromEntries(Object.entries(V).map(([v, d]) => [v, Object.values(d.s).filter((r) => D.inSeizoen(r, maanden) > 0).length]));
    // de vogel in beeld: gekozen via de strook, anders de meest gemelde soort met plaat en geluid
    const gekozen = l2.nieuw.find((x) => S[x.key].slug === gevraagd)
      || l2.nieuw.find((x) => S[x.key].plaat && (S[x.key].zang || S[x.key].roep) && !S[x.key].exoot) || l2.nieuw[0];
    const soort = gekozen ? metKey(S, gekozen.key) : null;
    const strookLijst = l2.nieuw.filter((x) => S[x.key].n >= KERN_MIN);

    app.innerHTML = `
    ${soort ? scherm(soort, {
      kop: `${lidwoord(soort.nl, true)} <em>${esc(klein(soort.nl))}</em> bij <em>${esc(plekNaam)}</em>`,
      sub: `Een van de ${l2.totaal} soorten die ${seizoenNaam} in je vak zijn gemeld.`,
      weetjes: weetjesVoor(soort, [["In je vak", `${getal(gekozen.s)} meldingen ${seizoenNaam}`], ["Gemeente", `${esc(gemeente)} · vak ${vak}`]]),
      strook: { label: `${strookLijst.length} soorten in je vak`, lijst: strookLijst.map((x) => ({ key: x.key })), href: (slug) => `/hier/${D.vakSlug(vak)}?soort=${slug}` },
      omgeving: { html: kaartjeKlein(K, V, { waarden, eigen: vak, punt: adres ? [adres.lat, adres.lon] : null, label: "Je vak in Twente" }), href: `/kaart?vak=${D.vakSlug(vak)}` },
    }) : `<section class="breed plek"><h1>${esc(plekNaam)}</h1><p>Hier is ${seizoenNaam} niets gemeld.</p></section>`}
    <section class="breed blok">
      <div class="blok-kop"><h2>Van je straat tot heel Twente</h2></div>
      <div class="seizoen" role="group" aria-label="Seizoen">${Object.entries(SEIZOENEN).map(([k, s]) => `<button type="button" data-seizoen="${k}" aria-pressed="${k === toestand.seizoen}">${s.naam}</button>`).join("")}</div>
      <div class="kaart-vak">${tekenKaart(K, V, { waarden, eigen: vak, buren: buren.filter((b) => b !== vak), gemeente, punt: adres ? [adres.lat, adres.lon] : null, klik: true,
        label: `Kaart van Twente met je vak, de buurvakken en de gemeente ${gemeente}`, titel: (v, w) => `${w} soorten ${seizoenNaam}` })}</div>
      ${legenda(Math.max(...Object.values(waarden)), "soorten")}
      ${laagStraat(adres, precies, S)}
      ${laagBlok(2, "Je vak", `ongeveer 4 × 6 km · ${getal(l2.n)} meldingen · ${l2.totaal} soorten ${seizoenNaam}`,
        "Het rastervak waarin je adres ligt. Observation.org deelt meldingen alleen op dit raster; de vogels hieronder zijn ergens in dit vak gemeld, niet per se bij jou om de hoek.", l2.nieuw, S, maanden, 12, "in dit vak")}
      ${laagBlok(3, "Eromheen", `${l3.vakken} vakken · ${getal(l3.n)} meldingen · ${l3.totaal} soorten`,
        l3.nieuw.length ? "Deze soorten zijn in de vakken rond je vak gemeld, maar niet in je eigen vak." : "Rond je vak zijn geen andere soorten gemeld dan in je eigen vak.", l3.nieuw, S, maanden, 6, "in de buurt")}
      ${laagBlok(4, `In en rond ${gemeente}`, `${l4.vakken} vakken · ${getal(l4.n)} meldingen · ${l4.totaal} soorten`,
        `Alle vakken die de gemeente ${esc(gemeente)} raken. Dat is iets ruimer dan de gemeentegrens, want een vak is niet te splitsen. Hieronder alleen wat er nog bij komt.`, l4.nieuw, S, maanden, 6, "in en rond de gemeente")}
      ${laagBlok(5, "Heel Twente", `${l5.vakken} vakken · ${getal(l5.n)} meldingen · ${l5.totaal} soorten`,
        `De rest van wat ${seizoenNaam} in Twente is gemeld. Vaak zeldzaam, of gebonden aan één plek.`, l5.nieuw, S, maanden, 6, "in Twente")}
    </section>`;

    if (soort) bindScherm(app, soort);
    app.querySelectorAll("[data-seizoen]").forEach((b) => b.addEventListener("click", () => {
      toestand.seizoen = b.dataset.seizoen;
      const y = window.scrollY;
      for (const d of paginaDoeken) G.ontkoppelDoek(d);
      paginaDoeken = [];
      const ververs = () => { teken(); werkKnoppenBij(); window.scrollTo(0, y); };
      if (document.startViewTransition) document.startViewTransition(ververs); else ververs();
    }));
    app.querySelector(".kaart-vak svg").addEventListener("click", (e) => {
      const r = e.target.closest("[data-vak]");
      if (r && r.dataset.vak !== vak) { toestand.adres = null; naar(`/hier/${D.vakSlug(r.dataset.vak)}`); }
    });
    app.querySelectorAll("[data-meer]").forEach((b) => b.addEventListener("click", () => {
      b.previousElementSibling.querySelectorAll("[hidden]").forEach((el) => (el.hidden = false));
      b.remove(); werkKnoppenBij();
    }));
  };
  teken();
}

function laagStraat(adres, precies, S) {
  const kop = (sub) => `<div class="laag-kop"><span class="laag-nr">1</span><h2>Je straat</h2><span class="laag-sub">${sub}</span></div>`;
  if (!adres) {
    return `<section class="laag">${kop(`binnen ${STRAAL_M} m`)}<p class="laag-tekst">Je hebt een vak op de kaart gekozen, geen adres. Typ je adres bovenaan om de losse meldingen bij je straat te zien. We bewaren geen adressen, dus na het herladen van de pagina is het adres weg.</p></section>`;
  }
  const soortenSet = new Set(precies.map((p) => p.soort));
  const dagen = new Set(precies.map((p) => p.datum)).size;
  if (!precies.length) {
    return `<section class="laag">${kop(`binnen ${STRAAL_M} m · 0 meldingen`)}
      <div class="leeg"><div class="leeg-cirkel">0</div><p>Hier is in vijf jaar niets precies gemeld. Dat zegt vooral iets over waar mensen tellen, niet over de vogels.</p></div></section>`;
  }
  const tellingen = new Map();
  for (const p of precies) {
    const k = `${p.datum}|${p.bron}|${Math.round(p.d / 10)}`;
    if (!tellingen.has(k)) tellingen.set(k, { ...p, soorten: [] });
    const t = tellingen.get(k);
    if (!t.soorten.includes(p.soort)) t.soorten.push(p.soort);
  }
  const lijst = [...tellingen.values()];
  const rijen = lijst.slice(0, 25).map((t) => {
    const namen = t.soorten.map((k) => `<a href="/soort/${S[k].slug}" data-link>${esc(S[k].nl)}</a>`).join(", ");
    return `<li><span class="mono">${datum(t.datum)}</span><span>${namen}</span><span class="mono">${esc(t.bron)} · ${Math.round(t.d / 10) * 10} m</span></li>`;
  }).join("");
  return `<section class="laag">${kop(`binnen ${STRAAL_M} m · ${precies.length} meldingen · ${soortenSet.size} soorten · ${lijst.length} ${lijst.length === 1 ? "telling" : "tellingen"} op ${dagen} ${dagen === 1 ? "dag" : "dagen"}`)}
    <p class="laag-tekst">Losse meldingen met een precieze plek, vooral van eBird en iNaturalist. Dit zijn momenten, geen vaste bewoners.</p>
    <ul class="meldingen">${rijen}</ul>${lijst.length > 25 ? `<p class="mono zacht">En nog ${lijst.length - 25} oudere tellingen.</p>` : ""}</section>`;
}

function laagBlok(nr, titel, sub, tekst, lijst, S, maanden, eerst, waar) {
  const { kern, rest } = D.splitsKern(lijst, S);
  const kaartjes = kern.map((x, i) => {
    const html = kaartje(metKey(S, x.key), x.rij, maanden, `${getal(x.s)} ${x.s === 1 ? "melding" : "meldingen"} ${waar}`);
    return i < eerst ? html : html.replace('<article class="soort">', '<article class="soort" hidden>');
  }).join("");
  const zeldzaam = rest.length
    ? `<h3 class="tussenkop">Zelden gemeld in Twente</h3><ul class="zeldzaam">${rest.map((x) => {
      const s = S[x.key];
      return `<li><a href="/soort/${s.slug}" data-link>${esc(s.nl)}</a> <span class="mono">${x.s}</span>${s.exoot ? ' <span class="mono" style="color:var(--rood)">ontsnapt</span>' : ""}</li>`;
    }).join("")}</ul>` : "";
  return `<section class="laag">
    <div class="laag-kop"><span class="laag-nr">${nr}</span><h2>${esc(titel)}</h2><span class="laag-sub">${sub}</span></div>
    <p class="laag-tekst">${tekst}</p>
    ${kern.length ? `<div class="raster">${kaartjes}</div>${kern.length > eerst ? `<button class="knop-pil" type="button" data-meer>Toon alle ${kern.length} soorten</button>` : ""}` : ""}
    ${zeldzaam}
  </section>`;
}

/* ---------- Soortpagina ---------- */

async function soortPagina(slug) {
  const [S, V, K] = await Promise.all([D.soorten(), D.vakken(), D.kaart()]);
  const entry = Object.entries(S).find(([, s]) => s.slug === slug);
  if (!entry) return nietGevonden();
  const soort = { key: entry[0], ...entry[1] };
  document.title = `${soort.nl} · ${TITEL}`;
  const max = Math.max(1, ...soort.twente);
  const waarden = Object.fromEntries(Object.entries(V).map(([v, d]) => [v, (d.s[soort.key] || []).reduce((a, b) => a + b, 0)]));
  const vakkenMet = Object.values(waarden).filter((w) => w > 0).length;
  const groep = Object.keys(S).filter((k) => S[k].groep === soort.groep && S[k].n >= KERN_MIN && S[k].plaat).sort((a, b) => S[b].n - S[a].n);
  app.innerHTML = `
  ${scherm(soort, {
    kop: `${lidwoord(soort.nl, true)} <em>${esc(klein(soort.nl))}</em>`,
    sub: `${getal(soort.n)} meldingen in Twente in vijf jaar, in ${vakkenMet} van de ${Object.keys(V).length} vakken.${soort.exoot ? " Ontsnapt of uitgezet." : ""}`,
    weetjes: weetjesVoor(soort, [["In Twente", `${getal(soort.n)} meldingen`]]),
    strook: { label: `${groep.length} ${GROEPNAMEN[soort.groep]?.toLowerCase() || "soorten"}`, lijst: groep.map((k) => ({ key: k })), href: (s) => `/soort/${s}` },
    omgeving: { html: kaartjeKlein(K, V, { waarden, eigen: toestand.laatsteVak, label: `Waar ${lidwoord(soort.nl)} ${klein(soort.nl)} in Twente gemeld is` }), href: `/kaart?soort=${soort.slug}` },
  })}
  <section class="breed blok twee">
    <div class="kalender">
      <h2>Wanneer in Twente</h2>
      <p class="mono zacht">Meldingen per maand, ${getal(soort.n)} in totaal</p>
      <div class="kalender-staven">${soort.twente.map((c, i) => `<div style="height:${Math.max(1, (c / max) * 100).toFixed(1)}%;opacity:${(0.25 + 0.75 * (c / max)).toFixed(2)}" title="${MAANDNAMEN[i]}: ${getal(c)}"></div>`).join("")}</div>
      <div class="kalender-letters">${MAANDLETTERS.map((l) => `<span>${l}</span>`).join("")}</div>
    </div>
    <div class="waar">
      <h2>Waar in Twente</h2>
      <p class="mono zacht">Meldingen per vak van ongeveer 4 × 6 km</p>
      ${tekenKaart(K, V, { waarden, eigen: toestand.laatsteVak, label: `Kaart: waar ${lidwoord(soort.nl)} ${klein(soort.nl)} in Twente is gemeld`, titel: (v, w) => `${w} meldingen` })}
      ${legenda(Math.max(...Object.values(waarden)), "meldingen")}
    </div>
  </section>`;
  bindScherm(app, soort);
}

/* ---------- Alle soorten ---------- */

async function soortenIndex() {
  const S = await D.soorten();
  document.title = `Alle soorten · ${TITEL}`;
  const zp = new URLSearchParams(location.search);
  const st = { groep: zp.get("groep") || null, sort: zp.get("sort") || "meest", q: (zp.get("q") || "").toLowerCase(), wanneer: zp.get("wanneer") || "" };
  // filters in het adres, zodat terug van een vogel dezelfde lijst geeft
  const bewaarFilters = () => {
    const u = new URLSearchParams();
    if (st.groep) u.set("groep", st.groep);
    if (st.wanneer) u.set("wanneer", st.wanneer);
    if (st.sort !== "meest") u.set("sort", st.sort);
    if (st.q) u.set("q", st.q);
    history.replaceState(history.state, "", `/soorten${u.toString() ? `?${u}` : ""}`);
  };
  const groepen = Object.keys(GROEPNAMEN).filter((g) => Object.values(S).some((s) => s.groep === g && s.n >= KERN_MIN));
  app.innerHTML = `
  <section class="breed blok">
    <div class="blok-kop"><h1 class="index-kop">Alle vogels in Twente</h1><span class="mono zacht">${Object.values(S).filter((s) => s.n >= KERN_MIN).length} soorten met minstens ${KERN_MIN} meldingen</span></div>
    <div class="index-filters">
      <div class="chips" role="group" aria-label="Groep">
        <button type="button" class="chip" data-groep="" aria-pressed="true">Alle</button>
        ${groepen.map((g) => `<button type="button" class="chip" data-groep="${g}" aria-pressed="false"><i style="background:${KLEUREN[g]}"></i>${GROEPNAMEN[g]}</button>`).join("")}
      </div>
      <div class="chips chips-wanneer" role="group" aria-label="Wanneer in Twente">
        <button type="button" class="chip" data-wanneer="" aria-pressed="true">Altijd</button>
        <button type="button" class="chip" data-wanneer="nu" aria-pressed="false"><span class="chip-live"></span>Nu, in ${MAANDNAMEN[new Date().getMonth()]}</button>
        <button type="button" class="chip" data-wanneer="jaarrond" aria-pressed="false">Het hele jaar</button>
        <button type="button" class="chip" data-wanneer="zomergast" aria-pressed="false">Zomergasten</button>
        <button type="button" class="chip" data-wanneer="wintergast" aria-pressed="false">Wintergasten</button>
        <button type="button" class="chip" data-wanneer="doortrekker" aria-pressed="false">Doortrekkers</button>
        <button type="button" class="chip chip-gespot" data-wanneer="gespot" aria-pressed="false">+ Mijn vogels</button>
        <button type="button" class="chip" data-wanneer="niet" aria-pressed="false">Nog niet gespot</button>
      </div>
      <div class="index-rij">
        <input class="veld" type="search" placeholder="Zoek een soort" aria-label="Zoek een soort">
        <select class="veld" aria-label="Sorteer"><option value="meest">Meest gemeld</option><option value="zeldzaam">Zeldzaamst</option><option value="az">A–Z</option><option value="nu">Nu het meest</option></select>
      </div>
    </div>
    <p class="index-teller mono zacht"></p>
    <div class="raster index-raster"></div>
  </section>`;
  const raster = app.querySelector(".index-raster");
  const teller = app.querySelector(".index-teller");
  const m = new Date().getMonth();
  app.querySelectorAll("[data-wanneer]").forEach((b) => b.addEventListener("click", () => {
    st.wanneer = b.dataset.wanneer;
    app.querySelectorAll("[data-wanneer]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    teken();
  }));

  const teken = () => {
    const mijn = SP.lees();
    const wanneer = (k) => !st.wanneer || (st.wanneer === "nu" ? erIn(S[k].twente, m) : st.wanneer === "gespot" ? !!mijn[k] : st.wanneer === "niet" ? !mijn[k] : aardVan(S[k].twente) === st.wanneer);
    let lijst = Object.keys(S).filter((k) => S[k].n >= KERN_MIN && (!st.groep || S[k].groep === st.groep) && wanneer(k) && (!st.q || S[k].nl.toLowerCase().includes(st.q) || S[k].wet.toLowerCase().includes(st.q)));
    const sorteer = { meest: (a, b) => S[b].n - S[a].n, zeldzaam: (a, b) => S[a].n - S[b].n, az: (a, b) => S[a].nl.localeCompare(S[b].nl, "nl"), nu: (a, b) => S[b].twente[m] - S[a].twente[m] }[st.sort];
    lijst = lijst.sort(sorteer);
    raster.innerHTML = lijst.map((k) => kaartje(metKey(S, k), S[k].twente, [m], `${getal(S[k].n)} meldingen`)).join("") || `<p>Geen soorten gevonden.</p>`;
    teller.textContent = `${lijst.length} ${lijst.length === 1 ? "soort" : "soorten"}`;
    bewaarFilters();
    werkKnoppenBij();
  };
  app.querySelectorAll("[data-groep]").forEach((b) => b.addEventListener("click", () => {
    st.groep = b.dataset.groep || null;
    app.querySelectorAll("[data-groep]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    teken();
  }));
  app.querySelector("input.veld").addEventListener("input", (e) => { st.q = e.target.value.trim().toLowerCase(); teken(); });
  app.querySelector("select.veld").addEventListener("change", (e) => { st.sort = e.target.value; teken(); });
  if (!app.querySelector(`[data-wanneer="${CSS.escape(st.wanneer)}"]`)) st.wanneer = "";
  app.querySelectorAll("[data-wanneer]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.wanneer === st.wanneer)));
  app.querySelectorAll("[data-groep]").forEach((x) => x.setAttribute("aria-pressed", String((x.dataset.groep || null) === st.groep)));
  app.querySelector("input.veld").value = st.q;
  app.querySelector("select.veld").value = st.sort;
  teken();
}

/* ---------- Mijn vogels: wat je zelf gespot hebt ---------- */

function datumLang(iso) {
  const [j, mm, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MAANDNAMEN[mm - 1]}${j !== new Date().getFullYear() ? ` ${j}` : ""}`;
}

async function mijnVogels() {
  const S = await D.soorten();
  document.title = `Mijn vogels · ${TITEL}`;
  const teken = () => {
    const mijn = SP.lees();
    const keys = Object.keys(mijn).filter((k) => S[k]).sort((a, b) => mijn[b].at(-1).localeCompare(mijn[a].at(-1)) || mijn[b].length - mijn[a].length);
    const totaal = Object.values(S).filter((s) => s.n >= KERN_MIN).length;
    const keer = keys.reduce((a, k) => a + mijn[k].length, 0);
    const m = new Date().getMonth();
    // tips: nu in Twente, veel gemeld, nog niet door jou gespot
    const tips = Object.keys(S).filter((k) => !mijn[k] && S[k].n >= KERN_MIN && S[k].plaat && !S[k].exoot && erIn(S[k].twente, m)).sort((a, b) => S[b].twente[m] - S[a].twente[m]).slice(0, 6);
    app.innerHTML = `
    <section class="breed blok mijn">
      <p class="oz-boventitel">Op dit apparaat</p>
      <h1 class="index-kop">Mijn <em>vogels</em></h1>
      <div class="mijn-cijfers">
        <div><strong>${keys.length}</strong><span>van de ${totaal} soorten gespot</span></div>
        <div><strong>${keer}</strong><span>${keer === 1 ? "keer" : "keer"} een plusje gezet</span></div>
        ${keys.length ? `<div><strong>${datumLang(mijn[keys[0]].at(-1))}</strong><span>laatst: ${esc(klein(S[keys[0]].nl))}</span></div>` : ""}
      </div>
      <div class="mijn-balk" aria-hidden="true"><i style="width:${Math.max(keys.length ? 1.2 : 0, (100 * keys.length) / totaal).toFixed(1)}%"></i></div>
      ${keys.length ? `<div class="raster mijn-raster">${keys.map((k) => {
        const s = metKey(S, k), d = mijn[k];
        return `<article class="soort">
          <a class="soort-beeld" href="/soort/${s.slug}" data-link tabindex="-1" aria-hidden="true">${s.plaat ? `<img src="${s.plaat.klein}" alt="" loading="lazy" width="480" height="600">` : legePlaat(s, true)}</a>
          ${gespotKnop(s, true)}
          <div class="soort-tekst"><div><a class="soort-naam" href="/soort/${s.slug}" data-link>${esc(s.nl)}</a><span class="wet">${esc(s.wet)}</span></div>${knop(s, "zang")}</div>
          <p class="mijn-data">${d.length}× · ${d.length > 1 ? `eerst ${datumLang(d[0])}, laatst ${datumLang(d.at(-1))}` : datumLang(d[0])}</p>
          <button type="button" class="mijn-min" data-gespot-min="${k}">Eén weghalen</button>
        </article>`; }).join("")}</div>` : `<div class="mijn-leeg"><p>Nog niets gespot. Zie of hoor je een vogel? Zoek hem op en tik op het plusje bij de naam.</p><p><a class="knop-pil knop-accent" href="/soorten?wanneer=nu" data-link>Vogels die nu in Twente zijn</a></p></div>`}
      ${tips.length ? `<h2 class="mijn-tips-kop">Nu in Twente, nog niet door jou gezien</h2>
      <div class="raster mijn-tips">${tips.map((k) => kaartje(metKey(S, k), S[k].twente, [m], `${getal(S[k].twente[m])} meldingen in ${MAANDNAMEN[m]}`)).join("")}</div>` : ""}
      <p class="zacht mijn-noot">Wat je spot, blijft op dit apparaat. Het gaat niet naar ons of naar iemand anders, en het telt niet mee in de meldingen van de site. Wil je je waarneming delen met vogelaars? Dat kan op <a href="https://waarneming.nl">waarneming.nl</a>.</p>
    </section>`;
    app.querySelectorAll("[data-gespot-min]").forEach((b) => b.addEventListener("click", () => { SP.haalWeg(b.dataset.gespotMin); teken(); }));
    werkKnoppenBij();
  };
  teken();
  mijnHertekenen = teken;
}
let mijnHertekenen = null;

async function ontdek() {
  const S = await D.soorten();
  const lijst = kernMetGeluid(S);
  const k = lijst[Math.floor(Math.random() * lijst.length)];
  naar(`/soort/${S[k].slug}`, true);
}

/* ---------- Speler en knoppen ---------- */

const speler = document.getElementById("speler");
const spelerDoek = speler.querySelector("canvas");
let spelerGekoppeld = false;
const VRAAGTEKEN = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 60"><rect width="48" height="60" fill="#E0D9CE"/><text x="24" y="40" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="28" fill="#1F1B18">?</text></svg>')}`;
const LEEG_VAKJE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 60"><rect width="48" height="60" fill="#E0D9CE"/></svg>')}`;

// De soortenlijst staat al klaar, zodat afspelen synchroon in de tik gebeurt (anders blokkeert iOS het geluid).
let SOORTEN = null;
D.soorten().then((S) => (SOORTEN = S));
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-speel]");
  if (!b || !SOORTEN) return;
  G.speel(metKey(SOORTEN, b.dataset.speel), b.dataset.type, { geheim: b.hasAttribute("data-geheim") });
});
speler.querySelector(".speler-knop").addEventListener("click", () => { const h = G.huidigeOpname(); if (h) G.speel(h.soort, h.type, { geheim: h.geheim }); });
speler.querySelector(".speler-sluit").addEventListener("click", () => G.stop());

// plusje: één keer gespot erbij; de knoppen en de teller in de kop lopen mee
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-gespot]");
  if (!b) return;
  e.preventDefault();
  const n = SP.voegToe(b.dataset.gespot);
  b.classList.remove("plop"); void b.offsetWidth; b.classList.add("plop");
  meldGespot(b.dataset.gespot, n);
});

let meldTimer = 0;
function meldGespot(key, n) {
  let m = document.querySelector(".gespot-melding");
  if (!m) { m = document.createElement("div"); m.className = "gespot-melding"; m.setAttribute("role", "status"); document.body.append(m); }
  const s = SOORTEN_CACHE[key];
  m.innerHTML = `<span><b>${esc(s.nl)}</b> gespot${n > 1 ? ` · ${n}×` : ""}</span><button type="button">Ongedaan</button><a href="/gespot" data-link>Mijn vogels</a>`;
  m.querySelector("button").onclick = () => { SP.haalWeg(key); m.classList.remove("zichtbaar"); };
  m.classList.add("zichtbaar");
  clearTimeout(meldTimer);
  meldTimer = setTimeout(() => m.classList.remove("zichtbaar"), 4500);
}

function werkGespotBij() {
  const mijn = SP.lees();
  document.querySelectorAll("[data-gespot]").forEach((b) => {
    const n = mijn[b.dataset.gespot]?.length || 0;
    b.classList.toggle("ja", n > 0);
    const t = b.querySelector(".gespot-tekst");
    if (t) t.innerHTML = n ? `Gespot <b>${n}×</b>` : "Gespot";
    else {
      let c = b.querySelector(".gespot-n");
      if (n && !c) { c = document.createElement("span"); c.className = "gespot-n"; b.append(c); }
      if (c) { if (n) c.textContent = n; else c.remove(); }
    }
  });
  const aantal = Object.keys(mijn).length;
  document.querySelectorAll(".nav-mijn-n").forEach((x) => { x.textContent = aantal || ""; x.hidden = !aantal; });
}
SP.opVerandering(() => { werkGespotBij(); if (location.pathname === "/gespot") mijnHertekenen?.(); });
werkGespotBij();

function werkKnoppenBij(st) {
  const h = G.huidigeOpname();
  const speeltNu = G.speelt();
  const deel = st?.deel ?? 0;
  document.querySelectorAll("button[data-speel]").forEach((b) => {
    const dezelfde = h && h.soort.key === b.dataset.speel && h.type === b.dataset.type;
    b.classList.toggle("speelt", !!(dezelfde && speeltNu));
    const ring = b.querySelector(".ring");
    if (ring) ring.style.strokeDashoffset = dezelfde ? (125.7 * (1 - deel)).toFixed(1) : "125.7";
  });
  document.querySelectorAll(".scherm").forEach((el) => {
    const hier = !!(h && h.soort.key === el.dataset.held);
    el.classList.toggle("speelt-hier", hier && speeltNu && st?.spectro === "klaar");
    const hint = el.querySelector(".spectro-hint");
    if (hint && hier) hint.textContent = st?.fout || (st?.spectro === "geen" ? "Geen spectrogram voor deze opname. Het geluid speelt wel." : st?.laadt || st?.spectro === "laden" ? "Even laden…" : "");
  });
}

G.opVerandering((st) => {
  const h = st.huidig;
  speler.hidden = !h;
  if (h) {
    if (!spelerGekoppeld) { G.koppelDoek(spelerDoek); spelerGekoppeld = true; }
    const img = speler.querySelector(".speler-plaat");
    // het vakje blijft altijd staan (het hoort bij het raster van de balk); geheim toont een vraagteken
    img.src = h.geheim ? VRAAGTEKEN : h.soort.plaat ? h.soort.plaat.klein : LEEG_VAKJE;
    const naam = speler.querySelector(".speler-naam");
    const wie = h.geheim ? "Welke vogel is dit?" : `${h.soort.nl} · ${h.type}`;
    naam.textContent = st.fout || (st.laadt ? `${h.geheim ? "Geheime vogel" : h.soort.nl} · laden…` : wie);
    speler.classList.toggle("speler-fout", !!st.fout);
    speler.classList.toggle("speler-geheim", !!h.geheim);
    if (h.geheim) naam.removeAttribute("href"); else naam.href = `/soort/${h.soort.slug}`;
    const k = speler.querySelector(".speler-knop");
    k.classList.toggle("speelt", st.speelt);
    k.setAttribute("aria-label", st.speelt ? "Pauzeer" : "Speel verder");
    k.querySelector(".ring").style.strokeDashoffset = (125.7 * (1 - st.deel)).toFixed(1);
  } else if (spelerGekoppeld) { G.ontkoppelDoek(spelerDoek); spelerGekoppeld = false; }
  werkKnoppenBij(st);
});

/* ---------- Kop, overblok en voet ---------- */

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-over]")) {
    e.preventDefault();
    const ga = () => document.getElementById("over").scrollIntoView({ behavior: "smooth" });
    if (document.body.classList.contains("met-over")) ga(); else { naar("/"); setTimeout(ga, 400); }
  }
  if (e.target.closest("[data-naar-zoeken]")) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => document.getElementById("adres").focus(), 350);
  }
});

// hoogte van de kop, voor de kaart die eronder begint
const balk = document.querySelector(".balk");
new ResizeObserver(() => document.documentElement.style.setProperty("--balk-h", `${balk.offsetHeight}px`)).observe(balk);
// alleen het volle scherm schuift onder de kop; andere pagina's beginnen eronder
const volgKop = () => document.body.classList.toggle("onder-kop", !app.firstElementChild?.classList.contains("scherm"));
new MutationObserver(volgKop).observe(app, { childList: true });
volgKop();

// carrousel met platen in het overblok
D.soorten().then((S) => {
  const namen = ["roodborst", "merel", "boerenzwaluw", "ijsvogel", "koolmees", "kievit", "buizerd", "vink", "ekster", "grutto", "groene-specht", "putter"];
  const k = document.querySelector(".over-karrousel");
  k.innerHTML = namen.map((n) => Object.values(S).find((s) => s.slug === n)).filter((s) => s?.plaat).map((s) =>
    `<figure><a href="/soort/${s.slug}" data-link><img src="${s.plaat.src}" alt="Plaat van ${lidwoord(s.nl)} ${esc(klein(s.nl))}" loading="lazy" width="1200" height="1500"></a><figcaption>${esc(s.nl)} · ${esc(plaatKort(s.plaat))}</figcaption></figure>`).join("");
  document.querySelectorAll("[data-karrousel]").forEach((b) => b.addEventListener("click", () => {
    const f = k.querySelector("figure");
    k.scrollBy({ left: (+b.dataset.karrousel) * ((f?.offsetWidth || 300) + 16), behavior: "smooth" });
  }));
});

zoekveld(document.querySelector(".balk .zoek"));
toon();
