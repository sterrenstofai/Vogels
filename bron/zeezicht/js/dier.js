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
        ${D.plaat ? `<dt>Plaat</dt><dd>${esc(hoofd(D.plaat.werk || D.plaat.maker))}${D.plaat.jaar ? ", " + esc(D.plaat.jaar) : ""}</dd>` : ""}
        <dt>Weetjes</dt><dd>${gevonden.length ? `<a href="#weetjes">${gevonden.length}, nagekeken bij de bron</a>` : "nog geen"}</dd>
      </dl>
    </div>
    <a class="dier-kaartje" href="#waar" data-naar-waar aria-label="Waar en wanneer: kaart en maanden">
      <p class="etiket">${metMaand ? "Meldingen langs de kust" : "Meldingen bij Nederland"}</p>
      ${kaartSvg(true)}
      <p>${D.vakken.length ? `${D.vakken.length} vakken met meldingen` : "Geen meldingen bij Nederland"} (OBIS)</p>
    </a>
    <nav class="dier-strook" aria-label="Alle dieren"><div class="strook">${lijst.map((d) => `<a class="strook-item" href="${pad(d)}"${d.slug === D.slug ? ' aria-current="true"' : ""}><span class="strook-beeld">${d.klein ? `<img src="${d.klein}" alt="" loading="lazy" width="168" height="128">` : `<span class="mono zacht">geen beeld</span>`}</span><span class="strook-naam">${esc(kaal(d.naam))}</span></a>`).join("")}</div></nav>
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

let stopGeluid = null, stopTab = null;
function toonTab(k) {
  const vlak = document.getElementById("podium");
  stopGeluid?.(); stopGeluid = null; stopTab?.(); stopTab = null;
  vlak.className = "podium-vlak " + (k === "geluid" ? "donker" : "licht");
  if (k === "foto") {
    vlak.innerHTML = D.foto
      ? `<figure class="beeld"><div class="beeld-vak"><img src="${D.foto.pad}" alt="${esc(D.foto.alt || "Foto van " + D.naam)}" width="${D.foto.breed}" height="${D.foto.hoog}"></div><figcaption><span class="label">foto</span><span>${bron(D.foto)}${D.foto.waar ? " · " + esc(D.foto.waar) : ""}</span></figcaption></figure>`
      : `<div class="leeg"><strong>Geen goede foto</strong>${esc(D.foto_niet || "We vonden geen vrije foto van dit dier in het wild. Liever niets dan een foto uit een bak, een tekening die doet alsof, of een gemaakt beeld.")}</div>`;
  } else if (k === "plaat") {
    vlak.innerHTML = `<figure class="beeld plaat"><div class="beeld-vak"><img src="${D.plaat.pad}" alt="${esc("Oude plaat van " + D.naam)}" width="${D.plaat.breed}" height="${D.plaat.hoog}"></div><figcaption><span class="label">tekening</span><span>${esc(hoofd(D.plaat.werk || ""))}${D.plaat.jaar ? ", " + esc(D.plaat.jaar) : ""} · ${bron(D.plaat)}</span></figcaption></figure>`;
  } else if (k === "schaal") {
    tekenSchaal(vlak);
  } else if (k === "geluid") {
    tekenGeluid(vlak);
  } else if (k === "waar") {
    tekenWaar(vlak);
  }
}

