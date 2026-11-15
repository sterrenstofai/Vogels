// Onderzoekjes met Fos: elke week samen op onderzoek. Eerst luisteren op de site, dan zelf spelen.
// Overgenomen van Voggels. Het logboek staat alleen in de browser van dit apparaat (localStorage), nergens anders.
import * as G from "./geluid.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const schud = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const MAANDNAMEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/* ---------- Logboek (alleen op dit apparaat) ---------- */
const SLEUTEL = "ikhoor-onderzoekjes";
function leesLogboek() { try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; } }
function schrijfLogboek(lb) { try { localStorage.setItem(SLEUTEL, JSON.stringify(lb)); } catch {} }
function bewaar(slug, veld, waarde) { const lb = leesLogboek(); lb[slug] = { ...(lb[slug] || {}), [veld]: waarde }; schrijfLogboek(lb); }

export const ONDERZOEKJES = [
  { slug: "welk-instrument", titel: "Welk instrument hoor je?", kort: "Een geluid, drie foto's. Eén is goed.",
    nodig: ["Een telefoon of tablet met geluid", "Tien minuten"],
    stappen: ["Druk op de grote knop en luister goed.", "Kies welk instrument je hoort. Drie foto's, één is goed.", "Na vijf instrumenten zie je je score."],
    zelf: ["Zoek thuis iets dat klinkt als een trommel, iets dat klinkt als een fluit en iets dat rinkelt als een tamboerijn.", "Doe je ogen dicht. De ander maakt een geluid. Wat was het?", "Luister naar een liedje op de radio. Welke instrumenten hoor je?"] },
  { slug: "tik-de-maat", titel: "Tik de maat mee", kort: "Tik mee op de tafel. Loop je gelijk met het liedje?",
    nodig: ["Een tafel om op te tikken", "Geluid aan", "Vijf minuten"],
    stappen: ["Kies een liedje en druk op Speel.", "Tik met je vinger op de grote knop, steeds op de tel. Bum, bum, bum.", "Na een tijdje zie je hoe snel je tikte, en hoe snel het liedje gaat."],
    zelf: ["Loop op de maat door de kamer. Grote stappen bij een langzaam liedje, kleine bij een snel liedje.", "Klap in je handen op de tel, en dan eens tussen de tellen in.", "Tel hardop mee: één, twee, drie, vier. Waar valt de harde klap?"] },
  { slug: "potten-en-pannen", titel: "Potten en pannen", kort: "Bouw een drumstel uit de keuken en speel een beroemd ritme na.",
    nodig: ["Een grote pan (de basdrum)", "Een bakje of doos (de snaredrum)", "Een deksel of een theelepel tegen een glas (de hi-hat)", "Twee houten lepels"],
    stappen: ["Zet de keukenspullen voor je neer.", "Probeer eerst het ritme op de site: tik de vakjes aan en druk op Speel.", "Speel het dan na op de pannen. Bum, tsjak, bum-bum, tsjak."],
    zelf: ["Speel mee met Billie Jean: dat ritme is heel eenvoudig, en het blijft het hele nummer hetzelfde.", "Wie kan het langst hetzelfde ritme volhouden?", "Maak je eigen ritme en geef het een naam."] },
  { slug: "welk-nummer", titel: "Welk nummer is dit?", kort: "Een geheim fragment. Raad het nummer aan de hoes.",
    nodig: ["Geluid aan", "Iemand die de nummers kent"],
    stappen: ["Druk op de knop. Je hoort een stukje, maar je ziet niet welk nummer het is.", "Kies uit drie hoezen.", "Na vijf nummers zie je je score."],
    zelf: ["Neurie een stukje van een liedje. Kan de ander raden welk het is?", "Hoe snel herken je een nummer? Na één tel, of pas als er gezongen wordt?", "Later kun je hier één los spoor raden, zoals alleen de bas. Dat onderdeel wordt nog gebouwd."] },
  { slug: "hoog-en-laag", titel: "Hoog en laag", kort: "Zet vijf tonen op een rij, van laag naar hoog.",
    nodig: ["Geluid aan", "Je eigen stem"],
    stappen: ["Tik op elk rondje en luister.", "Tik ze daarna in volgorde aan: eerst de laagste, als laatste de hoogste.", "Zing de laagste toon na, als een tuba. En de hoogste, als een fluit."],
    zelf: ["Zing zo laag als je kunt, als een brombeer. En dan zo hoog als een muis.", "Tik met een lepel tegen glazen met verschillend veel water. Welke klinkt het hoogst?", "Een grote trommel klinkt laag, een kleine hoog. Klopt dat thuis ook?"] },
  { slug: "oud-in-nieuw", titel: "Oud geluid in een nieuw liedje", kort: "Hoor een ouder nummer, en dan het nummer waar een stukje van in zit.",
    nodig: ["Geluid aan", "Goede oren"],
    stappen: ["Luister eerst naar het oude nummer.", "Luister dan naar het nieuwe nummer.", "Hoor je hetzelfde stukje? Is het sneller, langzamer, of precies hetzelfde?"],
    zelf: ["Neem samen een stukje geluid op met een telefoon: een deur, een kopje, een lach.", "Speel het af en zing of rap er iets overheen. Zo maak je zelf een sample.", "Speel het nog een keer af, steeds opnieuw. Nu is het een loop."] },
];

