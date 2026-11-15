import { laadData, toonFout, kaart, esc, menu } from "./kern.js";

menu();

const raster = document.querySelector("#raster");
const teller = document.querySelector("#teller");
const formulier = document.querySelector("#filters");
const velden = ["zoek", "sector", "type", "status", "stand", "volgorde"];

function standVan(o) {
  if (o.oordeel?.compleet) return o.oordeel.onderscheiding?.id ?? "beoordeeld";
  if (o.herkomst === "inzending") return "inzending";
  return "redactie";
}

function vulKeuzes(select, waarden) {
  select.insertAdjacentHTML(
    "beforeend",
    [...waarden].sort((a, b) => a.localeCompare(b)).map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")
  );
}

function leesAdres() {
  const p = new URLSearchParams(location.search);
  for (const v of velden) {
    const veld = formulier.elements[v];
    const waarde = p.get(v);
    if (veld && waarde !== null && (veld.tagName !== "SELECT" || [...veld.options].some((o) => o.value === waarde))) {
      veld.value = waarde;
    }
  }
}

function schrijfAdres() {
  const p = new URLSearchParams();
  for (const v of velden) {
    const waarde = formulier.elements[v].value;
    if (waarde && !(v === "volgorde" && waarde === "nieuw")) p.set(v, waarde);
  }
  const tekst = p.toString();
  history.replaceState(null, "", tekst ? `?${tekst}` : location.pathname);
}

try {
  const { oplossingen } = await laadData();
  vulKeuzes(formulier.elements.sector, new Set(oplossingen.map((o) => o.sector)));
  vulKeuzes(formulier.elements.type, new Set(oplossingen.map((o) => o.type)));
  vulKeuzes(formulier.elements.status, new Set(oplossingen.map((o) => o.status)));
  leesAdres();

  const toon = () => {
    const f = Object.fromEntries(velden.map((v) => [v, formulier.elements[v].value]));
    const zoek = f.zoek.trim().toLowerCase();
    let lijst = oplossingen.filter(
      (o) =>
        (!f.sector || o.sector === f.sector) &&
        (!f.type || o.type === f.type) &&
        (!f.status || o.status === f.status) &&
        (!f.stand || standVan(o) === f.stand) &&
        (!zoek || [o.naam, o.organisatie, o.kort, o.beschrijving, ...(o.gebouwdMet ?? [])].join(" ").toLowerCase().includes(zoek))
    );
    const opNaam = (a, b) => a.naam.localeCompare(b.naam, "nl");
    if (f.volgorde === "naam") lijst.sort(opNaam);
    else if (f.volgorde === "organisatie") lijst.sort((a, b) => a.organisatie.localeCompare(b.organisatie, "nl") || opNaam(a, b));
    else if (f.volgorde === "cijfer") lijst.sort((a, b) => (b.oordeel?.eindcijfer ?? -1) - (a.oordeel?.eindcijfer ?? -1) || opNaam(a, b));
    else lijst.sort((a, b) => (b.toegevoegd ?? "").localeCompare(a.toegevoegd ?? "") || opNaam(a, b));

    teller.textContent = lijst.length === oplossingen.length ? `${lijst.length} oplossingen` : `${lijst.length} van ${oplossingen.length} oplossingen`;
    raster.innerHTML = lijst.length
      ? lijst.map(kaart).join("")
      : `<p class="melding">Geen oplossingen gevonden met deze filters. <button type="reset" form="filters" class="tekstknop">Wis de filters</button></p>`;
    schrijfAdres();
  };

  formulier.addEventListener("input", toon);
  formulier.addEventListener("reset", () => setTimeout(toon));
  formulier.addEventListener("submit", (e) => e.preventDefault());
  toon();
} catch (fout) {
  toonFout(raster, fout);
}
