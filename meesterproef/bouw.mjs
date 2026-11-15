// Bouwt de site in dist/. Gebruik: node bouw.mjs
// Er zijn twee uitgaven: de echte site, en een voorbeeldomgeving onder
// /voorbeeld/ met verzonnen oplossingen, juryleden en cijfers. Die laat
// zien hoe het platform eruitziet zodra de jury draait, zonder dat echte
// organisaties cijfers krijgen die niemand heeft gegeven.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CRITERIA, ONDERSCHEIDINGEN, MIN_JURYLEDEN, BEWIJS } from "./src/js/score.js";
import { detailHTML, esc } from "./src/js/weergave.js";
import { PAGINAS, SECTOREN, TYPES } from "./paginas.mjs";

const hier = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(hier, "src");
const DIST = path.join(hier, "dist");
const ADRES = (process.env.URL || "https://meesterproef.example").replace(/\/$/, "");

const ZEGEL = '<svg class="zegel" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="13" fill="currentColor"/><path d="M6.5 18V8.5l6.5 6 6.5-6V18" fill="none" stroke="var(--zegel-inkt,#fff)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';

const MENU = [
  ["oplossingen", "Oplossingen"],
  ["winnaars", "Winnaars"],
  ["ranglijst", "Ranglijst"],
  ["jury", "Jury"],
  ["werkwijze", "Werkwijze"],
];

function schrijf(bestand, inhoud) {
  fs.mkdirSync(path.dirname(bestand), { recursive: true });
  fs.writeFileSync(bestand, inhoud);
}

