// Om je heen: de hemel zoals je hem ziet als je buiten staat. Je kijkt rond door te slepen (of door je telefoon
// op te tillen), zoomt met knijpen of scrollen. Geen bibliotheek: een stereografische projectie op een canvas,
// zoals planetariumprogramma's die gebruiken (rechte hoeken blijven recht, de rand vervormt het minst).
// De lucht (kleur, schemering, de Melkweg) rekenen we per beeldpunt uit op een klein raster en vergroten dat.
// De rand met bomen, huizen, een kerk en een molen is getekend, niet echt: bij jou staat er iets anders.
// Sterren, lijnen en de Melkweg: d3-celestial (Olaf Frohn, BSD-3-Clause). Posities: astronomy-engine.
import { A, positie, waarnemer, maanfase } from "./hemel.js";
import { laadSterren } from "./kaart.js";

const rad = Math.PI / 180;
const mix = (a, b, t) => a + (b - a) * t;
const glad = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const PAARS = "#B5B1E5";
const sterKleur = (bv) => bv < 0 ? [205, 220, 255] : bv < 0.4 ? [235, 240, 255] : bv < 0.8 ? [255, 248, 232] : bv < 1.3 ? [255, 222, 180] : [255, 196, 150];
const PLANEETKLEUR = { Mercury: "#D8D2C8", Venus: "#FFFBEA", Mars: "#FF9D6B", Jupiter: "#F6E7C8", Saturn: "#F2DDA4", Uranus: "#BFF3F0", Neptune: "#9DB8FF" };

// ---------- De Melkweg: vijf lagen uit d3-celestial, één keer gerasterd in RA/Dec ----------
let MW = null;
async function laadMelkweg() {
  if (MW) return MW;
  const lagen = await fetch("/data/melkweg.json").then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const W = 720, H = 360, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "lighter";
  if ("filter" in g) g.filter = "blur(3px)";
  lagen.forEach((ringen, i) => {
    g.fillStyle = `rgba(255,255,255,${[0.2, 0.18, 0.18, 0.2, 0.22][i] ?? 0.18})`;
    for (const dx of [-360, 0, 360]) {
      g.beginPath();
      for (const ring of ringen) {
        let vorige = null, extra = 0;
        ring.forEach(([ra, dec], j) => {
          if (vorige != null) { const d = ra + extra - vorige; if (d > 180) extra -= 360; else if (d < -180) extra += 360; }
          vorige = ra + extra;
          const x = ((vorige + dx) / 360) * W, y = ((90 - dec) / 180) * H;
          if (j) g.lineTo(x, y); else g.moveTo(x, y);
        });
        g.closePath();
      }
      g.fill("evenodd");
    }
  });
  const d = g.getImageData(0, 0, W, H).data, b = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) b[i] = d[i * 4];
  MW = { W, H, b };
  return MW;
}

