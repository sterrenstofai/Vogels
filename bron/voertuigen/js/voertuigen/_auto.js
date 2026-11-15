// Gedeeld door de bus en de brandweerauto (geen voertuig: de motor laadt alleen /js/voertuigen/<slug>.js).
// - kast(): een afgeronde doos (carrosserie) met gaten voor deuren en wielkasten, plus een binnenwand;
// - vlakje(): een afgerond stuk huid dat precies op die kast ligt (ruit, lamp, bumper), ook om een hoek heen;
// - wiel(): band, velg met wielmoeren en naafdop (enkel of dubbel);
// - wielkast(): een halve buis boven het wiel, zodat je door het gat niet in de kast kijkt.
// Maten in meters. De voorkant wijst naar +x, rechts is +z.

const AS = ["x", "y", "z"];

// B = { x0, x1, y0, y1, z0, z1 }, R = { xn, xp, yn, yp, zn, zp }: de straal van de afronding per kant.
// o.gat(vlak, x, y, z) = true laat een vakje weg (vlak "x+", "z-", ...; x, y, z = het midden op het platte vlak).
// o.knip = { x: [...], y: [...] } extra rasterlijnen, zodat de rand van een gat recht is.
export function kast(ctx, B, R, o = {}) {
  const { THREE, V } = ctx;
  const MIN = [B.x0, B.y0, B.z0], MAX = [B.x1, B.y1, B.z1], RN = [R.xn, R.yn, R.zn], RP = [R.xp, R.yp, R.zp];
  const lo = MIN.map((v, i) => v + RN[i]), hi = MAX.map((v, i) => v - RP[i]);
  function proj(p) {
    const inn = p.map((v, i) => Math.min(hi[i], Math.max(lo[i], v)));
    const d = p.map((v, i) => v - inn[i]), r = d.map((v, i) => (v > 0 ? RP[i] : RN[i]) || 1e-6);
    const u = d.map((v, i) => v / r[i]), L = Math.hypot(...u) || 1, un = u.map((v) => v / L);
    const n = un.map((v, i) => v / r[i]), nl = Math.hypot(...n) || 1;
    return { p: inn.map((v, i) => v + un[i] * r[i]), n: n.map((v) => v / nl) };
  }
  function lijnen(i, extra = []) {
    const a = MIN[i], b = MAX[i], st = o.stap ?? 0.2, nR = o.rondStappen ?? 8, out = [];
    for (let k = 0; k <= nR; k++) out.push(a + (RN[i] * k) / nR);
    const n = Math.max(1, Math.ceil((hi[i] - lo[i]) / st));
    for (let k = 1; k < n; k++) out.push(lo[i] + ((hi[i] - lo[i]) * k) / n);
    for (let k = 0; k <= nR; k++) out.push(hi[i] + (RP[i] * k) / nR);
    for (const e of extra) if (e > a && e < b) out.push(e);
    out.sort((p, q) => p - q);
    return out.filter((v, k) => k === 0 || v - out[k - 1] > 1e-4);
  }
  const G = [lijnen(0, o.knip?.x), lijnen(1, o.knip?.y), lijnen(2, o.knip?.z)];
  function maakGeo(binnen) {
    const pos = [], nrm = [];
    for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {
      if (o.zonder?.includes(AS[a] + (s > 0 ? "+" : "-"))) continue;
      const b = (a + 1) % 3, c = (a + 2) % 3, vlak = AS[a] + (s > 0 ? "+" : "-"), Gb = G[b], Gc = G[c];
      const P = Gb.map((vb) => Gc.map((vc) => { const q = [0, 0, 0]; q[a] = s > 0 ? MAX[a] : MIN[a]; q[b] = vb; q[c] = vc; return proj(q); }));
      for (let i = 0; i < Gb.length - 1; i++) for (let j = 0; j < Gc.length - 1; j++) {
        const m = [0, 0, 0]; m[a] = s > 0 ? MAX[a] : MIN[a]; m[b] = (Gb[i] + Gb[i + 1]) / 2; m[c] = (Gc[j] + Gc[j + 1]) / 2;
        if (o.gat && o.gat(vlak, m[0], m[1], m[2])) continue;
        const A = P[i][j], Bq = P[i + 1][j], C = P[i + 1][j + 1], D = P[i][j + 1];
        const tris = (s > 0) !== binnen ? [A, Bq, C, A, C, D] : [A, C, Bq, A, D, C];
        for (const v of tris) { pos.push(...v.p); nrm.push(...(binnen ? v.n.map((x) => -x) : v.n)); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
    return g;
  }
  // een punt op de kast: vlak "x+" (s = z, t = y), "x-" (s = z, t = y), "z+"/"z-" (s = x, t = y), "y+" (s = x, t = z).
  // s mag voorbij het platte deel lopen: dan gaat het punt om de ronde hoek heen (en daarna over het volgende vlak).
  function op(vlak, s, t, off = 0) {
    const a = AS.indexOf(vlak[0]), sa = vlak[1] === "+" ? 1 : -1, sb = a === 0 ? 2 : 0, tc = a === 1 ? 2 : 1;
    const q = [0, 0, 0], n = [0, 0, 0];
    q[tc] = t;
    const Ra = sa > 0 ? RP[a] : RN[a], cA = sa > 0 ? hi[a] : lo[a];
    if (s >= lo[sb] && s <= hi[sb]) { q[a] = sa > 0 ? MAX[a] : MIN[a]; q[sb] = s; n[a] = sa; }
    else {
      const kant = s > hi[sb] ? 1 : -1, e = kant > 0 ? s - hi[sb] : lo[sb] - s, Rb = kant > 0 ? RP[sb] : RN[sb], boog = (Math.PI / 2) * (Ra + Rb) / 2;
      if (e <= boog) { const th = (e / boog) * (Math.PI / 2); q[a] = cA + sa * Ra * Math.cos(th); q[sb] = (kant > 0 ? hi[sb] : lo[sb]) + kant * Rb * Math.sin(th); n[a] = (sa * Math.cos(th)) / Ra; n[sb] = (kant * Math.sin(th)) / Rb; }
      else { q[a] = cA - sa * (e - boog); q[sb] = kant > 0 ? MAX[sb] : MIN[sb]; n[sb] = kant; }
    }
    const nl = Math.hypot(...n); for (let i = 0; i < 3; i++) n[i] /= nl;
    return [V(q[0] + n[0] * off, q[1] + n[1] * off, q[2] + n[2] * off), V(n[0], n[1], n[2])];
  }
  return { buiten: maakGeo(false), binnen: o.dikte ? kast(ctx, krimp(B, o.dikte), krimpR(R, o.dikte), { ...o, dikte: 0 }).buitenOm() : null, op, B, R, buitenOm: () => maakGeo(true) };
}
const krimp = (B, t) => ({ x0: B.x0 + t, x1: B.x1 - t, y0: B.y0 + t, y1: B.y1 - t, z0: B.z0 + t, z1: B.z1 - t });
const krimpR = (R, t) => Object.fromEntries(Object.entries(R).map(([k, v]) => [k, Math.max(0.01, v - t)]));

// een afgerond vlakje op de kast K: van s0 tot s1 en t0 tot t1, hoekstraal rc, off = afstand boven de huid
export function vlakje(ctx, K, vlak, s0, s1, t0, t1, o = {}) {
  const { THREE } = ctx;
  const rc = Math.min(o.rc ?? 0.06, (s1 - s0) / 2 - 1e-4, (t1 - t0) / 2 - 1e-4), off = o.off ?? 0.006, ringen = o.ringen ?? 8;
  // de omtrek: rechte stukken (in stapjes van 10 cm) en kwartcirkels
  const rand = [], st = 0.1;
  const zijde = (a0, b0, a1, b1) => { const n = Math.max(1, Math.ceil(Math.hypot(a1 - a0, b1 - b0) / st)); for (let k = 0; k < n; k++) rand.push([a0 + ((a1 - a0) * k) / n, b0 + ((b1 - b0) * k) / n]); };
  const boog = (cs, ct, h0) => { for (let k = 0; k < 6; k++) { const h = h0 + (k / 6) * (Math.PI / 2); rand.push([cs + Math.cos(h) * rc, ct + Math.sin(h) * rc]); } };
  zijde(s0 + rc, t0, s1 - rc, t0); boog(s1 - rc, t0 + rc, -Math.PI / 2);
  zijde(s1, t0 + rc, s1, t1 - rc); boog(s1 - rc, t1 - rc, 0);
  zijde(s1 - rc, t1, s0 + rc, t1); boog(s0 + rc, t1 - rc, Math.PI / 2);
  zijde(s0, t1 - rc, s0, t0 + rc); boog(s0 + rc, t0 + rc, Math.PI);
  const sc = (s0 + s1) / 2, tcn = (t0 + t1) / 2, H = rand.length;
  const pts = [K.op(vlak, sc, tcn, off)];
  for (let i = 1; i <= ringen; i++) { const r = i / ringen; for (const [s, t] of rand) pts.push(K.op(vlak, sc + (s - sc) * r, tcn + (t - tcn) * r, off)); }
  const tri = [];
  for (let j = 0; j < H; j++) tri.push([0, 1 + j, 1 + ((j + 1) % H)]);
  for (let i = 1; i < ringen; i++) for (let j = 0; j < H; j++) { const a = 1 + (i - 1) * H + j, b = 1 + (i - 1) * H + ((j + 1) % H), c = a + H, d = b + H; tri.push([a, c, b], [b, c, d]); }
  const pos = [], nrm = [];
  for (let [a, b, c] of tri) {
    const A = pts[a][0], Bv = pts[b][0], C = pts[c][0];
    const n = Bv.clone().sub(A).cross(C.clone().sub(A));
    if (n.dot(pts[a][1]) < 0) [b, c] = [c, b];
    for (const k of [a, b, c]) { pos.push(...pts[k][0].toArray()); nrm.push(...pts[k][1].toArray()); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}

// beide kanten zichtbaar: de geometrie plus een omgekeerde kopie
export function beide(ctx, g) {
  const n = (g.index ? g.toNonIndexed() : g.clone()); if (!n.attributes.normal) n.computeVertexNormals();
  for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k);
  const o = n.clone(), p = o.attributes.position.array, q = o.attributes.normal.array;
  for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { [p[i + 3 + k], p[i + 6 + k]] = [p[i + 6 + k], p[i + 3 + k]]; [q[i + 3 + k], q[i + 6 + k]] = [q[i + 6 + k], q[i + 3 + k]]; }
  for (let i = 0; i < q.length; i++) q[i] = -q[i];
  return ctx.samen([n, o]);
}

// een draaivorm om de z-as; het profiel [straal, z] loopt met de klok mee (straal naar rechts, z omhoog)
export function draaiZ(ctx, prof, seg = 64) {
  const g = new ctx.THREE.LatheGeometry(prof.map(([r, y]) => new ctx.THREE.Vector2(r, y)), seg); g.rotateX(Math.PI / 2); return g;
}

// een wiel: band met loopvlak, velg met wielmoeren, naafdop. As langs z, buitenkant naar +z.
// Geeft { wiel (positie zetten), draai (om z draaien) }. dubbel = twee banden naast elkaar (achteras).
export function wiel(ctx, o = {}) {
  const { THREE, TAU, mesh, samen, groep } = ctx;
  const r = o.r ?? 0.48, b = o.breed ?? 0.28, rv = o.velg ?? 0.29, deel = o.deel ?? "wielen", dubbel = !!o.dubbel, gap = o.tussen ?? 0.04;
  const draai = new THREE.Group(), w = new THREE.Group(); w.add(draai);
  const band = (z0) => {
    const h = b / 2, k = Math.min(0.06, (r - rv) * 0.3);
    const prof = [[rv - 0.005, z0 + h - 0.01], [rv + 0.02, z0 + h], [r - k * 1.6, z0 + h + 0.004], [r - k * 0.5, z0 + h - k * 0.35], [r, z0 + h - k], [r + 0.002, z0], [r, z0 - h + k], [r - k * 0.5, z0 - h + k * 0.35], [r - k * 1.6, z0 - h - 0.004], [rv + 0.02, z0 - h], [rv - 0.005, z0 - h + 0.01]];
    return draaiZ(ctx, prof, 56);
  };
  // het profiel van draaiZ moet met de klok mee: van de as af (boven), omlaag, terug naar de as
  const banden = [band(0)]; if (dubbel) banden.push(band(-b - gap));
  draai.add(mesh(samen(banden), o.band ?? "rubber", deel));
  // velg: een schotel met een diepe kom (bij dubbel: de buitenste velg met een diepe kom tot de binnenste)
  const zb = b / 2 - 0.02, diep = o.diep ?? 0.07;
  const velg = draaiZ(ctx, [[0.0, zb - diep + 0.03], [0.1, zb - diep + 0.03], [0.13, zb - diep + 0.005], [rv * 0.62, zb - diep], [rv * 0.8, zb - diep * 0.3], [rv - 0.025, zb + 0.005], [rv + 0.012, zb + 0.004], [rv + 0.012, zb - 0.02], [rv - 0.01, zb - 0.03], [rv - 0.01, dubbel ? -b * 1.5 - gap : -b / 2 + 0.03], [0.0, dubbel ? -b * 1.5 - gap : -b / 2 + 0.03]], 64);
  draai.add(mesh(velg, o.velgSoort ?? "metaal", deel));
  // gaten in de schotel (donker) en wielmoeren
  const gaten = [], moeren = [], nM = o.moeren ?? 10;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; gaten.push(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16).rotateX(Math.PI / 2).translate(Math.cos(a) * rv * 0.72, Math.sin(a) * rv * 0.72, zb - diep * 0.55)); }
  for (let i = 0; i < nM; i++) { const a = (i / nM) * TAU; moeren.push(new THREE.CylinderGeometry(0.016, 0.016, 0.035, 6).rotateX(Math.PI / 2).translate(Math.cos(a) * 0.115, Math.sin(a) * 0.115, zb - diep + 0.045)); }
  draai.add(mesh(samen(gaten), "zwartmetaal", deel), mesh(samen(moeren), "metaal", deel));
  // naafdop
  draai.add(mesh(draaiZ(ctx, [[0, zb - diep + 0.13], [0.04, zb - diep + 0.125], [0.075, zb - diep + 0.09], [0.085, zb - diep + 0.03], [0, zb - diep + 0.03]], 40), o.dopSoort ?? "zwartmetaal", deel));
  return { wiel: w, draai };
}

// een halve buis boven een wiel (wielkast), van z0 tot z1, straal ra, midden (x, y); beide kanten zichtbaar
export function wielkast(ctx, x, y, ra, z0, z1, soortNaam, deel) {
  const { THREE, mesh } = ctx;
  const g = new THREE.CylinderGeometry(ra, ra, Math.abs(z1 - z0), 40, 1, true, Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2); g.translate(x, y, (z0 + z1) / 2);
  const kap = new THREE.CircleGeometry(ra, 40, 0, Math.PI); kap.translate(x, y, Math.abs(z0) < Math.abs(z1) ? z0 : z1);
  return mesh(beide(ctx, ctx.samen([g, kap])), soortNaam, deel);
}

// een rand om een boog (wielkast-rand): buis langs een halve cirkel op hoogte y0 (onderkant kast)
export function boogRand(ctx, x, y, ra, y0, z, dik) {
  const { THREE, V, buis } = ctx;
  const h0 = Math.asin(Math.max(-1, Math.min(1, (y0 - y) / ra))), pts = [];
  for (let k = 0; k <= 28; k++) { const h = Math.PI - h0 - (k / 28) * (Math.PI - 2 * h0); pts.push(V(x + Math.cos(h) * ra, y + Math.sin(h) * ra, z)); }
  return buis(pts, dik, { seg: 56, rond: 10 });
}
