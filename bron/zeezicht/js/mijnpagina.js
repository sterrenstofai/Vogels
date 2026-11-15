// Mijn zee: wat je zelf echt gezien of gevonden hebt, met de datum. Alleen op dit apparaat.
import * as MIJN from "/js/mijn.js";
import { dieren, esc, hoofd, kaal } from "/js/data.js";
const app = document.getElementById("app");
let D = [];
async function toon() {
  if (!D.length) D = await dieren();
  const m = MIJN.lees(), n = MIJN.aantal();
  const items = Object.entries(m).sort((a, b) => b[1].datum.localeCompare(a[1].datum));
  app.innerHTML = `
    <p class="etiket">In het echt gezien</p>
    <h1>Mijn <span class="accent">zee</span></h1>
    <p class="inleiding">Wat je zelf echt gezien of gevonden hebt: aan het strand, op het wad of in een aquarium. Tik op het plusje bij een dier of bij een vondst op de <a href="/strand">strandpagina</a>.</p>
    <p class="mono zacht">${n ? `${n} ${n === 1 ? "ding" : "dingen"} gezien` : "Nog niets gezien. Ga naar het strand!"}</p>
    ${n ? `<ul class="mijnlijst">${items.map(([k, v]) => { const d = D.find((x) => x.slug === k); return `<li><a href="${d ? "/" + d.slug : "/strand"}">${d?.klein ? `<img src="${d.klein}" alt="" loading="lazy">` : '<span class="geen-beeld"></span>'}<span><strong>${esc(hoofd(kaal(v.naam)))}</strong><small>${esc(MIJN.datumTekst(v.datum))}</small></span></a></li>`; }).join("")}</ul>` : ""}
    ${n ? `<p><button type="button" class="knop licht" data-wis>Alles wissen</button> <span class="oz-vraag" hidden>Zeker weten? <button type="button" class="knop" data-ja>Ja</button> <button type="button" class="knop licht" data-nee>Nee</button></span></p>` : ""}
    <p class="zacht fijn">Dit blijft op dit apparaat. Het gaat niet naar ons of naar iemand anders.</p>`;
  const w = app.querySelector("[data-wis]");
  if (w) { const v = app.querySelector(".oz-vraag"); w.addEventListener("click", () => { v.hidden = false; w.hidden = true; }); app.querySelector("[data-nee]").addEventListener("click", toon); app.querySelector("[data-ja]").addEventListener("click", () => { MIJN.wis(); toon(); }); }
}
toon();
