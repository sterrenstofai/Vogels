// De trein: een algemene elektrische trein, in code getekend (maten in meters; de kop wijst naar +x, rechts is +z).
// Een kopwagen met cabine en het begin van de tweede wagen, op een stukje spoor onder de bovenleiding.
// Geen bestaand type, geen merk, geen kleurstelling van een vervoerder. Module voor /js/kern.js.
export default function maak(ctx) {
const { THREE, V, TAU, root, MAT, soort, DELEN, mesh, groep, op, buis, samen, staaf, draai, rondeDoos, naarBuitenG } = ctx;
const G = { wielstellen: [], deuren: [], wit: [], rood: [], draaistellen: [] };
const glad01 = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
// eigen kleuren: rustig grijs-wit met een donkere band (eerste kleur = stand "Tekening")
const LAK = soort("treinlak", 0xfbfbf9, { color: 0xd8dadb, roughness: 0.32, metalness: 0.08, clearcoat: 0.8, clearcoatRoughness: 0.18 });
const BAND = soort("treinband", 0xc9cac8, { color: 0x34373b, roughness: 0.35, metalness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.2 });
const ONDER = soort("treinonder", 0xd9d9d6, { color: 0x4a4d51, roughness: 0.6, metalness: 0.3 });
const DEUR = soort("treindeur", 0xf3f3f1, { color: 0xc9ccce, roughness: 0.35, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.2 });
const GAT = soort("deuropening", 0x8c8e90, { color: 0x121314, roughness: 0.8, metalness: 0 });
const BETON = soort("beton", 0xe6e4df, { color: 0x8f8d88, roughness: 0.92, metalness: 0 });
const BALLAST = soort("ballast", 0xdedbd4, { color: 0x6e6a64, roughness: 0.95, metalness: 0 });
const STEEN = soort("steen", 0xc9c5bd, { color: 0x56534e, roughness: 0.95, metalness: 0 });
const RAIL = soort("rail", 0xc6c8ca, { color: 0x8b8e91, roughness: 0.3, metalness: 0.9 });
const MAST = soort("mast", 0xe0e0dc, { color: 0x7d8185, roughness: 0.5, metalness: 0.6 });
const DRAAD = soort("draad", 0x7a6a58, { color: 0x9a6b45, roughness: 0.35, metalness: 0.9 });
const ISO = soort("isolator", 0xefede6, { color: 0x9aa39c, roughness: 0.2, metalness: 0, clearcoat: 1 });
const KLEREN = soort("kleding", 0xd3d7dd, { color: 0x2e3a4b, roughness: 0.8, metalness: 0 });
const HUIDK = soort("huidkleur", 0xf3e5d8, { color: 0xc8987a, roughness: 0.7, metalness: 0 });
const WAND = soort("cabinewand", 0xe8e8e5, { color: 0x45484d, roughness: 0.7, metalness: 0 });
const GEEL = soort("waarschuwing", 0xf2e8b8, { color: 0xd9b52c, roughness: 0.5, metalness: 0 });

// ---- maten
const RAILTOP = 0.62, RZ = 0.7535;           // bovenkant spoorstaaf, midden van de spoorkop (spoorwijdte 1435 mm)
const W0 = 1.45, YB = 1.65, YT = 4.72;        // halve breedte, onderkant en dak van de wagenbak
const NT = 5, NB = 9;                          // rondheid van dak en onderkant (superellips)
const KOP0 = -11.5, PUNT = 12.55;             // achterkant en neus van de kopwagen
const W2A = -17.0, W2B = -12.1;               // het stukje van de tweede wagen
const SP0 = -17.5, SP1 = 15.0;                // het stukje spoor
const DRAADY = 5.92;                          // rijdraad: 5,3 m boven de spoorstaaf
const M1 = -13.0, M2 = 12.0, VELD = M2 - M1;  // masten

// een gladde kromme door punten [x, y] (monotone kubische interpolatie)
function kromme(p) {
  const n = p.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (x) => {
    if (x <= p[0][0]) return p[0][1]; if (x >= p[n - 1][0]) return p[n - 1][1];
    let i = 0; while (x > p[i + 1][0]) i++;
    const h = p[i + 1][0] - p[i][0], t = (x - p[i][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * p[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
}
// de neus van opzij: bovenkant (dak, voorruit) en onderkant
const kopBoven = kromme([[8.6, 4.72], [9.6, 4.67], [10.4, 4.42], [11.0, 3.95], [11.6, 3.32], [12.1, 2.78], [12.4, 2.36], [12.55, 2.0]]);
const kopOnder = kromme([[11.9, 1.65], [12.3, 1.69], [12.48, 1.8], [12.55, 2.0]]);
const breedte = (x) => { if (x <= 10) return W0; const s = Math.min(1, (x - 10) / (PUNT - 10)); return W0 * Math.pow(Math.max(0, 1 - s ** 4), 0.4); };
const tuimel = (y) => 1 - 0.035 * Math.max(0, (y - 3.9) / 0.82); // de zijkant loopt boven de ramen iets naar binnen
const kopSectie = (x) => ({ w: breedte(x), yb: x > 11.9 ? kopOnder(x) : YB, yt: x > 8.6 ? kopBoven(x) : YT, lo: 2.6 + 0.35 * glad01((x - 9.4) / 1.6), hi: 3.9 + 0.15 * glad01((x - 9.4) / 1.6) });
const wagenSectie = () => ({ w: W0, yb: YB, yt: YT, lo: 2.6, hi: 3.9 });
// halve breedte van de wagenbak op hoogte y (of -1 als y buiten de doorsnede valt)
function zOp(sec, y) {
  if (y < sec.yb || y > sec.yt) return -1;
  const yc = (sec.yt + sec.yb) / 2, h = Math.max(1e-5, (sec.yt - sec.yb) / 2), v = (y - yc) / h, n = v >= 0 ? NT : NB;
  return sec.w * Math.pow(Math.max(0, 1 - Math.abs(v) ** n), 1 / n) * tuimel(y);
}
// waar ligt de neus op hoogte y en zijafstand z? (voorste x op het oppervlak)
function neusX(y, z) { let a = 9, b = PUNT; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (zOp(kopSectie(m), y) >= Math.abs(z)) a = m; else b = m; } return a; }
function neusNormaal(y, z) {
  const d = 0.02, p = (yy, zz) => V(neusX(yy, zz), yy, zz);
  const a = p(y + d, z).sub(p(y - d, z)), b = p(y, z + d).sub(p(y, z - d));
  const n = new THREE.Vector3().crossVectors(b, a).normalize(); if (n.x < 0) n.negate(); return n;
}

// ---- de wagenbak: een schil over doorsneden, in drie banden (onder, raamband, dak)
function schil(xs, sec) {
  const n1 = 12, n2 = 8, n3 = 16, S = 2 * (n1 + n2 + n3), pos = [];
  for (const x of xs) {
    const s = sec(x), yc = (s.yt + s.yb) / 2, h = Math.max(1e-5, (s.yt - s.yb) / 2);
    const phiVan = (y) => { const v = THREE.MathUtils.clamp((y - yc) / h, -1, 1), n = v >= 0 ? NT : NB; return Math.acos(Math.sign(v) * Math.abs(v) ** (n / 2)); };
    const fa = phiVan(s.lo), fb = phiVan(s.hi), phis = [];
    const seg = (a, b, n, eerste) => { for (let i = eerste ? 0 : 1; i <= n; i++) phis.push(a + ((b - a) * i) / n); };
    seg(-Math.PI, -fa, n1, true); seg(-fa, -fb, n2); seg(-fb, fb, 2 * n3); seg(fb, fa, n2); seg(fa, Math.PI, n1);
    for (const f of phis) {
      const c = Math.cos(f), sn = Math.sin(f), n = c >= 0 ? NT : NB;
      const y = yc + h * Math.sign(c) * Math.abs(c) ** (2 / n);
      pos.push(x, y, s.w * Math.sign(sn) * Math.abs(sn) ** (2 / n) * tuimel(y));
    }
  }
  const R = S + 1, delen = { onder: [[0, n1], [S - n1, S]], band: [[n1, n1 + n2], [S - n1 - n2, S - n1]], boven: [[n1 + n2, S - n1 - n2]] };
  const geo = (stukken, i0 = 0, i1 = xs.length - 1) => {
    const idx = [];
    for (let i = i0; i < i1; i++) for (const [a, b] of stukken) for (let j = a; j < b; j++) { const p = i * R + j, q = p + 1, r = p + R, t = r + 1; idx.push(p, r, q, q, r, t); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return naarBuitenG(g, V((xs[i0] + xs[i1]) / 2, 3.1, 0));
  };
  const rand = (i) => { const s = new THREE.Shape(); for (let j = 0; j < S; j++) { const p = i * R + j; j ? s.lineTo(pos[p * 3 + 2], pos[p * 3 + 1]) : s.moveTo(pos[p * 3 + 2], pos[p * 3 + 1]); } return new THREE.ShapeGeometry(s, 1); };
  return { geo, delen, rand };
}
// een dop op het eind van een wagen (vlak, naar -x of +x)
function dop(sch, i, x, naarVoren) { const g = sch.rand(i); g.rotateY(naarVoren ? Math.PI / 2 : -Math.PI / 2); g.translate(x, 0, 0); return g; }
const rompMesh = (g, s, d) => { const m = mesh(g, s, d); m.userData.romp = true; return m; };

const kop = new THREE.Group(); root.add(kop); G.kop = kop;
{
  const xs = [KOP0, -8, -4, 0, 4, 8, 8.6];
  for (let i = 1; i <= 70; i++) { const u = i / 70; xs.push(8.6 + (PUNT - 8.6) * (1 - (1 - u) ** 1.7)); }
  const sch = schil(xs, kopSectie), iN = xs.findIndex((x) => x >= 9.6);
  kop.add(rompMesh(sch.geo(sch.delen.onder), LAK, "wagen"), rompMesh(sch.geo(sch.delen.boven), LAK, "wagen"));
  kop.add(rompMesh(sch.geo(sch.delen.band, 0, iN), BAND, "wagen"));
  const ruit = rompMesh(sch.geo(sch.delen.band, iN), "raam", "cabine"); kop.add(ruit); G.voorruit = ruit;
  kop.add(rompMesh(dop(sch, 0, KOP0, false), LAK, "wagen"));
}
const wagen2 = new THREE.Group(); root.add(wagen2); G.wagen2 = wagen2;
{
  const xs = [W2A, -15.5, -14, W2B], sch = schil(xs, wagenSectie);
  wagen2.add(rompMesh(sch.geo(sch.delen.onder), LAK, "wagen"), rompMesh(sch.geo(sch.delen.boven), LAK, "wagen"), rompMesh(sch.geo(sch.delen.band), BAND, "wagen"));
  wagen2.add(rompMesh(samen([dop(sch, 0, W2A, false), dop(sch, xs.length - 1, W2B, true)]), LAK, "wagen"));
}

// ---- ramen en deuren op de zijkant (die is daar vlak)
const ZIJ = W0 + 0.004;
function ramen(lijst, ouder) {
  const r = [];
  for (const [x, b] of lijst) for (const k of [1, -1]) r.push(rondeDoos(b, 0.98, 0.02, 0.008).translate(x, 3.25, k * ZIJ));
  // een smalle rand om elk raam: net iets groter, net iets dieper
  const randen = [];
  for (const [x, b] of lijst) for (const k of [1, -1]) randen.push(rondeDoos(b + 0.08, 1.06, 0.012, 0.006).translate(x, 3.25, k * (ZIJ - 0.006)));
  ouder.add(rompMesh(samen(r), "raam", "wagen"), rompMesh(samen(randen), ONDER, "wagen"));
}
const RAMEN = []; for (let i = 0; i < 8; i++) RAMEN.push([-8.2 + 0.725 + i * 1.775, 1.45]);
ramen(RAMEN, kop); ramen([[-15.45, 1.45]], wagen2);
function deur(x, ouder) {
  for (const k of [1, -1]) {
    ouder.add(rompMesh(rondeDoos(1.42, 2.04, 0.05, 0.03).translate(x, 2.95, k * (W0 - 0.02)), GAT, "deuren"));
    for (const kant of [-1, 1]) {
      const vleugel = new THREE.Group(); vleugel.position.set(x + kant * 0.35, 2.95, k * (W0 + 0.012));
      vleugel.add(mesh(rondeDoos(0.69, 2.0, 0.05, 0.02), DEUR, "deuren"), op(mesh(rondeDoos(0.44, 0.95, 0.02, 0.06), "raam", "deuren"), 0, 0.32, k * 0.03));
      ouder.add(vleugel); G.deuren.push({ g: vleugel, x: vleugel.position.x, z: vleugel.position.z, kant, k });
    }
    // een knop om de deur te openen
    ouder.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16).rotateX(Math.PI / 2).translate(x + 0.82, 2.85, k * (W0 + 0.01)), "groenlicht", "deuren"));
    // een opstap onder de deur
    ouder.add(mesh(new THREE.BoxGeometry(1.3, 0.05, 0.22).translate(x, 1.74, k * (W0 - 0.02)), ONDER, "deuren"));
  }
}
deur(7.0, kop); deur(-9.4, kop); deur(-13.3, wagen2);
// cabinedeur: alleen een naad, met een handgreep
for (const k of [1, -1]) {
  kop.add(rompMesh(rondeDoos(0.72, 2.05, 0.03, 0.04).translate(9.35, 2.98, k * (W0 + 0.004)), DEUR, "wagen"));
  kop.add(mesh(staaf(V(9.0, 2.4, k * (W0 + 0.04)), V(9.0, 3.2, k * (W0 + 0.04)), 0.018, 8), "metaal", "wagen"));
}

// ---- de kop: koplampen, sluitseinen, baanruimer, koppeling
function lamp(y, z, r, s) {
  const p = V(neusX(y, z), y, z), n = neusNormaal(y, z), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n);
  const rand = mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.45, 0.05, 28).applyQuaternion(q).translate(p.x, p.y, p.z), "zwartmetaal", "lichten");
  const glas = mesh(new THREE.CylinderGeometry(r, r, 0.06, 28).applyQuaternion(q).translate(p.x + n.x * 0.012, p.y + n.y * 0.012, p.z + n.z * 0.012), s, "lichten");
  kop.add(rand, glas); return glas;
}
for (const k of [1, -1]) { G.wit.push(lamp(2.36, k * 0.74, 0.095, "witlicht")); G.rood.push(lamp(2.36, k * 1.0, 0.055, "roodlicht")); }
G.wit.push(lamp(4.2, 0, 0.08, "witlicht"));
{
  // baanruimer: een schuine plaat laag voor de wielen, rond van boven gezien
  const s = new THREE.Shape(); s.moveTo(11.3, 1.4); s.lineTo(12.2, 1.4); s.quadraticCurveTo(12.24, 1.36, 12.2, 1.3); s.lineTo(11.95, 0.98); s.lineTo(11.3, 0.98); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6, steps: 12 });
  g.translate(0, 0, -1.1);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setX(i, x - 0.55 * Math.min(1, (z / 1.13) ** 2) * Math.max(0, (x - 11.3) / 0.95)); }
  g.computeVertexNormals(); kop.add(mesh(g, ONDER, "wagen"));
}
// koppelingen: voorop (onder de neus) en tussen de wagens
const KOPH = 1.58; // 1 meter boven de spoorstaaf
function koppelkop(x, richting) {
  const g = new THREE.Group(); g.position.set(x, KOPH, 0);
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 16).rotateZ(Math.PI / 2).translate(-richting * 0.45, 0, 0), "metaal", "koppeling"));
  g.add(mesh(rondeDoos(0.28, 0.3, 0.36, 0.04).translate(richting * 0.1, 0, 0), "zwartmetaal", "koppeling"));
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.2, 0.26).translate(richting * 0.25, 0, 0), "metaal", "koppeling"));
  g.add(mesh(new THREE.ConeGeometry(0.04, 0.1, 12).rotateZ(-richting * Math.PI / 2).translate(richting * 0.3, 0.05, -0.07), "metaal", "koppeling"));
  return g;
}
G.koppelVoor = koppelkop(12.35, 1); kop.add(G.koppelVoor);
G.koppelMidden = groep(koppelkop(-11.55, -1), koppelkop(-12.05, 1)); root.add(G.koppelMidden);
{
  // de balg tussen de wagens: een harmonica van rubber
  const ringen = [];
  for (let i = 0; i < 7; i++) ringen.push(rondeDoos(0.075, 2.5, 2.1, 0.06).translate(-11.55 - i * 0.083, 3.1, 0));
  G.balg = mesh(samen(ringen), "rubber", "koppeling"); G.koppelMidden.add(G.balg);
}

