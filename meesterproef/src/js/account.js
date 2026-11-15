import { laadData, menu, api, leesFormulier, onthoudLogin } from "./kern.js";
import { esc, adresVan, vlakStijl, bewijsmeter, lengteKlas } from "./weergave.js";
import { poster } from "./poster.js";
import { CRITERIA, gewogenCijfer, toonCijfer } from "./score.js";

menu();

const inlog = document.querySelector("#inlog");
const werk = document.querySelector("#jurywerk");
const rij = document.querySelector("#rij");
const paneel = document.querySelector("#beoordeel");
const sjabloon = document.querySelector("#beoordeel-sjabloon");

let oplossingen = [];
let mijn = new Map(); // id van de oplossing → mijn beoordeling
let belangen = new Set();
let tab = "open";
let gekozen = null;

function standVan(o) {
  if (belangen.has(o.id)) return "belang";
  return mijn.has(o.id) ? "klaar" : "open";
}

function toonRij() {
  const zoek = document.querySelector("#rij-zoek").value.trim().toLowerCase();
  const lijst = oplossingen.filter((o) => standVan(o) === tab && (!zoek || `${o.naam} ${o.organisatie} ${o.sector}`.toLowerCase().includes(zoek)));
  rij.innerHTML = lijst.length
    ? lijst
        .map((o) => {
          const b = mijn.get(o.id);
          return `<li><button type="button" data-id="${esc(o.id)}" aria-current="${o.id === gekozen}"><span class="mini">${poster(o)}</span><span><b>${esc(o.naam)}</b><small>${esc(o.organisatie)}</small></span>${b ? `<span class="rij-cijfer">${toonCijfer(gewogenCijfer(b.scores))}</span>` : ""}</button></li>`;
        })
        .join("")
    : `<li class="rij-leeg">${tab === "open" ? "Je hebt alles beoordeeld. Dank je wel." : tab === "klaar" ? "Je hebt nog niets beoordeeld." : "Je hebt je nergens voor teruggetrokken."}</li>`;
  const gedaan = oplossingen.filter((o) => standVan(o) !== "open").length;
  document.querySelector("#voortgang-tekst").textContent = `${gedaan} van ${oplossingen.length} afgehandeld`;
  document.querySelector("#voortgang-balk").style.width = `${oplossingen.length ? (gedaan / oplossingen.length) * 100 : 0}%`;
}

function toonPaneel(o) {
  gekozen = o.id;
  const eerder = mijn.get(o.id);
  const bronnen = (o.bronnen ?? []).filter((b) => /^https?:\/\//.test(b.url)).map((b) => `<a href="${esc(b.url)}" target="_blank" rel="noopener nofollow">${esc(b.uitgever || b.titel)}</a>`);
  paneel.innerHTML = `<header class="beoordeel-kop" style="${vlakStijl(o)}">
      <div><p>${esc(o.organisatie)}</p><h2 class="${lengteKlas(o.naam)}">${esc(o.naam)}</h2></div>
      <a class="knop knop-op-vlak knop-klein" href="${esc(adresVan(o))}" target="_blank" rel="noopener">Open de pagina</a>
    </header>
    <div class="beoordeel-lijf">
      <p><b>${esc(o.kort)}</b></p>
      <p>${esc(o.beschrijving)}</p>
      ${o.opvallend ? `<p>${esc(o.opvallend)}</p>` : ""}
      <div class="beoordeel-feiten">
        <span><b>Sector</b> ${esc(o.sector)}</span><span><b>Soort</b> ${esc(o.type)}</span><span><b>Status</b> ${esc(o.status)}${o.sinds ? `, sinds ${esc(o.sinds)}` : ""}</span>
        <span>${bewijsmeter(o)}</span>
      </div>
      ${o.resultaat ? `<blockquote class="resultaat"><p>${esc(o.resultaat.tekst)}</p></blockquote>` : ""}
      ${bronnen.length ? `<p class="voetnoot">Bronnen: ${bronnen.join(" · ")}</p>` : ""}
      ${belangen.has(o.id) ? `<p class="melding">Je hebt je voor deze oplossing teruggetrokken. Sla alsnog een beoordeling op om dat ongedaan te maken.</p>` : ""}
    </div>`;
  const form = sjabloon.content.firstElementChild.cloneNode(true);
  paneel.querySelector(".beoordeel-lijf").append(form);
  const totaal = form.querySelector("[data-totaal]");
  const status = form.querySelector(".formstatus");
  const reken = () => {
    const scores = {};
    for (const c of CRITERIA) {
      const s = form.elements[c.id];
      scores[c.id] = Number(s.value);
      s.nextElementSibling.textContent = s.value;
      s.style.setProperty("--vul", `${((s.value - 1) / 9) * 100}%`);
    }
    totaal.textContent = toonCijfer(gewogenCijfer(scores));
    return scores;
  };
  if (eerder) {
    for (const c of CRITERIA) form.elements[c.id].value = eerder.scores[c.id];
    form.elements.toelichting.value = eerder.toelichting ?? "";
  }
  form.addEventListener("input", reken);
  reken();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const scores = reken();
    const toelichting = form.elements.toelichting.value.trim();
    status.className = "formstatus";
    status.textContent = "Bezig met opslaan.";
    const r = await api("/jury/beoordeling", { oplossing: o.id, scores, toelichting });
    if (!r.ok) {
      status.className = "formstatus mislukt";
      status.textContent = r.data?.fout ?? "Opslaan is niet gelukt. Probeer het opnieuw.";
      return;
    }
    mijn.set(o.id, { oplossing: o.id, scores, toelichting });
    belangen.delete(o.id);
    volgende(`Opgeslagen: ${o.naam}, ${toonCijfer(gewogenCijfer(scores))}.`);
  });

  form.querySelector("[data-belang]").addEventListener("click", async () => {
    if (!confirm(`Je trekt je terug voor ${o.naam}. Een eerdere beoordeling van jou voor deze oplossing vervalt. Doorgaan?`)) return;
    const r = await api("/jury/beoordeling", { oplossing: o.id, belang: true });
    if (!r.ok) {
      status.className = "formstatus mislukt";
      status.textContent = r.data?.fout ?? "Dat is niet gelukt. Probeer het opnieuw.";
      return;
    }
    mijn.delete(o.id);
    belangen.add(o.id);
    volgende(`Je hebt je teruggetrokken voor ${o.naam}.`);
  });
  toonRij();
  if (matchMedia("(max-width: 900px)").matches) paneel.scrollIntoView({ block: "start" });
}

