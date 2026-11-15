// De boot: een algemeen binnenvaartschip (motorvrachtschip) van 50 m, in code getekend (maten in meters; de boeg wijst naar +x, stuurboord is +z).
// Geen bestaand schip, geen naam, geen vlag. De bodem van het kanaal is y = 0, de waterlijn ligt op y = 3. Module voor /js/kern.js.
export default function maak(ctx) {
const { THREE, V, TAU, root, MAT, soort, DELEN, mesh, groep, op, buis, samen, staaf, rondeDoos, vleugelvorm, naarBuitenG } = ctx;
const G = { luiken: [], lichten: {} };
const XH = -25, XB = 25, KIEL = 0.5, WL = 3.0, B2 = 3.3; // hek, boeg, onderkant kiel, waterlijn, halve breedte
const cl = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (t) => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); };

// ---- kleuren: rustig, een donkere romp en een witte opbouw
const ROMP = soort("scheepsromp", 0xe3e4e4, { color: 0x24313b, roughness: 0.5, metalness: 0.25, clearcoat: 0.35, clearcoatRoughness: 0.4 });
const ONDER = soort("onderwater", 0xddd1cd, { color: 0x5a2e29, roughness: 0.75, metalness: 0.05 });
const DEK = soort("scheepsdek", 0xefefeb, { color: 0x5d6163, roughness: 0.8, metalness: 0.2 });
const LUIK = soort("luikkap", 0xe8eae6, { color: 0x4d5a56, roughness: 0.45, metalness: 0.2, clearcoat: 0.4 });
const WIT = soort("opbouw", 0xfbfbf9, { color: 0xe8e9e5, roughness: 0.45, metalness: 0.05, clearcoat: 0.4, clearcoatRoughness: 0.3 });
const WAND = soort("ruimwand", 0xdedfdc, { color: 0x6e7476, roughness: 0.7, metalness: 0.3 });
const ZAND = soort("zand", 0xeee5d0, { color: 0xb59a6b, roughness: 0.95, metalness: 0 });
const BRONS = soort("brons", 0xeee3cc, { color: 0xb68f57, roughness: 0.3, metalness: 0.9 });
const ANKERGRIJS = soort("ankergrijs", 0xd9dbdc, { color: 0x8b9095, roughness: 0.45, metalness: 0.7 });
const AUTO = soort("autolak", 0xe1e5e8, { color: 0x6c7a82, roughness: 0.35, metalness: 0.4, clearcoat: 0.8 });
const RUIT = soort("ruit", 0xc9d6dc, { color: 0x8fb0bf, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false });
MAT.ruit.teken.transparent = true; MAT.ruit.teken.opacity = 0.35; MAT.ruit.teken.depthWrite = false;
const WATER = soort("water", 0xd3e2e8, { color: 0x2f5a68, roughness: 0.4, metalness: 0, specularIntensity: 0.25, envMapIntensity: 0.35, transparent: true, opacity: 0.5, depthWrite: false });
MAT.water.teken.transparent = true; MAT.water.teken.opacity = 0.5; MAT.water.teken.depthWrite = false;

// ---- de vorm van de romp: halve breedte, bodem en dekrand per plek x
function halfB(x) {
  if (x > 16) { const u = cl((x - 16) / 9, 0, 1); return B2 * Math.sqrt(Math.max(0, 1 - u ** 2.4)); }
  if (x < -21) { const v = (-21 - x) / 4; return B2 - 0.45 * v * v; }
  return B2;
}
function bodem(x) { // de boeg loopt op als een lepel, achter loopt de bodem op naar de schroef
  if (x > 18) return KIEL + 2.75 * cl((x - 18) / 7, 0, 1) ** 1.8;
  if (x < -18) return KIEL + 2.1 * (1 - (1 - cl((-18 - x) / 7, 0, 1)) ** 3);
  return KIEL;
}
function dek(x) { let y = 3.7; if (x > 15) y += 0.9 * ((x - 15) / 10) ** 2; if (x < -15) y += 0.35 * ((-15 - x) / 10) ** 2; return y; }
function expo(x) { if (x > 18) return 9 - 6 * cl((x - 18) / 7, 0, 1); if (x < -18) return 9 - 4 * cl((-18 - x) / 7, 0, 1); return 9; }
// een punt op de doorsnede (superellips): th = 0 bij de dekrand, th = pi/2 midden onder; k = +1 stuurboord, -1 bakboord
function punt(x, th, k) {
  const W = halfB(x), yt = dek(x), H = yt - bodem(x), n = expo(x);
  const c = Math.max(0, Math.cos(th)), s = Math.max(0, Math.sin(th));
  return V(x, yt - H * s ** (2 / n), k * W * c ** (2 / n));
}
function thWater(x) { const yt = dek(x), H = yt - bodem(x), n = expo(x); if (bodem(x) >= WL) return Math.PI / 2; return Math.asin(Math.min(1, ((yt - WL) / H) ** (n / 2))); }
function zOp(x, y) { const yt = dek(x), H = yt - bodem(x), n = expo(x); const s = cl((yt - y) / H, 0, 1) ** (n / 2); return halfB(x) * Math.sqrt(Math.max(0, 1 - s * s)) ** (2 / n); }
const thetas = (a, b, n) => Array.from({ length: n + 1 }, (_, j) => a + ((b - a) * j) / n);
const NS = 170;
const XS = Array.from({ length: NS + 1 }, (_, i) => { const t = i / NS; return XH + (XB - XH) * (0.45 * t + 0.55 * (0.5 - 0.5 * Math.cos(Math.PI * t))); });
const tussen = (a, b) => [a, ...XS.filter((x) => x > a + 0.02 && x < b - 0.02), b];

// een vlak door rijen punten; elke driehoek wijst van ref(punt) af
function loft(rows, ref, o = {}) {
  const m = rows[0].length, pos = [], idx = [];
  for (const r of rows) for (const p of r) pos.push(p.x, p.y, p.z);
  const P = (i) => V(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
  const tri = (a, b, c) => {
    const A = P(a), B = P(b), C = P(c), n = B.clone().sub(A).cross(C.clone().sub(A));
    if (n.lengthSq() < 1e-12) return;
    const ce = A.add(B).add(C).multiplyScalar(1 / 3);
    if (n.dot(ce.clone().sub(ref(ce))) < 0) idx.push(a, c, b); else idx.push(a, b, c);
  };
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + 1, c = a + m, d = c + 1; tri(a, c, b); tri(b, c, d); }
  let g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  if (o.plat) g = g.toNonIndexed();
  g.computeVertexNormals(); return g;
}
// een bolle veelhoek dichtmaken, met de normaal naar "uit"
function waaier(pts, uit) {
  const c = pts.reduce((a, p) => a.add(p), V(0, 0, 0)).multiplyScalar(1 / pts.length), pos = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], n = a.clone().sub(c).cross(b.clone().sub(c));
    if (n.lengthSq() < 1e-12) continue;
    const t = n.dot(uit) > 0 ? [c, a, b] : [c, b, a]; for (const p of t) pos.push(p.x, p.y, p.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}

const schip = new THREE.Group(); root.add(schip); G.schip = schip;
// een onzichtbaar puntje als anker voor een naam met een lijntje
const merkMat = new THREE.MeshBasicMaterial({ visible: false });
function merk(x, y, z, ouder = schip) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), merkMat); m.position.set(x, y, z); ouder.add(m); return m; }

