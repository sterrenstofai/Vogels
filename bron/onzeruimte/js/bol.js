// Een draaiende bol uit een platte kaart (equirectangulair, 2:1), zonder WebGL of bibliotheek.
// Per beeldpunt rekenen we één keer uit welke breedte en lengte erbij hoort; draaien is daarna alleen een
// verschuiving in lengte. Licht van linksboven, zodat de bol rond oogt. Alleen kaarten van echte foto's,
// of een egale kleur uit een foto of uit metingen (met een label). De zon en sterren gloeien: geen schaduwkant,
// wel een donkerdere rand. Saturnus krijgt ringen uit een meting van Cassini.
const kaarten = new Map();

export function laadKaart(url) {
  if (!kaarten.has(url)) kaarten.set(url, new Promise((klaar, fout) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      klaar({ w: c.width, h: c.height, data: g.getImageData(0, 0, c.width, c.height).data });
    };
    img.onerror = fout;
    img.src = url;
  }));
  return kaarten.get(url);
}

const rad = Math.PI / 180;
// van een richting in beeld (x rechts, y omhoog, z naar je toe) naar de bol: eerst de kanteling van de as, dan de helling
function naarBol(x, y, z, kc, ks, hc, hs) {
  const ax = kc * x + ks * y, ay = -ks * x + kc * y;
  return [ax, hc * ay - hs * z, hs * ay + hc * z];
}

// tabel per maat en stand: per beeldpunt de rij in de kaart, de lengte, het licht, en waar de ringen zitten
const tabellen = new Map();
function tabel(n, o) {
  const sleutel = `${n}|${o.kanteling}|${o.helling}|${o.gloeit}|${o.ringen?.buiten || 0}|${o.dikte || 0}|${o.gloed || 0}`;
  if (tabellen.has(sleutel)) return tabellen.get(sleutel);
  const m = n * n, rij = new Float32Array(m), lengte = new Float32Array(m), licht = new Float32Array(m).fill(-1);
  const ring = new Float32Array(m).fill(-1), voor = new Uint8Array(m), ringLicht = new Float32Array(m);
  const halo = new Float32Array(m), tint = new Float32Array(m); // dampkring of gloed buiten de rand; tint bij de rand
  const kc = Math.cos(o.kanteling), ks = Math.sin(o.kanteling), hc = Math.cos(o.helling), hs = Math.sin(o.helling);
  const L = [-0.45, 0.4, 0.8], lm = Math.hypot(...L);
  // met ringen, een dampkring of een gloed past de bol kleiner in het vak
  const f = Math.max(o.ringen ? o.ringen.buiten * 1.02 : 1, o.dikte ? 1 + o.dikte * 2.6 : 1, o.gloed ? 1 + o.gloed * 2.2 : 1);
  const Ln = Math.hypot(L[0], L[1]);
  // de poolas in beeld, voor het vlak van de ringen
  const N = [-ks * hc, kc * hc, -hs]; // de as (0,1,0) van de bol, terug naar beeld
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (((i + 0.5) / n) * 2 - 1) * f, y = (1 - ((j + 0.5) / n) * 2) * f, r2 = x * x + y * y, k = j * n + i;
    let zBol = -Infinity;
    if (r2 <= 1) {
      const z = Math.sqrt(1 - r2); zBol = z;
      const [bx, by, bz] = naarBol(x, y, z, kc, ks, hc, hs);
      rij[k] = 0.5 - Math.asin(Math.max(-1, Math.min(1, by))) / Math.PI;
      lengte[k] = Math.atan2(bx, bz) / (2 * Math.PI);
      if (o.gloeit) licht[k] = 1 - 0.55 * (1 - z) - 0.15 * (1 - z) ** 2; // donkere rand, zoals bij de zon
      else { const d = (x * L[0] + y * L[1] + z * L[2]) / lm; licht[k] = Math.min(1.08, 0.18 + 0.95 * Math.max(0, d) ** 0.8) * (0.82 + 0.18 * z); }
    }
    // de dampkring: een zachte rand van licht, het sterkst aan de kant van de zon; de zon en sterren gloeien rondom
    const rr0 = Math.sqrt(r2), kant = rr0 > 0 ? 0.25 + 0.75 * Math.max(0, (x * L[0] + y * L[1]) / (rr0 * Ln)) : 1;
    if (r2 > 1) {
      if (o.gloed) halo[k] = 0.85 * Math.exp(-((rr0 - 1) / o.gloed) * 2.4);
      else if (o.dikte) halo[k] = 0.75 * kant * Math.exp(-((rr0 - 1) / o.dikte) * 1.7);
    } else if (o.dikte) tint[k] = 0.55 * kant * (1 - Math.sqrt(1 - r2)) ** 2.5;
    if (o.ringen && Math.abs(N[2]) > 1e-3) {
      const zr = -(N[0] * x + N[1] * y) / N[2], rr = Math.hypot(x, y, zr);
      if (rr >= o.ringen.binnen && rr <= o.ringen.buiten && zr > zBol) {
        ring[k] = (rr - o.ringen.binnen) / (o.ringen.buiten - o.ringen.binnen);
        voor[k] = r2 <= 1 ? 1 : 0;
        // schaduw van de planeet op de ringen: licht komt van linksboven
        const t = x * L[0] / lm + y * L[1] / lm + zr * L[2] / lm, px = x - t * L[0] / lm, pyy = y - t * L[1] / lm, pzz = zr - t * L[2] / lm;
        ringLicht[k] = t < 0 && px * px + pyy * pyy + pzz * pzz < 1 ? 0.25 : 0.95;
      }
    }
  }
  const t = { rij, lengte, licht, ring, voor, ringLicht, halo, tint };
  tabellen.set(sleutel, t);
  return t;
}

