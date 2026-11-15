// Het beeld van een oplossing. We tonen geen schermafbeeldingen van
// andermans werk. Elke oplossing krijgt een eigen affiche: de kleuren
// volgen de sector, het motief volgt het soort oplossing, en de precieze
// tekening hangt vast aan het id. Dit bestand heeft geen DOM nodig, zodat
// het bouwscript dezelfde affiches kan maken als de browser.

export const SECTORKLEUR = {
  Retail: { bg: "#f6c445", vorm: "#1a1712", accent: "#e5381b", licht: "#fff3c4" },
  "Financiën": { bg: "#0f3d2e", vorm: "#8fe0b4", accent: "#f6c445", licht: "#1f5a45" },
  Zorg: { bg: "#f7b3ab", vorm: "#7a1f2b", accent: "#ffffff", licht: "#fbd3ce" },
  Overheid: { bg: "#1d2f6f", vorm: "#a9c4f5", accent: "#ff7a59", licht: "#2c418c" },
  Mobiliteit: { bg: "#c7b8f5", vorm: "#2a1a66", accent: "#ffffff", licht: "#ddd3fb" },
  Media: { bg: "#e5381b", vorm: "#1a1712", accent: "#ffd9c9", licht: "#f0563c" },
  "Zakelijke software": { bg: "#c6f06a", vorm: "#1f3d00", accent: "#ffffff", licht: "#dbf79d" },
  Industrie: { bg: "#2b2a27", vorm: "#c9c3b6", accent: "#f6c445", licht: "#3d3b37" },
  Onderwijs: { bg: "#8fd6e8", vorm: "#0b3c4a", accent: "#ffffff", licht: "#b7e6f1" },
  Juridisch: { bg: "#4a1942", vorm: "#e3b5d6", accent: "#f6c445", licht: "#632459" },
  Logistiek: { bg: "#e9d8a6", vorm: "#5b4300", accent: "#e5381b", licht: "#f3e8c6" },
  Energie: { bg: "#15140f", vorm: "#ffe14d", accent: "#ff7a59", licht: "#2a2820" },
  "Agri en food": { bg: "#a8d08d", vorm: "#1f4d16", accent: "#ffffff", licht: "#c5e2b2" },
  Reizen: { bg: "#0e5a5a", vorm: "#7fe0d8", accent: "#ffb38a", licht: "#177373" },
};
const STANDAARD = { bg: "#d8d3c7", vorm: "#1a1712", accent: "#e5381b", licht: "#e8e4da" };

export function kleuren(sector) {
  return SECTORKLEUR[sector] ?? STANDAARD;
}

