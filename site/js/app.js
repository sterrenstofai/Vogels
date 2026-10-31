import { TITEL, ONDERTITEL, SEIZOENEN, MAANDLETTERS, MAANDNAMEN, STRAAL_M, KERN_MIN } from "./config.js";
import * as D from "./data.js";
import { tekenKaart, legenda } from "./kaart.js";
import * as G from "./geluid.js";
import { GROEPNAMEN, KLEUREN } from "./simulatie.js";

const app = document.getElementById("app");
const toestand = {
  adres: null,            // alleen in het geheugen: { naam, lat, lon, gemeentecode }
  seizoen: huidigSeizoen(),
  laatsteVak: null,
};
let paginaDoeken = [];
let SOORTEN_CACHE = {};
D.soorten().then((S) => (SOORTEN_CACHE = S));
let kaartModule = null;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const getal = (n) => Math.round(n).toLocaleString("nl-NL");
const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const datum = (iso) => { const [j, m, d] = iso.split("-"); return d ? `${+d} ${KORT[+m - 1]} ${j}` : iso; };
const klein = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const metKey = (S, k) => ({ key: k, ...S[k] });

function huidigSeizoen() {
  const m = new Date().getMonth();
  return m >= 2 && m <= 4 ? "lente" : m >= 5 && m <= 7 ? "zomer" : m >= 8 && m <= 10 ? "herfst" : "winter";
}

/* ---------- Router ---------- */

function naar(pad, vervang = false) {
  if (vervang) history.replaceState({}, "", pad); else history.pushState({}, "", pad);
  toon(true);
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
  e.preventDefault();
  naar(a.getAttribute("href"));
});
window.addEventListener("popstate", () => toon(true));