// ================= De romp =================
{
  const binnen = (p) => V(p.x, (bodem(p.x) + dek(p.x)) / 2, 0);
  const N1 = 22, N2 = 3;
  const onder = XS.map((x) => { const tw = thWater(x); return [...thetas(tw, Math.PI / 2, N1).map((t) => punt(x, t, -1)), ...thetas(Math.PI / 2, tw, N1).slice(1).map((t) => punt(x, t, 1))]; });
  const boven = (k) => XS.map((x) => thetas(0, thWater(x), N2).map((t) => punt(x, t, k)));
  const hekOnder = waaier(onder[0].map((p) => p.clone()), V(-1, 0, 0));
  const bp = thetas(0, thWater(XH), N2).map((t) => punt(XH, t, -1)), bs = thetas(thWater(XH), 0, N2).map((t) => punt(XH, t, 1));
  const hekBoven = waaier([...bp, ...bs], V(-1, 0, 0));
  const rOnder = mesh(samen([loft(onder, binnen), hekOnder]), ONDER, "romp");
  const rBoven = mesh(samen([loft(boven(1), binnen), loft(boven(-1), binnen), hekBoven]), ROMP, "romp");
  rOnder.userData.romp = rBoven.userData.romp = true;
  schip.add(rOnder, rBoven); G.romp = rOnder;
  // berghouten: twee stootranden rond het schip
  const bh = [];
  for (const dy of [0.12, 0.62]) {
    const pts = [];
    for (let x = XH + 0.15; x <= 24.2; x += 0.5) pts.push(V(x, dek(x) - dy, -(zOp(x, dek(x) - dy) + 0.05)));
    for (let x = 24.6; x >= XH + 0.15; x -= 0.5) pts.push(V(x, dek(x) - dy, zOp(x, dek(x) - dy) + 0.05));
    if (dy < 0.3) pts.splice(pts.findIndex((p) => p.z > 0), 0, V(XB + 0.04, dek(XB) - dy, 0));
    bh.push(buis(pts, 0.085, { seg: 420, rond: 8 }));
  }
  schip.add(mesh(samen(bh), "zwartmetaal", "romp"));
  // dekken: achterdek, voordek en de gangboorden langs het ruim
  const op_ = (p) => V(p.x, p.y - 1, 0);
  const vlak = (xs, z0, z1, n) => loft(xs.map((x) => thetas(0, 1, n).map((u) => { const W = halfB(x); return V(x, dek(x), z0(W) + (z1(W) - z0(W)) * u); })), op_);
  const dekG = [vlak(tussen(XH, -10), (W) => -W, (W) => W, 8), vlak(tussen(18.5, XB), (W) => -W, (W) => W, 8)];
  for (const k of [1, -1]) dekG.push(vlak(tussen(-10, 18.5), (W) => (k > 0 ? 2.64 : -W), (W) => (k > 0 ? W : -2.64), 2));
  schip.add(mesh(samen(dekG), DEK, "romp"));
  // potdeksel: een lage rand langs het dek, hoog bij de boeg
  const randH = (x) => 0.22 + 0.75 * sm((x - 19) / 5) + 0.12 * sm((-21 - x) / 3);
  for (const k of [1, -1]) {
    const xs = tussen(XH + 0.02, XB);
    const rows = xs.map((x) => { const W = halfB(x), Wi = Math.max(0, W - 0.07), y = dek(x), h = randH(x); return [V(x, y, k * W), V(x, y + h, k * W), V(x, y + h, k * Wi), V(x, y, k * Wi)]; });
    schip.add(mesh(loft(rows, (p) => V(p.x, dek(p.x) + randH(p.x) / 2, k * Math.max(0, halfB(p.x) - 0.035)), { plat: true }), ROMP, "romp"));
  }
  schip.add(mesh(new THREE.BoxGeometry(0.08, 0.34, 2 * halfB(XH)).translate(XH + 0.04, dek(XH) + 0.17, 0), ROMP, "romp"));
  // bolders: dubbele paaltjes om het schip vast te leggen
  const bolder = (x, z) => { const y = dek(x); return [new THREE.BoxGeometry(0.75, 0.06, 0.32).translate(x, y + 0.03, z), new THREE.CylinderGeometry(0.12, 0.13, 0.42, 14).translate(x - 0.2, y + 0.24, z), new THREE.CylinderGeometry(0.12, 0.13, 0.42, 14).translate(x + 0.2, y + 0.24, z), new THREE.CylinderGeometry(0.17, 0.17, 0.04, 14).translate(x - 0.2, y + 0.46, z), new THREE.CylinderGeometry(0.17, 0.17, 0.04, 14).translate(x + 0.2, y + 0.46, z)]; };
  const bol = [];
  for (const k of [1, -1]) for (const x of [21.4, -6, 4, 14, -21.2, -24.1]) bol.push(...bolder(x, k * (halfB(x) - (x > -10 && x < 18.5 ? 0.36 : 0.5))));
  schip.add(mesh(samen(bol), "zwartmetaal", "romp"));
  // reling: langs de gangboorden en rond het achterdek
  const rel = [];
  function reling(pts, h, stap) {
    const k = new THREE.CatmullRomCurve3(pts, false, "centripetal"), n = Math.max(2, Math.round(k.getLength() / stap));
    for (let i = 0; i <= n; i++) { const p = k.getPointAt(i / n); rel.push(staaf(p, p.clone().add(V(0, h, 0)), 0.03, 6)); }
    for (const f of [1, 0.5]) rel.push(buis(Array.from({ length: n * 3 + 1 }, (_, i) => k.getPointAt(i / (n * 3)).add(V(0, h * f, 0))), 0.032, { seg: n * 6, rond: 6 }));
  }
  for (const k of [1, -1]) {
    reling([-9.7, -2, 6, 14, 18.2].map((x) => V(x, dek(x), k * (halfB(x) - 0.1))), 0.95, 1.8);
    reling([-11.2, -16, -21, -23.5, XH + 0.15].map((x) => V(x, dek(x), k * (halfB(x) - 0.1))), 1.0, 1.4);
  }
  reling([-1, -0.5, 0, 0.5, 1].map((u) => V(XH + 0.15, dek(XH), u * (halfB(XH) - 0.1))), 1.0, 1.4);
  schip.add(mesh(samen(rel), "metaal", "romp"));
}