// ---- op het dak: luchtbehandeling, de stroomafnemer met isolatoren, een dakleiding
for (const [x, l] of [[2.2, 3.4], [-12.8 - 1.2, 1.6]]) (x > -12 ? kop : wagen2).add(mesh(rondeDoos(l, 0.3, 1.8, 0.12).translate(x, 4.76, 0), ONDER, "wagen"));
const PX = -5.2, PY = 5.08, L1 = 1.6, L2 = 1.7, PHOOG = DRAADY - 0.03 - 0.12 - PY; // scharnier, armen, hoogte tot de rijdraad
function isolator(a, b) { // geribde isolator van a naar b
  const d = b.clone().sub(a), l = d.length(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()), g = [];
  g.push(new THREE.CylinderGeometry(0.035, 0.035, l, 10).translate(0, l / 2, 0));
  for (let i = 1; i < 6; i++) g.push(new THREE.CylinderGeometry(0.075, 0.075, 0.018, 18).translate(0, (l * i) / 6, 0));
  const geo = samen(g); geo.applyQuaternion(q); geo.translate(a.x, a.y, a.z); return geo;
}
const panto = new THREE.Group(); panto.position.set(PX, PY, 0); kop.add(panto); G.panto = panto;
{
  const iso = [];
  for (const dx of [0.25, -1.45]) for (const z of [-0.45, 0.45]) iso.push(isolator(V(PX + dx, 4.7, z), V(PX + dx, 4.98, z)));
  kop.add(mesh(samen(iso), ISO, "stroomafnemer"));
  const voet = [];
  for (const z of [-0.45, 0.45]) voet.push(staaf(V(0.3, -0.08, z), V(-1.5, -0.08, z), 0.035, 10));
  for (const x of [0.25, -1.45]) voet.push(staaf(V(x, -0.08, -0.5), V(x, -0.08, 0.5), 0.035, 10));
  voet.push(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 14).rotateX(Math.PI / 2)); // de as van het scharnier
  voet.push(rondeDoos(0.4, 0.16, 0.24, 0.03).translate(-0.35, -0.02, 0.3)); // veer en luchtcilinder
  panto.add(mesh(samen(voet), "metaal", "stroomafnemer"));
  // dakleiding naar achteren, op kleine isolatoren
  const dak = [staaf(V(PX - 1.45, 5.02, 0.45), V(PX - 3.6, 5.02, 0.45), 0.03, 10)];
  kop.add(mesh(samen(dak), "metaal", "stroomafnemer"), mesh(isolator(V(PX - 3.5, 4.7, 0.45), V(PX - 3.5, 5.0, 0.45)), ISO, "stroomafnemer"));
}
const eenStaaf = (r1, r2) => new THREE.CylinderGeometry(r2, r1, 1, 12).translate(0, 0.5, 0);
const PA = { onder: mesh(eenStaaf(0.055, 0.035), "metaal", "stroomafnemer"), boven: [1, -1].map(() => mesh(eenStaaf(0.03, 0.022), "metaal", "stroomafnemer")), stang: mesh(eenStaaf(0.014, 0.014), "metaal", "stroomafnemer") };
panto.add(PA.onder, ...PA.boven, PA.stang);
const pKop = new THREE.Group(); panto.add(pKop);
{
  const delen = [new THREE.CylinderGeometry(0.025, 0.025, 0.14, 10).translate(0, 0.05, 0), new THREE.BoxGeometry(0.42, 0.03, 0.06).translate(0, 0.075, 0)];
  for (const dx of [-0.16, 0.16]) delen.push(new THREE.BoxGeometry(0.03, 0.03, 1.3).translate(dx, 0.075, 0));
  const hoorn = [];
  for (const k of [1, -1]) for (const dx of [-0.16, 0.16]) hoorn.push(buis([V(dx, 0.1, k * 0.62), V(dx, 0.09, k * 0.8), V(dx, 0.03, k * 0.93), V(dx, -0.06, k * 0.97)], 0.016, { seg: 16, rond: 8 }));
  pKop.add(mesh(samen([...delen, ...hoorn]), "metaal", "stroomafnemer"));
  const sleep = []; for (const dx of [-0.16, 0.16]) sleep.push(rondeDoos(0.06, 0.035, 1.24, 0.008).translate(dx, 0.105, 0));
  pKop.add(mesh(samen(sleep), "zwartmetaal", "stroomafnemer"));
}
function zetStaaf(m, a, b) { const d = b.clone().sub(a); m.position.copy(a); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); m.scale.set(1, d.length(), 1); }
function pantoHoogte(hoog) { // hoog = hoogte van de kop boven het scharnier
  const kopY = (t) => { const c = (0.1 + L1 * Math.cos(t)) / L2; return L1 * Math.sin(t) + L2 * Math.sqrt(Math.max(0, 1 - c * c)); };
  let a = 0, b = 0.9; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (kopY(m) < hoog) a = m; else b = m; }
  const knie = V(-L1 * Math.cos(a), L1 * Math.sin(a), 0), kopP = V(0.1, kopY(a), 0);
  zetStaaf(PA.onder, V(0, 0, 0), knie);
  PA.boven.forEach((m, i) => zetStaaf(m, knie, kopP.clone().add(V(0, 0, i ? -0.28 : 0.28))));
  zetStaaf(PA.stang, V(-0.3, 0.02, 0.12), knie.clone().lerp(kopP, 0.22).add(V(0, -0.04, 0.1)));
  pKop.position.copy(kopP);
}
pantoHoogte(PHOOG);