// ---------- De rand: een Nederlands landschap, getekend (vaste vorm, steeds hetzelfde) ----------
const N_RAND = 1440; // vier punten per graad
const MOLEN = { az: 247, hoogte: 3.1, wiek: 2.4 };
const PROFIEL = (() => {
  const p = new Float32Array(N_RAND);
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const vrijVan = (c) => Math.abs(((c / 4 - MOLEN.az + 540) % 360) - 180) > 7 && Math.abs(((c / 4 - 62 + 540) % 360) - 180) > 5;
  for (let i = 0; i < N_RAND; i++) p[i] = 0.3 + 0.18 * (1 + Math.sin(i * 0.031)) * (0.6 + 0.4 * Math.sin(i * 0.0071 + 1));
  const zet = (i, v) => { const k = ((Math.round(i) % N_RAND) + N_RAND) % N_RAND; if (v > p[k]) p[k] = v; };
  // boomgroepen: ronde kruinen, soms een paar naast elkaar
  for (let k = 0; k < 34; k++) {
    const c = rnd() * N_RAND; if (!vrijVan(c)) continue;
    const br = 5 + rnd() * 20, hoog = 0.9 + rnd() * 2.6;
    for (let j = -br; j <= br; j++) { const x = j / br; zet(c + j, hoog * Math.sqrt(1 - x * x) * (0.9 + 0.1 * Math.sin(j * 2.1 + k))); }
  }
  // huizen met een puntdak
  for (let k = 0; k < 9; k++) {
    const c = rnd() * N_RAND; if (!vrijVan(c)) continue;
    const half = 4 + rnd() * 7, muur = 0.7 + rnd() * 0.5, dak = 0.5 + rnd() * 0.5;
    for (let j = -half - 1; j <= half + 1; j++) zet(c + j, Math.abs(j) <= half ? muur + dak * (1 - Math.abs(j) / half) : 0);
  }
  // een kerktoren met een spits
  for (let j = -3; j <= 3; j++) zet(62 * 4 + j, Math.abs(j) <= 2 ? 3.2 : 1.4);
  for (let j = -2; j <= 2; j++) zet(62 * 4 + j, 3.2 + 2.4 * (1 - Math.abs(j) / 2.2));
  for (let j = -14; j <= -4; j++) zet(62 * 4 + j, 1.6); // het schip van de kerk
  // de molen: een romp die naar boven smaller wordt
  for (let j = -7; j <= 7; j++) zet(MOLEN.az * 4 + j, Math.abs(j) <= 3 ? MOLEN.hoogte + 0.2 : MOLEN.hoogte * (1 - (Math.abs(j) - 3) / 4.5));
  return p;
})();
export const randHoogte = (az) => PROFIEL[Math.floor((((az % 360) + 360) % 360) * 4) % N_RAND];

// van hoogte en richting naar een vector (oost, noord, omhoog)
const vec = (az, h) => [Math.cos(h * rad) * Math.sin(az * rad), Math.cos(h * rad) * Math.cos(az * rad), Math.sin(h * rad)];

