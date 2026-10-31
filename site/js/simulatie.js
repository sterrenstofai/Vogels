// "Twente in vogels": een simulatie op een donkere kaart.
// Elke stip staat voor een vast aantal meldingen van één soort in één vak in de gekozen maand.
// De plek binnen het vak en de bewegingen zijn verzonnen; een stip verlaat zijn vak nooit.

import { VAK } from "./data.js";

export const KLEUREN = {
  zang: "#F4CE5B", kraai: "#B9A3E3", zwaluw: "#9FE6F2", eend: "#5FA2F5", gans: "#B8D0FF", meeuw: "#F5F1E6",
  steltloper: "#E2BE8C", reiger: "#F0B3C6", roof: "#FF6B5E", duif: "#C8B7DA", specht: "#86D98F", overig: "#F5A35C",
};
export const GROEPNAMEN = {
  zang: "Zangvogels", kraai: "Kraaien", zwaluw: "Zwaluwen", eend: "Eenden en futen", gans: "Ganzen en zwanen",
  meeuw: "Meeuwen", steltloper: "Steltlopers", reiger: "Reigers en kraanvogels", roof: "Roofvogels en uilen",
  duif: "Duiven", specht: "Spechten", overig: "Overige",
};
const GEDRAG = { zang: "springen", specht: "springen", overig: "springen", kraai: "lopen", duif: "lopen", eend: "drijven",
  gans: "zwerm", steltloper: "zwerm", meeuw: "zweven", roof: "cirkelen", zwaluw: "jagen", reiger: "staan" };

const COS = Math.cos(52.3 * Math.PI / 180);
const rnd = (a, b) => a + Math.random() * (b - a);

export class Simulatie {
  constructor(wrap, { vakken, soorten, basis, kaart, schaal = 20, opTik, opLabels }) {
    this.wrap = wrap;
    this.vakken = vakken; this.soorten = soorten; this.basis = basis; this.kaart = kaart;
    this.schaal = schaal; this.opTik = opTik; this.opLabels = opLabels;
    this.maand = new Date().getMonth();
    this.uit = new Set();          // uitgeschakelde groepen
    this.focus = null;             // soort-key die oplicht
    this.pitch = 38;               // graden
    this.stippen = [];
    this.zwermen = new Map();
    this.pin = null;               // { lat, lon, tekst }
    this.vakEigen = null;

    this.doek = document.createElement("canvas");
    this.doek.className = "sim-doek";
    this.basisDoek = document.createElement("canvas");
    this.vlak = document.createElement("div");
    this.vlak.className = "sim-vlak";
    this.vlak.appendChild(this.doek);
    wrap.appendChild(this.vlak);

    // camera: midden van Twente
    this.cam = { lat: 52.31, lon: 6.72, z: 0 };
    this.maat();
    this.cam.z = this.passendeZoom() * 1.15; // door de kanteling oogt de kaart kleiner
    this.zetPitch(this.pitch);
    this.vulStippen(true);
    this.bediening();
    this.basisVuil = true;
    this.laatste = performance.now();
    this.loop = this.loop.bind(this);
    this.actief = true;
    requestAnimationFrame(this.loop);
    this.zichtbaar = () => { this.actief = !document.hidden; if (this.actief) { this.laatste = performance.now(); requestAnimationFrame(this.loop); } };
    document.addEventListener("visibilitychange", this.zichtbaar);
    this.opMaat = () => { this.maat(); this.basisVuil = true; };
    window.addEventListener("resize", this.opMaat);
  }

  stop() {
    this.actief = false;
    document.removeEventListener("visibilitychange", this.zichtbaar);
    window.removeEventListener("resize", this.opMaat);
  }

  /* ---------- geometrie ---------- */

  maat() {
    const r = this.wrap.getBoundingClientRect();
    this.vw = r.width; this.vh = r.height;
    // het doek is hoger dan het scherm, zodat er bij kanteling geen gat aan de horizon valt
    this.ch = Math.round(this.vh * 2.5);
    this.top = -Math.round(this.vh * 1.4);
    this.oy = Math.round(this.vh * 0.72) - this.top; // oorsprong (camera-midden) in doekcoördinaten
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    for (const c of [this.doek, this.basisDoek]) {
      c.width = Math.round(this.vw * this.dpr);
      c.height = Math.round(this.ch * this.dpr);
    }
    Object.assign(this.doek.style, { width: `${this.vw}px`, height: `${this.ch}px`, top: `${this.top}px` });
    // draaipunt in coördinaten van het vlak (top 0), niet van het doek (dat begint hoger)
    this.vlak.style.transformOrigin = `50% ${Math.round(this.vh * 0.72)}px`;
    this.vlak.style.top = "0px";
    this.P = Math.max(900, this.vh * 1.3);
    this.wrap.style.perspective = `${this.P}px`;
    this.wrap.style.perspectiveOrigin = `50% ${Math.round(this.vh * 0.72)}px`;
  }

