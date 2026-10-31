import { TITEL, ONDERTITEL, SEIZOENEN, MAANDLETTERS, MAANDNAMEN, STRAAL_M } from "./config.js";
import * as D from "./data.js";
import { tekenKaart, legenda } from "./kaart.js";
import * as G from "./geluid.js";

const app = document.getElementById("app");
const toestand = {
  adres: null,            // alleen in het geheugen: { naam, lat, lon, gemeentecode }
  seizoen: huidigSeizoen(),
  laatsteVak: null,
};
let paginaDoeken = [];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const getal = (n) => n.toLocaleString("nl-NL");
const KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const datum = (iso) => { const [j, m, d] = iso.split("-"); return d ? `${+d} ${KORT[+m - 1]} ${j}` : iso; };

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

async function toon(navigatie = false) {
  const pad = location.pathname.replace(/\/+$/, "") || "/";
  const doe = async () => {
    for (const d of paginaDoeken) G.ontkoppelDoek(d);
    paginaDoeken = [];
    try {
      if (pad === "/") await home();
      else if (pad.startsWith("/hier/")) await hier(D.vakUitSlug(pad.slice(6)));
      else if (pad.startsWith("/soort/")) await soortPagina(decodeURIComponent(pad.slice(7)));
      else nietGevonden();
    } catch (err) {
      console.error(err);
      app.innerHTML = `<section class="kolom tekst"><h1>Er ging iets mis</h1><p>De gegevens konden niet worden geladen. Probeer het later opnieuw.</p></section>`;
    }
    werkKnoppenBij();
  };
  if (navigatie && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    await document.startViewTransition(doe).updateCallbackDone;
  } else await doe();
  if (navigatie) { window.scrollTo(0, 0); app.focus({ preventScroll: true }); }
}

function nietGevonden() {
  document.title = `Niet gevonden · ${TITEL}`;
  app.innerHTML = `<section class="kolom tekst"><h1>Deze pagina bestaat niet</h1><p><a href="/" data-link>Terug naar het begin</a></p></section>`;
}

/* ---------- Bouwstenen ---------- */

function knop(soort, type, extraKlasse = "") {
  const t = soort[type] ? type : soort.zang ? "zang" : "roep";
  if (!soort[t]) return "";
  return `<button class="knop-rond ${extraKlasse}" type="button" data-speel="${soort.key}" data-type="${t}" aria-label="Speel de ${t} van de ${esc(soort.nl.toLowerCase())}">
    <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="20"/><circle class="ring" cx="22" cy="22" r="20"/><path class="ico-pauze" d="M17 15v14M27 15v14"/><path class="ico-speel" d="M18 14l12 8-12 8z"/></svg></button>`;
}

function legePlaat(soort, klein = false) {
  const reden = soort.geen_plaat || (soort.exoot
    ? "Ontsnapt of uitgezet. Geen plaat gevonden in de oude Europese vogelboeken."
    : "Nog geen historische plaat gevonden voor deze soort.");
  return `<div class="lege-plaat"><div><div class="lege-plaat-naam">${esc(soort.nl)}</div>${klein ? "" : `<p>${esc(reden)}</p>`}</div></div>`;
}

function maandStrip(rij, actief) {
  const max = Math.max(1, ...rij);
  const cellen = rij.map((c, i) => {
    const o = c ? 0.14 + 0.86 * Math.pow(c / max, 0.6) : 0;
    const titel = `${MAANDNAMEN[i]}: ${getal(c)}`;
    return c ? `<i style="opacity:${o.toFixed(2)}" title="${titel}"></i>` : `<i class="uit" style="background:transparent" title="${titel}"></i>`;
  }).join("");
  const letters = MAANDLETTERS.map((l, i) => `<span${actief.includes(i) ? ' style="color:var(--inkt)"' : ""}>${l}</span>`).join("");
  return `<div class="maanden" aria-hidden="true">${cellen}</div><div class="maanden-letters" aria-hidden="true">${letters}</div>`;
}