// ================= Het ruim, de lading en de luiken =================
const RX0 = -10, RX1 = 18.5, RZ = 2.58, YV = 1.0, YC = 4.75; // ruim: achter, voor, halve breedte, vloer, bovenkant luikhoofd
{
  const lx = RX1 - RX0, mx = (RX0 + RX1) / 2, h = YC - YV, my = (YC + YV) / 2;
  const w = [];
  for (const k of [1, -1]) w.push(new THREE.BoxGeometry(lx + 0.24, h, 0.12).translate(mx, my, k * (RZ + 0.06)));
  for (const x of [RX0 - 0.06, RX1 + 0.06]) w.push(new THREE.BoxGeometry(0.12, h, 2 * RZ + 0.24).translate(x, my, 0));
  w.push(new THREE.BoxGeometry(lx, 0.1, 2 * RZ).translate(mx, YV - 0.05, 0));
  const wanden = mesh(samen(w), WAND, "ruim");
  // het luikhoofd aan de buitenkant in de kleur van de romp, met een rail erop
  const lh = [];
  for (const k of [1, -1]) { const xs = [RX0 - 0.13, RX1 + 0.13]; lh.push(new THREE.BoxGeometry(xs[1] - xs[0], YC - 3.62, 0.03).translate(mx, (YC + 3.62) / 2, k * (RZ + 0.135))); }
  for (const s of [-1, 1]) lh.push(new THREE.BoxGeometry(0.03, YC - 3.62, 2 * RZ + 0.3).translate(s < 0 ? RX0 - 0.135 : RX1 + 0.135, (YC + 3.62) / 2, 0));
  const hoofd = mesh(samen(lh), ROMP, "ruim");
  const rail = [];
  for (const k of [1, -1]) rail.push(new THREE.BoxGeometry(lx + 0.3, 0.06, 0.1).translate(mx, YC + 0.03, k * (RZ + 0.1)));
  const rails = mesh(samen(rail), "metaal", "ruim");
  // zand, in een paar hopen gestort
  const rows = [];
  for (let i = 0; i <= 90; i++) {
    const x = RX0 + 0.08 + ((lx - 0.16) * i) / 90, r = [];
    for (let j = 0; j <= 18; j++) {
      const z = -RZ + 0.02 + ((2 * RZ - 0.04) * j) / 18, u = z / RZ;
      const hoop = 0.8 + 0.2 * Math.cos((TAU * (x - RX0)) / 7.1), ruw = 0.05 * Math.sin(x * 3.1 + z * 2.3) + 0.04 * Math.sin(x * 1.7 - z * 4.1);
      r.push(V(x, YV + 2.55 * (1 - 0.32 * u * u) * hoop + ruw, z));
    }
    rows.push(r);
  }
  G.lading = mesh(loft(rows, (p) => V(p.x, p.y - 1, p.z)), ZAND, "ruim");
  G.ruimG = groep(wanden, hoofd, rails); G.ladingG = groep(G.lading);
  schip.add(G.ruimG, G.ladingG);
  // acht luiken, licht gebogen; ze schuiven open en stapelen op elkaar
  const NL = 8, LL = lx / NL, s = new THREE.Shape();
  s.moveTo(-2.74, 0); s.lineTo(-2.74, 0.26); s.quadraticCurveTo(0, 0.78, 2.74, 0.26); s.lineTo(2.74, 0); s.lineTo(-2.74, 0);
  const kap = new THREE.ExtrudeGeometry(s, { depth: LL - 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 18 });
  kap.translate(0, 0, -(LL - 0.1) / 2); kap.rotateY(Math.PI / 2); kap.computeVertexNormals();
  const greep = samen([-1, 1].map((k) => new THREE.BoxGeometry(LL - 0.3, 0.07, 0.06).translate(0, 0.24, k * 2.78)));
  G.luikenU = new THREE.Group(); schip.add(G.luikenU);
  for (let i = 0; i < NL; i++) {
    const g = new THREE.Group(), x0 = RX0 + LL * (i + 0.5);
    g.add(mesh(kap, LUIK, "luiken"), mesh(greep, "zwartmetaal", "luiken"));
    g.position.set(x0, YC + 0.06, 0);
    const voor = i >= NL / 2, j = voor ? NL - 1 - i : i; // j = plek in de stapel
    g.userData.van = x0; g.userData.naar = voor ? RX0 + LL * (NL - 0.5) : RX0 + LL * 0.5; g.userData.j = j;
    G.luikenU.add(g); G.luiken.push(g);
  }
}

// ================= De woning, de schoorsteen en de auto =================
const YD = 6.29; // bovenkant van het dak van de woning
{
  const wx0 = -23.3, wx1 = -11.0, mx = (wx0 + wx1) / 2, by = 3.6, ty = 6.15, hz = 2.55;
  const huis = mesh(rondeDoos(wx1 - wx0, ty - by, 2 * hz, 0.12).translate(mx, (by + ty) / 2, 0), WIT, "woning");
  const dak = mesh(rondeDoos(wx1 - wx0 + 0.3, 0.14, 2 * hz + 0.26, 0.05).translate(mx, ty + 0.07, 0), WIT, "woning");
  const ramen = [], deuren = [];
  for (const k of [1, -1]) {
    for (const x of [-22.1, -20.3, -18.5, -15.8, -13.6]) ramen.push(rondeDoos(1.15, 0.72, 0.05, 0.02).translate(x, 5.1, k * (hz + 0.005)));
    deuren.push(rondeDoos(0.82, 1.95, 0.05, 0.02).translate(-12.1, by + 0.25 + 0.975, k * (hz + 0.005)));
  }
  for (const z of [-1.4, 1.4]) ramen.push(rondeDoos(0.05, 0.72, 1.2, 0.02).translate(wx1 + 0.005, 5.1, z));
  ramen.push(rondeDoos(0.05, 0.72, 1.0, 0.02).translate(wx0 - 0.005, 5.1, -1.5));
  deuren.push(rondeDoos(0.05, 1.95, 0.82, 0.02).translate(wx0 - 0.005, by + 0.25 + 0.975, 1.2));
  const rm = mesh(samen(ramen), "raam", "woning"), dr = mesh(samen(deuren), "naad", "woning");
  // reling op het dak
  const rel = [], hoek = [V(-11.3, YD, -2.5), V(-23.1, YD, -2.5), V(-23.1, YD, 2.5), V(-11.3, YD, 2.5)];
  for (let i = 0; i < 3; i++) {
    const a = hoek[i], b = hoek[i + 1], n = Math.round(a.distanceTo(b) / 1.5);
    for (let q = 0; q <= n; q++) { const p = a.clone().lerp(b, q / n); rel.push(staaf(p, p.clone().add(V(0, 0.9, 0)), 0.03, 6)); }
    for (const f of [0.9, 0.45]) rel.push(staaf(a.clone().add(V(0, f, 0)), b.clone().add(V(0, f, 0)), 0.03, 6));
  }
  const relM = mesh(samen(rel), "metaal", "woning");
  const kraag = mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.2, 28).translate(-12.8, YD + 0.1, 0), "metaal", "woning");
  // een trapje van het dek naar het dak
  const trap = [staaf(V(-11.0, 3.72, -2.85), V(-11.6, YD, -2.62), 0.035, 6), staaf(V(-11.0, 3.72, -2.45), V(-11.6, YD, -2.22), 0.035, 6)];
  for (let i = 1; i < 8; i++) { const t = i / 8; trap.push(staaf(V(-11.0 - 0.6 * t, 3.72 + (YD - 3.72) * t, -2.87 + 0.23 * t), V(-11.0 - 0.6 * t, 3.72 + (YD - 3.72) * t, -2.43 + 0.23 * t), 0.03, 6)); }
  const trapM = mesh(samen(trap), "metaal", "woning");
  G.woningG = groep(huis, dak, rm, dr, relM, kraag, trapM); schip.add(G.woningG); G.woning = huis;
  // schoorsteen (de uitlaat van de motor), iets naar achteren gebogen
  const sch = new THREE.Group(); sch.position.set(-16.3, YD, -1.55); sch.rotation.z = 0.1;
  sch.add(mesh(rondeDoos(0.95, 2.0, 0.62, 0.26).translate(0, 1.0, 0), ROMP, "schoorsteen"), mesh(rondeDoos(0.99, 0.12, 0.66, 0.27).translate(0, 2.02, 0), "zwartmetaal", "schoorsteen"),
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 14).translate(0.15, 2.15, 0), "zwartmetaal", "schoorsteen"));
  schip.add(sch); G.schoorsteen = sch;
  // een gewone auto zonder merk, en een kraantje om hem aan wal te zetten
  const auto = new THREE.Group(); auto.position.set(-20.3, YD, 0.95);
  const wielen = [];
  for (const x of [-1.28, 1.28]) for (const z of [-0.74, 0.74]) wielen.push(new THREE.CylinderGeometry(0.31, 0.31, 0.2, 22).rotateX(Math.PI / 2).translate(x, 0.31, z));
  const naven = wielen.map((w, i) => new THREE.CylinderGeometry(0.17, 0.17, 0.21, 16).rotateX(Math.PI / 2).translate(i < 2 ? -1.28 : 1.28, 0.31, i % 2 ? 0.745 : -0.745));
  const profiel = (pts, d) => { const e = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: d - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 4 }); e.translate(0, 0, -(d - 0.12) / 2); e.computeVertexNormals(); return e; };
  const kap = [[-1.92, 0.36], [1.9, 0.36], [1.96, 0.72], [1.15, 0.9], [0.5, 1.36], [-1.15, 1.4], [-1.8, 1.02], [-1.94, 0.8]];
  const glas = [[0.95, 0.96], [0.47, 1.3], [-1.1, 1.33], [-1.62, 0.99]];
  const ruit = new THREE.BoxGeometry(0.04, 0.68, 1.44); ruit.rotateZ(0.95); ruit.translate(0.845, 1.15, 0);
  auto.add(mesh(profiel(kap, 1.66), AUTO, "auto"), mesh(samen([profiel(glas, 1.7), ruit]), "raam", "auto"), mesh(samen(wielen), "rubber", "auto"), mesh(samen(naven), "metaal", "auto"),
    mesh(samen([-1, 1].map((k) => rondeDoos(0.06, 0.12, 0.3, 0.02).translate(1.94, 0.78, k * 0.58))), "lamp", "auto"),
    mesh(samen([-1, 1].map((k) => rondeDoos(0.06, 0.12, 0.3, 0.02).translate(-1.94, 0.8, k * 0.58))), "achterlicht", "auto"));
  const kr = [staaf(V(0, 0, 0), V(0, 2.3, 0), 0.11, 12), staaf(V(0, 2.2, 0), V(-2.7, 2.75, -0.9), 0.08, 10), staaf(V(-2.7, 2.75, -0.9), V(-2.7, 1.9, -0.9), 0.015, 4)];
  const kraan = new THREE.Group(); kraan.position.set(-17.5, YD, 1.85);
  kraan.add(mesh(samen([...kr, new THREE.CylinderGeometry(0.22, 0.26, 0.2, 16).translate(0, 0.1, 0), new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI * 1.4).translate(-2.7, 1.84, -0.9)]), "zwartmetaal", "auto"));
  G.auto = groep(auto, kraan); schip.add(G.auto); G.autoKar = auto;
}

