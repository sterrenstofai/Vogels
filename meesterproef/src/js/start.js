import { laadData, toonFout, weeknummer, menu, onthul, BASIS } from "./kern.js";
import { kaart, esc, adresVan, vlakStijl, etiket, datumTekst, lengteKlas } from "./weergave.js";
import { poster, kleuren } from "./poster.js";
import { CRITERIA, bewijs, ranglijst, stand, toonCijfer } from "./score.js";

menu();

function tegels(o) {
  const d = o.oordeel;
  if (d?.compleet) {
    return `<li class="tegel-groot"><b>${toonCijfer(d.eindcijfer)}</b><span>Eindcijfer</span></li>${CRITERIA.map(
      (c) => `<li><b>${toonCijfer(d.perCriterium[c.id])}</b><span>${esc(c.naam)}</span></li>`
    ).join("")}`;
  }
  return [
    [o.status, "Status"],
    [o.sinds ?? "–", "In gebruik sinds"],
    [bewijs(o).naam, "Bewijs"],
    [String(o.bronnen?.length ?? 0), "Bronnen gelezen"],
  ]
    .map(([waarde, naam]) => `<li><b>${esc(waarde)}</b><span>${esc(naam)}</span></li>`)
    .join("");
}

function heldHTML(o, label) {
  return `<div class="held-vlak" style="${vlakStijl(o)}">
    <div class="held-poster" aria-hidden="true">${poster(o)}</div>
    <div class="breed held-binnen">
      <p class="held-label">${esc(label)}</p>
      <h2 class="${lengteKlas(o.naam)}"><a href="${esc(adresVan(o, BASIS))}">${esc(o.naam)}</a></h2>
      <p class="held-org">${esc(o.organisatie)} ${etiket(o)}</p>
      <p class="held-kort">${esc(o.kort)}</p>
      <ul class="held-tegels${o.oordeel?.compleet ? " held-tegels-cijfers" : ""}">${tegels(o)}</ul>
      <a class="knop knop-op-vlak" href="${esc(adresVan(o, BASIS))}">Bekijk de oplossing</a>
    </div>
  </div>`;
}

function rangkaart(rij, plek) {
  const eerste = rij.oplossingen[0];
  return `<article class="rangkaart" data-onthul>
    <a href="${BASIS}/oplossingen/?zoek=${encodeURIComponent(rij.naam)}">
      <div class="rangkaart-beeld" style="--vlak:${kleuren(eerste.sector).bg}">${poster(eerste)}<span class="rangkaart-plek">${String(plek).padStart(2, "0")}</span></div>
      <h3>${esc(rij.naam)}</h3>
      <dl><div><dt title="Meesterproef">MP</dt><dd>${rij.meesterproef}</dd></div><div><dt title="Eervolle vermelding">EV</dt><dd>${rij.eervol}</dd></div><div><dt title="In de selectie">Selectie</dt><dd>${rij.totaal}</dd></div></dl>
    </a>
  </article>`;
}

try {
  const { oplossingen, jury } = await laadData();
  const sectoren = new Map();
  for (const o of oplossingen) sectoren.set(o.sector, (sectoren.get(o.sector) ?? 0) + 1);
  const winnaars = oplossingen.filter((o) => ["meesterproef", "eervol"].includes(stand(o))).sort((a, b) => (b.uitslag ?? "").localeCompare(a.uitslag ?? "") || b.oordeel.eindcijfer - a.oordeel.eindcijfer);

  document.querySelector("#tel-oplossingen").textContent = oplossingen.length;
  document.querySelector("#tel-sectoren").textContent = sectoren.size;
  document.querySelector("#tel-winnaars").textContent = winnaars.length;
  document.querySelector("#tel-jury").textContent = jury.length;

  // Bovenaan staat de nieuwste Meesterproef. Is er nog geen, dan een
  // oplossing die per week wisselt; dat is een keuze van de redactie.
  const { jaar, week } = weeknummer();
  const meester = winnaars.find((o) => stand(o) === "meesterproef");
  const kandidaten = oplossingen.filter((o) => o.status === "In productie" && o.resultaat).sort((a, b) => a.id.localeCompare(b.id));
  const poel = kandidaten.length ? kandidaten : oplossingen;
  const gekozen = meester ?? poel[(jaar * 53 + week) % poel.length];
  document.querySelector("#held").innerHTML = heldHTML(gekozen, meester ? `Meesterproef · ${datumTekst(meester.uitslag)}` : `Uitgelicht · week ${week}`);

  // Acht genomineerden, zo veel mogelijk uit verschillende sectoren.
  const open = oplossingen.filter((o) => o !== gekozen && !o.oordeel?.compleet).sort((a, b) => (b.toegevoegd ?? "").localeCompare(a.toegevoegd ?? "") || a.id.localeCompare(b.id));
  const gezien = new Set();
  const keuze = [];
  for (const o of open) if (keuze.length < 8 && !gezien.has(o.sector)) (keuze.push(o), gezien.add(o.sector));
  for (const o of open) if (keuze.length < 8 && !keuze.includes(o)) keuze.push(o);
  document.querySelector("#genomineerd").innerHTML = keuze.map((o) => kaart(o, BASIS)).join("");

  document.querySelector("#winnaars").innerHTML = winnaars.length
    ? `<div class="raster raster-4">${winnaars.slice(0, 4).map((o) => kaart(o, BASIS)).join("")}</div>`
    : `<div class="leegstaat" data-onthul>
        <div><p class="meta">Eerste juryronde</p><h3>De eerste uitslag komt eraan.</h3></div>
        <p>De jury wordt nu samengesteld. Zodra minstens drie juryleden een oplossing hebben beoordeeld, staat hier de uitslag, met de cijfers per jurylid. Tot die tijd is elke oplossing genomineerd, zonder cijfer.</p>
        <p class="leegstaat-links"><a class="pijl" href="/werkwijze/">Hoe de jury beoordeelt</a><a class="pijl" href="/voorbeeld/">Bekijk een voorbeeld met cijfers</a></p>
      </div>`;

  // Zonder onderscheidingen is er nog geen rangorde; dan telt alleen het aantal.
  if (!winnaars.length) document.querySelector("#rang").closest("section").querySelector("h2").textContent = "Vaakst in de selectie";
  document.querySelector("#rang").innerHTML = ranglijst(oplossingen, (o) => [o.organisatie]).slice(0, 4).map((rij, i) => rangkaart(rij, i + 1)).join("");

  document.querySelector("#sectoren").innerHTML = [...sectoren.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([naam, aantal]) => {
      const k = kleuren(naam);
      return `<li><a href="${BASIS}/oplossingen/?sector=${encodeURIComponent(naam)}" style="--vlak:${k.bg};--op-vlak:${k.vorm}"><span>${esc(naam)}</span><b>${aantal}</b></a></li>`;
    })
    .join("");
  onthul();
} catch (fout) {
  toonFout(document.querySelector("#held"), fout);
}
