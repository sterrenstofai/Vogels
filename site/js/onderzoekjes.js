// Onderzoekjes met Fos: zaterdagopdrachten voor kinderen (en hun ouders) rond Voggels.
// Het logboek staat alleen in de browser van dit apparaat (localStorage), nergens anders.
import * as D from "./data.js";
import * as G from "./geluid.js";
import { MAANDNAMEN, MAANDLETTERS, KERN_MIN } from "./config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const klein = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const getal = (n) => Math.round(n).toLocaleString("nl-NL");
const schud = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/* ---------- Logboek (alleen op dit apparaat) ---------- */
const SLEUTEL = "voggels-onderzoekjes";
function leesLogboek() { try { return JSON.parse(localStorage.getItem(SLEUTEL)) || {}; } catch { return {}; } }
function schrijfLogboek(lb) { try { localStorage.setItem(SLEUTEL, JSON.stringify(lb)); } catch {} }
function bewaar(slug, veld, waarde) { const lb = leesLogboek(); lb[slug] = { ...(lb[slug] || {}), [veld]: waarde }; schrijfLogboek(lb); }

export const ONDERZOEKJES = [
  { slug: "wie-zingt-daar", titel: "Wie zingt daar?", kort: "Een geluidsquiz met vogels uit je eigen buurt.",
    nodig: ["Een telefoon of tablet met geluid", "Tien minuten"],
    stappen: ["Druk op de grote knop en luister goed.", "Kies welke vogel je hoort. Drie platen, één is goed.", "Na vijf vogels zie je je score. Kun je ze daarna ook buiten horen?"] },
  { slug: "tel-je-tuin", titel: "Tel de vogels in je tuin", kort: "Een kwartier stil zitten en turven.",
    nodig: ["Een raam of een plek in de tuin", "Een kwartier", "Een verrekijker als je die hebt"],
    stappen: ["Ga ergens zitten waar je de tuin of straat goed ziet.", "Tel een kwartier lang hoeveel vogels je van elke soort tegelijk ziet. Tik op + bij elke vogel.", "Vergelijk daarna met wat de site verwacht. Zag je iets dat niet in de lijst staat?"] },
  { slug: "teken-een-liedje", titel: "Teken een liedje", kort: "Vogelgeluid kun je zien. Teken het na.",
    nodig: ["Papier en een potlood", "Geluid aan"],
    stappen: ["Kies een vogel en kijk naar de vlekjes die verschijnen. Hoog is een hoge toon, donker is hard.", "Teken het liedje na op papier. Is het een streepje, een boogje of een hoop puntjes?", "Daarna het raadspel: papa of mama verstopt de naam, jij raadt welke vogel het is aan het plaatje van het geluid."] },
  { slug: "wanneer-komen-ze", titel: "Wanneer komt de gierzwaluw?", kort: "Sommige vogels zijn er maar een paar maanden. Raad welke.",
    nodig: ["Vijf minuten", "Een beetje lef om te gokken"],
    stappen: ["Kijk naar de vogel en raad in welke maand hij het meest in Twente gezien wordt.", "Tik op een maand. Dan zie je het echte antwoord uit vijf jaar meldingen.", "Weet je waar hij de rest van het jaar is?"] },
  { slug: "detective-op-de-kaart", titel: "Detective op de kaart", kort: "Los drie raadsels op met de simulatiekaart.",
    nodig: ["De simulatiekaart", "Een kwartier"],
    stappen: ["Open de kaart en speel het jaar af.", "Zoek het antwoord op elke vraag. Schrijf je gok op.", "Kijk daarna wat de meldingen zeggen."] },
  { slug: "het-oudste-vogelboek", titel: "Het oudste vogelboek", kort: "Deze plaat is meer dan tweehonderd jaar oud. Klopt hij nog?",
    nodig: ["Een merel of roodborst in het echt, of een foto", "Kleurpotloden"],
    stappen: ["Kijk goed naar de oude plaat. Hij is getekend in de tijd dat er nog geen fototoestellen waren.", "Zoek een echte merel of roodborst in de tuin of het park.", "Schrijf op wat hetzelfde is en wat anders. Teken daarna zelf een plaat voor een nieuw vogelboek."] },
];