export class Hemel3D {
  constructor(doek, D) {
    this.doek = doek; this.D = D;
    this.cam = { yaw: 180, pitch: 25, fov: 95 };
    this.raster = document.createElement("canvas");
    this.sleutel = null;
    this.plekken = [];
  }
  async laad() {
    const [{ sterren, beelden }, mw] = await Promise.all([laadSterren(), laadMelkweg()]);
    this.sterren = sterren; this.beelden = beelden; this.mw = mw;
    // gloed voor heldere sterren, één keer getekend
    const g = document.createElement("canvas"); g.width = g.height = 64;
    const c = g.getContext("2d"), r = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,.9)"); r.addColorStop(0.15, "rgba(255,255,255,.35)"); r.addColorStop(0.5, "rgba(255,255,255,.06)"); r.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = r; c.fillRect(0, 0, 64, 64);
    this.gloed = g;
  }

  // posities voor een tijd en plek (alleen opnieuw als die veranderen)
  bereken(plek, t) {
    const sleutel = `${+t}|${plek.lat}|${plek.lon}`;
    if (sleutel === this.sleutel) return;
    this.sleutel = sleutel;
    const D = this.D, rot = A.Rotation_EQJ_HOR(A.MakeTime(t), waarnemer(plek)).rot;
    this.rot = rot;
    const naarHor = (ra, dec) => {
      const cd = Math.cos(dec * rad), x = cd * Math.cos(ra * rad), y = cd * Math.sin(ra * rad), z = Math.sin(dec * rad);
      const hx = rot[0][0] * x + rot[1][0] * y + rot[2][0] * z, hy = rot[0][1] * x + rot[1][1] * y + rot[2][1] * z, hz = rot[0][2] * x + rot[1][2] * y + rot[2][2] * z;
      return [-hy, hx, hz]; // oost, noord, omhoog
    };
    const n = this.sterren.length;
    this.sv = new Float32Array(n * 3);
    this.sterren.forEach(([ra, dec], i) => { const v = naarHor(ra, dec); this.sv[i * 3] = v[0]; this.sv[i * 3 + 1] = v[1]; this.sv[i * 3 + 2] = v[2]; });
    this.lijnen = Object.entries(this.beelden).map(([afk, b]) => ({ afk, nl: b.nl, lijnen: b.lijnen.map((l) => l.map(([ra, dec]) => naarHor(ra, dec))) }));
    const zon = positie(D.perSlug.zon, t, plek, D);
    this.zon = { ...zon, v: vec(zon.az, zon.hoogte) };
    this.maan = maanfase(t);
    this.lichamen = D.hemel.filter((x) => (x.ae && x.ae !== "Pluto") || (x.soort === "ster" && x.baan?.ster) || x.slug === this.markeer)
      .map((it) => { const p = it.slug === "zon" ? zon : positie(it, t, plek, D); return p ? { it, p, v: vec(p.az, p.hoogte) } : null; }).filter(Boolean);
  }

  teken({ plek, t, lagen = {}, markeer = null, tijd = performance.now(), beweging = true }) {
    const doek = this.doek, dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = doek.clientWidth || 320, h = doek.clientHeight || 320;
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (doek.width !== bw || doek.height !== bh) { doek.width = bw; doek.height = bh; }
    const c = doek.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (markeer !== this.markeer) { this.markeer = markeer; this.sleutel = null; }
    this.bereken(plek, t);
    const { yaw, pitch, fov } = this.cam;
    // camera: vooruit, rechts, omhoog
    const cy0 = Math.cos(pitch * rad), f = [Math.sin(yaw * rad) * cy0, Math.cos(yaw * rad) * cy0, Math.sin(pitch * rad)];
    const r = [Math.cos(yaw * rad), -Math.sin(yaw * rad), 0];
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const S = (Math.min(w, h) / 2) / (2 * Math.tan((fov * rad) / 4)), cx = w / 2, cy = h / 2;
    const proj = (v, grens = -0.15) => {
      const d = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
      if (d < grens) return null;
      const k = 2 / (1 + d);
      return [cx + S * k * (v[0] * r[0] + v[1] * r[1] + v[2] * r[2]), cy - S * k * (v[0] * u[0] + v[1] * u[1] + v[2] * u[2]), d];
    };
    const zichtbaar = (x, y, m = 30) => x > -m && y > -m && x < w + m && y < h + m;
    const zonH = this.zon.hoogte, dag = glad(-10, 5, zonH), schemer = Math.max(0, 1 - Math.abs(zonH + 4) / 9);
    const sv = this.zon.v;
    const pxPerGraad = S * 2 * Math.tan(0.5 * rad); // ongeveer, in het midden

    // ---------- de lucht en de grond, per beeldpunt op een klein raster ----------
    const GW = w > 900 ? 200 : 140, GH = Math.max(40, Math.round((GW * h) / w));
    if (this.raster.width !== GW || this.raster.height !== GH) { this.raster.width = GW; this.raster.height = GH; this.beeld = null; }
    const rc = this.raster.getContext("2d");
    if (!this.beeld) this.beeld = rc.createImageData(GW, GH);
    const px = this.beeld.data, mw = lagen.melkweg !== false ? this.mw : null, rot = this.rot;
    const luchtSleutel = `${yaw.toFixed(3)}|${pitch.toFixed(3)}|${fov.toFixed(3)}|${w}|${h}|${this.sleutel}|${!!mw}`;
    if (luchtSleutel !== this.luchtSleutel) {
    this.luchtSleutel = luchtSleutel;
    const grondDonker = [7, 9, 8], grondDag = [44, 52, 40];
    for (let j = 0; j < GH; j++) {
      const sy = -(((j + 0.5) * h) / GH - cy) / S;
      for (let i = 0; i < GW; i++) {
        const sx = (((i + 0.5) * w) / GW - cx) / S, p2 = sx * sx + sy * sy, q = 4 + p2;
        const ve = (4 * (sx * r[0] + sy * u[0]) + (4 - p2) * f[0]) / q, vn = (4 * (sx * r[1] + sy * u[1]) + (4 - p2) * f[1]) / q, vu = (4 * (sx * r[2] + sy * u[2]) + (4 - p2) * f[2]) / q;
        const zh = Math.max(0, vu), hor = 1 - zh, h3 = hor * hor * hor;
        // nacht: bijna zwart boven, lichter bij de horizon (in Nederland altijd wat licht van steden)
        let R = mix(3, 24, h3) + 26 * h3 * h3, G = mix(5, 24, h3) + 14 * h3 * h3, B = mix(12, 40, h3) + 6 * h3 * h3;
        // dag
        const h25 = Math.pow(hor, 2.5);
        R = mix(R, mix(40, 165, h25), dag); G = mix(G, mix(98, 200, h25), dag); B = mix(B, mix(190, 236, h25), dag);
        const cs = ve * sv[0] + vn * sv[1] + vu * sv[2];
        // schemering: oranje gloed aan de kant van de zon, roze band erboven
        if (schemer > 0) {
          const kant = Math.pow((cs + 1) / 2, 5) * h3 * schemer;
          R += 240 * kant; G += 110 * kant; B += 40 * kant;
          const band = schemer * hor * hor * 0.35; R += 70 * band; G += 30 * band; B += 70 * band;
        }
        // de zon zelf
        if (zonH > -3 && cs > 0) { const z = Math.pow(cs, 400) * 1.2 + Math.pow(cs, 18) * 0.35 * Math.max(dag, 0.4); R += 255 * z; G += 235 * z; B += 200 * z; }
        // de Melkweg, alleen als het donker is
        if (mw && vu > 0 && dag < 0.9) {
          const hx = vn, hy = -ve, hz = vu;
          const x = rot[0][0] * hx + rot[0][1] * hy + rot[0][2] * hz, y = rot[1][0] * hx + rot[1][1] * hy + rot[1][2] * hz, z = rot[2][0] * hx + rot[2][1] * hy + rot[2][2] * hz;
          let ra = Math.atan2(y, x) / rad; if (ra < 0) ra += 360;
          const dec = Math.asin(Math.max(-1, Math.min(1, z))) / rad;
          const m = mw.b[Math.min(mw.H - 1, Math.floor(((90 - dec) / 180) * mw.H)) * mw.W + Math.min(mw.W - 1, Math.floor((ra / 360) * mw.W))] / 255;
          const k = m * 0.3 * (1 - dag) * Math.min(1, 0.25 + vu * 3);
          R += 175 * k; G += 185 * k; B += 225 * k;
        }
        // de grond, met wat nevel vlak onder de horizon
        if (vu < 0) {
          const nevel = Math.max(0, 1 + vu * 12);
          R = mix(mix(grondDonker[0], grondDag[0], dag), R, nevel * 0.6); G = mix(mix(grondDonker[1], grondDag[1], dag), G, nevel * 0.6); B = mix(mix(grondDonker[2], grondDag[2], dag), B, nevel * 0.6);
        }
        const o = (j * GW + i) * 4;
        px[o] = R; px[o + 1] = G; px[o + 2] = B; px[o + 3] = 255;
      }
    }
    rc.putImageData(this.beeld, 0, 0);
    }
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    c.drawImage(this.raster, 0, 0, w, h);

    const zoom = Math.min(2.4, Math.max(0.8, Math.sqrt(95 / fov)));
    const namen = [], vrij = [];
    // ---------- lijnen van sterrenbeelden ----------
    if (lagen.lijnen !== false || lagen.beeldNamen !== false) {
      c.lineWidth = 0.9;
      c.strokeStyle = `rgba(181,177,229,${0.32 * (1 - dag * 0.6)})`;
      for (const b of this.lijnen) {
        let sx = 0, sy = 0, n = 0;
        if (lagen.lijnen !== false) c.beginPath();
        for (const l of b.lijnen) {
          let vorige = null;
          for (const v of l) {
            const p = v[2] > -0.05 ? proj(v, 0) : null;
            if (p && vorige && lagen.lijnen !== false && Math.hypot(p[0] - vorige[0], p[1] - vorige[1]) < w) { c.moveTo(vorige[0], vorige[1]); c.lineTo(p[0], p[1]); }
            if (p && v[2] > 0.02) { sx += p[0]; sy += p[1]; n++; }
            vorige = p;
          }
        }
        if (lagen.lijnen !== false) c.stroke();
        if (lagen.beeldNamen !== false && n > 2) { const x = sx / n, y = sy / n; if (zichtbaar(x, y, -10)) namen.push([b.nl, x, y, 6, `500 ${11 * Math.min(1.3, zoom)}px Geist, sans-serif`, "rgba(181,177,229,.7)", "center"]); }
      }
    }

    // ---------- sterren: kleur, helderheid, twinkelen, vager bij de horizon en overdag ----------
    const sterLicht = 1 - dag * 0.92;
    const tw = beweging ? tijd / 1000 : 0;
    for (let i = 0, n = this.sterren.length; i < n; i++) {
      const vu = this.sv[i * 3 + 2];
      if (vu < -0.01) continue;
      const p = proj([this.sv[i * 3], this.sv[i * 3 + 1], vu], 0);
      if (!p || !zichtbaar(p[0], p[1], 4)) continue;
      const s = this.sterren[i], mag = s[2], hoogte = Math.asin(vu) / rad;
      const atm = 0.2 + 0.8 * glad(0, 18, hoogte);
      const flikker = beweging ? 1 - (0.18 + 0.3 * (1 - hoogte / 90)) * (0.5 + 0.5 * Math.sin(tw * (2.3 + (i % 7) * 0.9) + i * 1.7)) * (mag < 2.5 ? 1 : 0.6) : 1;
      const a = Math.min(1, (1.25 - mag * 0.17)) * atm * sterLicht * flikker;
      if (a < 0.03) continue;
      const rr = Math.max(0.55, (3.4 - mag * 0.62) * zoom);
      const [R, G, B] = sterKleur(s[3]);
      if (mag < 1.8) { c.globalAlpha = a * 0.55; const g = rr * 7; c.drawImage(this.gloed, p[0] - g, p[1] - g, 2 * g, 2 * g); }
      c.globalAlpha = a;
      c.fillStyle = `rgb(${R},${G},${B})`;
      if (rr < 1.1) c.fillRect(p[0] - rr, p[1] - rr, rr * 2, rr * 2);
      else { c.beginPath(); c.arc(p[0], p[1], rr, 0, 2 * Math.PI); c.fill(); }
      if (lagen.sterNamen !== false && s[4] && mag < 1.4 + Math.max(0, zoom - 1) * 1.5) namen.push([s[4], p[0] + rr + 4, p[1] - 3, 4, `500 ${10.5 * Math.min(1.3, zoom)}px Geist, sans-serif`, "rgba(255,255,255,.62)", "left", p[0] - rr - 4, p[0], p[1]]);
    }
    c.globalAlpha = 1;

    // ---------- zon, maan, planeten ----------
    const plekken = [];
    const verborgen = (it) => it.p.hoogte < randHoogte(it.p.az) - 0.2;
    for (const o of this.lichamen) {
      const { it, p: pos, v } = o;
      if (pos.hoogte < -1 && it.slug !== markeer) continue;
      const p = proj(v, 0);
      if (!p || !zichtbaar(p[0], p[1], 40)) continue;
      const hier = it.slug === markeer, onder = pos.hoogte < 0;
      let rr;
      if (onder) { // alleen het gemarkeerde hemellichaam, als een stippellijntje onder de grond
        c.save(); c.setLineDash([3, 4]); c.strokeStyle = PAARS; c.lineWidth = 1.5; c.beginPath(); c.arc(p[0], p[1], 10, 0, 2 * Math.PI); c.stroke(); c.restore();
        namen.push([`${it.titel} (onder de horizon)`, p[0] + 16, p[1] + 4, 0, "600 13px Geist, sans-serif", PAARS, "left", p[0] - 16]);
        plekken.push({ slug: it.slug, x: p[0], y: p[1], r: 22 });
        continue;
      }
      if (it.ae === "Sun") {
        rr = Math.max(10, 0.27 * pxPerGraad);
        c.globalAlpha = 0.9; const g = rr * 9; c.drawImage(this.gloed, p[0] - g, p[1] - g, 2 * g, 2 * g); c.globalAlpha = 1;
        c.fillStyle = "#FFF4DA"; c.beginPath(); c.arc(p[0], p[1], rr, 0, 2 * Math.PI); c.fill();
      } else if (it.ae === "Moon") {
        rr = Math.max(11, 0.26 * pxPerGraad);
        const verl = (1 - Math.cos(this.maan.hoek * rad)) / 2;
        c.globalAlpha = 0.25 + verl * 0.6; const g = rr * (4 + verl * 5); c.drawImage(this.gloed, p[0] - g, p[1] - g, 2 * g, 2 * g); c.globalAlpha = 1;
        // de verlichte kant wijst naar de zon
        const ps = proj(this.zon.v, -0.99);
        let hoekZon = 0;
        if (ps) hoekZon = Math.atan2(ps[1] - p[1], ps[0] - p[0]);
        else { const t2 = [sv[0] - v[0], sv[1] - v[1], sv[2] - v[2]]; hoekZon = Math.atan2(-(t2[0] * u[0] + t2[1] * u[1] + t2[2] * u[2]), t2[0] * r[0] + t2[1] * r[1] + t2[2] * r[2]); }
        maanTekenen(c, p[0], p[1], rr, this.maan.hoek, hoekZon);
      } else {
        const ster = it.soort === "ster";
        rr = (ster ? 2.6 : 3.6) * Math.min(1.6, zoom);
        const kleur = ster ? "#FFFFFF" : PLANEETKLEUR[it.ae] || "#FFFFFF";
        if (!ster) { c.globalAlpha = 0.7 * (1 - dag * 0.7); const g = rr * 6; c.drawImage(this.gloed, p[0] - g, p[1] - g, 2 * g, 2 * g); c.globalAlpha = 1; }
        c.fillStyle = kleur; c.beginPath(); c.arc(p[0], p[1], rr, 0, 2 * Math.PI); c.fill();
      }
      if (hier) { c.strokeStyle = PAARS; c.lineWidth = 2; c.beginPath(); c.arc(p[0], p[1], rr + 8, 0, 2 * Math.PI); c.stroke(); }
      vrij.push([p[0] - rr - 2, p[1] - rr - 2, 2 * rr + 4, 2 * rr + 4]);
      if (!verborgen(o)) {
        const ster = it.soort === "ster" && it.ae !== "Sun";
        namen.push([it.titel, p[0] + rr + 6, p[1] + 4, hier ? 0 : ster ? 2 : 1, `${hier ? 600 : 500} ${hier ? 15 : ster ? 12 : 13.5}px Geist, sans-serif`, hier ? PAARS : "#FFFFFF", "left", p[0] - rr - 6]);
        plekken.push({ slug: it.slug, x: p[0], y: p[1], r: rr + 16 });
      }
    }

    // ---------- de rand: bomen, huizen, de kerk en de molen ----------
    const randKleur = `rgb(${Math.round(mix(5, 30, dag))},${Math.round(mix(7, 36, dag))},${Math.round(mix(6, 28, dag))})`;
    c.fillStyle = randKleur; c.strokeStyle = randKleur;
    if (lagen.rand !== false) {
      c.beginPath();
      const stap = 0.5, onderkant = -14;
      for (let az = 0; az < 360; az += stap) {
        const a = proj(vec(az, randHoogte(az)), -0.6), b = proj(vec(az + stap, randHoogte(az + stap)), -0.6);
        const d1 = proj(vec(az + stap, onderkant), -0.6), d0 = proj(vec(az, onderkant), -0.6);
        if (!a || !b || !d0 || !d1) continue;
        if (Math.max(a[0], b[0], d0[0], d1[0]) < -50 || Math.min(a[0], b[0], d0[0], d1[0]) > w + 50 || Math.max(a[1], b[1], d0[1], d1[1]) < -50 || Math.min(a[1], b[1], d0[1], d1[1]) > h + 50) continue;
        c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d1[0], d1[1]); c.lineTo(d0[0], d0[1]); c.closePath();
      }
      c.fill(); c.lineWidth = 0.8; c.stroke();
      // de wieken van de molen draaien langzaam
      const naaf = proj(vec(MOLEN.az, MOLEN.hoogte + 0.3), 0.05);
      if (naaf) {
        const hoek0 = beweging ? tijd / 1000 * 0.5 : 0.4, breed = Math.max(1.5, 0.22 * pxPerGraad);
        c.lineWidth = breed; c.lineCap = "round";
        for (let k = 0; k < 4; k++) {
          const a = hoek0 + (k * Math.PI) / 2;
          const tip = proj(vec(MOLEN.az + (MOLEN.wiek * Math.cos(a)) / Math.cos((MOLEN.hoogte * rad)), MOLEN.hoogte + 0.3 + MOLEN.wiek * Math.sin(a)), 0);
          if (tip) { c.beginPath(); c.moveTo(naaf[0], naaf[1]); c.lineTo(tip[0], tip[1]); c.stroke(); }
        }
        c.lineCap = "butt";
      }
    }

    // ---------- namen, zonder overlap ----------
    if (lagen.namen === false) namen.length = 0; // de kop van de homepage: geen namen door de tekst heen
    namen.sort((a, b) => a[3] - b[3]);
    c.textBaseline = "alphabetic"; c.textAlign = "left";
    for (const [tekst, x, y, , letter, kleur, uitlijning, links, bx, by] of namen) {
      if (bx != null && plekken.some((q) => Math.hypot(q.x - bx, q.y - by) < 8)) continue; // die ster heeft al een Nederlandse naam
      c.font = letter;
      const b = c.measureText(tekst).width, hh = parseFloat(letter.split(" ")[1]) || 11;
      const plekjes = uitlijning === "center" ? [x - b / 2] : [x, links != null ? links - b : null].filter((v) => v != null);
      for (const x0 of plekjes) {
        const vak = [x0 - 1, y - hh, b + 3, hh + 4];
        if (x0 < 4 || x0 + b > w - 4 || y - hh < 4 || y > h - 4) continue;
        if (vrij.some((v) => vak[0] < v[0] + v[2] && v[0] < vak[0] + vak[2] && vak[1] < v[1] + v[3] && v[1] < vak[1] + vak[3])) continue;
        vrij.push(vak);
        c.fillStyle = "rgba(0,0,0,.35)"; c.fillText(tekst, x0 + 0.5, y + 1);
        c.fillStyle = kleur; c.fillText(tekst, x0, y);
        break;
      }
    }

    // ---------- windrichtingen op de grond ----------
    c.textAlign = "center"; c.textBaseline = "middle";
    const kijk = ((Math.round(yaw / 90) * 90) % 360 + 360) % 360;
    for (const [az, l] of [[0, "N"], [45, "NO"], [90, "O"], [135, "ZO"], [180, "Z"], [225, "ZW"], [270, "W"], [315, "NW"]]) {
      const p = proj(vec(az, -4.5), 0.1);
      if (!p || !zichtbaar(p[0], p[1], -10)) continue;
      const groot = l.length === 1;
      c.font = `${groot ? 600 : 500} ${groot ? 15 : 11}px Geist, sans-serif`;
      c.fillStyle = groot && az === kijk ? PAARS : groot ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.5)";
      c.fillText(l, p[0], p[1]);
    }
    c.textBaseline = "alphabetic";

    this.plekken = plekken;
    doek.plekken = plekken;
    doek.zonHoogte = zonH;
  }
}

// de maan met zijn schijngestalte; hoek: 0 = nieuw, 180 = vol; hoekZon: richting op het scherm naar de zon
function maanTekenen(c, x, y, r, hoek, hoekZon) {
  c.save();
  c.translate(x, y); c.rotate(hoekZon);
  c.fillStyle = "#2A2C33"; c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.fill();
  const k = Math.cos(hoek * rad), licht = "#F2F0EA";
  c.fillStyle = licht;
  c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); c.fill(); // de helft aan de kant van de zon
  c.beginPath(); c.ellipse(0, 0, Math.abs(k) * r + 0.3, r + 0.3, 0, 0, 2 * Math.PI);
  c.fillStyle = k > 0 ? "#2A2C33" : licht; // sikkel: hap eruit; bijna vol: erbij
  if (k > 0) { c.save(); c.beginPath(); c.rect(0, -r - 1, r + 1, 2 * r + 2); c.clip(); c.beginPath(); c.ellipse(0, 0, Math.abs(k) * r, r + 0.5, 0, 0, 2 * Math.PI); c.fill(); c.restore(); }
  else c.fill();
  c.restore();
}
