// De vogel in 3D, als schets. De vorm komt uit gemeten maten (AVONET): snavel, vleugel, staart, loopbeen en gewicht,
// gemiddeld over museumvogels van die soort. Er is geen foto of plaat in 3D omgezet; het is een bouwtekening.
// Sleep om rond te draaien. Speelt er geluid, dan gaat de snavel open op de maat van de opname.
import * as G from "./geluid.js";

let matenKlus = null;
export function maten() {
  if (!matenKlus) matenKlus = fetch("/data/maten.json").then((r) => r.json()).catch(() => { matenKlus = null; return {}; });
  return matenKlus;
}

const HOUDING = { Insessorial: 0.55, Generalist: 0.42, Aerial: 0.42, Terrestrial: 0.24, Aquatic: 0.06 };
const rustig = matchMedia("(prefers-reduced-motion: reduce)");

// kleine vectorhulp
const draaiZ = ([x, y, z], h) => [x * Math.cos(h) - y * Math.sin(h), x * Math.sin(h) + y * Math.cos(h), z];
const plus = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const maal = (a, f) => [a[0] * f, a[1] * f, a[2] * f];

function willekeur(zaad) {
  let s = zaad >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Bouwt de vogel op uit streken. Elke streek: punten (mm, wereld), normaal (of null), soort, en of hij met de snavel meebeweegt.
export function bouwVogel(m, zaad = 1) {
  const [Ls, Bs, Ds, T, W, K, St, M, leef] = m;
  const rnd = willekeur(zaad);
  // het lijf: inhoud uit het gewicht, lengte zo dat de opgevouwen vleugel er ongeveer langs past
  const inhoud = M * 1400;
  const rond = Math.cbrt(inhoud / 6.03);
  const a = Math.max(1.45 * rond, W * 0.42);
  const b = Math.sqrt(inhoud / ((4 / 3) * Math.PI * a * 0.9)), c = 0.9 * b;
  const rh = Math.max(Ds * 0.75, 0.55 * b * Math.pow(16 / b, 0.25));
  const nek = b * (0.25 + Math.max(0, T / b - 1.6) * 2.5);
  const p = HOUDING[leef] ?? 0.35;
  const water = leef === "Aquatic";
  const tak = leef === "Insessorial" || leef === "Generalist" || leef === "Aerial";
  const streken = [];
  const maatlijnen = [];

  // waar staat het lijf: zo hoog dat het loopbeen eronder past (of half in het water)
  const heupL = [a * 0.05, -b * 0.78, 0];
  const heupY = draaiZ(heupL, p)[1];
  const H = water ? b * 0.35 : T * 0.92 + b * 0.22 - heupY;
  const lijf = (v) => plus(draaiZ(v, p), [0, H, 0]);
  const lijfN = (n) => draaiZ(n, p);

  function ellipsoide(midden, ax, by, cz, hoek, aantal, soort, naarWereld = (v) => v, naarWereldN = (n) => n) {
    const pt = (u, v) => plus(midden, draaiZ([ax * Math.cos(u), by * Math.sin(u) * Math.cos(v), cz * Math.sin(u) * Math.sin(v)], hoek));
    const nm = (u, v) => { const n = draaiZ([Math.cos(u) / ax, (Math.sin(u) * Math.cos(v)) / by, (Math.sin(u) * Math.sin(v)) / cz], hoek); const l = Math.hypot(...n); return maal(n, 1 / l); };
    // veren: korte streken van voor naar achter
    for (let i = 0; i < aantal; i++) {
      const u = 0.12 + rnd() * (Math.PI - 0.24), v = rnd() * Math.PI * 2, du = 0.22 + rnd() * 0.18;
      const pts = [];
      for (let k = 0; k < 4; k++) pts.push(naarWereld(pt(u + (du * k) / 3, v + (rnd() - 0.5) * 0.05)));
      streken.push({ pts, n: naarWereldN(nm(u + du / 2, v)), soort });
    }
    // een paar ringen, in boogjes, zodat de vorm leesbaar blijft
    for (const u of [0.55, 1.2, 1.9, 2.55]) {
      for (let s = 0; s < 10; s++) {
        const pts = [];
        for (let k = 0; k <= 4; k++) pts.push(naarWereld(pt(u, ((s + k / 4) / 10) * Math.PI * 2)));
        streken.push({ pts, n: naarWereldN(nm(u, ((s + 0.5) / 10) * Math.PI * 2)), soort: "ring" });
      }
    }
  }

  // lijf
  ellipsoide([0, 0, 0], a, b, c, 0, Math.round(260 + b * 2), "veer", lijf, lijfN);

  // nek en kop: de kop blijft ongeveer rechtop, ook als het lijf schuin staat
  const nekBegin = lijf([a * 0.7, b * 0.45, 0]);
  const kopM = plus(nekBegin, [rh * 0.55 + nek * 0.35, nek + rh * 0.35, 0]);
  if (nek > rh * 0.6) {
    const mid = maal(plus(nekBegin, kopM), 0.5), d = [kopM[0] - nekBegin[0], kopM[1] - nekBegin[1]];
    ellipsoide(mid, Math.hypot(...d) / 2 + rh * 0.3, rh * 0.62, rh * 0.62, Math.atan2(d[1], d[0]), 160, "veer");
  }
  ellipsoide(kopM, rh * 1.08, rh, rh * 0.95, -0.05, 150, "veer");
  for (const s of [-1, 1]) streken.push({ pts: [plus(kopM, [rh * 0.42, rh * 0.22, s * rh * 0.84])], n: [0.35, 0.2, s * 0.9], soort: "oog" });

  // snavel: bovensnavel vast, ondersnavel draait open met het geluid
  const beta = -0.06;
  const richting = [Math.cos(beta), Math.sin(beta), 0];
  const basis = plus(kopM, maal(richting, rh * 0.82));
  const lengte = Math.max(4, Ls * 0.88);
  const punt = plus(basis, maal(richting, lengte));
  const rand = (phi) => plus(basis, draaiZ([0, (Ds / 2) * Math.sin(phi), (Bs / 2) * Math.cos(phi)], beta));
  for (let i = 0; i <= 8; i++) {
    const phi = (i / 8) * Math.PI;
    streken.push({ pts: [rand(phi), punt], n: null, soort: "snavel" });
    streken.push({ pts: [rand(-phi), plus(basis, maal(richting, lengte * 0.96))], n: null, soort: "snavel", onder: true });
  }
  const ring = [];
  for (let i = 0; i <= 16; i++) ring.push(rand((i / 16) * Math.PI * 2));
  streken.push({ pts: ring, n: null, soort: "snavel" });
  maatlijnen.push({ van: basis, naar: punt, tekst: `snavel ${fmt(Ls)} mm`, kant: [0, 1, 0] });

  // vleugels, opgevouwen langs het lijf. Kipp-afstand: hoe ver de handpennen voorbij de armpennen steken
  const ts = Math.max(0.3, Math.min(0.9, (W - K) / W));
  let vleugelMaat = null;
  for (const s of [-1, 1]) {
    const zOp = (x, y) => {
      const q = 1 - (x / a) ** 2 - (y / b) ** 2;
      return s * Math.max(c * 0.22, (q > 0 ? c * Math.sqrt(q) : 0) + 1.2);
    };
    const wpt = (t, rel) => {
      const x = a * 0.5 - W * 0.97 * t;
      const koorde = W * 0.3 * Math.pow(1 - t, 0.6) + 1;
      const y = b * 0.4 + b * 0.12 * Math.sin(Math.PI * t) - b * 0.38 * t + koorde * rel;
      return lijf([x, y, zOp(x, y) * (1 + 0.04 * (rel + 0.65))]);
    };
    const n = lijfN([0, 0.25, s]);
    const lijn = (t0, t1, r0, r1, soort = "vleugel") => { const pts = []; for (let k = 0; k <= 5; k++) { const t = t0 + ((t1 - t0) * k) / 5; pts.push(wpt(t, r0 + ((r1 - r0) * k) / 5)); } streken.push({ pts, n, soort }); };
    lijn(0, 1, 0.35, 0, "rand"); lijn(0, 1, -0.65, 0, "rand");
    for (let i = 0; i < 7; i++) { const t = 0.12 + (i / 7) * (ts - 0.18); lijn(t, Math.min(ts, t + 0.16), 0.3, -0.6); }
    for (let i = 0; i < 8; i++) { const t0 = ts - 0.2 + i * 0.012, t1 = ts + ((1 - ts) * (i + 1)) / 8; lijn(t0, t1, 0.1 - i * 0.07, 0); }
    for (let i = 0; i < 14; i++) { const t = rnd() * ts * 0.7, r = 0.3 - rnd() * 0.5; lijn(t, t + 0.06, r, r - 0.08, "veer"); }
    if (s === 1) vleugelMaat = { van: wpt(0, 0.35), naar: wpt(1, 0), tekst: `vleugel ${fmt(W)} mm`, kant: lijfN([0, 1, 0]) };
  }
  maatlijnen.push(vleugelMaat);

  // staart: een waaier van pennen
  const sBasis = lijf([-a * 0.82, -b * 0.08, 0]);
  const sRicht = draaiZ([-Math.cos(0.12), -Math.sin(0.12), 0], p);
  const breedBasis = c * 0.35, breedEind = Math.max(c * 0.4, St * 0.24);
  for (let i = 0; i < 12; i++) {
    const f = i / 11 - 0.5, l = St * (1 - Math.abs(f) * 0.18);
    const van = plus(sBasis, [0, 0, f * 2 * breedBasis]);
    const naar = plus(plus(sBasis, maal(sRicht, l)), [0, -Math.abs(f) * St * 0.05, f * 2 * breedEind]);
    streken.push({ pts: [van, maal(plus(van, naar), 0.5), naar], n: lijfN([0, 1, 0]), soort: "vleugel" });
  }
  maatlijnen.push({ van: sBasis, naar: plus(sBasis, maal(sRicht, St)), tekst: `staart ${fmt(St)} mm`, kant: [0, -1, 0] });

  // poten, tak of grond
  const bodem = 0;
  if (!water) {
    for (const s of [-1, 1]) {
      const heup = lijf([heupL[0], heupL[1], s * c * 0.42]);
      const voet = [heup[0] + T * 0.05, bodem, s * c * 0.42];
      const hiel = [heup[0] - T * 0.28, T * 0.9, s * c * 0.46];
      streken.push({ pts: [heup, hiel], n: null, soort: "poot" });
      streken.push({ pts: [hiel, voet], n: null, soort: "poot" });
      for (const h of [-0.4, 0, 0.4]) streken.push({ pts: [voet, plus(voet, [Math.cos(h) * T * 0.48, 0, Math.sin(h) * T * 0.48])], n: null, soort: "poot" });
      streken.push({ pts: [voet, plus(voet, [-T * 0.3, 0, 0])], n: null, soort: "poot" });
      if (s === 1) maatlijnen.push({ van: hiel, naar: voet, tekst: `loopbeen ${fmt(T)} mm`, kant: [1, 0, 0] });
    }
  }

  // omvang, voor het passend maken op het scherm
  let maxR = 0, maxY = 0;
  for (const s of streken) for (const q of s.pts) { maxR = Math.max(maxR, Math.hypot(q[0], q[2])); maxY = Math.max(maxY, q[1]); }
  return { streken, maatlijnen, maxR, maxY, tak, water, T, M, lengte: Math.round(lengteVan(streken) / 10) };
}

function lengteVan(streken) {
  let lo = Infinity, hi = -Infinity;
  for (const s of streken) for (const q of s.pts) { lo = Math.min(lo, q[0]); hi = Math.max(hi, q[0]); }
  return hi - lo;
}
const fmt = (v) => (v >= 100 ? Math.round(v) : String(Math.round(v * 10) / 10).replace(".", ","));

export class Rondom {
  constructor(paneel, soort, m) {
    this.paneel = paneel;
    this.doek = paneel.querySelector("canvas");
    this.ctx = this.doek.getContext("2d");
    this.vogel = bouwVogel(m, soort.key % 9973);
    this.gier = -0.9;          // draaiing om de verticale as
    this.kijk = 0.22;          // hoe hoog je kijkt
    this.snelheid = 0;
    this.sleept = false;
    this.rustSinds = 0;
    this.loopt = false;
    this.maten = true;
    this.inkt = getComputedStyle(document.documentElement).getPropertyValue("--inkt").trim() || "#1F1B18";
    this.papier = getComputedStyle(document.documentElement).getPropertyValue("--papier").trim() || "#FBFAF7";
    this.rood = getComputedStyle(document.documentElement).getPropertyValue("--rood").trim() || "#1F1B18";
    new ResizeObserver(() => { this.maat(); this.wek(); }).observe(paneel);

    let vorige = null;
    this.doek.addEventListener("pointerdown", (e) => { this.sleept = true; vorige = e; this.doek.setPointerCapture(e.pointerId); this.paneel.classList.add("gedraaid"); });
    this.doek.addEventListener("pointermove", (e) => {
      if (!this.sleept || !vorige) return;
      const dx = e.clientX - vorige.clientX, dy = e.clientY - vorige.clientY;
      this.gier += dx * 0.011;
      this.snelheid = dx * 0.011;
      this.kijk = Math.max(-0.1, Math.min(0.75, this.kijk + dy * 0.006));
      vorige = e;
      this.wek();
    });
    const los = () => { this.sleept = false; vorige = null; this.rustSinds = performance.now(); };
    this.doek.addEventListener("pointerup", los);
    this.doek.addEventListener("pointercancel", los);
    G.opVerandering((st) => { if (st.speelt) this.wek(); });
  }

  start() { this.maat(); this.rustSinds = performance.now(); this.wek(); }

  maat() {
    const r = this.doek.getBoundingClientRect();
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.doek.width = Math.max(1, Math.round(r.width * this.dpr));
    this.doek.height = Math.max(1, Math.round(r.height * this.dpr));
  }

  wek() {
    if (this.loopt || this.paneel.hidden) return;
    this.loopt = true;
    this.vorigeTijd = performance.now();
    requestAnimationFrame((t) => this.stap(t));
  }

  stap(nu) {
    if (this.paneel.hidden || !this.doek.isConnected) { this.loopt = false; return; }
    const dt = Math.min(0.05, (nu - this.vorigeTijd) / 1000);
    this.vorigeTijd = nu;
    if (!this.sleept) {
      // na loslaten even doordraaien, daarna langzaam vanzelf rond
      this.snelheid *= 0.92;
      this.gier += this.snelheid;
      if (!rustig.matches && nu - this.rustSinds > 1500) this.gier += dt * 0.32;
    }
    this.teken(rustig.matches ? 0 : G.niveau());
    const beweegt = this.sleept || Math.abs(this.snelheid) > 0.0005 || !rustig.matches || G.speelt();
    if (beweegt) requestAnimationFrame((t) => this.stap(t)); else this.loopt = false;
  }

  teken(zang) {
    const { streken, maatlijnen, maxR, maxY, tak, water, T } = this.vogel;
    const W = this.doek.width, Hd = this.doek.height, c = this.ctx, dpr = this.dpr;
    const smal = W / dpr < 600;
    const schaal = Math.min((W * (smal ? 0.82 : 0.72)) / (2 * maxR), (Hd * 0.84) / (maxY + maxR * Math.sin(this.kijk) + 1));
    const cx = W / 2, cy = Hd * 0.92 - maxR * Math.sin(this.kijk) * schaal * 0.5;
    const cg = Math.cos(this.gier), sg = Math.sin(this.gier), ck = Math.cos(this.kijk), sk = Math.sin(this.kijk);
    const f = maxR * 7;
    const open = zang * 0.42;
    const proj = (q) => {
      const x1 = q[0] * cg + q[2] * sg, z1 = -q[0] * sg + q[2] * cg;
      const y2 = q[1] * ck - z1 * sk, z2 = q[1] * sk + z1 * ck;
      const s = f / (f - z2);
      return [cx + x1 * s * schaal, cy - y2 * s * schaal, z2];
    };
    const draaiN = (n) => { const z1 = -n[0] * sg + n[2] * cg; return n[1] * sk + z1 * ck; };

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, Hd);
    c.lineCap = "round"; c.lineJoin = "round";

    // grond, tak of water, met een stippelcirkel om rond te lopen zoals bij de bomen
    c.save();
    const omtrek = [];
    for (let i = 0; i <= 64; i++) { const h = (i / 64) * Math.PI * 2; omtrek.push(proj([Math.cos(h) * maxR * 1.15, 0, Math.sin(h) * maxR * 1.15])); }
    c.setLineDash([4 * dpr, 6 * dpr]); c.strokeStyle = this.inkt; c.globalAlpha = 0.35; c.lineWidth = dpr;
    c.beginPath(); omtrek.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    c.setLineDash([]);
    const schaduw = c.createRadialGradient(cx, cy, 0, cx, cy, maxR * schaal * 0.7);
    schaduw.addColorStop(0, "rgb(31 27 22 / .16)"); schaduw.addColorStop(1, "rgb(31 27 22 / 0)");
    c.globalAlpha = 1; c.fillStyle = schaduw;
    c.beginPath(); c.ellipse(cx, cy, maxR * schaal * 0.7, maxR * schaal * 0.7 * Math.max(0.12, sk), 0, 0, Math.PI * 2); c.fill();
    if (tak) {
      // een takje: twee lijnen en wat schors
      c.globalAlpha = 0.55; c.lineWidth = dpr;
      const r = T * 0.11, L = maxR * 0.75;
      for (const dy of [0, -2 * r]) {
        const [x0, y0] = proj([T * 0.08, dy, -L]), [x1, y1] = proj([T * 0.08, dy, L]);
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.globalAlpha = 0.3;
      for (let i = 0; i < 14; i++) {
        const z = -L + ((i + 0.5) / 14) * 2 * L, [x0, y0] = proj([T * 0.08, -r * 0.4, z]), [x1, y1] = proj([T * 0.08, -r * 1.6, z + r * 1.2]);
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
    }
    if (water) {
      c.globalAlpha = 0.4; c.lineWidth = dpr;
      for (const r of [0.75, 0.95, 1.1]) {
        c.beginPath();
        for (let i = 0; i <= 48; i++) { const h = (i / 48) * Math.PI * 2; const [x, y] = proj([Math.cos(h) * maxR * r, 0, Math.sin(h) * maxR * r * 0.8]); i ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
      }
    }
    c.restore();

    // streken van achter naar voor; randen donker, wat naar je toe of van je af wijst licht
    const lijst = [];
    for (const s of streken) {
      let pts = s.pts;
      if (s.onder && open) {
        const [b0] = pts; // scharnier bij de snavelbasis
        pts = pts.map((q, i) => (i === 0 ? q : plus(b0, draaiZ([q[0] - b0[0], q[1] - b0[1], q[2] - b0[2]], -open))));
      }
      const pp = pts.map(proj);
      let z = 0;
      for (const q of pp) z += q[2];
      lijst.push({ s, pp, z: z / pp.length });
    }
    lijst.sort((p, q) => p.z - q.z);
    const keel = zang * 0.9;
    for (const { s, pp } of lijst) {
      let alpha, breed = 1;
      if (s.n) {
        const v = draaiN(s.n), sil = 1 - Math.abs(v);
        const bereik = { veer: [0.1, 0.85, 1.6], ring: [0.03, 0.5, 2.2], vleugel: [0.35, 0.8, 1], rand: [0.6, 0.95, 1], oog: [0.9, 1, 1] }[s.soort] || [0.2, 0.8, 1];
        alpha = bereik[0] + (bereik[1] - bereik[0]) * Math.pow(sil, bereik[2]);
        if (v < 0) alpha *= s.soort === "oog" ? 0 : 0.4;
        breed = 0.8 + sil * 0.7;
      } else alpha = s.soort === "snavel" ? 0.85 : 0.8;
      if (water && s.pts[0][1] < 0) alpha *= 0.25;
      if (alpha < 0.02) continue;
      c.globalAlpha = alpha;
      if (s.soort === "oog") {
        c.fillStyle = this.inkt;
        c.beginPath(); c.arc(pp[0][0], pp[0][1], Math.max(1.6 * dpr, schaal * 1.6), 0, Math.PI * 2); c.fill();
        continue;
      }
      c.strokeStyle = this.inkt;
      c.lineWidth = breed * dpr * (s.soort === "poot" ? 1.6 : 1);
      c.beginPath();
      pp.forEach(([x, y], i) => {
        const tril = keel && s.soort === "veer" ? Math.sin(performance.now() / 22 + x) * keel : 0;
        i ? c.lineTo(x, y + tril) : c.moveTo(x, y + tril);
      });
      c.stroke();
    }

    // maatlijnen gestippeld, zoals op een bouwtekening
    if (this.maten) {
      c.globalAlpha = 0.9; c.strokeStyle = this.rood; c.fillStyle = this.rood; c.lineWidth = dpr; c.setLineDash([3 * dpr, 3 * dpr]);
      c.font = `500 ${11 * dpr}px "Geist Mono", ui-monospace, monospace`;
      for (const ml of maatlijnen) {
        if (!ml) continue;
        const [x0, y0] = proj(ml.van), [x1, y1] = proj(ml.naar);
        const d = Math.hypot(x1 - x0, y1 - y0);
        if (d < 14 * dpr) continue;
        const nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
        const kant = proj(plus(ml.van, ml.kant)), naarBuiten = (kant[0] - x0) * nx + (kant[1] - y0) * ny >= 0 ? 1 : -1;
        const o = 9 * dpr * naarBuiten;
        c.beginPath();
        c.moveTo(x0 + nx * o, y0 + ny * o); c.lineTo(x1 + nx * o, y1 + ny * o);
        for (const [x, y] of [[x0, y0], [x1, y1]]) { c.moveTo(x + nx * (o - 4 * dpr * naarBuiten), y + ny * (o - 4 * dpr * naarBuiten)); c.lineTo(x + nx * (o + 4 * dpr * naarBuiten), y + ny * (o + 4 * dpr * naarBuiten)); }
        c.stroke();
        const mx = (x0 + x1) / 2 + nx * o * 2.6, my = (y0 + y1) / 2 + ny * o * 2.6;
        c.textAlign = "center"; c.textBaseline = "middle";
        c.save(); c.globalAlpha = 0.85; c.strokeStyle = this.papier; c.lineWidth = 4 * dpr; c.strokeText(ml.tekst, mx, my); c.restore();
        c.fillText(ml.tekst, mx, my);
      }
    }

    c.setLineDash([]);
    // liniaal rechts, vast op het scherm: echte centimeters
    c.globalAlpha = 0.55; c.strokeStyle = this.inkt; c.fillStyle = this.inkt; c.lineWidth = dpr;
    const lx = smal ? W - 18 * dpr : Math.min(W - 40 * dpr, cx + maxR * schaal * 1.25);
    const hoogteMm = (cy - 30 * dpr) / schaal;
    const stap = [5, 10, 20, 50, 100, 200, 500].find((s) => (s * schaal) / dpr > 9) || 1000;
    const label = stap * 5;
    c.beginPath(); c.moveTo(lx, cy); c.lineTo(lx, cy - Math.min(hoogteMm, maxY * 1.25) * schaal); c.stroke();
    c.font = `500 ${10 * dpr}px "Geist Mono", ui-monospace, monospace`; c.textAlign = "left"; c.textBaseline = "middle";
    for (let mm = 0; mm <= Math.min(hoogteMm, maxY * 1.25); mm += stap) {
      const y = cy - mm * schaal, groot = mm % label === 0;
      c.beginPath(); c.moveTo(lx, y); c.lineTo(lx - (groot ? 8 : 4) * dpr, y); c.stroke();
      if (groot && !smal) c.fillText(mm === 0 ? "0" : `${String(mm / 10).replace(".", ",")} cm`, lx + 6 * dpr, y);
    }
    c.globalAlpha = 1;
  }
}
