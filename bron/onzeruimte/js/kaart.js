// De sterrenkaart: de hele hemel boven je hoofd op één ronde kaart, zoals je hem ziet als je op je rug
// in het gras ligt met je hoofd naar het noorden. Noord boven, oost links, zuid onder, west rechts.
// De rand is de horizon, het midden recht boven je. Donker paneel binnen het lichte thema (zoals Voggels).
// Sterren tot helderheid 5 en lijnen van sterrenbeelden: d3-celestial (Olaf Frohn, BSD-3-Clause).
// Op de grote kaart kun je zoomen, schuiven en de kaart draaien naar de kant waar je naartoe kijkt.
import { A, positie, waarnemer, richting } from "./hemel.js";

let sterren = null, beelden = null;
export async function laadSterren() {
  if (!sterren) [sterren, beelden] = await Promise.all(["/data/sterren.json", "/data/sterrenbeelden.json"].map((u) => fetch(u).then((r) => r.json())));
  return { sterren, beelden };
}

const NACHT = "#1A1A1A", PAARS = "#B5B1E5", WIT = "#FFFFFF", ZACHT = "rgba(255,255,255,.6)";
const HEMEL_NACHT = [34, 36, 40], HEMEL_DAG = [58, 76, 102];
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
// kleurindex B-V naar een zachte sterkleur: blauwig wit, wit, geel, oranje
const sterKleur = (bv) => bv == null ? WIT : bv < 0 ? "#DCE6FF" : bv < 0.5 ? WIT : bv < 1 ? "#FFF2D6" : bv < 1.4 ? "#FFDDB0" : "#FFC89A";

// Welke hemellichamen uit onze lijst op de kaart staan: zon, maan, planeten (niet Pluto), en op de grote kaart ook
// de sterren uit de lijst. Het gemarkeerde hemellichaam altijd.
function opKaart(D, opt) {
  return D.hemel.filter((x) => x.slug === opt.markeer || (opt.planeten !== false && x.ae && x.ae !== "Pluto")
    || (opt.groot && x.soort === "ster" && x.baan?.ster));
}

