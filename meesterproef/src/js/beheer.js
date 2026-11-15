import { laadData, menu, api, leesFormulier, onthoudLogin } from "./kern.js";
import { esc, datumTekst, adresVan } from "./weergave.js";

menu();

const deel = document.querySelector("#deel");
let staat = null; // het overzicht van de achterkant
let selectie = []; // alle oplossingen die de site kent
let tab = "inzendingen";
let open = { publiceer: null, juryVooraf: null, code: null };

const optie = (lijst, gekozen) => lijst.map((x) => `<option${x === gekozen ? " selected" : ""}>${esc(x)}</option>`).join("");
const uitLijst = (id) => [...document.querySelectorAll(`#${id} option`)].map((o) => o.value);
const veld = (naam, waarde) => (waarde ? `<div><dt>${naam}</dt><dd>${esc(waarde)}</dd></div>` : "");
const jaar = (tekst) => String(tekst ?? "").match(/\b(19|20)\d{2}\b/)?.[0] ?? "";

function publiceerFormulier(i) {
  const bronnen = String(i.bronnen ?? "").split(/\n+/).map((r) => r.trim()).filter(Boolean).map((url) => `Titel van de bron | Uitgever | ${url} |`).join("\n");
  return `<form class="formulier beheer-formulier" data-publiceer="${esc(i.id)}">
    <h2>Publiceer als oplossing</h2>
    <p class="voetnoot">Schrijf de beschrijving zelf, op basis van de inzending en de bronnen. Na publiceren staat de oplossing direct in de selectie.</p>
    <div class="twee"><label>Naam <input name="naam" required value="${esc(i.oplossing)}" maxlength="120"></label><label>Organisatie <input name="organisatie" required value="${esc(i.organisatie)}" maxlength="120"></label></div>
    <div class="twee"><label>Sector <select name="sector" required>${optie(uitLijst("sectoren-lijst"), i.sector)}</select></label><label>Soort <select name="type" required>${optie(uitLijst("types-lijst"), i.type)}</select></label></div>
    <div class="twee"><label>Status <select name="status">${optie(["In productie", "Pilot"], i.statusOplossing)}</select></label><label>In gebruik sinds <small>Jaartal, of leeg</small><input name="sinds" inputmode="numeric" pattern="\\d{4}" value="${esc(jaar(i.sinds))}"></label></div>
    <label>Gebouwd met <small>Namen, gescheiden door komma's</small><input name="gebouwdMet" value="${esc(i.gebouwdDoor)}"></label>
    <label>Kort <small>Eén zin, hooguit 140 tekens</small><input name="kort" required maxlength="140"></label>
    <label>Beschrijving <textarea name="beschrijving" required>${esc(i.beschrijving)}</textarea></label>
    <label>Waarom dit opvalt <textarea name="opvallend"></textarea></label>
    <div class="twee"><label>Resultaat <small>Leeg als er geen cijfer is</small><textarea name="resultaat">${esc(i.resultaat)}</textarea></label>
    <label>Wie stelde het cijfer vast? <select name="herkomst">${["organisatie", "leverancier", "onafhankelijk"].map((h) => `<option${h === i.herkomstCijfer ? " selected" : ""}>${h}</option>`).join("")}</select></label></div>
    <label>Bronnen <small>Eén per regel: titel | uitgever | https-adres | datum (JJJJ-MM-DD of leeg)</small><textarea name="bronnen" required>${esc(bronnen)}</textarea></label>
    <div class="formvoet"><button class="knop knop-zegel" type="submit">Publiceer</button><button class="tekstknop" type="button" data-sluit>Annuleer</button><p class="formstatus" role="status"></p></div>
  </form>`;
}

