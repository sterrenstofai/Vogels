// De Ruimte: één pagina met een router (history.pushState en <a data-link>), zoals ikhooreengeluidje en Voggels.
import * as G from "./geluid.js";
import * as MIJN from "./mijn.js";
import * as PLEK from "./plek.js";
import { positie, opOnder, klok, richting, maanfase, vanavond, dag, avond } from "./hemel.js";
import * as KAART from "./kaart.js";

const app = document.getElementById("app");
const TITEL = "De Ruimte";
let opruimers = [];
let kinderModule = null, ozModule = null;
const ruimOp = () => { for (const f of opruimers) f?.(); opruimers = []; tabOpruimen?.(); tabOpruimen = null; };

/* ---------- Data ---------- */

let _data = null;
async function data() {
  if (_data) return _data;
  const [hemel, fotos, geluid, bollen] = await Promise.all(
    ["/data/hemel.json", "/data/fotos.json", "/data/geluid.json", "/data/bollen.json"].map((u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null)),
  );
  const perSlug = Object.fromEntries(hemel.map((h) => [h.slug, h]));
  _data = { hemel, perSlug, fotos: fotos || {}, geluid: geluid || {}, bollen: bollen || {} };
  return _data;
}

/* ---------- Hulpjes ---------- */

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "");
const etiket = (t) => `<p class="etiket">${esc(t)}</p>`;
const bronLink = (url) => {
  if (!url) return "";
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\.|^en\./, ""); } catch {}
  return `<a class="bron" href="${esc(url)}" rel="noopener">${esc(host)}</a>`;
};
const hoofd = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SOORTEN = { planeet: "Planeten", maan: "Manen", dwergplaneet: "Dwergplaneten", ster: "Sterren" };
const inSoort = (h, k) => h.soort === k;
const SOORT_EEN = { planeet: "Planeet", maan: "Maan", dwergplaneet: "Dwergplaneet", ster: "Ster" };
// Het plusje van Mijn hemel: bij alles wat je aan de hemel kunt zien (de aarde niet: daar sta je op)
const kunJeZien = (h) => h.slug !== "aarde";
const tabsVoor = () => TABS;
const KLEUR = { echt: "echte kleur", benaderd: "kleur benaderd", versterkt: "kleur versterkt", vals: "valse kleur" };
const SPEEL_SVG = `<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="20"/><circle class="ring" cx="22" cy="22" r="20"/><path class="ico-pauze" d="M17 15v14M27 15v14"/><path class="ico-speel" d="M18 14l12 8-12 8z"/></svg>`;
export const GROOT_KNOP = (href) => `<a class="kaart-groot" href="${href}" data-link><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Grote kaart</a>`;
const STER_SVG = `<svg class="ster-teken" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="7" fill="currentColor"/><path d="M50 18v20M50 62v20M18 50h20M62 50h20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;

function beeld(D, h, klein = false) {
  const f = h && D.fotos[h.foto];
  if (f) return `<img src="${f.pad}" alt="" loading="lazy" width="${f.breed}" height="${f.hoog}">`;
  return `<span class="beeld-leeg${h?.soort === "ster" ? " beeld-ster" : ""}">${h?.soort === "ster" ? STER_SVG : esc((h?.titel || "?").charAt(0))}</span>`;
}

/* ---------- Router ---------- */

export function naar(pad, vervang = false) {
  if (vervang) history.replaceState({}, "", pad); else history.pushState({}, "", pad);
  toon();
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
  e.preventDefault();
  naar(a.getAttribute("href"));
});
window.addEventListener("popstate", () => toon());

async function toon() {
  const pad = location.pathname.replace(/\/+$/, "") || "/";
  const D = await data();
  const doe = () => {
    ruimOp();
    document.body.classList.toggle("onder-kop", !pad.startsWith("/hemel/"));
    document.body.classList.toggle("kindermodus", pad === "/kinderen");
    document.body.classList.toggle("kaartmodus", pad === "/hemelkaart");
    kinderModule?.verlaat();
    ozModule?.verlaat();
    if (pad === "/") home(D);
    else if (pad.startsWith("/hemel/")) hemelPagina(D, decodeURIComponent(pad.slice(7)));
    else if (pad === "/hemellichamen") index(D);
    else if (pad === "/vanavond") import("./vanavond.js").then((V) => { document.title = `Wat zie je vanavond? · ${TITEL}`; opruimers.push(V.vanavondPagina(app, D)); });
    else if (pad === "/hemelkaart") import("./hemelkaart.js").then((K) => {
      const q = new URLSearchParams(location.search), t = q.get("tijd");
      document.title = `De hemel boven je · ${TITEL}`;
      opruimers.push(K.hemelkaartPagina(app, D, { markeer: q.get("markeer"), tijd: t && !isNaN(+t) ? new Date(+t) : null }));
    });
    else if (pad === "/mijn") mijnPagina(D);
    else if (pad === "/zoek") zoekPagina(D, new URLSearchParams(location.search).get("q") || "");
    else if (pad.startsWith("/gevonden/")) gevondenPagina(D, pad.slice(10));
    else if (pad === "/onderzoekjes" || pad.startsWith("/onderzoekjes/")) {
      document.title = `Onderzoekjes met Fos · ${TITEL}`;
      import("./onderzoekjes.js").then((OZ) => {
        ozModule = OZ;
        if (pad === "/onderzoekjes") OZ.overzicht(app, D);
        else if (!OZ.onderzoekje(app, pad.slice(14), D)) nietGevonden();
        else document.title = `${app.querySelector("h1")?.textContent} · Onderzoekjes met Fos`;
      });
    }
    else if (pad === "/kinderen") {
      document.title = `De ruimte voor kinderen · ${TITEL}`;
      import("./kinderen.js").then((K) => { kinderModule = K; K.kinderPagina(app, D); });
    }
    else if (pad === "/ontdek") {
      const kies = D.hemel.filter((h) => h.foto);
      return naar(`/hemel/${kies[Math.floor(Math.random() * kies.length)].slug}`, true);
    }
    else nietGevonden();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
    markeerNav(pad);
    werkMijnBij();
  };
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(doe);
  else doe();
}

function markeerNav(pad) {
  for (const a of document.querySelectorAll(".balk-nav a")) {
    const h = a.getAttribute("href");
    if (h === pad || (h !== "/" && pad.startsWith(h + "/"))) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
}

function nietGevonden() {
  document.title = `Niet gevonden · ${TITEL}`;
  app.innerHTML = `<section class="kolom tekst"><h1>Dit kennen we (nog) niet</h1><p>Kijk in de <a href="/hemellichamen" data-link>lijst met hemellichamen</a>, of zoek het op in de kop.</p></section>`;
}

/* ---------- Mijn hemel: het plusje ---------- */

function mijnKnop(sleutel, info, klein = false) {
  const ja = MIJN.heeft(sleutel);
  const attr = `data-mijn="${esc(sleutel)}" data-titel="${esc(info.titel)}" data-naam="${esc(info.naam)}" data-beeld="${esc(info.beeld || "")}" data-pad="${esc(info.pad)}"`;
  return `<button type="button" class="gespot${klein ? " gespot-klein" : ""}${ja ? " ja" : ""}" ${attr} aria-pressed="${ja}" aria-label="${ja ? `Je hebt ${esc(info.naam)} gezien. Haal weg uit Mijn hemel` : `Ik heb ${esc(info.naam)} echt gezien: zet in Mijn hemel`}"><span class="gespot-plus" aria-hidden="true">${ja ? "✓" : "+"}</span>${klein ? "" : `<span class="gespot-tekst">${ja ? "Gezien" : "Ik heb het gezien"}</span>`}</button>`;
}
const infoVan = (D, h) => ({ titel: h.titel, naam: h.naam, beeld: D.fotos[h.foto]?.pad || "", pad: `/hemel/${h.slug}` });

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-mijn]");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const info = { titel: b.dataset.titel, naam: b.dataset.naam, beeld: b.dataset.beeld, pad: b.dataset.pad };
  const ja = MIJN.wissel(b.dataset.mijn, info);
  b.classList.remove("plop"); void b.offsetWidth; if (ja) b.classList.add("plop");
  meldMijn(b.dataset.mijn, info, ja);
});

function meldMijn(sleutel, info, ja) {
  let m = document.querySelector(".gespot-melding");
  if (!m) { m = document.createElement("div"); m.className = "gespot-melding"; m.setAttribute("role", "status"); document.body.append(m); }
  m.innerHTML = `<span><b>${esc(hoofd(info.naam))}</b> ${ja ? "staat in Mijn hemel" : "is weggehaald"}</span><button type="button">Ongedaan</button>${ja ? `<a href="/mijn" data-link>Mijn hemel</a>` : ""}`;
  m.querySelector("button").onclick = () => { MIJN.wissel(sleutel, info); m.classList.remove("zichtbaar"); };
  requestAnimationFrame(() => m.classList.add("zichtbaar"));
  clearTimeout(meldMijn.t);
  meldMijn.t = setTimeout(() => m.classList.remove("zichtbaar"), 4000);
}

function werkMijnBij() {
  const m = MIJN.lees(), n = Object.keys(m).length;
  document.querySelectorAll("[data-mijn]").forEach((b) => {
    const ja = !!m[b.dataset.mijn];
    b.classList.toggle("ja", ja);
    b.setAttribute("aria-pressed", ja);
    const p = b.querySelector(".gespot-plus"); if (p) p.textContent = ja ? "✓" : "+";
    const t = b.querySelector(".gespot-tekst");
    if (t) t.textContent = ja ? "Gezien" : "Ik heb het gezien";
  });
  const teller = document.querySelector(".nav-mijn-n");
  if (teller) { teller.hidden = !n; teller.textContent = n; }
}
MIJN.opVerandering(() => { werkMijnBij(); if (location.pathname === "/mijn") mijnPagina(_data); });

const datumNL = (d) => { const [j, mnd, dg] = d.slice(0, 10).split("-"); return `${+dg} ${["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"][+mnd - 1]} ${j}`; };

function mijnPagina(D) {
  document.title = `Mijn hemel · ${TITEL}`;
  const m = MIJN.lees();
  const lijst = Object.entries(m).sort((a, b) => b[1].datum.localeCompare(a[1].datum));
  const planeten = D.hemel.filter((h) => h.soort === "planeet" && h.slug !== "aarde");
  const gezienPl = planeten.filter((p) => m[p.slug]).length;
  app.innerHTML = `<section class="breed mijn">
    ${etiket("Alleen op dit apparaat")}
    <h1 class="index-kop">Mijn hemel</h1>
    <p class="held-sub">Wat je zelf echt aan de hemel hebt gezien, met de datum. Tik op het plusje als je het gezien hebt: buiten, door het raam of door een verrekijker.</p>
    <div class="mijn-cijfers"><div><strong>${lijst.length}</strong><span>gezien</span></div><div><strong>${gezienPl} van ${planeten.length}</strong><span>planeten gezien</span></div></div>
    <div class="mijn-balk" aria-hidden="true"><i style="width:${(gezienPl / planeten.length) * 100}%"></i></div>
    ${lijst.length ? `<div class="raster hemels">${lijst.map(([k, x]) => `<article class="hemel-kaart">
        <a class="hemel-beeld" href="${esc(x.pad)}" data-link aria-hidden="true" tabindex="-1">${x.beeld ? `<img src="${esc(x.beeld)}" alt="" loading="lazy">` : `<span class="beeld-leeg">${esc((x.titel || "?").charAt(0))}</span>`}</a>
        <div class="hemel-tekst"><a class="hemel-titel" href="${esc(x.pad)}" data-link>${esc(x.titel)}</a>
        <p class="mijn-data">Gezien op ${datumNL(x.datum)}</p>
        <button type="button" class="mijn-min" data-mijn="${esc(k)}" data-titel="${esc(x.titel)}" data-naam="${esc(x.naam)}" data-beeld="${esc(x.beeld || "")}" data-pad="${esc(x.pad)}"><span class="gespot-plus" hidden>✓</span>Haal weg</button></div>
      </article>`).join("")}</div>` : `<div class="mijn-leeg"><p>Nog niets gezien. Kijk wat er vanavond te zien is, ga naar buiten, en tik daarna op het plusje.</p><p><a class="knop-pil knop-accent" href="/vanavond" data-link>Wat zie je vanavond?</a></p></div>`}
    <p class="mijn-noot zacht">Je lijst staat alleen in deze browser, op dit apparaat. Wij krijgen hem niet te zien. Op een ander apparaat begin je opnieuw.</p>
  </section>`;
}

/* ---------- Kaartjes, home en index ---------- */

function kaart(D, h) {
  const labels = [h.nagekeken ? "nagekeken" : null].filter(Boolean);
  return `<article class="hemel-kaart">
    <a class="hemel-beeld${h.soort === "ster" ? " is-ster" : ""}${D.bollen[h.slug] ? " is-bol" : ""}" href="/hemel/${h.slug}" data-link aria-hidden="true" tabindex="-1">${D.bollen[h.slug] ? `<canvas class="hemel-bol" data-bol="${h.slug}"></canvas><span class="hemel-bol-label">${esc(D.bollen[h.slug].label)}</span>` : beeld(D, h, true)}</a>
    ${kunJeZien(h) ? mijnKnop(h.slug, infoVan(D, h), true) : ""}
    <div class="hemel-tekst">
      <a class="hemel-titel" href="/hemel/${h.slug}" data-link>${esc(h.titel)}</a>
      <span class="hemel-soort">${SOORT_EEN[h.soort]}${h.ouder && h.soort === "maan" ? ` van ${esc(D.perSlug[h.ouder]?.naam)}` : ""}</span>
      ${labels.length ? `<span class="labels">${labels.map((l) => `<span class="label">${l}</span>`).join("")}</span>` : ""}
    </div>
  </article>`;
}

function home(D) {
  document.title = `${TITEL} · Wat staat er vanavond boven je huis?`;
  app.innerHTML = `
  <section class="held held-hemel">
    <canvas class="held-doek" aria-hidden="true"></canvas>
    <div class="held-binnen breed">
      ${etiket("De ruimte, voor ouders en kinderen")}
      <h1>Wat staat er <span class="accent">vanavond</span> boven je huis?</h1>
      <p class="held-sub">De zon, de maan, de planeten, hun manen en sterren. Met echte foto's, en uitgerekend in je eigen browser: wat je vanavond kunt zien, en waar je moet kijken.</p>
      <div class="held-knoppen">
        <a class="knop-pil knop-accent" href="/vanavond" data-link>Wat zie je vanavond?</a>
        <a class="knop-pil" href="/hemelkaart" data-link>Kijk zelf rond</a>
        <a class="knop-pil" href="/hemel/maan" data-link>Begin bij de maan</a>
        <a class="knop-pil" href="/kinderen" data-link>Voor kinderen</a>
      </div>
    </div>
    <a class="held-onder breed" href="/hemelkaart" data-link><span class="label">simulatie</span><span data-held-waar>De hemel boven Nederland</span><span class="held-pijl">Kijk zelf rond →</span></a>
  </section>
  <section class="breed blok vanavond-kort" data-vanavond-kort><p class="laden"><span></span>Even uitrekenen wat er vanavond te zien is…</p></section>
  ${lijst(D, "Alle hemellichamen", true)}
  <section class="breed blok"><a class="oz-teaser" href="/onderzoekjes" data-link>
    <span class="oz-teaser-tekst"><span class="oz-boventitel">Elke week</span><strong>Onderzoekjes met Fos</strong><span>Zes keer samen op onderzoek: eerst op de site, dan naar buiten of naar het raam om echt te kijken.</span></span>
    <span class="knop-pil knop-donker">Begin</span></a></section>`;
  koppelLijst(D);
  const vak = app.querySelector("[data-vanavond-kort]");
  const teken = () => {
    if (!vak.isConnected) return;
    const p = PLEK.huidig(), v = vanavond(D, p, new Date());
    const blootOog = v.lijst.filter((x) => x.blootOog && x.item.soort !== "ster").slice(0, 4);
    const f = maanfase(new Date());
    vak.innerHTML = `<div class="blok-kop"><h2>Vanavond ${p.standaard ? "in Nederland" : `in ${esc(p.naam)}`}</h2><a class="knop-pil" href="/vanavond" data-link>Alles over vanavond</a></div>
      <div class="vk-rij">${blootOog.map((x) => `<a class="vk" href="/hemel/${x.item.slug}" data-link><span class="vk-beeld">${beeld(D, x.item, true)}</span><strong>${esc(x.item.titel)}</strong><span>${x.van && x.tot && x.tot > x.van ? `${klok(x.van)}–${klok(x.tot)}` : `om ${klok(x.tijd)}`}, in het ${richting(x.az)}</span></a>`).join("")
      || `<p class="leeg-zin">Tussen het donker worden en middernacht staat er geen planeet hoog genoeg. Kijk op <a href="/vanavond" data-link>vanavond</a> wat er later in de nacht opkomt.</p>`}
      <a class="vk" href="/hemel/maan" data-link><span class="vk-beeld vk-maan">${maanSvg(f.hoek)}</span><strong>De maan</strong><span>${Math.round(f.verlicht * 100)}% verlicht, ${f.naam}</span></a></div>
      <p class="noot zacht">Uitgerekend voor ${esc(p.naam)}. ${p.standaard ? `<a href="/vanavond" data-link>Kies je eigen plek</a>.` : ""} Of het bewolkt is, weet de site niet: kijk even naar buiten.</p>`;
  };
  requestAnimationFrame(teken);
  opruimers.push(PLEK.opVerandering(teken));
  heldHemel(D);
}

// De kop van de homepage: de echte hemel, langzaam draaiend. Niet zelf te bedienen (dat botst met scrollen);
// wie wil rondkijken, gaat naar /hemelkaart. Overdag de hemel van vanavond, als het donker is.
function heldHemel(D) {
  const sectie = app.querySelector(".held-hemel"), doek = sectie.querySelector(".held-doek");
  const stil = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let h3d = null, lus = 0, zichtbaar = true, vorige = 0, weg = false;
  const t0 = performance.now();
  // welk moment: nu als het donker is, anders vanavond als het donker wordt
  const moment = () => {
    const nu = new Date(), p = PLEK.huidig();
    if (positie(D.perSlug.zon, nu, p, D).hoogte < -10) return { t: new Date(Math.floor(+nu / 60e3) * 60e3), nu: true };
    let av = avond(nu, p);
    if (av.donker < nu) av = avond(new Date(+nu + 12 * 3600e3), p);
    return { t: av.donker, nu: false };
  };
  let m = moment();
  const zetTekst = () => {
    const p = PLEK.huidig(), waar = p.standaard ? "Nederland" : p.naam;
    sectie.querySelector("[data-held-waar]").textContent = m.nu ? `De hemel boven ${waar}, nu` : `De hemel boven ${waar}, vanavond om ${klok(m.t)}`;
  };
  zetTekst();
  const stap = (nu) => {
    lus = 0;
    if (weg || !doek.isConnected) return;
    if (zichtbaar && !document.hidden && nu - vorige > 32) {
      vorige = nu;
      const w = doek.clientWidth, h = doek.clientHeight;
      const fov = w < 700 ? 110 : 100;
      // de horizon op ongeveer vier vijfde van de hoogte
      const S = (Math.min(w, h) / 2) / (2 * Math.tan((fov * Math.PI) / 720));
      const pitch = (2 * Math.atan((0.36 * h) / (2 * S)) * 180) / Math.PI;
      Object.assign(h3d.cam, { yaw: (165 + (stil ? 0 : ((nu - t0) / 1000) * 1.2)) % 360, pitch, fov });
      h3d.teken({ plek: PLEK.huidig(), t: m.t, lagen: { lijnen: true, beeldNamen: false, sterNamen: false, namen: false }, tijd: nu, beweging: !stil });
      if (!sectie.classList.contains("held-klaar")) sectie.classList.add("held-klaar");
    }
    if (!stil) lus = requestAnimationFrame(stap);
  };
  const start = () => { if (!lus && !weg && h3d) lus = requestAnimationFrame(stap); };
  const io = new IntersectionObserver(([e]) => { zichtbaar = e.isIntersecting; if (zichtbaar) start(); });
  io.observe(sectie);
  const ro = new ResizeObserver(() => { vorige = 0; start(); });
  ro.observe(doek);
  doek.addEventListener("click", () => naar("/hemelkaart"));
  const klokje = setInterval(() => { m = moment(); zetTekst(); }, 60e3);
  const wegPlek = PLEK.opVerandering(() => { m = moment(); zetTekst(); vorige = 0; start(); });
  // pas laden als de pagina er staat
  setTimeout(() => import("./hemel3d.js").then(async ({ Hemel3D }) => {
    if (weg) return;
    const nieuw = new Hemel3D(doek, D);
    await nieuw.laad();
    if (weg) return;
    h3d = nieuw; // pas tekenen als de sterren er zijn
    start();
  }), 50);
  opruimers.push(() => { weg = true; cancelAnimationFrame(lus); io.disconnect(); ro.disconnect(); clearInterval(klokje); wegPlek(); });
}

// De maan zoals hij er nu uitziet: verlicht deel naar de fasehoek (0 = nieuw, 180 = vol). Vanaf het noordelijk halfrond: wassend rechts verlicht.
export function maanSvg(hoek, maat = 60) {
  const k = Math.cos((hoek * Math.PI) / 180); // 1 = nieuw, -1 = vol
  const r = 45, wassend = hoek < 180;
  const rx = Math.abs(k) * r;
  const kant = wassend ? 1 : 0;
  const binnen = k > 0 ? (wassend ? 0 : 1) : (wassend ? 1 : 0);
  return `<svg viewBox="0 0 100 100" width="${maat}" height="${maat}" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="#3A3A3A"/>
    <path d="M50 ${50 - r} A${r} ${r} 0 0 ${kant} 50 ${50 + r} A${rx} ${r} 0 0 ${binnen} 50 ${50 - r}Z" fill="#EDEDED"/></svg>`;
}

function index(D) {
  document.title = `Alle hemellichamen · ${TITEL}`;
  app.innerHTML = lijst(D, "Alle hemellichamen", false);
  koppelLijst(D);
}

function lijst(D, kop, opHome) {
  return `<section class="blok breed" id="lijst">
    <div class="blok-kop">${opHome ? `<h2>${esc(kop)}</h2>` : `<h1 class="index-kop">${esc(kop)}</h1>`}<span class="mono zacht" data-teller></span></div>
    <div class="index-filters">
      <div class="index-rij"><label class="sr" for="filter">Zoek in de lijst</label><input class="veld" id="filter" type="search" placeholder="Zoek op naam" autocomplete="off"></div>
      <div class="chips" role="group" aria-label="Filter">${Object.entries(SOORTEN).map(([k, v]) => `<button class="chip" type="button" data-soort="${k}" aria-pressed="false">${esc(v)}</button>`).join("")}</div>
    </div>
    <div class="raster hemels" data-raster></div>
    <p class="noot zacht">Deze lijst is met de hand gekozen. Bij het label <span class="label">nagekeken</span> zijn de weetjes met de hand geschreven en is elk weetje nagekeken tegen de bron. Zoek je iets anders? Het zoekveld bovenaan zoekt ook in Wikidata, dan <span class="label label-zacht">niet nagekeken</span>. <a href="/hoe-dit-werkt">Hoe dit werkt</a></p>
  </section>`;
}

function koppelLijst(D) {
  const raster = app.querySelector("[data-raster]"), veld = app.querySelector("#filter"), teller = app.querySelector("[data-teller]");
  const aan = new Set();
  const teken = () => {
    const q = norm(veld.value);
    const l = D.hemel.filter((h) => (!q || norm(`${h.titel} ${h.naam}`).includes(q)) && (!aan.size || [...aan].some((k) => inSoort(h, k))));
    raster.innerHTML = l.map((h) => kaart(D, h)).join("") || `<p class="zacht">Niets gevonden met deze filters.</p>`;
    teller.textContent = `${l.length} van ${D.hemel.length}`;
    werkMijnBij();
  };
  veld.addEventListener("input", teken);
  koppelBollen(D, raster);
  for (const b of app.querySelectorAll("[data-soort]")) b.addEventListener("click", () => {
    const k = b.dataset.soort;
    if (aan.has(k)) aan.delete(k); else aan.add(k);
    b.setAttribute("aria-pressed", aan.has(k));
    teken();
  });
  teken();
}

// De bollen in het overzicht: een kaart van echte foto's om een bol gevouwen, stil en belicht.
// Met de muis erover draait hij langzaam (alleen met een muis, één tegelijk).
function koppelBollen(D, raster) {
  if (!Object.keys(D.bollen).length) return;
  const stil = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const muis = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const B = import("./bol.js");
  const stand = new WeakMap();
  const teken = async (doek) => {
    const b = D.bollen[doek.dataset.bol], mod = await B, k = await mod.laadKaart(b.pad), opt = await mod.optiesVoor(b);
    const dpr = Math.min(2, window.devicePixelRatio || 1), n = Math.round(doek.clientWidth * dpr);
    if (!n) return;
    if (doek.width !== n) doek.width = doek.height = n;
    if (!stand.has(doek)) stand.set(doek, b.begin ?? 0.5);
    mod.tekenBol(doek, k, stand.get(doek), opt);
    doek.classList.add("klaar");
  };
  // pas tekenen als de tegel in beeld komt
  const io = new IntersectionObserver((lijst) => { for (const x of lijst) if (x.isIntersecting) { io.unobserve(x.target); teken(x.target); } }, { rootMargin: "200px" });
  const kijk = () => raster.querySelectorAll("canvas[data-bol]:not(.klaar)").forEach((d) => io.observe(d));
  new MutationObserver(kijk).observe(raster, { childList: true });
  kijk();
  if (!muis || stil) return;
  let actief = null;
  raster.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const vak = e.target.closest(".hemel-beeld.is-bol");
    if (!vak || vak === actief?.vak) return;
    const doek = vak.querySelector("canvas"), b = D.bollen[doek.dataset.bol];
    if (actief) { cancelAnimationFrame(actief.anim); actief.vak.classList.remove("draait"); }
    const mij = actief = { vak, anim: 0 };
    vak.classList.add("draait");
    Promise.all([B, B.then((m) => m.laadKaart(b.pad)), B.then((m) => m.optiesVoor(b))]).then(([mod, k, opt]) => {
      let vorige = performance.now();
      const stap = (nu) => {
        if (actief !== mij) return;
        stand.set(doek, (stand.get(doek) ?? 0.5) - (nu - vorige) / 20000); vorige = nu; // van west naar oost
        mod.tekenBol(doek, k, stand.get(doek), opt);
        mij.anim = requestAnimationFrame(stap);
      };
      mij.anim = requestAnimationFrame(stap);
    });
  });
  raster.addEventListener("pointerout", (e) => {
    if (actief && !actief.vak.contains(e.relatedTarget)) { cancelAnimationFrame(actief.anim); actief.vak.classList.remove("draait"); actief = null; }
  });
}

/* ---------- Eén scherm per hemellichaam ---------- */

const TABS = [["foto", "Foto"], ["schaal", "Op schaal"], ["baan", "Baan"], ["geluid", "Geluid"], ["nu", "Nu"]];

function verwant(D, h) {
  if (h.soort === "maan" || h.manen?.length) {
    const ouder = h.soort === "maan" ? D.perSlug[h.ouder] : h;
    return [ouder, ...D.hemel.filter((x) => x.ouder === ouder.slug && x.soort === "maan")];
  }
  if (h.soort === "planeet" || h.slug === "zon") return [D.perSlug.zon, ...D.hemel.filter((x) => x.soort === "planeet").sort((a, b) => a.nr - b.nr)];
  return D.hemel.filter((x) => x.soort === h.soort || (h.soort === "dwergplaneet" && x.slug === "pluto"));
}

function hemelPagina(D, slug) {
  const h = D.perSlug[slug];
  if (!h) return nietGevonden();
  document.title = `${hoofd(h.naam)} · ${TITEL}`;
  const v = verwant(D, h).filter(Boolean);
  const tabs = D.bollen[h.slug] ? [["bol", "3D"], ...tabsVoor(h)] : tabsVoor(h);
  const startTab = tabs.some(([k]) => k === new URLSearchParams(location.search).get("tab")) ? new URLSearchParams(location.search).get("tab") : tabs[0][0];
  const weetjes = [
    ["Soort", `${SOORT_EEN[h.soort]}${h.soort === "maan" && h.ouder ? ` van ${esc(D.perSlug[h.ouder]?.naam)}` : ""}`],
    ...h.cijfers.slice(0, 5).map((c) => [esc(c.naam), `${esc(c.tekst)} ${bronLink(c.bron)}`]),
    ["Status", h.nagekeken ? `<span class="label">nagekeken</span>` : `<span class="label label-zacht">niet nagekeken</span>`],
  ];
  app.innerHTML = `
  <section class="scherm" data-hemel="${h.slug}">
    <div class="podium">
      ${tabs.map(([k]) => `<div class="podium-paneel paneel-${k}" id="paneel-${k}" role="tabpanel" aria-labelledby="tab-${k}" ${k === startTab ? "" : "hidden"}></div>`).join("")}
      <div class="weergave" role="tablist" aria-label="Weergave" ${tabs.length < 2 ? "hidden" : ""}>${tabs.map(([k, t]) => `<button type="button" role="tab" id="tab-${k}" aria-controls="paneel-${k}" aria-selected="${k === startTab}" data-tab="${k}">${t}</button>`).join("")}</div>
    </div>
    <div class="scherm-titel">
      <div class="titel-rij"><h1>${esc(h.titel)}</h1></div>
      <p class="scherm-sub">${esc(h.kort)}</p>
      ${kunJeZien(h) ? mijnKnop(h.slug, infoVan(D, h)) : ""}
      <dl class="weetjes">${weetjes.map(([k, w]) => `<dt>${k}</dt><dd>${w}</dd>`).join("")}</dl>
    </div>
    <div class="scherm-strook">
      <nav class="strook" aria-label="Verwante hemellichamen">${v.map((x) => `<a class="strook-item${x.slug === h.slug ? " actief" : ""}" href="/hemel/${x.slug}" data-link title="${esc(x.titel)}"><span class="strook-beeld">${beeld(D, x, true)}</span><span class="strook-naam">${esc(x.titel)}</span></a>`).join("")}</nav>
      <a class="omgeving" href="?tab=nu" data-tab-link="nu" aria-label="Waar staat ${esc(h.naam)} nu aan de hemel?"><p class="omgeving-label">Nu aan de hemel</p><canvas class="omgeving-kaart"></canvas></a>
    </div>
  </section>`;
  for (const b of app.querySelectorAll("[data-tab]")) b.addEventListener("click", () => kiesTab(D, h, b.dataset.tab));
  app.querySelector("[data-tab-link]").addEventListener("click", (e) => { e.preventDefault(); kiesTab(D, h, "nu"); app.querySelector(".podium").scrollIntoView({ behavior: "smooth", block: "start" }); });
  kiesTab(D, h, startTab);
  const mini = () => {
    const doek = app.querySelector(".omgeving-kaart");
    if (!doek) return;
    const leeg = h.slug === "aarde" ? "Hier sta je op." : null;
    if (leeg) { const a = doek.closest(".omgeving"); a.replaceWith(Object.assign(document.createElement("p"), { className: "omgeving omgeving-leeg", textContent: leeg })); return; }
    KAART.teken(doek, D, PLEK.huidig(), new Date(), { klein: true, markeer: h.slug, lijnen: false });
  };
  requestAnimationFrame(mini);
  opruimers.push(PLEK.opVerandering(mini));
}

let tabOpruimen = null;
function kiesTab(D, h, tab) {
  tabOpruimen?.(); tabOpruimen = null;
  for (const b of app.querySelectorAll("[data-tab]")) b.setAttribute("aria-selected", b.dataset.tab === tab);
  for (const p of app.querySelectorAll(".podium-paneel")) p.hidden = p.id !== `paneel-${tab}`;
  const vak = app.querySelector(`#paneel-${tab}`);
  const standaard = D.bollen[h.slug] ? "bol" : "foto";
  const url = new URL(location.href); if (tab === standaard) url.searchParams.delete("tab"); else url.searchParams.set("tab", tab);
  history.replaceState(history.state, "", url.pathname + url.search);
  if (tab === "bol") paneelBol(D, h, vak);
  else if (tab === "foto") vak.innerHTML = paneelFoto(D, h);
  else if (tab === "schaal") vak.innerHTML = paneelSchaal(D, h);
  else if (tab === "geluid") { vak.innerHTML = paneelGeluid(D, h); koppelGeluid(D, h, vak); }
  else if (tab === "baan") import("./baan.js").then((B) => { if (vak.isConnected && !vak.hidden) tabOpruimen = B.baan(vak, h, D); });
  else if (tab === "nu") paneelNu(D, h, vak);
}

