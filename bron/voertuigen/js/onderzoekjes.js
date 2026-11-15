// Onderzoekjes met Fos: zes opdrachten met de fiets. Eerst op de site, dan naar buiten.
// Overgenomen van De Ruimte: wat heb je nodig, zo doe je het, een interactief stuk, "En dan naar buiten",
// een logboek, een stempel "Gedaan", een voortgangsbalk en een certificaat (A4-PNG). Alles in localStorage.
import * as STEM from "/js/stem.js";
import { MAANDEN } from "/js/mijn.js";

const SLEUTEL = "fiets-onderzoekjes";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const lees = () => { try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; } };
const schrijf = (lb) => { try { localStorage.setItem(SLEUTEL, JSON.stringify(lb)); } catch {} };
const bewaar = (slug, veld, w) => { const lb = lees(); lb[slug] = { ...(lb[slug] || {}), [veld]: w }; schrijf(lb); };
const vandaag = () => { const d = new Date(); return `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`; };

const OZ = [
  { slug: "tel-de-spaken", titel: "Tel de spaken", kort: "Hoeveel spaken heeft een wiel? Tel ze op de site, en dan op je eigen fiets.",
    nodig: ["Een fiets (of de fiets van de buren)", "Een wasknijper of een stukje plakband"],
    stappen: ["Tel op de site de spaken van het wiel. Tik op de plus bij elke spaak.", "Ga naar je eigen fiets. Zet een wasknijper op één spaak: daar begin je.", "Draai het wiel langzaam rond en tel tot je weer bij de wasknijper bent."],
    zelf: ["Heeft het voorwiel net zoveel spaken als het achterwiel?", "Zie je dat de spaken elkaar kruisen?", "Een kinderfiets heeft vaak minder spaken. Tel ze ook eens."] },
  { slug: "een-rondje-trappen", titel: "Hoe ver kom je met één rondje?", kort: "Eén keer de trappers rond: hoe vaak gaat het wiel dan rond, en hoe ver rijd je?",
    nodig: ["Een fiets", "Een stoepkrijtje", "Een volwassene die de fiets vasthoudt"],
    stappen: ["Kies op de site hoeveel tanden voor en achter.", "De site rekent uit hoe vaak het wiel rondgaat en hoe ver dat is.", "Buiten: zet een krijtstreep bij het wiel. Duw de fiets langzaam vooruit, terwijl een volwassene de trapper één rondje draait."],
    zelf: ["Klopt de afstand met wat de site zei?", "Schakel naar een ander tandwiel en doe het nog eens. Kom je verder of minder ver?", "Een groot tandwiel achter is licht trappen, maar je komt minder ver."] },
  { slug: "bel-en-lampjes", titel: "Bel en lampjes", kort: "Welke lamp is wit, welke is rood? En hoe klinkt een bel?",
    nodig: ["Een fiets met lampjes en een bel", "Een donker hoekje, of de avond"],
    stappen: ["Speel het spelletje op de site: welke kleur hoort voor, welke achter?", "Tik op de bel op de site.", "Ga naar je eigen fiets en zet de lampjes aan."],
    zelf: ["Is het lampje voor wit en achter rood?", "Bel een keer. Hoor je hem van ver?", "Kijk 's avonds naar fietsers op straat: zie je de lampjes?"] },
  { slug: "lucht-in-de-band", titel: "Lucht in de band", kort: "Een band zit vol lucht. Wat gebeurt er als er te weinig in zit?",
    nodig: ["Een fiets", "Een fietspomp", "Een volwassene"],
    stappen: ["Schuif op de site aan de pomp en kijk wat de band doet.", "Knijp met je duim in de band van je eigen fiets. Is hij hard of zacht?", "Pomp samen met een volwassene de band op."],
    zelf: ["Zoek het ventiel: daar gaat de lucht in.", "Knijp na het pompen nog eens. Voel je het verschil?", "Duw de fiets met zachte en met harde banden. Wat rolt makkelijker?"] },
  { slug: "fietsen-spotten", titel: "Fietsen spotten", kort: "Ga op de stoep staan en tel welke fietsen er langskomen.",
    nodig: ["Een plekje bij een fietspad of in het park", "Tien minuten"],
    stappen: ["Ga samen veilig op de stoep staan, niet op het fietspad.", "Tik op de plus bij elke fiets die je ziet.", "Kijk na tien minuten welke fiets het vaakst langskwam."],
    zelf: ["Zie je een fiets met een motor? Die heeft vaak een accu bij de bagagedrager of in de buis.", "Hoeveel fietsen hebben een kinderzitje?", "Zwaaien naar de fietsers mag."] },
  { slug: "bouw-een-fiets", titel: "Bouw een fiets van karton", kort: "Met karton, doppen en rietjes. Welke onderdelen heb je nodig?",
    nodig: ["Karton", "Doppen of deksels (wielen)", "Rietjes of stokjes", "Plakband en een schaar (samen met een volwassene)"],
    stappen: ["Kijk op de site welke onderdelen een fiets heeft. Vink ze af als je ze hebt gemaakt.", "Begin met de twee wielen en het frame in een driehoek.", "Maak dan het stuur, het zadel en de trappers."],
    zelf: ["Laat je fiets zien aan iemand. Weet die alle onderdelen?", "Vergelijk je fiets met een echte. Wat ben je vergeten?", "Geef je fiets een naam."] },
];