function inzendingen() {
  const lijst = staat.inzendingen.slice().sort((a, b) => String(b.ontvangen).localeCompare(String(a.ontvangen)));
  if (!lijst.length) return `<p class="leeg">Er zijn nog geen inzendingen.</p>`;
  return `<div class="beheer-lijst">${lijst
    .map(
      (i) => `<article class="beheer-item${i.status === "nieuw" ? "" : " afgehandeld"}">
      <header><h3>${esc(i.oplossing)}</h3><span class="etiket${i.status === "nieuw" ? " etiket-loopt" : ""}">${esc(i.status)}</span><span class="meta">${esc(i.nummer)} · ${esc(i.soort)} · ${esc(datumTekst(i.ontvangen))}</span></header>
      <dl>${veld("Organisatie", i.organisatie)}${veld("Over vermelding", i.verwijzing)}${veld("Gebouwd door", i.gebouwdDoor)}${veld("Sector en soort", [i.sector, i.type, i.statusOplossing, i.sinds].filter(Boolean).join(" · "))}${veld("Beschrijving", i.beschrijving)}${veld("Resultaat", i.resultaat)}${veld("Cijfer van", i.herkomstCijfer)}${veld("Demo", i.demo)}${veld("Bronnen", i.bronnen)}${veld("Contact", `${i.naam}, ${i.rol} · ${i.email}`)}${veld("Gepubliceerd als", i.gepubliceerdAls)}</dl>
      ${
        i.status === "nieuw"
          ? `<div class="beheer-acties">${i.soort === "inzending" ? `<button class="knop knop-klein" type="button" data-open-publiceer="${esc(i.id)}">Publiceer</button>` : ""}${
              i.soort === "aanvulling" ? `<button class="knop knop-klein" type="button" data-afgehandeld="inzending" data-id="${esc(i.id)}">Afgehandeld</button>` : `<button class="knop knop-lijn knop-klein" type="button" data-inzending="wijsaf" data-id="${esc(i.id)}">Wijs af</button>`
            }<button class="tekstknop" type="button" data-inzending="archiveer" data-id="${esc(i.id)}">Archiveer</button></div>`
          : ""
      }
      ${open.publiceer === i.id ? publiceerFormulier(i) : ""}
    </article>`
    )
    .join("")}</div>`;
}

function jury() {
  const v = open.juryVooraf ?? {};
  const aantal = new Map();
  for (const b of staat.beoordelingen) aantal.set(b.jurylid, (aantal.get(b.jurylid) ?? 0) + 1);
  return `<form class="formulier beheer-formulier" id="nieuw-jurylid">
      <h2>Nieuw jurylid</h2>
      <div class="twee"><label>Naam <input name="naam" required maxlength="100" value="${esc(v.naam)}"></label><label>Functie <input name="functie" maxlength="120" value="${esc(v.functie)}"></label></div>
      <div class="twee"><label>Organisatie <input name="organisatie" maxlength="120" value="${esc(v.organisatie)}"></label><label>Vakgebied <input name="expertise" maxlength="120" value="${esc(v.expertise)}"></label></div>
      <label>Profiel <small>LinkedIn of eigen site</small><input name="profiel" type="url" placeholder="https://" value="${esc(v.profiel)}"></label>
      <label>Over <small>Eén of twee zinnen voor de jurypagina</small><textarea name="over" maxlength="600"></textarea></label>
      <div class="formvoet"><button class="knop" type="submit">Voeg toe en maak een inlogcode</button><p class="formstatus" role="status"></p></div>
    </form>
    ${
      open.code
        ? `<div class="codevak" role="status"><p>Inlogcode voor ${esc(open.code.naam)}. Deze code is alleen nu te zien; geef haar persoonlijk door.</p><code>${esc(open.code.code)}</code><p>Inloggen kan op ${esc(location.origin)}/account/</p></div>`
        : ""
    }
    <div class="beheer-lijst" style="margin-top:16px">${
      staat.jury.length
        ? staat.jury
            .map(
              (j) => `<article class="beheer-item${j.actief === false ? " afgehandeld" : ""}">
          <header><h3>${esc(j.naam)}</h3><span class="etiket${j.actief === false ? "" : " etiket-loopt"}">${j.actief === false ? "inactief" : "actief"}</span><span class="meta">${aantal.get(j.id) ?? 0} ${aantal.get(j.id) === 1 ? "beoordeling" : "beoordelingen"} · laatste login ${j.laatsteLogin ? esc(datumTekst(j.laatsteLogin)) : "nooit"}</span></header>
          <dl>${veld("Functie", [j.functie, j.organisatie].filter(Boolean).join(", "))}${veld("Vakgebied", j.expertise)}${veld("Over", j.over)}${veld("Profiel", j.profiel)}</dl>
          <div class="beheer-acties"><button class="knop knop-lijn knop-klein" type="button" data-code="${esc(j.id)}">Nieuwe inlogcode</button><button class="tekstknop" type="button" data-actief="${j.actief === false}" data-id="${esc(j.id)}">${j.actief === false ? "Zet actief" : "Zet inactief"}</button></div>
        </article>`
            )
            .join("")
        : `<p class="leeg">Er zijn nog geen juryleden.</p>`
    }</div>`;
}