// ================= Het stuurhuis (kan omhoog) =================
{
  const U = new THREE.Group(); U.position.set(-12.8, YD, 0); schip.add(U); G.stuurhuisU = U;
  const S = new THREE.Group(); U.add(S); G.stuurhuis = S;
  const hx = 1.6, hz = 2.2, wand = 1.2, raamT = 2.25;
  const muur = [
    new THREE.BoxGeometry(2 * hx + 0.1, 0.2, 2 * hz + 0.1).translate(0, 0.1, 0),
    new THREE.BoxGeometry(0.08, wand - 0.2, 2 * hz).translate(hx, (wand + 0.2) / 2, 0), new THREE.BoxGeometry(0.08, wand - 0.2, 2 * hz).translate(-hx, (wand + 0.2) / 2, 0),
    new THREE.BoxGeometry(2 * hx, wand - 0.2, 0.08).translate(0, (wand + 0.2) / 2, hz), new THREE.BoxGeometry(2 * hx, wand - 0.2, 0.08).translate(0, (wand + 0.2) / 2, -hz),
  ];
  const sty = (x, z) => new THREE.BoxGeometry(0.09, raamT - wand, 0.09).translate(x, (raamT + wand) / 2, z);
  for (const x of [-hx, hx]) for (const z of [-hz, hz]) muur.push(sty(x, z));
  for (const z of [-1.1, 0, 1.1]) muur.push(sty(hx, z));
  for (const k of [-1, 1]) muur.push(sty(0, k * hz)); muur.push(sty(-hx, 0));
  const dak = rondeDoos(2 * hx + 0.6, 0.16, 2 * hz + 0.3, 0.06).translate(0.2, raamT + 0.08, 0);
  muur.push(new THREE.BoxGeometry(2 * hx + 0.1, 0.08, 2 * hz + 0.1).translate(0, raamT, 0));
  S.add(mesh(samen(muur), WIT, "stuurhuis"), mesh(dak, WIT, "stuurhuis"));
  const ramen = [new THREE.BoxGeometry(0.025, raamT - wand, 2 * hz).translate(hx, (raamT + wand) / 2, 0), new THREE.BoxGeometry(0.025, raamT - wand, 2 * hz).translate(-hx, (raamT + wand) / 2, 0),
    new THREE.BoxGeometry(2 * hx, raamT - wand, 0.025).translate(0, (raamT + wand) / 2, hz), new THREE.BoxGeometry(2 * hx, raamT - wand, 0.025).translate(0, (raamT + wand) / 2, -hz)];
  const glas = mesh(samen(ramen), RUIT, "stuurhuis", { schaduw: false }); glas.userData.geenLijn = true; S.add(glas);
  // binnen: de stuurtafel met schermen, het stuurwiel en de stoel van de schipper
  const tafel = rondeDoos(0.55, 0.9, 3.4, 0.05).translate(1.22, 0.65, 0);
  const tafelBlad = rondeDoos(0.75, 0.06, 3.5, 0.02); tafelBlad.rotateZ(0.35); tafelBlad.translate(1.12, 1.12, 0);
  S.add(mesh(samen([tafel, tafelBlad]), "zwartmetaal", "stuurhuis"));
  const sch = [];
  for (const z of [-1.0, -0.3, 0.4, 1.1]) { const b = new THREE.BoxGeometry(0.03, 0.34, 0.55); b.rotateZ(0.4); b.translate(1.33, 1.36, z); sch.push(b); }
  S.add(mesh(samen(sch), "scherm", "stuurhuis"));
  const wiel = new THREE.Group(); wiel.position.set(0.78, 1.12, -0.05); wiel.rotation.z = 0.45;
  const spaken = [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * TAU; return staaf(V(0, 0, 0), V(0, Math.cos(a) * 0.27, Math.sin(a) * 0.27), 0.018, 6); });
  const knoppen = [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * TAU; return staaf(V(0, Math.cos(a) * 0.29, Math.sin(a) * 0.29), V(0, Math.cos(a) * 0.4, Math.sin(a) * 0.4), 0.025, 8); });
  wiel.add(mesh(samen([new THREE.TorusGeometry(0.29, 0.025, 8, 40).rotateY(Math.PI / 2), ...spaken, ...knoppen, new THREE.CylinderGeometry(0.06, 0.06, 0.1, 14).rotateZ(Math.PI / 2), staaf(V(0, 0, 0), V(0.4, 0, 0), 0.03, 8)]), "metaal", "stuurhuis"));
  S.add(wiel); G.stuurwiel = wiel;
  const stoel = [rondeDoos(0.55, 0.12, 0.55, 0.04).translate(0.05, 0.7, -0.05), rondeDoos(0.1, 0.7, 0.55, 0.04).translate(-0.24, 1.08, -0.05), staaf(V(0.05, 0.2, -0.05), V(0.05, 0.64, -0.05), 0.04, 8), new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16).translate(0.05, 0.22, -0.05)];
  S.add(mesh(samen(stoel), "stoel", "stuurhuis"));
  // boordlichten aan de zijkant: rood bakboord (links), groen stuurboord (rechts)
  for (const k of [1, -1]) {
    S.add(mesh(new THREE.BoxGeometry(0.5, 0.36, 0.05).translate(1.15, 1.75, k * (hz + 0.07)), "zwartmetaal", "stuurhuis"));
    const lamp = mesh(new THREE.BoxGeometry(0.2, 0.24, 0.12).translate(1.2, 1.75, k * (hz + 0.16)), k > 0 ? "groenlicht" : "roodlicht", "lichten");
    S.add(lamp); G.lichten[k > 0 ? "groen" : "rood"] = lamp;
  }
  // op het dak: de radar (draait) en de hoorn
  S.add(mesh(samen([staaf(V(-0.7, raamT + 0.16, 0), V(-0.7, raamT + 1.0, 0), 0.06, 10), new THREE.BoxGeometry(0.4, 0.2, 0.4).translate(-0.7, raamT + 1.05, 0)]), "zwartmetaal", "stuurhuis"));
  const radar = new THREE.Group(); radar.position.set(-0.7, raamT + 1.2, 0);
  radar.add(mesh(rondeDoos(0.16, 0.14, 1.9, 0.05), WIT, "stuurhuis")); S.add(radar); G.radar = radar;
  S.add(mesh(samen([new THREE.ConeGeometry(0.11, 0.42, 16, 1, true).rotateZ(Math.PI / 2).translate(1.3, raamT + 0.32, 0.8), staaf(V(1.15, raamT + 0.16, 0.8), V(1.15, raamT + 0.32, 0.8), 0.03, 6)]), "metaal", "stuurhuis"));
  // de hefpaal onder het stuurhuis: steekt in de woning als het stuurhuis laag staat
  S.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 3.4, 24).translate(0, -1.7, 0), "metaal", "stuurhuis"));
  G.hefMerk = merk(0, -0.6, 0.33, S);
}