/* ---------- Gedeelde stukjes ---------- */

function speelKnop(s, type, tekst = "") {
  const t = s[type] ? type : s.zang ? "zang" : "roep";
  if (!s[t]) return "";
  return `<button class="knop-pil knop-donker knop-groot-pil" type="button" data-speel="${s.key}" data-type="${t}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>${tekst || `Luister`}</button>`;
}
function plaatje(s) {
  return s.plaat ? `<img src="${s.plaat.klein}" alt="" loading="lazy" width="480" height="600">` : `<span class="oz-geen">${esc(s.nl)}</span>`;
}

// soorten om mee te spelen: uit je vak als we dat weten, anders de bekendste van Twente
async function speelsoorten(toestand, aantal = 24) {
  const [S, V] = await Promise.all([D.soorten(), D.vakken()]);
  const goed = (k) => S[k] && S[k].n >= KERN_MIN && S[k].plaat && (S[k].zang || S[k].roep) && !S[k].exoot;
  let keys;
  if (toestand.laatsteVak && V[toestand.laatsteVak]) {
    keys = Object.entries(V[toestand.laatsteVak].s).filter(([k]) => goed(k)).sort((a, b) => b[1].reduce((x, y) => x + y) - a[1].reduce((x, y) => x + y)).map(([k]) => k);
  } else keys = Object.keys(S).filter(goed).sort((a, b) => S[b].n - S[a].n);
  return { S, V, keys: keys.slice(0, aantal), uitVak: !!toestand.laatsteVak };
}

/* ---------- Overzicht ---------- */

export async function overzicht(app) {
  const lb = leesLogboek();
  const klaar = ONDERZOEKJES.filter((o) => lb[o.slug]?.klaar).length;
  app.innerHTML = `
  <section class="breed oz-held">
    <p class="oz-boventitel">Voor zaterdagochtend</p>
    <h1>Onderzoekjes <em>met Fos</em></h1>
    <p class="held-sub">Zes opdrachten om samen te doen, buiten en op deze site. Je hebt geen verrekijker nodig, wel oren en een beetje geduld. ${klaar ? `Al ${klaar} van de ${ONDERZOEKJES.length} gedaan.` : "Begin waar je wilt."}</p>
  </section>
  <section class="breed oz-lijst">
    ${ONDERZOEKJES.map((o, i) => `
      <a class="oz-kaart" href="/onderzoekjes/${o.slug}" data-link>
        <span class="oz-nummer">${i + 1}</span>
        <span class="oz-kaart-tekst"><strong>${esc(o.titel)}</strong><span>${esc(o.kort)}</span></span>
        ${lb[o.slug]?.klaar ? `<span class="oz-stempel oz-stempel-klein" aria-label="Gedaan">Gedaan</span>` : `<span class="oz-pijl" aria-hidden="true">→</span>`}
      </a>`).join("")}
  </section>
  <section class="breed oz-noot"><p class="zacht">Wat je invult en welke onderzoekjes klaar zijn, blijft op dit apparaat. Het gaat niet naar ons of naar iemand anders.</p></section>`;
}

/* ---------- Eén onderzoekje ---------- */