  passendeZoom() {
    const t = this.kaart.twente;
    const pts = (t.type === "Polygon" ? [t.coordinates] : t.coordinates).flat(2);
    const breed = (Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]))) * COS;
    const hoog = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
    return Math.min(this.vw / breed, this.vh * 0.9 / hoog) * 0.95;
  }

  zetPitch(p) {
    this.pitch = p;
    this.vlak.style.transform = `rotateX(${p}deg)`;
  }

  // wereld (lon, lat) -> doek (css px)
  naarDoek(lon, lat) {
    return [this.vw / 2 + (lon - this.cam.lon) * COS * this.cam.z, this.oy + (this.cam.lat - lat) * this.cam.z];
  }
  // scherm (css px, t.o.v. wrap) -> wereld, rekening houdend met kanteling en perspectief
  naarWereld(sx, sy) {
    const th = this.pitch * Math.PI / 180, P = this.P;
    const ox = this.vw / 2, oyS = this.vh * 0.72;
    const X = sx - ox, Y = sy - oyS;
    const y = (Y * P) / (P * Math.cos(th) + Y * Math.sin(th));
    const s = P / (P - y * Math.sin(th));
    const x = X / s;
    return [this.cam.lon + x / (COS * this.cam.z), this.cam.lat - y / this.cam.z];
  }
  // wereld -> scherm (voor labels)
  naarScherm(lon, lat) {
    const th = this.pitch * Math.PI / 180, P = this.P;
    const x = (lon - this.cam.lon) * COS * this.cam.z, y = (this.cam.lat - lat) * this.cam.z;
    const s = P / (P - y * Math.sin(th));
    return [this.vw / 2 + x * s, this.vh * 0.72 + y * Math.cos(th) * s, s];
  }

  /* ---------- stippen ---------- */

  telling(vak, soort, m) {
    const rij = this.vakken[vak]?.s[soort];
    if (!rij) return 0;
    const i = Math.floor(m) % 12, j = (i + 1) % 12, f = m - Math.floor(m);
    return rij[i] * (1 - f) + rij[j] * f;
  }

  vulStippen(eerste = false) {
    // per vak en soort het doelaantal stippen; bestaande stippen blijven, overschot vervaagt, tekort komt erbij
    const bestaand = new Map();
    for (const s of this.stippen) {
      if (s.weg) continue;
      const k = s.vak + "|" + s.soort;
      (bestaand.get(k) || bestaand.set(k, []).get(k)).push(s);
    }
    const nieuw = [];
    for (const [vak, v] of Object.entries(this.vakken)) {
      for (const soort of Object.keys(v.s)) {
        const info = this.soorten[soort];
        if (!info) continue;
        const exact = this.telling(vak, soort, this.maand) / this.schaal;
        let doel = Math.floor(exact);
        const k = vak + "|" + soort;
        const lijst = bestaand.get(k) || [];
        // vaste rest per vak/soort, zodat het aantal niet flikkert
        const rest = exact - doel;
        if (rest > (lijst._r ??= hashRnd(k))) doel += 1;
        while (lijst.length > doel) { const s = lijst.pop(); s.weg = true; }
        for (let i = lijst.length; i < doel; i++) nieuw.push(this.maakStip(vak, soort, info, eerste));
      }
    }
    this.stippen = this.stippen.filter((s) => !(s.weg && s.a <= 0)).concat(nieuw);
  }

  maakStip(vak, soort, info, direct) {
    const [la, lo] = vak.split(",").map(Number);
    const gedrag = info.zwerm ? "zwerm" : GEDRAG[info.groep] || "springen";
    const s = {
      vak, soort, groep: info.groep, gedrag, la, lo,
      x: lo + rnd(0.004, VAK - 0.004), y: la + rnd(0.004, VAK - 0.004),
      vx: 0, vy: 0, a: direct ? 1 : 0, weg: false, t: rnd(0, 4), hoek: rnd(0, Math.PI * 2),
    };
    if (gedrag === "cirkelen") { s.cx = s.x; s.cy = s.y; s.r = rnd(0.0012, 0.0035); s.w = rnd(0.25, 0.5) * (Math.random() < 0.5 ? -1 : 1); }
    if (gedrag === "zwerm") {
      const zk = vak + "|" + soort;
      if (!this.zwermen.has(zk)) this.zwermen.set(zk, { x: s.x, y: s.y, doelX: s.x, doelY: s.y, t: 0, la, lo });
      s.dx = rnd(-0.0018, 0.0018); s.dy = rnd(-0.0012, 0.0012);
    }
    s.doelX = s.x; s.doelY = s.y;
    return s;
  }

  stap(dt) {
    // zwermen verplaatsen zich als groep
    for (const z of this.zwermen.values()) {
      z.t -= dt;
      if (z.t <= 0) { z.doelX = z.lo + rnd(0.006, VAK - 0.006); z.doelY = z.la + rnd(0.006, VAK - 0.006); z.t = rnd(6, 16); }
      z.x += (z.doelX - z.x) * Math.min(1, dt * 0.25);
      z.y += (z.doelY - z.y) * Math.min(1, dt * 0.25);
    }
    for (const s of this.stippen) {
      s.a = s.weg ? Math.max(0, s.a - dt * 0.8) : Math.min(1, s.a + dt * 0.8);
      s.t -= dt;
      switch (s.gedrag) {
        case "springen":
          if (s.t <= 0) { s.doelX = klem(s.x + rnd(-0.0015, 0.0015), s.lo, s.lo + VAK); s.doelY = klem(s.y + rnd(-0.001, 0.001), s.la, s.la + VAK); s.t = rnd(1, 5); }
          s.x += (s.doelX - s.x) * Math.min(1, dt * 6); s.y += (s.doelY - s.y) * Math.min(1, dt * 6);
          break;
        case "lopen":
          if (s.t <= 0) { const ver = Math.random() < 0.15; s.doelX = klem(s.x + rnd(-1, 1) * (ver ? 0.008 : 0.0008), s.lo, s.lo + VAK); s.doelY = klem(s.y + rnd(-1, 1) * (ver ? 0.005 : 0.0005), s.la, s.la + VAK); s.t = rnd(2, 6); }
          s.x += (s.doelX - s.x) * Math.min(1, dt * 1.2); s.y += (s.doelY - s.y) * Math.min(1, dt * 1.2);
          break;
        case "drijven":
          s.hoek += rnd(-0.3, 0.3) * dt;
          s.x = klem(s.x + Math.cos(s.hoek) * 0.00006 * dt, s.lo, s.lo + VAK); s.y = klem(s.y + Math.sin(s.hoek) * 0.00004 * dt, s.la, s.la + VAK);
          break;
        case "staan":
          if (s.t <= 0) { const vlieg = Math.random() < 0.2; if (vlieg) { s.doelX = s.lo + rnd(0.003, VAK - 0.003); s.doelY = s.la + rnd(0.003, VAK - 0.003); } s.t = rnd(6, 14); }
          s.x += (s.doelX - s.x) * Math.min(1, dt * 0.5); s.y += (s.doelY - s.y) * Math.min(1, dt * 0.5);
          break;
        case "zweven":
        case "jagen": {
          const snel = s.gedrag === "jagen" ? 0.0035 : 0.0016;
          s.hoek += rnd(-1, 1) * dt * (s.gedrag === "jagen" ? 4 : 1.2);
          // terugsturen naar het vak
          const mx = s.lo + VAK / 2, my = s.la + VAK / 2;
          if (Math.abs(s.x - mx) > VAK * 0.42 || Math.abs(s.y - my) > VAK * 0.42) {
            const naar = Math.atan2(my - s.y, (mx - s.x) * COS);
            s.hoek += hoekVerschil(s.hoek, naar) * Math.min(1, dt * 2);
          }
          s.x = klem(s.x + Math.cos(s.hoek) * snel * dt / COS, s.lo, s.lo + VAK);
          s.y = klem(s.y + Math.sin(s.hoek) * snel * dt, s.la, s.la + VAK);
          break;
        }
        case "cirkelen":
          s.hoek += s.w * dt;
          if (s.t <= 0) { s.cx = klem(s.cx + rnd(-0.003, 0.003), s.lo + 0.004, s.lo + VAK - 0.004); s.cy = klem(s.cy + rnd(-0.002, 0.002), s.la + 0.004, s.la + VAK - 0.004); s.t = rnd(5, 12); }
          s.x += (s.cx + Math.cos(s.hoek) * s.r / COS - s.x) * Math.min(1, dt * 2);
          s.y += (s.cy + Math.sin(s.hoek) * s.r - s.y) * Math.min(1, dt * 2);
          break;
        case "zwerm": {
          const z = this.zwermen.get(s.vak + "|" + s.soort);
          const tx = z.x + s.dx + Math.sin(performance.now() / 900 + s.hoek) * 0.0003;
          const ty = z.y + s.dy + Math.cos(performance.now() / 1100 + s.hoek) * 0.0002;
          s.x = klem(s.x + (tx - s.x) * Math.min(1, dt * 1.5), s.lo, s.lo + VAK);
          s.y = klem(s.y + (ty - s.y) * Math.min(1, dt * 1.5), s.la, s.la + VAK);
          break;
        }
      }
    }
  }

  /* ---------- tekenen ---------- */

  tekenBasis() {
    const c = this.basisDoek.getContext("2d");
    const d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.fillStyle = "#0E120E";
    c.fillRect(0, 0, this.vw, this.ch);
    const pad = (ringen) => {
      for (const r of ringen) {
        r.forEach(([lo, la], i) => { const [x, y] = this.naarDoek(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.closePath();
      }
    };
    // Twente zelf iets lichter dan de omgeving
    c.beginPath();
    const tw = this.kaart.twente;
    for (const poly of tw.type === "Polygon" ? [tw.coordinates] : tw.coordinates) pad(poly);
    c.fillStyle = "#141A14"; c.fill();
    const vlakKleur = { bos: "#18261A", heide: "#241F19", moeras: "#14232A", bebouwd: "#26272A", water: "#1E3B52" };
    for (const [soort, kleur] of Object.entries(vlakKleur)) {
      c.beginPath();
      for (const poly of this.basis.vlakken[soort] || []) pad(poly);
      c.fillStyle = kleur; c.fill("evenodd");
    }
    const lijnen = [["lokaal", "rgba(140,150,120,.16)", 0.6], ["regionaal", "rgba(170,170,140,.28)", 0.9], ["spoor", "rgba(150,140,160,.25)", 0.8],
      ["hoofdweg", "rgba(200,190,150,.38)", 1.2], ["snelweg", "rgba(230,205,150,.5)", 1.6]];
    const zoomFactor = Math.max(1, Math.min(3, this.cam.z / 1500));
    for (const [soort, kleur, b] of lijnen) {
      c.beginPath();
      for (const l of this.basis.lijnen[soort] || []) l.forEach(([lo, la], i) => { const [x, y] = this.naarDoek(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.strokeStyle = kleur; c.lineWidth = b * zoomFactor; c.stroke();
    }
    // vakkenraster en gemeentegrenzen, heel zacht
    c.strokeStyle = "rgba(255,255,255,.05)"; c.lineWidth = 0.6;
    c.beginPath();
    for (const v of Object.keys(this.vakken)) {
      const [la, lo] = v.split(",").map(Number);
      const [x, y] = this.naarDoek(lo, la + VAK);
      c.rect(x, y, VAK * COS * this.cam.z, VAK * this.cam.z);
    }
    c.stroke();
    c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 0.8;
    c.beginPath();
    for (const g of Object.values(this.kaart.gemeenten)) for (const poly of g.vorm.type === "Polygon" ? [g.vorm.coordinates] : g.vorm.coordinates) pad(poly);
    c.stroke();
    if (this.vakEigen) {
      const [la, lo] = this.vakEigen.split(",").map(Number);
      const [x, y] = this.naarDoek(lo, la + VAK);
      c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.6;
      c.strokeRect(x, y, VAK * COS * this.cam.z, VAK * this.cam.z);
    }
    this.basisCam = { ...this.cam };
    this.basisVuil = false;
  }

  teken() {
    const c = this.doek.getContext("2d");
    const d = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    // basis: tijdens slepen/zoomen de laatste basis verschuiven en schalen; daarna opnieuw tekenen
    const bc = this.basisCam;
    if (bc) {
      const sch = this.cam.z / bc.z;
      const [bx, by] = [this.vw / 2 + (bc.lon - this.cam.lon) * COS * this.cam.z, this.oy + (this.cam.lat - bc.lat) * this.cam.z];
      c.fillStyle = "#0E120E"; c.fillRect(0, 0, this.doek.width, this.doek.height);
      c.setTransform(d * sch, 0, 0, d * sch, d * (bx - this.vw / 2 * sch), d * (by - this.oy * sch));
      c.drawImage(this.basisDoek, 0, 0, this.vw, this.ch);
    }
    c.setTransform(d, 0, 0, d, 0, 0);
    const r = Math.max(1.3, Math.min(4.2, this.cam.z / 900));
    c.globalCompositeOperation = "lighter";
    for (const s of this.stippen) {
      if (this.uit.has(s.groep)) continue;
      const [x, y] = this.naarDoek(s.x, s.y);
      if (x < -10 || x > this.vw + 10 || y < -10 || y > this.ch + 10) continue;
      const opl = this.focus ? (s.soort === this.focus ? 1 : 0.18) : 0.85;
      c.globalAlpha = s.a * opl;
      c.fillStyle = KLEUREN[s.groep];
      const rr = this.focus && s.soort === this.focus ? r * 1.7 : r;
      c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
    }
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    if (this.pin) {
      const [x, y] = this.naarDoek(this.pin.lon, this.pin.lat);
      c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fillStyle = "#9A3B26"; c.fill();
      c.lineWidth = 2.5; c.strokeStyle = "#F3EDE1"; c.stroke();
    }
  }

  loop(nu) {
    if (!this.actief) return;
    const dt = Math.min(0.05, (nu - this.laatste) / 1000);
    this.laatste = nu;
    if (this.speelt) {
      this.maand = (this.maand + dt / 2.6) % 12;
      this.opMaand?.(this.maand);
      this.vulTeller = (this.vulTeller || 0) + dt;
      if (this.vulTeller > 0.25) { this.vulStippen(); this.vulTeller = 0; }
    }
    if (this.basisVuil && !this.beweegt) this.tekenBasis();
    this.stap(dt);
    this.teken();
    this.labelTeller = (this.labelTeller || 0) + dt;
    if (this.labelTeller > 0.05) { this.labelTeller = 0; this.opLabels?.(this.labels()); }
    requestAnimationFrame(this.loop);
  }

  // namen bij een paar stippen van de soorten die nu het meest in beeld zijn
  labels() {
    const tellers = new Map(), voorbeeld = new Map();
    for (const s of this.stippen) {
      if (s.weg || this.uit.has(s.groep)) continue;
      const [x, y, sch] = this.naarScherm(s.x, s.y);
      if (x < 40 || x > this.vw - 40 || y < 90 || y > this.vh - 200 || sch < 0.55) continue;
      tellers.set(s.soort, (tellers.get(s.soort) || 0) + 1);
      if (!voorbeeld.has(s.soort) || s === this._vast?.get(s.soort)) voorbeeld.set(s.soort, s);
    }
    this._vast = this._vast || new Map();
    const top = [...tellers.entries()].sort((a, b) => b[1] - a[1]).slice(0, this.focus ? 0 : 5).map(([k]) => k);
    if (this.focus && voorbeeld.has(this.focus)) top.push(this.focus);
    return top.map((k) => {
      let s = this._vast.get(k);
      if (!s || s.weg || !this.stippen.includes(s)) { s = voorbeeld.get(k); this._vast.set(k, s); }
      const [x, y] = this.naarScherm(s.x, s.y);
      return { soort: k, x, y, groep: s.groep };
    });
  }

  /* ---------- bediening ---------- */

  bediening() {
    const w = this.wrap;
    const wijzers = new Map();
    let start = null;
    const punt = (e) => { const r = w.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    w.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".sim-ui")) return;
      w.setPointerCapture(e.pointerId);
      wijzers.set(e.pointerId, punt(e));
      start = { cam: { ...this.cam }, wijzers: new Map(wijzers), tijd: performance.now(), bewogen: false };
      this.beweegt = true;
    });
    w.addEventListener("pointermove", (e) => {
      if (!wijzers.has(e.pointerId) || !start) return;
      wijzers.set(e.pointerId, punt(e));
      const ids = [...wijzers.keys()];
      if (ids.length === 1) {
        const [x0, y0] = start.wijzers.get(ids[0]) || wijzers.get(ids[0]);
        const [x1, y1] = wijzers.get(ids[0]);
        if (Math.hypot(x1 - x0, y1 - y0) > 4) start.bewogen = true;
        const [lo0, la0] = this.naarWereldMet(start.cam, x0, y0);
        const [lo1, la1] = this.naarWereldMet(start.cam, x1, y1);
        this.cam.lon = start.cam.lon - (lo1 - lo0);
        this.cam.lat = start.cam.lat - (la1 - la0);
      } else if (ids.length >= 2) {
        start.bewogen = true;
        const [a0, b0] = [start.wijzers.get(ids[0]), start.wijzers.get(ids[1])];
        const [a1, b1] = [wijzers.get(ids[0]), wijzers.get(ids[1])];
        if (!a0 || !b0) return;
        const f = Math.hypot(a1[0] - b1[0], a1[1] - b1[1]) / Math.max(10, Math.hypot(a0[0] - b0[0], a0[1] - b0[1]));
        this.zoomRond((a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2, start.cam, f);
      }
    });
    const los = (e) => {
      if (!wijzers.has(e.pointerId)) return;
      wijzers.delete(e.pointerId);
      if (!wijzers.size) {
        this.beweegt = false; this.basisVuil = true;
        if (start && !start.bewogen && performance.now() - start.tijd < 400) this.tik(...punt(e));
        start = null;
      } else start = { cam: { ...this.cam }, wijzers: new Map(wijzers), tijd: 0, bewogen: true };
    };
    w.addEventListener("pointerup", los);
    w.addEventListener("pointercancel", los);
    w.addEventListener("wheel", (e) => {
      e.preventDefault();
      const [x, y] = punt(e);
      this.zoomRond(x, y, { ...this.cam }, Math.exp(-e.deltaY * 0.0015));
      this.basisVuil = true;
    }, { passive: false });
  }

  naarWereldMet(cam, sx, sy) {
    const oud = this.cam; this.cam = cam;
    const r = this.naarWereld(sx, sy);
    this.cam = oud; return r;
  }

  zoomRond(sx, sy, van, factor) {
    const z = klem(van.z * factor, this.passendeZoom() * 0.7, 60000);
    const [lo, la] = this.naarWereldMet(van, sx, sy);
    this.cam.z = z;
    const [lo2, la2] = this.naarWereldMet({ ...van, z }, sx, sy);
    this.cam.lon = van.lon + (lo - lo2);
    this.cam.lat = van.lat + (la - la2);
  }

  zoom(factor) { this.zoomRond(this.vw / 2, this.vh * 0.6, { ...this.cam }, factor); this.basisVuil = true; }

  vliegNaar(lat, lon, z, ms = 1400) {
    const van = { ...this.cam }, t0 = performance.now();
    this.beweegt = true;
    const stap = (nu) => {
      const t = Math.min(1, (nu - t0) / ms), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.cam.lat = van.lat + (lat - van.lat) * e;
      this.cam.lon = van.lon + (lon - van.lon) * e;
      this.cam.z = van.z * Math.pow(z / van.z, e);
      if (t < 1) requestAnimationFrame(stap); else { this.beweegt = false; this.basisVuil = true; }
    };
    requestAnimationFrame(stap);
  }

  tik(sx, sy) {
    const [lo, la] = this.naarWereld(sx, sy);
    let beste = null, afst = Infinity;
    for (const s of this.stippen) {
      if (s.weg || this.uit.has(s.groep)) continue;
      const [x, y] = this.naarScherm(s.x, s.y);
      const d = Math.hypot(x - sx, y - sy);
      if (d < afst) { afst = d; beste = s; }
    }
    const vak = Object.keys(this.vakken).find((v) => { const [a, b] = v.split(",").map(Number); return la >= a && la < a + VAK && lo >= b && lo < b + VAK; });
    this.opTik?.(afst < 28 ? beste : null, vak);
  }

  zetMaand(m) { this.maand = m; this.vulStippen(); }
  zetGroepen(uit) { this.uit = uit; }
  zetFocus(k) { this.focus = k; }

  // telling van meldingen per soort in de huidige maand, voor het soortkaartje
  meldingenInMaand(soort, vakken = Object.keys(this.vakken)) {
    return Math.round(vakken.reduce((s, v) => s + this.telling(v, soort, Math.round(this.maand) % 12), 0));
  }
}

function klem(v, a, b) { return Math.max(a, Math.min(b, v)); }
function hoekVerschil(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
function hashRnd(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; }