function opmaak({ basis, voorbeeld, titel, beschrijving, pad, script, inhoud, actief = "", lijf = "", extraKop = "", index = true }) {
  // In de voorbeeldomgeving bestaan alleen de kijkpagina's; de rest
  // verwijst naar de echte site.
  const b = (deel) => (voorbeeld && !["oplossingen", "winnaars", "ranglijst", "jury", ""].includes(deel) ? "" : basis);
  const canoniek = `${ADRES}${basis}/${pad.replace(/index\.html$/, "")}`;
  return `<!doctype html>
<html lang="nl" data-basis="${basis}"${voorbeeld ? ' data-voorbeeld="ja"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschrijving)}">
${index && !voorbeeld ? `<link rel="canonical" href="${canoniek}">` : '<meta name="robots" content="noindex">'}
<meta property="og:site_name" content="Meesterproef">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschrijving)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${ADRES}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#121110">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/instrument-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/stijl.css">
${script ? `<script type="module" src="/js/${script}"></script>` : ""}${extraKop}
</head>
<body class="${lijf}">
<a class="skip" href="#inhoud">Naar de inhoud</a>
${voorbeeld ? `<p class="voorbeeldband"><b>Voorbeeldomgeving.</b> Alle oplossingen, juryleden en cijfers op deze pagina's zijn verzonnen, om te laten zien hoe het platform werkt. <a href="/">Naar de echte site</a></p>` : ""}
<header class="kop">
  <div class="kop-binnen">
    <a class="merk" href="${basis}/" aria-label="Meesterproef, naar de startpagina">${ZEGEL}<span>Meesterproef</span></a>
    <button class="menuknop" type="button" aria-expanded="false" aria-controls="hoofdmenu"><i aria-hidden="true"></i><span>Menu</span></button>
    <nav class="kop-nav" id="hoofdmenu" aria-label="Hoofdmenu">
      <ul class="menu">
        ${MENU.map(([deel, naam]) => `<li><a href="${b(deel)}/${deel}/"${actief === deel ? ' aria-current="page"' : ""}>${naam}</a></li>`).join("\n        ")}
      </ul>
      <div class="kop-acties">
        <a class="kop-login" href="/account/" data-account${actief === "account" ? ' aria-current="page"' : ""}>Inloggen</a>
        <a class="knop" href="/inzenden/">Inzenden</a>
      </div>
    </nav>
  </div>
</header>
<main id="inhoud">
${inhoud.trim()}
</main>
<footer class="voet">
  <div class="breed">
    <p class="voet-leus">AI die <em>werkt</em>,<br>beoordeeld door vakmensen.</p>
    <div class="voet-kolommen">
      <div>
        <h2>Ontdek</h2>
        <ul>
          <li><a href="${basis}/oplossingen/">Alle oplossingen</a></li>
          <li><a href="${basis}/winnaars/">Winnaars</a></li>
          <li><a href="${basis}/ranglijst/">Ranglijst</a></li>
          <li><a href="${basis}/jury/">Jury</a></li>
        </ul>
      </div>
      <div>
        <h2>Doe mee</h2>
        <ul>
          <li><a href="/inzenden/">Een oplossing inzenden</a></li>
          <li><a href="/inzenden/?soort=aanvulling">Een vermelding aanvullen of laten weghalen</a></li>
          <li><a href="/jury/#aanmelden">Jurylid worden</a></li>
          <li><a href="/account/">Inloggen voor juryleden</a></li>
        </ul>
      </div>
      <div>
        <h2>Meesterproef</h2>
        <ul>
          <li><a href="/werkwijze/">Werkwijze en criteria</a></li>
          <li><a href="/over/">Over ons</a></li>
          <li><a href="/contact/">Contact</a></li>
          <li><a href="/voorbeeld/">Voorbeeld met cijfers</a></li>
        </ul>
      </div>
    </div>
    <div class="voet-onder">
      <a class="merk" href="${basis}/">${ZEGEL}<span>Meesterproef</span></a>
      <p>Gestart in 2026. Een initiatief van Sterrenstof. Namen van organisaties en producten zijn van hun eigenaren; een vermelding betekent geen samenwerking.</p>
      <ul><li><a href="/privacy/">Privacy</a></li><li><a href="/voorwaarden/">Voorwaarden</a></li></ul>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function kopieer(van, naar) {
  fs.cpSync(van, naar, { recursive: true });
}

function bouwUitgave({ basis, voorbeeld, dataMap }) {
  const uit = path.join(DIST, basis);
  const oplossingen = JSON.parse(fs.readFileSync(path.join(dataMap, "oplossingen.json"), "utf8"));
  kopieer(dataMap, path.join(uit, "data"));
  const gedeeld = { CRITERIA, ONDERSCHEIDINGEN, MIN_JURYLEDEN, BEWIJS, SECTOREN, TYPES, aantal: oplossingen.length };

  for (const p of PAGINAS) {
    if (voorbeeld && !p.inVoorbeeld) continue;
    schrijf(path.join(uit, p.pad), opmaak({ basis, voorbeeld, ...p, inhoud: p.inhoud(gedeeld, basis) }));
  }

  for (const o of oplossingen) {
    schrijf(
      path.join(uit, "oplossingen", o.id, "index.html"),
      opmaak({
        basis,
        voorbeeld,
        titel: `${o.naam} van ${o.organisatie} · Meesterproef`,
        beschrijving: o.kort,
        pad: `oplossingen/${o.id}/index.html`,
        script: "detail.js",
        actief: "oplossingen",
        lijf: "pagina-detail",
        inhoud: `<article class="detail" id="oplossing" data-id="${esc(o.id)}">${detailHTML(o, basis)}</article>
<nav class="breed buren" id="buren" aria-label="Vorige en volgende oplossing"></nav>
<section class="breed blok" id="verwant"></section>`,
      })
    );
  }
  return oplossingen;
}

fs.rmSync(DIST, { recursive: true, force: true });
for (const map of ["css", "js", "fonts"]) kopieer(path.join(SRC, map), path.join(DIST, map));
for (const los of ["favicon.svg", "og.png"]) if (fs.existsSync(path.join(SRC, los))) fs.copyFileSync(path.join(SRC, los), path.join(DIST, los));

const echt = bouwUitgave({ basis: "", voorbeeld: false, dataMap: path.join(SRC, "data") });
const proef = bouwUitgave({ basis: "/voorbeeld", voorbeeld: true, dataMap: path.join(SRC, "voorbeeld") });

const vandaag = new Date().toISOString().slice(0, 10);
const adressen = [...PAGINAS.filter((p) => p.index !== false).map((p) => p.pad.replace(/index\.html$/, "")), ...echt.map((o) => `oplossingen/${o.id}/`)];
schrijf(
  path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${adressen.map((a) => `  <url><loc>${ADRES}/${a}</loc><lastmod>${vandaag}</lastmod></url>`).join("\n")}\n</urlset>\n`
);
schrijf(path.join(DIST, "robots.txt"), `User-agent: *\nDisallow: /account/\nDisallow: /beheer/\nDisallow: /voorbeeld/\nDisallow: /api/\nSitemap: ${ADRES}/sitemap.xml\n`);

console.log(`gebouwd: ${echt.length} oplossingen, ${proef.length} voorbeelden, ${PAGINAS.length} pagina's in dist/`);
