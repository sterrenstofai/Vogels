// Tekst-naar-HTML voor kaarten en detailpagina's. Geen DOM en geen fetch,
// zodat het bouwscript en de browser precies dezelfde opmaak maken.
import { poster, kleuren } from "./poster.js";
import { CRITERIA, MIN_JURYLEDEN, bewijs, toonCijfer } from "./score.js";

export function esc(tekst) {
  return String(tekst ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}

export function adresVan(o, basis = "") {
  return o.los ? `${basis}/oplossingen/bekijk/?id=${encodeURIComponent(o.id)}` : `${basis}/oplossingen/${o.id}/`;
}

export function datumTekst(iso, kort = false) {
  if (!iso) return "";
  if (/^\d{4}$/.test(iso)) return iso;
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: kort ? "short" : "long", year: "numeric" });
}

// Donkere of lichte tekst op een gekleurd vlak, naar gelang de helderheid.
export function inktOp(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? "#121110" : "#ffffff";
}

export function vlakStijl(o) {
  const k = kleuren(o.sector);
  return `--vlak:${k.bg};--op-vlak:${inktOp(k.bg)};--vlak-accent:${k.accent};--vlak-vorm:${k.vorm}`;
}

// Lange namen krijgen een kleinere letter, zodat ze niet midden in een woord breken.
export function lengteKlas(naam) {
  const langste = Math.max(...String(naam).split(/[\s-]+/).map((w) => w.length));
  return String(naam).length > 22 || langste > 13 ? "naam-erg-lang" : String(naam).length > 11 ? "naam-lang" : "";
}

export function initialen(naam) {
  const delen = String(naam).trim().split(/\s+/).filter((d) => /^[\p{L}]/u.test(d));
  return ((delen[0]?.[0] ?? "") + (delen.length > 1 ? delen[delen.length - 1][0] : "")).toUpperCase();
}

// Het etiket dat zegt waar een oplossing staat in het traject.
export function etiket(o) {
  const d = o.oordeel;
  if (d?.compleet) {
    const naam = d.onderscheiding ? d.onderscheiding.naam : "Beoordeeld";
    return `<span class="etiket etiket-${d.onderscheiding?.id ?? "beoordeeld"}">${esc(naam)}</span>`;
  }
  if (d?.aantal > 0) return `<span class="etiket etiket-loopt">Bij de jury · ${d.aantal} van ${MIN_JURYLEDEN}</span>`;
  return `<span class="etiket">Genomineerd</span>`;
}

export function bewijsmeter(o) {
  const b = bewijs(o);
  const stippen = [1, 2, 3].map((n) => `<i${n <= b.niveau ? ' class="aan"' : ""}></i>`).join("");
  return `<span class="bewijs" title="${esc(b.uitleg)}"><span class="bewijs-stippen" aria-hidden="true">${stippen}</span>${esc(b.naam)}</span>`;
}

export function kaart(o, basis = "") {
  const d = o.oordeel;
  const cijfer = d?.compleet ? `<span class="kaart-cijfer kaart-cijfer-${d.onderscheiding?.id ?? "beoordeeld"}" aria-label="Eindcijfer ${toonCijfer(d.eindcijfer)}">${toonCijfer(d.eindcijfer)}</span>` : "";
  return `<article class="kaart">
    <a class="kaart-link" href="${esc(adresVan(o, basis))}">
      <div class="kaart-beeld">${poster(o)}${cijfer}</div>
      <div class="kaart-lijf">
        <h3>${esc(o.naam)}</h3>
        <p class="kaart-org">${esc(o.organisatie)}</p>
        <div class="kaart-voet">${etiket(o)}<span class="meta">${esc(o.sector)}</span></div>
      </div>
    </a>
  </article>`;
}

