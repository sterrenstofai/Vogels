// De brandweerauto: een algemene tankautospuit, in code getekend (maten in meters; de voorkant wijst naar +x, rechts is +z).
// Cabine voor zes mensen, kasten met rolluiken, een ladder op het dak, de pomp achterin met twee haspels, zwaailichten.
// Geen bestaand type, geen merk, geen tekst, geen logo. Module voor /js/kern.js.
import { kast, vlakje, wiel, wielkast, boogRand, draaiZ } from "./_auto.js";

export default function maak(ctx) {
const { THREE, V, TAU, root, MAT, soort, DELEN, mesh, groep, op, buis, samen, staaf, rondeDoos } = ctx;
const G = { wielen: [], deuren: [], luiken: [], haspels: [], lichten: {} };
soort("brandrood", 0xf3cdd0, { color: 0xa3121c, roughness: 0.3, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.12 });
soort("reflex", 0xffffff, { color: 0xf1f1ec, roughness: 0.25, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.08 });
soort("rolluik", 0xeeeeec, { color: 0xa9adb2, roughness: 0.35, metalness: 0.85 });
soort("kastbinnen", 0xe6e7e4, { color: 0x7d8186, roughness: 0.5, metalness: 0.6 });
soort("blauwA", 0xbfd4f6, { color: 0x173a96, roughness: 0.15, metalness: 0, emissive: 0x2f63ff, emissiveIntensity: 0 });
soort("blauwB", 0xbfd4f6, { color: 0x173a96, roughness: 0.15, metalness: 0, emissive: 0x2f63ff, emissiveIntensity: 0 });
soort("slang", 0xf1ede4, { color: 0xd8d2c4, roughness: 0.85, metalness: 0 });
soort("slangrood", 0xf2c2c2, { color: 0x8e1a1d, roughness: 0.7, metalness: 0 });
soort("geel", 0xf3e4ab, { color: 0xc9961f, roughness: 0.45, metalness: 0.2 });
soort("fles", 0xe9e9e6, { color: 0x2b2e31, roughness: 0.35, metalness: 0.5, clearcoat: 0.5 });
soort("binnenwand", 0xecebe8, { color: 0x5c5f63, roughness: 0.8, metalness: 0 });
soort("knipper", 0xf3d9a6, { color: 0xc77d16, roughness: 0.2, metalness: 0, emissive: 0xff9a20, emissiveIntensity: 0 });

// ---- maten
const X0 = -4.3, X1 = 4.3, ZB = 1.275, ZO = 1.25; // lengte 8,6 m; cabine 2,55 breed, opbouw 2,5
const XV = 2.9, XA = -1.3, RW = 0.53, RA = 0.66, YA = 0.53; // voor- en achteras, wielen, wielkasten
const CX0 = 1.2, CY0 = 0.75, CY1 = 3.0; // cabine
const FD = [2.32, 3.62, 1.3, 2.8], CD = [1.32, 2.18, 0.8, 2.8]; // voordeur en bemanningsdeur: x0, x1, y0, y1
const OX1 = 1.1, OY0 = 0.75, OY1 = 2.95, KAST_Y1 = 2.65; // opbouw
const inBoog = (x, y, xa) => (x - xa) ** 2 + (y - YA) ** 2 < RA * RA;
const glad = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

// ================= de cabine =================
const cab = new THREE.Group(); root.add(cab); G.cab = cab;
const K = kast(ctx, { x0: CX0, x1: X1, y0: CY0, y1: CY1, z0: -ZB, z1: ZB }, { xn: 0.05, xp: 0.16, yn: 0.04, yp: 0.14, zn: 0.14, zp: 0.14 }, {
  dikte: 0.04, stap: 0.18,
  knip: { x: [FD[0], FD[1], CD[0], CD[1], XV - RA, XV + RA], y: [FD[2], FD[3], CD[2]] },
  gat: (vlak, x, y, z) => {
    if (vlak[0] === "z") {
      if (inBoog(x, y, XV)) return true;
      for (const [a, b, c, d] of [FD, CD]) if (x > a && x < b && y > c && y < d) return true;
    }
    if (vlak === "y-") { if (Math.abs(z) > 0.6 && Math.abs(x - XV) < RA) return true; if (Math.abs(z) > 1.0 && x > CD[0] && x < CD[1]) return true; }
    return false;
  },
});
{
  const huid = mesh(K.buiten, "brandrood", "cabine"), wand = mesh(K.binnen, "binnenwand", "cabine", { schaduw: false });
  huid.userData.romp = wand.userData.romp = true; cab.add(huid, wand); G.huid = huid;
  const VL = (vlak, s0, s1, t0, t1, o) => vlakje(ctx, K, vlak, s0, s1, t0, t1, o);
  // voorruit met rubberen rand
  const ruit = mesh(VL("x+", -1.1, 1.1, 1.8, 2.78, { rc: 0.08, off: 0.01, ringen: 10 }), "raam", "cabine");
  const rand = mesh(VL("x+", -1.14, 1.14, 1.76, 2.82, { rc: 0.1, off: 0.005, ringen: 4 }), "rubber", "cabine");
  // grille met lamellen, bumper, koplampen
  const gril = [VL("x+", -0.95, 0.95, 1.08, 1.62, { rc: 0.05, off: 0.01, ringen: 4 })];
  const lam = []; for (let i = 0; i < 6; i++) lam.push(rondeDoos(0.03, 0.035, 1.8, 0.01).translate(X1 + 0.012, 1.14 + i * 0.085, 0));
  const bumper = VL("x+", -1.36, 1.36, 0.76, 0.98, { rc: 0.05, off: 0.025, ringen: 5 });
  cab.add(ruit, rand, mesh(samen(gril), "zwartmetaal", "cabine"), mesh(samen(lam), "metaal", "cabine"), mesh(bumper, "zwartmetaal", "cabine"));
  const kop = [], knip = [];
  for (const k of [1, -1]) { kop.push(VL("x+", k > 0 ? 0.62 : -1.16, k > 0 ? 1.16 : -0.62, 1.0, 1.13, { rc: 0.04, off: 0.03, ringen: 4 })); knip.push(VL("x+", k > 0 ? 1.18 : -1.34, k > 0 ? 1.34 : -1.18, 1.0, 1.13, { rc: 0.03, off: 0.03, ringen: 3 })); }
  const kl = mesh(samen(kop), "lamp", "lichten"); G.lichten.kop = kl;
  cab.add(kl, mesh(samen(knip), "knipper", "lichten"));
  // reflecterende streep: om de voorkant heen en langs de zijkant (onder de voordeur door)
  const streep = [VL("x+", 0.98, 1.42, 1.2, 1.27, { rc: 0.01, off: 0.012, ringen: 2 }), VL("x+", -1.42, -0.98, 1.2, 1.27, { rc: 0.01, off: 0.012, ringen: 2 })];
  for (const k of [1, -1]) streep.push(VL(k > 0 ? "z+" : "z-", CD[1] + 0.04, 4.12, 1.2, 1.27, { rc: 0.01, off: 0.012, ringen: 2 }));
  const st = mesh(samen(streep), "reflex", "cabine"); st.userData.romp = true; cab.add(st);
  // blauwe flitsers in de grille
  cab.add(mesh(VL("x+", 0.3, 0.55, 1.66, 1.73, { rc: 0.02, off: 0.014, ringen: 2 }), "blauwB", "zwaailichten"), mesh(VL("x+", -0.55, -0.3, 1.66, 1.73, { rc: 0.02, off: 0.014, ringen: 2 }), "blauwA", "zwaailichten"));
  // wielkast-rand en wielkast
  const randen = []; for (const k of [1, -1]) randen.push(boogRand(ctx, XV, YA, RA + 0.015, CY0, k * (ZB + 0.004), 0.04));
  cab.add(mesh(samen(randen), "zwartmetaal", "cabine"));
  for (const k of [1, -1]) cab.add(wielkast(ctx, XV, YA, RA - 0.02, k * 0.62, k * (ZB - 0.02), "zwartmetaal", "cabine"));
  // treden onder de bemanningsdeur
  const tree = []; for (const k of [1, -1]) for (const [y, d] of [[0.5, 0.26], [0.78, 0.12]]) tree.push(rondeDoos(CD[1] - CD[0] - 0.06, 0.035, d, 0.01).translate((CD[0] + CD[1]) / 2, y, k * (ZB - d / 2)));
  for (const k of [1, -1]) for (const x of [CD[0] + 0.05, CD[1] - 0.05]) tree.push(new THREE.BoxGeometry(0.03, 0.32, 0.03).translate(x, 0.62, k * (ZB - 0.02)));
  cab.add(mesh(samen(tree), "zwartmetaal", "cabine"));
  // spiegels: een grote en een kleine aan elke kant, aan een arm bij de voorkant
  const sp = new THREE.Group();
  for (const k of [1, -1]) {
    const arm = buis([V(4.16, 2.62, k * 1.2), V(4.12, 2.64, k * 1.42), V(4.06, 2.55, k * 1.52)], 0.022, { seg: 20, rond: 8 });
    const arm2 = buis([V(4.16, 1.9, k * 1.22), V(4.1, 1.9, k * 1.42), V(4.06, 1.98, k * 1.52)], 0.02, { seg: 16, rond: 8 });
    const kopG = rondeDoos(0.09, 0.42, 0.22, 0.03).translate(4.06, 2.28, k * 1.53), klein = rondeDoos(0.09, 0.2, 0.2, 0.03).translate(4.06, 1.96, k * 1.53);
    sp.add(mesh(samen([arm, arm2, kopG, klein]), "zwartmetaal", "spiegels"), mesh(samen([new THREE.BoxGeometry(0.01, 0.36, 0.18).translate(4.01, 2.28, k * 1.53), new THREE.BoxGeometry(0.01, 0.15, 0.16).translate(4.01, 1.96, k * 1.53)]), "raam", "spiegels"));
  }
  cab.add(sp); G.spiegels = sp;
}
// ---- deuren: draaien naar buiten om de voorste rand
for (const k of [1, -1]) for (const [a, b, c, d] of [FD, CD]) {
  const w = b - a, h = d - c, scharnier = new THREE.Group(); scharnier.position.set(b, 0, k * (ZB - 0.025));
  const deur = new THREE.Group();
  const yr = 1.95; // onderkant van het raam
  const plaat = [rondeDoos(w - 0.02, yr - c, 0.05, 0.02).translate(-w / 2, (c + yr) / 2, 0), rondeDoos(w - 0.02, 0.07, 0.05, 0.02).translate(-w / 2, d - 0.035, 0)];
  for (const x of [-0.035 - 0.01, -w + 0.035 + 0.01]) plaat.push(rondeDoos(0.07, d - yr, 0.05, 0.02).translate(x, (yr + d) / 2, 0));
  const glas = new THREE.BoxGeometry(w - 0.12, d - yr - 0.08, 0.02).translate(-w / 2, (yr + d) / 2 - 0.005, 0.005 * k);
  const pm = mesh(samen(plaat), "brandrood", "cabine"), gm = mesh(glas, "raam", "cabine");
  const greep = mesh(rondeDoos(0.2, 0.04, 0.04, 0.012).translate(-w + 0.2, yr - 0.15, k * 0.035), "zwartmetaal", "cabine");
  const deurStreep = mesh(new THREE.BoxGeometry(w - 0.04, 0.07, 0.01).translate(-w / 2, 1.235, k * 0.028), "reflex", "cabine");
  if (c > 1.0) deurStreep.visible = false; // de voordeur zit boven de streep
  pm.userData.romp = gm.userData.romp = true;
  deur.add(pm, gm, greep, deurStreep); scharnier.add(deur); cab.add(scharnier);
  G.deuren.push({ s: scharnier, k });
}
// ---- binnen in de cabine: stoelen voor zes, dashboard, stuur (links)
{
  const bin = new THREE.Group(), st = [];
  const stoel = (x, z, y0) => { st.push(rondeDoos(0.46, 0.1, 0.46, 0.04).translate(x, y0 + 0.45, z), rondeDoos(0.1, 0.62, 0.46, 0.04).rotateZ(0.12).translate(x - 0.22, y0 + 0.82, z), rondeDoos(0.08, 0.18, 0.28, 0.03).translate(x - 0.26, y0 + 1.2, z)); };
  for (const z of [-0.62, 0.62]) stoel(3.3, z, 1.2);
  for (const z of [-0.88, -0.3, 0.3, 0.88]) stoel(1.62, z, 0.85);
  const vloer = [new THREE.BoxGeometry(1.05, 0.03, 2.4).translate(1.75, 0.86, 0), new THREE.BoxGeometry(1.7, 0.03, 2.4).translate(3.3, 1.21, 0), new THREE.BoxGeometry(0.03, 0.35, 2.4).translate(2.28, 1.03, 0)];
  const dash = rondeDoos(0.45, 0.4, 2.3, 0.06); dash.rotateZ(0.4); dash.translate(4.02, 1.62, 0);
  const stuur = new THREE.TorusGeometry(0.23, 0.022, 10, 36); stuur.rotateY(Math.PI / 2); stuur.rotateZ(0.55); stuur.translate(3.72, 1.95, -0.62);
  bin.add(mesh(samen(st), "stoel", "cabine"), mesh(samen(vloer), "vloer", "cabine"), mesh(dash, "klep", "cabine"), mesh(samen([stuur, staaf(V(3.98, 1.65, -0.62), V(3.74, 1.94, -0.62), 0.03, 10)]), "zwartmetaal", "cabine"));
  cab.add(bin); G.cabBinnen = bin;
}
// ---- zwaailichten op het dak van de cabine (met de sirene in het midden)
{
  const zw = new THREE.Group();
  zw.add(mesh(rondeDoos(0.34, 0.07, 1.8, 0.03).translate(3.95, CY1 + 0.035, 0), "zwartmetaal", "zwaailichten"));
  zw.add(mesh(rondeDoos(0.3, 0.12, 0.62, 0.05).translate(3.95, CY1 + 0.13, -0.56), "blauwA", "zwaailichten"), mesh(rondeDoos(0.3, 0.12, 0.62, 0.05).translate(3.95, CY1 + 0.13, 0.56), "blauwB", "zwaailichten"));
  zw.add(mesh(rondeDoos(0.26, 0.1, 0.44, 0.03).translate(3.95, CY1 + 0.12, 0), "metaal", "zwaailichten"));
  cab.add(zw); G.zwaai = zw;
}

// ================= de opbouw: kasten met rolluiken, de pomp achterin, de ladder op het dak =================
const opb = new THREE.Group(); root.add(opb); G.opbouw = opb;
const VAKKEN = [[-0.5, 1.0, 0.85], [-2.05, -0.6, 1.3], [-3.45, -2.15, 0.85]]; // x0, x1, onderkant (boven de wielkast hoger)
{
  const rood = [], binnen = [], strepen = [];
  // kern: de watertank in het midden, tegelijk de achterwand van de kasten
  binnen.push(rondeDoos(4.55, 1.95, 1.0, 0.03).translate((-3.5 + 1.05) / 2, 0.8 + 0.975, 0));
  binnen.push(new THREE.BoxGeometry(0.78, 0.02, 2.2).translate(-3.88, 0.86, 0)); // vloer van de pompkast
  // bovenbalk (daarin rollen de luiken op) en dak
  rood.push(rondeDoos(OX1 - X0, OY1 - KAST_Y1, 2 * ZO, 0.07).translate((X0 + OX1) / 2, (KAST_Y1 + OY1) / 2, 0));
  // palen tussen de vakken, voor- en achterkant
  const palen = [[OX1 - 0.1, OX1], [-0.6, -0.5], [-2.15, -2.05], [-3.55, -3.45]];
  for (const k of [1, -1]) {
    for (const [a, b] of palen) rood.push(rondeDoos(b - a, KAST_Y1 - OY0, ZO - 0.5, 0.015).translate((a + b) / 2, (OY0 + KAST_Y1) / 2, k * (ZO + 0.5) / 2));
    // drempel onder de vakken
    for (const [a, b, y0] of VAKKEN) if (y0 < 1) rood.push(rondeDoos(b - a, y0 - OY0, ZO - 0.5, 0.015).translate((a + b) / 2, (OY0 + y0) / 2, k * (ZO + 0.5) / 2));
    // achterhoek naast de pomp
    rood.push(rondeDoos(0.75, KAST_Y1 - OY0, 0.15, 0.02).translate(X0 + 0.375, (OY0 + KAST_Y1) / 2, k * (ZO - 0.075)));
    // vloer in elk vak, en een plank halverwege
    for (const [a, b, y0] of VAKKEN) { binnen.push(new THREE.BoxGeometry(b - a, 0.02, ZO - 0.52).translate((a + b) / 2, y0 + 0.01, k * (ZO + 0.5) / 2)); }
    binnen.push(new THREE.BoxGeometry(1.5, 0.02, 0.7).translate(0.25, 1.75, k * 0.86), new THREE.BoxGeometry(1.3, 0.02, 0.7).translate(-2.8, 1.85, k * 0.86));
    // strepen: onder langs de drempel, boven langs de balk
    strepen.push(new THREE.BoxGeometry(OX1 - X0 - 0.06, 0.06, 0.01).translate((X0 + OX1) / 2, 2.77, k * (ZO + 0.005)));
    for (const [a, b] of [[X0 + 0.03, -2.0], [-0.62, OX1 - 0.03]]) strepen.push(new THREE.BoxGeometry(b - a, 0.06, 0.01).translate((a + b) / 2, 0.8, k * (ZO + 0.005)));
  }
  // het stuk boven de achterwielkast, met een ronde uitsparing
  for (const k of [1, -1]) {
    const s = new THREE.Shape(); s.moveTo(-2.05, OY0); s.lineTo(XA - RA - 0.02, OY0);
    s.absarc(XA, YA, RA + 0.02, Math.PI - Math.asin((OY0 - YA) / (RA + 0.02)), Math.asin((OY0 - YA) / (RA + 0.02)), true);
    s.lineTo(-0.6, OY0); s.lineTo(-0.6, 1.3); s.lineTo(-2.05, 1.3); s.lineTo(-2.05, OY0);
    const g = new THREE.ExtrudeGeometry(s, { depth: ZO - 0.5, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, k > 0 ? 0.5 : -ZO);
    rood.push(g);
  }
  opb.add(mesh(samen(rood), "brandrood", "opbouw"), mesh(samen(binnen), "kastbinnen", "opbouw"), mesh(samen(strepen), "reflex", "opbouw"));
  for (const k of [1, -1]) { opb.add(wielkast(ctx, XA, YA, RA, k * 0.51, k * (ZO - 0.01), "zwartmetaal", "opbouw")); opb.add(mesh(boogRand(ctx, XA, YA, RA + 0.02, OY0, k * (ZO + 0.01), 0.035), "zwartmetaal", "opbouw")); }
  // achter: bumper met rode en witte schuine strepen, een trede, en de achterlichten
  const bump = [rondeDoos(0.2, 0.22, 2.4, 0.03).translate(X0 - 0.02, 0.62, 0)];
  const wit = [], rd = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Shape(), z0 = -1.15 + i * 0.23; s.moveTo(z0, 0.52); s.lineTo(z0 + 0.115, 0.52); s.lineTo(z0 + 0.115 + 0.1, 0.72); s.lineTo(z0 + 0.1, 0.72); s.closePath();
    const g = new THREE.ShapeGeometry(s); g.rotateY(-Math.PI / 2); g.translate(X0 - 0.125, 0, 0); (i % 2 ? rd : wit).push(g); }
  const tred = rondeDoos(0.3, 0.04, 1.6, 0.01).translate(X0 - 0.02, 0.42, 0);
  opb.add(mesh(samen(bump), "zwartmetaal", "opbouw"), mesh(samen(wit), "reflex", "opbouw"), mesh(samen(rd), "brandrood", "opbouw"), mesh(tred, "zwartmetaal", "opbouw"));
  const al = []; for (const k of [1, -1]) al.push(rondeDoos(0.04, 0.42, 0.13, 0.02).translate(X0 - 0.01, 1.05, k * 1.17));
  opb.add(mesh(samen(al), "achterlicht", "lichten"));
  // blauwe flitsers achter en op de zijkant
  for (const [k, s] of [[1, "blauwB"], [-1, "blauwA"]]) opb.add(mesh(samen([rondeDoos(0.05, 0.12, 0.2, 0.03).translate(X0 - 0.015, 2.82, k * 1.05), rondeDoos(0.22, 0.08, 0.03, 0.02).translate(0.6, 2.85, k * (ZO + 0.012))]), s, "zwaailichten"));
}
// ---- rolluiken: lamellen die omhoog schuiven en bovenin oprollen
function rolluik(x0, x1, y0, y1) {
  // lamellen met een zachte bolling (geen scherpe randen, dus geen drukke inktlijnen); de onderste is een dikke lat
  const p = 0.075, n = Math.round((y1 - y0) / p), A = 0.006, R = 4, hw = (x1 - x0 - 0.01) / 2, pos = [], nrm = [], start = [0];
  const onder = new THREE.BoxGeometry(2 * hw, p - 0.004, 0.05).translate(0, y0 + p / 2, 0).toNonIndexed();
  pos.push(...onder.attributes.position.array); nrm.push(...onder.attributes.normal.array); start.push(pos.length);
  for (let i = 1; i < n; i++) {
    for (let r = 0; r < R; r++) {
      const v0 = r / R, v1 = (r + 1) / R, pt = (v) => [y0 + (i + v) * p, A * Math.sin(Math.PI * v)], nv = (v) => { const dz = (A * Math.PI * Math.cos(Math.PI * v)) / p, l = Math.hypot(dz, 1); return [0, -dz / l, 1 / l]; };
      const [ya, za] = pt(v0), [yb, zb] = pt(v1), na = nv(v0), nb = nv(v1);
      const q = [[-hw, ya, za, na], [hw, ya, za, na], [hw, yb, zb, nb], [-hw, ya, za, na], [hw, yb, zb, nb], [-hw, yb, zb, nb]];
      for (const [x, y, z, nn] of q) { pos.push(x, y, z); nrm.push(...nn); }
    }
    start.push(pos.length);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.computeBoundingBox(); g.computeBoundingSphere();
  const basis = g.attributes.position.array.slice();
  const m = mesh(g, "rolluik", "kasten"); m.frustumCulled = false;
  const greep = mesh(rondeDoos(0.4, 0.04, 0.05, 0.015).translate(0, y0 + 0.05, 0.035), "zwartmetaal", "kasten");
  const gr = groep(m, greep);
  gr.userData.zet = (t) => {
    const a = g.attributes.position.array, d = t * (y1 - y0 - p);
    for (let i = 0; i < n; i++) { const y = y0 + i * p, dy = Math.min(d, y1 - p - y), weg = y + d > y1 - p; for (let j = start[i]; j < start[i + 1]; j += 3) { a[j + 1] = basis[j + 1] + dy; a[j + 2] = basis[j + 2] - (weg ? 0.03 : 0); } }
    g.attributes.position.needsUpdate = true; greep.position.y = d;
  };
  return gr;
}
for (const k of [1, -1]) for (const [a, b, y0] of VAKKEN) {
  const r = rolluik(a, b, y0, KAST_Y1); r.position.set((a + b) / 2, 0, k * (ZO - 0.03)); if (k < 0) r.rotation.y = Math.PI;
  opb.add(r); G.luiken.push(r);
}
G.achterLuik = rolluik(-1.1, 1.1, 0.85, KAST_Y1); G.achterLuik.rotation.y = -Math.PI / 2; G.achterLuik.position.set(X0 + 0.04, 0, 0); opb.add(G.achterLuik);
// ---- spullen in de kasten
{
  const sp = new THREE.Group(), fles = [], geel = [], slang = [], rood = [], zwart = [];
  for (const k of [1, -1]) {
    const zc = k * 0.9;
    // vak 1: ademluchtflessen in een rek, en blussers
    for (let i = 0; i < 4; i++) fles.push(new THREE.CapsuleGeometry(0.085, 0.42, 6, 16).translate(-0.3 + i * 0.22, 1.165, zc));
    for (let i = 0; i < 2; i++) rood.push(new THREE.CapsuleGeometry(0.09, 0.32, 6, 16).translate(0.62 + i * 0.22, 1.12, zc));
    zwart.push(new THREE.BoxGeometry(1.3, 0.04, 0.06).translate(0.25, 1.15, zc - k * 0.2));
    for (let i = 0; i < 3; i++) zwart.push(rondeDoos(0.36, 0.22, 0.34, 0.04).translate(-0.25 + i * 0.45, 1.88, zc)); // kisten op de plank
    // vak 2: opgerolde slangen op de plank boven de wielkast
    for (let i = 0; i < 5; i++) slang.push(new THREE.TorusGeometry(0.15, 0.06, 10, 24).rotateY(Math.PI / 2).translate(-1.85 + i * 0.26, 1.53, zc));
    for (let i = 0; i < 4; i++) slang.push(new THREE.TorusGeometry(0.15, 0.06, 10, 24).rotateY(Math.PI / 2).translate(-1.72 + i * 0.26, 2.055, zc));
    zwart.push(new THREE.BoxGeometry(1.4, 0.02, 0.7).translate(-1.32, 1.83, k * 0.86));
    // vak 3: redgereedschap (spreider en schaar) en een aggregaat
    geel.push(rondeDoos(0.55, 0.35, 0.4, 0.06).translate(-3.05, 1.045, zc), rondeDoos(0.18, 0.5, 0.14, 0.04).translate(-2.45, 1.12, zc), rondeDoos(0.18, 0.5, 0.14, 0.04).translate(-2.7, 1.12, zc));
    zwart.push(staaf(V(-2.45, 1.4, zc), V(-2.45, 1.6, zc), 0.025), staaf(V(-2.7, 1.4, zc), V(-2.7, 1.6, zc), 0.025));
    rood.push(rondeDoos(0.5, 0.3, 0.32, 0.05).translate(-2.85, 2.01, zc));
  }
  sp.add(mesh(samen(fles), "fles", "gereedschap"), mesh(samen(geel), "geel", "gereedschap"), mesh(samen(slang), "slang", "gereedschap"), mesh(samen(rood), "rood", "gereedschap"), mesh(samen(zwart), "zwartmetaal", "gereedschap"));
  opb.add(sp); G.spullen = sp; G.flessen = sp.children[0]; G.slangen = sp.children[2];
}
// ---- de pomp achterin, met een paneel met meters, en twee haspels met de slang
{
  const pomp = new THREE.Group();
  const huis = new THREE.CylinderGeometry(0.22, 0.22, 0.6, 32).rotateX(Math.PI / 2).translate(-3.9, 1.12, 0);
  const pijpen = [], kopp = [];
  for (const z of [-0.42, 0.42]) { pijpen.push(staaf(V(-3.9, 1.05, z * 0.5), V(-4.12, 1.05, z), 0.05, 16)); kopp.push(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 20).rotateZ(Math.PI / 2).translate(-4.15, 1.05, z)); }
  const paneel = rondeDoos(0.04, 0.62, 1.1, 0.02).translate(-3.56, 1.75, 0);
  const meters = [], wijzers = [];
  for (const z of [-0.3, 0, 0.3]) { meters.push(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24).rotateZ(Math.PI / 2).translate(-3.59, 1.88, z)); wijzers.push(new THREE.BoxGeometry(0.005, 0.06, 0.008).translate(-3.6, 1.9, z)); }
  const hendels = []; for (const z of [-0.35, -0.12, 0.12, 0.35]) hendels.push(staaf(V(-3.6, 1.55, z), V(-3.75, 1.62, z), 0.015, 8), new THREE.SphereGeometry(0.03, 10, 8).translate(-3.75, 1.62, z));
  pomp.add(mesh(samen([huis, ...pijpen]), "metaal", "pomp"), mesh(samen(kopp), "zwartmetaal", "pomp"), mesh(paneel, "zwartmetaal", "pomp"), mesh(samen(meters), "witlicht", "pomp"), mesh(samen(wijzers), "zwartmetaal", "pomp"), mesh(samen(hendels), "rood", "pomp"));
  opb.add(pomp); G.pomp = pomp;
  // haspels: as langs x, links en rechts boven de pomp
  for (const k of [1, -1]) {
    const h = new THREE.Group(); h.position.set(-3.95, 2.12, k * 0.62); h.rotation.y = Math.PI / 2;
    const draai = new THREE.Group(); h.add(draai);
    const schijven = [new THREE.CylinderGeometry(0.34, 0.34, 0.02, 40).rotateX(Math.PI / 2).translate(0, 0, 0.16), new THREE.CylinderGeometry(0.34, 0.34, 0.02, 40).rotateX(Math.PI / 2).translate(0, 0, -0.16)];
    const gaten = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; gaten.push(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 14).rotateX(Math.PI / 2).translate(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.165)); }
    const rol = [new THREE.CylinderGeometry(0.27, 0.27, 0.29, 40).rotateX(Math.PI / 2)]; for (let i = 0; i < 6; i++) rol.push(new THREE.TorusGeometry(0.272, 0.022, 8, 40).translate(0, 0, -0.125 + i * 0.05));
    draai.add(mesh(samen(schijven), "rolluik", "haspel"), mesh(samen(gaten), "zwartmetaal", "haspel"), mesh(samen(rol), "slangrood", "haspel"));
    // de slang hangt eraf, met een straalpijp
    const losse = buis([V(0.0, -0.28, 0.05 * k), V(0.05, -0.5, 0.18), V(0.1, -0.75, 0.25)], 0.022, { seg: 16, rond: 8 });
    const pijp = samen([new THREE.CylinderGeometry(0.03, 0.03, 0.18, 14).translate(0.1, -0.84, 0.25), new THREE.CylinderGeometry(0.018, 0.03, 0.1, 14).translate(0.1, -0.97, 0.25)]);
    h.add(mesh(losse, "slangrood", "haspel"), mesh(pijp, "zwartmetaal", "haspel"));
    opb.add(h); G.haspels.push(draai); G[k > 0 ? "haspelR" : "haspelL"] = h;
  }
}
// ---- de ladder op het dak: een schuifladder in twee delen, en zuigslangen
{
  const LL = 4.5, LB = 0.48, x0 = -4.05, y0 = OY1 + 0.15, zc = 0.42;
  const rek = []; for (const x of [-3.8, -1.6, 0.6]) rek.push(rondeDoos(0.08, 0.1, 1.9, 0.02).translate(x, OY1 + 0.05, 0));
  opb.add(mesh(samen(rek), "zwartmetaal", "ladder"));
  const deel = (lengte, breed, dik) => { const g = []; for (const z of [-breed / 2, breed / 2]) g.push(rondeDoos(lengte, 0.09, dik, 0.012).translate(lengte / 2, 0, z)); for (let x = 0.15; x < lengte - 0.05; x += 0.28) g.push(new THREE.CylinderGeometry(0.016, 0.016, breed, 10).rotateX(Math.PI / 2).translate(x, 0, 0)); return samen(g); };
  const scharnier = new THREE.Group(); scharnier.position.set(x0, y0, zc);
  const onder = mesh(deel(LL, LB, 0.04), "metaal", "ladder");
  const boven = new THREE.Group(); boven.position.set(0.05, 0.1, 0); boven.add(mesh(deel(LL - 0.2, LB - 0.1, 0.035), "metaal", "ladder"));
  scharnier.add(onder, boven); opb.add(scharnier); G.ladder = scharnier; G.ladderBoven = boven;
  const zuig = []; for (const z of [-0.45, -0.75]) zuig.push(new THREE.CylinderGeometry(0.065, 0.065, 2.4, 20).rotateZ(Math.PI / 2).translate(-1.9, OY1 + 0.17, z));
  for (const z of [-0.45, -0.75]) for (const x of [-3.1, -0.7]) zuig.push(new THREE.CylinderGeometry(0.085, 0.085, 0.1, 20).rotateZ(Math.PI / 2).translate(x, OY1 + 0.17, z));
  opb.add(mesh(samen(zuig), "rubber", "ladder"));
}
// ---- chassis, spatlappen, assen
{
  const ch = [];
  for (const z of [-0.45, 0.45]) ch.push(new THREE.BoxGeometry(8.0, 0.25, 0.09).translate(-0.05, 0.7, z));
  ch.push(new THREE.BoxGeometry(0.08, 0.12, 2.1).translate(X0 + 0.25, 0.48, 0)); // onderrijbeveiliging
  ch.push(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 24).rotateZ(Math.PI / 2).translate(0.2, 0.45, -0.9)); // brandstoftank
  ch.push(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 18).rotateZ(Math.PI / 2).translate(0.2, 0.56, 0.9)); // luchttank
  const lap = []; for (const k of [1, -1]) for (const x of [XV - RA - 0.03, XA - RA - 0.03]) lap.push(new THREE.BoxGeometry(0.02, 0.38, 0.34).translate(x, 0.39 + (x > 0 ? 0.0 : 0), k * 1.05));
  root.add(mesh(samen(ch), "zwartmetaal", "wielen"), mesh(samen(lap), "rubber", "wielen"));
  root.add(mesh(samen([staaf(V(XV, RW, -0.95), V(XV, RW, 0.95), 0.07, 12), staaf(V(XA, RW, -0.8), V(XA, RW, 0.8), 0.1, 12)]), "zwartmetaal", "wielen"));
}
// ---- wielen: voor enkel, achter dubbel
for (const [x, dubbel] of [[XV, false], [XA, true]]) for (const k of [1, -1]) {
  const { wiel: w, draai } = wiel(ctx, { r: RW, breed: 0.3, velg: 0.29, dubbel, tussen: 0.03, deel: "wielen", diep: dubbel ? 0.1 : 0.06, velgSoort: "metaal" });
  w.position.set(x, RW, k * (dubbel ? 1.05 : 1.08)); if (k < 0) w.rotation.y = Math.PI;
  draai.userData.k = k; root.add(w); G.wielen.push(draai); G[`wiel${x > 0 ? "V" : "A"}${k > 0 ? "R" : "L"}`] = w;
}


