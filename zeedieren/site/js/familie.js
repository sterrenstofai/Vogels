// De bovenbalk en de voet, zoals bij Voggels, De Ruimte, Ik hoor een geluidje en Voertuigen (overgenomen uit sterrenstofai/Fiets).
// Vult <header class="balk" data-familie> en <footer class="voet" data-familie>. Zoeken gaat over de dieren; niets gaat naar buiten.
import { dieren, pad, esc, kaal, hoofd } from "/js/data.js";
import * as MIJN from "/js/mijn.js";

const nu = location.pathname.replace(/\/$/, "") || "/";
const ICOON = {
  merk: '<svg class="merk-icoon" viewBox="0 0 32 32" aria-hidden="true"><path d="M3 21c2.2 0 2.2-1.6 4.4-1.6s2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6 2.2 1.6 4 1.6M3 26c2.2 0 2.2-1.6 4.4-1.6s2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6 2.2 1.6 4.4 1.6 2.2-1.6 4.4-1.6 2.2 1.6 4 1.6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M9 13.5c3-4.5 9-4.5 12 0-3 4.5-9 4.5-12 0zM21 13.5l4-3v6z" fill="currentColor"/><circle cx="12.6" cy="12.6" r="1" fill="var(--papier)"/></svg>',
  zoek: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  ontdek: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/></svg>',
  oz: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8h6M9 11.5h6M9 15h3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  kids: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="10.5" r="1.1" fill="currentColor"/><circle cx="15" cy="10.5" r="1.1" fill="currentColor"/><path d="M8.5 14.2c1.9 2.2 5.1 2.2 7 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  mijn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5c2.5-6 6-9 8-9s5.5 3 8 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4 15.5h16v1.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 6.5V10M8.3 9l1.6 3M15.7 9l-1.6 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  index: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};
const huidig = (href) => (nu === href || (href !== "/" && nu.startsWith(href + "/")) ? ' aria-current="page"' : "");

export async function ontdek() {
  const slug = nu.split("/").filter(Boolean).pop();
  const keuze = (await dieren()).filter((v) => v.slug !== slug);
  return pad(keuze[Math.floor(Math.random() * keuze.length)]);
}
const naarOntdek = async (e) => { e.preventDefault(); location.href = await ontdek(); };

for (const kop of document.querySelectorAll("header.balk[data-familie]")) {
  kop.innerHTML = `
    <a class="merk" href="/" aria-label="Zeezicht, naar het begin">${ICOON.merk}<span class="merk-naam">zeezicht</span></a>
    <div class="zoek" role="search">
      <div class="zoek-rij">
        <div class="zoek-pil">
          <label class="sr" for="zoekveld">Zoek een dier</label>
          <input id="zoekveld" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"
            placeholder="Zoek een dier, zoals kokkel of zeehond" role="combobox" aria-expanded="false" aria-controls="zoek-lijst" aria-autocomplete="list">
          <ul id="zoek-lijst" class="zoek-lijst" role="listbox" hidden></ul>
        </div>
        <button class="knop-pil knop-donker zoek-knop" type="button">${ICOON.zoek}Zoeken</button>
        <a class="knop-pil knop-accent" href="/ontdek" data-ontdek>${ICOON.ontdek}Ontdek een dier</a>
      </div>
      <p class="zoek-melding" aria-live="polite"></p>
    </div>
    <nav class="balk-nav" aria-label="Hoofdmenu">
      <a class="nav-knop" href="/onderzoekjes"${huidig("/onderzoekjes")} aria-label="Onderzoekjes met Fos">${ICOON.oz}<span>Onderzoekjes</span></a>
      <a class="nav-knop nav-knop-kids" href="/kinderen"${huidig("/kinderen")} aria-label="Voor kinderen">${ICOON.kids}<span>Kinderen</span></a>
      <a class="nav-knop" href="/mijn"${huidig("/mijn")} aria-label="Mijn zee">${ICOON.mijn}<span>Mijn zee</span><b class="nav-mijn-n" hidden></b></a>
      <a class="nav-knop" href="/#alle" aria-label="Alle dieren">${ICOON.index}<span>Index</span></a>
    </nav>`;
  const veld = kop.querySelector("#zoekveld"), ul = kop.querySelector("#zoek-lijst"), melding = kop.querySelector(".zoek-melding");
  let lijst = [], treffers = [], keuze = -1;
  dieren().then((d) => (lijst = d)).catch(() => {});
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const zoek = (q) => {
    q = norm(q.trim()).replace(/^(de|het)\s+/, "");
    if (!q) return [];
    return lijst.filter((v) => [v.naam, v.wet, v.groep, ...(v.ook || [])].some((x) => norm(x || "").includes(q)))
      .sort((a, b) => (norm(kaal(a.naam)).startsWith(q) ? 0 : 1) - (norm(kaal(b.naam)).startsWith(q) ? 0 : 1));
  };
  const toon = () => {
    treffers = zoek(veld.value).slice(0, 8); keuze = treffers.length ? 0 : -1; melding.textContent = "";
    ul.innerHTML = treffers.map((v, i) => `<li role="option" id="z${i}" aria-selected="${i === keuze}" data-i="${i}"><span>${esc(hoofd(kaal(v.naam)))}</span><span class="zacht">${esc(v.groep)}</span></li>`).join("");
    ul.hidden = !treffers.length; veld.setAttribute("aria-expanded", String(!ul.hidden));
  };
  const ga = () => {
    const t = treffers[Math.max(0, keuze)] || zoek(veld.value)[0];
    if (t) location.href = pad(t);
    else if (veld.value.trim()) melding.innerHTML = `Dat dier staat er (nog) niet in. Kijk bij <a href="/#alle">alle dieren</a> of bij <a href="/strand">wat je aan het strand vindt</a>.`;
  };
  veld.addEventListener("input", toon);
  veld.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!treffers.length) return; keuze = (keuze + (e.key === "ArrowDown" ? 1 : -1) + treffers.length) % treffers.length; for (const li of ul.children) li.setAttribute("aria-selected", String(+li.dataset.i === keuze)); veld.setAttribute("aria-activedescendant", "z" + keuze); }
    else if (e.key === "Enter") { e.preventDefault(); ga(); } else if (e.key === "Escape") { ul.hidden = true; veld.setAttribute("aria-expanded", "false"); }
  });
  ul.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) { keuze = +li.dataset.i; ga(); } });
  kop.querySelector(".zoek-knop").addEventListener("click", ga);
  document.addEventListener("click", (e) => { if (!kop.contains(e.target)) ul.hidden = true; });
  kop.querySelector("[data-ontdek]").addEventListener("click", naarOntdek);
  const teller = () => { const n = MIJN.aantal(), b = kop.querySelector(".nav-mijn-n"); b.textContent = n; b.hidden = !n; };
  teller(); MIJN.opVerandering(teller);
  const maat = () => document.documentElement.style.setProperty("--balk-h", kop.offsetHeight + "px");
  maat(); addEventListener("resize", maat);
}

