// Zeezicht voor kinderen (overgenomen uit Ik hoor een geluidje en Voggels): eerst een keuzepagina met grote plaatjes,
// daarna per dier een grote foto, een grote knop in de accentkleur en een stem die de naam zegt. Geen tekst die je moet
// kunnen lezen. Vegen of de pijlen gaan naar het volgende dier; onderaan een strook om er een te kiezen.
// De stem komt van het toestel zelf (Web Speech, Nederlandse stem, rate 0.8, pitch 1.1).
import { dieren, esc, hoofd, kaal } from "/js/data.js";
import * as STEM from "/js/stem.js";
import * as G from "/js/geluid.js";

const app = document.getElementById("app");
const slug = location.pathname.split("/").filter(Boolean)[1];

// volgorde: eerst wat een kind aan het strand tegenkomt, dan de rest
const VOOR = ["zeehond", "zeester", "strandkrab", "kwal", "garnaal", "kokkel", "mossel", "bultrug", "octopus"];

async function start() {
  let D = (await dieren()).filter((d) => d.beeld);
  D.sort((a, b) => { const ia = VOOR.findIndex((v) => a.slug.includes(v)), ib = VOOR.findIndex((v) => b.slug.includes(v)); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  if (!slug) return keuze(D);
  document.body.classList.add("kindermodus");
  speel(D, Math.max(0, D.findIndex((d) => d.slug === slug)));
}

function keuze(D) {
  app.innerHTML = `<h1 class="kinder-kop">Welk <span class="accent">dier</span>?</h1>
    <div class="kinderraster">${D.map((d) => `<a class="kinderkaart" href="/kinderen/${d.slug}"><img src="${d.klein}" alt="" width="480" height="320" loading="lazy">${esc(hoofd(kaal(d.naam)))}</a>`).join("")}</div>
    <p class="noot">Voor ouders: tik op het grote plaatje, dan zegt een stem de naam. De grote knop laat het geluid horen, of zegt de naam als er geen opname is. De stem is die van je eigen toestel. Bij het water ben je altijd samen met een volwassene.</p>`;
}

function speel(lijst, i) {
  app.innerHTML = `
  <section class="kids" aria-label="Dieren in zee voor kinderen">
    <a class="kids-weg" href="/kinderen" aria-label="Terug naar de keuze"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></a>
    <h1 class="sr" data-kids-naam></h1>
    <p class="kids-bron"></p>
    <div class="kids-podium">
      <button class="kids-pijl kids-vorige" type="button" aria-label="Vorig dier"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <figure class="kids-dier">
        <button class="kids-plaat" type="button"><img alt="" draggable="false"></button>
        <figcaption class="kids-ballon" aria-live="polite"></figcaption>
        <button class="kids-tip" type="button" aria-label="Tik op het dier, dan hoor je de naam" hidden>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 26V12.5a3 3 0 0 1 6 0V23l8.2 1.6a4 4 0 0 1 3.2 4.5l-1.3 8.2a5 5 0 0 1-4.9 4.2H22.6a5 5 0 0 1-4-2l-6.2-8.3a2.8 2.8 0 0 1 4.2-3.7z" fill="#9FD6E8" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M31 9.5c1.6 1.4 2.5 3.3 2.5 5.4M35 6c2.6 2.3 4.2 5.4 4.2 8.9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
        </button>
      </figure>
      <button class="kids-pijl kids-volgende" type="button" aria-label="Volgend dier"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
    <button class="kids-speel" type="button" aria-label="Luister">
      <span class="kids-golf"></span><span class="kids-golf"></span>
      <svg class="ico-speel" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l12 7-12 7z" fill="currentColor"/></svg>
      <svg class="ico-pauze" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>
    </button>
    <div class="kids-strook" role="group" aria-label="Kies een dier">${lijst.map((d, k) => `<button class="kids-duim" type="button" data-i="${k}" aria-label="${esc(d.naam)}"><img src="${d.klein}" alt="" loading="lazy" draggable="false"></button>`).join("")}</div>
  </section>`;
  const wrap = app.querySelector(".kids"), img = wrap.querySelector(".kids-plaat img"), plaatKnop = wrap.querySelector(".kids-plaat");
  const ballon = wrap.querySelector(".kids-ballon"), knop = wrap.querySelector(".kids-speel"), strook = wrap.querySelector(".kids-strook"), bron = wrap.querySelector(".kids-bron");
  let ballonTimer = 0, geveegd = false;
  // de eerste keer wijst een kloppend handje op de foto; daarna onthouden we (alleen op dit toestel) dat het bekend is
  const tip = wrap.querySelector(".kids-tip"), TIP = "zeezicht-kinderen-tik";
  let gezien = false; try { gezien = localStorage.getItem(TIP) === "1"; } catch {}
  tip.hidden = gezien;
  const tipWeg = () => { if (tip.hidden) return; tip.classList.add("weg"); setTimeout(() => (tip.hidden = true), 300); try { localStorage.setItem(TIP, "1"); } catch {} };
  tip.addEventListener("click", () => plaatKnop.click());
  const nu = () => lijst[i];

  function toon(nieuw, richting = 0) {
    if (G.speelt()) G.stop(); STEM.stil();
    i = (nieuw + lijst.length) % lijst.length;
    const d = nu();
    wrap.style.setProperty("--richting", String(richting));
    img.classList.remove("kids-in"); void img.offsetWidth; img.classList.add("kids-in");
    img.src = d.beeld;
    plaatKnop.setAttribute("aria-label", `${d.naam}. Tik om de naam te horen.`);
    wrap.querySelector("[data-kids-naam]").textContent = hoofd(kaal(d.naam));
    bron.innerHTML = d.bron_kind ? `${d.beeld_soort === "foto" ? "Foto" : "Plaat"}: <a href="${esc(d.bron_kind_url)}" rel="noopener">${esc(d.bron_kind)}</a>` : "";
    ballon.classList.remove("zichtbaar");
    for (const b of wrap.querySelectorAll(".kids-duim")) b.toggleAttribute("aria-current", +b.dataset.i === i);
    const duim = wrap.querySelector(`.kids-duim[data-i="${i}"]`);
    if (duim) strook.scrollLeft = duim.offsetLeft - strook.clientWidth / 2 + duim.offsetWidth / 2;
    if (lijst[(i + 1) % lijst.length]) new Image().src = lijst[(i + 1) % lijst.length].beeld;
    history.replaceState(null, "", `/kinderen/${d.slug}`);
    document.title = `${hoofd(kaal(d.naam))} · Zeezicht voor kinderen`;
    bij();
  }
  function bij() {
    const d = nu(), aan = !!d.geluid && G.isHuidig("kind:" + d.slug) && G.speelt();
    knop.classList.toggle("speelt", aan);
    knop.setAttribute("aria-label", aan ? "Stop het geluid" : d.geluid ? `Luister naar ${d.naam}` : `Zeg de naam: ${d.naam}`);
  }
  function zegNaam() {
    const d = nu();
    STEM.zeg(hoofd(d.naam), { kind: true });
    ballon.textContent = hoofd(kaal(d.naam)); ballon.classList.add("zichtbaar");
    plaatKnop.classList.remove("wiebel"); void plaatKnop.offsetWidth; plaatKnop.classList.add("wiebel");
    clearTimeout(ballonTimer); ballonTimer = setTimeout(() => ballon.classList.remove("zichtbaar"), 2600);
  }
  plaatKnop.addEventListener("click", () => { if (geveegd) { geveegd = false; return; } if (G.speelt()) G.stop(); zegNaam(); tipWeg(); });
  // in de tik zelf afspelen, anders blokkeert iOS het geluid
  knop.addEventListener("click", () => { const d = nu(); tipWeg(); if (d.geluid) { STEM.stil(); G.speel({ id: "kind:" + d.slug, url: d.geluid, titel: d.naam }); } else zegNaam(); });
  G.opVerandering(bij);
  wrap.querySelector(".kids-vorige").addEventListener("click", () => toon(i - 1, -1));
  wrap.querySelector(".kids-volgende").addEventListener("click", () => toon(i + 1, 1));
  strook.addEventListener("click", (e) => { const b = e.target.closest(".kids-duim"); if (b) toon(+b.dataset.i, +b.dataset.i > i ? 1 : -1); });
  addEventListener("keydown", (e) => { if (e.key === "ArrowRight") toon(i + 1, 1); else if (e.key === "ArrowLeft") toon(i - 1, -1); });
  // vegen
  let x0 = null;
  plaatKnop.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  plaatKnop.addEventListener("pointerup", (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) { geveegd = true; toon(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); } });
  toon(i);
}

start();