function hash(tekst) {
  let h = 2166136261;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Kleine, vaste toevalsgenerator: hetzelfde id geeft altijd dezelfde tekening.
function toeval(zaad) {
  let a = zaad || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

function gesprek(r, k) {
  let uit = "";
  let y = 34;
  const aantal = 5;
  for (let i = 0; i < aantal; i++) {
    const rechts = i % 2 === 1;
    const breed = 110 + Math.floor(r() * 130);
    const hoog = i === 2 ? 58 : 36;
    const x = rechts ? 372 - breed : 28;
    uit += `<rect x="${x}" y="${y}" width="${breed}" height="${hoog}" rx="18" fill="${rechts ? k.accent : k.vorm}"/>`;
    if (i === 2) uit += `<rect x="${x + 18}" y="${y + 16}" width="${breed - 60}" height="6" rx="3" fill="${k.bg}" opacity=".55"/><rect x="${x + 18}" y="${y + 32}" width="${breed - 90}" height="6" rx="3" fill="${k.bg}" opacity=".55"/>`;
    if (i === aantal - 1) {
      uit += [0, 1, 2].map((d) => `<circle class="p-punt" style="animation-delay:${d * 0.18}s" cx="${x + 26 + d * 16}" cy="${y + 18}" r="4.5" fill="${k.bg}"/>`).join("");
    }
    y += hoog + 12;
  }
  return uit;
}

function document_(r, k) {
  const draai = -8 + r() * 6;
  let regels = "";
  const fel = 2 + Math.floor(r() * 4);
  for (let i = 0; i < 8; i++) {
    const breed = 70 + r() * 110;
    regels += `<rect x="150" y="${62 + i * 24}" width="${r1(breed)}" height="9" rx="4.5" fill="${i === fel ? k.accent : k.bg}" opacity="${i === fel ? 1 : 0.5}"/>`;
  }
  return `<g transform="rotate(${r1(draai + 9)} 200 150)"><rect x="96" y="40" width="230" height="250" rx="10" fill="${k.licht}"/></g>
    <g transform="rotate(${r1(draai)} 200 150)"><rect x="124" y="30" width="230" height="260" rx="10" fill="${k.vorm}"/>${regels}
    <rect class="p-knipper" x="${r1(150 + 60 + r() * 80)}" y="${62 + fel * 24 - 4}" width="5" height="17" fill="${k.accent}"/></g>
    <circle cx="70" cy="${r1(70 + r() * 60)}" r="26" fill="${k.accent}"/>`;
}

function netwerk(r, k) {
  const punten = [];
  for (let i = 0; i < 7; i++) punten.push([r1(46 + i * 51 + (r() - 0.5) * 26), r1(50 + r() * 200)]);
  let lijnen = "";
  for (let i = 0; i < punten.length; i++) {
    for (let j = i + 1; j < punten.length; j++) {
      if (j === i + 1 || r() < 0.22) lijnen += `<line x1="${punten[i][0]}" y1="${punten[i][1]}" x2="${punten[j][0]}" y2="${punten[j][1]}" stroke="${k.vorm}" stroke-width="2" opacity=".45"/>`;
    }
  }
  const pad = punten.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const knopen = punten.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === 3 ? 22 : 11}" fill="${i === 3 ? k.accent : k.vorm}"/>`).join("");
  return `${lijnen}<path class="p-trek" d="${pad}" fill="none" stroke="${k.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="100"/>${knopen}
    <circle cx="${punten[3][0]}" cy="${punten[3][1]}" r="34" fill="none" stroke="${k.accent}" stroke-width="2" class="p-puls"/>`;
}

function kromme(r, k) {
  const punten = [];
  let y = 200 + r() * 40;
  for (let i = 0; i < 9; i++) {
    y = Math.max(50, Math.min(250, y + (r() - 0.62) * 70));
    punten.push([i * 50, r1(y)]);
  }
  const lijn = (ps) => ps.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const nu = 5;
  const verleden = punten.slice(0, nu + 1);
  const toekomst = punten.slice(nu);
  const band = `${lijn(toekomst.map((p, i) => [p[0], p[1] - 8 - i * 12]))} ${toekomst
    .map((p, i) => [p[0], p[1] + 8 + i * 12])
    .reverse()
    .map((p) => `L${p[0]} ${r1(p[1])}`)
    .join(" ")} Z`;
  let staven = "";
  for (let i = 0; i < 16; i++) staven += `<rect x="${i * 25 + 4}" y="${r1(300 - 20 - r() * 70)}" width="17" height="100" fill="${k.licht}"/>`;
  return `${staven}<path d="${band}" fill="${k.accent}" opacity=".3"/>
    <path d="${lijn(verleden)}" fill="none" stroke="${k.vorm}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="p-streep" d="${lijn(toekomst)}" fill="none" stroke="${k.accent}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 13"/>
    <line x1="${punten[nu][0]}" y1="20" x2="${punten[nu][0]}" y2="280" stroke="${k.vorm}" stroke-width="2" stroke-dasharray="3 6" opacity=".6"/>
    ${verleden.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${k.vorm}"/>`).join("")}
    <circle class="p-puls" cx="${punten[nu][0]}" cy="${punten[nu][1]}" r="14" fill="none" stroke="${k.accent}" stroke-width="3"/>`;
}

function kader(r, k) {
  let vakjes = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 11; x++) {
      const o = r();
      if (o > 0.35) vakjes += `<rect x="${x * 38 - 8}" y="${y * 38}" width="34" height="34" fill="${o > 0.8 ? k.vorm : k.licht}" opacity="${r1(o > 0.8 ? 0.85 : 0.9)}"/>`;
    }
  }
  const doos = (x, y, b, h) => {
    const l = 16;
    return `<g fill="none" stroke="${k.accent}" stroke-width="5" stroke-linecap="square">
      <path d="M${x} ${y + l}V${y}H${x + l}M${x + b - l} ${y}H${x + b}V${y + l}M${x + b} ${y + h - l}V${y + h}H${x + b - l}M${x + l} ${y + h}H${x}V${y + h - l}"/></g>
      <rect x="${x}" y="${y - 20}" width="56" height="14" fill="${k.accent}"/>`;
  };
  const x1 = 40 + Math.floor(r() * 60);
  const y1 = 50 + Math.floor(r() * 50);
  return `${vakjes}${doos(x1, y1, 130, 110)}${doos(230 + Math.floor(r() * 30), 150 + Math.floor(r() * 40), 96, 80)}
    <rect class="p-scan" x="0" y="0" width="400" height="5" fill="${k.accent}" opacity=".85"/>`;
}

function golf(r, k) {
  let staven = "";
  for (let i = 0; i < 17; i++) {
    const h = 20 + r() * 150 * Math.sin(((i + 1) / 18) * Math.PI);
    staven += `<rect class="p-staaf" style="animation-delay:${r1(i * 0.07)}s" x="${24 + i * 12}" y="${r1(150 - h / 2)}" width="7" height="${r1(h)}" rx="3.5" fill="${k.vorm}"/>`;
  }
  let regels = "";
  for (let i = 0; i < 7; i++) regels += `<rect x="262" y="${72 + i * 24}" width="${r1(50 + r() * 70)}" height="9" rx="4.5" fill="${i === 0 ? k.accent : k.vorm}" opacity="${i === 0 ? 1 : 0.75}"/>`;
  return `<rect x="244" y="44" width="170" height="212" rx="10" fill="${k.licht}"/>${staven}${regels}
    <path d="M226 150h14m-6-6 6 6-6 6" fill="none" stroke="${k.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function tokens(r, k) {
  let uit = "";
  let y = 30;
  for (let rij = 0; rij < 7; rij++) {
    let x = -10 - r() * 30;
    while (x < 410) {
      const b = 28 + Math.floor(r() * 80);
      const soort = r();
      const vul = soort > 0.86 ? k.accent : soort > 0.4 ? k.vorm : k.licht;
      uit += `<rect ${soort > 0.86 ? 'class="p-knipper" style="animation-delay:' + r1(r() * 2) + 's"' : ""} x="${r1(x)}" y="${y}" width="${b}" height="26" rx="13" fill="${vul}"/>`;
      x += b + 8;
    }
    y += 36;
  }
  return uit;
}

const MOTIEF = {
  "Assistent voor klanten": gesprek,
  "Assistent voor medewerkers": document_,
  Agent: netwerk,
  Voorspelmodel: kromme,
  Beeldherkenning: kader,
  "Spraak en verslaglegging": golf,
  Taalmodel: tokens,
};

export function poster(o) {
  const k = kleuren(o.sector);
  const r = toeval(hash(o.id));
  const teken = MOTIEF[o.type] ?? tokens;
  return `<svg class="poster" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Affiche van ${String(o.naam).replace(/[&<>"]/g, "")}" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="${k.bg}"/>${teken(r, k)}</svg>`;
}