function kaartje(soort, rij, maanden, telling) {
  const label = soort.exoot ? `<span class="label">${soort.status.includes("exoot") ? "exoot" : "ontsnapt"}</span>` : "";
  const beeld = soort.plaat
    ? `<img src="${soort.plaat.klein}" alt="" loading="lazy" decoding="async" width="480" height="600">`
    : legePlaat(soort, true);
  return `<article class="soort">
    <a class="soort-beeld" href="/soort/${soort.slug}" data-link tabindex="-1" aria-hidden="true">${beeld}</a>
    <div class="soort-tekst">
      <div><a class="soort-naam" href="/soort/${soort.slug}" data-link>${esc(soort.nl)}</a><span class="wet">${esc(soort.wet)}</span>${label}</div>
      ${knop(soort, "zang")}
    </div>
    ${maandStrip(rij, maanden)}
    <div class="soort-telling">${telling}</div>
  </article>`;
}

/* ---------- Home ---------- */

async function home() {
  document.title = `${TITEL} · ${ONDERTITEL}`;
  const [S, V, K, M] = await Promise.all([D.soorten(), D.vakken(), D.kaart(), D.meta()]);
  const merel = Object.entries(S).map(([key, s]) => ({ key, ...s })).find((s) => s.slug === "merel");
  app.innerHTML = `
  <section class="held breed">
    <div>
      <h1>Welke vogels hoor je <em>hier</em>, en wanneer?</h1>
      <p class="held-intro">Typ je adres in Twente. Je ziet wat mensen in de afgelopen vijf jaar in de buurt hebben gemeld, van je eigen straat tot heel Twente. Met het geluid erbij.</p>
      <div class="zoek" role="search">
        <label for="adres">Je adres in Twente</label>
        <input id="adres" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"
          placeholder="Bijvoorbeeld Oude Markt 3A, Enschede" role="combobox" aria-expanded="false" aria-controls="adres-lijst" aria-autocomplete="list">
        <ul id="adres-lijst" class="zoek-lijst" role="listbox" hidden></ul>
        <p class="zoek-melding" aria-live="polite"></p>
      </div>
    </div>
    ${merel && merel.plaat ? `<figure class="plaat held-plaat">
      <div class="plaat-rand onthul"><img src="${merel.plaat.src}" alt="Plaat van merels: een zwart mannetje met gele snavel en twee bruine vrouwtjes tussen bladeren" width="1200" height="1500" fetchpriority="high"></div>
      <figcaption><span style="display:flex;align-items:center;gap:.8rem">${knop(merel, "zang")}<span>Hoor de merel zingen. <span class="mono">${esc(merel.zang.opnemer)}, ${esc(merel.zang.land === "Netherlands" ? "Nederland" : merel.zang.land)}</span></span></span>
      <span class="mono" style="display:block;margin-top:.5rem">${esc(merel.plaat.werk)}</span></figcaption>
    </figure>` : ""}
  </section>
  <section class="breed">
    <div class="laag-kop" style="grid-template-columns:1fr"><h2 style="font-size:clamp(1.6rem,4.6vw,2.4rem)">Of kies een vak op de kaart</h2>
    <span class="laag-sub">${M.vakken} vakken van ongeveer 4 × 6 km · ${getal(M.meldingen_vakken)} meldingen · ${M.periode[0].slice(0, 4)}–${M.periode[1].slice(0, 4)}</span></div>
    <div class="kaart-vak">${tekenKaart(K, V, { klik: true, label: "Kaart van Twente: kies een vak", titel: (v, w) => `${w} soorten in dit vak` })}</div>
    ${legenda(Math.max(...Object.values(V).map((v) => Object.keys(v.s).length)), "soorten")}
  </section>`;
  app.querySelector(".kaart-vak svg").addEventListener("click", (e) => {
    const r = e.target.closest("[data-vak]");
    if (r) { toestand.adres = null; naar(`/hier/${D.vakSlug(r.dataset.vak)}`); }
  });
  zoekveld(app.querySelector(".zoek"));
}

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
      naar(`/hier/${D.vakSlug(D.vakVan(a.lat, a.lon))}`);
    } catch { melding.textContent = "Dit adres kon niet worden opgezocht. Probeer het opnieuw."; }
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { docs = []; teken(); melding.textContent = ""; return; }
    timer = setTimeout(async () => {
      ctrl?.abort(); ctrl = new AbortController();
      try {
        docs = await D.zoekAdres(q, ctrl.signal); keuze = -1; teken();
        melding.textContent = docs.length ? "" : "Geen adres in Twente gevonden. Deze site werkt alleen voor de veertien Twentse gemeenten.";
      } catch (e) { if (e.name !== "AbortError") melding.textContent = "Zoeken lukt nu niet. Probeer het zo opnieuw."; }
    }, 180);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { keuze = Math.min(docs.length - 1, keuze + 1); teken(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { keuze = Math.max(0, keuze - 1); teken(); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); kies(keuze >= 0 ? keuze : 0); }
    else if (e.key === "Escape") sluit();
  });
  lijst.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) kies(+li.dataset.i); });
  input.addEventListener("blur", () => setTimeout(sluit, 200));
}

