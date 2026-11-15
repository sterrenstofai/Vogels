// Gedeelde bouwstenen: gegevens laden, tekst veilig maken, kaarten en beeld.
import { oordeel, toonCijfer } from "./score.js";

export const SECTORKLEUR = {
  Retail: "#f2c14e",
  "Financiën": "#9ad1b3",
  Zorg: "#f4a6a0",
  Overheid: "#a9c4f5",
  Mobiliteit: "#c7b8f5",
  Media: "#f28f5c",
  "Zakelijke software": "#b8e06a",
  Industrie: "#c9c3b6",
  Onderwijs: "#8fd6e8",
  Juridisch: "#e3b5d6",
  Logistiek: "#e9d8a6",
  Energie: "#ffe14d",
  "Agri en food": "#a8d08d",
  Reizen: "#7fc8c2",
};

export function esc(tekst) {
  return String(tekst ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}

async function haal(pad) {
  const antwoord = await fetch(pad, { cache: "no-cache" });
  if (!antwoord.ok) throw new Error(`${pad}: ${antwoord.status}`);
  return antwoord.json();
}

// Laadt alles en hangt aan elke oplossing haar oordeel.
export async function laadData() {
  const [oplossingen, jury, beoordelingen] = await Promise.all([
    haal("/data/oplossingen.json"),
    haal("/data/jury.json"),
    haal("/data/beoordelingen.json"),
  ]);
  const perOplossing = new Map();
  for (const b of beoordelingen) {
    if (!perOplossing.has(b.oplossing)) perOplossing.set(b.oplossing, []);
    perOplossing.get(b.oplossing).push(b);
  }
  for (const o of oplossingen) o.oordeel = oordeel(perOplossing.get(o.id));
  return { oplossingen, jury, beoordelingen };
}

export function toonFout(doel, fout) {
  console.error(fout);
  doel.innerHTML = `<p class="melding">De gegevens konden niet worden geladen. Ververs de pagina om het opnieuw te proberen.</p>`;
}

function hash(tekst) {
  let h = 2166136261;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Het beeld van een oplossing. We tonen geen schermafbeeldingen van
// andermans werk; elke oplossing krijgt een eigen vlak in de kleur van
// haar sector, met een vorm die vast bij haar id hoort.
export function beeld(o) {
  const kleur = SECTORKLEUR[o.sector] ?? "#d8d3c7";
  const h = hash(o.id);
  const soort = h % 5;
  const x = 40 + ((h >>> 3) % 50);
  const y = 20 + ((h >>> 9) % 40);
  const r = 34 + ((h >>> 15) % 30);
  let vorm = "";
  if (soort === 0) vorm = `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  if (soort === 1) vorm = `<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" class="gat"/>`;
  if (soort === 2) vorm = `<rect x="${x - r}" y="${y - r / 2}" width="${r * 2}" height="${r * 2}" transform="rotate(${(h >>> 20) % 45} ${x} ${y})"/>`;
  if (soort === 3) vorm = `<path d="M${x - r} ${y + r} A${r * 2} ${r * 2} 0 0 1 ${x + r} ${y - r} L${x + r} ${y + r} Z"/>`;
  if (soort === 4) vorm = [0, 1, 2, 3, 4].map((i) => `<rect x="${x - r + i * (r / 2.2)}" y="${y - r}" width="${r / 5}" height="${r * 2.4}"/>`).join("");
  return `<div class="beeld" style="--vlak:${kleur}" aria-hidden="true">
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice">${vorm}</svg>
    <span class="beeld-naam">${esc(o.organisatie)}</span>
  </div>`;
}

// Het etiket dat zegt waar een oplossing staat in het traject.
export function etiket(o) {
  const d = o.oordeel;
  if (d?.compleet) {
    const naam = d.onderscheiding ? d.onderscheiding.naam : "Beoordeeld";
    const soort = d.onderscheiding ? d.onderscheiding.id : "beoordeeld";
    return `<span class="etiket etiket-${soort}"><b>${toonCijfer(d.eindcijfer)}</b> ${esc(naam)}</span>`;
  }
  if (d?.aantal > 0) return `<span class="etiket etiket-loopt">Bij de jury</span>`;
  if (o.herkomst === "inzending") return `<span class="etiket etiket-inzending">Inzending</span>`;
  return `<span class="etiket etiket-redactie">Redactieselectie</span>`;
}

export function kaart(o) {
  return `<article class="kaart">
    <a class="kaart-link" href="/oplossing.html?id=${encodeURIComponent(o.id)}">
      ${beeld(o)}
      <div class="kaart-tekst">
        <div class="kaart-kop">
          <h3>${esc(o.naam)}</h3>
          ${etiket(o)}
        </div>
        <p class="kaart-org">${esc(o.organisatie)}</p>
        <p class="kaart-kort">${esc(o.kort)}</p>
        <p class="meta">${esc(o.sector)} · ${esc(o.type)} · ${esc(o.status)}</p>
      </div>
    </a>
  </article>`;
}

export function datumTekst(iso) {
  if (!iso) return "";
  if (/^\d{4}$/.test(iso)) return iso;
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

// Weeknummer volgens ISO 8601, voor de wekelijkse uitgelichte oplossing.
export function weeknummer(datum = new Date()) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const dag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dag);
  const begin = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { jaar: d.getUTCFullYear(), week: Math.ceil(((d - begin) / 86400000 + 1) / 7) };
}

// Markeer het actieve menu-item en zet het mobiele menu aan.
export function menu() {
  const hier = location.pathname.replace(/\/$/, "/index.html");
  for (const a of document.querySelectorAll(".menu a")) {
    if (a.getAttribute("href") === hier || (hier.startsWith("/oplossing") && a.getAttribute("href") === "/oplossingen.html")) {
      a.setAttribute("aria-current", "page");
    }
  }
  const knop = document.querySelector(".menuknop");
  const lijst = document.querySelector(".menu");
  knop?.addEventListener("click", () => {
    const open = lijst.classList.toggle("open");
    knop.setAttribute("aria-expanded", String(open));
  });
}