// ================= Teksten (maten zijn die van de tekening) =================
// op een smal scherm (staand) iets verder weg, zodat het hele voertuig in beeld past
const SMAL = typeof matchMedia === "function" && matchMedia("(max-aspect-ratio: 1/1)").matches;
const C = (d, h, a, p, fov) => [d, h, a * (SMAL ? 1.3 : 1), p, fov];
// op een smal scherm alle namen links van hun punt, dan lopen ze niet over de rechterrand
const U = (lijst) => (SMAL ? lijst.map(([o, v, n, pl]) => [o, v, n, pl ? [-Math.abs(pl[0]), pl[1]] : pl]) : lijst);
const N = (lijst) => (SMAL ? lijst.map(([k, t, dx, dy]) => [k, t, -Math.abs(dx), dy]) : lijst);
const SECTIES = [
  { sleutel: "brandweerauto", naam: "De brandweerauto", titel: "De brandweerauto", tekst: "Een tankautospuit: de brandweerauto die als eerste komt. Hij heeft water bij zich, een pomp, slangen, een ladder en plek voor zes mensen. Tik op de zwaailichten.", cam: C(0.7, 0.16, 15.5, [0.1, 1.5, 0], 32), focus: null,
    specs: [["Lengte", "8,6 m in de tekening"], ["Breedte", "2,55 m"], ["Hoogte", "3,3 m met de ladder"], ["Bemanning", "6, in de cabine"], ["Zwaailichten", "tik", "zwaailichten"]],
    namen: N([["cabine", "CABINE", 50, -130], ["luik", "ROLLUIKEN", -40, 90], ["ladder", "LADDER", -50, -60], ["zwaai", "ZWAAILICHTEN", 40, -40], ["wiel", "WIELEN", 50, 70]]) },
  { sleutel: "cabine", naam: "De cabine", titel: "De cabine", tekst: "Voorin rijdt de chauffeur, naast hem zit de baas van de ploeg. Achterin zitten nog vier brandweermensen. Ze trekken onderweg hun pak en masker al aan.", cam: C(0.95, 0.14, 13, [2.4, 1.6, 0.6], 32), focus: ["cabine", "spiegels"], deuren: true,
    specs: [["Plaatsen", "6: 2 voor, 4 achter"], ["Deuren", "4, ze draaien open"], ["Chauffeur", "linksvoor"], ["Spiegels", "2 aan elke kant"]],
    namen: N([["voordeur", "VOORDEUR", 60, -150], ["bemanning", "BEMANNING", -60, -150], ["spiegel", "SPIEGELS", 70, 110]]) },
  { sleutel: "kasten", naam: "De kasten", titel: "De kasten met rolluiken", tekst: "Aan de zijkant zitten kasten met rolluiken. Die schuiven omhoog. Daarachter liggen de slangen, de flessen met lucht om te ademen en het gereedschap.", cam: C(0.1, 0.1, 12.5, [-0.7, 1.6, 0.4], 32), focus: ["kasten", "gereedschap"], luiken: true,
    specs: [["Kasten", "3 aan elke kant"], ["Rolluiken", "van aluminium, schuiven omhoog"], ["Ademlucht", "4 flessen per kant in de tekening"], ["Slangen", "opgerold, 9 per kant"]],
    namen: N([["flessen", "ADEMLUCHT", 60, 130], ["slangen", "SLANGEN", 40, -120], ["luik", "ROLLUIK", -60, -140]]) },
  { sleutel: "ladder", naam: "De ladder", titel: "De ladder", tekst: "Op het dak ligt een schuifladder. Hier gaat hij omhoog en schuift hij uit. Bij een brand halen ze hem van het dak en zetten hem tegen het huis.", cam: C(0.42, 0.16, 20, [-0.6, 3.5, 0], 32), focus: ["ladder"], ladder: true,
    specs: [["Ladder", "2 delen, schuift uit"], ["Lengte", "4,5 m, uitgeschoven 7 m in de tekening"], ["Ook op het dak", "2 zuigslangen"]],
    namen: N([["ladderBoven", "SCHUIFLADDER", 50, -40], ["zuig", "ZUIGSLANGEN", -60, 50]]) },
  { sleutel: "pomp", naam: "De pomp", titel: "De pomp en de haspels", tekst: "Achterin zit de pomp. Die pompt water uit de tank of uit een brandkraan naar de slangen. Op de haspels zit een lange slang die altijd klaar ligt.", cam: C(-0.95, 0.14, 9, [-3.9, 1.6, 0], 32), focus: ["pomp", "haspel"], achter: true, haspel: true,
    specs: [["Pomp", "achterin, met meters"], ["Haspels", "2, links en rechts"], ["Watertank", "in het midden, minstens 1500 liter"]],
    namen: N([["pomp", "POMP", 90, 90], ["haspelR", "HASPEL", -110, -90], ["meters", "METERS", 110, -60]]) },
  { sleutel: "zwaailichten", naam: "De zwaailichten", titel: "Zwaailichten en sirene", tekst: "Als de brandweer haast heeft, flitsen de blauwe lampen en gaat de sirene. Dan gaan de andere auto's opzij.", cam: C(1.05, 0.22, 10.5, [3.4, 2.2, 0], 32), focus: ["zwaailichten", "lichten"], zwaai: true,
    specs: [["Zwaailichten", "blauw, op het dak en voorop"], ["Sirene", "tussen de lampen op het dak"], ["Achter", "ook blauwe flitsers"], ["Zwaailichten", "tik", "zwaailichten"]],
    namen: N([["zwaai", "ZWAAILICHTEN", 50, -60], ["koplamp", "KOPLAMP", -80, 90], ["flitser", "FLITSER", 60, 40]]) },
  { sleutel: "wielen", naam: "De wielen", titel: "De wielen", tekst: "Zes grote wielen: voor één aan elke kant, achter twee naast elkaar. De voorwielen sturen, de achterwielen worden aangedreven.", cam: C(0.12, 0.08, 16, [0.7, 0.95, 0], 32), focus: ["wielen"], rollen: true,
    specs: [["Wielen", "6: voor 2, achter 2 × 2"], ["Doorsnede", "1,06 m in de tekening"], ["Tussen de assen", "4,2 m"]],
    namen: N([["wiel", "VOORWIEL", 50, 110], ["wielA", "DUBBELE ACHTERWIELEN", -50, 110]]) },
];
const KIND = [
  { naam: "de brandweerauto", focus: ["cabine", "opbouw"], cam: C(0.7, 0.16, 15.5, [0.1, 1.5, 0], 32), geluid: "sirene", zwaai: true },
  { naam: "de cabine", focus: ["cabine"], cam: C(0.95, 0.14, 13, [2.4, 1.6, 0.6], 32), deuren: true },
  { naam: "de rolluiken", focus: ["kasten"], cam: C(0.1, 0.1, 12.5, [-0.7, 1.6, 0.4], 32), luiken: true },
  { naam: "de ladder", focus: ["ladder"], cam: C(0.42, 0.16, 20, [-0.6, 3.5, 0], 32), ladder: true },
  { naam: "de slang", focus: ["haspel", "gereedschap"], cam: C(-0.95, 0.14, 9, [-3.9, 1.6, 0], 32), achter: true, haspel: true },
  { naam: "de pomp", focus: ["pomp"], cam: C(-0.95, 0.14, 9, [-3.9, 1.6, 0], 32), achter: true },
  { naam: "de zwaailichten", focus: ["zwaailichten"], cam: C(1.05, 0.22, 10.5, [3.4, 2.2, 0], 32), zwaai: true, geluid: "sirene" },
  { naam: "de wielen", focus: ["wielen"], cam: C(0.12, 0.08, 16, [0.7, 0.95, 0], 32), rollen: true, geluid: "rol" },
];