function berichtenlijst(soort) {
  const lijst = staat[soort === "aanmelding" ? "aanmeldingen" : "berichten"].slice().sort((a, b) => String(b.ontvangen).localeCompare(String(a.ontvangen)));
  if (!lijst.length) return `<p class="leeg">Niets binnengekomen.</p>`;
  return `<div class="beheer-lijst">${lijst
    .map(
      (m) => `<article class="beheer-item${m.status === "afgehandeld" ? " afgehandeld" : ""}">
      <header><h3>${esc(m.naam)}</h3><span class="meta">${esc(datumTekst(m.ontvangen))} · ${esc(m.email)}</span></header>
      <dl>${veld("Functie", [m.functie, m.organisatie].filter(Boolean).join(", "))}${veld("Vakgebied", m.expertise)}${veld("Profiel", m.profiel)}${veld("Ervaring", m.ervaring)}${veld("Onderwerp", m.onderwerp)}${veld("Bericht", m.bericht)}</dl>
      ${
        m.status === "afgehandeld"
          ? ""
          : `<div class="beheer-acties">${soort === "aanmelding" ? `<button class="knop knop-klein" type="button" data-maak-jurylid="${esc(m.id)}">Maak jurylid</button>` : ""}<button class="knop knop-lijn knop-klein" type="button" data-afgehandeld="${soort}" data-id="${esc(m.id)}">Afgehandeld</button></div>`
      }
    </article>`
    )
    .join("")}</div>`;
}

function oplossingenlijst() {
  const verborgen = new Set(staat.verborgen);
  const alle = [...selectie, ...staat.gepubliceerd.filter((g) => !selectie.some((o) => o.id === g.id))].sort((a, b) => a.organisatie.localeCompare(b.organisatie, "nl"));
  return `<p class="voetnoot" style="margin-bottom:12px">Een verborgen oplossing verdwijnt direct van de site, met haar cijfers. Gebruik dit bij een verzoek om verwijdering.</p>
    <div class="tabelrol"><table class="tabel"><thead><tr><th>Oplossing</th><th>Organisatie</th><th>Herkomst</th><th></th></tr></thead><tbody>${alle
      .map((o) => `<tr><td><a href="${esc(adresVan(selectie.includes(o) ? o : { ...o, los: true }))}">${esc(o.naam)}</a></td><td>${esc(o.organisatie)}</td><td>${esc(o.herkomst)}</td><td class="getal"><button class="tekstknop" type="button" data-verberg="${!verborgen.has(o.id)}" data-id="${esc(o.id)}">${verborgen.has(o.id) ? "Zet terug" : "Verberg"}</button></td></tr>`)
      .join("")}</tbody></table></div>`;
}

function toon() {
  const nieuw = (lijst) => lijst.filter((x) => (x.status ?? "nieuw") === "nieuw").length || "";
  document.querySelector('[data-tel="inzendingen"]').textContent = nieuw(staat.inzendingen);
  document.querySelector('[data-tel="aanmeldingen"]').textContent = nieuw(staat.aanmeldingen);
  document.querySelector('[data-tel="berichten"]').textContent = nieuw(staat.berichten);
  for (const k of document.querySelectorAll("[data-deel]")) k.setAttribute("aria-selected", String(k.dataset.deel === tab));
  deel.innerHTML = { inzendingen, jury, aanmeldingen: () => berichtenlijst("aanmelding"), berichten: () => berichtenlijst("bericht"), oplossingen: oplossingenlijst }[tab]();
}

async function ververs() {
  const r = await api("/beheer/overzicht");
  if (r.ok) staat = r.data;
  toon();
}

// Elke actie: uitvoeren, eerlijk melden als het mislukt, daarna verversen.
async function doe(pad, body, bijFout) {
  const r = await api(pad, body);
  if (!r.ok) {
    (bijFout ?? alert)(r.data?.fout ?? "Dat is niet gelukt. Probeer het opnieuw.");
    return null;
  }
  await ververs();
  return r.data;
}

