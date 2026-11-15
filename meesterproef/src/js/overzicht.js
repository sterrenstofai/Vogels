import { laadData, toonFout, menu, BASIS } from "./kern.js";
import { kaart, esc, adresVan, etiket } from "./weergave.js";
import { bewijs, stand, toonCijfer } from "./score.js";

menu();

const raster = document.querySelector("#raster");
const teller = document.querySelector("#teller");
const formulier = document.querySelector("#filters");
const wis = document.querySelector("#wis");
const velden = ["stand", "zoek", "sector", "type", "status", "bewijs", "maker", "volgorde"];
let weergave = "raster";
try {
  weergave = localStorage.getItem("mp-weergave") === "lijst" ? "lijst" : "raster";
} catch {
  /* geen opslag: raster */
}

const waarde = (naam) => formulier.elements[naam].value;

function vulKeuzes(select, waarden) {
  select.insertAdjacentHTML("beforeend", [...waarden].sort((a, b) => a.localeCompare(b, "nl")).map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join(""));
}

function leesAdres() {
  const p = new URLSearchParams(location.search);
  for (const v of velden) {
    const w = p.get(v);
    if (w === null) continue;
    const veld = formulier.elements[v];
    if (veld instanceof RadioNodeList) {
      if ([...veld].some((r) => r.value === w)) veld.value = w;
    } else if (veld.tagName !== "SELECT" || [...veld.options].some((o) => o.value === w)) veld.value = w;
  }
}

function schrijfAdres() {
  const p = new URLSearchParams();
  for (const v of velden) {
    const w = waarde(v);
    if (w && !(v === "volgorde" && w === "nieuw")) p.set(v, w);
  }
  const tekst = p.toString();
  history.replaceState(null, "", tekst ? `?${tekst}` : location.pathname);
  wis.hidden = !tekst;
}

function rij(o) {
  const d = o.oordeel;
  return `<tr><td><a href="${esc(adresVan(o, BASIS))}">${esc(o.naam)}</a></td><td>${esc(o.organisatie)}</td><td>${esc(o.sector)}</td><td>${esc(o.type)}</td><td>${esc(o.status)}</td><td>${etiket(o)}</td><td class="getal">${d?.compleet ? toonCijfer(d.eindcijfer) : "–"}</td></tr>`;
}

try {
  const { oplossingen } = await laadData();
  vulKeuzes(formulier.elements.sector, new Set(oplossingen.map((o) => o.sector)));
  vulKeuzes(formulier.elements.type, new Set(oplossingen.map((o) => o.type)));
  vulKeuzes(formulier.elements.status, new Set(oplossingen.map((o) => o.status)));
  leesAdres();

  const toon = () => {
    const zoek = waarde("zoek").trim().toLowerCase();
    const maker = waarde("maker");
    const lijst = oplossingen.filter(
      (o) =>
        (!waarde("stand") || stand(o) === waarde("stand")) &&
        (!waarde("sector") || o.sector === waarde("sector")) &&
        (!waarde("type") || o.type === waarde("type")) &&
        (!waarde("status") || o.status === waarde("status")) &&
        (waarde("bewijs") === "" || String(bewijs(o).niveau) === waarde("bewijs")) &&
        (!maker || (o.gebouwdMet ?? []).includes(maker)) &&
        (!zoek || [o.naam, o.organisatie, o.kort, o.beschrijving, ...(o.gebouwdMet ?? [])].join(" ").toLowerCase().includes(zoek))
    );
    const opNaam = (a, b) => a.naam.localeCompare(b.naam, "nl");
    const volgorde = waarde("volgorde");
    if (volgorde === "naam") lijst.sort(opNaam);
    else if (volgorde === "organisatie") lijst.sort((a, b) => a.organisatie.localeCompare(b.organisatie, "nl") || opNaam(a, b));
    else if (volgorde === "cijfer") lijst.sort((a, b) => (b.oordeel?.eindcijfer ?? -1) - (a.oordeel?.eindcijfer ?? -1) || opNaam(a, b));
    else lijst.sort((a, b) => (b.uitslag ?? b.toegevoegd ?? "").localeCompare(a.uitslag ?? a.toegevoegd ?? "") || opNaam(a, b));

    teller.textContent = `${lijst.length === oplossingen.length ? lijst.length : `${lijst.length} van ${oplossingen.length}`} oplossingen${maker ? `, gebouwd met ${maker}` : ""}`;
    raster.className = weergave === "lijst" ? "lijstweergave" : "raster raster-4";
    if (!lijst.length) {
      raster.innerHTML = `<p class="melding">Geen oplossingen gevonden met deze filters.</p>`;
    } else if (weergave === "lijst") {
      raster.innerHTML = `<div class="tabelrol"><table class="tabel"><thead><tr><th>Oplossing</th><th>Organisatie</th><th>Sector</th><th>Soort</th><th>Status</th><th>Oordeel</th><th class="getal">Cijfer</th></tr></thead><tbody>${lijst.map(rij).join("")}</tbody></table></div>`;
    } else {
      raster.innerHTML = lijst.map((o) => kaart(o, BASIS)).join("");
    }
    schrijfAdres();
  };

  for (const knop of document.querySelectorAll("[data-weergave]")) {
    knop.setAttribute("aria-pressed", String(knop.dataset.weergave === weergave));
    knop.addEventListener("click", () => {
      weergave = knop.dataset.weergave;
      try {
        localStorage.setItem("mp-weergave", weergave);
      } catch {
        /* geen opslag */
      }
      for (const k of document.querySelectorAll("[data-weergave]")) k.setAttribute("aria-pressed", String(k === knop));
      toon();
    });
  }
  formulier.addEventListener("input", toon);
  formulier.addEventListener("reset", () => setTimeout(() => ((formulier.elements.maker.value = ""), toon())));
  formulier.addEventListener("submit", (e) => e.preventDefault());
  toon();
} catch (fout) {
  toonFout(raster, fout);
}