let vorigPad = null;
async function toon(navigatie = false) {
  const pad = location.pathname.replace(/\/+$/, "") || "/";
  const anderPad = pad !== vorigPad;
  vorigPad = pad;
  SOORTEN_CACHE = await D.soorten();
  document.body.classList.toggle("met-over", pad === "/" || pad.startsWith("/hier/") || pad.startsWith("/soort/"));
  const doe = async () => {
    for (const d of paginaDoeken) G.ontkoppelDoek(d);
    paginaDoeken = [];
    kaartModule?.verlaatKaart();
    try {
      if (pad === "/") await home();
      else if (pad.startsWith("/hier/")) await hier(D.vakUitSlug(pad.slice(6)));
      else if (pad.startsWith("/soort/")) await soortPagina(decodeURIComponent(pad.slice(7)));
      else if (pad === "/soorten") await soortenIndex();
      else if (pad === "/ontdek") await ontdek();
      else if (pad === "/onderzoekjes" || pad.startsWith("/onderzoekjes/")) {
        const OZ = await import("./onderzoekjes.js");
        document.title = `Onderzoekjes met Fos · ${TITEL}`;
        if (pad === "/onderzoekjes") await OZ.overzicht(app);
        else if (!(await OZ.onderzoekje(app, pad.slice(14), toestand, (d) => { G.koppelDoek(d); paginaDoeken.push(d); }))) nietGevonden();
      }
      else if (pad === "/kaart") {
        kaartModule = kaartModule || await import("./kaartpagina.js");
        document.title = `Twente in vogels · ${TITEL}`;
        const vak = new URLSearchParams(location.search).get("vak");
        await kaartModule.kaartPagina(app, toestand, { vak: vak ? D.vakUitSlug(vak) : null });
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
  if (navigatie && anderPad) { window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
}

function nietGevonden() {
  document.title = `Niet gevonden · ${TITEL}`;
  app.innerHTML = `<section class="kolom tekst"><h1>Deze pagina bestaat niet</h1><p><a href="/" data-link>Terug naar het begin</a></p></section>`;
}

/* ---------- Bouwstenen ---------- */

function knop(soort, type, extraKlasse = "") {
  const t = soort[type] ? type : soort.zang ? "zang" : "roep";
  if (!soort[t]) return "";
  return `<button class="knop-rond ${extraKlasse}" type="button" data-speel="${soort.key}" data-type="${t}" aria-label="Speel de ${t} van de ${esc(klein(soort.nl))}">
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

function kaartje(soort, rij, maanden, telling) {
  const beeld = soort.plaat
    ? `<img src="${soort.plaat.klein}" alt="" loading="lazy" decoding="async" width="480" height="600">`
    : legePlaat(soort, true);
  return `<article class="soort">
    <a class="soort-beeld" href="/soort/${soort.slug}" data-link tabindex="-1" aria-hidden="true">${beeld}</a>
    <div class="soort-tekst">
      <div><a class="soort-naam" href="/soort/${soort.slug}" data-link>${esc(soort.nl)}</a><span class="wet">${esc(soort.wet)}</span>${labelVoor(soort)}</div>
      ${knop(soort, "zang")}
    </div>
    ${maandStrip(rij, maanden)}
    <div class="soort-telling">${telling}</div>
  </article>`;
}

/* ---------- Het scherm: één vogel, de weetjes, de strook en het kaartje ---------- */

const PLAAT_KORT = { Naumann: "Naumann, 1896–1905", Sepp: "Nozeman & Sepp, 1770–1829", Gould: "Gould, 1832–1837" };
function plaatKort(p) {
  const k = Object.keys(PLAAT_KORT).find((b) => p.werk.includes(b === "Sepp" ? "Sepp" : b));
  return k ? PLAAT_KORT[k] : p.werk.split(",")[0];
}

// opties: kop, sub, weetjes [[label, html]], strook {label, lijst [{key, tekst}], href(slug)}, omgeving {html, href, label}
function scherm(soort, { kop, sub, weetjes = [], strook, omgeving }) {
  const types = ["zang", "roep"].filter((t) => soort[t]);
  const plaat = soort.plaat
    ? `<img src="${soort.plaat.src}" alt="Historische plaat van de ${esc(klein(soort.nl))}${soort.plaat.ook.length ? `, samen met ${esc(soort.plaat.ook.join(", ").toLowerCase())}` : ""}" width="1200" height="1500" fetchpriority="high">`
    : legePlaat(soort);
  return `<section class="scherm" data-held="${soort.key}">
    <div class="podium">
      <div class="podium-paneel podium-plaat onthul" data-paneel="plaat">${plaat}</div>
      <div class="podium-paneel podium-geluid" data-paneel="geluid" hidden>
        <div class="spectro-vlak"><canvas aria-hidden="true"></canvas><div class="spectro-as"><span>11 kHz</span><span>5,5</span><span>0</span></div><div class="spectro-hint">Even laden…</div></div>
      </div>
      <div class="weergave" role="tablist" aria-label="Weergave">
        <button type="button" role="tab" data-weergave="plaat" aria-selected="true">Plaat</button>
        ${types.map((t) => `<button type="button" role="tab" data-weergave="${t}" aria-selected="false">${t === "zang" ? "Zang" : "Roep"}</button>`).join("")}
      </div>
      <div class="zoomknoppen"><button type="button" class="knop-rondje" data-zoom="-1" aria-label="Uitzoomen">−</button><button type="button" class="knop-rondje" data-zoom="1" aria-label="Inzoomen">+</button></div>
    </div>
    <div class="scherm-titel">
      <h1>${kop}</h1>
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
  let zoom = 0;
  const toon = (naam) => {
    sch.querySelectorAll("[data-paneel]").forEach((p) => (p.hidden = p.dataset.paneel !== (naam === "plaat" ? "plaat" : "geluid")));
    sch.querySelectorAll("[data-weergave]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.weergave === naam)));
    sch.querySelector(".zoomknoppen").hidden = naam !== "plaat";
    if (naam !== "plaat") {
      if (doek && !paginaDoeken.includes(doek)) { G.koppelDoek(doek); paginaDoeken.push(doek); }
      // in de tik zelf afspelen (iOS)
      G.speel(soort, naam);
      const o = soort[naam];
      const geluidWeetje = sch.querySelector("[data-weetje-geluid]");
      if (o && geluidWeetje) geluidWeetje.innerHTML = opnameTekst(o);
    }
  };
  sch.querySelectorAll("[data-weergave]").forEach((b) => b.addEventListener("click", () => toon(b.dataset.weergave)));
  sch.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
    zoom = Math.max(0, Math.min(2, zoom + +b.dataset.zoom));
    if (img) img.style.transform = `scale(${[1, 1.6, 2.4][zoom]})`;
  }));
  // de gekozen vogel midden in de strook, zonder de pagina zelf te laten scrollen
  const actief = sch.querySelector(".strook-item.actief"), strook = sch.querySelector(".strook");
  if (actief && strook) requestAnimationFrame(() => { strook.scrollLeft = actief.offsetLeft - strook.clientWidth / 2 + actief.offsetWidth / 2; });
}

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
      kop: `De <em>${esc(klein(soort.nl))}</em> in <em>${MAANDNAMEN[m]}</em>`,
      sub: `In ${MAANDNAMEN[m]} ${getal(r[m])} keer gemeld in Twente${r[m] > gem * 1.4 ? `, ${(r[m] / gem).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} keer zo vaak als in een gemiddelde maand` : ""}.`,
      weetjes: weetjesVoor(soort, [["In Twente", `${getal(soort.n)} meldingen in vijf jaar`]]),
      strook: { label: `${nu.length} soorten nu in Twente`, lijst: nu.map((x) => ({ key: x.key })), href: (slug) => `/?soort=${slug}` },
      omgeving: { html: kaartjeKlein(K, V, { waarden, label: `Waar de ${klein(soort.nl)} in ${MAANDNAMEN[m]} gemeld wordt` }), href: "/kaart" },
    })}
    <section class="breed blok">
      <a class="oz-teaser" href="/onderzoekjes" data-link>
        <span class="oz-teaser-tekst"><span class="oz-boventitel">Voor zaterdagochtend</span><strong>Onderzoekjes met Fos</strong><span>Zes opdrachten om samen te doen: een geluidsquiz, je tuin tellen, een liedje tekenen en meer.</span></span>
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
      kop: `De <em>${esc(klein(soort.nl))}</em> bij <em>${esc(plekNaam)}</em>`,
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
    kop: `De <em>${esc(klein(soort.nl))}</em>`,
    sub: `${getal(soort.n)} meldingen in Twente in vijf jaar, in ${vakkenMet} van de ${Object.keys(V).length} vakken.${soort.exoot ? " Ontsnapt of uitgezet." : ""}`,
    weetjes: weetjesVoor(soort, [["In Twente", `${getal(soort.n)} meldingen`]]),
    strook: { label: `${groep.length} ${GROEPNAMEN[soort.groep]?.toLowerCase() || "soorten"}`, lijst: groep.map((k) => ({ key: k })), href: (s) => `/soort/${s}` },
    omgeving: { html: kaartjeKlein(K, V, { waarden, eigen: toestand.laatsteVak, label: `Waar de ${klein(soort.nl)} in Twente gemeld is` }), href: "/kaart" },
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
      ${tekenKaart(K, V, { waarden, eigen: toestand.laatsteVak, label: `Kaart: waar de ${klein(soort.nl)} in Twente is gemeld`, titel: (v, w) => `${w} meldingen` })}
      ${legenda(Math.max(...Object.values(waarden)), "meldingen")}
    </div>
  </section>`;
  bindScherm(app, soort);
}

/* ---------- Alle soorten ---------- */

async function soortenIndex() {
  const S = await D.soorten();
  document.title = `Alle soorten · ${TITEL}`;
  const st = { groep: null, sort: "meest", q: "" };
  const groepen = Object.keys(GROEPNAMEN).filter((g) => Object.values(S).some((s) => s.groep === g && s.n >= KERN_MIN));
  app.innerHTML = `
  <section class="breed blok">
    <div class="blok-kop"><h1 class="index-kop">Alle vogels in Twente</h1><span class="mono zacht">${Object.values(S).filter((s) => s.n >= KERN_MIN).length} soorten met minstens ${KERN_MIN} meldingen</span></div>
    <div class="index-filters">
      <div class="chips" role="group" aria-label="Groep">
        <button type="button" class="chip" data-groep="" aria-pressed="true">Alle</button>
        ${groepen.map((g) => `<button type="button" class="chip" data-groep="${g}" aria-pressed="false"><i style="background:${KLEUREN[g]}"></i>${GROEPNAMEN[g]}</button>`).join("")}
      </div>
      <div class="index-rij">
        <input class="veld" type="search" placeholder="Zoek een soort" aria-label="Zoek een soort">
        <select class="veld" aria-label="Sorteer"><option value="meest">Meest gemeld</option><option value="zeldzaam">Zeldzaamst</option><option value="az">A–Z</option><option value="nu">Nu het meest</option></select>
      </div>
    </div>
    <div class="raster index-raster"></div>
  </section>`;
  const raster = app.querySelector(".index-raster");
  const m = new Date().getMonth();
  const teken = () => {
    let lijst = Object.keys(S).filter((k) => S[k].n >= KERN_MIN && (!st.groep || S[k].groep === st.groep) && (!st.q || S[k].nl.toLowerCase().includes(st.q) || S[k].wet.toLowerCase().includes(st.q)));
    const sorteer = { meest: (a, b) => S[b].n - S[a].n, zeldzaam: (a, b) => S[a].n - S[b].n, az: (a, b) => S[a].nl.localeCompare(S[b].nl, "nl"), nu: (a, b) => S[b].twente[m] - S[a].twente[m] }[st.sort];
    lijst = lijst.sort(sorteer);
    raster.innerHTML = lijst.map((k) => kaartje(metKey(S, k), S[k].twente, [m], `${getal(S[k].n)} meldingen`)).join("") || `<p>Geen soorten gevonden.</p>`;
    werkKnoppenBij();
  };
  app.querySelectorAll("[data-groep]").forEach((b) => b.addEventListener("click", () => {
    st.groep = b.dataset.groep || null;
    app.querySelectorAll("[data-groep]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    teken();
  }));
  app.querySelector("input.veld").addEventListener("input", (e) => { st.q = e.target.value.trim().toLowerCase(); teken(); });
  app.querySelector("select.veld").addEventListener("change", (e) => { st.sort = e.target.value; teken(); });
  teken();
}

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

// De soortenlijst staat al klaar, zodat afspelen synchroon in de tik gebeurt (anders blokkeert iOS het geluid).
let SOORTEN = null;
D.soorten().then((S) => (SOORTEN = S));
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-speel]");
  if (!b || !SOORTEN) return;
  G.speel(metKey(SOORTEN, b.dataset.speel), b.dataset.type);
});
speler.querySelector(".speler-knop").addEventListener("click", () => { const h = G.huidigeOpname(); if (h) G.speel(h.soort, h.type); });
speler.querySelector(".speler-sluit").addEventListener("click", () => G.stop());

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
    if (h.soort.plaat) { img.src = h.soort.plaat.klein; img.hidden = false; } else img.hidden = true;
    const naam = speler.querySelector(".speler-naam");
    naam.textContent = st.fout || (st.laadt ? `${h.soort.nl} · laden…` : `${h.soort.nl} · ${h.type}`);
    speler.classList.toggle("speler-fout", !!st.fout);
    naam.href = `/soort/${h.soort.slug}`;
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

// carrousel met platen in het overblok
D.soorten().then((S) => {
  const namen = ["roodborst", "merel", "boerenzwaluw", "ijsvogel", "koolmees", "kievit", "buizerd", "vink", "ekster", "grutto", "groene-specht", "putter"];
  const k = document.querySelector(".over-karrousel");
  k.innerHTML = namen.map((n) => Object.values(S).find((s) => s.slug === n)).filter((s) => s?.plaat).map((s) =>
    `<figure><a href="/soort/${s.slug}" data-link><img src="${s.plaat.src}" alt="Plaat van de ${esc(klein(s.nl))}" loading="lazy" width="1200" height="1500"></a><figcaption>${esc(s.nl)} · ${esc(plaatKort(s.plaat))}</figcaption></figure>`).join("");
  document.querySelectorAll("[data-karrousel]").forEach((b) => b.addEventListener("click", () => {
    const f = k.querySelector("figure");
    k.scrollBy({ left: (+b.dataset.karrousel) * ((f?.offsetWidth || 300) + 16), behavior: "smooth" });
  }));
});

zoekveld(document.querySelector(".balk .zoek"));
toon();