deel.addEventListener("click", async (e) => {
  const k = e.target.closest("button");
  if (!k) return;
  const d = k.dataset;
  if (d.openPubliceer) (open.publiceer = d.openPubliceer), toon();
  else if ("sluit" in d) (open.publiceer = null), toon();
  else if (d.inzending) {
    if (confirm(d.inzending === "wijsaf" ? "Deze inzending afwijzen?" : "Deze inzending archiveren?")) await doe("/beheer/inzending", { id: d.id, actie: d.inzending });
  } else if (d.afgehandeld) await doe("/beheer/afgehandeld", { soort: d.afgehandeld, id: d.id });
  else if (d.verberg) {
    if (d.verberg === "false" || confirm("Deze oplossing van de site halen?")) await doe("/beheer/verborgen", { id: d.id, verborgen: d.verberg === "true" });
  } else if (d.actief) await doe("/beheer/jurylid", { id: d.id, actief: d.actief === "true" });
  else if (d.code) {
    const lid = staat.jury.find((j) => j.id === d.code);
    if (!confirm(`Een nieuwe code maken voor ${lid.naam}? De oude code werkt daarna niet meer.`)) return;
    const r = await api("/beheer/jurylid/code", { id: d.code });
    if (r.ok) open.code = { naam: lid.naam, code: r.data.code };
    else alert(r.data?.fout ?? "Dat is niet gelukt.");
    toon();
  } else if (d.maakJurylid) {
    open.juryVooraf = staat.aanmeldingen.find((a) => a.id === d.maakJurylid);
    tab = "jury";
    toon();
    document.querySelector("#nieuw-jurylid").scrollIntoView({ block: "start" });
  }
});

deel.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const g = leesFormulier(form);
  const status = form.querySelector(".formstatus");
  const meld = (tekst) => ((status.className = "formstatus mislukt"), (status.textContent = tekst));
  if (form.id === "nieuw-jurylid") {
    const naam = g.naam;
    const r = await api("/beheer/jurylid", { ...g, actief: true });
    if (!r.ok) return meld(r.data?.fout ?? "Toevoegen is niet gelukt.");
    open.code = { naam, code: r.data.code };
    const aanmelding = open.juryVooraf;
    open.juryVooraf = null;
    if (aanmelding) await api("/beheer/afgehandeld", { soort: "aanmelding", id: aanmelding.id });
    await ververs();
  } else if (form.dataset.publiceer) {
    const bronnen = g.bronnen.split(/\n+/).map((r) => r.trim()).filter(Boolean).map((regel) => {
      const [titel, uitgever, url, datum] = regel.split("|").map((x) => x.trim());
      return { titel, uitgever: uitgever || "", url, datum: datum || null };
    });
    const oplossing = {
      naam: g.naam,
      organisatie: g.organisatie,
      gebouwdMet: g.gebouwdMet.split(",").map((x) => x.trim()).filter(Boolean),
      sector: g.sector,
      type: g.type,
      status: g.status,
      sinds: g.sinds || null,
      kort: g.kort,
      beschrijving: g.beschrijving,
      opvallend: g.opvallend,
      resultaat: g.resultaat.trim() ? { tekst: g.resultaat.trim(), herkomst: g.herkomst } : null,
      bronnen,
    };
    const klaar = await doe("/beheer/inzending", { id: form.dataset.publiceer, actie: "publiceer", oplossing }, meld);
    if (klaar) open.publiceer = null, toon();
  }
});

for (const k of document.querySelectorAll("[data-deel]")) k.addEventListener("click", () => ((tab = k.dataset.deel), toon()));
document.querySelector("#uitloggen").addEventListener("click", async () => {
  await api("/uitloggen", {});
  onthoudLogin(false);
  location.href = "/account/";
});

const ik = await api("/ik");
if (!ik.ok || ik.data.rol !== "beheer") {
  document.querySelector("#geen-toegang").hidden = false;
  document.querySelector("#uitloggen").hidden = true;
} else {
  onthoudLogin(true);
  document.querySelector("#beheer-lijf").hidden = false;
  selectie = (await laadData()).oplossingen.filter((o) => !o.los);
  await ververs();
}