/* ---------- Gedeelde stukjes ---------- */

const SPEEL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>`;
const fragment = (n, geheim = false) => ({ id: n.slug, titel: n.titel, artiest: n.artiest, url: n.preview.url, hoes: n.preview.hoes, geheim });
const klank = (D, key) => D.klanken[key] && { id: `klank:${key}`, titel: key, artiest: "", url: D.klanken[key].pad, eigen: true };
const fotoImg = (D, key) => D.fotos[key] ? `<img src="${D.fotos[key].pad}" alt="" loading="lazy">` : "";
const NAMEN = { drumstel: "het drumstel", basgitaar: "de basgitaar", "elektrische-gitaar": "de elektrische gitaar", synthesizer: "de synthesizer", piano: "de piano", gitaar: "de gitaar", viool: "de viool", trompet: "de trompet", dwarsfluit: "de fluit", tamboerijn: "de tamboerijn", saxofoon: "de saxofoon", cello: "de cello", trombone: "de trombone", klarinet: "de klarinet", contrabas: "de contrabas", hoorn: "de hoorn", hobo: "de hobo", fagot: "de fagot", altviool: "de altviool" };

/* ---------- Overzicht ---------- */

export function overzicht(app) {
  const lb = leesLogboek();
  app.innerHTML = `
  <section class="breed oz-held">
    <p class="etiket">Elke week op onderzoek</p>
    <h1>Onderzoekjes <span class="accent">met Fos</span></h1>
    <p class="held-sub">Elke week gaan Fos (4) en ik samen op onderzoek. Deze zes opdrachten zijn ons begin: eerst luisteren op de site, dan zelf aan de slag met muziek, geluid en instrumenten. Je hoeft geen instrument te kunnen spelen. Begin waar je wilt.</p>
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
  bindOpnieuw(app);
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

function bindOpnieuw(app) {
  const blok = app.querySelector("[data-opnieuw-blok]");
  if (!blok) return;
  const vraag = blok.querySelector(".oz-opnieuw-vraag"), knop = blok.querySelector("[data-opnieuw-vraag]");
  knop.addEventListener("click", () => { vraag.hidden = false; knop.hidden = true; blok.querySelector("[data-opnieuw-nee]").focus(); });
  blok.querySelector("[data-opnieuw-nee]").addEventListener("click", () => { vraag.hidden = true; knop.hidden = false; knop.focus(); });
  blok.querySelector("[data-opnieuw-ja]").addEventListener("click", () => {
    const naam = leesLogboek()._naam;
    schrijfLogboek(naam ? { _naam: naam } : {});
    overzicht(app);
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
      a.download = `certificaat-geluidsonderzoeker-${naam.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fos"}.png`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  });
}

