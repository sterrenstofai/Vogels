// Onderzoekjes met Fos: elke week samen op onderzoek. Eerst op de site, dan naar buiten (of naar het raam) om echt te kijken.
// Het raamwerk (logboek, stempel, voortgang, certificaat) is overgenomen van ikhooreengeluidje en Voggels.
// Het logboek staat alleen in de browser van dit apparaat (localStorage), nergens anders.
import * as PLEK from "./plek.js";
import * as KAART from "./kaart.js";
import { vanavond, maanfase, richting, klok, positie } from "./hemel.js";
import { maanSvg } from "./app.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const schud = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const MAANDNAMEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/* ---------- Logboek (alleen op dit apparaat) ---------- */
const SLEUTEL = "ruimte-onderzoekjes";
function leesLogboek() { try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; } }
function schrijfLogboek(lb) { try { localStorage.setItem(SLEUTEL, JSON.stringify(lb)); } catch {} }
function bewaar(slug, veld, waarde) { const lb = leesLogboek(); lb[slug] = { ...(lb[slug] || {}), [veld]: waarde }; schrijfLogboek(lb); }

export const ONDERZOEKJES = [
  { slug: "wat-zie-je-vanavond", titel: "Wat zie je vanavond?", kort: "De site zegt wat er te zien is, en waar. Dan samen naar buiten of naar het raam.",
    nodig: ["Een avond zonder te veel wolken", "Een jas, of een raam op het zuiden", "Tien minuten"],
    stappen: ["Kies je plek, of laat de site je locatie gebruiken.", "Kijk wat er vanavond te zien is, en in welke richting.", "Ga naar buiten als het donker is en zoek het samen op."],
    zelf: ["Wijs met je arm de richting aan. Het noorden is waar de Poolster staat.", "Een vuist met gestrekte arm is ongeveer 10 graden. Hoeveel vuisten hoog staat de planeet?", "Knippert het? Sterren twinkelen, planeten meestal niet."] },
  { slug: "maan-dagboek", titel: "De maan houdt een dagboek", kort: "Een week lang elke avond de maan tekenen. Verandert hij?",
    nodig: ["Papier en een potlood", "Een week lang een paar minuten per avond", "Een raam of een tuin"],
    stappen: ["Kijk hier hoe de maan er vandaag uitziet.", "Zoek de maan aan de hemel en teken hem in een rondje.", "Doe dat zeven avonden. Leg de tekeningen naast elkaar."],
    zelf: ["Teken ook waar de maan staat: boven het dak, naast een boom?", "Soms zie je de maan overdag. Kijk eens 's middags.", "Wordt de maan dikker of dunner? Dan is hij wassend of afnemend."] },
  { slug: "hoe-groot-is-de-zon", titel: "Hoe groot is de zon?", kort: "Leg het zonnestelsel op schaal in de gang, de tuin of het park.",
    nodig: ["Een grote bal (de zon)", "Een korrel zout of een speldenknop (de aarde)", "Een rolmaat of grote stappen", "Een lange gang, een tuin of een park"],
    stappen: ["Kies hoe groot jouw zon is.", "De site rekent uit hoe groot de planeten dan zijn en hoe ver weg ze moeten.", "Leg de zon neer en loop de stappen af."],
    zelf: ["Hoeveel grote stappen is het naar de aarde? En naar Jupiter?", "De maan hoort heel dicht bij de aarde. Hoe dichtbij?", "Bijna alles in de ruimte is leeg. Zie je dat?"] },
  { slug: "welke-planeet", titel: "Welke planeet is dit?", kort: "Een foto, drie namen. Eén is goed.",
    nodig: ["Een telefoon of tablet", "Vijf minuten"],
    stappen: ["Kijk goed naar de foto.", "Kies de goede naam uit drie.", "Na vijf foto's zie je je score."],
    zelf: ["Welke planeet heeft ringen? Welke is rood?", "Teken je eigen planeet. Hoe heet hij?", "Zoek vanavond een planeet aan de hemel. Hoe ziet hij er daar uit?"] },
  { slug: "zwaar-en-licht", titel: "Zwaar en licht", kort: "Hoe zwaar is je knuffel op de maan of op Jupiter?",
    nodig: ["Een knuffel", "Een keukenweegschaal"],
    stappen: ["Leg je knuffel op de weegschaal en lees af hoeveel gram hij weegt.", "Tik het getal in.", "Kijk wat de weegschaal op de maan, op Mars en op Jupiter zou zeggen."],
    zelf: ["Spring zo hoog als je kunt. Op de maan zou je zes keer zo hoog springen.", "Til samen iets zwaars op. Op de maan zou dat makkelijk gaan.", "De knuffel zelf verandert niet. Alleen hoe hard hij naar beneden wordt getrokken."] },
  { slug: "sterrenbeeld-leggen", titel: "Sterrenbeeld leggen", kort: "Leg de Grote Beer na met knopen of steentjes. Zoek hem dan buiten.",
    nodig: ["Knopen, steentjes of glow-in-the-dark-stickers", "Een tafel of de vloer", "Een donkere avond"],
    stappen: ["Kies de Grote Beer of Cassiopeia.", "Leg de sterren na met knopen of steentjes, zoals op het plaatje.", "Ga naar buiten en zoek het echte sterrenbeeld. De site zegt waar."],
    zelf: ["De Grote Beer lijkt op een steelpan. Zie je hem?", "Volg de twee sterren aan de buitenkant van de pan. Ga in die richting ongeveer vijf keer zo ver: daar staat de Poolster.", "Cassiopeia lijkt op een W. Of een M, als hij andersom staat."] },
];

