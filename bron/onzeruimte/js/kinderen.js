// De ruimte voor kinderen: een grote foto, een grote paarse knop, en een stem die de naam zegt als je op de foto tikt.
// Geen tekst die je moet kunnen lezen. Vegen of de pijlen gaan naar het volgende.
// Overgenomen van ikhooreengeluidje (en die van Voggels). De paarse knop vertelt: de stem zegt de naam
// en een korte zin die een kind van vier begrijpt. De geluiden van planeten (metingen, geen opnames)
// staan op de gewone pagina's, bij Geluid: voor een kind van vier zeggen ze weinig.
// De stem komt van het toestel zelf (Web Speech); we kiezen een Nederlandse stem die op het toestel draait.
import * as G from "./geluid.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let opruimen = null;

// Volgorde: eerst wat een kind al kent
const LIJST = ["maan", "zon", "aarde", "mars", "jupiter", "saturnus", "venus", "mercurius", "uranus", "neptunus", "pluto", "io", "europa", "titan", "ceres", "ganymedes", "triton", "charon", "enceladus", "callisto", "betelgeuze"];

/* ---------- de stem ---------- */

let stemmen = [];
function laadStemmen() {
  if (!("speechSynthesis" in window)) return;
  stemmen = speechSynthesis.getVoices().filter((v) => (v.lang || "").toLowerCase().replace("_", "-").startsWith("nl"));
}
if ("speechSynthesis" in window) {
  laadStemmen();
  speechSynthesis.addEventListener?.("voiceschanged", laadStemmen);
}