function veiligAdres(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

const HERKOMST = {
  onafhankelijk: "Onafhankelijk vastgesteld",
  organisatie: "Cijfer van de organisatie zelf",
  leverancier: "Cijfer van de leverancier",
};

// Het jurypaneel zonder cijfers: de vijf criteria met een lege plek.
export function juryLeeg(o) {
  const d = o.oordeel;
  const waarom =
    d?.aantal > 0
      ? `${d.aantal} van de minimaal ${MIN_JURYLEDEN} juryleden hebben hun cijfers gegeven. Het eindcijfer volgt zodra de beoordeling compleet is.`
      : o.herkomst === "inzending"
        ? "Deze inzending wacht op beoordeling door de jury."
        : "Door de redactie genomineerd op basis van openbare bronnen. De jury heeft deze oplossing nog niet beoordeeld.";
  return `<div class="jury-kop"><h2>Oordeel van de jury</h2><span class="jury-eind jury-eind-leeg" aria-label="Nog geen eindcijfer">–</span></div>
    <p class="jury-waarom">${esc(waarom)}</p>
    <ul class="jury-criteria">${CRITERIA.map((c) => `<li><span>${esc(c.naam)}<small>${c.gewicht}%</small></span><b class="leeg">–</b></li>`).join("")}</ul>`;
}

export function juryVol(o, jury) {
  const d = o.oordeel;
  const namen = new Map(jury.map((j) => [j.id, j]));
  const rijen = d.stemmen
    .slice()
    .sort((a, b) => b.cijfer - a.cijfer)
    .map((s) => {
      const lid = namen.get(s.jurylid);
      const naam = lid?.naam ?? "Jurylid";
      return `<li class="stem">
        <span class="avatar" aria-hidden="true">${esc(initialen(naam))}</span>
        <span class="stem-naam">${esc(naam)}${lid?.functie ? `<small>${esc(lid.functie)}</small>` : ""}</span>
        <span class="stem-cijfers">${CRITERIA.map((c) => `<i title="${esc(c.naam)}">${s.scores[c.id]}</i>`).join("")}</span>
        <b>${toonCijfer(s.cijfer)}</b>
        ${s.toelichting ? `<p>${esc(s.toelichting)}</p>` : ""}
      </li>`;
    })
    .join("");
  return `<div class="jury-kop"><h2>Oordeel van de jury</h2><span class="jury-eind jury-eind-${d.onderscheiding?.id ?? "beoordeeld"}">${toonCijfer(d.eindcijfer)}</span></div>
    <p class="jury-waarom"><b>${esc(d.onderscheiding?.naam ?? "Beoordeeld")}</b> · gemiddelde van ${d.aantal} juryleden</p>
    <ul class="jury-criteria">${CRITERIA.map(
      (c) => `<li><span>${esc(c.naam)}<small>${c.gewicht}%</small></span><span class="balk" aria-hidden="true"><i style="width:${d.perCriterium[c.id] * 10}%"></i></span><b>${toonCijfer(d.perCriterium[c.id])}</b></li>`
    ).join("")}</ul>
    <div class="stem-kop"><span>Per jurylid</span><span class="stem-cijfers" aria-hidden="true">${CRITERIA.map((c) => `<i title="${esc(c.naam)}">${esc(c.naam.slice(0, 3))}</i>`).join("")}</span><span>Cijfer</span></div>
    <ul class="stemmen">${rijen}</ul>`;
}

export function detailHTML(o, basis = "") {
  const bronnen = (o.bronnen ?? [])
    .map((b, i) => {
      const adres = veiligAdres(b.url);
      const titel = adres ? `<a href="${esc(adres)}" rel="noopener nofollow">${esc(b.titel)}</a>` : esc(b.titel);
      return `<li><span class="bron-nr">${String(i + 1).padStart(2, "0")}</span><span>${titel}<small>${esc([b.uitgever, datumTekst(b.datum)].filter(Boolean).join(" · "))}</small></span></li>`;
    })
    .join("");
  const feiten = [
    ["Organisatie", o.organisatie],
    ["Sector", o.sector],
    ["Soort", o.type],
    ["Status", o.sinds ? `${o.status}, sinds ${o.sinds}` : o.status],
    ["Gebouwd met", (o.gebouwdMet ?? []).join(", ")],
    ["Genomineerd", `${datumTekst(o.toegevoegd)}${o.herkomst === "inzending" ? ", ingezonden" : ", door de redactie"}`],
  ]
    .filter(([, w]) => w)
    .map(([n, w]) => `<div><dt>${n}</dt><dd>${esc(w)}</dd></div>`)
    .join("");
  const eersteBron = veiligAdres(o.bronnen?.[0]?.url);

  return `<header class="detail-held" style="${vlakStijl(o)}">
    <div class="breed">
      <p class="kruimel"><a href="${basis}/oplossingen/">Oplossingen</a><span aria-hidden="true">/</span><a href="${basis}/oplossingen/?sector=${encodeURIComponent(o.sector)}">${esc(o.sector)}</a></p>
      <h1 class="${lengteKlas(o.naam)}">${esc(o.naam)}</h1>
      <p class="detail-org">${esc(o.organisatie)}</p>
    </div>
  </header>
  <div class="breed podium">
    <div class="podium-beeld">
      ${poster(o)}
      <div class="podium-balk">
        <span data-etiket>${etiket(o)}</span>
        <span class="podium-feit">${esc(o.type)}</span>
        <span class="podium-feit">${esc(o.status)}</span>
        ${eersteBron ? `<a class="knop knop-klein" href="${esc(eersteBron)}" rel="noopener nofollow">Lees de bron</a>` : ""}
      </div>
    </div>
    <aside class="jurypaneel" id="jurypaneel" aria-live="polite">${juryLeeg(o)}</aside>
  </div>
  <div class="breed detail-lijf">
    <div class="detail-tekst">
      <p class="intro">${esc(o.kort)}</p>
      <p>${esc(o.beschrijving)}</p>
      ${o.opvallend ? `<h2>Waarom dit opvalt</h2><p>${esc(o.opvallend)}</p>` : ""}
      <h2>Resultaat</h2>
      ${
        o.resultaat
          ? `<blockquote class="resultaat"><p>${esc(o.resultaat.tekst)}</p><footer>${esc(HERKOMST[o.resultaat.herkomst] ?? "")}</footer></blockquote>`
          : `<p class="gedempt">In de bronnen staat geen gemeten resultaat.</p>`
      }
      <p class="bewijs-regel">${bewijsmeter(o)}<a href="${basis}/werkwijze/#bewijs">Wat betekent dit?</a></p>
      <h2>Bronnen</h2>
      <ol class="bronnen">${bronnen}</ol>
      ${o.gecontroleerd ? `<p class="voetnoot">Bronnen gelezen op ${esc(datumTekst(o.gecontroleerd))}. De beschrijving is van de redactie.</p>` : ""}
    </div>
    <aside class="detail-zij">
      <dl class="feiten">${feiten}</dl>
      <button class="knop knop-lijn knop-vol" type="button" data-deel>Kopieer de link</button>
      <div class="kader">
        <h2>Is dit jullie oplossing?</h2>
        <p>Vul de beschrijving aan, verbeter een fout of laat de vermelding weghalen.</p>
        <a class="pijl" href="/inzenden/?soort=aanvulling&amp;over=${encodeURIComponent(o.id)}">Stuur een aanvulling</a>
      </div>
    </aside>
  </div>`;
}
