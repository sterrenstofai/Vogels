import { laadData, menu, api, leesFormulier } from "./kern.js";
import { esc } from "./weergave.js";

menu();

const form = document.querySelector("#inzending");
const stappen = [...form.querySelectorAll("fieldset[data-stap]")];
const balk = [...document.querySelectorAll("#stappen-balk li")];
const vorige = document.querySelector("#vorige");
const volgende = document.querySelector("#volgende");
const verstuur = document.querySelector("#verstuur");
const status = form.querySelector(".formstatus");
const SLEUTEL = "mp-inzending";
let stap = 0;

const isAanvulling = () => form.elements.soort.value === "aanvulling";

// Bewaar de invoer in de browser, zodat een verversing niets kost.
function bewaar() {
  try {
    const { website, akkoord, ...rest } = leesFormulier(form);
    localStorage.setItem(SLEUTEL, JSON.stringify(rest));
  } catch {
    /* geen opslag: dan niet */
  }
}

function herstel() {
  try {
    const eerder = JSON.parse(localStorage.getItem(SLEUTEL) ?? "null");
    if (!eerder) return;
    for (const [naam, waarde] of Object.entries(eerder)) {
      const veld = form.elements[naam];
      if (veld && typeof waarde === "string") veld.value = waarde;
    }
  } catch {
    /* onleesbaar: negeren */
  }
}

function pasSoortAan() {
  const aanvulling = isAanvulling();
  for (const veld of form.querySelectorAll("[data-casus]")) veld.required = !aanvulling;
  for (const blok of form.querySelectorAll("[data-alleen-inzending]")) blok.hidden = aanvulling;
  form.querySelector("[data-tekst-inzending]").hidden = aanvulling;
  form.querySelector("[data-tekst-aanvulling]").hidden = !aanvulling;
}

function samenvatting() {
  const g = leesFormulier(form);
  const regels = [
    ["Soort", isAanvulling() ? "Aanvulling of verwijdering" : "Nieuwe inzending"],
    ["Oplossing", g.oplossing],
    ["Organisatie", g.organisatie],
    ...(isAanvulling() ? [] : [["Sector", g.sector], ["Soort oplossing", g.type], ["In gebruik sinds", g.sinds]]),
    [isAanvulling() ? "Je bericht" : "Beschrijving", g.beschrijving],
    ...(isAanvulling() ? [] : [["Resultaat", g.resultaat]]),
  ];
  document.querySelector("#samenvatting").innerHTML = `<h3>Dit ga je versturen</h3><dl>${regels
    .filter(([, w]) => w)
    .map(([n, w]) => `<div><dt>${n}</dt><dd>${esc(w.length > 220 ? w.slice(0, 220) + "…" : w)}</dd></div>`)
    .join("")}</dl>`;
}

function toon(nieuw, focus = true) {
  stap = Math.max(0, Math.min(stappen.length - 1, nieuw));
  stappen.forEach((s, i) => (s.hidden = i !== stap));
  balk.forEach((li, i) => {
    li.toggleAttribute("aria-current", i === stap);
    if (i === stap) li.setAttribute("aria-current", "step");
    li.classList.toggle("gedaan", i < stap);
  });
  vorige.hidden = stap === 0;
  volgende.hidden = stap === stappen.length - 1;
  verstuur.hidden = stap !== stappen.length - 1;
  status.textContent = "";
  status.className = "formstatus";
  if (stap === stappen.length - 1) samenvatting();
  if (focus) {
    stappen[stap].querySelector("legend").scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    stappen[stap].querySelector("input:not([type=hidden]), select, textarea")?.focus({ preventScroll: true });
  }
}

// Een stap is klaar als alle zichtbare velden erin geldig zijn.
function stapGeldig() {
  for (const veld of stappen[stap].querySelectorAll("input, select, textarea")) {
    if (veld.closest("[hidden]")) continue;
    if (!veld.checkValidity()) {
      veld.reportValidity();
      return false;
    }
  }
  return true;
}

volgende.addEventListener("click", () => stapGeldig() && toon(stap + 1));
vorige.addEventListener("click", () => toon(stap - 1));
form.addEventListener("input", bewaar);
form.addEventListener("change", (e) => e.target.name === "soort" && pasSoortAan());
form.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT" && stap < stappen.length - 1) {
    e.preventDefault();
    volgende.click();
  }
});

form.addEventListener("submit", async (gebeurtenis) => {
  gebeurtenis.preventDefault();
  if (!stapGeldig()) return;
  verstuur.disabled = true;
  status.className = "formstatus";
  status.textContent = "Bezig met versturen.";
  const r = await api("/inzending", leesFormulier(form));
  verstuur.disabled = false;
  if (!r.ok) {
    status.className = "formstatus mislukt";
    status.textContent = r.data?.fout ?? "Het versturen is niet gelukt. Er is niets opgeslagen; je invoer staat nog in dit formulier.";
    return;
  }
  try {
    localStorage.removeItem(SLEUTEL);
  } catch {
    /* geen opslag */
  }
  form.hidden = true;
  document.querySelector("#stappen-balk").hidden = true;
  const klaar = document.querySelector("#klaar");
  document.querySelector("#klaar-nummer").textContent = r.data.nummer ? `Nummer ${r.data.nummer}` : "";
  klaar.hidden = false;
  klaar.focus();
});

// Een link vanaf een oplossing vult alvast in waar de aanvulling over gaat.
herstel();
const p = new URLSearchParams(location.search);
if (["inzending", "aanvulling"].includes(p.get("soort"))) form.elements.soort.value = p.get("soort");
const over = p.get("over");
if (over) {
  try {
    const { oplossingen } = await laadData();
    const o = oplossingen.find((x) => x.id === over);
    if (o) {
      form.elements.oplossing.value = o.naam;
      form.elements.organisatie.value = o.organisatie;
      form.elements.verwijzing.value = o.id;
    }
  } catch (fout) {
    console.error(fout);
  }
}
pasSoortAan();
toon(over ? 2 : 0, false);