function zeg(tekst, klaar) {
  if (!("speechSynthesis" in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(tekst);
  u.lang = "nl-NL";
  u.rate = 0.8;
  u.pitch = 1.1;
  const stem = stemmen.find((v) => v.localService && v.lang.toLowerCase().startsWith("nl-nl")) || stemmen.find((v) => v.localService) || stemmen[0];
  if (stem) u.voice = stem;
  if (klaar) { u.onend = klaar; u.onerror = klaar; }
  speechSynthesis.speak(u);
  return true;
}

/* ---------- de pagina ---------- */

export function verlaat() {
  opruimen?.();
  opruimen = null;
}

export function kinderPagina(app, D) {
  verlaat();
  const lijst = LIJST.filter((k) => D.fotos[k] && D.perSlug[k]).map((key) => { const h = D.perSlug[key]; return { key, naam: h.naam, zin: h.kinderzin, foto: D.fotos[key] }; });
  const start = new URLSearchParams(location.search).get("hemel");
  let i = Math.max(0, lijst.findIndex((s) => s.key === start));

  app.innerHTML = `
  <section class="kids" aria-label="De ruimte voor kinderen">
    <a class="kids-weg" href="/" data-link aria-label="Terug naar De Ruimte"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></a>
    <p class="kids-bron"></p>
    <div class="kids-podium">
      <button class="kids-pijl kids-vorige" type="button" aria-label="Vorige"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <figure class="kids-vogel">
        <button class="kids-plaat" type="button"><img alt="" draggable="false"></button>
        <figcaption class="kids-ballon" aria-live="polite"></figcaption>
        <button class="kids-tip" type="button" aria-label="Tik op de foto, dan hoor je de naam" hidden>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M19 26V12.5a3 3 0 0 1 6 0V23l8.2 1.6a4 4 0 0 1 3.2 4.5l-1.3 8.2a5 5 0 0 1-4.9 4.2H22.6a5 5 0 0 1-4-2l-6.2-8.3a2.8 2.8 0 0 1 4.2-3.7z" fill="#B5B1E5" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M31 9.5c1.6 1.4 2.5 3.3 2.5 5.4M35 6c2.6 2.3 4.2 5.4 4.2 8.9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
          </svg>
        </button>
      </figure>
      <button class="kids-pijl kids-volgende" type="button" aria-label="Volgende"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
    <button class="kids-speel" type="button" aria-label="Vertel">
      <span class="kids-golf"></span><span class="kids-golf"></span>
      <svg class="ico-speel" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z" fill="currentColor"/></svg>
      <svg class="ico-pauze" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>
    </button>
    <div class="kids-strook" role="list" aria-label="Kies er een">
      ${lijst.map((s, k) => `<button class="kids-duim" type="button" role="listitem" data-i="${k}" aria-label="${esc(s.naam)}"><img src="${s.foto.pad}" alt="" loading="lazy" draggable="false"></button>`).join("")}
    </div>
  </section>`;

  const wrap = app.querySelector(".kids");
  const img = wrap.querySelector(".kids-plaat img"), plaatKnop = wrap.querySelector(".kids-plaat");
  const ballon = wrap.querySelector(".kids-ballon"), speel = wrap.querySelector(".kids-speel");
  const strook = wrap.querySelector(".kids-strook"), bron = wrap.querySelector(".kids-bron");
  let ballonTimer = 0, geveegd = false;
  // de eerste keer wijst een kloppend handje op de foto. Daarna onthouden we (alleen op dit toestel) dat het bekend is.
  const tip = wrap.querySelector(".kids-tip");
  const TIP = "ruimte-kinderen-tik";
  let tipGezien = false;
  try { tipGezien = localStorage.getItem(TIP) === "1"; } catch {}
  tip.hidden = tipGezien;
  const tipWeg = () => {
    if (tip.hidden) return;
    tip.classList.add("weg");
    setTimeout(() => (tip.hidden = true), 300);
    try { localStorage.setItem(TIP, "1"); } catch {}
  };
  tip.addEventListener("click", () => plaatKnop.click());

  const huidige = () => lijst[i];
  let vertelt = false;
  const stil = () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); vertelt = false; werkSpeelBij(); };

  function toon(nieuw, richting = 0) {
    if (G.speelt()) G.stop();
    stil();
    i = (nieuw + lijst.length) % lijst.length;
    const s = huidige();
    wrap.style.setProperty("--richting", String(richting));
    img.classList.remove("kids-in"); void img.offsetWidth; img.classList.add("kids-in");
    img.src = s.foto.pad;
    plaatKnop.setAttribute("aria-label", `${s.naam}. Tik om de naam te horen.`);
    const kort = (t) => esc(t.length > 40 ? t.slice(0, 38) + "…" : t);
    bron.innerHTML = `Foto: ${kort(s.foto.credit)}, <a href="${esc(s.foto.pagina)}" rel="noopener">${esc(s.foto.bron)}</a>${s.foto.kleur && s.foto.kleur !== "echt" ? " (kleur bewerkt)" : ""}.`;
    ballon.classList.remove("zichtbaar");
    wrap.querySelectorAll(".kids-duim").forEach((d) => d.toggleAttribute("aria-current", +d.dataset.i === i));
    const duim = wrap.querySelector(`.kids-duim[data-i="${i}"]`);
    if (duim) strook.scrollLeft = duim.offsetLeft - strook.clientWidth / 2 + duim.offsetWidth / 2;
    new Image().src = lijst[(i + 1) % lijst.length].foto.pad;
    history.replaceState(history.state, "", `/kinderen?hemel=${s.key}`);
    werkSpeelBij();
  }

  function werkSpeelBij() {
    speel.classList.toggle("speelt", vertelt);
    speel.setAttribute("aria-label", vertelt ? "Stop met vertellen" : `Vertel over ${huidige().naam}`);
  }

  // tik op het instrument: de stem zegt de naam (het geluid even stil)
  plaatKnop.addEventListener("click", () => {
    if (geveegd) { geveegd = false; return; }
    const s = huidige();
    stil();
    zeg(s.naam);
    ballon.textContent = s.naam;
    ballon.classList.add("zichtbaar");
    tipWeg();
    plaatKnop.classList.remove("wiebel"); void plaatKnop.offsetWidth; plaatKnop.classList.add("wiebel");
    clearTimeout(ballonTimer);
    ballonTimer = setTimeout(() => ballon.classList.remove("zichtbaar"), 2600);
  });

  // de knop vertelt: de naam en een zin die een kind begrijpt. In de tik zelf, anders zwijgt iOS.
  // Nog een tik: stoppen.
  speel.addEventListener("click", () => {
    const s = huidige();
    if (vertelt) return stil();
    if (G.speelt()) G.stop();
    const tekst = s.zin && s.zin.toLowerCase().includes(s.naam.toLowerCase().replace(/^de /, "")) ? s.zin : `${s.naam}. ${s.zin || ""}`;
    vertelt = zeg(tekst, () => { vertelt = false; werkSpeelBij(); });
    werkSpeelBij();
    ballon.textContent = s.naam; ballon.classList.add("zichtbaar");
    clearTimeout(ballonTimer); ballonTimer = setTimeout(() => ballon.classList.remove("zichtbaar"), 4000);
  });

  wrap.querySelector(".kids-vorige").addEventListener("click", () => toon(i - 1, -1));
  wrap.querySelector(".kids-volgende").addEventListener("click", () => toon(i + 1, 1));
  strook.addEventListener("click", (e) => { const d = e.target.closest(".kids-duim"); if (d) toon(+d.dataset.i, +d.dataset.i > i ? 1 : -1); });

  // vegen over de foto
  let x0 = null, y0 = 0;
  const vak = wrap.querySelector(".kids-vogel");
  vak.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; geveegd = false; });
  vak.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { geveegd = true; toon(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
  });

  const toets = (e) => {
    if (e.key === "ArrowRight") toon(i + 1, 1);
    else if (e.key === "ArrowLeft") toon(i - 1, -1);
  };
  document.addEventListener("keydown", toets);

  opruimen = () => {
    document.removeEventListener("keydown", toets);
    clearTimeout(ballonTimer);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (G.speelt()) G.stop();
  };

  toon(i);
}