// opties: { markeer, beeldNamen, sterNamen, lijnen, planeten, klein, groot, uitgelicht: [afkortingen],
//           zicht: { z: zoom, x, y: verschuiving in px, kijk: windrichting in graden die onderaan staat } }
export async function teken(doek, D, plek, datum, opt = {}) {
  await laadSterren();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = doek.clientWidth || 320, h = doek.clientHeight || w;
  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  if (doek.width !== bw || doek.height !== bh) { doek.width = bw; doek.height = bh; }
  const c = doek.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const zicht = { z: 1, x: 0, y: 0, kijk: 180, ...opt.zicht };
  const schaal = opt.groot ? 1.15 : 1;
  // rand: ruimte boven en onder die bedekt is door knoppen (de grote kaart); de cirkel past in wat overblijft
  const boven = opt.rand?.boven || 0, links = opt.rand?.links || 0, vrijH = h - boven - (opt.rand?.onder || 0), vrijB = w - links;
  const R0 = Math.min(vrijB, vrijH) / 2 - (opt.klein ? 6 : opt.groot ? 30 : 28);
  const R = R0 * zicht.z, cx = links + vrijB / 2 + zicht.x, cy = boven + vrijH / 2 + zicht.y;
  const t = A.MakeTime(datum), obs = waarnemer(plek), rot = A.Rotation_EQJ_HOR(t, obs).rot;
  const rad = Math.PI / 180, draai = (zicht.kijk - 180) * rad;
  // RA/Dec (J2000) -> horizon -> punt op de kaart (azimutaal, gelijke afstanden)
  const hor = (ra, dec) => {
    const cd = Math.cos(dec * rad), x = cd * Math.cos(ra * rad), y = cd * Math.sin(ra * rad), z = Math.sin(dec * rad);
    const hx = rot[0][0] * x + rot[1][0] * y + rot[2][0] * z, hy = rot[0][1] * x + rot[1][1] * y + rot[2][1] * z, hz = rot[0][2] * x + rot[1][2] * y + rot[2][2] * z;
    return { az: Math.atan2(-hy, hx) / rad, hoogte: Math.asin(Math.max(-1, Math.min(1, hz))) / rad };
  };
  const hoek = (az) => az * rad - draai;
  const punt = (az, hoogte) => {
    const r = ((90 - hoogte) / 90) * R, a = hoek(az);
    return [cx - r * Math.sin(a), cy - r * Math.cos(a)];
  };
  const inBeeld = (x, y, m = 40) => x > -m && y > -m && x < w + m && y < h + m;
  // de zon: overdag is de hemel lichter en zie je de sterren niet
  const zon = positie(D.perSlug.zon, datum, plek, D);
  const licht = Math.max(0, Math.min(1, (zon.hoogte + 12) / 12)); // 0 = donker, 1 = de zon is op
  c.clearRect(0, 0, w, h);
  c.fillStyle = NACHT; c.fillRect(0, 0, w, h);
  c.fillStyle = `rgb(${mix(HEMEL_NACHT, HEMEL_DAG, licht).join(",")})`; c.beginPath(); c.arc(cx, cy, R, 0, 2 * Math.PI); c.fill();
  c.strokeStyle = "rgba(255,255,255,.08)"; c.lineWidth = 1;
  for (const hh of [30, 60]) { c.beginPath(); c.arc(cx, cy, ((90 - hh) / 90) * R, 0, 2 * Math.PI); c.stroke(); }
  c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 2 * Math.PI); c.clip();
  const namen = []; // [tekst, x, y, voorrang, letter, kleur, uitlijning]
  const vrij = []; // vakken waar al iets staat (stippen van planeten)
  // lijnen van sterrenbeelden
  if (opt.lijnen !== false) {
    for (const [afk, b] of Object.entries(beelden)) {
      const uit = opt.uitgelicht?.includes(afk);
      c.strokeStyle = uit ? PAARS : `rgba(181,177,229,${0.28 * (1 - licht * 0.5)})`; c.lineWidth = uit ? 2 : 0.8;
      let midden = null, n = 0;
      for (const lijn of b.lijnen) {
        c.beginPath(); let eerst = true;
        for (const [ra, dec] of lijn) {
          const p = hor(ra, dec);
          if (p.hoogte < -5) { eerst = true; continue; }
          const [x, y] = punt(p.az, p.hoogte);
          if (eerst) { c.moveTo(x, y); eerst = false; } else c.lineTo(x, y);
          if (p.hoogte > 0) { midden = midden ? [midden[0] + x, midden[1] + y] : [x, y]; n++; }
        }
        c.stroke();
      }
      if ((opt.beeldNamen || uit) && n > 2 && !opt.klein)
        namen.push([b.nl, midden[0] / n, midden[1] / n, uit ? 3 : 6, `${uit ? 600 : 500} ${(uit ? 13 : 10.5) * schaal}px Geist, sans-serif`, uit ? PAARS : "rgba(181,177,229,.6)", "center"]);
    }
  }
  // sterren: grootte naar helderheid, kleur naar kleurindex; overdag vager
  const sterAlfa = 1 - licht * 0.65;
  c.globalAlpha = sterAlfa;
  const sterNamen = [];
  for (const [ra, dec, mag, bv, naam] of sterren) {
    if (opt.klein && mag > 4) continue;
    const p = hor(ra, dec);
    if (p.hoogte < 0) continue;
    const [x, y] = punt(p.az, p.hoogte);
    if (!inBeeld(x, y, 4)) continue;
    const r = Math.max(0.5, ((opt.klein ? 2.2 : 3.2) - mag * 0.55) * (opt.groot ? Math.min(1.6, 0.9 + zicht.z * 0.15) : 1));
    c.fillStyle = mag < 2.5 ? sterKleur(bv) : mag < 3 ? WIT : "rgba(255,255,255,.75)";
    c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    if (opt.sterNamen && naam && mag < (opt.groot ? 1.6 + Math.min(1, (zicht.z - 1) * 0.5) : 1.6) && !opt.klein) sterNamen.push([naam, x, y, r]);
  }
  c.globalAlpha = 1;
  // zon, maan, planeten (en het gemarkeerde hemellichaam)
  const plekken = [];
  for (const it of opKaart(D, opt)) {
    const p = it.slug === "zon" ? zon : positie(it, datum, plek, D);
    if (!p || p.hoogte < -2) continue;
    const [x, y] = punt(p.az, Math.max(0, p.hoogte));
    if (!inBeeld(x, y)) continue;
    const hier = it.slug === opt.markeer;
    const ster = it.soort === "ster" && it.ae !== "Sun";
    const r = (it.ae === "Sun" ? 9 : it.ae === "Moon" ? 8 : hier ? 5 : ster ? 3 : 4) * (opt.groot ? 1.2 : 1);
    c.fillStyle = it.ae === "Sun" ? "#FFD27A" : it.ae === "Moon" ? "#EDEDED" : ster ? WIT : PAARS;
    c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    if (hier) { c.strokeStyle = PAARS; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 7, 0, 2 * Math.PI); c.stroke(); }
    vrij.push([x - r - 2, y - r - 2, 2 * r + 4, 2 * r + 4]);
    if (!opt.klein || hier)
      namen.push([it.titel, x + r + 4, y + 4 * schaal, hier ? 0 : ster ? 2 : 1, `${hier ? 600 : 500} ${(hier ? 14 : ster ? 11 : 12) * schaal}px Geist, sans-serif`, hier ? PAARS : WIT, "left", x - r - 4]);
    plekken.push({ slug: it.slug, x, y, r: r + (opt.groot ? 14 : 10) });
  }
  // sternamen uit d3-celestial (Engels), niet als dezelfde ster al uit onze lijst op de kaart staat
  for (const [naam, x, y, r] of sterNamen) {
    if (plekken.some((p) => Math.hypot(p.x - x, p.y - y) < 6)) continue;
    namen.push([naam, x + r + 3, y - 3, 4, `500 ${10 * schaal}px Geist, sans-serif`, ZACHT, "left", x - r - 3]);
  }
  c.restore();
  // namen zonder overlap: eerst de belangrijkste; wat niet past, laten we weg
  namen.sort((a, b) => a[3] - b[3]);
  c.textBaseline = "alphabetic";
  for (const [tekst, x, y, , letter, kleur, uitlijning, links] of namen) {
    c.font = letter;
    const b = c.measureText(tekst).width, hh = parseFloat(letter.split(" ")[1]) || 11;
    // past het niet rechts van de stip, dan links ervan (alleen bij namen naast een stip)
    const plekjes = uitlijning === "center" ? [x - b / 2] : [x, links != null ? links - b : null].filter((v) => v != null);
    for (const x0 of plekjes) {
      const vak = [x0 - 1, y - hh, b + 3, hh + 4];
      if (x0 < 2 || x0 + b > w - 2 || y - hh < 2 || y > h - 2) continue;
      if (Math.hypot(x0 + b / 2 - cx, y - hh / 2 - cy) > R + 6) continue;
      if (vrij.some((v) => vak[0] < v[0] + v[2] && v[0] < vak[0] + vak[2] && vak[1] < v[1] + v[3] && v[1] < vak[1] + vak[3])) continue;
      vrij.push(vak);
      c.fillStyle = kleur; c.textAlign = "left"; c.fillText(tekst, x0, y);
      break;
    }
  }
  // horizon en windrichtingen (net buiten de rand, of langs de rand van het beeld als je bent ingezoomd)
  c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, R, 0, 2 * Math.PI); c.stroke();
  if (!opt.klein) {
    c.font = `600 ${13 * schaal}px Geist, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    for (const [az, l] of [[0, "N"], [90, "O"], [180, "Z"], [270, "W"]]) {
      const a = hoek(az), m = 14 * schaal;
      let x = cx - (R + m) * Math.sin(a), y = cy - (R + m) * Math.cos(a);
      const buiten = x < m || x > w - m || y < m || y > h - m;
      x = Math.max(m, Math.min(w - m, x)); y = Math.max(m, Math.min(h - m, y));
      if (buiten) { c.fillStyle = "rgba(26,26,26,.7)"; c.beginPath(); c.arc(x, y, m - 1, 0, 2 * Math.PI); c.fill(); }
      c.fillStyle = az === zicht.kijk && opt.groot ? PAARS : WIT; c.fillText(l, x, y + 0.5);
    }
    c.textBaseline = "alphabetic";
  }
  doek.dataset.plekken = JSON.stringify(plekken);
  doek.zonHoogte = zon.hoogte; doek.straal = R0; doek.plekken = plekken;
  return plekken;
}

// Een tik op de kaart: welk hemellichaam? (het dichtstbijzijnde binnen bereik)
export function welke(doek, e) {
  const r = doek.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const lijst = (doek.plekken || JSON.parse(doek.dataset.plekken || "[]")).map((p) => ({ ...p, d: Math.hypot(p.x - x, p.y - y) })).filter((p) => p.d < p.r);
  return lijst.sort((a, b) => a.d - b.d)[0]?.slug || null;
}

// Kort zinnetje: "Hoog in het zuidoosten (40°)"
export function waarZin(p) {
  if (!p) return "";
  if (p.hoogte < 0) return `Onder de horizon (${Math.round(-p.hoogte)}° eronder), in het ${richting(p.az)}`;
  const hoe = p.hoogte < 10 ? "Laag" : p.hoogte < 35 ? "Halfhoog" : p.hoogte < 70 ? "Hoog" : "Bijna recht boven je";
  return `${hoe} in het ${richting(p.az)} (${Math.round(p.hoogte)}° boven de horizon)`;
}