// ---- onder de wagen: draaistellen met wielen, veren en remschijven
function wiel() {
  const prof = [[0.09, -0.1], [0.17, -0.1], [0.19, -0.035], [0.39, -0.03], [0.42, -0.08], [0.488, -0.08], [0.492, -0.068], [0.488, -0.06], [0.462, -0.046], [0.457, 0.07], [0.44, 0.076], [0.4, 0.05], [0.2, 0.035], [0.18, 0.08], [0.09, 0.08]];
  return draai(prof, 56);
}
const WIEL = wiel(), WIEL_L = WIEL.clone().rotateY(Math.PI);
function wielstel(x) {
  const g = new THREE.Group(); g.position.set(x, RAILTOP + 0.46, 0);
  g.add(mesh(samen([WIEL.clone().translate(0, 0, RZ + 0.0065), WIEL_L.clone().translate(0, 0, -RZ - 0.0065)]), "velg", "wielen"));
  g.add(mesh(new THREE.CylinderGeometry(0.085, 0.085, 2.3, 18).rotateX(Math.PI / 2), "metaal", "wielen"));
  const sch = []; for (const z of [-0.36, 0.36]) sch.push(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 36).rotateX(Math.PI / 2).translate(0, 0, z));
  g.add(mesh(samen(sch), "schijf", "wielen"));
  // een merkje op het wiel, zodat je het ziet draaien
  const st = []; for (const k of [1, -1]) for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; st.push(new THREE.BoxGeometry(0.05, 0.16, 0.012).translate(0, 0.29, 0).rotateZ(a).translate(0, 0, k * (RZ + 0.08))); }
  g.add(mesh(samen(st), "zwartmetaal", "wielen"));
  G.wielstellen.push(g); return g;
}
function veer(x, z, y0, y1, r = 0.07, draden = 5) {
  const p = []; for (let i = 0; i <= draden * 16; i++) { const t = i / (draden * 16), a = t * draden * TAU; p.push(V(x + Math.cos(a) * r, y0 + (y1 - y0) * t, z + Math.sin(a) * r)); }
  return buis(p, 0.017, { seg: draden * 24, rond: 8 });
}
function draaistel(x, motor) {
  const g = new THREE.Group(); g.position.set(x, 0, 0);
  const AS = 1.25, yA = RAILTOP + 0.46;
  g.add(wielstel(-AS), wielstel(AS));
  // zijramen van het draaistel (H-vorm), net buiten de wielen
  const s = new THREE.Shape();
  s.moveTo(-1.85, 1.42); s.lineTo(-1.85, 1.57); s.lineTo(-0.88, 1.57); s.quadraticCurveTo(-0.62, 1.57, -0.56, 1.33); s.lineTo(0.56, 1.33); s.quadraticCurveTo(0.62, 1.57, 0.88, 1.57); s.lineTo(1.85, 1.57); s.lineTo(1.85, 1.42);
  s.lineTo(0.96, 1.42); s.quadraticCurveTo(0.72, 1.42, 0.64, 1.13); s.lineTo(-0.64, 1.13); s.quadraticCurveTo(-0.72, 1.42, -0.96, 1.42); s.closePath();
  const zr = []; for (const k of [1, -1]) { const e = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 }); e.translate(0, 0, k * 1.03 - 0.06); zr.push(e); }
  // dwarsbalken tussen de zijramen
  for (const dx of [-0.38, 0.38]) zr.push(rondeDoos(0.24, 0.2, 2.0, 0.03).translate(dx, 1.23, 0));
  g.add(mesh(samen(zr), "frame", "draaistel"));
  // asbussen buiten de wielen, met de primaire veren erop
  const bus = [], veren = [];
  for (const ax of [-AS, AS]) for (const k of [1, -1]) {
    bus.push(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 24).rotateX(Math.PI / 2).translate(ax, yA, k * 1.03), rondeDoos(0.66, 0.08, 0.2, 0.02).translate(ax, yA + 0.08, k * 1.03));
    for (const dx of [-0.24, 0.24]) veren.push(veer(ax + dx, k * 1.03, yA + 0.12, 1.42));
  }
  g.add(mesh(samen(bus), "zwartmetaal", "draaistel"), mesh(samen(veren), "ketting", "draaistel"));
  // luchtveren tussen draaistel en wagen
  const lucht = []; for (const k of [1, -1]) { const l = new THREE.LatheGeometry([[0.001, 0], [0.24, 0], [0.29, 0.06], [0.3, 0.16], [0.27, 0.24], [0.25, 0.28], [0.001, 0.28]].map(([r, y]) => new THREE.Vector2(r, y)), 32); l.translate(0, 1.35, k * 1.0); lucht.push(l); }
  g.add(mesh(samen(lucht), "rubber", "draaistel"));
  // dempers en remklauwen
  const rest = [];
  for (const k of [1, -1]) { rest.push(staaf(V(-0.2, 1.3, k * 1.18), V(0.25, 1.62, k * 1.18), 0.035, 10)); rest.push(staaf(V(-1.4, 1.28, k * 1.18), V(-0.9, 1.5, k * 1.18), 0.03, 10)); }
  for (const ax of [-AS, AS]) for (const k of [1, -1]) rest.push(rondeDoos(0.14, 0.2, 0.12, 0.02).translate(ax + Math.sign(ax) * -0.33, yA + 0.08, k * 0.36));
  g.add(mesh(samen(rest), "zwartmetaal", "draaistel"));
  if (motor) { const mo = []; for (const ax of [-AS, AS]) mo.push(rondeDoos(0.4, 0.4, 0.55, 0.06).translate(ax * 0.5, yA + 0.02, -0.35)); g.add(mesh(samen(mo), ONDER, "draaistel")); }
  root.add(g); G.draaistellen.push(g); return g;
}
G.dsVoor = draaistel(8.6, true); G.dsAchter = draaistel(-8.9, false); G.ds2 = draaistel(-14.6, false);
wagen2.attach(G.ds2);
// apparatuurkasten onder de vloer
{
  const k = []; for (const [x0, x1] of [[-6.7, -3.9], [-3.5, -0.4], [0.0, 2.6], [3.0, 6.3]]) k.push(rondeDoos(x1 - x0, 0.62, 2.3, 0.05).translate((x0 + x1) / 2, 1.33, 0));
  kop.add(mesh(samen(k), ONDER, "wagen"));
}

