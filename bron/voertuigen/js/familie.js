// De bovenbalk en de voet, zoals bij Voggels, De Ruimte en Ik hoor een geluidje (overgenomen uit sterrenstofai/deruimte).
// Vult <header class="balk" data-familie> en <footer class="voet" data-familie>. Zoeken gaat over de voertuigen; niets gaat naar buiten.
import { lijst, pad } from "/js/voertuigen.js";
import * as MIJN from "/js/mijn.js";

const nu = location.pathname.replace(/\/$/, "") || "/";
const ICOON = {
  merk: '<svg class="merk-icoon" viewBox="0 0 32 32" aria-hidden="true"><circle cx="8.5" cy="21.5" r="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="23.5" cy="21.5" r="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8.5 21.5L13 11h9l1.5 10.5M13 11l-1.5-3.5M10 7.5h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  zoek: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  ontdek: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/></svg>',
  oz: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8h6M9 11.5h6M9 15h3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  kids: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="10.5" r="1.1" fill="currentColor"/><circle cx="15" cy="10.5" r="1.1" fill="currentColor"/><path d="M8.5 14.2c1.9 2.2 5.1 2.2 7 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  mijn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  index: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};
const huidig = (href) => (nu === href || (href !== "/" && nu.startsWith(href + "/")) ? ' aria-current="page"' : "");

export function ontdek() {
  const slug = nu.split("/").filter(Boolean).pop();
  const keuze = lijst().filter((v) => v.slug !== slug);
  return pad(keuze[Math.floor(Math.random() * keuze.length)]);
}

for (const kop of document.querySelectorAll("header.balk[data-familie]")) {
  kop.innerHTML = `
    <a class="merk" href="/" aria-label="Voertuigen, naar het begin">${ICOON.merk}<span class="merk-naam">voertuigen</span></a>
    <div class="zoek" role="search">
      <div class="zoek-rij">
        <div class="zoek-pil">
          <label class="sr" for="zoekveld">Zoek een voertuig</label>
          <input id="zoekveld" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"
            placeholder="Zoek een voertuig" role="combobox" aria-expanded="false" aria-controls="zoek-lijst" aria-autocomplete="list">
          <ul id="zoek-lijst" class="zoek-lijst" role="listbox" hidden></ul>
        </div>
        <button class="knop-pil knop-donker zoek-knop" type="button">${ICOON.zoek}Zoeken</button>
        <a class="knop-pil knop-accent" href="/ontdek" data-ontdek>${ICOON.ontdek}Ontdek een voertuig</a>
      </div>
      <p class="zoek-melding" aria-live="polite"></p>
    </div>
    <nav class="balk-nav" aria-label="Hoofdmenu">
      <a class="nav-knop" href="/onderzoekjes"${huidig("/onderzoekjes")} aria-label="Onderzoekjes met Fos">${ICOON.oz}<span>Onderzoekjes</span></a>
      <a class="nav-knop nav-knop-kids" href="/kinderen"${huidig("/kinderen")} aria-label="Voor kinderen">${ICOON.kids}<span>Kinderen</span></a>
      <a class="nav-knop" href="/mijn"${huidig("/mijn")} aria-label="Mijn fiets">${ICOON.mijn}<span>Mijn fiets</span><b class="nav-mijn-n" hidden></b></a>
      <a class="nav-knop" href="/#alle" aria-label="Alle voertuigen">${ICOON.index}<span>Index</span></a>
    </nav>`;
  const veld = kop.querySelector("#zoekveld"), ul = kop.querySelector("#zoek-lijst"), melding = kop.querySelector(".zoek-melding");
  let treffers = [], keuze = -1;
  const zoek = (q) => { q = q.trim().toLowerCase().replace(/^(de|het)\s+/, ""); return q ? lijst().filter((v) => v.label.toLowerCase().includes(q) || v.groep.includes(q)) : []; };
  const toon = () => {
    treffers = zoek(veld.value); keuze = treffers.length ? 0 : -1; melding.textContent = "";
    ul.innerHTML = treffers.map((v, i) => `<li role="option" id="z${i}" aria-selected="${i === keuze}" data-i="${i}"><span>${v.label}</span><span class="zacht">${v.groep}</span></li>`).join("");
    ul.hidden = !treffers.length; veld.setAttribute("aria-expanded", String(!ul.hidden));
  };
  const ga = () => { const t = treffers[Math.max(0, keuze)] || zoek(veld.value)[0]; if (t) location.href = pad(t); else if (veld.value.trim()) melding.textContent = "Dat voertuig staat er (nog) niet in. Kijk bij alle voertuigen."; };
  veld.addEventListener("input", toon);
  veld.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!treffers.length) return; keuze = (keuze + (e.key === "ArrowDown" ? 1 : -1) + treffers.length) % treffers.length; for (const li of ul.children) li.setAttribute("aria-selected", String(+li.dataset.i === keuze)); }
    else if (e.key === "Enter") { e.preventDefault(); ga(); } else if (e.key === "Escape") { ul.hidden = true; }
  });
  ul.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) { keuze = +li.dataset.i; ga(); } });
  kop.querySelector(".zoek-knop").addEventListener("click", ga);
  document.addEventListener("click", (e) => { if (!kop.contains(e.target)) ul.hidden = true; });
  kop.querySelector("[data-ontdek]").addEventListener("click", (e) => { e.preventDefault(); location.href = ontdek(); });
  const teller = () => { const n = MIJN.aantal(), b = kop.querySelector(".nav-mijn-n"); b.textContent = n; b.hidden = !n; };
  teller(); MIJN.opVerandering?.(teller);
  document.documentElement.style.setProperty("--balk-h", kop.offsetHeight + "px");
}

for (const voet of document.querySelectorAll("footer.voet[data-familie]")) {
  voet.innerHTML = `
    <div class="voet-kolommen">
      <div><h2>Data</h2><p>De maten zijn die van de tekening, geen gegevens van een echt voertuig. Weetjes komen van Wikipedia (CC BY-SA), elk met een zin die we letterlijk op de bronpagina terugvinden. Dat kijken we elke maand opnieuw na. <a href="/hoe-dit-werkt">Hoe dit werkt</a></p></div>
      <div><h2>Beeld</h2><p>Alle voertuigen zijn in code getekend met three.js (MIT). Geen foto's, geen AI-beelden, geen merken of logo's. Belichting: Studio Small 09 van Poly Haven (CC0). Letters: Geist en Geist Mono (OFL).</p></div>
      <div><h2>Geluid</h2><p>Alle geluiden zijn nagemaakt in je browser: de bel, de toeter, de sirene, de treinfluit en de scheepshoorn. Het zijn geen opnames. De stem is die van je eigen toestel.</p></div>
      <div><h2>Privacy</h2><p>Geen cookies en geen bezoekersstatistiek. Er gaat niets naar andere sites. Mijn fiets en de logboeken van de onderzoekjes blijven op je eigen apparaat.</p></div>
    </div>
    <div class="voet-acties">
      <a class="knop-pil" href="/#alle">Alle voertuigen</a>
      <a class="knop-pil knop-accent" href="/ontdek" data-ontdek>Ontdek een voertuig</a>
    </div>
    <p class="voet-merk" aria-hidden="true">voertuigen</p>`;
  voet.querySelector("[data-ontdek]").addEventListener("click", (e) => { e.preventDefault(); location.href = ontdek(); });
}