const CERT_FOTO = "/fotos/trompet.webp";
let certBeeld = null;
function laadCertBeeld() {
  if (!certBeeld) certBeeld = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = CERT_FOTO; });
  return certBeeld;
}
let certBron = "";
fetch("/data/fotos.json").then((r) => r.json()).then((f) => { const t = f.trompet; if (t) certBron = `Foto trompet: ${t.maker.slice(0, 40)}, ${t.licentie}`; }).catch(() => {});

async function tekenCertificaat(doek, naam, lb) {
  await Promise.all([document.fonts.load('300 100px "Geist"'), document.fonts.load('400 40px "Geist Mono"')]).catch(() => {});
  const beeld = await laadCertBeeld();
  const W = doek.width, H = doek.height, u = W / 1000, c = doek.getContext("2d");
  const inkt = "#232323", mint = "#A1FFCB", zacht = "#6E6E6E", lijn = "#D9D9D9";
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
  label("ikhooreengeluidje · Onderzoekjes met Fos", x + 16 * u, 99 * u);
  c.fillStyle = inkt; c.font = `300 ${84 * u}px "Geist", sans-serif`; spatie(84 * u, -0.05);
  c.fillText("Certificaat", x - 4 * u, 195 * u);
  label("Dit certificaat is voor", x, 262 * u, zacht);
  let maat = 96;
  do { c.font = `300 ${maat * u}px "Geist", sans-serif`; spatie(maat * u, -0.05); maat -= 4; } while (c.measureText(naam || " ").width > 440 * u && maat > 30);
  const nb = c.measureText(naam || " ").width, nh = (maat + 4) * u;
  c.fillStyle = mint; c.fillRect(x - 8 * u, 352 * u - nh * 0.8, nb + 16 * u, nh * 0.98);
  c.fillStyle = inkt; c.fillText(naam || "", x, 352 * u);
  c.fillStyle = inkt; c.font = `400 ${18 * u}px "Geist", sans-serif`; spatie(18 * u, -0.02);
  ["heeft als echte geluidsonderzoeker alle zes", "onderzoekjes gedaan: luisteren, tikken, drummen,", "raden, sorteren en samplen."].forEach((r, i) => c.fillText(r, x, 420 * u + i * 26 * u));
  ONDERZOEKJES.forEach((o, i) => {
    const kol = i % 2, rij = Math.floor(i / 2), bx = x + kol * 225 * u, by = 530 * u + rij * 42 * u;
    c.strokeStyle = lijn; c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(bx, by - 26 * u); c.lineTo(bx + 210 * u, by - 26 * u); c.stroke();
    c.fillStyle = inkt; c.font = `300 ${22 * u}px "Geist", sans-serif`; spatie(22 * u, -0.04); c.fillText(String(i + 1).padStart(2, "0"), bx, by);
    c.font = `400 ${13 * u}px "Geist", sans-serif`; spatie(13 * u, -0.02); c.fillText(o.titel, bx + 36 * u, by - 5 * u);
    label(lb[o.slug]?.klaar || "", bx + 36 * u, by + 10 * u, zacht);
  });
  const sx = W - 150 * u, sy = H - 140 * u;
  c.save(); c.translate(sx, sy); c.rotate(-0.12);
  c.fillStyle = mint; c.beginPath(); c.arc(0, 0, 62 * u, 0, Math.PI * 2); c.fill();
  c.strokeStyle = inkt; c.lineWidth = 1.2 * u; c.beginPath(); c.arc(0, 0, 54 * u, 0, Math.PI * 2); c.stroke();
  c.textAlign = "center"; c.fillStyle = inkt;
  c.font = `500 ${23 * u}px "Geist", sans-serif`; spatie(23 * u, -0.04); c.fillText("Gedaan", 0, 6 * u);
  c.font = `400 ${7 * u}px "Geist Mono", monospace`; spatie(7 * u, 0); c.fillText("GELUIDSONDERZOEKER", 0, 24 * u);
  c.restore();
  c.textAlign = "left";
  const d = new Date();
  label(`${d.getDate()} ${MAANDNAMEN[d.getMonth()]} ${d.getFullYear()} · ikhooreengeluidje.nl`, x, H - 52 * u, zacht);
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
    <h2>En dan zelf spelen</h2>
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
  const doe = { "welk-instrument": instrumentQuiz, "tik-de-maat": tikDeMaat, "potten-en-pannen": pottenEnPannen, "welk-nummer": nummerQuiz, "hoog-en-laag": hoogEnLaag, "oud-in-nieuw": oudInNieuw }[slug];
  opruimen = doe(werk, D) || null;
  return true;
}