/* ---------- Gedeelde stukjes ---------- */

const SPEEL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>`;
const fotoImg = (D, key) => D.fotos[key] ? `<img src="${D.fotos[key].pad}" alt="" loading="lazy">` : "";

/* ---------- Overzicht ---------- */

export function overzicht(app, D) {
  const lb = leesLogboek();
  app.innerHTML = `
  <section class="breed oz-held">
    <p class="etiket">Elke week op onderzoek</p>
    <h1>Onderzoekjes <span class="accent">met Fos</span></h1>
    <p class="held-sub">Elke week gaan Fos (4) en ik samen op onderzoek. Deze zes opdrachten zijn ons begin: eerst kijken en rekenen op de site, dan naar buiten (of naar het raam) om het echt te zien. Je hebt geen telescoop nodig. Begin waar je wilt.</p>
    ${voortgang(lb)}
  </section>
  <section class="breed oz-lijst">
    ${ONDERZOEKJES.map((o, i) => `
      <a class="oz-kaart" href="/onderzoekjes/${o.slug}" data-link>
        <span class="oz-nummer">${i + 1}</span>
        <span class="oz-kaart-tekst"><strong>${esc(o.titel)}</strong><span>${esc(o.kort)}</span></span>
        ${lb[o.slug]?.klaar ? `<span class="oz-stempel oz-stempel-klein" aria-label="Gedaan">Gedaan</span>` : `<span class="oz-pijl" aria-hidden="true">→</span>`}
      </a>`).join("")}
  </section>
  ${certificaatBlok(lb)}
  <section class="breed">${opnieuwBlok(lb)}</section>
  <section class="breed oz-noot"><p class="zacht">Wat je invult, welke onderzoekjes klaar zijn en de naam op het certificaat blijven op dit apparaat. Het gaat niet naar ons of naar iemand anders.</p></section>`;
  bindCertificaat(app);
  bindOpnieuw(app, D);
  if (location.hash === "#certificaat") requestAnimationFrame(() => document.getElementById("certificaat")?.scrollIntoView({ block: "start" }));
}

/* ---------- Voortgang, opnieuw en certificaat ---------- */

function aantalKlaar(lb) { return ONDERZOEKJES.filter((o) => lb[o.slug]?.klaar).length; }

function voortgang(lb, huidig = null) {
  const n = aantalKlaar(lb), totaal = ONDERZOEKJES.length;
  return `<div class="oz-voortgang" role="progressbar" aria-label="Voortgang" aria-valuemin="0" aria-valuemax="${totaal}" aria-valuenow="${n}">
    <ol class="oz-voortgang-balk">${ONDERZOEKJES.map((o, i) => `<li class="${lb[o.slug]?.klaar ? "klaar" : ""}${o.slug === huidig ? " hier" : ""}" title="${esc(o.titel)}"><span class="sr">${i + 1}. ${esc(o.titel)}${lb[o.slug]?.klaar ? ", gedaan" : ""}</span></li>`).join("")}</ol>
    <p>${n === totaal ? `Alle ${totaal} gedaan. Tijd voor je certificaat!` : `${n} van de ${totaal} gedaan${n ? `, nog ${totaal - n} te gaan` : ""}.`}</p>
  </div>`;
}

// Opnieuw beginnen: stempels en notities weg, de naam voor het certificaat blijft staan
function opnieuwBlok(lb) {
  if (!ONDERZOEKJES.some((o) => lb[o.slug])) return "";
  return `<div class="oz-opnieuw" data-opnieuw-blok>
    <button class="knop-pil" type="button" data-opnieuw-vraag><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.05-4.95M5 4.5V8h3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>Opnieuw beginnen</button>
    <div class="oz-opnieuw-vraag" hidden>
      <p>Alle stempels en wat je in de logboeken schreef gaan weg. Zeker weten?</p>
      <button class="knop-pil knop-accent" type="button" data-opnieuw-ja>Ja, opnieuw beginnen</button>
      <button class="knop-pil" type="button" data-opnieuw-nee>Nee, toch niet</button>
    </div>
  </div>`;
}

function bindOpnieuw(app, D) {
  const blok = app.querySelector("[data-opnieuw-blok]");
  if (!blok) return;
  const vraag = blok.querySelector(".oz-opnieuw-vraag"), knop = blok.querySelector("[data-opnieuw-vraag]");
  knop.addEventListener("click", () => { vraag.hidden = false; knop.hidden = true; blok.querySelector("[data-opnieuw-nee]").focus(); });
  blok.querySelector("[data-opnieuw-nee]").addEventListener("click", () => { vraag.hidden = true; knop.hidden = false; knop.focus(); });
  blok.querySelector("[data-opnieuw-ja]").addEventListener("click", () => {
    const naam = leesLogboek()._naam;
    schrijfLogboek(naam ? { _naam: naam } : {});
    overzicht(app, D);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function certificaatBlok(lb) {
  const n = aantalKlaar(lb), totaal = ONDERZOEKJES.length;
  if (n < totaal) {
    return `<section class="breed" id="certificaat"><div class="oz-certificaat oz-certificaat-dicht">
      <div><h2>Certificaat</h2><p>Zet bij alle ${totaal} onderzoekjes de stempel, dan krijg je hier een certificaat met je naam. Om te printen en op te hangen.</p></div>
      <span class="oz-slot" aria-hidden="true">${totaal - n}</span>
    </div></section>`;
  }
  return `<section class="breed" id="certificaat"><div class="oz-certificaat">
    <div><h2>Je certificaat</h2><p>Alle onderzoekjes zijn gedaan. Vul de naam van de onderzoeker in en download het certificaat.</p>
    <label class="oz-veld"><span>Naam</span><input type="text" maxlength="40" autocomplete="off" value="${esc(lb._naam || "")}" placeholder="Bijvoorbeeld Fos"></label>
    <p><button class="knop-pil knop-accent" type="button" data-certificaat>Download certificaat</button></p></div>
    <canvas class="oz-certificaat-voorbeeld" width="1240" height="877" aria-label="Voorbeeld van het certificaat"></canvas>
  </div></section>`;
}

function bindCertificaat(app) {
  const knop = app.querySelector("[data-certificaat]");
  if (!knop) return;
  const veld = app.querySelector(".oz-certificaat input"), voorbeeld = app.querySelector(".oz-certificaat-voorbeeld");
  const ververs = () => tekenCertificaat(voorbeeld, veld.value.trim(), leesLogboek());
  veld.addEventListener("input", () => {
    const lb = leesLogboek(); lb._naam = veld.value.trim(); schrijfLogboek(lb);
    ververs();
  });
  ververs();
  knop.addEventListener("click", async () => {
    const naam = veld.value.trim();
    if (!naam) { veld.focus(); veld.placeholder = "Eerst een naam invullen"; return; }
    const doek = document.createElement("canvas");
    doek.width = 3508; doek.height = 2480; // A4 liggend, 300 dpi
    await tekenCertificaat(doek, naam, leesLogboek());
    doek.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `certificaat-ruimteonderzoeker-${naam.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fos"}.png`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  });
}

