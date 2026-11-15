// Rekenen aan de hemel, helemaal in de browser. Getest in fase 1 tegen JPL Horizons en Skyfield:
// zon, maan, planeten en Pluto binnen 0,3 boogminuut; op- en ondergang op de minuut.
// - astronomy-engine (MIT, Don Cross): zon, maan, planeten, manen van Jupiter, sterren
// - Ceres en Eris: een Kepler-baan uit de JPL Small-Body Database (zonder storingen door planeten)
import * as A from "./vendor/astronomy.js";

export { A };
// Als je nog geen plek hebt gekozen: het midden van Nederland. Tussen Groningen en Maastricht scheelt dat hooguit een paar minuten.
export const MIDDEN = { naam: "het midden van Nederland (De Bilt)", lat: 52.101, lon: 5.178, standaard: true };

const RICHTING = ["noorden", "noordoosten", "oosten", "zuidoosten", "zuiden", "zuidwesten", "westen", "noordwesten"];
export const richting = (az) => RICHTING[Math.round(((az % 360) + 360) % 360 / 45) % 8];
export const richtingKort = (az) => ["N", "NO", "O", "ZO", "Z", "ZW", "W", "NW"][Math.round(((az % 360) + 360) % 360 / 45) % 8];
export const klok = (d) => d ? new Date(d).toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" }) : "";
export const dag = (d) => new Date(d).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam", weekday: "long", day: "numeric", month: "long" });
const MANEN_JUPITER = { io: "io", europa: "europa", ganymedes: "ganymede", callisto: "callisto" };
const waarnemer = (p) => new A.Observer(p.lat, p.lon, p.hoogte || 0);

function horVanVector(v, t, obs) {
  const h = A.RotateVector(A.Rotation_EQJ_HOR(t, obs), v);
  const s = A.HorizonFromVector(h, "normal");
  return { az: s.lon, hoogte: s.lat };
}