// ================= Het voorschip: mast, ankers, lier en boegschroef =================
{
  const mx = 19.6, my = dek(mx);
  const mast = new THREE.Group(); mast.position.set(mx, my, 0); schip.add(mast); G.mast = mast;
  mast.add(mesh(samen([new THREE.BoxGeometry(0.5, 0.3, 0.4).translate(0, 0.15, 0), new THREE.CylinderGeometry(0.07, 0.11, 5.4, 14).translate(0, 0.3 + 2.7, 0), staaf(V(0, 4.6, -0.5), V(0, 4.6, 0.5), 0.04, 8)]), "zwartmetaal", "mast"));
  mast.add(mesh(new THREE.BoxGeometry(0.28, 0.06, 0.28).translate(0, 5.72, 0), "zwartmetaal", "mast"));
  const top = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 16).translate(0, 5.92, 0), "witlicht", "lichten"); mast.add(top); G.lichten.top = top;
  mast.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16).translate(0, 6.12, 0), "zwartmetaal", "mast"));
  // heklicht: wit, achter op het schip
  const hek = new THREE.Group(); hek.position.set(XH + 0.35, dek(XH), 0); schip.add(hek);
  hek.add(mesh(staaf(V(0, 0, 0), V(0, 1.25, 0), 0.05, 8), "zwartmetaal", "mast"));
  const hl = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 14).translate(0, 1.38, 0), "witlicht", "lichten"); hek.add(hl); G.lichten.hek = hl;
  // de ankerlier met twee trommels
  const lx = 21.4, ly = dek(lx);
  const lier = [new THREE.BoxGeometry(0.9, 0.3, 1.9).translate(lx, ly + 0.15, 0), rondeDoos(0.7, 0.55, 0.6, 0.08).translate(lx, ly + 0.55, 0)];
  for (const k of [1, -1]) lier.push(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 22).rotateX(Math.PI / 2).translate(lx, ly + 0.62, k * 0.62), new THREE.CylinderGeometry(0.4, 0.4, 0.05, 22).rotateX(Math.PI / 2).translate(lx, ly + 0.62, k * 0.86), new THREE.CylinderGeometry(0.4, 0.4, 0.05, 22).rotateX(Math.PI / 2).translate(lx, ly + 0.62, k * 0.38));
  schip.add(mesh(samen(lier), "zwartmetaal", "anker"));
  // twee ankers in een kluis aan de boeg, met de ketting naar de lier
  function anker() {
    const g = [new THREE.BoxGeometry(0.16, 1.05, 0.13).translate(0, 0.62, 0), rondeDoos(0.72, 0.2, 0.22, 0.06).translate(0, 0.1, 0), new THREE.TorusGeometry(0.1, 0.03, 8, 16).translate(0, 1.22, 0)];
    const blad = (k) => { const pts = [[0.08, 0.05], [0.36, 0.12], [0.3, 0.62], [0.2, 0.72]].map(([x, y]) => new THREE.Vector2(k * x, y)); if (k < 0) pts.reverse(); const e = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); e.translate(0, 0, -0.04); return e; };
    g.push(blad(1), blad(-1));
    return samen(g);
  }
  const ketting = (pts, r = 0.065) => {
    const k = new THREE.CatmullRomCurve3(pts), n = Math.floor(k.getLength() / (r * 2.5)), basis = new THREE.TorusGeometry(r, r * 0.32, 6, 14).scale(1.5, 1, 1), geos = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, p = k.getPointAt(t), q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), k.getTangentAt(t));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), i % 2 ? Math.PI / 2 : 0));
      geos.push(basis.clone().applyQuaternion(q).translate(p.x, p.y, p.z));
    }
    return samen(geos);
  };
  const ax = 22.9, ay = 2.95;
  for (const k of [1, -1]) {
    const yc = ay + 0.62, z0 = zOp(ax, yc), e = 0.15, d = (zOp(ax + e, yc) - zOp(ax - e, yc)) / (2 * e), n = V(-d, 0, k).normalize();
    const kl = new THREE.Group(); kl.position.set(ax, 0, k * z0).addScaledVector(n, 0.03); kl.rotation.y = -k * Math.atan(d);
    kl.add(mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20).translate(0, ay + 1.3, 0), "zwartmetaal", "anker"));
    const a = new THREE.Group(); a.position.set(ax, ay, k * z0).addScaledVector(n, 0.12); a.rotation.y = -k * Math.atan(d);
    a.add(mesh(anker(), ANKERGRIJS, "anker"));
    schip.add(kl, a); G[k > 0 ? "ankerR" : "ankerL"] = a; G[k > 0 ? "kluisR" : "kluisL"] = kl;
    const hz = halfB(ax) - 0.55, hy = dek(ax);
    const kp = mesh(samen([new THREE.CylinderGeometry(0.2, 0.24, 0.16, 18).translate(ax, hy + 0.08, k * hz), ketting([V(ax - 0.05, hy + 0.12, k * hz), V(22.4, hy + 0.1, k * (hz - 0.3)), V(21.9, hy + 0.35, k * 0.66), V(lx + 0.05, ly + 0.95, k * 0.62)])]), "ketting", "anker");
    schip.add(kp);
  }
  // boegschroef: een buis dwars door de neus met een schroefje erin
  const bx = 21.0, by = 1.72, br = 0.38, bz = zOp(bx, by);
  const boeg = new THREE.Group(); schip.add(boeg); G.boeg = boeg;
  const buisG = new THREE.CylinderGeometry(br, br, 2 * bz - 0.02, 32, 1, true).rotateX(Math.PI / 2).translate(bx, by, 0);
  { const ix = buisG.index.array; for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; } buisG.computeVertexNormals(); }
  boeg.add(mesh(samen([buisG, new THREE.CylinderGeometry(0.22, 0.26, 1.1, 16).translate(bx, by + br + 0.5, 0), rondeDoos(0.6, 0.55, 0.6, 0.06).translate(bx, by + br + 1.25, 0)]), "zwartmetaal", "boegschroef"));
  const bp = new THREE.Group(); bp.position.set(bx, by, 0);
  const bl = []; for (let i = 0; i < 4; i++) { const b = new THREE.BoxGeometry(0.03, 0.3, 0.12).translate(0, 0.2, 0); b.rotateY(0.55); b.rotateZ((i / 4) * TAU); bl.push(b); }
  bp.add(mesh(samen([...bl, new THREE.CylinderGeometry(0.08, 0.08, 0.2, 14).rotateX(Math.PI / 2)]), BRONS, "boegschroef")); boeg.add(bp); G.boegprop = bp;
  // de gaten in de romp (weg als de romp doorzichtig is)
  const gat = new THREE.Group();
  for (const k of [1, -1]) {
    const z = k * (zOp(bx, by) + 0.02);
    gat.add(mesh(new THREE.CircleGeometry(br, 32).rotateY(k > 0 ? 0 : Math.PI).translate(bx, by, z), "raam", "boegschroef"));
    const rooster = []; for (let i = -2; i <= 2; i++) rooster.push(new THREE.BoxGeometry(0.035, 2 * Math.sqrt(br * br - (i * 0.13) ** 2), 0.03).translate(bx + i * 0.13, by, z + k * 0.01));
    gat.add(mesh(samen([...rooster, new THREE.TorusGeometry(br, 0.035, 6, 32).translate(bx, by, z)]), "zwartmetaal", "boegschroef"));
  }
  schip.add(gat); G.gat = gat;
}