const CERT_FOTO = "/fotos/maan.webp";
let certBeeld = null;
function laadCertBeeld() {
  if (!certBeeld) certBeeld = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = CERT_FOTO; });
  return certBeeld;
}
let certBron = "";
fetch("/data/fotos.json").then((r) => r.json()).then((f) => { const t = f.maan; if (t) certBron = `Foto maan: ${t.credit.slice(0, 40)}, ${t.bron}`; }).catch(() => {});

async function tekenCertificaat(doek, naam, lb) {
  await Promise.all([document.fonts.load('300 100px "Geist"'), document.fonts.load('400 40px "Geist Mono"')]).catch(() => {});
  const beeld = await laadCertBeeld();
  const W = doek.width, H = doek.height, u = W / 1000, c = doek.getContext("2d");
  const inkt = "#232323", paars = "#B5B1E5", zacht = "#6E6E6E", lijn = "#D9D9D9";
  const spatie = (px, em) => { if ("letterSpacing" in c) c.letterSpacing = `${(px * em).toFixed(2)}px`; };
  c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, W, H);
  const rand = 30 * u, midden = W * 0.56;
  c.strokeStyle = inkt; c.lineWidth = 1.2 * u; c.strokeRect(rand, rand, W - 2 * rand, H - 2 * rand);
  c.strokeStyle = lijn; c.lineWidth = 0.8 * u;
  c.beginPath(); c.moveTo(midden, rand); c.lineTo(midden, H - rand); c.stroke();
  if (beeld) {
    const ruimte = W - rand - midden - 80 * u, maxH = H - 2 * rand - 200 * u;
    let pw = ruimte, ph = (pw * beeld.naturalHeight) / beeld.naturalWidth;
    if (ph > maxH) { ph = maxH; pw = (ph * beeld.naturalWidth) / beeld.naturalHeight; }
    c.globalCompositeOperation = "multiply";
    c.drawImage(beeld, midden + (W - rand - midden - pw) / 2, (H - ph) / 2 - 20 * u, pw, ph);
    c.globalCompositeOperation = "source-over";
  }
  const x = 70 * u;
  const label = (tekst, lx, ly, kleur = inkt) => { c.fillStyle = kleur; c.font = `400 ${11 * u}px "Geist Mono", monospace`; spatie(11 * u, -0.02); c.fillText(tekst.toUpperCase(), lx, ly); };
  c.textBaseline = "alphabetic";
  c.fillStyle = inkt; c.fillRect(x, 92 * u, 7 * u, 7 * u);
  label("De Ruimte · Onderzoekjes met Fos", x + 16 * u, 99 * u);
  c.fillStyle = inkt; c.font = `300 ${84 * u}px "Geist", sans-serif`; spatie(84 * u, -0.05);
  c.fillText("Certificaat", x - 4 * u, 195 * u);
  label("Dit certificaat is voor", x, 262 * u, zacht);
  let maat = 96;
  do { c.font = `300 ${maat * u}px "Geist", sans-serif`; spatie(maat * u, -0.05); maat -= 4; } while (c.measureText(naam || " ").width > 440 * u && maat > 30);
  const nb = c.measureText(naam || " ").width, nh = (maat + 4) * u;
  c.fillStyle = paars; c.fillRect(x - 8 * u, 352 * u - nh * 0.8, nb + 16 * u, nh * 0.98);
  c.fillStyle = inkt; c.fillText(naam || "", x, 352 * u);
  c.fillStyle = inkt; c.font = `400 ${18 * u}px "Geist", sans-serif`; spatie(18 * u, -0.02);
  ["heeft als echte ruimteonderzoeker alle zes", "onderzoekjes gedaan: kijken, tekenen, meten,", "raden, wegen en sterren leggen."].forEach((r, i) => c.fillText(r, x, 420 * u + i * 26 * u));
  ONDERZOEKJES.forEach((o, i) => {
    const kol = i % 2, rij = Math.floor(i / 2), bx = x + kol * 225 * u, by = 530 * u + rij * 42 * u;
    c.strokeStyle = lijn; c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(bx, by - 26 * u); c.lineTo(bx + 210 * u, by - 26 * u); c.stroke();
    c.fillStyle = inkt; c.font = `300 ${22 * u}px "Geist", sans-serif`; spatie(22 * u, -0.04); c.fillText(String(i + 1).padStart(2, "0"), bx, by);
    c.font = `400 ${13 * u}px "Geist", sans-serif`; spatie(13 * u, -0.02); c.fillText(o.titel, bx + 36 * u, by - 5 * u);
    label(lb[o.slug]?.klaar || "", bx + 36 * u, by + 10 * u, zacht);
  });
  const sx = W - 150 * u, sy = H - 140 * u;
  c.save(); c.translate(sx, sy); c.rotate(-0.12);
  c.fillStyle = paars; c.beginPath(); c.arc(0, 0, 62 * u, 0, Math.PI * 2); c.fill();
  c.strokeStyle = inkt; c.lineWidth = 1.2 * u; c.beginPath(); c.arc(0, 0, 54 * u, 0, Math.PI * 2); c.stroke();
  c.textAlign = "center"; c.fillStyle = inkt;
  c.font = `500 ${23 * u}px "Geist", sans-serif`; spatie(23 * u, -0.04); c.fillText("Gedaan", 0, 6 * u);
  c.font = `400 ${7 * u}px "Geist Mono", monospace`; spatie(7 * u, 0); c.fillText("RUIMTEONDERZOEKER", 0, 24 * u);
  c.restore();
  c.textAlign = "left";
  const d = new Date();
  label(`${d.getDate()} ${MAANDNAMEN[d.getMonth()]} ${d.getFullYear()} · De Ruimte`, x, H - 52 * u, zacht);
  if (certBron) label(certBron, midden + 24 * u, H - 52 * u, zacht);
  spatie(1, 0);
}