/* ---------- Je plek: vijf lagen ---------- */

async function hier(vak) {
  const [S, V, K, M] = await Promise.all([D.soorten(), D.vakken(), D.kaart(), D.meta()]);
  if (!V[vak]) return nietGevonden();
  toestand.laatsteVak = vak;
  const adres = toestand.adres && D.vakVan(toestand.adres.lat, toestand.adres.lon) === vak ? toestand.adres : null;
  const gemeente = (adres && M.gemeentecodes[adres.gemeentecode]) || D.gemeenteVanVak(K, vak);
  const buren = D.buren(vak);
  const [la, lo] = vak.split(",").map(Number);
  document.title = `${adres ? adres.naam : `Vak ${vak}`} · ${TITEL}`;

  const precies = adres ? await D.preciesRond(adres.lat, adres.lon, STRAAL_M) : null;

  const teken = () => {
    const maanden = SEIZOENEN[toestand.seizoen].maanden;
    const gezien = new Set();
    const laag = (sleutels) => {
      const { n, perSoort } = D.optellen(V, sleutels);
      const lijst = [...perSoort.entries()]
        .map(([key, rij]) => ({ key, rij, s: D.inSeizoen(rij, maanden) }))
        .filter((x) => x.s > 0);
      const nieuw = lijst.filter((x) => !gezien.has(x.key)).sort((a, b) => b.s - a.s);
      lijst.forEach((x) => gezien.add(x.key));
      return { n, totaal: lijst.length, nieuw, vakken: sleutels.filter((v) => V[v]).length };
    };
    const l2 = laag([vak]);
    const l3 = laag(buren);
    const gemVakken = [...new Set([...(K.gemeenten[gemeente]?.vakken || []), ...buren])];
    const l4 = laag(gemVakken);
    const l5 = laag(Object.keys(V));
    const seizoenNaam = toestand.seizoen === "jaar" ? "in vijf jaar" : `in de ${SEIZOENEN[toestand.seizoen].naam.toLowerCase()}`;
    const waarden = Object.fromEntries(Object.entries(V).map(([v, d]) => [v, Object.values(d.s).filter((r) => D.inSeizoen(r, maanden) > 0).length]));

    app.innerHTML = `
    <section class="plek breed">
      <div class="plek-label">${adres ? "Je adres" : "Gekozen vak"} · gemeente ${esc(gemeente)}</div>
      <h1>${esc(adres ? adres.naam.split(",")[0] : `Vak ${la.toFixed(2).replace(".", ",")} N · ${lo.toFixed(2).replace(".", ",")} O`)}</h1>
      <p class="plek-meta mono zacht">${adres ? esc(adres.naam.split(",").slice(1).join(",").trim()) + " · " : ""}vak ${vak} · ${getal(V[vak].n)} meldingen in vijf jaar</p>
      <div class="seizoen" role="group" aria-label="Seizoen">${Object.entries(SEIZOENEN).map(([k, s]) => `<button type="button" data-seizoen="${k}" aria-pressed="${k === toestand.seizoen}">${s.naam}</button>`).join("")}</div>
      <div class="kaart-vak">${tekenKaart(K, V, { waarden, eigen: vak, buren: buren.filter((b) => b !== vak), gemeente, punt: adres ? [adres.lat, adres.lon] : null, klik: true,
        label: `Kaart van Twente met je vak, de buurvakken en de gemeente ${gemeente}`, titel: (v, w) => `${w} soorten ${seizoenNaam}` })}</div>
      ${legenda(Math.max(...Object.values(waarden)), "soorten")}
    </section>
    <div class="breed">
      ${laagStraat(adres, precies, S)}
      ${laagBlok(2, "Je vak", `ongeveer 4 × 6 km · ${getal(l2.n)} meldingen · ${l2.totaal} soorten ${seizoenNaam}`,
        "Het rastervak waarin je adres ligt. Observation.org deelt meldingen alleen op dit raster; de vogels hieronder zijn ergens in dit vak gemeld, niet per se bij jou om de hoek.", l2.nieuw, S, maanden, 12, "in dit vak")}
      ${laagBlok(3, "Eromheen", `${l3.vakken} vakken · ${getal(l3.n)} meldingen · ${l3.totaal} soorten`,
        l3.nieuw.length ? `Deze soorten zijn in de vakken rond je vak gemeld, maar niet in je eigen vak.` : `Rond je vak zijn geen andere soorten gemeld dan in je eigen vak.`, l3.nieuw, S, maanden, 8, "in de buurt")}
      ${laagBlok(4, `In en rond ${gemeente}`, `${l4.vakken} vakken · ${getal(l4.n)} meldingen · ${l4.totaal} soorten`,
        `Alle vakken die de gemeente ${esc(gemeente)} raken. Dat is iets ruimer dan de gemeentegrens, want een vak is niet te splitsen. Hieronder alleen wat er nog bij komt.`, l4.nieuw, S, maanden, 8, "in en rond de gemeente")}
      ${laagBlok(5, "Heel Twente", `${l5.vakken} vakken · ${getal(l5.n)} meldingen · ${l5.totaal} soorten`,
        `De rest van wat ${seizoenNaam} in Twente is gemeld. Vaak zeldzaam, of gebonden aan één plek.`, l5.nieuw, S, maanden, 8, "in Twente")}
    </div>`;

    app.querySelectorAll("[data-seizoen]").forEach((b) => b.addEventListener("click", () => {
      toestand.seizoen = b.dataset.seizoen;
      const y = window.scrollY;
      if (document.startViewTransition) document.startViewTransition(() => { teken(); werkKnoppenBij(); window.scrollTo(0, y); });
      else { teken(); werkKnoppenBij(); window.scrollTo(0, y); }
    }));
    app.querySelector(".kaart-vak svg").addEventListener("click", (e) => {
      const r = e.target.closest("[data-vak]");
      if (r && r.dataset.vak !== vak) { toestand.adres = null; naar(`/hier/${D.vakSlug(r.dataset.vak)}`); }
    });
    app.querySelectorAll("[data-meer]").forEach((b) => b.addEventListener("click", () => {
      b.previousElementSibling.querySelectorAll("[hidden]").forEach((el) => (el.hidden = false));
      b.remove();
      werkKnoppenBij();
    }));
  };
  teken();
}