// ================= Schroef, straalbuis en roer =================
{
  const sx = -22.15, sy = 1.55;
  const U = new THREE.Group(); schip.add(U); G.schroefU = U;
  const S = new THREE.Group(); S.position.set(sx, sy, 0); U.add(S); G.schroef = S;
  const bs = new THREE.Shape(); bs.moveTo(-0.1, 0.14); bs.bezierCurveTo(-0.38, 0.3, -0.36, 0.66, -0.05, 0.72); bs.bezierCurveTo(0.22, 0.73, 0.3, 0.42, 0.12, 0.14); bs.lineTo(-0.1, 0.14);
  const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 12 });
  bg.translate(0, 0, -0.015); bg.rotateY(Math.PI / 2); bg.rotateY(0.6);
  const bladen = [0, 1, 2, 3].map((i) => bg.clone().rotateX((i / 4) * TAU));
  S.add(mesh(samen([...bladen, new THREE.CylinderGeometry(0.17, 0.21, 0.5, 22).rotateZ(Math.PI / 2), new THREE.SphereGeometry(0.17, 18, 10, 0, TAU, 0, Math.PI / 2).rotateZ(Math.PI / 2).translate(-0.25, 0, 0)]), BRONS, "schroef"));
  // straalbuis: een ring om de schroef, aan de romp vast
  const prof = [[0.79, 0.4], [0.88, 0.34], [0.93, 0.12], [0.88, -0.28], [0.8, -0.36], [0.76, -0.22], [0.76, 0.26], [0.79, 0.4]];
  const ring = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56).rotateZ(-Math.PI / 2).translate(sx, sy, 0);
  const steun = [-0.22, 0.22].map((dx) => staaf(V(sx + dx, sy + 0.86, 0), V(sx + dx, bodem(sx + dx) + 0.2, 0), 0.07, 8));
  U.add(mesh(samen([ring, ...steun]), ONDER, "schroef"));
  // de schroefas en de scheg waar hij uit komt
  const as = [staaf(V(-19.2, sy, 0), V(sx + 0.2, sy, 0), 0.09, 14), new THREE.CylinderGeometry(0.2, 0.24, 1.5, 18).rotateZ(Math.PI / 2).translate(-20.0, sy, 0)];
  U.add(mesh(as[0], "metaal", "schroef"), mesh(as[1], ONDER, "schroef"));
  const sp = [V(-19.2, sy - 0.08), V(-20.75, sy - 0.08), V(-20.75, bodem(-20.75) + 0.12), V(-20.2, bodem(-20.2) + 0.12), V(-19.6, bodem(-19.6) + 0.12), V(-19.2, bodem(-19.2) + 0.12)];
  const scheg = new THREE.ExtrudeGeometry(new THREE.Shape(sp.map((p) => new THREE.Vector2(p.x, p.y))), { depth: 0.14, bevelEnabled: false }); scheg.translate(0, 0, -0.07);
  schip.add(mesh(scheg, ONDER, "romp"));
  // het roer: draait om de roerkoning
  const R = new THREE.Group(); R.position.set(-23.3, 0, 0); schip.add(R); G.roer = R;
  const rs = [0.8, 2.42].map((h) => ({ le: 0.36, c: 1.5, t: 0.17, h })); rs.wortelDicht = true;
  R.add(mesh(samen([naarBuitenG(vleugelvorm(rs, (x, y, sc) => V(x, sc.h, y)), V(-0.4, 1.6, 0)), staaf(V(0, 2.3, 0), V(0, bodem(-23.3) + 0.25, 0), 0.1, 12)]), ONDER, "roer"));
}

// ================= Het water: doorzichtig, met een zachte rand =================
const water = (() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const c2 = cv.getContext("2d"), gr = c2.createRadialGradient(128, 128, 30, 128, 128, 128);
  gr.addColorStop(0, "#fff"); gr.addColorStop(0.62, "#fff"); gr.addColorStop(1, "#000"); c2.fillStyle = gr; c2.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv); MAT.water.teken.alphaMap = MAT.water.donker.alphaMap = tex;
  const m = mesh(new THREE.PlaneGeometry(112, 40, 1, 1).rotateX(-Math.PI / 2).translate(0, WL, 0), WATER, "water", { schaduw: false });
  m.userData.geenLijn = true; m.raycast = () => {}; m.renderOrder = 2;
  return m;
})();