function fotoOnderschrift(f) {
  if (!f) return "";
  const kleur = f.kleur && KLEUR[f.kleur] ? `<span class="label${f.kleur === "echt" ? "" : " label-zacht"}">${KLEUR[f.kleur]}</span> ` : "";
  return `<figcaption>${kleur}${esc(f.uitleg || "")} <span class="zacht">Foto: ${esc(f.credit)}${f.uitsnede ? " (uitsnede)" : ""}, <a href="${esc(f.pagina)}" rel="noopener">${esc(f.bron)}</a>, ${esc(f.licentie)}.</span></figcaption>`;
}

function feitjes(h) {
  const wt = h.weetjes.length ? `<div class="weetjes-lijst">${etiket(h.nagekeken ? "Weetjes, nagekeken" : "Weetjes")}<ul>${h.weetjes.map((w) => `<li>${esc(w.tekst)} ${bronLink(w.bron)}</li>`).join("")}</ul></div>` : "";
  const alle = `<details class="alle-cijfers"><summary>Alle getallen, met bron</summary><dl class="weetjes">${h.cijfers.map((c) => `<dt>${esc(c.naam)}</dt><dd>${esc(c.tekst)}${c.uitleg ? ` <span class="zacht">(${esc(c.uitleg)})</span>` : ""} ${bronLink(c.bron)}</dd>`).join("")}</dl></details>`;
  return wt + alle;
}

