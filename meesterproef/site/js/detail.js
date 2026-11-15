import { laadData, toonFout, kaart, beeld, etiket, esc, datumTekst, menu } from "./kern.js";
import { CRITERIA, MIN_JURYLEDEN, toonCijfer } from "./score.js";

menu();

const doel = document.querySelector("#oplossing");

const herkomstTekst = {
  onafhankelijk: "Onafhankelijk vastgesteld",
  organisatie: "Cijfer van de organisatie zelf",
  leverancier: "Cijfer van de leverancier",
};

function veiligAdres(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

function juryHTML(o, jury) {
  const d = o.oordeel;
  if (!d || d.aantal === 0) {
    const waarom =
      o.herkomst === "inzending"
        ? "Deze inzending wacht op beoordeling door de jury."
        : "Deze oplossing is door de redactie geselecteerd uit openbare bronnen. Ze is niet ingezonden en nog niet door de jury beoordeeld.";
    return `<p class="leeg">${waarom}</p>`;
  }
  if (!d.compleet) {
    return `<p class="leeg">${d.aantal} van de minimaal ${MIN_JURYLEDEN} juryleden hebben hun cijfers gegeven. Het eindcijfer volgt zodra de beoordeling compleet is.</p>`;
  }
  const namen = new Map(jury.map((j) => [j.id, j.naam]));
  const balken = CRITERIA.map((c) => {
    const cijfer = d.perCriterium[c.id];
    return `<li><span class="balk-naam">${esc(c.naam)} <small>${c.gewicht}%</small></span>
      <span class="balk" role="img" aria-label="${toonCijfer(cijfer)} van 10"><i style="width:${cijfer * 10}%"></i></span>
      <b>${toonCijfer(cijfer)}</b></li>`;
  }).join("");
  const stemmen = d.stemmen
    .map(
      (s) => `<li><span>${esc(namen.get(s.jurylid) ?? "Jurylid")}</span><b>${toonCijfer(s.cijfer)}</b>${s.toelichting ? `<p>${esc(s.toelichting)}</p>` : ""}</li>`
    )
    .join("");
  return `<div class="eindcijfer"><b>${toonCijfer(d.eindcijfer)}</b><span>${esc(d.onderscheiding?.naam ?? "Beoordeeld")}<small>gemiddelde van ${d.aantal} juryleden</small></span></div>
    <ul class="balken">${balken}</ul>
    <h3>Cijfers per jurylid</h3>
    <ul class="stemmen">${stemmen}</ul>`;
}

function paginaHTML(o, jury, verwant) {
  const bronnen = (o.bronnen ?? [])
    .map((b) => {
      const adres = veiligAdres(b.url);
      const titel = adres ? `<a href="${esc(adres)}" rel="noopener nofollow">${esc(b.titel)}</a>` : esc(b.titel);
      return `<li>${titel}<small>${esc([b.uitgever, datumTekst(b.datum)].filter(Boolean).join(" · "))}</small></li>`;
    })
    .join("");
  const feiten = [
    ["Organisatie", o.organisatie],
    ["Sector", o.sector],
    ["Soort oplossing", o.type],
    ["Status", o.sinds ? `${o.status}, sinds ${o.sinds}` : o.status],
    ["Gebouwd met", (o.gebouwdMet ?? []).join(", ")],
    ["In de selectie sinds", datumTekst(o.toegevoegd)],
  ]
    .filter(([, waarde]) => waarde)
    .map(([naam, waarde]) => `<div><dt>${naam}</dt><dd>${esc(waarde)}</dd></div>`)
    .join("");

  return `<header class="detail-kop">
      <p class="kruimel"><a href="/oplossingen.html">Oplossingen</a> / <a href="/oplossingen.html?sector=${encodeURIComponent(o.sector)}">${esc(o.sector)}</a></p>
      <h1>${esc(o.naam)}</h1>
      <p class="detail-org">${esc(o.organisatie)} ${etiket(o)}</p>
    </header>
    ${beeld(o)}
    <div class="detail-lijf">
      <div class="detail-tekst">
        <p class="intro">${esc(o.kort)}</p>
        <p>${esc(o.beschrijving)}</p>
        ${o.opvallend ? `<h2>Waarom dit opvalt</h2><p>${esc(o.opvallend)}</p>` : ""}
        ${
          o.resultaat
            ? `<h2>Resultaat</h2><p class="resultaat"><span>${esc(o.resultaat.tekst)}</span><small>${esc(herkomstTekst[o.resultaat.herkomst] ?? "")}</small></p>`
            : ""
        }
        <h2>Oordeel van de jury</h2>
        ${juryHTML(o, jury)}
        <h2>Bronnen</h2>
        <ul class="bronnen">${bronnen}</ul>
        ${o.gecontroleerd ? `<p class="voetnoot">Bronnen gelezen op ${esc(datumTekst(o.gecontroleerd))}. De beschrijving is van de redactie.</p>` : ""}
      </div>
      <aside class="detail-zij">
        <dl class="feiten">${feiten}</dl>
        <div class="kader">
          <h2>Is dit jullie oplossing?</h2>
          <p>Vul de beschrijving aan, verbeter een fout of laat de vermelding weghalen.</p>
          <a class="knop knop-lijn" href="/inzenden.html?soort=aanvulling&amp;over=${encodeURIComponent(o.id)}">Stuur een aanvulling</a>
        </div>
      </aside>
    </div>
    ${verwant.length ? `<section class="blok"><div class="blok-kop"><h2>Meer in ${esc(o.sector)}</h2><a class="pijl" href="/oplossingen.html?sector=${encodeURIComponent(o.sector)}">Alles in deze sector</a></div><div class="raster">${verwant.map(kaart).join("")}</div></section>` : ""}`;
}

try {
  const { oplossingen, jury } = await laadData();
  const id = new URLSearchParams(location.search).get("id");
  const o = oplossingen.find((x) => x.id === id);
  if (!o) {
    document.title = "Niet gevonden · Meesterproef";
    doel.innerHTML = `<div class="melding"><h1>Deze oplossing staat niet in de selectie</h1><p><a href="/oplossingen.html">Bekijk alle oplossingen</a></p></div>`;
  } else {
    document.title = `${o.naam} van ${o.organisatie} · Meesterproef`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", o.kort);
    const verwant = oplossingen.filter((x) => x.sector === o.sector && x !== o).slice(0, 3);
    doel.innerHTML = paginaHTML(o, jury, verwant);
  }
} catch (fout) {
  toonFout(doel, fout);
}
