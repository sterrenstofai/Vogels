// Rekent van een plaat een pentekening uit: korte streken die de richting en de kleur van de plaat volgen.
// Er wordt niets bijverzonnen: elke streek ligt op een plek waar de plaat ook verf heeft, in de kleur van die plek.
// Invoer: { b, h, data (RGBA) }. Uitvoer: { streken: Float32Array, begin: Uint32Array }
// Per streek: laag, r, g, b, breedte, aantal punten, x0, y0, x1, y1, ...

const DOEL = 5200;   // ongeveer zoveel kleurstreken per plaat
const INKT = 1400;   // en hooguit zoveel donkere lijnen langs de randen
const STAP = 1.6;

function rng(zaad) {
  let s = zaad >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function vervaag(a, b, h, sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let som = 0;
  for (let i = -r; i <= r; i++) som += (k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)));
  for (let i = 0; i < k.length; i++) k[i] /= som;
  const t = new Float32Array(a.length), uit = new Float32Array(a.length);
  for (let y = 0; y < h; y++) {
    const rij = y * b;
    for (let x = 0; x < b; x++) {
      let v = 0;
      for (let i = -r; i <= r; i++) v += a[rij + Math.min(b - 1, Math.max(0, x + i))] * k[i + r];
      t[rij + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      let v = 0;
      for (let i = -r; i <= r; i++) v += t[Math.min(h - 1, Math.max(0, y + i)) * b + x] * k[i + r];
      uit[y * b + x] = v;
    }
  }
  return uit;
}