/* 1. Welk instrument hoor je? */
function instrumentQuiz(werk, D) {
  const keys = Object.keys(NAMEN).filter((k) => D.klanken[k] && D.fotos[k]);
  const RONDES = 5;
  let ronde = 0, score = 0, vragen = schud(keys).slice(0, RONDES);
  const teken = () => {
    if (ronde >= RONDES) {
      werk.innerHTML = `<div class="oz-quiz oz-uitslag"><p class="oz-score">${score} <small>van de ${RONDES}</small></p>
        <p>${score === RONDES ? "Allemaal goed! Echte instrumentenkenner." : score >= 3 ? "Knap gedaan. Nog een keer?" : "Sommige klinken echt op elkaar. Nog een rondje?"}</p>
        <button class="knop-pil knop-accent" type="button" data-opnieuw>Nog een keer</button></div>`;
      werk.querySelector("[data-opnieuw]").addEventListener("click", () => { ronde = 0; score = 0; vragen = schud(keys).slice(0, RONDES); teken(); });
      return;
    }
    const k = vragen[ronde];
    const keuzes = schud([k, ...schud(keys.filter((x) => x !== k)).slice(0, 2)]);
    werk.innerHTML = `<div class="oz-quiz">
      <p class="etiket">Instrument ${ronde + 1} van ${RONDES}</p>
      <div class="oz-luister"><button class="knop-pil knop-donker knop-groot-pil" type="button" data-luister>${SPEEL}Luister naar het instrument</button></div>
      <div class="oz-keuzes">${keuzes.map((c) => `<button type="button" class="oz-keuze" data-keuze="${c}"><span class="oz-keuze-beeld">${fotoImg(D, c)}</span><span class="oz-keuze-naam">${esc(NAMEN[c])}</span></button>`).join("")}</div>
      <p class="oz-feedback"></p></div>`;
    werk.querySelector("[data-luister]").addEventListener("click", () => G.speel(klank(D, k)));
    werk.querySelectorAll("[data-keuze]").forEach((b) => b.addEventListener("click", () => {
      if (werk.querySelector(".oz-keuze[disabled]")) return;
      const goed = b.dataset.keuze === k;
      if (goed) score++;
      werk.querySelectorAll("[data-keuze]").forEach((x) => { x.disabled = true; x.classList.toggle("oz-goed", x.dataset.keuze === k); x.classList.toggle("oz-fout", x === b && !goed); });
      werk.querySelector(".oz-feedback").innerHTML = `${goed ? "Goed!" : "Bijna."} Dat was ${esc(NAMEN[k])}. <button class="knop-pil" type="button" data-verder>${ronde + 1 < RONDES ? "Volgend instrument" : "Uitslag"}</button>`;
      werk.querySelector("[data-verder]").addEventListener("click", () => { G.stop(); ronde++; teken(); });
    }));
  };
  teken();
  return () => G.stop();
}