export async function onderzoekje(app, slug, toestand, koppelDoek) {
  const i = ONDERZOEKJES.findIndex((o) => o.slug === slug);
  if (i < 0) return false;
  const o = ONDERZOEKJES[i];
  const lb = leesLogboek()[slug] || {};
  app.innerHTML = `
  <section class="breed oz-kop">
    <a class="oz-terug" href="/onderzoekjes" data-link>← Alle onderzoekjes</a>
    <p class="oz-boventitel">Onderzoekje ${i + 1} van ${ONDERZOEKJES.length}</p>
    <h1>${esc(o.titel)}</h1>
    <p class="held-sub">${esc(o.kort)}</p>
  </section>
  <section class="breed oz-twee">
    <div class="oz-blok"><h2>Wat heb je nodig?</h2><ul>${o.nodig.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>
    <div class="oz-blok"><h2>Zo doe je het</h2><ol>${o.stappen.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div>
  </section>
  <section class="breed oz-werk" aria-live="polite"></section>
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
    app.querySelector(".oz-klaar").innerHTML = `<span class="oz-stempel oz-stempel-nieuw">Gedaan<small>${tekst}</small></span>`;
  });
  const werk = app.querySelector(".oz-werk");
  const doe = { "wie-zingt-daar": quiz, "tel-je-tuin": telling, "teken-een-liedje": tekenen, "wanneer-komen-ze": raadMaand, "detective-op-de-kaart": detective, "het-oudste-vogelboek": oudBoek }[slug];
  await doe(werk, toestand, koppelDoek, slug);
  return true;
}

/* 1. Geluidsquiz */
async function quiz(werk, toestand) {
  const { S, keys, uitVak } = await speelsoorten(toestand, 20);
  let ronde = 0, score = 0;
  const RONDES = 5;
  const vragen = schud(keys).slice(0, RONDES);
  const teken = () => {
    if (ronde >= RONDES) {
      werk.innerHTML = `<div class="oz-quiz oz-uitslag"><p class="oz-score">${score} <small>van de ${RONDES}</small></p>
        <p>${score === RONDES ? "Allemaal goed! Echte vogelkenner." : score >= 3 ? "Knap gedaan. Probeer het nog een keer." : "Vogelgeluid is lastig. Nog een rondje?"}</p>
        <button class="knop-pil knop-accent" type="button" data-opnieuw>Nog een keer</button></div>`;
      werk.querySelector("[data-opnieuw]").addEventListener("click", () => { ronde = 0; score = 0; vragen.splice(0, RONDES, ...schud(keys).slice(0, RONDES)); teken(); });
      return;
    }
    const k = vragen[ronde];
    const anderen = schud(keys.filter((x) => x !== k)).slice(0, 2);
    const keuzes = schud([k, ...anderen]).map((x) => ({ key: x, ...S[x] }));
    const juist = { key: k, ...S[k] };
    werk.innerHTML = `<div class="oz-quiz">
      <p class="oz-boventitel">Vogel ${ronde + 1} van ${RONDES}${uitVak ? " · uit je eigen vak" : ""}</p>
      <div class="oz-luister">${speelKnop(juist, "zang", "Luister naar de vogel")}</div>
      <div class="oz-keuzes">${keuzes.map((c) => `<button type="button" class="oz-keuze" data-keuze="${c.key}"><span class="oz-keuze-beeld">${plaatje(c)}</span><span class="oz-keuze-naam">${esc(c.nl)}</span></button>`).join("")}</div>
      <p class="oz-feedback"></p></div>`;
    werk.querySelectorAll("[data-keuze]").forEach((b) => b.addEventListener("click", () => {
      if (werk.querySelector(".oz-keuze[disabled]")) return;
      const goed = b.dataset.keuze === k;
      if (goed) score++;
      werk.querySelectorAll("[data-keuze]").forEach((x) => { x.disabled = true; x.classList.toggle("oz-goed", x.dataset.keuze === k); x.classList.toggle("oz-fout", x === b && !goed); });
      werk.querySelector(".oz-feedback").innerHTML = `${goed ? "Goed!" : "Bijna."} Dat was de <a href="/soort/${juist.slug}" data-link>${esc(klein(juist.nl))}</a>. <button class="knop-pil" type="button" data-verder>${ronde + 1 < RONDES ? "Volgende vogel" : "Uitslag"}</button>`;
      werk.querySelector("[data-verder]").addEventListener("click", () => { G.stop(); ronde++; teken(); });
    }));
  };
  teken();
}

/* 2. Tuintelling */
async function telling(werk, toestand, _k, slug) {
  const { S, V, keys } = await speelsoorten(toestand, 12);
  const opgeslagen = leesLogboek()[slug]?.telling || {};
  const m = new Date().getMonth();
  const tel = { ...opgeslagen };
  const teken = () => {
    const totaal = Object.values(tel).reduce((a, b) => a + b, 0);
    werk.innerHTML = `<h2>Turflijst</h2><p class="zacht">${toestand.laatsteVak ? "De twaalf vogels die in je vak het vaakst gemeld worden." : "De twaalf vogels die in Twente het vaakst gemeld worden. Zoek eerst je adres op, dan krijg je de vogels uit je eigen buurt."}</p>
    <div class="oz-tellijst">${keys.map((k) => {
      const s = { key: k, ...S[k] };
      const verwacht = toestand.laatsteVak ? V[toestand.laatsteVak].s[k]?.[m] || 0 : s.twente[m];
      return `<div class="oz-teller"><span class="oz-teller-beeld">${plaatje(s)}</span>
        <span class="oz-teller-naam">${esc(s.nl)}<small>${verwacht ? `in ${MAANDNAMEN[m]} ${getal(verwacht)} keer gemeld` : `in ${MAANDNAMEN[m]} niet gemeld`}</small></span>
        <span class="oz-teller-knoppen"><button type="button" data-min="${k}" aria-label="Eén ${esc(klein(s.nl))} minder">−</button><output>${tel[k] || 0}</output><button type="button" data-plus="${k}" aria-label="Eén ${esc(klein(s.nl))} erbij">+</button></span></div>`;
    }).join("")}</div>
    <p class="oz-totaal">Samen geteld: <strong>${totaal}</strong> ${totaal === 1 ? "vogel" : "vogels"}${totaal ? ` van ${Object.values(tel).filter((x) => x > 0).length} soorten` : ""}.</p>`;
    werk.querySelectorAll("[data-plus],[data-min]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.plus || b.dataset.min;
      tel[k] = Math.max(0, (tel[k] || 0) + (b.dataset.plus ? 1 : -1));
      bewaar(slug, "telling", tel); teken();
    }));
  };
  teken();
}

/* 3. Teken een liedje */
async function tekenen(werk, toestand, koppelDoek) {
  const S = await D.soorten();
  const namen = ["Koolmees", "Tjiftjaf", "Merel", "Houtduif", "Koekoek", "Winterkoning"];
  const lijst = namen.map((n) => Object.entries(S).find(([, s]) => s.nl === n)).filter((x) => x && (x[1].zang || x[1].roep)).map(([key, s]) => ({ key, ...s }));
  let geheim = null;
  werk.innerHTML = `
    <div class="spectro-vlak spectro-groot oz-spectro"><canvas aria-hidden="true"></canvas><div class="spectro-as"><span>11 kHz</span><span>5,5</span><span>0</span></div><div class="spectro-hint">Kies een vogel en kijk mee</div></div>
    <div class="oz-vogelknoppen">${lijst.map((s) => `<button class="knop-pil" type="button" data-speel="${s.key}" data-type="${s.zang ? "zang" : "roep"}">${esc(s.nl)}</button>`).join("")}</div>
    <h2>Raadspel</h2>
    <p>Fos kijkt alleen naar het plaatje van het geluid. Wie de knop indrukt, ziet de naam niet.</p>
    <p><button class="knop-pil knop-accent" type="button" data-geheim>Speel een geheime vogel</button></p>
    <div class="oz-raad" hidden><p>Welke vogel was het?</p><div class="oz-vogelknoppen">${lijst.map((s) => `<button class="knop-pil" type="button" data-raad="${s.key}">${esc(s.nl)}</button>`).join("")}</div><p class="oz-feedback"></p></div>`;
  koppelDoek(werk.querySelector("canvas"));
  werk.querySelector("[data-geheim]").addEventListener("click", () => {
    geheim = lijst[Math.floor(Math.random() * lijst.length)];
    G.speel(geheim, geheim.zang ? "zang" : "roep");
    const r = werk.querySelector(".oz-raad"); r.hidden = false; r.querySelector(".oz-feedback").textContent = "";
  });
  werk.querySelectorAll("[data-raad]").forEach((b) => b.addEventListener("click", () => {
    if (!geheim) return;
    werk.querySelector(".oz-raad .oz-feedback").innerHTML = b.dataset.raad === geheim.key ? `Goed geraden! Het was de ${esc(klein(geheim.nl))}.` : `Het was de ${esc(klein(geheim.nl))}. Luister nog eens en kijk naar de vorm.`;
  }));
}

/* 4. Raad de maand */
async function raadMaand(werk) {
  const S = await D.soorten();
  const namen = ["Gierzwaluw", "Kolgans", "Boerenzwaluw", "Koekoek", "Kramsvogel", "Grutto"];
  const lijst = namen.map((n) => Object.entries(S).find(([, s]) => s.nl === n)).filter(Boolean).map(([key, s]) => ({ key, ...s }));
  let i = 0, punten = 0;
  const teken = () => {
    if (i >= lijst.length) {
      werk.innerHTML = `<div class="oz-uitslag"><p class="oz-score">${punten} <small>van de ${lijst.length}</small></p><p>Trekvogels komen en gaan elk jaar rond dezelfde tijd. Op de soortpagina zie je de hele kalender.</p></div>`;
      return;
    }
    const s = lijst[i];
    werk.innerHTML = `<div class="oz-maand">
      <div class="oz-maand-vogel"><span class="oz-keuze-beeld">${plaatje(s)}</span><div><p class="oz-boventitel">Vogel ${i + 1} van ${lijst.length}</p><h2>De ${esc(klein(s.nl))}</h2>${speelKnop(s, "zang")}</div></div>
      <p>In welke maand wordt de ${esc(klein(s.nl))} in Twente het vaakst gezien?</p>
      <div class="oz-maanden">${["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"].map((n, m) => `<button type="button" data-maand="${m}" aria-label="${MAANDNAMEN[m]}">${n}</button>`).join("")}</div>
      <div class="oz-antwoord" hidden></div></div>`;
    werk.querySelectorAll("[data-maand]").forEach((b) => b.addEventListener("click", () => {
      if (!werk.querySelector(".oz-antwoord").hidden) return;
      const gok = +b.dataset.maand, max = Math.max(...s.twente), piek = s.twente.indexOf(max);
      const afstand = Math.min(Math.abs(gok - piek), 12 - Math.abs(gok - piek));
      if (afstand <= 1) punten++;
      const a = werk.querySelector(".oz-antwoord");
      a.hidden = false;
      a.innerHTML = `<div class="kalender-staven">${s.twente.map((c, m) => `<div class="${m === piek ? "oz-piek" : ""}${m === gok ? " oz-gok" : ""}" style="height:${Math.max(1, (c / max) * 100).toFixed(1)}%"></div>`).join("")}</div>
        <div class="kalender-letters">${MAANDLETTERS.map((l) => `<span>${l}</span>`).join("")}</div>
        <p>${afstand === 0 ? "Precies goed!" : afstand === 1 ? "Heel dichtbij!" : "Mis, maar nu weet je het."} Het vaakst in <strong>${MAANDNAMEN[piek]}</strong>: ${getal(max)} meldingen.${s.twente.filter((c) => c < max * 0.03).length >= 4 ? ` In ${s.twente.filter((c) => c < max * 0.03).length} maanden is hij er bijna niet.` : ""}</p>
        <button class="knop-pil knop-donker" type="button" data-verder>${i + 1 < lijst.length ? "Volgende vogel" : "Uitslag"}</button>`;
      a.querySelector("[data-verder]").addEventListener("click", () => { G.stop(); i++; teken(); });
    }));
  };
  teken();
}

/* 5. Detective op de kaart */
async function detective(werk, toestand) {
  const [S, V, K] = await Promise.all([D.soorten(), D.vakken(), D.kaart()]);
  const groepMaand = (groep) => { const t = new Array(12).fill(0); for (const v of Object.values(V)) for (const [k, r] of Object.entries(v.s)) if (S[k]?.groep === groep) r.forEach((c, m) => (t[m] += c)); return t; };
  const ganzen = groepMaand("gans"), maandGans = ganzen.indexOf(Math.max(...ganzen));
  const zwaluw = groepMaand("zwaluw"), maandZw = zwaluw.indexOf(Math.max(...zwaluw));
  const kraan = Object.entries(S).find(([, s]) => s.nl === "Kraanvogel");
  let kraanAntwoord = "";
  if (kraan) {
    const [kk] = kraan;
    const best = Object.entries(V).map(([v, d]) => [v, (d.s[kk] || []).reduce((a, b) => a + b, 0)]).sort((a, b) => b[1] - a[1])[0];
    kraanAntwoord = `In een vak bij ${D.gemeenteVanVak(K, best[0])}: ${getal(best[1])} meldingen in vijf jaar. Zoek dat vak op de kaart. Wat ligt daar: bos, heide, water of weiland?`;
  }
  const vragen = [
    ["In welke maand zijn er de meeste ganzen in Twente?", `In ${MAANDNAMEN[maandGans]}. Ganzen komen in de herfst uit het hoge noorden om bij ons te overwinteren.`],
    ["In welke maand zie je de meeste zwaluwen en gierzwaluwen?", `In ${MAANDNAMEN[maandZw]}. In de winter zijn ze in Afrika, waar dan genoeg insecten zijn.`],
    ["Waar in Twente worden de meeste kraanvogels gemeld?", kraanAntwoord || "Kijk op de kaart bij de reigers en kraanvogels."],
  ];
  werk.innerHTML = `<p><a class="knop-pil knop-donker" href="/kaart" data-link>Open de simulatiekaart</a></p>
    ${vragen.map(([v, a], i) => `<div class="oz-vraag"><h3>${i + 1}. ${esc(v)}</h3><label class="oz-veld"><span class="sr">Jouw gok</span><input type="text" placeholder="Jouw gok"></label>
      <details><summary>Bekijk het antwoord</summary><p>${esc(a)}</p></details></div>`).join("")}
    <p class="zacht">Let op: de kaart is een simulatie. Het aantal stippen klopt met de meldingen, waar ze precies zitten niet.</p>`;
}

/* 6. Het oudste vogelboek */
async function oudBoek(werk) {
  const S = await D.soorten();
  const sepp = Object.entries(S).filter(([, s]) => s.plaat && s.plaat.werk.includes("Sepp") && ["Roodborst", "Merel", "Koolmees", "Ekster", "Huismus", "Vink"].includes(s.nl)).map(([key, s]) => ({ key, ...s }));
  const s = sepp.find((x) => x.nl === "Roodborst") || sepp[0];
  if (!s) { werk.innerHTML = ""; return; }
  werk.innerHTML = `<div class="oz-boek">
    <figure class="plaat"><div class="plaat-rand"><img src="${s.plaat.src}" alt="Oude plaat van de ${esc(klein(s.nl))}" loading="lazy" width="1200" height="1500"></div>
      <figcaption>${esc(s.plaat.werk)}. Het eerste grote Nederlandse vogelboek. De platen zijn met de hand ingekleurd.</figcaption></figure>
    <div><h2>Kijkvragen</h2>
      <ol><li>Hoe oud is dit boek ongeveer? (Het begon in 1770.)</li><li>Welke kleur heeft de borst? Klopt dat met een echte ${esc(klein(s.nl))}?</li><li>Wat staat er nog meer op de plaat? Een nest, eieren, een tak?</li><li>Wat zou jij anders tekenen?</li></ol>
      <p>${speelKnop(s, "zang", `Hoor de ${esc(klein(s.nl))}`)}</p>
      <p class="zacht">Andere oude platen uit hetzelfde boek: ${sepp.filter((x) => x !== s).map((x) => `<a href="/soort/${x.slug}" data-link>${esc(klein(x.nl))}</a>`).join(", ")}.</p></div></div>`;
}