// ---- binnen: stoelen, vloer, en de machinist in de cabine (te zien als de wagen doorzichtig is)
const binnen = new THREE.Group(); root.add(binnen); G.binnen = binnen;
{
  const st = [], RIJ = [];
  for (let i = 0; i < 17; i++) RIJ.push(-8.25 + i * 0.875);
  const rij2 = [-14.5, -15.4, -16.3];
  for (const x of [...RIJ, ...rij2]) for (const z of [-0.92, -0.4, 0.4, 0.92]) {
    st.push(rondeDoos(0.46, 0.1, 0.46, 0.03).translate(x, 2.38, z), rondeDoos(0.1, 0.68, 0.46, 0.035).translate(x - 0.24, 2.74, z).rotateZ(0), rondeDoos(0.06, 0.4, 0.06, 0.01).translate(x, 2.13, z));
  }
  binnen.add(mesh(samen(st), "stoel", "interieur"));
  binnen.add(mesh(samen([new THREE.BoxGeometry(20.6, 0.06, 2.7).translate(-1.15, 1.9, 0), new THREE.BoxGeometry(4.7, 0.06, 2.7).translate(-14.6, 1.9, 0)]), "vloer", "interieur"));
  G.aantalStoelen = (RIJ.length) * 4;
}
const cabine = new THREE.Group(); root.add(cabine); G.cabine = cabine;
{
  cabine.add(mesh(samen([rondeDoos(0.06, 2.5, 2.6, 0.02).translate(9.3, 3.15, 0), new THREE.BoxGeometry(2.9, 0.06, 2.3).translate(10.75, 2.02, 0)]), WAND, "cabine"));
  cabine.add(mesh(rondeDoos(0.02, 0.9, 0.55, 0.05).translate(9.34, 3.35, -0.55), "raam", "cabine")); // raampje in de deur naar de wagen
  // de stuurtafel met schermen
  const t = new THREE.Shape(); t.moveTo(10.95, 2.05); t.lineTo(11.75, 2.05); t.lineTo(11.75, 2.62); t.lineTo(11.3, 2.92); t.lineTo(10.95, 2.82); t.closePath();
  const tafel = new THREE.ExtrudeGeometry(t, { depth: 2.0, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }); tafel.translate(0, 0, -1.0); tafel.computeVertexNormals();
  cabine.add(mesh(tafel, WAND, "cabine"));
  const sch = []; for (const z of [-0.45, 0.45]) { const g = rondeDoos(0.03, 0.26, 0.4, 0.01); g.rotateZ(0.6); g.translate(11.42, 2.93, z); sch.push(g); }
  cabine.add(mesh(samen(sch), "scherm", "cabine"));
  cabine.add(mesh(samen([new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8).rotateZ(0.4).translate(11.05, 2.92, 0.28), new THREE.SphereGeometry(0.04, 12, 8).translate(11.02, 3.0, 0.28)]), "zwartmetaal", "cabine"));
  // stoel van de machinist
  cabine.add(mesh(samen([rondeDoos(0.5, 0.1, 0.5, 0.03).translate(10.35, 2.48, 0), rondeDoos(0.1, 0.75, 0.5, 0.04).translate(10.08, 2.88, 0), new THREE.CylinderGeometry(0.04, 0.04, 0.42, 10).translate(10.35, 2.24, 0)]), "stoel", "cabine"));
  // de machinist: zittend, handen aan de stuurtafel
  const lijf = [new THREE.CapsuleGeometry(0.17, 0.36, 6, 14).scale(1, 1, 1.25).rotateZ(0.12).translate(10.3, 2.93, 0)];
  for (const z of [-0.12, 0.12]) { lijf.push(staaf(V(10.38, 2.6, z), V(10.86, 2.62, z * 1.1), 0.075, 10), staaf(V(10.86, 2.62, z * 1.1), V(10.92, 2.12, z * 1.1), 0.06, 10)); }
  for (const z of [-0.23, 0.23]) lijf.push(staaf(V(10.32, 3.15, z), V(10.62, 2.92, z * 1.05), 0.05, 10), staaf(V(10.62, 2.92, z * 1.05), V(10.98, 2.93, z * 0.9), 0.045, 10));
  const kl = mesh(samen(lijf), KLEREN, "machinist");
  const hoofd = mesh(samen([new THREE.SphereGeometry(0.12, 20, 14).scale(0.95, 1.08, 0.9).translate(10.34, 3.43, 0), ...[-0.23, 0.23].map((z) => new THREE.SphereGeometry(0.045, 10, 8).translate(11.0, 2.93, z * 0.9))]), HUIDK, "machinist");
  const pet = mesh(samen([new THREE.CylinderGeometry(0.12, 0.125, 0.07, 20).translate(10.33, 3.53, 0), new THREE.CylinderGeometry(0.11, 0.11, 0.015, 20).scale(1.2, 1, 1).translate(10.42, 3.5, 0)]), "zwartmetaal", "machinist");
  const voet = mesh(samen([-0.13, 0.13].map((z) => rondeDoos(0.24, 0.08, 0.11, 0.03).translate(10.98, 2.08, z * 1.1))), "zwartmetaal", "machinist");
  G.machinist = groep(kl, hoofd, pet, voet); cabine.add(G.machinist);
}