/* 2. Tik de maat mee. Het tempo van de nummers komt van Deezer (bpm). */
const TEMPO = [["billie-jean", 117], ["bad-guy", 135], ["juicy", 96], ["in-the-air-tonight", 95], ["rehab", 146]];
function tikDeMaat(werk, D) {
  const lijst = TEMPO.filter(([s]) => D.perSlug[s]?.preview);
  let gekozen = lijst[0], tikken = [];
  werk.innerHTML = `
    <div class="oz-vogelknoppen" role="group" aria-label="Kies een liedje">${lijst.map(([s], k) => `<button class="knop-pil" type="button" data-kies="${k}" aria-pressed="${k === 0}">${esc(D.perSlug[s].titel)}</button>`).join("")}</div>
    <p><button class="knop-pil knop-donker knop-groot-pil" type="button" data-speel>${SPEEL}Speel het liedje</button></p>
    <button class="oz-tik" type="button" data-tik aria-label="Tik hier op de maat"><span>Tik!</span></button>
    <div class="oz-tempo" aria-live="polite"><p class="zacht">Tik minstens acht keer.</p></div>`;
  const uit = werk.querySelector(".oz-tempo"), tik = werk.querySelector("[data-tik]");
  werk.querySelectorAll("[data-kies]").forEach((b) => b.addEventListener("click", () => {
    gekozen = lijst[+b.dataset.kies]; tikken = [];
    werk.querySelectorAll("[data-kies]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    uit.innerHTML = `<p class="zacht">Tik minstens acht keer.</p>`;
    G.stop();
  }));
  werk.querySelector("[data-speel]").addEventListener("click", () => { tikken = []; G.speel(fragment(D.perSlug[gekozen[0]])); });
  const doeTik = () => {
    const nu = performance.now();
    if (tikken.length && nu - tikken[tikken.length - 1] > 2500) tikken = []; // lange pauze: opnieuw beginnen
    tikken.push(nu);
    tik.classList.remove("plop"); void tik.offsetWidth; tik.classList.add("plop");
    if (tikken.length < 8) { uit.innerHTML = `<p class="zacht">Nog ${8 - tikken.length} keer tikken.</p>`; return; }
    const r = tikken.slice(-16), tussen = r.slice(1).map((t, k) => t - r[k]).sort((a, b) => a - b);
    const mediaan = tussen[Math.floor(tussen.length / 2)], jij = 60000 / mediaan;
    const spreiding = Math.sqrt(tussen.reduce((s, x) => s + (x - mediaan) ** 2, 0) / tussen.length) / mediaan;
    const [slug, bpm] = gekozen;
    // ook goed: precies half zo snel of twee keer zo snel tikken
    const opties = [[bpm, "op elke tel"], [bpm / 2, "op elke tweede tel"], [bpm * 2, "twee keer per tel"]];
    const [doel, hoe] = opties.sort((a, b) => Math.abs(jij - a[0]) - Math.abs(jij - b[0]))[0];
    const verschil = Math.abs(jij - doel) / doel;
    uit.innerHTML = `<p class="oz-score">${Math.round(jij)} <small>tikken per minuut</small></p>
      <p>${esc(D.perSlug[slug].titel)} gaat ongeveer ${bpm} tellen per minuut (volgens Deezer). ${verschil < 0.05 ? `Je loopt gelijk, ${hoe}!` : jij < doel ? "Je tikt iets te langzaam." : "Je tikt iets te snel."}
      ${spreiding < 0.08 ? "En je tikt heel regelmatig." : "Probeer steeds even lang te wachten tussen de tikken."}</p>`;
  };
  tik.addEventListener("pointerdown", (e) => { e.preventDefault(); doeTik(); });
  tik.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); doeTik(); } });
  return () => G.stop();
}