/* ---------- kaart ---------- */
// plaatsen en zeeën om je te oriënteren op de kaart (lengtegraad, breedtegraad)
const PLAATSEN = [["Den Helder", 4.76, 52.96], ["IJmuiden", 4.6, 52.46], ["Amsterdam", 4.9, 52.37], ["Den Haag", 4.3, 52.08], ["Rotterdam", 4.48, 51.92], ["Vlissingen", 3.57, 51.45], ["Harlingen", 5.42, 53.17]];
const ZEEEN = [["Noordzee", 3.35, 52.85, 1], ["Waddenzee", 5.55, 53.3, 0.62], ["Nederland", 5.85, 52.5, 0.8]];
function xy(lon, lat) { const [lon0, lon1, lat0, lat1] = kust.kader; return [((lon - lon0) / (lon1 - lon0)) * kust.breed, ((lat1 - lat) / (lat1 - lat0)) * kust.hoog]; }
function kaartSvg(klein = false) {
  const [lon0, lon1, lat0, lat1] = kust.kader, B = kust.breed, H = kust.hoog, id = klein ? "wolk-k" : "wolk-g";
  const cb = (0.0439 / (lon1 - lon0)) * B, ch = (0.0439 / (lat1 - lat0)) * H;
  // kleur naar rang: het vak met de meeste meldingen is het donkerst, ook als een paar vakken heel veel meldingen hebben
  const rang = new Map([...D.vakken].sort((p, q) => p[2] - q[2]).map((v, i, l) => [v, l.length > 1 ? i / (l.length - 1) : 1]));
  const vakken = D.vakken.map((v) => { const [x, y] = xy(v[0], v[1]); return `<rect x="${(x - cb / 2).toFixed(1)}" y="${(y - ch / 2).toFixed(1)}" width="${(cb + 0.6).toFixed(1)}" height="${(ch + 0.6).toFixed(1)}" opacity="${(0.08 + 0.85 * rang.get(v) ** 1.3).toFixed(2)}"/>`; }).join("");
  const km50 = (50 / (111.32 * Math.cos((52.5 * Math.PI) / 180)) / (lon1 - lon0)) * B;
  const labels = klein ? "" : `
    ${ZEEEN.map(([t, lon, lat, k]) => { const [x, y] = xy(lon, lat); return `<text class="kaart-zee" x="${x}" y="${y}" text-anchor="middle" style="font-size:${(44 * k).toFixed(1)}px">${t}</text>`; }).join("")}
    ${PLAATSEN.map(([t, lon, lat, links]) => { const [x, y] = xy(lon, lat); return `<circle class="kaart-stip" cx="${x}" cy="${y}" r="7"/><text class="kaart-plaats" x="${links ? x - 13 : x + 13}" y="${y + 10}"${links ? ' text-anchor="end"' : ""}>${t}</text>`; }).join("")}
    <g transform="translate(${B - km50 - 40} ${H - 40})"><line class="kaart-schaal" x1="0" y1="0" x2="${km50}" y2="0"/><line class="kaart-schaal" x1="0" y1="-10" x2="0" y2="10"/><line class="kaart-schaal" x1="${km50}" y1="-10" x2="${km50}" y2="10"/><text class="kaart-plaats" x="${km50 / 2}" y="-18" text-anchor="middle">50 km</text></g>`;
  return `<svg class="kaart-svg" viewBox="0 0 ${B} ${H}" role="img" aria-label="Kaart van de Nederlandse kust met ${D.vakken.length} plekken van ongeveer 5 bij 5 km waar ${esc(D.naam)} gemeld is">
    <defs><filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${klein ? 7 : 5}"/></filter></defs>
    <rect class="zee" width="${B}" height="${H}"/>
    <g class="wolk" filter="url(#${id})">${vakken}</g>
    <g class="sim" data-sim></g>
    <path class="land" d="${kust.land}"/>${labels}
    ${D.vakken.length ? "" : `<text class="kaart-zee" x="${B * 0.32}" y="${H * 0.5}" text-anchor="middle" style="font-size:40px">geen meldingen</text>`}
  </svg>`;
}