// ---- het spoor: ballast, dwarsliggers, rails
const spoor = new THREE.Group(); root.add(spoor); G.spoor = spoor;
let zaad = 7; const rnd = () => { zaad = (zaad * 16807) % 2147483647; return (zaad - 1) / 2147483646; };
{
  const b = new THREE.Shape(); b.moveTo(-2.45, 0); b.lineTo(2.45, 0); b.lineTo(1.65, 0.42); b.lineTo(-1.65, 0.42); b.closePath();
  const bg = new THREE.ExtrudeGeometry(b, { depth: SP1 - SP0, bevelEnabled: false }); bg.rotateY(Math.PI / 2); bg.translate(SP0, 0, 0); bg.computeVertexNormals();
  spoor.add(mesh(bg, BALLAST, "spoor", { schaduw: false }));
  const stenen = [], liggers = [], klem = [];
  const LX = []; for (let x = SP0 + 0.3; x < SP1 - 0.2; x += 0.6) LX.push(x);
  for (const x of LX) {
    liggers.push(rondeDoos(0.26, 0.2, 2.6, 0.025).translate(x, 0.348, 0));
    for (const z of [RZ, -RZ]) for (const dz of [-0.11, 0.11]) klem.push(rondeDoos(0.12, 0.05, 0.07, 0.012).translate(x, 0.468, z + dz));
  }
  const steen = (x, y, z, r) => { const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, 0.7, 1).rotateY(rnd() * 3).rotateX(rnd()).translate(x, y, z); stenen.push(g); };
  for (let i = 0; i < 800; i++) { const k = rnd() < 0.5 ? 1 : -1, u = rnd(), z = k * (1.65 + 0.8 * u); steen(SP0 + 0.1 + rnd() * (SP1 - SP0 - 0.2), 0.42 * (1 - u) + 0.01, z, 0.045 + rnd() * 0.04); }
  for (let i = 0; i < 6000; i++) { const x = SP0 + 0.1 + rnd() * (SP1 - SP0 - 0.2), d = Math.abs(((x - SP0 - 0.3) % 0.6 + 0.6) % 0.6); if (d < 0.21 || d > 0.39) continue; steen(x, 0.405 + rnd() * 0.01, (rnd() * 2 - 1) * 1.62, 0.04 + rnd() * 0.03); }
  spoor.add(mesh(samen(stenen), STEEN, "spoor"), mesh(samen(liggers), BETON, "spoor"), mesh(samen(klem), "zwartmetaal", "spoor"));
  // spoorstaaf met vignoleprofiel (voet, lijf, kop)
  const r = new THREE.Shape();
  r.moveTo(-0.075, 0); r.lineTo(0.075, 0); r.lineTo(0.075, 0.012); r.lineTo(0.012, 0.03); r.lineTo(0.008, 0.11); r.lineTo(0.034, 0.124); r.lineTo(0.036, 0.162);
  r.quadraticCurveTo(0.036, 0.172, 0.026, 0.172); r.lineTo(-0.026, 0.172); r.quadraticCurveTo(-0.036, 0.172, -0.036, 0.162); r.lineTo(-0.034, 0.124); r.lineTo(-0.008, 0.11); r.lineTo(-0.012, 0.03); r.lineTo(-0.075, 0.012); r.closePath();
  const rails = []; for (const z of [RZ, -RZ]) { const g = new THREE.ExtrudeGeometry(r, { depth: SP1 - SP0, bevelEnabled: false, curveSegments: 4 }); g.rotateY(Math.PI / 2); g.translate(SP0, RAILTOP - 0.172, z); rails.push(g); }
  const rm = mesh(samen(rails), RAIL, "spoor"); spoor.add(rm); G.rails = rm;
}