function mini(aan) {
  const sx = (x) => 60 + x * 11.5, sy = (y) => 60 - y * 13.5;
  const cabP = `M${sx(1.2)},${sy(0.75)}V${sy(3)}H${sx(4.15)}Q${sx(4.3)},${sy(3)} ${sx(4.3)},${sy(2.8)}V${sy(0.8)}H${sx(1.2)}`;
  const opbP = `M${sx(-4.3)},${sy(0.75)}V${sy(2.95)}H${sx(1.1)}V${sy(0.75)}Z`;
  const vakken = VAKKEN.map(([a, b, y0]) => `<path d="M${sx(a)},${sy(y0)}V${sy(KAST_Y1)}H${sx(b)}V${sy(y0)}Z" class="${aan("kasten")}"/>`).join("");
  const wielen = [XV, XA].map((x) => `<circle cx="${sx(x)}" cy="${sy(RW)}" r="${RW * 13.5}" class="${aan("wielen")}"/>`).join("");
  return `<path d="${cabP}" class="${aan("cabine")}"/><path d="${opbP}" class="${aan("pomp") || aan("haspel")}"/>${vakken}${wielen}` +
    `<path d="M${sx(-4.05)},${sy(3.12)}H${sx(0.45)}" class="${aan("ladder")}" style="stroke-width:3"/>` +
    `<path d="M${sx(3.8)},${sy(3.12)}H${sx(4.1)}" class="${aan("zwaailichten")}" style="stroke-width:4"/>`;
}