/* ---------- Eén onderzoekje ---------- */

let opruimen = null;
export function verlaat() { opruimen?.(); opruimen = null; }

export function onderzoekje(app, slug, D) {
  verlaat();
  const i = ONDERZOEKJES.findIndex((o) => o.slug === slug);
  if (i < 0) return false;
  const o = ONDERZOEKJES[i];
  const lb = leesLogboek()[slug] || {};
  app.innerHTML = `
  <section class="breed oz-kop">
    <a class="oz-terug" href="/onderzoekjes" data-link>← Alle onderzoekjes</a>
    <p class="etiket">Onderzoekje ${i + 1} van ${ONDERZOEKJES.length}</p>
    <h1>${esc(o.titel)}</h1>
    <p class="held-sub">${esc(o.kort)}</p>
    ${voortgang(leesLogboek(), slug)}
  </section>
  <section class="breed oz-twee">
    <div class="oz-blok"><h2>Wat heb je nodig?</h2><ul>${o.nodig.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>
    <div class="oz-blok"><h2>Zo doe je het</h2><ol>${o.stappen.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div>
  </section>
  <section class="breed oz-werk" aria-live="polite"></section>
  <section class="breed"><div class="oz-buiten">
    <h2>En dan naar buiten</h2>
    <ul>${o.zelf.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
  </div></section>
  <section class="breed oz-logboek">
    <h2>Logboek</h2>
    <label class="oz-veld"><span>Wat ontdekte je?</span><textarea rows="4" placeholder="Schrijf of laat iemand voor je schrijven…">${esc(lb.notitie || "")}</textarea></label>
    <div class="oz-klaar">
      ${lb.klaar ? `<span class="oz-stempel">Gedaan<small>${esc(lb.klaar)}</small></span>` : `<button class="knop-pil knop-accent" type="button" data-klaar>Klaar! Zet de stempel</button>`}
    </div>
    ${ONDERZOEKJES[i + 1] ? `<p><a class="knop-pil" href="/onderzoekjes/${ONDERZOEKJES[i + 1].slug}" data-link>Volgend onderzoekje: ${esc(ONDERZOEKJES[i + 1].titel)}</a></p>` : ""}
  </section>`;
  app.querySelector(".oz-logboek textarea").addEventListener("input", (e) => bewaar(slug, "notitie", e.target.value));
  app.querySelector("[data-klaar]")?.addEventListener("click", () => {
    const d = new Date();
    const tekst = `${d.getDate()} ${MAANDNAMEN[d.getMonth()]} ${d.getFullYear()}`;
    bewaar(slug, "klaar", tekst);
    const alles = aantalKlaar(leesLogboek()) === ONDERZOEKJES.length;
    app.querySelector(".oz-klaar").innerHTML = `<span class="oz-stempel oz-stempel-nieuw">Gedaan<small>${tekst}</small></span>${alles ? `<a class="knop-pil knop-accent" href="/onderzoekjes#certificaat" data-link>Alles gedaan! Haal je certificaat</a>` : ""}`;
    app.querySelector(".oz-voortgang").outerHTML = voortgang(leesLogboek(), slug);
  });
  const werk = app.querySelector(".oz-werk");
  const doe = { "wat-zie-je-vanavond": watZieJe, "maan-dagboek": maanDagboek, "hoe-groot-is-de-zon": hoeGroot, "welke-planeet": welkePlaneet, "zwaar-en-licht": zwaarEnLicht, "sterrenbeeld-leggen": sterrenbeeldLeggen }[slug];
  opruimen = doe(werk, D) || null;
  return true;
}