/* 3D: de bol zo groot mogelijk, draaiend; een kaart van echte foto's om een bol gevouwen */
function paneelBol(D, h, vak) {
  const b = D.bollen[h.slug];
  vak.innerHTML = `<figure class="bol-podium">
      <canvas class="bol-groot" aria-label="${esc(hoofd(h.naam))} als draaiende bol. Sleep om hem te draaien."></canvas>
      <figcaption><span class="label${b.kleur === "echt" ? "" : " label-zacht"}">${esc(b.label)}</span> ${esc(b.uitleg)} Geen foto: een kaart van veel foto's, om een bol gevouwen. <span class="zacht">Sleep om hem te draaien. Kaart: ${esc(b.maker)}, <a href="${esc(b.bron)}" rel="noopener">bron</a>, ${esc(b.licentie)}.</span></figcaption>
    </figure>${feitjes(h)}`;
  const stil = matchMedia("(prefers-reduced-motion: reduce)").matches;
  import("./bolgl.js").then((G) => { if (vak.isConnected && !vak.hidden) tabOpruimen = G.groteBol(vak.querySelector(".bol-groot"), b, { stil }); });
}

function paneelFoto(D, h) {
  const f = D.fotos[h.foto];
  const wt = feitjes(h), alle = "";
  if (!f) {
    const uitleg = h.soort === "ster" ? "Van een ster zie je op een foto alleen een stip, zelfs met de grootste telescoop. Kijk bij Nu waar hij aan de hemel staat." : h.slug === "eris" ? "Er bestaat geen foto waarop je Eris echt ziet: ook voor de ruimtetelescoop Hubble is ze een stipje. Een tekening laten we hier niet zien, want die zou er net zo echt uitzien als een foto." : "Hiervan hebben we geen foto gevonden met een vrije licentie.";
    return `<div class="foto-podium foto-leeg"><div class="foto-nacht">${h.soort === "ster" ? STER_SVG : ""}<p>${esc(uitleg)}</p></div></div>${wt}${alle}`;
  }
  return `<figure class="foto-podium"><div class="foto-nacht"><img src="${f.pad}" alt="${esc(hoofd(h.naam))}, ${esc(f.titel || "")}" width="${f.breed}" height="${f.hoog}"></div>${fotoOnderschrift(f)}</figure>${wt}${alle}`;
}