// ================= Teksten (maten zijn die van de tekening) =================
const SECTIES = [
  { sleutel: "boot", naam: "De boot", titel: "De boot", tekst: "Een binnenvaartschip vaart over rivieren en kanalen. Het brengt zand, grind of graan van haven naar haven. Kijken bij het water doe je samen met een volwassene, met een zwemvest aan.",
    cam: [0.72, 0.28, 78, [0, 4.4, 0], 30], focus: null, deining: true,
    specs: [["Lengte", "50 m in de tekening"], ["Breedte", "6,6 m in de tekening"], ["Onder water", "2,5 m in de tekening"], ["Lading", "zand, in de tekening"], ["Lampjes", "tik", "lichten"]],
    namen: [["stuurhuis", "STUURHUIS", 20, -90], ["luiken", "LUIKEN", 40, -70], ["mast", "MAST", 50, -40], ["romp", "ROMP", 50, 60], ["woning", "WONING", -60, 70]] },
  { sleutel: "romp", naam: "De romp", titel: "De romp", tekst: "De romp is van staal en hol van binnen. Daarom blijft het schip drijven, ook met heel veel lading. Het onderste stuk zit onder water.",
    cam: [0.12, 0.1, 98, [0, 3.4, 0], 30], focus: ["romp"],
    specs: [["Lengte", "50 m in de tekening"], ["Breedte", "6,6 m in de tekening"], ["Onder water", "2,5 m in de tekening"], ["Boven water", "0,7 m tot het dek"], ["Berghouten", "2 aan elke kant"]],
    namen: [["waterlijn", "ONDER WATER", 40, 60], ["dek", "GANGBOORD", 60, -60], ["berghout", "BERGHOUT", -60, -50]] },
  { sleutel: "ruim", naam: "Het ruim", titel: "Het ruim en de luiken", tekst: "In het ruim ligt de lading, hier zand. Kijk: de luiken schuiven open en gaan op een stapel. Dan kan een kraan de lading eruit halen.",
    cam: [0.55, 0.78, 50, [4.5, 3.6, 0], 32], focus: ["ruim", "luiken"], luiken: true,
    specs: [["Luiken", "8 in de tekening"], ["Ruim", "28,5 m lang in de tekening"], ["Lading", "zand"], ["Open", "de luiken gaan op twee stapels"]],
    namen: [["lading", "LADING · ZAND", 50, 50], ["luikStapel", "LUIKEN", 40, -80], ["luikVoor", "LUIKEN", 50, -50]] },
  { sleutel: "stuurhuis", naam: "Het stuurhuis", titel: "Het stuurhuis", tekst: "Hier stuurt de schipper. Het stuurhuis kan omhoog, dan kijkt de schipper over de lading heen. Voor een lage brug gaat het weer omlaag.",
    cam: [0.95, 0.2, 24, [-12.8, 8.6, 0], 32], focus: ["stuurhuis", "lichten"], stuurhuisOp: true, radar: true,
    specs: [["Omhoog", "2,8 m in de tekening"], ["Ramen", "rondom"], ["Radar", "draait op het dak"], ["Boordlichten", "rood links, groen rechts"]],
    namen: [["stuurwiel", "STUURWIEL", 60, 40], ["radar", "RADAR", -60, -40], ["groen", "GROEN LICHT", 70, -30], ["hefpaal", "HEFPAAL", -70, 30]] },
  { sleutel: "woning", naam: "De woning", titel: "De woning", tekst: "Achter op het schip woont de schipper, soms met het hele gezin. Er is een keuken, een badkamer en slaapkamers. De auto gaat mee, en een kraantje zet hem aan wal.",
    cam: [-0.62, 0.36, 34, [-17.5, 5.6, 0], 32], focus: ["woning", "schoorsteen", "auto"],
    specs: [["Woning", "12 m lang in de tekening"], ["Ramen", "12 in de tekening"], ["Auto", "1, met een kraantje"], ["Schoorsteen", "de uitlaat van de motor"]],
    namen: [["woning", "WONING", -50, 95], ["auto", "AUTO", -60, -60], ["schoorsteen", "SCHOORSTEEN", 70, -45], ["kraan", "KRAANTJE", 30, -100]] },
  { sleutel: "schroef", naam: "Schroef en roer", titel: "De schroef en het roer", tekst: "Achter onder water draait de schroef. Die duwt het water naar achteren, en dan gaat het schip vooruit. Met het roer stuurt de schipper naar links of naar rechts.",
    cam: [-1.05, 0.15, 13, [-22.4, 1.9, 0], 32], focus: ["schroef", "roer"], schroef: true, roer: true,
    specs: [["Schroef", "4 bladen in de tekening"], ["Straalbuis", "een ring om de schroef"], ["Roer", "1, achter de schroef"], ["Motor", "binnen in de romp"]],
    namen: [["schroef", "SCHROEF", 50, 50], ["straalbuis", "STRAALBUIS", 60, -40], ["roer", "ROER", -60, -30]] },
  { sleutel: "voorschip", naam: "Het voorschip", titel: "Het voorschip", tekst: "Voorop hangen de ankers, met een ketting naar de lier. In de neus zit een boegschroef: een buis met een schroefje dat de neus opzij duwt. Boven in de mast brandt een wit licht.",
    cam: [1.12, 0.22, 23, [22.2, 3.6, 0], 32], focus: ["anker", "boegschroef", "mast", "lichten"], doorzicht: true, boegschroef: true, lichten: true,
    specs: [["Ankers", "2, met ketting"], ["Boegschroef", "dwars door de neus"], ["Mast", "met een wit licht"], ["Lampjes", "tik", "lichten"]],
    namen: [["ankerR", "ANKER", 60, -20], ["boegschroef", "BOEGSCHROEF", -70, 60], ["lier", "LIER", -60, -40], ["top", "WIT LICHT", 60, -30]] },
];
const KIND = [
  { naam: "de boot", focus: ["romp"], cam: [0.72, 0.28, 78, [0, 4.4, 0], 30], geluid: "hoorn", deining: true },
  { naam: "het stuurhuis", focus: ["stuurhuis"], cam: [0.95, 0.2, 24, [-12.8, 8.6, 0], 32], stuurhuisOp: true, radar: true, geluid: "hoorn" },
  { naam: "de luiken", focus: ["luiken", "ruim"], cam: [0.55, 0.78, 50, [4.5, 3.6, 0], 32], luiken: true },
  { naam: "de schroef", focus: ["schroef", "boegschroef"], cam: [-1.05, 0.15, 13, [-22.4, 1.9, 0], 32], schroef: true, geluid: "brom" },
  { naam: "het roer", focus: ["roer"], cam: [-1.35, 0.15, 11, [-23.4, 1.9, 0], 32], roer: true },
  { naam: "het anker", focus: ["anker"], cam: [1.1, 0.18, 15, [22.6, 3.5, 0], 32] },
  { naam: "de lampjes", focus: ["lichten", "mast"], cam: [0.5, 0.35, 70, [-2, 5, 0], 32], lichten: true },
  { naam: "de auto", focus: ["auto"], cam: [-0.5, 0.4, 20, [-19.5, 7, 0.5], 32], geluid: "toeter" },
  { naam: "de schoorsteen", focus: ["schoorsteen", "woning"], cam: [-0.62, 0.36, 34, [-17.5, 5.6, 0], 32] },
];