const app = document.getElementById("app");
const pad = location.pathname.replace(/\/$/, "").split("/").filter(Boolean); // ["onderzoekjes", slug?]
if (pad[1]) een(pad[1]) || overzicht(); else overzicht();

function aantalKlaar(lb) { return OZ.filter((o) => lb[o.slug]?.klaar).length; }
function voortgang(lb, hier = null) {
  const n = aantalKlaar(lb);
  return `<div class="oz-voortgang" role="progressbar" aria-label="Voortgang" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${n}">
    <ol>${OZ.map((o) => `<li class="${lb[o.slug]?.klaar ? "klaar" : ""}${o.slug === hier ? " hier" : ""}" title="${esc(o.titel)}"></li>`).join("")}</ol>
    <p class="mono">${n === 6 ? "Alle zes gedaan. Tijd voor je certificaat!" : `${n} van de 6 gedaan`}</p></div>`;
}

function overzicht() {
  const lb = lees();
  document.title = "Onderzoekjes · De fiets";
  app.innerHTML = `
    <p class="etiket mono">Samen op onderzoek</p>
    <h1>Onderzoekjes met Fos</h1>
    <p class="inleiding">Zes opdrachten met de fiets. Eerst kijken en tellen op de site, dan naar buiten naar een echte fiets. Altijd samen met een volwassene.</p>
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
  document.title = `${o.titel} · Onderzoekjes`;
  app.innerHTML = `
    <a class="terug mono" href="/onderzoekjes">← Alle onderzoekjes</a>
    <p class="etiket mono">Onderzoekje ${i + 1} van 6</p>
    <h1>${esc(o.titel)}</h1>
    <p class="inleiding">${esc(o.kort)}</p>
    ${voortgang(lees(), slug)}
    <div class="oz-twee"><div class="oz-blok"><h2>Wat heb je nodig?</h2><ul>${o.nodig.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>
      <div class="oz-blok"><h2>Zo doe je het</h2><ol>${o.stappen.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div></div>
    <section class="oz-werk" aria-live="polite"></section>
    <div class="oz-buiten"><h2>En dan naar buiten</h2><ul>${o.zelf.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>
    <section class="oz-logboek"><h2>Logboek</h2>
      <label><span class="mono">Wat ontdekte je?</span><textarea id="notitie" rows="4" placeholder="Schrijf of laat iemand voor je schrijven…">${esc(lb.notitie || "")}</textarea></label>
      <div class="oz-klaar">${lb.klaar ? `<span class="oz-stempel">Gedaan<small>${esc(lb.klaar)}</small></span>` : `<button type="button" class="knop" data-klaar>Klaar! Zet de stempel</button>`}</div>
      ${OZ[i + 1] ? `<p><a class="knop licht breed" href="/onderzoekjes/${OZ[i + 1].slug}">Volgend onderzoekje: ${esc(OZ[i + 1].titel)}</a></p>` : `<p><a class="knop licht breed" href="/onderzoekjes">Naar alle onderzoekjes</a></p>`}
    </section>`;
  app.querySelector("#notitie").addEventListener("input", (e) => bewaar(slug, "notitie", e.target.value));
  app.querySelector("[data-klaar]")?.addEventListener("click", () => {
    const t = vandaag(); bewaar(slug, "klaar", t); STEM.klik();
    const alles = aantalKlaar(lees()) === 6;
    app.querySelector(".oz-klaar").innerHTML = `<span class="oz-stempel nieuw">Gedaan<small>${t}</small></span>${alles ? ` <a class="knop" href="/onderzoekjes#certificaat">Alles gedaan! Haal je certificaat</a>` : ""}`;
    app.querySelector(".oz-voortgang").outerHTML = voortgang(lees(), slug);
  });
  ({ "tel-de-spaken": spaken, "een-rondje-trappen": rondje, "bel-en-lampjes": lampjes, "lucht-in-de-band": band, "fietsen-spotten": spotten, "bouw-een-fiets": bouwen })[slug](app.querySelector(".oz-werk"), slug);
  return true;
}

/* ---------- de interactieve stukken ---------- */
function wielSvg(spaken, geteld = 0) {
  const r = 120, lijnen = Array.from({ length: spaken }, (_, i) => { const a = (i / spaken) * Math.PI * 2, x = Math.cos(a) * (r - 14), y = Math.sin(a) * (r - 14), aan = i < geteld; return `<line x1="${(Math.cos(a + 0.6) * 12).toFixed(1)}" y1="${(Math.sin(a + 0.6) * 12).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="${aan ? "aan" : ""}"/>`; }).join("");
  return `<svg class="oz-wiel" viewBox="-135 -135 270 270" aria-hidden="true"><circle r="${r}" class="band"/><circle r="${r - 12}" class="velg"/>${lijnen}<circle r="14" class="naaf"/></svg>`;
}
function spaken(werk, slug) {
  let n = lees()[slug]?.telling || 0;
  const teken = () => {
    werk.innerHTML = `<h2>Tel de spaken op de site</h2><div class="oz-spel"><div>${wielSvg(24, n)}</div><div class="oz-teller-groot"><output>${n}</output><div class="oz-knoppen"><button type="button" data-min aria-label="Eén minder">−</button><button type="button" data-plus aria-label="Eén meer">+</button></div>
      <p>${n === 24 ? "Goed geteld! Dit wiel heeft 24 spaken." : n > 24 ? "Te veel! Begin opnieuw met min." : "Tik op de plus bij elke spaak. De rode zijn al geteld."}</p></div></div>`;
    werk.querySelector("[data-plus]").addEventListener("click", () => { n++; bewaar(slug, "telling", n); STEM.klik(); if (n === 24) STEM.zeg("Vierentwintig! Goed geteld.", { kind: true }); teken(); });
    werk.querySelector("[data-min]").addEventListener("click", () => { n = Math.max(0, n - 1); bewaar(slug, "telling", n); teken(); });
  };
  teken();
}
function rondje(werk) {
  let voor = 46, achter = 21;
  const OMTREK = 2.13; // meter: wiel van 622 mm met band van 32 mm
  const teken = () => {
    const rond = voor / achter, m = rond * OMTREK;
    werk.innerHTML = `<h2>Reken het uit</h2><div class="oz-reken">
      <label><span class="mono">Tanden voor (kettingblad)</span><input type="range" min="30" max="52" value="${voor}" data-v><output>${voor}</output></label>
      <label><span class="mono">Tanden achter (tandwiel)</span><input type="range" min="10" max="46" value="${achter}" data-a><output>${achter}</output></label>
      <div class="oz-uitslag"><p><b>${rond.toFixed(1).replace(".", ",")}×</b> gaat het wiel rond</p><p><b>${m.toFixed(1).replace(".", ",")} m</b> rijd je met één rondje trappen</p>
      <div class="oz-baan"><span style="width:${Math.min(100, (m / 11) * 100).toFixed(0)}%"></span></div><p class="zacht fijn">Het wiel is ongeveer 2,1 meter rond. Een stap van een kind is ongeveer 40 cm: dat zijn ${Math.round(m / 0.4)} stappen.</p></div></div>`;
    werk.querySelector("[data-v]").addEventListener("input", (e) => { voor = +e.target.value; teken(); werk.querySelector("[data-v]").focus(); });
    werk.querySelector("[data-a]").addEventListener("input", (e) => { achter = +e.target.value; teken(); werk.querySelector("[data-a]").focus(); });
  };
  teken();
}
function lampjes(werk) {
  let goed = 0;
  const vraag = (i) => {
    const v = [["voor", "wit"], ["achter", "rood"]][i];
    if (!v) { werk.innerHTML = `<h2>Goed gedaan!</h2><p class="inleiding">Voor wit, achter rood. Zo zien andere mensen in het donker of je naar ze toe rijdt of van ze weg.</p><p><button type="button" class="knop" data-bel>Tring! Tik op de bel</button></p>`; werk.querySelector("[data-bel]").addEventListener("click", STEM.bel); return; }
    werk.innerHTML = `<h2>Welke kleur is de lamp ${v[0]}?</h2><div class="oz-keuzes">${["wit", "rood", "groen"].map((k) => `<button type="button" class="oz-kleur ${k}" data-k="${k}">${k}</button>`).join("")}</div><p class="oz-feedback"></p><p><button type="button" class="knop licht" data-bel>Tring! Tik op de bel</button></p>`;
    werk.querySelector("[data-bel]").addEventListener("click", STEM.bel);
    for (const b of werk.querySelectorAll("[data-k]")) b.addEventListener("click", () => {
      if (b.dataset.k === v[1]) { goed++; STEM.zeg(`Ja, ${v[1]}!`, { kind: true }); setTimeout(() => vraag(i + 1), 900); b.classList.add("goed"); }
      else { b.classList.add("fout"); werk.querySelector(".oz-feedback").textContent = "Nog een keer proberen."; }
    });
  };
  vraag(0);
}
function band(werk) {
  let druk = 1;
  const teken = () => {
    const plat = Math.max(0, 1 - druk / 5), h = 120 - plat * 26;
    werk.innerHTML = `<h2>Pomp de band op</h2><div class="oz-spel"><svg class="oz-band" viewBox="0 0 260 160" aria-hidden="true"><ellipse cx="130" cy="${150 - h / 2}" rx="${70 + plat * 34}" ry="${h / 2}" class="band"/><ellipse cx="130" cy="${150 - h / 2}" rx="${46 + plat * 20}" ry="${h / 2 - 22}" class="velg"/><line x1="10" y1="150" x2="250" y2="150" class="weg"/></svg>
      <div><label><span class="mono">Pomp</span><input type="range" min="0" max="6" step="0.5" value="${druk}" data-p></label><p><b>${druk.toFixed(1).replace(".", ",")} bar</b></p><p>${druk < 2 ? "Te zacht! De band wordt plat en het fietsen gaat zwaar." : druk < 3.5 ? "Al beter, maar nog wat zacht." : "Lekker hard. Kijk op de zijkant van je band hoeveel er in mag."}</p></div></div>
      <p class="zacht fijn">Een tekening. De goede druk staat op de zijkant van je eigen band.</p>`;
    werk.querySelector("[data-p]").addEventListener("input", (e) => { druk = +e.target.value; teken(); werk.querySelector("[data-p]").focus(); });
  };
  teken();
}
function spotten(werk, slug) {
  const SOORTEN = ["stadsfiets", "racefiets", "fiets met motor", "bakfiets", "kinderfiets", "mountainbike"];
  const t = lees()[slug]?.tellers || {};
  const teken = () => {
    const tot = SOORTEN.reduce((a, s) => a + (t[s] || 0), 0);
    werk.innerHTML = `<h2>Turven</h2><div class="oz-tellijst">${SOORTEN.map((s) => `<div class="oz-teller"><span>${esc(s)}</span><div class="oz-knoppen"><button type="button" data-min="${s}" aria-label="Eén minder ${esc(s)}">−</button><output>${t[s] || 0}</output><button type="button" data-plus="${s}" aria-label="Eén meer ${esc(s)}">+</button></div></div>`).join("")}</div><p>Samen <b>${tot}</b> fietsen geteld.</p>`;
    for (const b of werk.querySelectorAll("[data-plus]")) b.addEventListener("click", () => { t[b.dataset.plus] = (t[b.dataset.plus] || 0) + 1; bewaar(slug, "tellers", t); STEM.klik(); teken(); });
    for (const b of werk.querySelectorAll("[data-min]")) b.addEventListener("click", () => { t[b.dataset.min] = Math.max(0, (t[b.dataset.min] || 0) - 1); bewaar(slug, "tellers", t); teken(); });
  };
  teken();
}
function bouwen(werk, slug) {
  const DELEN = ["twee wielen", "het frame (een driehoek)", "de voorvork", "het stuur", "het zadel", "de trappers", "de ketting", "de bel", "een lampje"];
  const v = lees()[slug]?.vinkjes || {};
  const teken = () => {
    const n = DELEN.filter((d) => v[d]).length;
    werk.innerHTML = `<h2>Welke onderdelen heb je gemaakt?</h2><ul class="oz-vinklijst">${DELEN.map((d) => `<li><label><input type="checkbox" ${v[d] ? "checked" : ""} data-d="${esc(d)}"> ${esc(d)}</label></li>`).join("")}</ul><p>${n} van de ${DELEN.length}.${n === DELEN.length ? " Je fiets is af!" : ""} <a href="/?sectie=0">Bekijk de onderdelen op de site</a></p>`;
    for (const c of werk.querySelectorAll("[data-d]")) c.addEventListener("change", () => { v[c.dataset.d] = c.checked; bewaar(slug, "vinkjes", v); teken(); });
  };
  teken();
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
    d.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `certificaat-fietsonderzoeker-${naam.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "fos"}.png`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, "image/png");
  });
}
async function tekenCert(doek, naam) {
  await Promise.all([document.fonts.load('600 100px "Geist"'), document.fonts.load('400 40px "Geist Mono"')]).catch(() => {});
  const W = doek.width, H = doek.height, u = W / 1000, c = doek.getContext("2d"), inkt = "#1E1E1E", rood = "#C8102E", zacht = "#8A8A87";
  c.fillStyle = "#F1F0EE"; c.fillRect(0, 0, W, H);
  c.strokeStyle = inkt; c.lineWidth = 1.2 * u; c.strokeRect(30 * u, 30 * u, W - 60 * u, H - 60 * u);
  const x = 70 * u, label = (t, lx, ly, k = inkt) => { c.fillStyle = k; c.font = `400 ${11 * u}px "Geist Mono", monospace`; c.fillText(t.toUpperCase(), lx, ly); };
  c.fillStyle = inkt; c.fillRect(x, 92 * u, 7 * u, 7 * u); label("De fiets · Onderzoekjes met Fos", x + 16 * u, 99 * u);
  c.font = `600 ${80 * u}px "Geist", sans-serif`; c.fillText("Certificaat", x - 4 * u, 195 * u);
  label("Dit certificaat is voor", x, 262 * u, zacht);
  let maat = 92; do { c.font = `600 ${maat * u}px "Geist", sans-serif`; maat -= 4; } while (c.measureText(naam).width > 430 * u && maat > 30);
  c.fillStyle = rood; c.fillText(naam, x, 352 * u);
  c.fillStyle = inkt; c.font = `400 ${18 * u}px "Geist", sans-serif`;
  ["heeft als echte fietsonderzoeker alle zes", "onderzoekjes gedaan: tellen, rekenen, kijken,", "pompen, spotten en bouwen."].forEach((r, i) => c.fillText(r, x, 420 * u + i * 26 * u));
  OZ.forEach((o, i) => { const bx = x + (i % 2) * 225 * u, by = 530 * u + Math.floor(i / 2) * 42 * u; c.font = `600 ${20 * u}px "Geist", sans-serif`; c.fillText(String(i + 1), bx, by); c.font = `400 ${13 * u}px "Geist", sans-serif`; c.fillText(o.titel, bx + 26 * u, by - 3 * u); });
  // de fiets in lijnen, rechts
  const fx = W * 0.6, fy = H * 0.62, s = 300 * u; c.strokeStyle = inkt; c.lineWidth = 2.2 * u; c.lineCap = "round";
  const P = (a, b) => [fx + a * s, fy - b * s], lijn = (...pp) => { c.beginPath(); pp.forEach(([a, b], i) => (i ? c.lineTo(...P(a, b)) : c.moveTo(...P(a, b)))); c.stroke(); };
  for (const ax of [0, 1.02]) { c.beginPath(); c.arc(...P(ax, 0), 0.34 * s, 0, Math.PI * 2); c.stroke(); }
  lijn([0, 0], [0.41, 0], [0.26, 0.52], [0, 0]); lijn([0.41, 0], [0.8, 0.43], [0.26, 0.52]); lijn([0.8, 0.43], [1.02, 0]); lijn([0.26, 0.52], [0.21, 0.66]); lijn([0.13, 0.68], [0.32, 0.68]); lijn([0.8, 0.43], [0.84, 0.56], [0.95, 0.56]);
  c.save(); c.translate(W - 150 * u, H - 140 * u); c.rotate(-0.12); c.fillStyle = rood; c.beginPath(); c.arc(0, 0, 62 * u, 0, Math.PI * 2); c.fill(); c.textAlign = "center"; c.fillStyle = "#fff"; c.font = `600 ${22 * u}px "Geist", sans-serif`; c.fillText("Gedaan", 0, 8 * u); c.restore(); c.textAlign = "left";
  label(`${vandaag()} · De fiets`, x, H - 52 * u, zacht);
}