/* Op schaal: hoe groot, en hoe ver */
function paneelSchaal(D, h) {
  const aarde = D.perSlug.aarde, dA = aarde.schaal.diameter_km, d = h.schaal?.diameter_km;
  let groot = "";
  if (d) {
    const groter = d > dA, rGroot = 90, rKlein = Math.max(1.2, (Math.min(d, dA) / Math.max(d, dA)) * rGroot);
    const [rH, rA] = groter ? [rGroot, rKlein] : [rKlein, rGroot];
    const zin = h.slug === "aarde" ? "Dit is de maat waar we alles mee vergelijken." : groter
      ? `${hoofd(h.naam)} is ${(d / dA).toLocaleString("nl-NL", { maximumFractionDigits: d / dA < 10 ? 1 : 0 })} keer zo breed als de aarde. Op deze tekening is de aarde ${rA < 3 ? "maar een stipje" : "het bolletje rechts"}.`
      : `De aarde is ${(dA / d).toLocaleString("nl-NL", { maximumFractionDigits: dA / d < 10 ? 1 : 0 })} keer zo breed als ${h.naam}.`;
    const breed = h.slug === "zon" ? 0 : 1;
    groot = `${etiket("Hoe groot, naast de aarde")}<p class="schaal-zin">${esc(zin)}</p>
      <svg class="schaal-svg" viewBox="0 0 420 220" aria-label="${esc(h.titel)} en de aarde op dezelfde schaal">
        ${h.slug === "zon" ? `<circle cx="-160" cy="110" r="${rH * 0 + 300}" fill="#F6D58A"/>` : `<circle cx="${20 + rH}" cy="110" r="${rH}" fill="${h.soort === "ster" ? "#F6D58A" : "#D9D9D9"}" stroke="#232323" stroke-width="1"/>`}
        ${h.slug !== "aarde" ? `<circle cx="${h.slug === "zon" ? 330 : 40 + 2 * rH + rA + 30}" cy="110" r="${h.slug === "zon" ? 300 / 109 : rA}" fill="#3D6FB0"/>` : ""}
        <text x="${h.slug === "zon" ? 120 : 20 + rH}" y="214" text-anchor="middle">${esc(h.titel)}</text>
        ${h.slug !== "aarde" ? `<text x="${h.slug === "zon" ? 330 : 40 + 2 * rH + rA + 30}" y="${h.slug === "zon" ? 130 : 110 + rA + 18}" text-anchor="middle">aarde</text>` : ""}
      </svg>${h.slug === "zon" ? `<p class="noot zacht">De zon past niet op het scherm: dit is een stukje van haar rand.</p>` : ""}`;
    void breed;
  } else if (h.soort === "ster") {
    groot = `${etiket("Hoe groot")}<p class="schaal-zin">Hoe groot een ster precies is, is lastig te meten. Wat wel zeker is: ook de kleinste ster die je met je blote oog ziet, is veel groter dan de aarde.</p>`;
  }
  // hoe ver: met de auto (100 km/u, zonder stoppen) en met het licht
  const km = h.soort === "ster" ? null : h.soort === "maan" && h.ouder !== "aarde" ? D.perSlug[h.ouder]?.baan?.a_km : h.slug === "maan" ? 384400 : h.slug === "zon" ? 149.6e6 : h.baan?.a_km ? Math.abs(h.baan.a_km - 149.6e6) : null;
  const lj = h.soort === "ster" ? parseFloat((h.cijfers.find((c) => c.naam === "Afstand")?.tekst || "").replace(/\./g, "").replace(",", ".")) : null;
  const ver = km ? autoZin(h, km) : lj ? `Het licht van ${esc(h.naam)} doet er ${lj.toLocaleString("nl-NL")} jaar over om bij ons te komen. Het licht dat je vanavond ziet, vertrok dus ${lj > 50 ? "lang voordat je opa en oma geboren werden" : lj > 20 ? "toen je ouders misschien nog kinderen waren" : "een paar jaar geleden"}. Met de auto zou je er nooit komen.` : h.slug === "aarde" ? "" : "";
  return `<div class="paneel-binnen schaal">${groot}${ver ? `${etiket("Hoe ver")}<p class="schaal-zin">${ver}</p>` : ""}
    <p class="noot zacht">Uitgerekend uit de getallen bij dit hemellichaam (zie Alle getallen bij Foto).</p></div>`;
}
function autoZin(h, km) {
  const uren = km / 100, jaren = uren / 24 / 365.25;
  const auto = uren < 48 ? `${Math.round(uren)} uur` : jaren < 1 ? `${Math.round(uren / 24)} dagen` : `${Math.round(jaren).toLocaleString("nl-NL")} jaar`;
  const licht = km / 299792.458;
  const lichtZin = licht < 2 ? `${licht.toLocaleString("nl-NL", { maximumFractionDigits: 2 })} seconde` : licht < 120 ? `${Math.round(licht)} seconden` : licht < 7200 ? `${Math.round(licht / 60)} minuten` : `${(licht / 3600).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} uur`;
  const van = h.soort === "maan" && h.ouder !== "aarde" ? `van de aarde naar ${D_naam(h)}` : h.slug === "maan" || h.slug === "zon" ? `van de aarde naar ${h.naam}` : `van de aarde naar ${h.naam}, als die ongeveer het dichtst bij staat,`;
  return `Met de auto, 100 kilometer per uur en zonder stoppen, doe je ${van} ${auto} over. Het licht doet er ${lichtZin} over.`;
}
const D_naam = (h) => _data.perSlug[h.ouder]?.naam;

/* Geluid: eerlijk zeggen dat er in de ruimte geen geluid is */
const SOORT_GELUID = {
  opname: ["echte opname", "Opgenomen met een microfoon, in de lucht van dit hemellichaam zelf."],
  plasma: ["meting, hoorbaar gemaakt", "Geen geluid door de lucht: elektrische golven, opgevangen met een antenne en afgespeeld als geluid."],
  sonificatie: ["sonificatie", "Metingen omgezet in muziek. Welke klanken het werden, kozen mensen."],
  reconstructie: ["reconstructie", "In een lab nagemaakt op basis van metingen. Geen opname."],
};
function paneelGeluid(D, h) {
  const g = h.geluid || [];
  const eerlijk = `<p class="geluid-eerlijk">In de ruimte is geen geluid: daar is geen lucht om het te dragen. ${h.slug === "mars" || h.slug === "titan" || h.slug === "aarde" || h.slug === "venus" ? "Op een planeet of maan mét lucht kan het wel." : ""}</p>`;
  if (!g.length) return `<div class="paneel-binnen">${eerlijk}<div class="leeg-blok"><p class="leeg-kop">Hier is geen geluid van</p><p>Van ${esc(h.naam)} is geen opname of meting die we kunnen laten horen. Dat is niet erg: zo is de ruimte meestal. Stil.</p></div></div>`;
  return `<div class="paneel-binnen">${eerlijk}<ul class="geluiden">${g.map((x, i) => {
    const [label, uitleg] = SOORT_GELUID[x.soort] || ["geluid", ""];
    return `<li class="geluid" data-geluid="${i}">
      <div class="geluid-kop">${x.pad ? `<button class="knop-rond knop-groot" type="button" data-speel="${i}" aria-label="Speel: ${esc(x.titel)}">${SPEEL_SVG}</button>` : ""}
        <div><span class="label${x.soort === "opname" ? "" : " label-zacht"}">${label}</span><strong>${esc(x.titel)}</strong></div></div>
      <p>${esc(x.uitleg || uitleg)} ${x.pad ? "" : `Dit geluid staat niet op onze site; je luistert het bij de maker.`}</p>
      ${x.pad ? `<div class="spectro-vlak"><canvas data-spectro aria-label="Geluidsbeeld"></canvas></div>` : ""}
      <p class="noot zacht">${x.pad ? `Geluid: ${esc(x.credit)} ${esc(x.licentie)}.${x.ingekort ? " Ingekort tot een minuut." : ""} ` : ""}<a href="${esc(x.pagina)}" rel="noopener">${x.pad ? "Bron" : "Luister bij de bron"}</a></p>
    </li>`; }).join("")}</ul>
    <p class="noot zacht">Het geluidsbeeld: van links naar rechts de tijd, van onder naar boven laag naar hoog. Hoe donkerder, hoe harder.</p></div>`;
}
function koppelGeluid(D, h, vak) {
  const item = (i) => ({ id: `geluid:${h.slug}:${i}`, titel: h.geluid[i].titel, artiest: hoofd(h.naam), url: h.geluid[i].pad, hoes: D.fotos[h.foto]?.pad });
  vak.querySelectorAll("[data-speel]").forEach((b) => {
    const i = +b.dataset.speel;
    b.addEventListener("click", () => G.speel(item(i))); // in de tik zelf, voor iOS
    const doek = b.closest(".geluid").querySelector("canvas[data-spectro]");
    if (doek) { G.koppelDoek(doek, { modus: "heel", id: item(i).id }); G.maakSpectrum(item(i).id, h.geluid[i].pad); }
  });
}

/* Nu: waar staat het vanavond aan de hemel? */
function paneelNu(D, h, vak) {
  vak.innerHTML = `<div class="paneel-binnen nu">
    <div class="nu-twee">
      <div class="nu-kaart"><div class="kaart-vak"><canvas class="sterrenkaart" aria-label="Sterrenkaart met ${esc(h.naam)}"></canvas>${GROOT_KNOP(`/hemelkaart?markeer=${h.slug}`)}</div><p class="noot zacht kaart-uitleg">Zo staat de hemel nu boven je, als je op je rug ligt met je hoofd naar het noorden. De rand is de horizon.</p></div>
      <div class="nu-tekst" data-nu-tekst></div>
    </div>
    <div data-plek></div>
  </div>`;
  PLEK.kiezer(vak.querySelector("[data-plek]"));
  const teken = () => {
    if (!vak.isConnected || vak.hidden) return;
    const p = PLEK.huidig(), nu = new Date();
    const tekst = vak.querySelector("[data-nu-tekst]");
    if (h.slug === "aarde") { tekst.innerHTML = `<p class="nu-groot">Hier sta je op.</p><p>De aarde zie je niet aan de hemel: je staat erop. Maar je ziet wel de schaduw van de aarde, als een maansverduistering, en de horizon is haar rand.</p>`; return; }
    const pos = positie(h, nu, p, D);
    const oo = opOnder(h, nu, p, D);
    let zinnen = [];
    if (pos) zinnen.push(`<p class="nu-groot">${esc(KAART.waarZin(pos))}</p>`);
    if (pos?.bij && h.soort === "maan") zinnen.push(`<p>${esc(hoofd(h.naam))} staat vlak bij ${esc(D.perSlug[pos.bij].naam)}. Met het blote oog zie je ${h.slug === "maan" ? "hem" : "alleen de planeet"}; ${["io", "europa", "ganymedes", "callisto"].includes(h.slug) ? "met een gewone verrekijker zie je de vier grote manen van Jupiter als stipjes naast de planeet." : "deze maan is te zwak, zelfs voor een verrekijker."}</p>`);
    if (oo) zinnen.push(`<dl class="weetjes">${oo.op ? `<dt>Komt op</dt><dd>${dag(oo.op)} om ${klok(oo.op)}</dd>` : ""}${oo.hoogst ? `<dt>Hoogst</dt><dd>${klok(oo.hoogst)}, ${Math.round(oo.hoogsteHoogte)}° hoog</dd>` : ""}${oo.onder ? `<dt>Gaat onder</dt><dd>${dag(oo.onder)} om ${klok(oo.onder)}</dd>` : ""}${!oo.op && !oo.onder ? `<dt>De hele nacht</dt><dd>${pos?.hoogte > 0 ? "gaat hier nooit onder" : "komt hier nooit op"}</dd>` : ""}</dl>`);
    if (pos?.mag != null && h.ae !== "Sun") zinnen.push(`<p>Helderheid nu: ${pos.mag.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}. ${pos.mag < 1 ? "Een van de helderste dingen aan de hemel." : pos.mag < 5.5 ? "Met het blote oog te zien als het donker is." : "Te zwak voor het blote oog; je hebt een telescoop nodig."}</p>`);
    if (h.slug === "zon") zinnen.push(`<p class="let-op">Kijk nooit recht in de zon, ook niet met een zonnebril, verrekijker of telescoop.</p>`);
    if (h.slug === "eris" || h.slug === "pluto") zinnen.push(`<p>${hoofd(h.naam)} is veel te zwak voor het blote oog en voor een verrekijker.</p>`);
    zinnen.push(`<p class="noot zacht">Uitgerekend in je browser voor ${esc(p.naam)}, ${klok(nu)}. <span class="label">simulatie</span> Of het bewolkt is, weet de site niet.</p>`);
    tekst.innerHTML = zinnen.join("");
    const doek = vak.querySelector(".sterrenkaart");
    KAART.teken(doek, D, p, nu, { markeer: h.slug, beeldNamen: true, uitgelicht: h.soort === "ster" ? [STERRENBEELD_AFK[h.slug]] : [] });
  };
  requestAnimationFrame(teken);
  const weg = PLEK.opVerandering(teken);
  const klokje = setInterval(teken, 60000);
  vak.querySelector(".sterrenkaart").addEventListener("click", (e) => { const s = KAART.welke(e.currentTarget, e); if (s && s !== h.slug) naar(`/hemel/${s}?tab=nu`); });
  tabOpruimen = () => { weg(); clearInterval(klokje); };
}
const STERRENBEELD_AFK = { sirius: "CMa", betelgeuze: "Ori", vega: "Lyr" };

/* ---------- Zoeken: eerst de vaste lijst, dan Wikidata (niet nagekeken) ---------- */

function zoekPagina(D, q) {
  document.title = `Zoeken: ${q} · ${TITEL}`;
  const nq = norm(q);
  const eigen = D.hemel.filter((h) => nq && norm(`${h.titel} ${h.naam}`).includes(nq));
  app.innerHTML = `<section class="blok breed zoek-pagina">
    ${etiket("Zoeken")}
    <h1 class="index-kop">${esc(q || "Zoeken")}</h1>
    <form class="index-rij" data-zoekform><label class="sr" for="zoek-alles">Zoek een hemellichaam</label><input class="veld" id="zoek-alles" type="search" value="${esc(q)}" placeholder="Bijvoorbeeld Andromedanevel, Deimos of Vesta" autocomplete="off"><button class="knop-pil knop-donker" type="submit">Zoeken</button></form>
    ${eigen.length ? `<h2 class="tussenkop">In onze lijst</h2><div class="raster hemels">${eigen.map((h) => kaart(D, h)).join("")}</div>` : ""}
    <h2 class="tussenkop">In Wikidata <span class="label label-zacht">niet nagekeken</span></h2>
    <div data-resultaten><p class="laden"><span></span>Zoeken in Wikidata…</p></div>
    <p class="noot zacht">Deze komen rechtstreeks uit Wikidata, de open database achter Wikipedia. Je browser vraagt het daar zelf; wij bewaren niets. Niet met de hand nagekeken: getallen kunnen fout zijn, en de afbeelding is niet altijd een foto.</p>
  </section>`;
  app.querySelector("[data-zoekform]").addEventListener("submit", (e) => { e.preventDefault(); naar(`/zoek?q=${encodeURIComponent(app.querySelector("#zoek-alles").value.trim())}`); });
  const vak = app.querySelector("[data-resultaten]");
  if (!q.trim()) { vak.innerHTML = ""; return; }
  import("./wikidata.js").then((W) => W.zoek(q)).then((lijst) => {
    if (!vak.isConnected) return;
    const kern = new Set(D.hemel.map((h) => h.qid));
    vak.innerHTML = lijst.length ? `<ul class="wd-lijst">${lijst.map((r) => `<li><a href="${kern.has(r.id) ? `/hemel/${D.hemel.find((h) => h.qid === r.id).slug}` : `/gevonden/${r.id}`}" data-link><strong>${esc(r.label)}</strong><span class="zacht">${esc(r.beschrijving || "")}</span></a></li>`).join("")}</ul>`
      : `<p class="leeg-zin">Niets gevonden in Wikidata dat een hemellichaam is. Probeer de Engelse naam.</p>`;
  }).catch((e) => { if (vak.isConnected) vak.innerHTML = `<p class="leeg-zin">${e.message === "druk" ? "Wikidata is nu te druk (te veel vragen). Probeer het over een minuut opnieuw." : "Wikidata geeft nu geen antwoord. Probeer het later opnieuw."}</p>`; });
}

async function gevondenPagina(D, qid) {
  app.innerHTML = `<section class="blok breed"><p class="laden"><span></span>Gegevens ophalen bij Wikidata…</p></section>`;
  try {
    const W = await import("./wikidata.js");
    const r = await W.details(qid);
    if (!location.pathname.endsWith(qid)) return;
    if (!r) return nietGevonden();
    document.title = `${r.label} · ${TITEL}`;
    const kern = D.hemel.find((h) => h.qid === qid);
    if (kern) return naar(`/hemel/${kern.slug}`, true);
    app.innerHTML = `<p class="gevonden-balk breed"><span class="label label-zacht">niet nagekeken</span> Dit staat niet in onze lijst. Wat je hier ziet, komt rechtstreeks uit Wikidata.</p>
    <section class="blok breed gevonden">
      ${etiket(r.soort || "Hemellichaam")}
      <h1 class="index-kop">${esc(r.label)}</h1>
      ${r.beschrijving ? `<p class="held-sub">${esc(r.beschrijving)}</p>` : ""}
      ${mijnKnop(`wd:${qid}`, { titel: r.label, naam: r.label, beeld: r.thumb || "", pad: `/gevonden/${qid}` })}
      <div class="gevonden-twee">
        ${r.thumb ? `<figure class="foto"><img src="${esc(r.thumb)}" alt="" referrerpolicy="no-referrer" loading="lazy"><figcaption><span class="label label-zacht">niet bekeken</span> De afbeelding die Wikidata erbij noemt. Of het een foto, een tekening of een kaartje is, hebben we niet nagekeken. <a href="${esc(r.bestand)}" rel="noopener">Maker en licentie op Wikimedia Commons</a>.</figcaption></figure>` : ""}
        <dl class="weetjes">${r.cijfers.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}<dt>Bron</dt><dd><a href="https://www.wikidata.org/wiki/${esc(qid)}" rel="noopener">Wikidata ${esc(qid)}</a>${r.wiki ? `, <a href="${esc(r.wiki)}" rel="noopener">Wikipedia</a>` : ""}</dd></dl>
      </div>
      ${r.ra != null ? `<div class="nu-kaart gevonden-kaart"><canvas class="sterrenkaart"></canvas><p class="noot zacht" data-gevonden-waar></p></div>` : ""}
    </section>`;
    if (r.ra != null) {
      const doek = app.querySelector(".sterrenkaart");
      const nep = { slug: "gevonden", titel: r.label, naam: r.label, soort: "ster", baan: { ster: { ra: r.ra, dec: r.dec, parallax_mas: 1 } }, cijfers: [] };
      const p = PLEK.huidig(), pos = positie(nep, new Date(), p, D);
      D.hemel.push(nep); D.perSlug.gevonden = nep;
      await KAART.teken(doek, D, p, new Date(), { markeer: "gevonden" });
      D.hemel.pop(); delete D.perSlug.gevonden;
      app.querySelector("[data-gevonden-waar]").textContent = `${KAART.waarZin(pos)}, uitgerekend voor ${p.naam} uit de positie in Wikidata. Niet nagekeken.`;
    }
    werkMijnBij();
  } catch (e) {
    app.innerHTML = `<section class="blok breed"><p class="leeg-zin">${e.message === "druk" ? "Wikidata is nu te druk. Probeer het over een minuut opnieuw." : "Dit kan nu niet worden opgehaald bij Wikidata. Probeer het later opnieuw."}</p></section>`;
  }
}

/* ---------- Kop: zoeken ---------- */

function koppelZoeken() {
  const veld = document.getElementById("zoek"), lijst = document.getElementById("zoek-lijst"), melding = document.querySelector(".zoek-melding");
  let treffers = [], actief = -1;
  const sluit = () => { lijst.hidden = true; veld.setAttribute("aria-expanded", "false"); actief = -1; };
  const kies = (h) => { const q = veld.value.trim(); veld.value = ""; sluit(); melding.textContent = ""; naar(h.slug === "__alles" ? `/zoek?q=${encodeURIComponent(q)}` : `/hemel/${h.slug}`); };
  veld.addEventListener("input", async () => {
    const D = await data();
    const q = norm(veld.value.trim());
    melding.textContent = "";
    if (!q) return sluit();
    treffers = D.hemel.filter((h) => norm(`${h.titel} ${h.naam}`).includes(q)).slice(0, 7);
    treffers.push({ slug: "__alles" });
    lijst.innerHTML = treffers.map((h, i) => h.slug === "__alles"
      ? `<li role="option" id="z-${i}" data-i="${i}" class="zoek-alles">Zoek “${esc(veld.value.trim())}” ook in Wikidata <span class="zacht">niet nagekeken</span></li>`
      : `<li role="option" id="z-${i}" data-i="${i}">${esc(h.titel)} <span class="zacht">${esc(SOORT_EEN[h.soort].toLowerCase())}</span></li>`).join("");
    lijst.hidden = false;
    veld.setAttribute("aria-expanded", "true");
  });
  veld.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      actief = Math.max(0, Math.min(treffers.length - 1, actief + (e.key === "ArrowDown" ? 1 : -1)));
      for (const li of lijst.children) li.setAttribute("aria-selected", li.dataset.i == actief);
      veld.setAttribute("aria-activedescendant", `z-${actief}`);
    } else if (e.key === "Enter" && treffers.length) kies(treffers[Math.max(0, actief)]);
    else if (e.key === "Escape") sluit();
  });
  lijst.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) kies(treffers[+li.dataset.i]); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".zoek")) sluit(); });
  document.querySelector(".zoek-knop").addEventListener("click", () => { if (treffers.length) kies(treffers[0]); else veld.focus(); });
}

/* ---------- Speler onderaan ---------- */

function koppelSpeler() {
  const speler = document.getElementById("speler");
  const knop = speler.querySelector(".speler-knop"), naam = speler.querySelector(".speler-naam"), plaatje = speler.querySelector(".speler-hoes");
  const doek = speler.querySelector(".speler-spectro");
  let vorige = null, laatste = null;
  knop.addEventListener("click", () => { if (laatste) G.speel(laatste); });
  speler.querySelector(".speler-sluit").addEventListener("click", () => G.stop());
  G.opVerandering(({ huidig, speelt, deel, fout, laadt }) => {
    speler.hidden = !huidig || document.body.classList.contains("kindermodus");
    if (!huidig) { vorige = null; return; }
    laatste = huidig;
    if (vorige !== huidig.id) {
      vorige = huidig.id;
      naam.textContent = huidig.geheim ? "Wat hoor ik?" : `${huidig.titel} · ${huidig.artiest}`;
      const slug = huidig.id.split(":")[1];
      naam.href = huidig.geheim || !slug ? "#" : `/hemel/${slug}?tab=geluid`;
      plaatje.src = huidig.geheim || !huidig.hoes ? "data:," : huidig.hoes;
      requestAnimationFrame(() => G.koppelDoek(doek));
    }
    speler.classList.toggle("speler-fout", !!fout);
    if (fout) naam.textContent = fout;
    knop.classList.toggle("speelt", speelt || laadt);
    knop.setAttribute("aria-label", speelt ? "Pauzeer" : "Speel");
    knop.querySelector(".ring").style.strokeDashoffset = 125.7 * (1 - deel);
    for (const b of app.querySelectorAll("[data-speel]")) {
      const id = `geluid:${b.closest("[data-hemel]")?.dataset.hemel || ""}:${b.dataset.speel}`;
      const dit = id === huidig.id;
      b.classList.toggle("speelt", dit && (speelt || laadt));
      const ring = b.querySelector(".ring"); if (ring) ring.style.strokeDashoffset = dit ? 125.7 * (1 - deel) : 125.7;
    }
  });
}

// hoogte van de kop, voor de grote kaart die eronder begint (zoals bij Voggels)
const balk = document.querySelector(".balk");
new ResizeObserver(() => document.documentElement.style.setProperty("--kop-h", `${balk.offsetHeight}px`)).observe(balk);

koppelZoeken();
koppelSpeler();
toon();