// hoe beweegt dit dier in de simulatie?
function beweging() {
  if (["zeepaardje"].includes(D.slug)) return { soort: "zwemt", snel: 6, n: 10 };
  if (D.groep === "zeezoogdieren") return { soort: "zwemt", snel: 70, n: 16 };
  if (D.groep === "haaien en roggen") return { soort: "zwemt", snel: 40, n: 18 };
  if (D.groep === "vissen") return { soort: "zwemt", snel: 32, n: 26 };
  if (D.groep === "inktvissen") return { soort: "zwemt", snel: 22, n: 18 };
  if (D.groep === "kwallen") return { soort: "drijft", snel: 9, n: 28 };
  if (D.groep === "krabben en garnalen" || ["zeester", "wulk", "alikruik"].includes(D.slug)) return { soort: "kruipt", snel: 3, n: 30 };
  return { soort: "stil", snel: 0, n: 34 };
}
const SIMZIN = {
  zwemt: (d) => `Elke stip is een verzonnen ${kaal(d.naam)} die van plek naar plek zwemt, het vaakst naar plekken met veel meldingen. Zo precies zwemt een echte ${kaal(d.naam)} niet: het laat zien waar ${d.hij} vaak is.`,
  drijft: (d) => `Elke stip is een verzonnen ${kaal(d.naam)} die meedrijft met het water. Een kwal kan wel een beetje zwemmen, maar gaat vooral waar de stroming en de wind ${d.hem} heen brengen.`,
  kruipt: (d) => `Elke stip is een verzonnen ${kaal(d.naam)} die langzaam over de bodem kruipt. ${hoofd(d.hij)} komt niet ver: de stippen blijven in de buurt van hun plek.`,
  stil: (d) => `${hoofd(kaal(d.naam))} blijft bijna altijd op één plek, in of op de bodem. De stippen zijn verzonnen plekken waar ${d.hij} kan liggen; ze bewegen niet.`,
};
function simuleer(svg) {
  const laag = svg.querySelector("[data-sim]"), b = beweging(), V = D.vakken;
  if (!V.length || !laag) return () => {};
  const pts = V.map(([lon, lat, n]) => [...xy(lon, lat), Math.log10(n + 1)]), totW = pts.reduce((a, p) => a + p[2], 0);
  const trek = (bij = null, r = 140) => {
    let kand = pts;
    if (bij) { kand = pts.filter((p) => Math.hypot(p[0] - bij[0], p[1] - bij[1]) < r); if (kand.length < 3) kand = pts; }
    const w = kand.reduce((a, p) => a + p[2], 0); let t = Math.random() * w;
    for (const p of kand) { t -= p[2]; if (t <= 0) return [p[0] + (Math.random() - 0.5) * 8, p[1] + (Math.random() - 0.5) * 8]; }
    return [kand[0][0], kand[0][1]];
  };
  const n = Math.min(b.n, Math.max(6, Math.round(pts.length / 6)));
  const stippen = Array.from({ length: n }, () => { const p = trek(); return { x: p[0], y: p[1], thuis: p, doel: trek(p), vx: 0, vy: 0, spoor: [], fase: Math.random() * 6.3 }; });
  laag.innerHTML = stippen.map(() => `<path class="sim-spoor"/><circle class="sim-stip" r="${b.soort === "stil" ? 7 : 9}"/>`).join("");
  const sporen = laag.querySelectorAll(".sim-spoor"), cirkels = laag.querySelectorAll(".sim-stip");
  const teken = () => stippen.forEach((s, i) => { cirkels[i].setAttribute("cx", s.x.toFixed(1)); cirkels[i].setAttribute("cy", s.y.toFixed(1)); sporen[i].setAttribute("d", s.spoor.length > 1 ? "M" + s.spoor.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") : ""); });
  teken();
  if (b.soort === "stil" || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let raf = 0, vorige = performance.now(), sinds = 0, aan = true;
  const stap = (nu) => {
    const dt = Math.min(0.05, (nu - vorige) / 1000); vorige = nu; sinds += dt;
    for (const s of stippen) {
      if (b.soort === "zwemt") {
        const dx = s.doel[0] - s.x, dy = s.doel[1] - s.y, d = Math.hypot(dx, dy);
        if (d < 6) s.doel = trek([s.x, s.y]);
        s.vx += ((dx / (d || 1)) * b.snel - s.vx) * dt * 1.6 + (Math.random() - 0.5) * b.snel * dt * 2;
        s.vy += ((dy / (d || 1)) * b.snel - s.vy) * dt * 1.6 + (Math.random() - 0.5) * b.snel * dt * 2;
      } else if (b.soort === "drijft") {
        s.fase += dt * 0.7;
        s.vx = b.snel * (0.55 + 0.5 * Math.sin(s.fase)); s.vy = -b.snel * (0.75 + 0.4 * Math.cos(s.fase * 0.8));
        if (Math.hypot(s.x - s.thuis[0], s.y - s.thuis[1]) > 120) { const p = trek(); s.x = p[0]; s.y = p[1]; s.thuis = p; s.spoor = []; }
      } else {
        s.fase += dt; const dx = s.thuis[0] - s.x, dy = s.thuis[1] - s.y;
        s.vx = Math.cos(s.fase * 0.9 + s.thuis[0]) * b.snel + dx * 0.3; s.vy = Math.sin(s.fase * 0.7 + s.thuis[1]) * b.snel + dy * 0.3;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    if (sinds > 0.08) { sinds = 0; for (const s of stippen) { s.spoor.push([s.x, s.y]); if (s.spoor.length > (b.soort === "kruipt" ? 8 : 16)) s.spoor.shift(); } }
    teken();
    if (aan) raf = requestAnimationFrame(stap);
  };
  raf = requestAnimationFrame(stap);
  const knop = svg.closest(".waar")?.querySelector("[data-sim-knop]");
  knop?.addEventListener("click", () => { aan = !aan; knop.setAttribute("aria-pressed", String(!aan)); knop.textContent = aan ? "Stilzetten" : "Laat bewegen"; if (aan) { vorige = performance.now(); raf = requestAnimationFrame(stap); } });
  return () => { aan = false; cancelAnimationFrame(raf); };
}

function tekenWaar(vlak) {
  const m = D.maanden?.kust?.map((x, i) => x + (D.maanden.ncp?.[i] || 0)) || [];
  const max = Math.max(1, ...m), tot = m.reduce((a, b) => a + b, 0);
  const strand = D.strand && D.strand.some((x) => x > 0) ? D.strand : null;
  const b = beweging(), beweegt = b.soort !== "stil" && D.vakken.length;
  vlak.innerHTML = `<div class="waar" tabindex="0" role="region" aria-label="Waar en wanneer"><div class="waar-binnen">
    <figure class="waar-kaart">
      <h2>Waar is ${esc(D.hij)} gemeld?</h2>
      ${kaartSvg()}
      <div class="kaart-uitleg">
        <span class="kaart-legenda"><span class="label">echte meldingen</span><span class="legenda-balk" aria-hidden="true"></span><span>weinig → veel</span></span>
        ${D.vakken.length ? `<span class="kaart-legenda"><span class="label">simulatie</span><span>${esc(SIMZIN[b.soort](D))}</span></span>` : ""}
        ${beweegt ? `<button type="button" class="knop licht" data-sim-knop aria-pressed="false">Stilzetten</button>` : ""}
      </div>
    </figure>
    <div class="maanden">
      <h2>Wanneer zie je ${esc(D.hem)}?</h2>
      ${tot ? `<div class="maandstrip" aria-hidden="true">${m.map((x, i) => `<span style="height:${Math.max(2, (x / max) * 100)}%"${i === maand ? ' class="nu"' : ""}></span>`).join("")}</div>
      <div class="maandletters" aria-hidden="true">${MAAND_KORT.map((x, i) => `<span${i === maand ? ' class="nu"' : ""}>${x[0]}</span>`).join("")}</div>
      <p>Meldingen per maand langs de kust en in het Nederlandse deel van de Noordzee, 2016–2025 (${tot.toLocaleString("nl-NL")} in totaal). Het zijn meldingen van mensen, geen telling: in de zomer kijken er meer mensen. De blauwe staaf is deze maand.</p>` : `<p>Er zijn geen meldingen langs de Nederlandse kust in 2016–2025.</p>`}
      ${strand ? `<h2>Gevonden aan het strand</h2><div class="maandstrip" aria-hidden="true">${strand.map((x, i) => `<span style="height:${Math.max(2, x * 100)}%"${i === maand ? ' class="nu"' : ""}></span>`).join("")}</div><div class="maandletters" aria-hidden="true">${MAAND_KORT.map((x, i) => `<span${i === maand ? ' class="nu"' : ""}>${x[0]}</span>`).join("")}</div><p>Bij hoeveel van de strandbezoeken strandwachters van Stichting ANEMOON ${esc(D.hem)} vonden, per maand (een volle staaf = elke keer), ${esc(D.strand_jaren || "1978–2021")}.</p>` : ""}
      <table class="sr"><caption>Meldingen per maand</caption><tr>${MAANDEN.map((x, i) => `<th>${x}</th><td>${m[i] || 0}</td>`).join("")}</tr></table>
    </div></div>
    <div class="beeld-voet" style="background:var(--vlak);color:var(--zacht)"><span>Kaart: meldingen uit OBIS in vakken van ongeveer 5 bij 5 km, zacht gemaakt; meldingen op land laten we weg. Kust: Natural Earth. Meldingen per maand: GBIF. De bewegende stippen zijn verzonnen.</span></div></div>`;
  stopTab = simuleer(vlak.querySelector(".kaart-svg"));
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
const HOOG_VORM = { ster: 0.95, schelp: 0.8, krab: 0.7, kwal: 0.9, slak: 0.75, worm: 0.25, inktvis: 0.9, rog: 0.9, garnaal: 0.5, zeehond: 0.35, walvis: 0.32, vis: 0.36 };
function tekenSchaal(vlak, keuze) {
  const L = D.lengte_cm;
  const opties = L < 30 ? ["hand", "kind"] : L > 400 ? ["kind", "bus"] : ["kind", "hand"];
  keuze ||= opties[0];
  const REF = { hand: { b: 11, h: 18, naam: "een hand van een volwassene (ongeveer 18 cm)", kort: "hand" }, kind: { b: 34, h: KIND, naam: "een kind van vier (ongeveer 1,05 m)", kort: "kind" }, bus: { b: 1200, h: 300, naam: "een bus (ongeveer 12 m)", kort: "bus" } }[keuze];
  const vorm = vormVan(), dierH = L * (HOOG_VORM[vorm] ?? 0.4);
  const W = 1000, grond = 340, x0 = 50, gat = Math.max(L, REF.b) * 0.18;
  const s = Math.min((W - 2 * x0) / (L + gat + REF.b), 290 / Math.max(dierH, REF.h));   // px per cm
  const dB = L * s, dH = dierH * s, rx = x0 + dB + gat * s, rB = REF.b * s, rH = REF.h * s;
  let ref = "";
  if (keuze === "kind") ref = `<g transform="translate(${rx} ${grond - rH}) scale(${rB / 32} ${rH / 100})"><circle class="vergelijk" cx="16" cy="9" r="8" vector-effect="non-scaling-stroke"/><path class="vergelijk" vector-effect="non-scaling-stroke" d="M16 17 V60 M16 60 L6 100 M16 60 L26 100 M16 28 L2 50 M16 28 L30 50"/></g>`;
  else if (keuze === "hand") ref = `<g transform="translate(${rx} ${grond - rH}) scale(${rB / 64} ${rH / 100})"><path class="vergelijk" vector-effect="non-scaling-stroke" d="M20 100 L20 55 L8 35 C5 30 12 26 15 31 L22 42 L22 8 C22 3 30 3 30 8 L30 40 L32 2 C32 -3 40 -3 40 2 L40 40 L43 6 C43 1 51 1 51 6 L50 42 L54 14 C54 9 62 9 62 14 L58 62 C56 80 50 92 48 100"/></g>`;
  else ref = `<rect class="vergelijk" x="${rx}" y="${grond - rH}" width="${rB}" height="${rH * 0.86}" rx="6"/><circle class="vergelijk" cx="${rx + rB * 0.18}" cy="${grond - rH * 0.12}" r="${rH * 0.12}"/><circle class="vergelijk" cx="${rx + rB * 0.82}" cy="${grond - rH * 0.12}" r="${rH * 0.12}"/>`;
  ref += `<text x="${rx + rB / 2}" y="${grond - rH - 10}" text-anchor="middle">${REF.kort}</text>`;
  const open = ["krab", "kwal", "worm", "inktvis", "garnaal"].includes(vorm);
  vlak.innerHTML = `<div class="schaal"><svg viewBox="0 0 ${W} 420" role="img" aria-label="${esc(hoofd(D.naam))} op schaal naast ${REF.naam}">
      <line class="grond" x1="20" y1="${grond}" x2="${W - 20}" y2="${grond}"/>
      <g transform="translate(${x0} ${grond - dH}) scale(${dB / 100} ${dH / 100})"><path class="dier" d="${VORM[vorm]}" vector-effect="non-scaling-stroke"${open ? ' style="fill:none;stroke-width:3"' : ""}/></g>
      <line class="maatlijn" x1="${x0}" y1="${grond + 22}" x2="${x0 + dB}" y2="${grond + 22}"/><line class="maatlijn" x1="${x0}" y1="${grond + 14}" x2="${x0}" y2="${grond + 30}"/><line class="maatlijn" x1="${x0 + dB}" y1="${grond + 14}" x2="${x0 + dB}" y2="${grond + 30}"/>
      <text x="${x0 + Math.max(dB / 2, 60)}" y="${grond + 52}" text-anchor="middle">${esc(kaal(D.naam))} ${esc(D.lengte_kort || "")}</text>
      ${ref}
    </svg>
    <div class="schaal-voet"><span><span class="label">tekening</span> Op schaal: ${esc(D.lengte_tekst)} (uit een <a href="#weetjes">weetje</a>), naast ${REF.naam}. De vorm is een eenvoudige tekening, niet het echte dier.</span>
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