/* 1. Wat zie je vanavond? */
function watZieJe(werk, D) {
  werk.innerHTML = `<div class="oz-quiz"><div data-plek></div><div class="oz-zie" data-zie></div>
    <div class="oz-kaart-klein"><canvas class="sterrenkaart"></canvas></div></div>`;
  PLEK.kiezer(werk.querySelector("[data-plek]"));
  const teken = () => {
    if (!werk.isConnected) return;
    const p = PLEK.huidig(), v = vanavond(D, p, new Date());
    const top = v.lijst.filter((x) => x.blootOog).slice(0, 4);
    const hoeHoog = (h) => (h < 15 ? "laag, net boven de huizen" : h < 40 ? "halfhoog" : h < 70 ? "hoog" : "bijna recht boven je hoofd");
    werk.querySelector("[data-zie]").innerHTML = top.length ? `<h2>Vanavond kun je zien</h2><ul class="oz-zie-lijst">${top.map((x) => `<li>
      <span class="oz-zie-beeld">${D.fotos[x.item.foto] ? `<img src="${D.fotos[x.item.foto].pad}" alt="">` : "✦"}</span>
      <span><strong>${esc(x.item.naam[0].toUpperCase() + x.item.naam.slice(1))}</strong>Kijk naar het <b>${richting(x.az)}</b>, ${hoeHoog(x.hoogte)}. Het best om ${klok(x.tijd)}.</span></li>`).join("")}</ul>`
      : `<h2>Vanavond is het rustig</h2><p>Tussen het donker worden en middernacht staat er geen planeet hoog genoeg. Zoek dan de Grote Beer: die is altijd te zien (onderzoekje 6).</p>`;
    const t = top[0] ? new Date(top[0].tijd) : new Date(v.start);
    KAART.teken(werk.querySelector("canvas"), D, p, t, { markeer: top[0]?.item.slug, klein: false, beeldNamen: false });
  };
  requestAnimationFrame(teken);
  const weg = PLEK.opVerandering(teken);
  return weg;
}