// ---- de bovenleiding: masten, draagkabel, hangdraden en rijdraad (zigzag)
const bovenleiding = new THREE.Group(); root.add(bovenleiding); G.bovenleiding = bovenleiding;
const zigzag = (x) => 0.3 - (0.6 * (x - M1)) / VELD;
const draagY = (x) => { let s = ((x - M1) / VELD) % 1; if (s < 0) s += 1; return 7.3 - 0.95 * 4 * s * (1 - s); };
{
  const rij = [], drg = [];
  for (let x = SP0; x <= SP1 + 1e-6; x += 0.5) { rij.push(V(x, DRAADY, zigzag(x))); drg.push(V(x, draagY(x), zigzag(x))); }
  bovenleiding.add(mesh(buis(rij, 0.03, { seg: 260, rond: 8 }), DRAAD, "bovenleiding"), mesh(buis(drg, 0.03, { seg: 260, rond: 8 }), DRAAD, "bovenleiding"));
  const hang = [];
  for (let k = -2; k <= 9; k++) { const x = M1 + (k * VELD) / 7; if (x < SP0 + 0.3 || x > SP1 - 0.3 || k % 7 === 0) continue; hang.push(staaf(V(x, DRAADY, zigzag(x)), V(x, draagY(x), zigzag(x)), 0.014, 6)); }
  bovenleiding.add(mesh(samen(hang), DRAAD, "bovenleiding"));
  const ZM = -2.95, staal = [], iso = [], bord = [], beton = [];
  for (const xm of [M1, M2]) {
    const zc = zigzag(xm);
    beton.push(rondeDoos(0.7, 0.4, 0.7, 0.04).translate(xm, 0.2, ZM));
    const m = new THREE.CylinderGeometry(0.13, 0.17, 7.9, 20).translate(xm, 0.4 + 3.95, ZM); staal.push(m, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20).translate(xm, 0.43, ZM));
    staal.push(staaf(V(xm, 7.45, ZM + 0.1), V(xm, 7.45, zc + 0.25), 0.045, 12)); // bovenbuis
    staal.push(staaf(V(xm, 6.0, ZM + 0.1), V(xm, 7.45, zc + 0.05), 0.04, 12)); // schoor
    const t = (6.2 - 6.0) / 1.45, zr = ZM + 0.1 + t * (zc + 0.05 - ZM - 0.1);
    staal.push(staaf(V(xm, 6.2, zr), V(xm, 6.2, zc - 0.65), 0.035, 10)); // registerbuis
    staal.push(staaf(V(xm, 6.2, zc - 0.65), V(xm, DRAADY + 0.02, zc), 0.022, 8)); // seinarm naar de rijdraad
    staal.push(staaf(V(xm, 7.45, zc), V(xm, draagY(xm) + 0.02, zc), 0.025, 8)); // klem van de draagkabel
    iso.push(isolator(V(xm, 7.45, ZM + 0.3), V(xm, 7.45, ZM + 0.9)), isolator(V(xm, 6.0 + (0.2 / 2.85) * 1.45, ZM + 0.3), V(xm, 6.0 + (0.8 / 2.85) * 1.45, ZM + 0.9)));
    // waarschuwingsbord met een bliksem (geen tekst)
    const dr = new THREE.Shape(); dr.moveTo(-0.26, 0); dr.lineTo(0.26, 0); dr.lineTo(0, 0.45); dr.closePath();
    bord.push(new THREE.ExtrudeGeometry(dr, { depth: 0.02, bevelEnabled: false }).translate(xm, 2.1, ZM + 0.17));
    const bl = new THREE.Shape(); bl.moveTo(0.03, 0.36); bl.lineTo(-0.07, 0.17); bl.lineTo(0.0, 0.17); bl.lineTo(-0.04, 0.05); bl.lineTo(0.07, 0.22); bl.lineTo(0.0, 0.22); bl.closePath();
    staal.push(new THREE.ExtrudeGeometry(bl, { depth: 0.01, bevelEnabled: false }).translate(xm, 2.1, ZM + 0.19));
  }
  bovenleiding.add(mesh(samen(staal), MAST, "bovenleiding"), mesh(samen(iso), ISO, "bovenleiding"), mesh(samen(bord), GEEL, "bovenleiding"), mesh(samen(beton), BETON, "bovenleiding"));
}
// ankers voor de namen
const ANKERGEO = new THREE.BoxGeometry(0.01, 0.01, 0.01), ANKERMAT = new THREE.MeshBasicMaterial({ visible: false });
const punt = (x, y, z, ouder = root) => { const g = new THREE.Mesh(ANKERGEO, ANKERMAT); g.castShadow = g.receiveShadow = false; g.userData.geenLijn = true; g.position.set(x, y, z); ouder.add(g); return g; };
const A = {
  wagen: punt(0, 4.2, W0, kop), deuren: punt(7.0, 3.2, W0, kop), cabine: punt(11.3, 3.6, 0.6, kop), lichten: punt(12.3, 2.36, 0.74, kop),
  machinist: punt(10.4, 3.3, 0, cabine), stoelen: punt(-2, 2.6, 0.6, binnen), wiel: punt(8.6 + 1.25, RAILTOP + 0.46, 0.85), veer: punt(8.6 - 1.25, 1.3, 1.05),
  draaistel: punt(8.6, 1.45, 1.1), panto: punt(0.1, 0.4, 0, panto), rijdraad: punt(-2.4, DRAADY, zigzag(-2.4)), draagkabel: punt(M1 + VELD * 0.3, draagY(M1 + VELD * 0.3), zigzag(M1 + VELD * 0.3)), mast: punt(M2, 4.5, -2.95),
  rails: punt(14.2, RAILTOP, RZ), liggers: punt(13.9, 0.45, 1.2), ballast: punt(14.0, 0.25, 2.0), koppeling: punt(-11.8, KOPH, 0.2), balg: punt(-11.8, 3.6, 1.05),
};
A.wiel.parent.remove(A.wiel); G.dsVoor.add(A.wiel); A.wiel.position.set(1.25, RAILTOP + 0.46, 0.85);
A.veer.parent.remove(A.veer); G.dsVoor.add(A.veer); A.veer.position.set(-1.25 + 0.24, 1.3, 1.03);
A.draaistel.parent.remove(A.draaistel); G.dsVoor.add(A.draaistel); A.draaistel.position.set(0, 1.45, 1.1);

