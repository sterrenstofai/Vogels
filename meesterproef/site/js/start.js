import { laadData, toonFout, kaart, beeld, etiket, esc, weeknummer, menu, SECTORKLEUR } from "./kern.js";
import { CRITERIA } from "./score.js";

menu();

const herkomstTekst = {
  onafhankelijk: "Onafhankelijk vastgesteld",
  organisatie: "Cijfer van de organisatie zelf",
  leverancier: "Cijfer van de leverancier",
};

function uitgelichtHTML(o, week) {
  return `<a class="uitgelicht" href="/oplossing.html?id=${encodeURIComponent(o.id)}">
    ${beeld(o)}
    <div class="uitgelicht-tekst">
      <p class="meta">Uitgelicht · week ${week}</p>
      <h2>${esc(o.naam)}</h2>
      <p class="uitgelicht-org">${esc(o.organisatie)}</p>
      <p class="uitgelicht-kort">${esc(o.opvallend || o.kort)}</p>
      ${o.resultaat ? `<p class="resultaat"><span>${esc(o.resultaat.tekst)}</span><small>${esc(herkomstTekst[o.resultaat.herkomst] ?? "")}</small></p>` : ""}
      <p class="uitgelicht-voet">${etiket(o)} <span class="pijl">Bekijk de oplossing</span></p>
    </div>
  </a>`;
}

function criteriaHTML() {
  return CRITERIA.map(
    (c) => `<li><span class="gewicht">${c.gewicht}%</span><h3>${esc(c.naam)}</h3><p>${esc(c.vraag)}</p></li>`
  ).join("");
}

try {
  const { oplossingen, jury } = await laadData();
  const sectoren = new Map();
  for (const o of oplossingen) sectoren.set(o.sector, (sectoren.get(o.sector) ?? 0) + 1);

  document.querySelector("#tel-oplossingen").textContent = oplossingen.length;
  document.querySelector("#tel-sectoren").textContent = sectoren.size;
  document.querySelector("#tel-productie").textContent = oplossingen.filter((o) => o.status === "In productie").length;
  document.querySelector("#tel-jury").textContent = jury.length || "in oprichting";

  // De uitgelichte oplossing wisselt per week en ligt vast per weeknummer,
  // zodat iedereen dezelfde ziet. Het is een keuze van de redactie, geen prijs.
  const { jaar, week } = weeknummer();
  const kandidaten = oplossingen.filter((o) => o.status === "In productie" && o.resultaat).sort((a, b) => a.id.localeCompare(b.id));
  const poel = kandidaten.length ? kandidaten : oplossingen;
  const gekozen = poel[(jaar * 53 + week) % poel.length];
  document.querySelector("#uitgelicht").innerHTML = gekozen ? uitgelichtHTML(gekozen, week) : "";

  // Zes kaarten, zo veel mogelijk uit verschillende sectoren.
  const rest = oplossingen
    .filter((o) => o !== gekozen)
    .sort((a, b) => (b.toegevoegd ?? "").localeCompare(a.toegevoegd ?? "") || a.id.localeCompare(b.id));
  const gezien = new Set();
  const keuze = [];
  for (const o of rest) {
    if (keuze.length < 6 && !gezien.has(o.sector)) {
      keuze.push(o);
      gezien.add(o.sector);
    }
  }
  for (const o of rest) if (keuze.length < 6 && !keuze.includes(o)) keuze.push(o);
  document.querySelector("#nieuw").innerHTML = keuze.map(kaart).join("");

  document.querySelector("#criteria").innerHTML = criteriaHTML();

  document.querySelector("#sectoren").innerHTML = [...sectoren.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(
      ([naam, aantal]) =>
        `<li><a href="/oplossingen.html?sector=${encodeURIComponent(naam)}" style="--vlak:${SECTORKLEUR[naam] ?? "#d8d3c7"}"><span>${esc(naam)}</span><b>${aantal}</b></a></li>`
    )
    .join("");
} catch (fout) {
  toonFout(document.querySelector("#uitgelicht"), fout);
}