function laagStraat(adres, precies, S) {
  const kop = (sub) => `<div class="laag-kop"><span class="laag-nr">1</span><h2>Je straat</h2><span class="laag-sub">${sub}</span></div>`;
  if (!adres) {
    return `<section class="laag">${kop(`binnen ${STRAAL_M} m`)}<p class="laag-tekst">Je hebt een vak op de kaart gekozen, geen adres. <a href="/" data-link>Typ je adres</a> om de losse meldingen bij je straat te zien. We bewaren geen adressen, dus na het herladen van de pagina is het adres weg.</p></section>`;
  }
  const soortenSet = new Set(precies.map((p) => p.soort));
  const dagen = new Set(precies.map((p) => p.datum)).size;
  if (!precies.length) {
    return `<section class="laag">${kop(`binnen ${STRAAL_M} m · 0 meldingen`)}
      <div class="leeg"><div class="leeg-cirkel">0</div><p>Hier is in vijf jaar niets precies gemeld. Dat zegt vooral iets over waar mensen tellen, niet over de vogels.</p></div></section>`;
  }
  // Meldingen van dezelfde dag, bron en plek zijn meestal één telling: samen tonen
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
    const s = { key: x.key, ...S[x.key] };
    const html = kaartje(s, x.rij, maanden, `${getal(x.s)} ${x.s === 1 ? "melding" : "meldingen"} ${waar}`);
    return i < eerst ? html : html.replace('<article class="soort">', '<article class="soort" hidden>');
  }).join("");
  const zeldzaam = rest.length
    ? `<h3 class="mono zacht" style="font-family:var(--mono);font-size:.78rem;margin-top:2.2rem;font-weight:400">Zelden gemeld in Twente</h3><ul class="zeldzaam">${rest.map((x) => {
      const s = S[x.key];
      return `<li><a href="/soort/${s.slug}" data-link>${esc(s.nl)}</a> <span class="mono">${x.s}</span>${s.exoot ? ' <span class="mono" style="color:var(--rood)">ontsnapt</span>' : ""}</li>`;
    }).join("")}</ul>` : "";
  return `<section class="laag">
    <div class="laag-kop"><span class="laag-nr">${nr}</span><h2>${esc(titel)}</h2><span class="laag-sub">${sub}</span></div>
    <p class="laag-tekst">${tekst}</p>
    ${kern.length ? `<div class="raster">${kaartjes}</div>${kern.length > eerst ? `<button class="meer" type="button" data-meer>Toon alle ${kern.length} soorten</button>` : ""}` : ""}
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
  const types = ["zang", "roep"].filter((t) => soort[t]);
  let type = types[0];
  const max = Math.max(1, ...soort.twente);
  const waarden = Object.fromEntries(Object.entries(V).map(([v, d]) => [v, (d.s[soort.key] || []).reduce((a, b) => a + b, 0)]));
  const vakkenMet = Object.values(waarden).filter((w) => w > 0).length;
  const terug = toestand.laatsteVak ? `<a class="mono" href="/hier/${D.vakSlug(toestand.laatsteVak)}" data-link>← terug naar je plek</a>` : `<a class="mono" href="/" data-link>← zoek je adres</a>`;
  const plaat = soort.plaat
    ? `<figure class="plaat"><div class="plaat-rand onthul"><img src="${soort.plaat.src}" alt="Historische plaat van de ${esc(soort.nl.toLowerCase())}${soort.plaat.ook.length ? `, samen met ${esc(soort.plaat.ook.join(", ").toLowerCase())}` : ""}" width="1200" height="1500" fetchpriority="high"></div>
       <figcaption>${esc(soort.plaat.werk)}. Publiek domein, via <a href="${soort.plaat.pagina}">Wikimedia Commons</a>.${soort.plaat.ook.length ? ` Op deze plaat staan ook: ${esc(soort.plaat.ook.join(", ").toLowerCase())}.` : ""}</figcaption></figure>`
    : `<figure class="plaat">${legePlaat(soort)}</figure>`;

  app.innerHTML = `
  <div class="breed" style="padding-top:1.5rem">${terug}</div>
  <article class="soortpagina breed">
    ${plaat}
    <div>
      <h1>${esc(soort.nl)}</h1>
      <span class="wet">${esc(soort.wet)}</span>
      <p class="status">${soort.status ? esc(soort.status.charAt(0).toUpperCase() + soort.status.slice(1)) + " · " : ""}${getal(soort.n)} meldingen in Twente in vijf jaar · in ${vakkenMet} van de ${Object.keys(V).length} vakken</p>
      <section class="geluid" aria-label="Geluid">
        ${types.length ? `<div class="tabs" role="tablist">${types.map((t) => `<button role="tab" type="button" data-tab="${t}" aria-selected="${t === type}">${t === "zang" ? "Zang" : "Roep"}</button>`).join("")}</div>
        <div class="spectro-vlak"><canvas aria-hidden="true"></canvas><div class="spectro-as"><span>11 kHz</span><span>5,5</span><span>0</span></div><div class="spectro-hint">Tik op afspelen en kijk mee</div></div>
        <div class="geluid-balk"><span class="knop-plek"></span><p class="geluid-credit"></p></div>`
        : `<p class="geen-opname">Voor deze soort hebben we geen geschikte opname gevonden.</p>`}
      </section>
      <section class="kalender">
        <h2>Wanneer in Twente</h2>
        <p class="mono zacht" style="margin:.3rem 0 0">Meldingen per maand, ${getal(soort.n)} in totaal</p>
        <div class="kalender-staven">${soort.twente.map((c, i) => `<div style="height:${Math.max(1, (c / max) * 100).toFixed(1)}%;opacity:${(0.25 + 0.75 * (c / max)).toFixed(2)}" title="${MAANDNAMEN[i]}: ${getal(c)}"></div>`).join("")}</div>
        <div class="kalender-letters">${MAANDLETTERS.map((l) => `<span>${l}</span>`).join("")}</div>
      </section>
      <section class="waar">
        <h2>Waar in Twente</h2>
        <p class="mono zacht" style="margin:.3rem 0 0">Meldingen per vak van ongeveer 4 × 6 km</p>
        ${tekenKaart(K, V, { waarden, eigen: toestand.laatsteVak, label: `Kaart: waar de ${soort.nl.toLowerCase()} in Twente is gemeld`, titel: (v, w) => `${w} meldingen` })}
        ${legenda(Math.max(...Object.values(waarden)), "meldingen")}
      </section>
    </div>
  </article>`;

  const vlak = app.querySelector(".spectro-vlak");
  if (vlak) {
    const doek = vlak.querySelector("canvas");
    G.koppelDoek(doek); paginaDoeken.push(doek);
    const zet = () => {
      app.querySelector(".knop-plek").innerHTML = knop(soort, type);
      const o = soort[type];
      const land = { Netherlands: "Nederland", Belgium: "België", Germany: "Duitsland" }[o.land] || o.land;
      app.querySelector(".geluid-credit").innerHTML = `Opname <a href="${o.pagina}">XC${o.id}</a> door ${esc(o.opnemer)}, ${esc(o.plek)} (${esc(land)}), ${datum(o.datum)}. <a href="${o.licentie}">${licentieNaam(o.licentie)}</a>.`;
      app.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === type)));
      werkKnoppenBij();
    };
    app.querySelectorAll("[data-tab]").forEach((t) => t.addEventListener("click", () => { type = t.dataset.tab; zet(); }));
    zet();
  }
}

function licentieNaam(url) {
  const m = url.match(/licenses\/([a-z-]+)\/([\d.]+)/);
  if (m) return `CC ${m[1].toUpperCase()} ${m[2]}`;
  return url.includes("publicdomain") ? "CC0" : "licentie";
}

/* ---------- Speler en knoppen ---------- */

const speler = document.getElementById("speler");
const spelerDoek = speler.querySelector("canvas");
let spelerGekoppeld = false;

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-speel]");
  if (!b) return;
  const S = await D.soorten();
  G.speel({ key: b.dataset.speel, ...S[b.dataset.speel] }, b.dataset.type);
});
speler.querySelector(".speler-knop").addEventListener("click", () => {
  const h = G.huidigeOpname(); if (h) G.speel(h.soort, h.type);
});
speler.querySelector(".speler-sluit").addEventListener("click", () => G.stop());

function werkKnoppenBij(st) {
  const h = G.huidigeOpname();
  const speeltNu = G.speelt();
  const deel = st?.deel ?? 0;
  document.querySelectorAll("[data-speel]").forEach((b) => {
    const dezelfde = h && h.soort.key === b.dataset.speel && h.type === b.dataset.type;
    b.classList.toggle("speelt", !!(dezelfde && speeltNu));
    b.querySelector(".ring").style.strokeDashoffset = dezelfde ? (125.7 * (1 - deel)).toFixed(1) : "125.7";
    b.setAttribute("aria-label", `${dezelfde && speeltNu ? "Pauzeer" : "Speel"} de ${b.dataset.type} van de ${(h && dezelfde ? h.soort.nl : b.closest(".soort, .soortpagina, .plaat")?.querySelector(".soort-naam, h1")?.textContent || "vogel").toLowerCase()}`);
  });
  document.querySelector(".spectro-vlak")?.classList.toggle("speelt-hier", !!(h && speeltNu && location.pathname === `/soort/${h.soort.slug}`));
}

G.opVerandering((st) => {
  const h = st.huidig;
  speler.hidden = !h;
  if (h) {
    if (!spelerGekoppeld) { G.koppelDoek(spelerDoek); spelerGekoppeld = true; }
    const img = speler.querySelector(".speler-plaat");
    if (h.soort.plaat) { img.src = h.soort.plaat.klein; img.hidden = false; } else img.hidden = true;
    const naam = speler.querySelector(".speler-naam");
    naam.textContent = `${h.soort.nl} · ${h.type}`;
    naam.href = `/soort/${h.soort.slug}`;
    const k = speler.querySelector(".speler-knop");
    k.classList.toggle("speelt", st.speelt);
    k.setAttribute("aria-label", st.speelt ? "Pauzeer" : "Speel verder");
    k.querySelector(".ring").style.strokeDashoffset = (125.7 * (1 - st.deel)).toFixed(1);
  } else if (spelerGekoppeld) { G.ontkoppelDoek(spelerDoek); spelerGekoppeld = false; }
  werkKnoppenBij(st);
});

toon();