/* 2. De maan houdt een dagboek: vandaag en de komende zes avonden */
function maanDagboek(werk) {
  const dagen = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(21, 0, 0, 0); return d; });
  const f0 = maanfase(dagen[0]);
  werk.innerHTML = `<div class="oz-quiz">
    <div class="oz-maan-nu">${maanSvg(f0.hoek, 140)}<div><p class="etiket">Vanavond</p><p class="oz-score">${Math.round(f0.verlicht * 100)}%</p><p>van de maan wordt door de zon verlicht. Het is ${esc(f0.naam)}.</p></div></div>
    <h2>De komende week</h2>
    <ol class="oz-maanweek">${dagen.map((d) => { const f = maanfase(d); return `<li>${maanSvg(f.hoek, 64)}<span>${d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" })}</span><small>${Math.round(f.verlicht * 100)}%</small></li>`; }).join("")}</ol>
    <p class="noot zacht">Uitgerekend met astronomy-engine, voor 21:00 uur. Zo ziet de maan eruit vanaf het noordelijk halfrond: als hij groeit, is de rechterkant verlicht. <span class="label">simulatie</span></p>
    <p class="oz-tip">Teken elke avond de maan in een rondje op een eigen blaadje. Na een week leg je de zeven tekeningen naast deze rij. Lijken ze op elkaar?</p>
  </div>`;
}

/* 3. Hoe groot is de zon? Het zonnestelsel op schaal */
const BALLEN = [["strandbal", 500, "een strandbal (50 cm)"], ["voetbal", 220, "een voetbal (22 cm)"], ["tennisbal", 67, "een tennisbal (6,7 cm)"]];
function hoeGroot(werk, D) {
  werk.innerHTML = `<div class="oz-quiz">
    <p class="etiket">Hoe groot is jouw zon?</p>
    <div class="oz-vogelknoppen">${BALLEN.map(([k, , t], i) => `<button class="knop-pil" type="button" data-bal="${k}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>
    <div data-tabel></div></div>`;
  const zon = D.perSlug.zon.schaal.diameter_km;
  const lijst = ["mercurius", "venus", "aarde", "maan", "mars", "jupiter", "saturnus", "uranus", "neptunus"].map((s) => D.perSlug[s]);
  const mm = (x) => x < 10 ? `${x.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} mm` : x < 100 ? `${Math.round(x)} mm` : `${(x / 10).toLocaleString("nl-NL", { maximumFractionDigits: 0 })} cm`;
  const m = (x) => x < 10 ? `${x.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} m` : x < 1000 ? `${Math.round(x)} m` : `${(x / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
  const ding = (x) => x < 0.6 ? "een zandkorrel" : x < 1.5 ? "een korrel zout" : x < 3 ? "een speldenknop" : x < 7 ? "een peperkorrel" : x < 16 ? "een knikker" : x < 35 ? "een pingpongbal" : x < 80 ? "een tennisbal" : "een grote bal";
  const teken = (bal) => {
    const [, maat] = BALLEN.find((b) => b[0] === bal), schaal = maat / zon; // mm per km
    werk.querySelector("[data-tabel]").innerHTML = `<table class="oz-tabel"><thead><tr><th>Wat</th><th>Zo groot</th><th>Zoals</th><th>Zo ver van de zon</th><th>Grote stappen</th></tr></thead><tbody>
      ${lijst.map((h) => { const d = h.schaal.diameter_km * schaal, a = h.slug === "maan" ? null : h.baan.a_km * schaal / 1000; return `<tr><td><strong>${esc(h.titel)}</strong></td><td>${mm(d)}</td><td>${ding(d)}</td><td>${h.slug === "maan" ? `${mm(384400 * schaal)} van de aarde` : m(a)}</td><td>${a ? Math.round(a / 0.75).toLocaleString("nl-NL") : ""}</td></tr>`; }).join("")}
    </tbody></table>
    <p class="noot zacht">Uitgerekend uit de getallen van NASA. Een grote stap is hier 75 cm. Een knikker is dus veel te groot voor de aarde: bij een strandbal als zon is de aarde ongeveer zo groot als een peperkorrel.</p>`;
  };
  werk.querySelectorAll("[data-bal]").forEach((b) => b.addEventListener("click", () => { werk.querySelectorAll("[data-bal]").forEach((x) => x.setAttribute("aria-pressed", x === b)); teken(b.dataset.bal); }));
  teken("strandbal");
}

/* 4. Welke planeet is dit? */
function welkePlaneet(werk, D) {
  const keys = ["zon", "maan", "mercurius", "venus", "aarde", "mars", "jupiter", "saturnus", "uranus", "neptunus", "pluto"].filter((k) => D.fotos[k]);
  const RONDES = 5;
  let ronde = 0, score = 0, vragen = schud(keys).slice(0, RONDES);
  const naam = (k) => D.perSlug[k].naam;
  const teken = () => {
    if (ronde >= RONDES) {
      werk.innerHTML = `<div class="oz-quiz oz-uitslag"><p class="oz-score">${score} <small>van de ${RONDES}</small></p>
        <p>${score === RONDES ? "Allemaal goed! Echte planeetkenner." : score >= 3 ? "Knap gedaan. Nog een keer?" : "Sommige lijken echt op elkaar. Nog een rondje?"}</p>
        <button class="knop-pil knop-accent" type="button" data-opnieuw>Nog een keer</button></div>`;
      werk.querySelector("[data-opnieuw]").addEventListener("click", () => { ronde = 0; score = 0; vragen = schud(keys).slice(0, RONDES); teken(); });
      return;
    }
    const k = vragen[ronde];
    const keuzes = schud([k, ...schud(keys.filter((x) => x !== k)).slice(0, 2)]);
    werk.innerHTML = `<div class="oz-quiz">
      <p class="etiket">Foto ${ronde + 1} van ${RONDES}</p>
      <div class="oz-raad-foto">${fotoImg(D, k)}</div>
      <div class="oz-namen">${keuzes.map((c) => `<button type="button" class="knop-pil oz-naam" data-keuze="${c}">${esc(naam(c))}</button>`).join("")}</div>
      <p class="oz-feedback"></p></div>`;
    werk.querySelectorAll("[data-keuze]").forEach((b) => b.addEventListener("click", () => {
      if (werk.querySelector(".oz-naam[disabled]")) return;
      const goed = b.dataset.keuze === k;
      if (goed) score++;
      werk.querySelectorAll("[data-keuze]").forEach((x) => { x.disabled = true; x.classList.toggle("oz-goed", x.dataset.keuze === k); x.classList.toggle("oz-fout", x === b && !goed); });
      const f = D.fotos[k];
      werk.querySelector(".oz-feedback").innerHTML = `${goed ? "Goed!" : "Bijna."} Dit is ${esc(naam(k))}. <span class="zacht">${esc(D.perSlug[k].kort)}</span> <button class="knop-pil" type="button" data-verder>${ronde + 1 < RONDES ? "Volgende foto" : "Uitslag"}</button><br><small class="zacht">Foto: ${esc(f.credit)}${f.kleur && f.kleur !== "echt" ? `, ${f.kleur === "vals" ? "valse kleur" : "kleur bewerkt"}` : ""}</small>`;
      werk.querySelector("[data-verder]").addEventListener("click", () => { ronde++; teken(); });
    }));
  };
  teken();
}

/* 5. Zwaar en licht: wat zegt de weegschaal ergens anders? */
function zwaarEnLicht(werk, D) {
  const plekken = ["maan", "mercurius", "mars", "venus", "aarde", "uranus", "saturnus", "neptunus", "jupiter", "pluto"].map((s) => D.perSlug[s]);
  const gA = D.perSlug.aarde.schaal.g;
  werk.innerHTML = `<div class="oz-quiz">
    <label class="oz-veld"><span>Hoeveel gram weegt je knuffel op de keukenweegschaal?</span><input type="number" inputmode="numeric" min="1" max="100000" value="300" data-gram></label>
    <ul class="oz-weeg" data-weeg></ul>
    <p class="noot zacht">Uitgerekend met de zwaartekracht van NASA. Een weegschaal meet hoe hard iets naar beneden wordt getrokken. De knuffel zelf blijft precies hetzelfde. Op Jupiter, Saturnus, Uranus en Neptunus kun je niet staan: dat zijn bollen van gas en vloeistof. Daar is het de zwaartekracht op de hoogte van de wolken.</p>
  </div>`;
  const veld = werk.querySelector("[data-gram]");
  const teken = () => {
    const g = Math.max(0, +veld.value || 0);
    const max = Math.max(...plekken.map((p) => p.schaal.g));
    werk.querySelector("[data-weeg]").innerHTML = plekken.sort((a, b) => a.schaal.g - b.schaal.g).map((p) => {
      const w = g * p.schaal.g / gA;
      return `<li class="${p.slug === "aarde" ? "hier" : ""}"><strong>${esc(p.titel)}</strong><i style="--w:${(p.schaal.g / max) * 100}%"></i><span>${Math.round(w).toLocaleString("nl-NL")} gram</span></li>`;
    }).join("");
  };
  veld.addEventListener("input", teken);
  teken();
}

/* 6. Sterrenbeeld leggen */
const BEELD = { UMa: { naam: "de Grote Beer", stukje: [0, 1] }, Cas: { naam: "Cassiopeia", stukje: [0] } };
function sterrenbeeldLeggen(werk, D) {
  werk.innerHTML = `<div class="oz-quiz">
    <div class="oz-vogelknoppen">${Object.entries(BEELD).map(([k, b], i) => `<button class="knop-pil" type="button" data-beeld="${k}" aria-pressed="${i === 0}">${esc(b.naam[0].toUpperCase() + b.naam.slice(1))}</button>`).join("")}</div>
    <div class="oz-leg"><svg class="oz-leg-svg" viewBox="0 0 400 260" aria-label="Het patroon om na te leggen"></svg><div data-waar></div></div></div>`;
  const teken = async (afk) => {
    const { beelden, sterren } = await KAART.laadSterren();
    const pts = beelden[afk].lijnen;
    // eenvoudige projectie rond het midden van het sterrenbeeld
    const alle = pts.flat(), rad = Math.PI / 180;
    const ra0 = Math.atan2(alle.reduce((s, p) => s + Math.sin(p[0] * rad), 0), alle.reduce((s, p) => s + Math.cos(p[0] * rad), 0)) / rad;
    const dec0 = alle.reduce((s, p) => s + p[1], 0) / alle.length;
    const pr = ([ra, dec]) => { const x = -(((ra - ra0 + 540) % 360) - 180) * Math.cos(dec * rad), y = -(dec - dec0); return [x, y]; };
    const xy = alle.map(pr), minX = Math.min(...xy.map((p) => p[0])), maxX = Math.max(...xy.map((p) => p[0])), minY = Math.min(...xy.map((p) => p[1])), maxY = Math.max(...xy.map((p) => p[1]));
    const s = Math.min(340 / (maxX - minX), 200 / (maxY - minY)), ox = 200 - ((minX + maxX) / 2) * s, oy = 130 - ((minY + maxY) / 2) * s;
    const P = (p) => { const [x, y] = pr(p); return [ox + x * s, oy + y * s]; };
    const uniek = [...new Map(alle.map((p) => [p.join(","), p])).values()];
    const helder = (p) => sterren.reduce((b, st) => (Math.abs(st[0] - p[0]) < 0.3 && Math.abs(st[1] - p[1]) < 0.3 && st[2] < b ? st[2] : b), 6);
    werk.querySelector(".oz-leg-svg").innerHTML = `<rect width="400" height="260" rx="14" fill="#1A1A1A"/>
      ${pts.map((l) => `<polyline points="${l.map((p) => P(p).join(",")).join(" ")}" fill="none" stroke="rgba(181,177,229,.55)" stroke-width="1.5"/>`).join("")}
      ${uniek.map((p) => { const [x, y] = P(p); return `<circle cx="${x}" cy="${y}" r="${Math.max(3, 9 - helder(p) * 1.4)}" fill="#fff"/>`; }).join("")}`;
    const p = PLEK.huidig(), nu = new Date();
    const hoog = alle.map(([ra, dec]) => positie({ baan: { ster: { ra, dec, parallax_mas: 1 } }, cijfers: [] }, nu, p, D));
    const gem = hoog.reduce((t, x) => t + x.hoogte, 0) / hoog.length;
    const az = Math.atan2(hoog.reduce((t, x) => t + Math.sin(x.az * rad), 0), hoog.reduce((t, x) => t + Math.cos(x.az * rad), 0)) / rad;
    werk.querySelector("[data-waar]").innerHTML = `<p class="oz-tip">Leg de witte stippen na met knopen of steentjes. De grootste stip is de helderste ster.</p>
      <p><strong>Waar staat ${esc(BEELD[afk].naam)} nu?</strong> ${gem > 5 ? `In het ${richting(az)}, ${gem < 25 ? "laag" : gem < 55 ? "halfhoog" : "hoog"} aan de hemel.` : `Nu laag bij de horizon in het ${richting(az)}. Later op de avond staat hij hoger.`} In Nederland gaat hij nooit onder: je kunt hem elke heldere nacht vinden.</p>
      <p class="noot zacht">Uitgerekend voor ${esc(p.naam)} om ${klok(nu)}. Op het plaatje staat noord boven. Aan de hemel draait het sterrenbeeld in de loop van de nacht, dus het kan scheef of op zijn kop staan.</p>`;
  };
  werk.querySelectorAll("[data-beeld]").forEach((b) => b.addEventListener("click", () => { werk.querySelectorAll("[data-beeld]").forEach((x) => x.setAttribute("aria-pressed", x === b)); teken(b.dataset.beeld); }));
  teken("UMa");
}
