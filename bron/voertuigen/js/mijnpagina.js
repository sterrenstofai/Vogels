// Mijn fiets: tik aan welke onderdelen je in het echt hebt gezien. Met de datum, alleen op dit apparaat.
import * as MIJN from "/js/mijn.js";
import * as STEM from "/js/stem.js";
const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function toon() {
  const m = MIJN.lees(), n = MIJN.aantal(), tot = MIJN.ONDERDELEN.length;
  app.innerHTML = `
    <p class="etiket mono">In het echt gezien</p>
    <h1>Mijn fiets</h1>
    <p class="inleiding">Ga naar een echte fiets en zoek de onderdelen. Tik er een aan als je hem hebt gevonden: dan zie je de datum.</p>
    <div class="oz-voortgang"><ol class="lang">${MIJN.ONDERDELEN.map(([k]) => `<li class="${m[k] ? "klaar" : ""}"></li>`).join("")}</ol><p class="mono">${n} van de ${tot} gevonden</p></div>
    <ul class="mijnlijst">${MIJN.ONDERDELEN.map(([k, naam]) => `<li><button type="button" data-k="${k}" data-naam="${esc(naam)}" aria-pressed="${!!m[k]}" class="${m[k] ? "aan" : ""}"><span class="mijnvink">${m[k] ? "✓" : "+"}</span><span>${esc(naam)}</span><small class="mono">${m[k] ? esc(MIJN.datumTekst(m[k].datum)) : ""}</small></button></li>`).join("")}</ul>
    <div id="melding" class="melding mono" hidden></div>
    ${n ? `<p><button type="button" class="knop licht" data-wis>Alles wissen</button> <span class="oz-vraag" hidden>Zeker weten? <button type="button" class="knop" data-ja>Ja</button> <button type="button" class="knop licht" data-nee>Nee</button></span></p>` : ""}
    <p class="zacht fijn">Dit blijft op dit apparaat. Het gaat niet naar ons of naar iemand anders.</p>`;
  for (const b of app.querySelectorAll("[data-k]")) b.addEventListener("click", () => {
    const aan = MIJN.wissel(b.dataset.k, b.dataset.naam); STEM.klik(); toon();
    const mel = document.getElementById("melding"); mel.hidden = false;
    mel.innerHTML = `${aan ? "Gevonden" : "Weggehaald"}: ${esc(b.dataset.naam)} <button type="button" class="knop licht">Ongedaan</button>`;
    mel.querySelector("button").addEventListener("click", () => { MIJN.wissel(b.dataset.k, b.dataset.naam); toon(); });
    clearTimeout(toon.t); toon.t = setTimeout(() => (mel.hidden = true), 5000);
  });
  const w = app.querySelector("[data-wis]");
  if (w) { const v = app.querySelector(".oz-vraag"); w.addEventListener("click", () => { v.hidden = false; w.hidden = true; }); app.querySelector("[data-nee]").addEventListener("click", toon); app.querySelector("[data-ja]").addEventListener("click", () => { MIJN.wis(); toon(); }); }
}
toon();
