// Voggels voor kinderen: een grote plaat, een grote knop voor het geluid, en een stem die de naam zegt.
// Geen tekst die je moet kunnen lezen. Vegen of de pijlen gaan naar de volgende vogel.
// De stem komt van het toestel zelf (Web Speech); we kiezen een Nederlandse stem die op het toestel draait.
import * as G from "./geluid.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let opruimen = null;

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

function zeg(tekst) {
  if (!("speechSynthesis" in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(tekst);
  u.lang = "nl-NL";
  u.rate = 0.8;
  u.pitch = 1.1;
  // liefst een stem die op het toestel zelf draait, niet via internet
  const stem = stemmen.find((v) => v.localService && v.lang.toLowerCase().startsWith("nl-nl")) || stemmen.find((v) => v.localService) || stemmen[0];
  if (stem) u.voice = stem;
  speechSynthesis.speak(u);
  return true;
}

/* ---------- de pagina ---------- */

export function verlaat() {
  opruimen?.();
  opruimen = null;
}

export function kinderPagina(app, S) {
  verlaat();
  const lijst = Object.entries(S)
    .filter(([, s]) => s.plaat && (s.zang || s.roep) && !s.exoot && s.n >= 300)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 40)
    .map(([key, s]) => ({ key, ...s }));
  const start = new URLSearchParams(location.search).get("vogel");
  let i = Math.max(0, lijst.findIndex((s) => s.slug === start));

  app.innerHTML = `
  <section class="kids" aria-label="Vogels voor kinderen">
    <a class="kids-weg" href="/" data-link aria-label="Terug naar Voggels"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></a>
    <div class="kids-podium">
      <button class="kids-pijl kids-vorige" type="button" aria-label="Vorige vogel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <figure class="kids-vogel">
        <button class="kids-plaat" type="button"><img alt="" draggable="false"></button>
        <figcaption class="kids-ballon" aria-live="polite"></figcaption>
        <button class="kids-tip" type="button" aria-label="Tik op de vogel, dan hoor je zijn naam" hidden>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M19 26V12.5a3 3 0 0 1 6 0V23l8.2 1.6a4 4 0 0 1 3.2 4.5l-1.3 8.2a5 5 0 0 1-4.9 4.2H22.6a5 5 0 0 1-4-2l-6.2-8.3a2.8 2.8 0 0 1 4.2-3.7z" fill="#A1FFCB" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M31 9.5c1.6 1.4 2.5 3.3 2.5 5.4M35 6c2.6 2.3 4.2 5.4 4.2 8.9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
          </svg>
        </button>
      </figure>
      <button class="kids-pijl kids-volgende" type="button" aria-label="Volgende vogel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
    <button class="kids-speel" type="button" aria-label="Luister naar de vogel">
      <span class="kids-golf"></span><span class="kids-golf"></span>
      <svg class="ico-speel" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z" fill="currentColor"/></svg>
      <svg class="ico-pauze" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>
    </button>
    <div class="kids-strook" role="list" aria-label="Kies een vogel">
      ${lijst.map((s, k) => `<button class="kids-duim" type="button" role="listitem" data-i="${k}" aria-label="${esc(s.nl)}"><img src="${s.plaat.klein}" alt="" loading="lazy" draggable="false"></button>`).join("")}
    </div>
  </section>`;

  const wrap = app.querySelector(".kids");
  const img = wrap.querySelector(".kids-plaat img"), plaatKnop = wrap.querySelector(".kids-plaat");
  const ballon = wrap.querySelector(".kids-ballon"), speel = wrap.querySelector(".kids-speel");
  const strook = wrap.querySelector(".kids-strook");
  let ballonTimer = 0, geveegd = false;
  // de eerste keer wijst een knop op de plaat: hier tikken. Daarna onthouden we (alleen op dit toestel) dat het bekend is.
  const tip = wrap.querySelector(".kids-tip");
  const TIP = "voggels-kinderen-tik";
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
  const type = (s) => (s.zang ? "zang" : "roep");

  function toon(nieuw, richting = 0) {
    if (G.speelt()) G.stop();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    i = (nieuw + lijst.length) % lijst.length;
    const s = huidige();
    wrap.style.setProperty("--richting", String(richting));
    img.classList.remove("kids-in"); void img.offsetWidth; img.classList.add("kids-in");
    img.src = s.plaat.src;
    plaatKnop.setAttribute("aria-label", `${s.nl}. Tik om de naam te horen.`);
    ballon.classList.remove("zichtbaar");
    wrap.querySelectorAll(".kids-duim").forEach((d) => d.toggleAttribute("aria-current", +d.dataset.i === i));
    const duim = wrap.querySelector(`.kids-duim[data-i="${i}"]`);
    if (duim) strook.scrollLeft = duim.offsetLeft - strook.clientWidth / 2 + duim.offsetWidth / 2;
    // de volgende alvast laden, zodat vegen meteen een plaat laat zien
    new Image().src = lijst[(i + 1) % lijst.length].plaat.src;
    history.replaceState(history.state, "", `/kinderen?vogel=${s.slug}`);
    werkSpeelBij();
  }

  function werkSpeelBij() {
    const h = G.huidigeOpname();
    const hier = !!(h && h.soort.key === huidige().key && G.speelt());
    speel.classList.toggle("speelt", hier);
    speel.setAttribute("aria-label", hier ? "Stop het geluid" : "Luister naar de vogel");
  }

  // tik op de vogel: de stem zegt de naam (het geluid even stil)
  plaatKnop.addEventListener("click", () => {
    if (geveegd) { geveegd = false; return; } // een veeg is geen tik op de vogel
    const s = huidige();
    const h = G.huidigeOpname();
    if (h && h.soort.key === s.key && G.speelt()) G.speel(h.soort, h.type);
    zeg(s.nl);
    ballon.textContent = s.nl;
    ballon.classList.add("zichtbaar");
    tipWeg();
    plaatKnop.classList.remove("wiebel"); void plaatKnop.offsetWidth; plaatKnop.classList.add("wiebel");
    clearTimeout(ballonTimer);
    ballonTimer = setTimeout(() => ballon.classList.remove("zichtbaar"), 2600);
  });

  // in de tik zelf afspelen, anders blokkeert iOS het geluid
  speel.addEventListener("click", () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const s = huidige();
    G.speel(s, type(s));
  });

  wrap.querySelector(".kids-vorige").addEventListener("click", () => toon(i - 1, -1));
  wrap.querySelector(".kids-volgende").addEventListener("click", () => toon(i + 1, 1));
  strook.addEventListener("click", (e) => { const d = e.target.closest(".kids-duim"); if (d) toon(+d.dataset.i, +d.dataset.i > i ? 1 : -1); });

  // vegen over de plaat
  let x0 = null, y0 = 0;
  const vogel = wrap.querySelector(".kids-vogel");
  vogel.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; geveegd = false; });
  vogel.addEventListener("pointerup", (e) => {
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
  const weg = G.opVerandering(werkSpeelBij);

  opruimen = () => {
    document.removeEventListener("keydown", toets);
    weg?.();
    clearTimeout(ballonTimer);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (G.speelt()) G.stop();
  };

  toon(i);
}