// Na opslaan door naar de volgende open oplossing.
function volgende(bericht) {
  const open = oplossingen.find((o) => standVan(o) === "open");
  if (tab === "open" && open) {
    toonPaneel(open);
    paneel.querySelector(".beoordeel-lijf").insertAdjacentHTML("afterbegin", `<p class="formstatus gelukt" role="status">${esc(bericht)}</p>`);
  } else {
    gekozen = null;
    paneel.innerHTML = `<p class="leeg">${esc(bericht)}</p>`;
    toonRij();
  }
}

async function start() {
  const ik = await api("/ik");
  if (ik.ok && ik.data.rol === "beheer") {
    location.replace("/beheer/");
    return;
  }
  if (!ik.ok || ik.data.rol !== "jury") {
    onthoudLogin(false);
    inlog.hidden = false;
    werk.hidden = true;
    return;
  }
  onthoudLogin(true);
  inlog.hidden = true;
  werk.hidden = false;
  document.title = "Mijn jurywerk · Meesterproef";
  document.querySelector("[data-account]").textContent = "Mijn jurywerk";
  document.querySelector("#jury-naam").textContent = ik.data.jurylid.naam;
  const [data, mijnWerk] = await Promise.all([laadData(), api("/jury/werk")]);
  if (!mijnWerk.ok) {
    paneel.innerHTML = `<p class="melding">Je beoordelingen konden niet worden geladen. Ververs de pagina.</p>`;
    return;
  }
  oplossingen = data.oplossingen.slice().sort((a, b) => a.organisatie.localeCompare(b.organisatie, "nl") || a.naam.localeCompare(b.naam, "nl"));
  mijn = new Map(mijnWerk.data.mijn.map((b) => [b.oplossing, b]));
  belangen = new Set(mijnWerk.data.belangen);
  toonRij();
}

document.querySelector("#inlogformulier").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const status = form.querySelector(".formstatus");
  if (!form.reportValidity()) return;
  status.className = "formstatus";
  status.textContent = "Bezig met inloggen.";
  const r = await api("/login", { code: leesFormulier(form).code.trim() });
  if (!r.ok) {
    status.className = "formstatus mislukt";
    status.textContent = r.data?.fout ?? "Inloggen is niet gelukt. Probeer het later opnieuw.";
    return;
  }
  status.textContent = "";
  form.reset();
  start();
});

document.querySelector("#uitloggen").addEventListener("click", async () => {
  await api("/uitloggen", {});
  onthoudLogin(false);
  location.reload();
});

rij.addEventListener("click", (e) => {
  const knop = e.target.closest("button[data-id]");
  if (knop) toonPaneel(oplossingen.find((o) => o.id === knop.dataset.id));
});
document.querySelector("#rij-zoek").addEventListener("input", toonRij);
for (const knop of document.querySelectorAll("[data-rij]")) {
  knop.addEventListener("click", () => {
    tab = knop.dataset.rij;
    for (const k of document.querySelectorAll("[data-rij]")) k.setAttribute("aria-selected", String(k === knop));
    toonRij();
  });
}

start();