// ================= Teksten (maten zijn die van de tekening) =================
const CAM = {
  trein: [0.55, 0.17, 57, [-1.2, 3.1, 0], 30],
  cabine: [0.95, 0.12, 16, [10.6, 2.9, 0], 30],
  wagen: [0.1, 0.07, 37, [-0.8, 3.0, 0], 30],
  draaistel: [0.5, 0.07, 11, [8.6, 1.3, 0.3], 30],
  panto: [0.6, 0.13, 12, [-5.5, 5.35, 0], 30],
  spoor: [1.05, 0.42, 11, [12.8, 0.5, 0], 30],
  koppeling: [-0.45, 0.04, 14, [-11.8, 2.3, 0], 30],
};
const SECTIES = [
  { sleutel: "trein", naam: "De trein", titel: "De trein", tekst: "Een elektrische trein: voorop de kopwagen met de cabine, daarachter het begin van de tweede wagen. De trein rijdt op stroom uit de draad boven het spoor. Tik op de lampen.", cam: CAM.trein, focus: null,
    specs: [["Kopwagen", "24 m lang in de tekening"], ["Breedte", "2,9 m in de tekening"], ["Wagens", "2 (een kopwagen en een stukje)"], ["Wielen", "12 in de tekening"], ["Lampen", "tik", "lichten"]],
    namen: [["cabine", "CABINE", 50, -60], ["panto", "STROOMAFNEMER", -40, -50], ["draaistel", "DRAAISTEL", 40, 115], ["deuren", "DEUREN", -40, -80], ["rijdraad", "BOVENLEIDING", 50, -55]] },
  { sleutel: "cabine", naam: "De cabine", titel: "De cabine en de lampen", tekst: "Voorin zit de machinist. Die bestuurt de trein en let goed op de seinen langs het spoor. Voorop branden witte lampen. Aan de achterkant van een trein branden rode lampen.", cam: CAM.cabine, focus: ["cabine", "machinist", "lichten"], doorzicht: true, lichten: true,
    specs: [["Machinist", "1, in het midden"], ["Koplampen", "3, wit"], ["Sluitseinen", "2, rood"], ["Lampen", "tik", "lichten"]],
    namen: [["machinist", "MACHINIST", -60, -50], ["cabine", "VOORRUIT", 50, -50], ["lichten", "KOPLAMP", 50, 40]] },
  { sleutel: "wagen", naam: "De wagen", titel: "De wagen en de deuren", tekst: "In de wagen zitten de reizigers. Staat de trein stil bij het perron, dan schuiven de deuren opzij. Pas als iedereen binnen is, gaan ze weer dicht.", cam: CAM.wagen, focus: ["wagen", "deuren", "interieur"], doorzicht: true, deuren: true,
    specs: [["Deuren", "2 aan elke kant"], ["Stoelen", `${G.aantalStoelen} in de kopwagen`], ["Ramen", "8 aan elke kant"], ["Deurknop", "groen, naast de deur"]],
    namen: [["deuren", "SCHUIFDEUREN", 40, -90], ["stoelen", "STOELEN", -50, -90]] },
  { sleutel: "draaistel", naam: "Het draaistel", titel: "Het draaistel en de wielen", tekst: "Onder de wagen zit een draaistel: een klein wagentje met vier wielen dat meedraait in de bocht. Veren maken de rit zacht. Elk wiel heeft een rand aan de binnenkant, de flens. Die houdt de trein op de rails.", cam: CAM.draaistel, focus: ["draaistel", "wielen"], rollen: true,
    specs: [["Draaistellen", "2 onder de kopwagen"], ["Wielen", "4 per draaistel"], ["Wiel", "0,92 m doorsnee in de tekening"], ["Flens", "aan de binnenkant van het wiel"]],
    namen: [["wiel", "WIEL MET FLENS", 60, 120], ["veer", "VEER", -80, 110], ["draaistel", "DRAAISTEL", 50, -110]] },
  { sleutel: "stroomafnemer", naam: "De stroomafnemer", titel: "De stroomafnemer en de bovenleiding", tekst: "De stroomafnemer op het dak drukt zacht tegen de rijdraad. Zo krijgen de motoren stroom. In de bovenleiding zit een heel hoge spanning. Kom er nooit aan en ook nooit in de buurt: dat is levensgevaarlijk.", cam: CAM.panto, focus: ["stroomafnemer", "bovenleiding"], panto: true,
    specs: [["Stroomafnemer", "1, op het dak"], ["Rijdraad", "5,3 m boven de rails in de tekening"], ["Draagkabel", "houdt de rijdraad recht"], ["Masten", "2 in de tekening"], ["Veiligheid", "nooit aankomen, hoge spanning"]],
    namen: [["panto", "STROOMAFNEMER", 50, 40], ["rijdraad", "RIJDRAAD", 60, -40], ["draagkabel", "DRAAGKABEL", -60, -40], ["mast", "MAST", -50, 50]] },
  { sleutel: "spoor", naam: "Het spoor", titel: "Het spoor", tekst: "De trein rijdt over twee stalen rails. Die liggen op dwarsliggers van beton, en die liggen in een bed van stenen: de ballast. Loop nooit op het spoor. Een trein komt snel en kan niet uitwijken.", cam: CAM.spoor, focus: ["spoor"],
    specs: [["Spoorwijdte", "1435 mm in de tekening"], ["Dwarsliggers", "elke 60 cm"], ["Ballast", "steenslag"], ["Veiligheid", "loop nooit op het spoor"]],
    namen: [["rails", "RAILS", 50, -50], ["liggers", "DWARSLIGGERS", 50, 40], ["ballast", "BALLAST", -60, 50]] },
  { sleutel: "koppeling", naam: "De koppeling", titel: "De koppeling", tekst: "Met de koppeling zitten de wagens aan elkaar vast. Daarboven zit een balg, een soort harmonica. Zo kun je binnen van de ene naar de andere wagen lopen.", cam: CAM.koppeling, focus: ["koppeling"],
    specs: [["Koppeling", "automatisch"], ["Hoogte", "1 m boven de rails in de tekening"], ["Balg", "tussen de wagens"]],
    namen: [["koppeling", "KOPPELING", 60, 110], ["balg", "BALG", -60, -60]] },
];
const KIND = [
  { naam: "de trein", focus: ["wagen"], cam: CAM.trein, geluid: "fluit" },
  { naam: "de machinist", focus: ["machinist"], cam: [0.9, 0.1, 13, [10.7, 3.0, 0], 30], doorzicht: true, geluid: "fluit" },
  { naam: "de deuren", focus: ["deuren"], cam: [0.2, 0.06, 13, [7.0, 2.9, 0], 30], deuren: true },
  { naam: "de wielen", focus: ["wielen"], cam: CAM.draaistel, rollen: true },
  { naam: "de stroomafnemer", focus: ["stroomafnemer"], cam: CAM.panto, panto: true },
  { naam: "de lampen", focus: ["lichten"], cam: [1.25, 0.08, 13, [12.0, 2.6, 0], 30], lichten: true },
  { naam: "het spoor", focus: ["spoor"], cam: CAM.spoor },
  { naam: "de koppeling", focus: ["koppeling"], cam: CAM.koppeling },
];