for (const voet of document.querySelectorAll("footer.voet[data-familie]")) {
  voet.innerHTML = `
    <div class="voet-kolommen">
      <div><h2>Data</h2><p>Namen en indeling: <a href="https://www.marinespecies.org">WoRMS</a> (CC BY) en Wikidata (CC0). Meldingen: <a href="https://www.gbif.org">GBIF</a> en <a href="https://obis.org">OBIS</a>, vooral Observation.org (CC BY-NC). Wat aanspoelt: de strandmonitoring van <a href="https://www.anemoon.org">Stichting ANEMOON</a> (CC BY). Getij: Rijkswaterstaat. Weetjes: Wikipedia (CC BY-SA), elk met een zin die we op de bronpagina terugvinden. <a href="/hoe-dit-werkt">Hoe dit werkt</a></p></div>
      <div><h2>Beeld</h2><p>Echte foto's en oude platen (Bloch, Haeckel, Iconographia Zoologica) via Wikimedia Commons, met maker en licentie bij elk beeld. Geen AI-beelden. Heeft een dier geen goede vrije foto, dan staat er een plaat of niets. Kaart: Natural Earth (publiek domein).</p></div>
      <div><h2>Geluid</h2><p>Alleen echte opnames met een vrije licentie, met de maker erbij. Is een geluid sneller of langzamer gemaakt om het hoorbaar te maken, dan staat dat erbij. De stem in de kinderversie is die van je eigen toestel. Letters: Geist en Geist Mono (OFL).</p></div>
      <div><h2>Privacy</h2><p>Geen cookies en geen bezoekersstatistiek. Je locatie gebruiken we alleen om het dichtstbijzijnde getijstation te kiezen, en we bewaren hem niet. Mijn zee en de logboeken van de onderzoekjes blijven op je eigen apparaat.</p></div>
    </div>
    <div class="voet-acties">
      <a class="knop-pil" href="/strand">Wat vind je aan het strand?</a>
      <a class="knop-pil knop-accent" href="/ontdek" data-ontdek>Ontdek een dier</a>
    </div>
    <p class="voet-merk" aria-hidden="true">zeezicht</p>`;
  voet.querySelector("[data-ontdek]").addEventListener("click", naarOntdek);
}