// teken de bol op een canvas; draai: 0..1 (een hele omwenteling); hoeken in radialen
export function tekenBol(doek, kaart, draai, { kanteling = 0, helling = 0, gloeit = false, ringen = null, atmosfeer = null, gloed = 0 } = {}) {
  const n = doek.width, g = doek.getContext("2d");
  if (!doek._beeld || doek._beeld.width !== n) doek._beeld = g.createImageData(n, n);
  const uit = doek._beeld.data, T = tabel(n, { kanteling, helling, gloeit, ringen, dikte: atmosfeer?.dikte || 0, gloed });
  const { w, h, data } = kaart, rd = ringen?.kaart;
  const ak = atmosfeer ? atmosfeer.rgb : gloed ? gemiddelde(kaart) : null;
  for (let k = 0, m = n * n; k < m; k++) {
    const o = k * 4, s = T.licht[k];
    let R = 0, G = 0, B = 0, A = 0;
    if (s >= 0) {
      let u = T.lengte[k] + draai; u -= Math.floor(u);
      const px = Math.min(w - 1, (u * w) | 0), py = Math.min(h - 1, (T.rij[k] * h) | 0), q = (py * w + px) * 4;
      R = data[q] * s; G = data[q + 1] * s; B = data[q + 2] * s; A = 255;
      const t = T.tint[k];
      if (t > 0) { R += (ak[0] - R) * t; G += (ak[1] - G) * t; B += (ak[2] - B) * t; }
    } else if (ak && T.halo[k] > 0.004) { R = ak[0]; G = ak[1]; B = ak[2]; A = T.halo[k] * 255; }
    if (rd && T.ring[k] >= 0) {
      const q = Math.min(rd.w - 1, (T.ring[k] * rd.w) | 0) * 4, a = rd.data[q + 3] / 255, l = T.ringLicht[k];
      if (a > 0) {
        // de ring ligt voor de planeet (of ernaast): eroverheen mengen
        R = rd.data[q] * l * a + R * (1 - a); G = rd.data[q + 1] * l * a + G * (1 - a); B = rd.data[q + 2] * l * a + B * (1 - a);
        A = Math.max(A, a * 255);
        if (A < 255 && A > 0) { const f = 255 / A; R *= f; G *= f; B *= f; } // niet-voorvermenigvuldigd
      }
    }
    uit[o] = R; uit[o + 1] = G; uit[o + 2] = B; uit[o + 3] = A;
  }
  g.putImageData(doek._beeld, 0, 0);
}

// de gemiddelde kleur van een kaart, voor de gloed van de zon en sterren (één keer uitgerekend)
function gemiddelde(k) {
  if (k.gem) return k.gem;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < k.data.length; i += 4 * 7) { r += k.data[i]; g += k.data[i + 1]; b += k.data[i + 2]; n++; }
  const m = Math.max(r, g, b) / n || 1; // even helder als het felste kanaal: een gloed is licht
  return (k.gem = [(r / n) * 255 / m, (g / n) * 255 / m, (b / n) * 255 / m]);
}
export { gemiddelde };

// opties uit een regel van bollen.json (laadt ook de ringen)
export async function optiesVoor(b) {
  const o = { kanteling: (b.kanteling || 0) * rad, helling: (b.helling || 0) * rad, gloeit: !!b.gloeit, ringen: null, atmosfeer: b.atmosfeer || null, gloed: b.gloed || 0 };
  if (b.ringen) o.ringen = { ...b.ringen, kaart: await laadKaart(b.ringen.pad) };
  return o;
}