function mini(aan) {
  const sx = (x) => 61.5 + x * 3.3, sy = (y) => 62 - y * 3.3, P = (x, y) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`;
  const boven = []; for (let i = 0; i <= 24; i++) { const x = KOP0 + ((PUNT - KOP0) * i) / 24; boven.push(P(x, kopSectie(x).yt)); }
  const onder = []; for (let i = 24; i >= 0; i--) { const x = 11.9 + (0.65 * i) / 24; onder.push(P(x, kopOnder(x))); }
  const wielen = []; for (const g of G.draaistellen) { const x0 = g.parent === wagen2 ? -14.6 : g.position.x; for (const d of [-1.25, 1.25]) wielen.push(`<circle cx="${sx(x0 + d).toFixed(1)}" cy="${sy(1.08).toFixed(1)}" r="1.5" class="${aan("wielen") || aan("draaistel")}"/>`); }
  const rx = [M1, M2].map((x) => `<line x1="${sx(x)}" y1="${sy(0)}" x2="${sx(x)}" y2="${sy(7.5)}" class="${aan("bovenleiding")}"/>`).join("");
  return `<path d="M${P(KOP0, YB)}L${P(KOP0, YT)}L${boven.join("L")}L${onder.join("L")}Z" class="${aan("wagen") || aan("cabine") || aan("machinist")}"/>` +
    `<path d="M${P(W2A, YB)}L${P(W2A, YT)}L${P(W2B, YT)}L${P(W2B, YB)}Z" class="${aan("wagen")}"/>` +
    `<path d="M${P(KOP0, 3.25)}L${P(10.6, 3.25)}" class="${aan("deuren") || aan("interieur")}"/>` +
    `<line x1="${sx(SP0)}" y1="${sy(0.5)}" x2="${sx(SP1)}" y2="${sy(0.5)}" class="${aan("spoor")}"/>` + wielen.join("") +
    `<path d="M${P(PX, YT + 0.3)}L${P(PX - 1.4, 5.4)}L${P(PX + 0.1, DRAADY)}" class="${aan("stroomafnemer")}"/>` +
    `<path d="M${P(SP0, DRAADY)}L${P(SP1, DRAADY)}" class="${aan("bovenleiding")}"/>` + rx +
    `<line x1="${sx(-11.5)}" y1="${sy(KOPH)}" x2="${sx(-12.1)}" y2="${sy(KOPH)}" class="${aan("koppeling")}" style="stroke-width:4"/>`;
}

let wielHoek = 0, deurNu = 0, deurT = 0, pantoNu = 1, pantoT = 0, lichtT = 0;
function beweeg(dt, h, s) {
  let bezig = false;
  if (h.rollen) { wielHoek -= dt * 1.8; for (const w of G.wielstellen) w.rotation.z = wielHoek; bezig = true; }
  // deuren: een tijdje open, een tijdje dicht
  if (h.deuren) deurT += dt; else deurT = 0;
  const deurDoel = h.deuren && deurT % 6 > 0.8 && deurT % 6 < 4.2 ? 1 : 0;
  if (h.deuren || Math.abs(deurNu - deurDoel) > 0.001) {
    deurNu += Math.sign(deurDoel - deurNu) * Math.min(Math.abs(deurDoel - deurNu), dt * 0.9); bezig = true;
    const uit = glad01(deurNu * 3), schuif = glad01((deurNu - 0.2) / 0.8);
    for (const d of G.deuren) { d.g.position.x = d.x + d.kant * 0.68 * schuif; d.g.position.z = d.z + d.k * 0.035 * uit; }
  }
  // stroomafnemer: omlaag en weer omhoog als je ernaar kijkt
  if (h.panto) pantoT += dt; else pantoT = 0;
  const pDoel = h.panto ? 0.5 + 0.5 * Math.cos(pantoT * 0.7) : 1;
  if (Math.abs(pDoel - pantoNu) > 1e-4) { pantoNu += (pDoel - pantoNu) * Math.min(1, dt * 4); pantoHoogte(0.02 + (PHOOG - 0.02) * glad01(pantoNu)); bezig = true; }
  if (h.panto) bezig = true;
  // lampen: wit voorop; bij de cabine wisselen wit en rood
  lichtT += dt;
  const aan = s.lichtAan || h.lichten || s.uiteen, rood = h.lichten && lichtT % 5 > 2.5;
  for (const k of ["teken", "donker"]) { MAT.witlicht[k].emissiveIntensity = aan && !rood ? 2.4 : 0.12; MAT.roodlicht[k].emissiveIntensity = rood ? 2.6 : 0.12; }
  if (h.lichten || s.lichtAan) bezig = true;
  return bezig;
}
return {
  titel: "De trein", label: "Trein", model: "Elektrische trein", schaal: "Maten in meters", hint: "Sleep om te draaien · tik op de lampen", SECTIES, KIND, mini, beweeg,
  doorzicht: (aan) => { G.binnen.visible = G.cabine.visible = aan; },
  anker: () => A,
  uiteenCam: [0.62, 0.3, 62, [-1.0, 3.4, 1.5], 34],
  uiteen: () => [
    [G.bovenleiding, [0, 3.2, -1.0], "BOVENLEIDING", [100, -60]], [G.panto, [0, 1.6, 0], "STROOMAFNEMER", [-90, -30]],
    [G.cabine, [4.5, 0.6, 0], "CABINE · MACHINIST", [60, -30]], [G.binnen, [0, 0.0, 0], "STOELEN", [-60, -40]],
    [G.dsVoor, [1.5, 0.3, 4.5], "DRAAISTEL", [60, 30]], [G.dsAchter, [-1.5, 0.3, 4.5], null], [G.koppelVoor, [2.0, 0, 0], null],
    [G.wagen2, [-3.5, 0, 0], "TWEEDE WAGEN", [-60, -30]], [G.koppelMidden, [-1.6, 0, 2.5], "KOPPELING", [-60, 30]],
    [G.spoor, [0, -1.6, 0], "SPOOR", [60, 40]],
  ],
};
}
