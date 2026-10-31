// De plaat als levende pentekening. De streken komen uit de plaat zelf (zie tekening-werker.js),
// worden een voor een getekend, gaan overeind als je eroverheen strijkt en trillen mee met de zang.
import * as G from "./geluid.js";

const BREED = 560;               // rekenbreedte van de plaat
const TEKENTIJD = 4.6;           // seconden voor de hele tekening
const STREEKTIJD = 0.45;         // seconden per streek
const STRAAL = 46;               // bereik van je vinger of muis, in plaatpixels
const rustig = matchMedia("(prefers-reduced-motion: reduce)");
const geheugen = new Map();      // slug -> Promise<{ b, h, streken, begin }>

function reken(soort) {
  if (geheugen.has(soort.slug)) return geheugen.get(soort.slug);
  const klus = new Promise((ok, fout) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const h = Math.round((img.naturalHeight * BREED) / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = BREED; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, BREED, h);
      const { data } = ctx.getImageData(0, 0, BREED, h);
      const werker = new Worker("/js/tekening-werker.js");
      werker.onmessage = ({ data: r }) => { werker.terminate(); ok({ b: BREED, h, ...r }); };
      werker.onerror = (e) => { werker.terminate(); fout(e); };
      werker.postMessage({ b: BREED, h, data }, [data.buffer]);
    };
    img.onerror = fout;
    img.src = soort.plaat.src;
  });
  geheugen.set(soort.slug, klus);
  klus.catch(() => geheugen.delete(soort.slug));
  return klus;
}

export class Tekening {
  constructor(paneel, soort) {
    this.paneel = paneel;
    this.doek = paneel.querySelector("canvas");
    this.ctx = this.doek.getContext("2d");
    this.soort = soort;
    this.data = null;
    this.t0 = 0;
    this.loopt = false;
    this.wijzer = null;
    this.vorigeWijzer = null;
    this.bewogen = true;
    new ResizeObserver(() => { this.maat(); this.bewogen = true; this.wek(); }).observe(paneel);
    const beweeg = (e) => {
      const p = this.naarPlaat(e);
      this.vorigeWijzer = this.wijzer || p;
      this.wijzer = p;
      this.wek();
    };
    this.doek.addEventListener("pointermove", beweeg);
    this.doek.addEventListener("pointerdown", beweeg);
    this.doek.addEventListener("pointerleave", () => { this.wijzer = this.vorigeWijzer = null; });
    this.doek.addEventListener("pointercancel", () => { this.wijzer = this.vorigeWijzer = null; });
    G.opVerandering((st) => { if (st.speelt) this.wek(); });
  }

  async start() {
    this.maat();
    if (!this.data) {
      this.paneel.classList.add("bezig");
      try {
        this.data = await reken(this.soort);
      } catch (e) {
        console.warn("tekening lukt niet", e);
        this.paneel.classList.remove("bezig");
        this.paneel.classList.add("mislukt");
        return;
      }
      this.paneel.classList.remove("bezig");
      const n = this.data.begin.length;
      this.ox = new Float32Array(n); this.oy = new Float32Array(n);
      this.vx = new Float32Array(n); this.vy = new Float32Array(n);
      this.cx = new Float32Array(n); this.cy = new Float32Array(n);
      this.fase = new Float32Array(n);
      this.kleur = new Array(n);
      const { streken: s, begin } = this.data;
      for (let k = 0; k < n; k++) {
        const o = begin[k], m = s[o + 5];
        let x = 0, y = 0;
        for (let j = 0; j < m; j++) { x += s[o + 6 + j * 2]; y += s[o + 7 + j * 2]; }
        this.cx[k] = x / m; this.cy[k] = y / m;
        this.fase[k] = (k * 2.399) % (Math.PI * 2);
        this.kleur[k] = `rgb(${s[o + 1] | 0} ${s[o + 2] | 0} ${s[o + 3] | 0})`;
      }
    }
    this.opnieuw();
  }

  opnieuw() {
    this.t0 = performance.now() - (rustig.matches ? TEKENTIJD * 1000 + 1000 : 0);
    this.bewogen = true;
    this.wek();
  }

  maat() {
    const r = this.doek.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.doek.width = Math.max(1, Math.round(r.width * dpr));
    this.doek.height = Math.max(1, Math.round(r.height * dpr));
    this.dpr = dpr;
  }