/* 3. Potten en pannen: een kleine drumcomputer. De klanken maakt de browser zelf na (geen opnames). */
function pottenEnPannen(werk, D) {
  const RIJEN = [["hihat", "Hi-hat (deksel)"], ["snare", "Snaredrum (bakje)"], ["kick", "Basdrum (pan)"]];
  // het begin-ritme: bum, tsjak, bum-bum, tsjak (zoals veel popliedjes)
  const patroon = { hihat: [1, 1, 1, 1, 1, 1, 1, 1], snare: [0, 0, 1, 0, 0, 0, 1, 0], kick: [1, 0, 0, 0, 1, 1, 0, 0] };
  let ctx = null, stap = 0, timer = 0, volgende = 0, tempo = 100;
  werk.innerHTML = `
    <div class="oz-drum">
      ${RIJEN.map(([k, naam]) => `<div class="oz-drum-rij"><span class="oz-drum-naam">${esc(naam)}</span><div class="oz-drum-stappen">${patroon[k].map((v, s) => `<button type="button" class="oz-stap${s % 4 === 0 ? " tel" : ""}" data-rij="${k}" data-stap="${s}" aria-pressed="${!!v}" aria-label="${esc(naam)}, tel ${s + 1}"></button>`).join("")}</div></div>`).join("")}
      <div class="oz-drum-knoppen">
        <button class="knop-pil knop-donker knop-groot-pil" type="button" data-start>${SPEEL}Speel</button>
        <label class="oz-tempo-schuif"><span>Langzaam</span><input type="range" min="70" max="140" value="${tempo}" aria-label="Tempo"><span>Snel</span></label>
      </div>
      <p class="zacht">De klanken worden door je browser nagemaakt, zoals een drumcomputer dat doet. Het zijn geen opnames van een echt drumstel.</p>
      <p>Hoor hoe het in het echt klinkt: ${["billie-jean", "in-the-air-tonight", "sexual-healing"].filter((s) => D.perSlug[s]).map((s) => `<a href="/nummer/${s}" data-link>${esc(D.perSlug[s].titel)}</a>`).join(", ")}.</p>
    </div>`;
  werk.querySelectorAll(".oz-stap").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.rij, s = +b.dataset.stap;
    patroon[k][s] = patroon[k][s] ? 0 : 1;
    b.setAttribute("aria-pressed", !!patroon[k][s]);
    if (patroon[k][s] && ctx) speelKlank(k, ctx.currentTime);
  }));
  werk.querySelector("input[type=range]").addEventListener("input", (e) => (tempo = +e.target.value));
  const knop = werk.querySelector("[data-start]");

  function ruis(duur) {
    const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duur), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; return s;
  }
  function speelKlank(k, t) {
    const v = ctx.createGain(); v.connect(ctx.destination);
    if (k === "kick") {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      v.gain.setValueAtTime(1, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(v); o.start(t); o.stop(t + 0.4);
    } else if (k === "snare") {
      const n = ruis(0.2), f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1200;
      v.gain.setValueAtTime(0.7, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      n.connect(f); f.connect(v); n.start(t); n.stop(t + 0.2);
    } else {
      const n = ruis(0.06), f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
      v.gain.setValueAtTime(0.35, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      n.connect(f); f.connect(v); n.start(t); n.stop(t + 0.06);
    }
  }
  function plan() {
    while (volgende < ctx.currentTime + 0.12) {
      for (const [k] of RIJEN) if (patroon[k][stap]) speelKlank(k, volgende);
      const s = stap;
      setTimeout(() => werk.querySelectorAll(".oz-stap").forEach((b) => b.classList.toggle("nu", +b.dataset.stap === s)), Math.max(0, (volgende - ctx.currentTime) * 1000));
      volgende += 60 / tempo / 2; // achtste noten
      stap = (stap + 1) % 8;
    }
  }
  function stop() {
    clearInterval(timer); timer = 0;
    knop.innerHTML = `${SPEEL}Speel`;
    werk.querySelectorAll(".oz-stap.nu").forEach((b) => b.classList.remove("nu"));
  }
  knop.addEventListener("click", () => {
    // in de tik zelf: iOS staat geluid alleen toe als het direct uit een tik volgt
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    if (timer) return stop();
    G.stop();
    stap = 0; volgende = ctx.currentTime + 0.05;
    timer = setInterval(plan, 25); plan();
    knop.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>Stop`;
  });
  return () => { stop(); ctx?.close(); };
}

/* 4. Welk nummer is dit? Geheim: de speler en het vergrendelscherm tonen geen naam en geen hoes. */
function nummerQuiz(werk, D) {
  const lijst = D.nummers.filter((n) => n.preview && !n.klassiek);
  const RONDES = 5;
  let ronde = 0, score = 0, vragen = schud(lijst).slice(0, RONDES);
  const teken = () => {
    if (ronde >= RONDES) {
      werk.innerHTML = `<div class="oz-quiz oz-uitslag"><p class="oz-score">${score} <small>van de ${RONDES}</small></p>
        <p>${score === RONDES ? "Allemaal goed! Jij kent je muziek." : "Nog een rondje? Het zijn steeds andere nummers."}</p>
        <button class="knop-pil knop-accent" type="button" data-opnieuw>Nog een keer</button></div>`;
      werk.querySelector("[data-opnieuw]").addEventListener("click", () => { ronde = 0; score = 0; vragen = schud(lijst).slice(0, RONDES); teken(); });
      return;
    }
    const n = vragen[ronde];
    const keuzes = schud([n, ...schud(lijst.filter((x) => x !== n)).slice(0, 2)]);
    werk.innerHTML = `<div class="oz-quiz">
      <p class="etiket">Nummer ${ronde + 1} van ${RONDES}</p>
      <div class="oz-luister"><button class="knop-pil knop-donker knop-groot-pil" type="button" data-luister>${SPEEL}Speel het geheime nummer</button></div>
      <div class="oz-keuzes">${keuzes.map((c) => `<button type="button" class="oz-keuze" data-keuze="${c.slug}"><span class="oz-keuze-beeld oz-hoes"><img src="${esc(c.preview.hoes_klein)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span><span class="oz-keuze-naam">${esc(c.titel)}</span></button>`).join("")}</div>
      <p class="oz-feedback"></p></div>`;
    werk.querySelector("[data-luister]").addEventListener("click", () => G.speel(fragment(n, true), { geheim: true }));
    werk.querySelectorAll("[data-keuze]").forEach((b) => b.addEventListener("click", () => {
      if (werk.querySelector(".oz-keuze[disabled]")) return;
      const goed = b.dataset.keuze === n.slug;
      if (goed) score++;
      werk.querySelectorAll("[data-keuze]").forEach((x) => { x.disabled = true; x.classList.toggle("oz-goed", x.dataset.keuze === n.slug); x.classList.toggle("oz-fout", x === b && !goed); });
      werk.querySelector(".oz-feedback").innerHTML = `${goed ? "Goed!" : "Bijna."} Het was ${esc(n.titel)} van ${esc(n.artiest)}. <button class="knop-pil" type="button" data-verder>${ronde + 1 < RONDES ? "Volgend nummer" : "Uitslag"}</button>`;
      werk.querySelector("[data-verder]").addEventListener("click", () => { G.stop(); ronde++; teken(); });
    }));
  };
  teken();
  return () => G.stop();
}

/* 5. Hoog en laag: vijf keer de do op de piano, in vijf octaven (University of Iowa) */
function hoogEnLaag(werk, D) {
  const TONEN = ["toon-c2", "toon-c3", "toon-c4", "toon-c5", "toon-c6"].filter((k) => D.klanken[k]);
  const KLEUR = ["#232323", "#6E6E6E", "#A1FFCB", "#D9D9D9", "#FFFFFF"];
  let volgorde, gekozen;
  const nieuw = () => { volgorde = schud(TONEN); gekozen = []; teken(); };
  const teken = () => {
    werk.innerHTML = `<div class="oz-quiz">
      <p class="etiket">Tik eerst om te luisteren, dan in volgorde</p>
      <div class="oz-tonen">${volgorde.map((k, i) => `<div class="oz-toon"><button type="button" class="oz-toon-luister" data-luister="${k}" aria-label="Luister naar toon ${i + 1}">${SPEEL}</button><button type="button" class="oz-toon-kies" data-kies="${k}" ${gekozen.includes(k) ? "disabled" : ""}>${gekozen.includes(k) ? gekozen.indexOf(k) + 1 : "Kies"}</button></div>`).join("")}</div>
      <p class="oz-rij-label">Jouw rij, van laag naar hoog: ${gekozen.length ? gekozen.map((k) => `<span class="oz-bolletje" style="background:${KLEUR[TONEN.indexOf(k)]}"></span>`).join("") : "<span class=\"zacht\">nog leeg</span>"}</p>
      <p class="oz-feedback"></p></div>`;
    werk.querySelectorAll("[data-luister]").forEach((b) => b.addEventListener("click", () => G.speel(klank(D, b.dataset.luister))));
    werk.querySelectorAll("[data-kies]").forEach((b) => b.addEventListener("click", () => {
      gekozen.push(b.dataset.kies);
      if (gekozen.length < TONEN.length) return teken();
      const goed = gekozen.every((k, i) => k === TONEN[i]);
      teken();
      werk.querySelector(".oz-feedback").innerHTML = `${goed ? "Precies goed! Van brombeer naar muis." : "Nog niet helemaal. Luister nog eens: welke bromt het meest?"} <button class="knop-pil" type="button" data-opnieuw>${goed ? "Nog een keer" : "Opnieuw proberen"}</button>
        ${goed ? `<span class="zacht">Het was steeds dezelfde noot, de do, maar dan vijf keer een stukje hoger op de piano.</span>` : ""}`;
      werk.querySelector("[data-opnieuw]").addEventListener("click", nieuw);
    }));
  };
  nieuw();
  return () => G.stop();
}

/* 6. Oud geluid in een nieuw liedje */
const PAREN = [["under-pressure", "ice-ice-baby"], ["super-freak", "u-cant-touch-this"], ["gimme-gimme-gimme", "hung-up"], ["every-breath-you-take", "ill-be-missing-you"], ["harder-better-faster-stronger", "stronger"], ["good-times", "rappers-delight"]];
function oudInNieuw(werk, D) {
  const paren = PAREN.filter(([a, b]) => D.perSlug[a]?.preview && D.perSlug[b]?.preview);
  werk.innerHTML = `<div class="oz-paren">${paren.map(([a, b]) => {
    const oud = D.perSlug[a], nieuw = D.perSlug[b];
    const s = nieuw.samples_erin.find((x) => x.slug === a);
    return `<div class="oz-paar">
      ${[oud, nieuw].map((n, k) => `<div class="oz-paar-kant"><span class="oz-paar-hoes"><img src="${esc(n.preview.hoes_klein)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>
        <div><p class="etiket">${k ? "Nieuw" : "Oud"} · ${n.jaar}</p><a href="/nummer/${n.slug}" data-link><strong>${esc(n.titel)}</strong></a><span class="zacht">${esc(n.artiest)}</span>
        <button class="knop-pil" type="button" data-speel="${n.slug}">${SPEEL}Luister</button></div></div>`).join(`<span class="oz-paar-pijl" aria-hidden="true">→</span>`)}
      ${s?.wat ? `<p class="oz-paar-wat">${esc(s.wat)}</p>` : ""}
    </div>`;
  }).join("")}</div>
  <p class="zacht">Let op: het fragment is maar 30 seconden. Welk stuk je hoort, kiest iTunes. Soms zit het gesamplede stukje er niet in; luister dan het hele nummer.</p>`;
  werk.querySelectorAll("[data-speel]").forEach((b) => b.addEventListener("click", () => G.speel(fragment(D.perSlug[b.dataset.speel]))));
  return () => G.stop();
}