function mini(aan) {
  const sx = (x) => (60 + x * 2.12).toFixed(1), sy = (y) => (54 - y * 2.12).toFixed(1);
  const xs = Array.from({ length: 41 }, (_, i) => XH + (i / 40) * (XB - XH));
  const romp = xs.map((x) => `${sx(x)},${sy(dek(x))}`).concat(xs.slice().reverse().map((x) => `${sx(x)},${sy(bodem(x))}`));
  const rect = (x0, y0, x1, y1, d) => `<path d="M${sx(x0)},${sy(y0)}H${sx(x1)}V${sy(y1)}H${sx(x0)}Z" class="${d}"/>`;
  return `<path d="M${romp.join("L")}Z" class="${aan("romp")}"/>` +
    `<path d="M${sx(XH - 3)},${sy(WL)}H${sx(XB + 3)}" style="stroke-width:0.8;stroke-dasharray:2 2"/>` +
    rect(RX0, 3.7, RX1, YC + 0.4, aan("luiken") || aan("ruim")) + rect(-23.3, 3.75, -11, 6.2, aan("woning")) + rect(-14.4, YD, -11.2, YD + 2.4, aan("stuurhuis")) +
    rect(-22.2, YD, -18.4, YD + 1.4, aan("auto")) +
    `<line x1="${sx(-16.3)}" y1="${sy(YD)}" x2="${sx(-16.5)}" y2="${sy(YD + 2)}" class="${aan("schoorsteen")}" style="stroke-width:3"/>` +
    `<line x1="${sx(19.6)}" y1="${sy(3.9)}" x2="${sx(19.6)}" y2="${sy(10)}" class="${aan("mast") || aan("lichten")}"/>` +
    `<circle cx="${sx(-22.15)}" cy="${sy(1.55)}" r="1.8" class="${aan("schroef")}"/>` + rect(-24.4, 0.8, -23, 2.4, aan("roer")) +
    `<path d="M${sx(22.9)},${sy(4.2)}V${sy(3.0)}M${sx(22.2)},${sy(3.3)}Q${sx(22.9)},${sy(2.7)} ${sx(23.6)},${sy(3.3)}" class="${aan("anker")}"/>`;
}


let vorigeT = null, tijd = 0, open = 0, lift = 0, liftT = 0, schroefV = 0, roerT = 0, eerst = true;
function beweeg(dt, h, s) {
  if (eerst) { root.add(water); eerst = false; }
  dt = vorigeT === null ? 0 : Math.min(1, Math.max(0, (s.t - vorigeT) / 1000)); vorigeT = s.t; // echte tijd: ook op een traag toestel klaar op tijd
  let bezig = false; tijd += dt;
  // deining: het schip gaat heel zacht op en neer
  if (h.deining && !s.uiteen) { schip.position.y = 0.05 * Math.sin(tijd * 1.1); schip.rotation.x = 0.004 * Math.sin(tijd * 0.8); bezig = true; }
  else if (Math.abs(schip.position.y) + Math.abs(schip.rotation.x) > 1e-4) { schip.position.y *= 0.9; schip.rotation.x *= 0.9; bezig = true; }
  // luiken open en dicht
  const oDoel = h.luiken ? 1 : 0;
  if (Math.abs(open - oDoel) > 1e-3) { open += Math.sign(oDoel - open) * Math.min(Math.abs(oDoel - open), dt / 3.2); bezig = true; }
  for (const g of G.luiken) {
    const { van, naar, j } = g.userData; if (!j) continue;
    const p = cl((open - (j - 1) * 0.25) / 0.5, 0, 1), omhoog = sm(p / 0.3), schuif = sm((p - 0.3) / 0.7);
    g.position.x = van + (naar - van) * schuif; g.position.y = YC + 0.06 + j * 0.56 * omhoog;
  }
  // het stuurhuis gaat langzaam omhoog en weer omlaag
  if (h.stuurhuisOp && !s.uiteen) { liftT += dt; const doel = 2.8 * (0.5 - 0.5 * Math.cos(liftT * 0.55)); lift = doel; bezig = true; }
  else { liftT = 0; if (lift > 1e-3) { lift += (0 - lift) * Math.min(1, dt * 2); bezig = true; } else lift = 0; }
  G.stuurhuis.position.y = lift;
  // schroef, roer, radar, boegschroef
  const vDoel = h.schroef || s.uiteen ? 7 : h.deining ? 2.5 : 0; schroefV += (vDoel - schroefV) * Math.min(1, dt * 1.5);
  if (schroefV > 0.01) { G.schroef.rotation.x -= schroefV * dt; bezig = true; }
  if (h.roer) { roerT += dt; G.roer.rotation.y = Math.sin(roerT * 1.1) * 0.55; bezig = true; }
  else if (Math.abs(G.roer.rotation.y) > 1e-3) { G.roer.rotation.y *= 0.9; bezig = true; }
  if (h.radar || h.deining) { G.radar.rotation.y += dt * 2.2; bezig = true; }
  if (h.boegschroef) { G.boegprop.rotation.z += dt * 9; bezig = true; }
  // lampjes
  const aan = s.lichtAan || h.lichten || s.uiteen;
  if (s.lichtAan || h.lichten) bezig = true;
  for (const k of ["teken", "donker"]) MAT.roodlicht[k].emissiveIntensity = MAT.groenlicht[k].emissiveIntensity = MAT.witlicht[k].emissiveIntensity = aan ? 2.4 : 0.15;
  return bezig;
}
const MERK = { dek: merk(8, dek(8), halfB(8) - 0.3), berghout: merk(-4, dek(-4) - 0.62, halfB(-4) + 0.12), waterlijn: merk(2, 1.6, halfB(2)) };
return {
  titel: "De boot", label: "Boot", model: "Binnenvaartschip · 50 m", schaal: "Maten in meters", hint: "Sleep om te draaien · tik op de lampjes", SECTIES, KIND, mini, beweeg,
  doorzicht: (aan) => { G.gat.visible = !aan; },
  anker: () => ({ romp: G.romp, ...MERK, lading: G.lading, luikStapel: G.luiken[1], luikVoor: G.luiken[6], luiken: G.luiken[3], stuurhuis: G.stuurhuis, stuurwiel: G.stuurwiel, radar: G.radar,
    groen: G.lichten.groen, hefpaal: G.hefMerk, woning: G.woning, auto: G.autoKar, schoorsteen: G.schoorsteen, kraan: DELEN.auto[DELEN.auto.length - 1],
    schroef: G.schroef, straalbuis: DELEN.schroef[1], roer: G.roer, ankerR: G.ankerR, boegschroef: G.boeg, lier: DELEN.anker[0], top: G.lichten.top, mast: G.mast }),
  uiteenCam: [0.72, 0.42, 104, [1.5, 6.5, 0], 32],
  uiteen: () => [
    [G.stuurhuisU, [0, 9, 0], "STUURHUIS", [60, -30]], [G.schoorsteen, [0, 7, -4], "SCHOORSTEEN", [-60, -30]], [G.auto, [-1, 6, 5], "AUTO", [-60, 30]],
    [G.woningG, [0, 3.5, 0], "WONING", [-70, 20]], [G.luikenU, [0, 6, 0], "LUIKEN", [60, -30]], [G.ladingG, [0, 2.5, 0], "LADING", [60, 20]],
    [G.mast, [3, 3, 0], "MAST", [50, -30]], [G.ankerR, [3, -0.5, 4], "ANKER", [60, -40]], [G.ankerL, [3, -0.5, -4], null], [G.boeg, [0, -1, 6], "BOEGSCHROEF", [-70, 50]],
    [G.schroefU, [-4, -0.6, 0], "SCHROEF", [-60, 40]], [G.roer, [-8, 0, 0], "ROER", [-60, 0]],
  ],
};
}