  // waar staat de plaat op het doek
  vlak() {
    const { b, h } = this.data;
    const W = this.doek.width, H = this.doek.height;
    const schaal = Math.min(W / b, H / h);
    return { schaal, x: (W - b * schaal) / 2, y: (H - h * schaal) / 2 };
  }

  naarPlaat(e) {
    if (!this.data) return null;
    const r = this.doek.getBoundingClientRect(), v = this.vlak();
    return { x: ((e.clientX - r.left) * this.dpr - v.x) / v.schaal, y: ((e.clientY - r.top) * this.dpr - v.y) / v.schaal };
  }

  wek() {
    if (this.loopt || !this.data || this.paneel.hidden) return;
    this.loopt = true;
    requestAnimationFrame((t) => this.stap(t));
  }

  stap(nu) {
    if (this.paneel.hidden || !this.doek.isConnected) { this.loopt = false; return; }
    const n = this.data.begin.length;
    const tijd = (nu - this.t0) / 1000;
    const tekenen = tijd < TEKENTIJD + STREEKTIJD;
    const zang = rustig.matches ? 0 : G.niveau();
    let beweging = 0;

    // strijken: de streken in de buurt van je vinger gaan mee en een beetje opzij
    const w = this.wijzer, vw = this.vorigeWijzer;
    const dx = w && vw ? w.x - vw.x : 0, dy = w && vw ? w.y - vw.y : 0;
    const snel = Math.min(30, Math.hypot(dx, dy));
    this.vorigeWijzer = w;
    for (let k = 0; k < n; k++) {
      if (w && snel > 0.2) {
        const ax = this.cx[k] - w.x, ay = this.cy[k] - w.y, d2 = ax * ax + ay * ay;
        if (d2 < STRAAL * STRAAL * 4) {
          const kracht = Math.exp(-d2 / (STRAAL * STRAAL)), d = Math.sqrt(d2) + 1;
          this.vx[k] += (dx * 0.22 + (ax / d) * snel * 0.12) * kracht;
          this.vy[k] += (dy * 0.22 + (ay / d) * snel * 0.12) * kracht;
        }
      }
      // veer terug
      this.vx[k] = (this.vx[k] - this.ox[k] * 0.07) * 0.86;
      this.vy[k] = (this.vy[k] - this.oy[k] * 0.07) * 0.86;
      this.ox[k] += this.vx[k]; this.oy[k] += this.vy[k];
      beweging += Math.abs(this.ox[k]) + Math.abs(this.oy[k]);
    }

    if (tekenen || this.bewogen || beweging > 0.5 || zang > 0.01) this.teken(tijd, zang);
    this.bewogen = false;
    if (tekenen || beweging > 0.5 || zang > 0.01 || G.speelt() || (w && snel > 0.2)) requestAnimationFrame((t) => this.stap(t));
    else this.loopt = false;
  }

  teken(tijd, zang) {
    const { streken: s, begin } = this.data, n = begin.length;
    const c = this.ctx, v = this.vlak();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.doek.width, this.doek.height);
    c.setTransform(v.schaal, 0, 0, v.schaal, v.x, v.y);
    c.lineCap = "round"; c.lineJoin = "round";
    const per = TEKENTIJD / n, trilling = zang * 1.8;
    for (let k = 0; k < n; k++) {
      let deel = (tijd - k * per) / STREEKTIJD;
      if (deel <= 0) break;
      deel = Math.min(1, deel);
      const o = begin[k], m = s[o + 5];
      const zichtbaar = Math.max(2, Math.ceil(m * deel));
      // het begin van een streek blijft liggen, de punt beweegt: zo buigt een veer
      let tx = this.ox[k], ty = this.oy[k];
      if (trilling) { const f = Math.sin(tijd * 31 + this.fase[k]) * trilling; tx += f * Math.cos(this.fase[k]); ty += f * Math.sin(this.fase[k]); }
      c.beginPath();
      for (let j = 0; j < zichtbaar; j++) {
        const a = j / (m - 1);
        const x = s[o + 6 + j * 2] + tx * a, y = s[o + 7 + j * 2] + ty * a;
        if (j) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.strokeStyle = this.kleur[k];
      c.lineWidth = s[o + 4] * 0.95;
      c.globalAlpha = deel < 1 ? 0.5 + deel * 0.5 : 1;
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}