let deurNu = 0, luikNu = 0, achterNu = 0, ladderNu = 0, klok = 0, rol = 0, flits = 0, zwaaiAan = false;
const naar = (nu, doel, dt, sec) => (Math.abs(doel - nu) < 1e-3 ? doel : nu + Math.sign(doel - nu) * Math.min(Math.abs(doel - nu), dt / sec));
function beweeg(dt, h, s) {
  let bezig = false;
  klok += dt;
  // deuren, luiken, ladder: naar hun doel; in hun eigen onderdeel gaan ze open en dicht
  const cyclus = (aan, lang) => (aan ? (klok % lang < lang * 0.72 ? 1 : 0) : 0);
  const d = [[deurNu, cyclus(h.deuren, 8)], [luikNu, cyclus(h.luiken, 9) || (s.uiteen ? 1 : 0)], [achterNu, h.achter || s.uiteen ? 1 : 0], [ladderNu, cyclus(h.ladder, 11)]];
  if (h.deuren || h.luiken || h.ladder || h.achter) bezig = true;
  const [dn, ln, an, la] = d.map(([nu, doel], i) => { const v = naar(nu, doel, dt, [1.3, 1.8, 1.8, 2.6][i]); if (v !== nu) bezig = true; return v; });
  if (dn !== deurNu || !G._eerst) for (const { s: sc, k } of G.deuren) sc.rotation.y = k * 1.35 * glad(dn);
  if (ln !== luikNu || !G._eerst) for (const l of G.luiken) l.userData.zet(glad(ln));
  if (an !== achterNu || !G._eerst) G.achterLuik.userData.zet(glad(an));
  if (la !== ladderNu || !G._eerst) { G.ladder.rotation.z = 0.95 * glad(la / 0.6); G.ladderBoven.position.x = 0.05 + 2.6 * glad((la - 0.55) / 0.45); }
  G._eerst = true; deurNu = dn; luikNu = ln; achterNu = an; ladderNu = la;
  if (h.haspel) { for (const hs of G.haspels) hs.rotation.z += dt * 1.2; bezig = true; }
  if (h.rollen) { rol += dt * 2.2; for (const w of G.wielen) w.rotation.z = -w.userData.k * rol; bezig = true; }
  // zwaailichten: twee groepen die om de beurt twee keer flitsen
  const zwaai = h.zwaai || zwaaiAan || s.uiteen; flits += dt;
  const f = flits % 0.8, a = zwaai && (f < 0.07 || (f > 0.14 && f < 0.21)), b = zwaai && ((f > 0.4 && f < 0.47) || (f > 0.54 && f < 0.61));
  const aan = s.lichtAan || h.zwaai || s.uiteen;
  for (const k of ["teken", "donker"]) {
    MAT.blauwA[k].emissiveIntensity = a ? 3.2 : 0.04; MAT.blauwB[k].emissiveIntensity = b ? 3.2 : 0.04;
    MAT.lamp[k].emissiveIntensity = aan ? 2.4 : 0; MAT.achterlicht[k].emissiveIntensity = aan ? 2.2 : 0.12; MAT.knipper[k].emissiveIntensity = 0.05;
  }
  if (zwaai) bezig = true;
  return bezig;
}
return {
  titel: "De brandweerauto", label: "Brandweerauto", model: "Tankautospuit · 6 wielen", schaal: "Maten in meters", hint: "Sleep om te draaien · tik op de zwaailichten", SECTIES, KIND, mini, beweeg,
  tik: (deel) => { if (deel === "zwaailichten") { zwaaiAan = !zwaaiAan; return true; } return false; },
  anker: () => ({ cabine: G.huid, luik: G.luiken[0], ladder: G.ladder.children[0], ladderBoven: G.ladderBoven, zuig: DELEN.ladder[DELEN.ladder.length - 1], zwaai: G.zwaai, wiel: G.wielVR, wielA: G.wielAR,
    voordeur: G.deuren[0].s, bemanning: G.cabBinnen.children[0], spiegel: G.spiegels.children[0], flessen: G.flessen, slangen: G.slangen, pomp: G.pomp.children[0], haspelR: G.haspelR, meters: G.pomp.children[3],
    koplamp: G.lichten.kop, flitser: DELEN.zwaailichten[0] }),
  uiteenCam: C(0.62, 0.42, 22, [-0.2, 2.0, 0], 34),
  uiteen: () => U([
    [G.cab, [2.2, 0, 0], "CABINE", [60, -40]],
    [G.zwaai, [0.6, 1.0, 0], "ZWAAILICHTEN", [60, -30]],
    [G.ladder, [0, 1.8, 0], "LADDER", [-60, -30]],
    [G.spullen, [0, 0, 0], null],
    [G.luiken[0], [0, 0, 1.5], "ROLLUIKEN", [-40, 50]], [G.luiken[1], [0, 0, 1.5], null], [G.luiken[2], [0, 0, 1.5], null],
    [G.luiken[3], [0, 0, -1.5], null], [G.luiken[4], [0, 0, -1.5], null], [G.luiken[5], [0, 0, -1.5], null],
    [G.achterLuik, [-1.2, 0, 0], null], [G.pomp, [-2.0, -0.2, 0], "POMP", [-60, 30]], [G.haspelR, [-1.8, 0.6, 0.9], "HASPEL", [-60, -30]], [G.haspelL, [-1.8, 0.6, -0.9], null],
    [G.wielVR, [0, 0, 2.2], "WIELEN", [50, 30]], [G.wielAR, [0, 0, 2.2], null], [G.wielVL, [0, 0, -2.2], null], [G.wielAL, [0, 0, -2.2], null],
  ]),
};
}