function kepler(k, t) { // heliocentrische positie (EQJ, AE) uit oskulerende elementen
  const r = Math.PI / 180, e = k.e, a = k.a, i = k.i * r, om = k.om * r, w = k.w * r, n = k.n * r;
  let M = n * (t.tt + 2451545.0 - k.tp);
  M = ((M % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  let E = e < 0.8 ? M : Math.PI * (Math.sign(M) || 1);
  for (let j = 0; j < 100; j++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cO = Math.cos(om), sO = Math.sin(om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
  const v = new A.Vector((cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y,
    (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y, sw * si * x + cw * si * y, t);
  return A.RotateVector(A.Rotation_ECL_EQJ(), v);
}

// Heliocentrische positie in AE (EQJ) voor de baan-tekening
export function helio(item, datum) {
  const t = A.MakeTime(datum);
  if (item.ae && item.ae !== "Moon" && item.ae !== "Sun") return A.HelioVector(A.Body[item.ae], t);
  if (item.slug === "aarde") return A.HelioVector(A.Body.Earth, t);
  if (item.baan?.kepler) return kepler(item.baan.kepler, t);
  return null;
}

// Waar staat het? { az, hoogte, mag, bij } of null (de aarde; of geen gegevens)
// bij: als het te klein is om los te zien, het hemellichaam waar het vlak naast staat
export function positie(item, datum, plek, D) {
  const obs = waarnemer(plek), t = A.MakeTime(datum);
  if (item.slug === "aarde") return null;
  if (item.ae) {
    const eq = A.Equator(A.Body[item.ae], t, obs, true, true);
    const h = A.Horizon(t, obs, eq.ra, eq.dec, "normal");
    let mag = null;
    try { mag = A.Illumination(A.Body[item.ae], t).mag; } catch {}
    return { az: h.azimuth, hoogte: h.altitude, mag, afstand_ae: eq.dist };
  }
  if (item.baan?.ster) {
    const s = item.baan.ster;
    A.DefineStar(A.Body.Star1, s.ra / 15, s.dec, 3.26156 / (s.parallax_mas / 1000));
    const eq = A.Equator(A.Body.Star1, t, obs, true, true);
    const h = A.Horizon(t, obs, eq.ra, eq.dec, "normal");
    return { az: h.azimuth, hoogte: h.altitude };
  }
  if (MANEN_JUPITER[item.slug]) {
    const jv = A.GeoVector(A.Body.Jupiter, t, true), lt = jv.Length() / A.C_AUDAY;
    const m = A.JupiterMoons(t.AddDays(-lt))[MANEN_JUPITER[item.slug]];
    const o = A.ObserverVector(t, obs, false);
    const p = horVanVector(new A.Vector(jv.x + m.x - o.x, jv.y + m.y - o.y, jv.z + m.z - o.z, t), t, obs);
    return { ...p, bij: "jupiter" };
  }
  if (item.baan?.kepler) {
    const aarde = A.HelioVector(A.Body.Earth, t), o = A.ObserverVector(t, obs, false);
    let v = kepler(item.baan.kepler, t);
    for (let k = 0; k < 3; k++) {
      const lt = Math.hypot(v.x - aarde.x, v.y - aarde.y, v.z - aarde.z) / A.C_AUDAY;
      v = kepler(item.baan.kepler, t.AddDays(-lt));
    }
    return { ...horVanVector(new A.Vector(v.x - aarde.x - o.x, v.y - aarde.y - o.y, v.z - aarde.z - o.z, t), t, obs), afstand_ae: Math.hypot(v.x - aarde.x, v.y - aarde.y, v.z - aarde.z) };
  }
  if (item.ouder && D) { // kleine manen: vlak bij hun planeet
    const ouder = D.perSlug[item.ouder];
    const p = ouder && positie(ouder, datum, plek, D);
    return p ? { az: p.az, hoogte: p.hoogte, bij: item.ouder } : null;
  }
  return null;
}

// Op en onder in de komende 24 uur. Voor manen: die van hun planeet.
export function opOnder(item, datum, plek, D) {
  const obs = waarnemer(plek), t = A.MakeTime(datum);
  let body = null;
  if (item.ae) body = A.Body[item.ae];
  else if (item.baan?.ster) { const s = item.baan.ster; A.DefineStar(A.Body.Star1, s.ra / 15, s.dec, 3.26156 / (s.parallax_mas / 1000)); body = A.Body.Star1; }
  else if (MANEN_JUPITER[item.slug]) body = A.Body.Jupiter;
  else if (item.ouder && D?.perSlug[item.ouder]?.ae) body = A.Body[D.perSlug[item.ouder].ae];
  if (!body) return null;
  const op = A.SearchRiseSet(body, obs, +1, t, 1), onder = A.SearchRiseSet(body, obs, -1, t, 1);
  const hoog = A.SearchHourAngle(body, obs, 0, t, +1);
  return { op: op?.date || null, onder: onder?.date || null, hoogst: hoog?.time.date || null, hoogsteHoogte: hoog?.hor.altitude };
}

// Uur en minuut in Nederland, ook als de browser in een andere tijdzone staat
function nlTijd(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { u: +p.hour, m: +p.minute };
}
// 12 uur 's middags (Nederlandse tijd) van de avond waar het om gaat. Na middernacht tot 6 uur 's ochtends: nog de avond ervoor.
function middagVan(datum) {
  const { u, m } = nlTijd(datum);
  const terug = (u < 6 ? u + 12 : u - 12) * 60 + m;
  return new Date(+datum - terug * 60e3);
}
export function middernachtNa(d) { const { u, m } = nlTijd(d); return new Date(+d + ((24 - u) * 60 - m) * 60e3); }

// De avond van een datum: zon onder, schemering voorbij (zon 6° onder de horizon), echt donker (12°), en de ochtend
export function avond(datum, plek) {
  const obs = waarnemer(plek);
  const middag = middagVan(datum);
  const t = A.MakeTime(middag);
  const s = (dir, h) => A.SearchAltitude(A.Body.Sun, obs, dir, t, 1, h)?.date || null;
  return { zonOnder: A.SearchRiseSet(A.Body.Sun, obs, -1, t, 1)?.date, schemering: s(-1, -6), donker: s(-1, -12),
    ochtend: s(+1, -6), zonOp: A.SearchRiseSet(A.Body.Sun, obs, +1, t, 1)?.date };
}

const FASEN = [[0, "nieuwe maan"], [22.5, "wassende sikkel"], [67.5, "eerste kwartier"], [112.5, "wassende maan"], [157.5, "volle maan"], [202.5, "afnemende maan"], [247.5, "laatste kwartier"], [292.5, "afnemende sikkel"], [337.5, "nieuwe maan"]];
export function maanfase(datum) {
  const t = A.MakeTime(datum);
  const hoek = A.MoonPhase(t), ill = A.Illumination(A.Body.Moon, t);
  const naam = [...FASEN].reverse().find(([h]) => hoek >= h)[1];
  const kwartieren = [];
  let q = A.SearchMoonQuarter(t);
  for (let i = 0; i < 4; i++) { kwartieren.push({ naam: ["nieuwe maan", "eerste kwartier", "volle maan", "laatste kwartier"][q.quarter], datum: q.time.date }); q = A.NextMoonQuarter(q); }
  return { hoek, verlicht: ill.phase_fraction, naam, kwartieren };
}

// Wat zie je vanavond? Van het eind van de schemering tot middernacht (of tot de ochtend, als je wilt).
// Per hemellichaam: wanneer het het hoogst staat, hoe hoog en in welke richting, en of je het met het blote oog ziet.
export function vanavond(D, plek, datum = new Date(), { tot = "middernacht" } = {}) {
  const av = avond(datum, plek);
  const start = av.schemering || av.zonOnder;
  const eind = tot === "ochtend" ? av.ochtend : middernachtNa(start);
  const kandidaten = D.hemel.filter((h) => h.ae && h.ae !== "Sun" || h.baan?.ster || ["ceres", "eris"].includes(h.slug));
  const uit = [];
  for (const h of kandidaten) {
    let best = null, eerste = null, laatste = null;
    for (let tt = +start; tt <= +eind; tt += 10 * 60e3) {
      const p = positie(h, new Date(tt), plek, D);
      if (!p) break;
      if (p.hoogte > 8) { eerste ??= tt; laatste = tt; if (!best || p.hoogte > best.hoogte) best = { ...p, tijd: tt }; }
    }
    if (!best) continue;
    const mag = best.mag ?? (h.baan?.ster ? sterMag(h) : null);
    uit.push({ item: h, ...best, van: eerste, tot: laatste, mag, blootOog: mag != null && mag < 5.5 });
  }
  uit.sort((a, b) => (a.mag ?? 99) - (b.mag ?? 99));
  return { ...av, start, eind, lijst: uit };
}
function sterMag(h) {
  const c = h.cijfers.find((c) => c.naam === "Helderheid");
  return c ? parseFloat(c.tekst.replace(",", ".")) : null;
}

// Hemelkaart: azimut en hoogte van een punt RA/Dec (J2000, graden) voor de sterrenkaart
export function sterHor(ra, dec, t, obs) {
  const r = Math.PI / 180, cd = Math.cos(dec * r);
  const v = new A.Vector(cd * Math.cos(ra * r), cd * Math.sin(ra * r), Math.sin(dec * r), t);
  const h = A.RotateVector(A.Rotation_EQJ_HOR(t, obs), v);
  const s = A.HorizonFromVector(h, null);
  return { az: s.lon, hoogte: s.lat };
}
export { waarnemer };