self.onmessage = ({ data: { b, h, data, zaad = 7 } }) => {
  const n = b * h, willekeur = rng(zaad);
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), L = new Float32Array(n);
  const beeld = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, bl = data[i * 4 + 2] / 255;
    R[i] = r; G[i] = g; B[i] = bl;
    L[i] = 0.299 * r + 0.587 * g + 0.114 * bl;
    const verz = Math.max(r, g, bl) - Math.min(r, g, bl);
    const x = i % b, y = (i / b) | 0;
    const kantlijn = x < b * 0.025 || x > b * 0.975 || y < h * 0.018 || y > h * 0.982; // rand van de scan
    beeld[i] = kantlijn || (L[i] > 0.9 && verz < 0.1) ? 0 : 1; // papier telt niet mee
  }

  // richting van het beeld uit de structuurtensor
  const l2 = vervaag(L, b, h, 1.2);
  const gx = new Float32Array(n), gy = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < b; x++) {
    const i = y * b + x;
    gx[i] = (l2[y * b + Math.min(b - 1, x + 1)] - l2[y * b + Math.max(0, x - 1)]) / 2;
    gy[i] = (l2[Math.min(h - 1, y + 1) * b + x] - l2[Math.max(0, y - 1) * b + x]) / 2;
  }
  const xx = new Float32Array(n), xy = new Float32Array(n), yy = new Float32Array(n);
  for (let i = 0; i < n; i++) { xx[i] = gx[i] * gx[i]; xy[i] = gx[i] * gy[i]; yy[i] = gy[i] * gy[i]; }
  const jxx = vervaag(xx, b, h, 3), jxy = vervaag(xy, b, h, 3), jyy = vervaag(yy, b, h, 3);
  const hoekX = new Float32Array(n), hoekY = new Float32Array(n), samen = new Float32Array(n), rand = new Float32Array(n);
  const randen = [];
  for (let i = 0; i < n; i++) {
    const a = 0.5 * Math.atan2(2 * jxy[i], jxx[i] - jyy[i]) + Math.PI / 2;
    hoekX[i] = Math.cos(a); hoekY[i] = Math.sin(a);
    samen[i] = Math.sqrt((jxx[i] - jyy[i]) ** 2 + 4 * jxy[i] ** 2) / (jxx[i] + jyy[i] + 1e-6);
    rand[i] = Math.hypot(gx[i], gy[i]);
    if (beeld[i] && i % 5 === 0) randen.push(rand[i]);
  }
  randen.sort((p, q) => p - q);
  const p97 = randen[Math.floor(randen.length * 0.97)] || 1;
  for (let i = 0; i < n; i++) rand[i] = Math.min(1, rand[i] / (p97 + 1e-6));

  const kleurVerschil = (i, r, g, bl) => Math.abs(R[i] - r) + Math.abs(G[i] - g) + Math.abs(B[i] - bl);

  function trek(x, y, maxlen) {
    const i0 = (y | 0) * b + (x | 0), r0 = R[i0], g0 = G[i0], b0 = B[i0];
    const voor = [], achter = [];
    for (const richting of [1, -1]) {
      let px = x, py = y, vx0 = 0, vy0 = 0;
      const lijst = richting === 1 ? voor : achter;
      for (let s = 0; s < maxlen / STAP; s++) {
        const ix = px | 0, iy = py | 0;
        if (ix < 0 || iy < 0 || ix >= b || iy >= h || !beeld[iy * b + ix]) break;
        let vx = hoekX[iy * b + ix], vy = hoekY[iy * b + ix];
        if (vx * vx0 + vy * vy0 < 0) { vx = -vx; vy = -vy; }
        vx0 = vx; vy0 = vy;
        px += richting * vx * STAP; py += richting * vy * STAP;
        const jx = px | 0, jy = py | 0;
        if (jx < 0 || jy < 0 || jx >= b || jy >= h) break;
        if (kleurVerschil(jy * b + jx, r0, g0, b0) > 0.32) break; // hier houdt de veer op
        lijst.push(px, py);
      }
    }
    const pts = [];
    for (let k = achter.length - 2; k >= 0; k -= 2) pts.push(achter[k], achter[k + 1]);
    pts.push(x, y, ...voor);
    return pts;
  }

  function gemiddeld(pts, donker) {
    let r = 0, g = 0, bl = 0;
    const m = pts.length / 2;
    for (let k = 0; k < pts.length; k += 2) { const i = (pts[k + 1] | 0) * b + (pts[k] | 0); r += R[i]; g += G[i]; bl += B[i]; }
    return [r / m * donker, g / m * donker, bl / m * donker];
  }

  const streken = [];
  // 1. kleurstreken, dichter waar het donker of druk is
  const aantal = Math.round(n * 0.3);
  const kand = new Float32Array(aantal * 3);
  let som = 0;
  for (let k = 0; k < aantal; k++) {
    const x = willekeur() * b, y = willekeur() * h, i = (y | 0) * b + (x | 0);
    const kans = beeld[i] ? 0.25 + 0.6 * Math.pow(1 - L[i], 1.2) + 0.5 * rand[i] : 0;
    kand[k * 3] = x; kand[k * 3 + 1] = y; kand[k * 3 + 2] = kans; som += kans;
  }
  const f = DOEL / Math.max(1, som);
  for (let k = 0; k < aantal; k++) {
    const kans = kand[k * 3 + 2] * f;
    if (kans <= 0 || willekeur() > kans) continue;
    const x = kand[k * 3], y = kand[k * 3 + 1], i = (y | 0) * b + (x | 0);
    const pts = trek(x, y, 7 + 22 * samen[i] * (1 - 0.5 * rand[i]));
    if (pts.length < 6) continue;
    streken.push({ laag: 0, kleur: gemiddeld(pts, 1), breedte: 0.8 + 1.6 * (1 - L[i]), pts });
  }
  // 2. donkere lijnen langs de sterkste randen, als laatste getekend
  let inkt = 0;
  for (let k = 0; k < n * 0.05 && inkt < INKT; k++) {
    const x = willekeur() * b, y = willekeur() * h, i = (y | 0) * b + (x | 0);
    if (!beeld[i] || rand[i] < 0.55 || willekeur() > 0.55) continue;
    const pts = trek(x, y, 14);
    if (pts.length < 6) continue;
    streken.push({ laag: 1, kleur: gemiddeld(pts, 0.45), breedte: 0.6 + 0.5 * rand[i], pts });
    inkt++;
  }

  // volgorde zoals een tekenaar: eerst lichte kleur, dan donker, dan inkt; binnen een laag ongeveer van boven naar onder
  for (const s of streken) {
    const [r, g, bl] = s.kleur, l = 0.299 * r + 0.587 * g + 0.114 * bl;
    let my = 0;
    for (let k = 1; k < s.pts.length; k += 2) my += s.pts[k];
    my /= s.pts.length / 2;
    s.sleutel = s.laag * 10 + Math.round((1 - l) * 3) + my / h + willekeur() * 0.35;
  }
  streken.sort((p, q) => p.sleutel - q.sleutel);

  let lengte = 0;
  for (const s of streken) lengte += 6 + s.pts.length;
  const uit = new Float32Array(lengte), begin = new Uint32Array(streken.length);
  let o = 0;
  streken.forEach((s, k) => {
    begin[k] = o;
    uit[o++] = s.laag; uit[o++] = s.kleur[0] * 255; uit[o++] = s.kleur[1] * 255; uit[o++] = s.kleur[2] * 255;
    uit[o++] = s.breedte; uit[o++] = s.pts.length / 2;
    uit.set(s.pts, o); o += s.pts.length;
  });
  self.postMessage({ streken: uit, begin }, [uit.buffer, begin.buffer]);
};
