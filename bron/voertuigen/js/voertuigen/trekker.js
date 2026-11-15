// De trekker: een algemene landbouwtrekker, in code getekend (maten in meters, zoals een middelgrote trekker;
// de voorkant wijst naar +x, rechts is +z). Geen bestaand type, geen merk, geen merkkleuren. Module voor /js/kern.js.
export default function maak(ctx) {
const { THREE, V, TAU, root, MAT, soort, mesh, op, samen, rondeDoos, naarBuitenG } = ctx;
const G = { achter: [], voor: [], stuur: [], lampen: {}, nokken: [] };

// ---- kleuren: een rustig grijsgroen, donker gietijzer, lichte velgen
const LAK = soort("trekkerlak", 0xe2e5dc, { color: 0x67715f, roughness: 0.36, metalness: 0.12, clearcoat: 0.7, clearcoatRoughness: 0.18 });
const ONDER = soort("trekkeronder", 0xd0d1cd, { color: 0x303235, roughness: 0.5, metalness: 0.45 });
const VELG = soort("trekkervelg", 0xf3f1ec, { color: 0xb7b3a8, roughness: 0.38, metalness: 0.25, clearcoat: 0.5 });
const GEWICHT = soort("trekkergewicht", 0xc2c3bf, { color: 0x3b3d40, roughness: 0.55, metalness: 0.35 });
const GLAS = soort("trekkerglas", 0xdce6ea, { color: 0x8aa0aa, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.3, depthWrite: false });
Object.assign(MAT[GLAS].teken, { transparent: true, opacity: 0.32, depthWrite: false });
const ORANJE = soort("trekkeroranje", 0xffd7a6, { color: 0xd47a22, roughness: 0.25, metalness: 0, emissive: 0xff8a1a, emissiveIntensity: 0 });

// ---- hulpjes
const doos = (x, y, z, r, px, py, pz) => rondeDoos(x, y, z, r).translate(px, py, pz);
const cil = (r, h, seg = 24) => new THREE.CylinderGeometry(r, r, h, seg);           // langs y
const cilZ = (r, d, seg) => cil(r, d, seg).rotateX(Math.PI / 2);                     // langs z
const cilX = (r, d, seg) => cil(r, d, seg).rotateZ(Math.PI / 2);                     // langs x
function ring(ro, ri, d, gaten = [], seg = 64) { // een plaat met een gat in het midden (en eventueel meer gaten), dikte d langs z
  const s = new THREE.Shape(); s.absarc(0, 0, ro, 0, TAU, false);
  const h = new THREE.Path(); h.absarc(0, 0, ri, 0, TAU, true); s.holes.push(h);
  for (const [x, y, r] of gaten) { const p = new THREE.Path(); p.absarc(x, y, r, 0, TAU, true); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: seg }); g.translate(0, 0, -d / 2); return g;
}
function boog(ro, ri, a0, a1, d, b = 0.006) { // een stuk van een ring (spatbord), dikte d langs z
  const s = new THREE.Shape(); s.absarc(0, 0, ro, a0, a1, false); s.absarc(0, 0, ri, a1, a0, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 40 }); g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals(); return g;
}
function vlakVorm(punten, d, b = 0.01) { // een zijaanzicht (x, y) uitgetrokken langs z, met afgeronde randen
  const s = new THREE.Shape(); s.moveTo(...punten[0]); for (const p of punten.slice(1)) p.length === 4 ? s.quadraticCurveTo(...p) : s.lineTo(...p);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 12 }); g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals(); return g;
}
function tri(arr, a, b, c, binnen) { // een driehoek, naar buiten gericht (weg van het punt binnen)
  const n = b.clone().sub(a).cross(c.clone().sub(a)), m = a.clone().add(b).add(c).multiplyScalar(1 / 3);
  if (n.dot(m.sub(binnen)) < 0) arr.push(a, c, b); else arr.push(a, b, c);
}
function driehoeken(arr) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr.flatMap((p) => [p.x, p.y, p.z]), 3)); g.computeVertexNormals(); return g; }
function stang(a, b, r, seg = 12) { const d = b.clone().sub(a), l = d.length(); const g = cil(r, l, seg); g.translate(0, l / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; }

// ================= De banden: een karkas met schuine noppen (een V-profiel, zoals op het land) =================
// R = straal van het loopvlak zonder noppen, W = halve breedte, Rv = straal van de velg, n = noppen per kant
function band(R, W, Rv, n, nh, nb, hoek, deel) {
  const vlak = W * 0.66, val = 0.2 * (R - Rv);
  const rc = (z) => { const a = Math.abs(z); return a < vlak ? R : R - val * ((a - vlak) / (W - vlak)) ** 2; };
  const zij = (s) => [[Rv + 0.004, s * (W - 0.035)], [Rv + 0.03, s * (W - 0.012)], [Rv + 0.3 * (R - Rv), s * (W + 0.012)], [Rv + 0.62 * (R - Rv), s * (W + 0.018)], [Rv + 0.8 * (R - Rv), s * (W + 0.006)]];
  const prof = [...zij(-1)];
  for (let i = 0; i <= 32; i++) { const z = -W + (2 * W * i) / 32; prof.push([rc(z), z]); }
  prof.push(...zij(1).reverse());
  const ll = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 80); ll.rotateX(Math.PI / 2);
  const karkas = naarBuitenG(ll, V(0, 0, 0));
  // de noppen: elk een balkje dat over het loopvlak en de schouder buigt, schuin naar buiten
  const tris = [], P = (a, z, r) => { const th = a / R; return V(r * Math.sin(th), r * Math.cos(th), z); };
  const z0 = -0.035, z1 = W + 0.012, ta = Math.tan(hoek);
  for (let k = 0; k < n; k++) for (const s of [1, -1]) {
    const a0 = ((k + (s > 0 ? 0 : 0.5)) / n) * TAU * R, st = 8, ringen = [], mid = [];
    for (let i = 0; i <= st; i++) {
      const t = i / st, zz = z0 + (z1 - z0) * t, a = a0 + (zz - z0) * ta * (1 - 0.18 * t);
      const da = ta * (1 - 0.36 * t), l = Math.hypot(1, da), pa = 1 / l, pz = -da / l; // loodrecht op de nop
      const rb = rc(zz) - 0.015, rt = rc(zz) + nh * (1 - 0.15 * t * t), b = nb / 2, bt = b * 0.72;
      const q = (u, r) => P(a + pa * u, s * (zz + pz * u), r);
      ringen.push([q(-b, rb), q(b, rb), q(bt, rt), q(-bt, rt)]); mid.push(P(a, s * zz, (rb + rt) / 2));
    }
    for (let i = 0; i < st; i++) {
      const c = mid[i].clone().add(mid[i + 1]).multiplyScalar(0.5);
      for (let j = 0; j < 4; j++) { const A = ringen[i][j], B = ringen[i][(j + 1) % 4], C = ringen[i + 1][(j + 1) % 4], D = ringen[i + 1][j]; tri(tris, A, B, C, c); tri(tris, A, C, D, c); }
    }
    for (const [i, j] of [[0, 1], [st, st - 1]]) { const r4 = ringen[i]; tri(tris, r4[0], r4[1], r4[2], mid[j]); tri(tris, r4[0], r4[2], r4[3], mid[j]); }
  }
  const g = new THREE.Group();
  const km = mesh(karkas, "rubber", deel), nm = mesh(driehoeken(tris), "rubber", deel);
  g.add(km, nm); G.nokken.push(nm); return g;
}
// de velg: een velgbed met randen, een schijf met gaten, een naaf met moeren. Buitenkant = +z.
function velg(Rv, W, deel, naafLang) {
  const g = new THREE.Group(), bw = W - 0.035;
  const bed = [ring(Rv, Rv - 0.014, 2 * bw, [], 64), ring(Rv + 0.032, Rv - 0.01, 0.022, [], 64).translate(0, 0, bw), ring(Rv + 0.032, Rv - 0.01, 0.022, [], 64).translate(0, 0, -bw),
    ring(Rv - 0.008, Rv - 0.05, 0.04, [], 64).translate(0, 0, 0.03)]; // de rand waar de schijf aan vastzit
  const gaten = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU + 0.2, r = Rv * 0.62; return [Math.cos(a) * r, Math.sin(a) * r, Rv * 0.12]; });
  const schijf = ring(Rv - 0.03, Rv * 0.26, 0.022, gaten, 40).translate(0, 0, 0.03);
  const naaf = [cilZ(Rv * 0.31, 0.04, 40).translate(0, 0, 0.05), cilZ(Rv * 0.19, naafLang, 32).translate(0, 0, 0.05 + naafLang / 2), cilZ(Rv * 0.13, 0.03, 24).translate(0, 0, 0.05 + naafLang + 0.012)];
  const moeren = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * TAU; return cilZ(0.017, 0.035, 6).translate(Math.cos(a) * Rv * 0.25, Math.sin(a) * Rv * 0.25, 0.085); });
  g.add(mesh(samen(bed), VELG, deel), mesh(schijf, VELG, deel), mesh(samen(naaf), VELG, deel), mesh(samen(moeren), "metaal", deel));
  return g;
}
// een heel wiel: band + velg; de velg kijkt naar buiten (z > 0 rechts, z < 0 links)
function wiel(R, W, Rv, n, nh, nb, hoek, deel, kant, naafLang) {
  const w = new THREE.Group(), v = velg(Rv, W, deel, naafLang);
  if (kant < 0) v.rotation.x = Math.PI;
  w.add(band(R, W, Rv, n, nh, nb, hoek, deel), v); return w;
}

// maten
const XA = -1.1, YA = 0.905, ZA = 0.95;   // achteras: plek, hoogte, halve spoorbreedte
const XV = 1.5, YV = 0.65, ZV = 0.92, ZK = 0.72; // vooras: plek, hoogte, spoor, fusee (draaipunt van het sturen)

// ---- achterwielen (650/65 R38-achtig: 1,82 m hoog)
for (const k of [1, -1]) {
  const w = wiel(0.86, 0.31, 0.49, 23, 0.048, 0.072, 0.72, "achterwielen", k, 0.12);
  op(w, XA, YA, k * ZA); root.add(w); G.achter.push(w); if (k > 0) G.achterR = w;
}
// een onzichtbaar punt op het loopvlak, voor het naamlijntje "noppen"
G.nopAnker = op(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02)), XA + 0.89 * Math.sin(0.75), YA + 0.89 * Math.cos(0.75), ZA + 0.18); G.nopAnker.visible = false; root.add(G.nopAnker);
// ---- voorwielen, in een stuurgroep die om de fusee draait, met een meedraaiend spatbord
for (const k of [1, -1]) {
  const s = new THREE.Group(); s.position.set(XV, YV, k * ZK);
  const w = wiel(0.605, 0.245, 0.36, 20, 0.04, 0.056, 0.72, "voorwielen", k, 0.09); w.position.z = k * (ZV - ZK);
  const fusee = mesh(samen([cil(0.065, 0.3, 24), cilZ(0.075, 0.12, 24).translate(0, 0, k * 0.07)]), ONDER, "voorwielen");
  const bord = mesh(boog(0.705, 0.69, 0.5, 2.45, 0.44, 0.005).translate(0, 0, k * (ZV - ZK)), LAK, "spatborden");
  const steun = mesh(samen([stang(V(0.0, 0.12, k * 0.02), V(-0.18, 0.62, k * (ZV - ZK - 0.17)), 0.02), stang(V(0.0, 0.12, k * 0.02), V(0.2, 0.62, k * (ZV - ZK - 0.17)), 0.02)]), ONDER, "spatborden");
  s.add(w, fusee, bord, steun); root.add(s); G.voor.push(w); G.stuur.push(s); if (k > 0) { G.voorR = w; G.voorbordR = bord; }
}

// ================= Chassis: versnellingsbak, achteras, voorframe, vooras, tank =================
{
  const c = [];
  c.push(doos(1.95, 0.76, 0.76, 0.06, -0.6, 0.86, 0));                 // versnellingsbak onder de cabine
  c.push(cilZ(0.16, 1.26, 40).translate(XA, YA, 0));                     // achteras
  for (const k of [1, -1]) {
    const tr = new THREE.CylinderGeometry(0.13, 0.22, 0.2, 40).rotateX(Math.PI / 2 * k).translate(XA, YA, k * 0.72); c.push(tr); // eindoverbrenging
    c.push(cilZ(0.11, 0.16, 32).translate(XA, YA, k * 0.86));
  }
  c.push(doos(0.9, 0.42, 0.56, 0.04, 2.2, 0.77, 0));                     // voorframe onder de radiator
  c.push(doos(0.2, 0.16, 1.32, 0.03, XV, 0.56, 0), doos(0.36, 0.12, 0.2, 0.03, XV, 0.68, 0)); // vooras en scharnier
  const chassis = mesh(samen(c), ONDER, "chassis");
  // brandstoftank links, met dop
  const tank = mesh(samen([doos(0.6, 0.42, 0.3, 0.06, 0.5, 0.82, -0.47), cil(0.045, 0.05, 20).translate(0.62, 1.05, -0.47)]), LAK, "chassis");
  const rubbers = mesh(samen([[-1.42, 0.5], [-1.42, -0.5], [-0.25, 0.5], [-0.25, -0.5]].map(([x, z]) => cil(0.05, 0.12, 16).translate(x, 1.29, z))), "rubber", "chassis");
  root.add(chassis, tank, rubbers); G.chassis = chassis; G.tank = tank;
}

// ================= De motor (onder de motorkap): blok, kop, turbo, luchtfilter, radiator, ventilator =================
{
  const m = new THREE.Group();
  const blok = mesh(samen([doos(1.7, 0.8, 0.58, 0.04, 1.05, 1.02, 0), doos(1.05, 0.12, 0.46, 0.03, 0.85, 0.58, 0), doos(1.5, 0.12, 0.52, 0.02, 1.08, 1.48, 0)]), ONDER, "motor");
  const ribben = []; for (let i = 0; i < 4; i++) ribben.push(doos(0.2, 0.02, 0.54, 0.008, 0.52 + i * 0.38, 1.0, 0));
  const kop = mesh(samen([doos(1.36, 0.09, 0.4, 0.03, 1.08, 1.585, 0), ...Array.from({ length: 4 }, (_, i) => cil(0.03, 0.03, 12).translate(0.62 + i * 0.31, 1.64, 0))]), "metaal", "motor");
  const inlaat = []; for (let i = 0; i < 4; i++) inlaat.push(stang(V(0.62 + i * 0.31, 1.47, 0.27), V(0.62 + i * 0.31, 1.36, 0.36), 0.03));
  inlaat.push(cilX(0.04, 1.2, 16).translate(1.08, 1.36, 0.37));
  const turbo = [new THREE.TorusGeometry(0.075, 0.04, 14, 28).translate(0.4, 1.42, 0.37), cilZ(0.05, 0.12, 20).translate(0.4, 1.42, 0.37)];
  const filter = [cilX(0.095, 0.6, 32).translate(1.5, 1.54, -0.22), cilX(0.1, 0.03, 32).translate(1.2, 1.54, -0.22), cilX(0.1, 0.03, 32).translate(1.8, 1.54, -0.22), stang(V(1.2, 1.54, -0.22), V(0.9, 1.47, -0.22), 0.045)];
  const radiator = doos(0.12, 0.56, 0.68, 0.02, 2.3, 1.28, 0);
  const lamellen = []; for (let i = 0; i < 14; i++) lamellen.push(doos(0.14, 0.008, 0.66, 0.002, 2.3, 1.03 + i * 0.037, 0));
  const ventilator = new THREE.Group(); ventilator.position.set(2.17, 1.26, 0);
  const bladen = []; for (let i = 0; i < 7; i++) { const b = new THREE.BoxGeometry(0.012, 0.21, 0.07); b.translate(0, 0.14, 0); b.rotateY(0.45); b.rotateX((i / 7) * TAU); bladen.push(b); }
  ventilator.add(mesh(samen([...bladen, cilX(0.05, 0.06, 20)]), "zwartmetaal", "motor"));
  const filterM = mesh(samen(filter), "zwartmetaal", "motor"), radiatorM = mesh(radiator, "zwartmetaal", "motor");
  m.add(blok, mesh(samen(ribben), ONDER, "motor"), kop, mesh(samen([...inlaat, ...turbo]), "metaal", "motor"), filterM, radiatorM, mesh(samen(lamellen), "metaal", "motor"), ventilator);
  root.add(m); Object.assign(G, { motor: m, blok, ventilator, filter: filterM, radiator: radiatorM, motorBinnen: m.children.slice(2) });
}

// ================= De motorkap met grille, koplampen en zijroosters =================
{
  const kap = new THREE.Group();
  const b = 0.06;
  const vorm = mesh(vlakVorm([[-0.05, 1.02], [2.4, 1.02], [2.47, 1.06], [2.51, 1.2], [2.53, 1.45], [2.53, 1.6, 2.42, 1.62], [0.0, 1.74], [-0.05, 1.74], [-0.05, 1.02]], 0.92, b), LAK, "motorkap");
  vorm.userData.romp = true;
  // grille voorop: een donker paneel met liggende lamellen
  const gr = [doos(0.03, 0.4, 0.6, 0.012, 2.585, 1.27, 0)];
  const lam = []; for (let i = 0; i < 8; i++) lam.push(doos(0.025, 0.018, 0.56, 0.006, 2.6, 1.1 + i * 0.047, 0));
  const grille = mesh(samen(gr), "zwartmetaal", "motorkap"), lamellen = mesh(samen(lam), LAK, "motorkap");
  // zijroosters: schuine sleuven op beide zijkanten
  const sl = [];
  for (const k of [1, -1]) for (let i = 0; i < 6; i++) { const s = doos(0.42, 0.024, 0.012, 0.006, 0, 0, 0); s.rotateZ(0.09); s.translate(2.0, 1.2 + i * 0.06, k * 0.462); sl.push(s); }
  for (const k of [1, -1]) sl.push(doos(2.3, 0.012, 0.008, 0.003, 1.2, 1.13, k * 0.462)); // de naad tussen kap en zijpaneel
  const roosters = mesh(samen(sl), "zwartmetaal", "motorkap"); roosters.userData.romp = true;
  // de kap loopt naar voren iets smaller toe
  for (const g of [vorm.geometry, roosters.geometry]) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * (1 - 0.1 * Math.min(1, Math.max(0, (p.getX(i) - 0.3) / 2.3)))); g.computeVertexNormals(); }
  kap.add(vorm, grille, lamellen, roosters); root.add(kap); G.kap = kap; G.kapVorm = vorm; G.grille = grille;
  // koplampen in de neus (deel lichten)
  const kl = [];
  for (const k of [1, -1]) kl.push(doos(0.05, 0.1, 0.2, 0.02, 2.565, 1.53, k * 0.25));
  const huis = mesh(samen([1, -1].map((k) => doos(0.04, 0.13, 0.24, 0.02, 2.54, 1.53, k * 0.25))), "zwartmetaal", "lichten");
  const koplampen = mesh(samen(kl), "lamp", "lichten"); kap.add(huis, koplampen); G.lampen.kop = koplampen;
}

// ================= De voorgewichten op een drager voor de radiator =================
{
  const gw = new THREE.Group();
  const drager = mesh(samen([doos(0.14, 0.36, 0.64, 0.02, 2.71, 0.79, 0), doos(0.34, 0.05, 0.22, 0.01, 2.85, 0.6, 0)]), ONDER, "gewichten");
  // elk gewicht: een plaat met een schuine voorkant en een handgreep-gat
  const s = new THREE.Shape();
  s.moveTo(2.77, 0.5); s.lineTo(3.02, 0.5); s.quadraticCurveTo(3.06, 0.5, 3.06, 0.55); s.lineTo(3.06, 0.86); s.lineTo(2.98, 1.04); s.quadraticCurveTo(2.96, 1.07, 2.92, 1.07); s.lineTo(2.81, 1.07); s.quadraticCurveTo(2.77, 1.07, 2.77, 1.03); s.lineTo(2.77, 0.5);
  const gat = new THREE.Path(); gat.moveTo(2.85, 0.93); gat.lineTo(2.94, 0.93); gat.quadraticCurveTo(2.97, 0.93, 2.97, 0.96); gat.lineTo(2.95, 0.99); gat.lineTo(2.85, 0.99); gat.quadraticCurveTo(2.83, 0.99, 2.83, 0.96); gat.quadraticCurveTo(2.83, 0.93, 2.85, 0.93); s.holes.push(gat);
  const platen = [];
  for (let i = 0; i < 8; i++) { const g = new THREE.ExtrudeGeometry(s, { depth: 0.074, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 8 }); g.translate(0, 0, -0.4 + i * 0.1); platen.push(g); }
  const stang_ = mesh(cilZ(0.02, 0.86, 16).translate(2.84, 0.76, 0), "metaal", "gewichten");
  gw.add(drager, mesh(samen(platen), GEWICHT, "gewichten"), stang_); root.add(gw); G.gewichten = gw;
}

// ================= De uitlaat: rechts voor de cabine omhoog, met een klepje bovenop =================
{
  const u = new THREE.Group();
  const p = [cil(0.045, 0.2, 20).translate(0.15, 1.82, 0.32), cil(0.075, 0.62, 28).translate(0.15, 2.2, 0.32), cil(0.08, 0.025, 28).translate(0.15, 1.9, 0.32), cil(0.08, 0.025, 28).translate(0.15, 2.5, 0.32)];
  // bovenstuk schuin afgesneden: een buis waarvan de bovenrand schuin loopt
  const top = cil(0.045, 0.55, 20); { const pos = top.attributes.position; for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + pos.getX(i) * 0.5); top.computeVertexNormals(); }
  p.push(top.translate(0.15, 2.78, 0.32));
  const schild = []; for (let i = 0; i < 5; i++) schild.push(new THREE.TorusGeometry(0.083, 0.006, 6, 28).rotateX(Math.PI / 2).translate(0.15, 2.0 + i * 0.1, 0.32));
  const buis_ = mesh(samen(p), "zwartmetaal", "uitlaat"), ringen = mesh(samen(schild), "metaal", "uitlaat");
  const klep = new THREE.Group(); klep.position.set(0.15 - 0.045, 3.06 - 0.022, 0.32);
  klep.add(mesh(cil(0.05, 0.006, 20).translate(0.045, 0, 0).rotateZ(-0.46), "metaal", "uitlaat"));
  u.add(buis_, ringen, klep); root.add(u); G.uitlaat = u; G.uitlaatKlep = klep;
}

// ================= De cabine: vloer, stijlen, ruiten, dak, stoel, stuur, spiegels, treeplank =================
const X1 = -0.05, X0 = -1.5, ZC = 0.74, YL = 1.96, YT = 2.86;
{
  const c = new THREE.Group();
  const XD = -0.29; // achterkant van de deur: daarachter het spatbord
  const onder = [doos(X1 - X0, 0.04, 1.16, 0.012, (X0 + X1) / 2, 1.36, 0), doos(X1 - XD, 0.04, 2 * ZC, 0.012, (XD + X1) / 2, 1.36, 0),
    doos(0.03, 0.47, 2 * ZC, 0.01, X1 - 0.01, 1.6, 0), doos(0.03, YL - 1.36, 1.16, 0.01, X0, (YL + 1.36) / 2, 0)];
  for (const k of [1, -1]) onder.push(doos(XD - X0, YL - 1.36, 0.03, 0.01, (X0 + XD) / 2, (YL + 1.36) / 2, k * 0.58), doos(XD - X0 + 0.04, 0.04, 0.2, 0.012, (X0 + XD) / 2, YL, k * 0.66));
  const lijf = mesh(samen(onder), LAK, "cabine");
  // stijlen: vier hoeken, een deurstijl, en de lijsten boven en onder de ruiten
  const st = [];
  for (const k of [1, -1]) {
    st.push(doos(0.07, YT - 1.36, 0.07, 0.02, X1, (YT + 1.36) / 2, k * (ZC - 0.01)), doos(0.07, YT - YL, 0.07, 0.02, X0, (YT + YL) / 2, k * (ZC - 0.01)));
    st.push(doos(0.035, YT - YL, 0.045, 0.012, -0.86, (YT + YL) / 2, k * (ZC + 0.005)));        // deurstijl
    st.push(doos(0.025, 0.12, 0.03, 0.008, -0.18, 2.3, k * (ZC + 0.03)));                      // handgreep
  }
  st.push(doos(0.06, 0.05, 2 * ZC, 0.015, X1, YT - 0.02, 0), doos(0.06, 0.05, 2 * ZC, 0.015, X0, YT - 0.02, 0), doos(0.05, 0.05, 2 * ZC, 0.015, X1 + 0.01, 1.8, 0));
  const stijlen = mesh(samen(st), "zwartmetaal", "cabine");
  // ruiten (doorzichtig)
  const ruit = [doos(0.012, YT - 1.83, 2 * ZC - 0.07, 0.004, X1 + 0.005, (YT + 1.83) / 2, 0), doos(0.012, YT - YL - 0.04, 2 * ZC - 0.07, 0.004, X0 - 0.005, (YT + YL) / 2, 0)];
  for (const k of [1, -1]) ruit.push(doos(X1 - X0 - 0.06, YT - YL - 0.04, 0.012, 0.004, (X0 + X1) / 2, (YT + YL) / 2, k * ZC), doos(X1 - XD - 0.04, YL - 1.4, 0.012, 0.004, (XD + X1) / 2, (YL + 1.4) / 2, k * ZC));
  const ruiten = mesh(samen(ruit), GLAS, "cabine", { schaduw: false });
  ruiten.userData.romp = true; ruiten.userData.geenLijn = true;
  // dak met zonneklep
  const dak = mesh(samen([doos(1.66, 0.13, 1.66, 0.05, (X0 + X1) / 2, YT + 0.08, 0), doos(1.4, 0.05, 1.4, 0.03, (X0 + X1) / 2 - 0.02, YT + 0.165, 0)]), LAK, "cabine");
  const klep = mesh(doos(0.16, 0.015, 1.3, 0.006, X1 + 0.1, YT - 0.04, 0), "zwartmetaal", "cabine");
  // binnen: vloer, stoel, armleuning met hendel, stuurkolom met stuur, dashboard, pedalen
  const bi = [doos(X1 - X0 - 0.08, 0.02, 1.12, 0.008, (X0 + X1) / 2, 1.39, 0), doos(0.5, 0.3, 1.1, 0.03, X0 + 0.3, 1.54, 0)]; // vloermat en de kast achterin
  const stoelvorm = doos(0.12, 0.6, 0.48, 0.05, 0, 0.3, 0); stoelvorm.rotateZ(0.16); stoelvorm.translate(-1.3, 1.92, 0);
  const stoel = [doos(0.5, 0.11, 0.5, 0.045, -1.02, 1.86, 0), stoelvorm, cil(0.06, 0.32, 16).translate(-1.04, 1.65, 0), doos(0.3, 0.06, 0.42, 0.02, -1.04, 1.45, 0), doos(0.06, 0.16, 0.36, 0.02, -1.36, 2.32, 0)];
  const arm = [doos(0.4, 0.06, 0.12, 0.025, -0.98, 2.0, 0.34), doos(0.05, 0.12, 0.05, 0.01, -1.12, 1.93, 0.34), cil(0.012, 0.12, 8).translate(-0.86, 2.08, 0.34), new THREE.SphereGeometry(0.025, 12, 8).translate(-0.86, 2.15, 0.34)];
  const binnen = mesh(samen(bi), "vloer", "cabine"), stoelM = mesh(samen(stoel), "stoel", "cabine"), armM = mesh(samen(arm), "zwartmetaal", "cabine");
  const kolom = new THREE.Group(); kolom.position.set(-0.14, 1.4, 0); kolom.rotation.z = 0.42;   // de stuurkolom helt naar de bestuurder
  const dash = mesh(samen([cil(0.05, 0.8, 16).translate(0, 0.4, 0), doos(0.16, 0.14, 0.32, 0.03, 0, 0.7, 0)]), "zwartmetaal", "cabine");
  const scherm = mesh(doos(0.02, 0.11, 0.26, 0.01, -0.081, 0.71, 0), "scherm", "cabine");
  const stuurwiel = new THREE.Group(); stuurwiel.position.set(0, 0.84, 0);
  stuurwiel.add(mesh(samen([new THREE.TorusGeometry(0.19, 0.016, 10, 40).rotateX(Math.PI / 2), ...[0, 1, 2].map((i) => stang(V(0, 0, 0), V(Math.cos((i / 3) * TAU + 1.57) * 0.18, 0, Math.sin((i / 3) * TAU + 1.57) * 0.18), 0.012, 8)), cil(0.04, 0.04, 16)]), "greep", "cabine"));
  kolom.add(dash, scherm, stuurwiel);
  const pedalen = mesh(samen([-0.16, 0.12, 0.22].map((z) => doos(0.03, 0.12, 0.08, 0.01, -0.22, 1.5, z))), "zwartmetaal", "cabine");
  // spiegels op armen aan de voorstijlen
  const sp = [], spg = [];
  for (const k of [1, -1]) { sp.push(stang(V(X1, 2.72, k * ZC), V(X1 + 0.02, 2.7, k * 1.02), 0.014), stang(V(X1, 2.4, k * ZC), V(X1 + 0.02, 2.5, k * 1.02), 0.012)); spg.push(doos(0.05, 0.3, 0.2, 0.02, X1 + 0.03, 2.58, k * 1.08)); }
  const spiegels = mesh(samen([...sp, ...spg]), "zwartmetaal", "cabine");
  const spiegelAnker = op(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02)), X1 + 0.03, 2.58, -1.08); spiegelAnker.visible = false;
  c.add(lijf, stijlen, ruiten, dak, klep, binnen, stoelM, armM, kolom, pedalen, spiegels, spiegelAnker); G.spiegelAnker = spiegelAnker;
  // werklampen op het dak (deel lichten): vier voor, twee achter, en een zwaailicht
  const lh = [], ll = [];
  for (const z of [-0.62, -0.25, 0.25, 0.62]) { lh.push(doos(0.08, 0.11, 0.17, 0.02, X1 + 0.13, YT + 0.08, z)); ll.push(doos(0.02, 0.085, 0.14, 0.008, X1 + 0.175, YT + 0.08, z)); }
  for (const z of [-0.55, 0.55]) { lh.push(doos(0.08, 0.11, 0.17, 0.02, X0 - 0.13, YT + 0.08, z)); ll.push(doos(0.02, 0.085, 0.14, 0.008, X0 - 0.175, YT + 0.08, z)); }
  const werkhuis = mesh(samen(lh), "zwartmetaal", "lichten"), werklampen = mesh(samen(ll), "lamp", "lichten");
  const zwaai = new THREE.Group(); zwaai.position.set(-1.12, YT + 0.19, -0.5);
  const kap_ = mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.13, 24).translate(0, 0.085, 0), ORANJE, "lichten");
  const voet = mesh(cil(0.075, 0.03, 24).translate(0, 0.01, 0), "zwartmetaal", "lichten");
  const spiegeltje = new THREE.Group(); spiegeltje.position.y = 0.16; spiegeltje.add(mesh(new THREE.SphereGeometry(0.03, 14, 8, 0, TAU, 0, Math.PI / 2), "zwartmetaal", "lichten"));
  zwaai.add(voet, kap_, spiegeltje);
  const lampAnker = op(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02)), X1 + 0.18, YT + 0.08, 0.62); lampAnker.visible = false;
  c.add(werkhuis, werklampen, zwaai, lampAnker); G.lampAnker = lampAnker;
  root.add(c);
  Object.assign(G, { cabine: c, ruiten, spiegels, stoel: stoelM, stuurwiel, dak, zwaai, zwaaiTop: spiegeltje, werklampen });
  // treeplank: drie treden voor het achterwiel, aan beide kanten
  const tr = [];
  for (const k of [1, -1]) {
    tr.push(doos(0.03, 0.85, 0.03, 0.01, -0.1, 0.92, k * 0.78), doos(0.03, 0.85, 0.03, 0.01, 0.14, 0.92, k * 0.78));
    for (const y of [0.55, 0.85, 1.14]) tr.push(doos(0.28, 0.025, 0.22, 0.008, 0.02, y, k * 0.7));
    tr.push(doos(0.28, 0.3, 0.02, 0.008, 0.02, 1.38, k * 0.6));
  }
  const treden = mesh(samen(tr), "zwartmetaal", "cabine"); root.add(treden); G.treden = treden;
}

// ================= Spatborden achter, met achterlichten =================
{
  for (const k of [1, -1]) {
    const s = new THREE.Group(); s.position.set(XA, YA, k * 0.95);
    const bord = mesh(samen([boog(1.005, 0.985, 0.48, 3.42, 0.7), boog(1.005, 0.93, 0.48, 3.42, 0.02).translate(0, 0, k * 0.34)]), LAK, "spatborden");
    const al = mesh(doos(0.05, 0.08, 0.14, 0.015, -0.98, -0.2, k * 0.22), "achterlicht", "lichten");
    const alh = mesh(doos(0.06, 0.1, 0.17, 0.02, -0.955, -0.2, k * 0.22), "zwartmetaal", "lichten");
    s.add(bord, al, alh); root.add(s); G[k > 0 ? "bordR" : "bordL"] = s; (G.achterlichten ||= []).push(al);
  }
}

// ================= Hefinrichting (drie punten) en aftakas, achterop =================
const P0 = V(-1.45, 0.5, 0), LO = 0.95, Q0 = V(-1.6, 1.2, 0), LA = 0.42;
{
  const h = new THREE.Group();
  const huis = mesh(samen([doos(0.26, 0.24, 0.84, 0.03, -1.6, 1.2, 0), doos(0.16, 0.3, 0.5, 0.03, -1.58, 0.72, 0), doos(0.14, 0.16, 0.7, 0.03, -1.45, 0.5, 0)]), ONDER, "hef");
  h.add(huis);
  G.onder = []; G.hefarm = []; G.stangen = [];
  for (const k of [1, -1]) {
    // onderarm: van het draaipunt naar achter, iets naar buiten, met een kogel-oog aan het eind
    const o = new THREE.Group(); o.position.set(P0.x, P0.y, k * 0.28);
    const eind = V(-LO, 0, k * 0.15);
    o.add(mesh(samen([stang(V(0, 0, 0), eind.clone().multiplyScalar(0.94), 0.035, 12), new THREE.TorusGeometry(0.045, 0.018, 8, 20).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(eind.x, 0, eind.z), cilZ(0.05, 0.08, 16)]), ONDER, "hef"));
    h.add(o); G.onder.push(o);
    // hefarm: van de as boven naar achter
    const a = new THREE.Group(); a.position.set(Q0.x, Q0.y, k * 0.36);
    a.add(mesh(samen([doos(LA + 0.06, 0.07, 0.05, 0.02, -LA / 2, 0, 0), cilZ(0.05, 0.08, 16)]), LAK, "hef"));
    h.add(a); G.hefarm.push(a);
    // hefstang tussen hefarm en onderarm: lengte 1, wordt elke keer neergezet
    const r = mesh(samen([cil(0.022, 1, 10).translate(0, 0.5, 0), cil(0.032, 0.18, 10).translate(0, 0.5, 0)]), "metaal", "hef");
    h.add(r); G.stangen.push({ m: r, k });
  }
  // topstang: in het midden, met een draaibare huls
  const top = new THREE.Group(); top.position.set(-1.72, 1.02, 0);
  top.add(mesh(samen([stang(V(0, 0, 0), V(-0.62, 0.06, 0), 0.025, 10), stang(V(-0.18, 0.017, 0), V(-0.44, 0.043, 0), 0.04, 10), new THREE.TorusGeometry(0.04, 0.015, 8, 18).translate(-0.66, 0.064, 0)]), "metaal", "hef"));
  h.add(top); G.topstang = top;
  // aftakas: een uitgetande as met een beschermkap erboven
  const as = new THREE.Group(); as.position.set(-1.66, 0.72, 0);
  const s = new THREE.Shape(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r = i % 2 ? 0.0155 : 0.0185; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const spie = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false }); spie.rotateY(-Math.PI / 2);
  as.add(mesh(samen([spie, cilX(0.03, 0.04, 20).translate(-0.01, 0, 0)]), "metaal", "hef"));
  const kapje = mesh(boog(0.1, 0.09, 0, Math.PI, 0.18, 0.003).rotateY(Math.PI / 2).translate(-1.75, 0.73, 0), ONDER, "hef");
  // trekhaak onder
  const haak = mesh(samen([doos(0.4, 0.06, 0.16, 0.015, -1.62, 0.4, 0), cil(0.02, 0.12, 12).translate(-1.76, 0.42, 0)]), ONDER, "hef");
  h.add(as, kapje, haak); root.add(h);
  Object.assign(G, { hef: h, aftakas: as, aftakasKap: kapje });
}
function zetHef(u) { // u = 0 (omlaag) .. 1 (omhoog)
  const b = -0.08 + 0.58 * u, gm = -0.25 + 0.8 * u;
  for (const o of G.onder) o.rotation.z = -b;
  for (const a of G.hefarm) a.rotation.z = -gm;
  G.topstang.rotation.z = -0.12 * u + 0.04;
  for (const { m, k } of G.stangen) {
    const A = V(Q0.x - LA * 0.92 * Math.cos(gm), Q0.y + LA * 0.92 * Math.sin(gm), k * 0.36);
    const f = 0.6, B = V(P0.x - f * LO * Math.cos(b), P0.y + f * LO * Math.sin(b), k * (0.28 + 0.15 * f));
    const d = A.clone().sub(B), l = d.length();
    m.position.copy(B); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.scale.set(1, l, 1);
  }
}
zetHef(0.15);


// ================= Teksten (maten zijn die van de tekening) =================
const SECTIES = [
  { sleutel: "trekker", naam: "De trekker", titel: "De trekker", tekst: "Een trekker trekt en duwt machines over het land: een ploeg, een maaier of een kar. Hij is sterk, niet snel. Tik op de lampen.", cam: [0.92, 0.3, 9.4, [0.3, 1.3, 0], 32], focus: null,
    specs: [["Lengte", "5,1 m in de tekening"], ["Breedte", "2,5 m in de tekening"], ["Hoogte", "3,3 m tot het zwaailicht"], ["Wielen", "4: 2 grote, 2 kleine"], ["Lampen", "tik", "lichten"]],
    namen: [["cabine", "CABINE", 83, -26], ["kap", "MOTORKAP", 67, -75], ["achterwiel", "ACHTERWIEL", -91, 46], ["gewichten", "GEWICHTEN", -71, 53], ["uitlaat", "UITLAAT", 118, 18]] },
  { sleutel: "motor", naam: "De motor", titel: "De motor", tekst: "Onder de motorkap zit een dieselmotor. Die maakt veel kracht, ook als de trekker langzaam rijdt. Voorin koelt de radiator de motor.", cam: [0.62, 0.3, 7.4, [1.2, 1.5, 0], 30], focus: ["motor", "motorkap", "uitlaat"], doorzicht: true, motor: true,
    specs: [["Motor", "diesel, 4 cilinders in de tekening"], ["Radiator", "voorin, achter de grille"], ["Ventilator", "7 bladen in de tekening"], ["Uitlaat", "rechts, omhoog"]],
    namen: [["motor", "MOTORBLOK", 45, -169], ["radiator", "RADIATOR", 100, 0], ["uitlaat", "UITLAAT", 120, 0], ["filter", "LUCHTFILTER", 75, -38]] },
  { sleutel: "banden", naam: "De banden", titel: "De banden", tekst: "Grote banden achter, kleine voor. De schuine noppen grijpen in de grond, zodat de trekker niet wegglijdt in de modder.", cam: [0.4, 0.12, 8.8, [0.2, 0.85, 0.5], 32], focus: ["achterwielen", "voorwielen"], rollen: true,
    specs: [["Achterwiel", "1,82 m hoog in de tekening"], ["Voorwiel", "1,29 m hoog in de tekening"], ["Noppen", "46 achter, 40 voor"], ["Profiel", "schuin, in een V"]],
    namen: [["achterwiel", "ACHTERWIEL", -120, 90], ["voorwiel", "VOORWIEL", -99, 74], ["nop", "NOPPEN", -141, -71]] },
  { sleutel: "cabine", naam: "De cabine", titel: "De cabine", tekst: "Hier zit de bestuurder, hoog boven het land, met ramen rondom. Binnen zijn een stoel, een stuur en een hendel voor de hefinrichting.", cam: [2.3, 0.2, 6.4, [-0.7, 2.1, 0], 32], focus: ["cabine"], stuurtje: true,
    specs: [["Ramen", "voor, achter en opzij"], ["Stoel", "met een armleuning"], ["Instappen", "3 treden"], ["Spiegels", "2"]],
    namen: [["stoel", "STOEL", 108, -16], ["stuurwiel", "STUUR", -85, -64], ["spiegel", "SPIEGEL", 74, -23], ["dak", "DAK", -27, -49]] },
  { sleutel: "hefinrichting", naam: "Hef en aftakas", titel: "Hefinrichting en aftakas", tekst: "Achterop hangt een machine aan drie punten. De hefarmen tillen hem op. De aftakas draait rond en laat de machine werken. Blijf er ver vandaan als hij draait.", cam: [-0.75, 0.5, 5.8, [-1.95, 0.75, 0], 32], focus: ["hef"], hef: true,
    specs: [["Punten", "3: 2 onderarmen en een topstang"], ["Hefarmen", "omhoog en omlaag"], ["Aftakas", "draait, achterop"], ["Trekhaak", "onder de aftakas"]],
    namen: [["onderarm", "ONDERARM", -83, 26], ["hefarm", "HEFARM", -189, 212], ["topstang", "TOPSTANG", -200, 100], ["aftakas", "AFTAKAS", 37, 140]] },
  { sleutel: "voorkant", naam: "De voorkant", titel: "De voorkant", tekst: "Voorop hangen zware gewichten. Die houden de voorwielen op de grond als er achter een zware machine hangt. De voorwielen sturen.", cam: [1.0, 0.22, 5.8, [1.85, 0.85, 0.35], 32], focus: ["gewichten", "voorwielen"], sturen: true,
    specs: [["Gewichten", "8 platen in de tekening"], ["Sturen", "met de voorwielen"], ["Spatborden", "draaien mee"]],
    namen: [["gewichten", "GEWICHTEN", 57, 104], ["voorwiel", "VOORWIEL", -150, 110]] },
  { sleutel: "lampen", naam: "De lampen", titel: "De lampen", tekst: "Lampen rondom, zodat je ook in het donker op het land kunt werken. Het oranje zwaailicht zegt: let op, hier rijdt een langzaam voertuig.", cam: [0.78, 0.4, 10.2, [0.25, 1.55, 0], 32], focus: ["lichten"], lichten: true,
    specs: [["Koplampen", "2, in de neus"], ["Werklampen", "6, op het dak"], ["Achterlichten", "2, rood"], ["Zwaailicht", "oranje"], ["Lampen", "tik", "lichten"]],
    namen: [["zwaai", "ZWAAILICHT", -28, -9], ["werklampen", "WERKLAMPEN", 46, -83], ["koplampen", "KOPLAMPEN", 50, 0], ["achterlicht", "ACHTERLICHT", -28, 31]] },
];
const KIND = [
  { naam: "de trekker", focus: ["motorkap", "chassis", "spatborden"], cam: [0.72, 0.26, 10.4, [0.35, 1.35, 0], 32] },
  { naam: "de motor", focus: ["motor", "motorkap", "uitlaat"], cam: [0.62, 0.3, 6.4, [1.25, 1.3, 0], 30], motor: true, geluid: "brom" },
  { naam: "het grote wiel", focus: ["achterwielen"], cam: [0.25, 0.12, 5.2, [-1.1, 0.95, 0.9], 32], rollen: true, geluid: "rol" },
  { naam: "het kleine wiel", focus: ["voorwielen"], cam: [0.85, 0.18, 5.4, [1.6, 0.75, 0.3], 32], sturen: true },
  { naam: "de cabine", focus: ["cabine"], cam: [2.3, 0.2, 6.8, [-0.7, 2.0, 0], 32] },
  { naam: "de hefarmen", focus: ["hef"], cam: [-0.75, 0.5, 5.4, [-1.95, 0.75, 0], 32], hef: true },
  { naam: "de gewichten", focus: ["gewichten"], cam: [1.1, 0.25, 4.4, [2.75, 0.8, 0], 32] },
  { naam: "de lampen", focus: ["lichten"], cam: [0.9, 0.42, 9.0, [0.3, 1.7, 0], 32], lichten: true },
];


function mini(aan) {
  const sx = (x) => (58 + (x - 0.35) * 13).toFixed(1), sy = (y) => (64 - y * 14).toFixed(1), r = (v) => (v * 13.5).toFixed(1);
  return `<path d="M${sx(-0.05)},${sy(1.0)}L${sx(2.47)},${sy(1.0)}L${sx(2.6)},${sy(1.2)}L${sx(2.6)},${sy(1.6)}Q${sx(2.55)},${sy(1.68)} ${sx(2.4)},${sy(1.68)}L${sx(-0.05)},${sy(1.8)}" class="${aan("motorkap") || aan("motor")}"/>` +
    `<path d="M${sx(-0.05)},${sy(1.4)}L${sx(-0.05)},${sy(3.0)}L${sx(-1.55)},${sy(3.0)}L${sx(-1.55)},${sy(1.96)}M${sx(-0.05)},${sy(1.96)}L${sx(-0.3)},${sy(1.96)}" class="${aan("cabine")}"/>` +
    `<path d="M${sx(-2.05)},${sy(0.6)}A${r(1.0)} ${r(1.0)} 0 0 1 ${sx(-0.2)},${sy(1.4)}" class="${aan("spatborden")}"/>` +
    `<circle cx="${sx(-1.1)}" cy="${sy(0.905)}" r="${r(0.9)}" class="${aan("achterwielen")}"/><circle cx="${sx(-1.1)}" cy="${sy(0.905)}" r="${r(0.42)}" class="${aan("achterwielen")}"/>` +
    `<circle cx="${sx(1.5)}" cy="${sy(0.65)}" r="${r(0.64)}" class="${aan("voorwielen")}"/><circle cx="${sx(1.5)}" cy="${sy(0.65)}" r="${r(0.3)}" class="${aan("voorwielen")}"/>` +
    `<line x1="${sx(0.15)}" y1="${sy(1.8)}" x2="${sx(0.15)}" y2="${sy(3.05)}" class="${aan("uitlaat")}"/>` +
    `<path d="M${sx(2.62)},${sy(0.55)}L${sx(3.05)},${sy(0.55)}L${sx(3.05)},${sy(1.05)}L${sx(2.62)},${sy(1.05)}Z" class="${aan("gewichten")}"/>` +
    `<path d="M${sx(-1.45)},${sy(0.5)}L${sx(-2.35)},${sy(0.5)}M${sx(-1.6)},${sy(1.2)}L${sx(-2.0)},${sy(1.1)}L${sx(-2.0)},${sy(0.5)}" class="${aan("hef")}"/>` +
    `<path d="M${sx(-1.2)},${sy(3.0)}L${sx(-1.2)},${sy(3.2)}M${sx(2.62)},${sy(1.53)}L${sx(2.7)},${sy(1.53)}" class="${aan("lichten")}"/>`;
}


let wielHoek = 0, stuurT = 0, hefT = 0, hefNu = 0.15, aftak = 0, fan = 0, lichtT = 0, stuurNu = 0;
function beweeg(dt, h, s) {
  let bezig = false;
  if (h.rollen) { wielHoek -= dt * 1.4; for (const w of G.achter) w.rotation.z = wielHoek; for (const w of G.voor) w.rotation.z = wielHoek * (0.908 / 0.645); bezig = true; }
  // sturen: de voorwielen en het stuur gaan heen en weer
  const sDoel = h.sturen ? Math.sin((stuurT += dt) * 1.1) * 0.3 : h.stuurtje ? Math.sin((stuurT += dt) * 0.9) * 0.12 : 0;
  stuurNu += (sDoel - stuurNu) * Math.min(1, dt * 4);
  if (h.sturen || h.stuurtje || Math.abs(stuurNu) > 0.002) { for (const g of G.stuur) g.rotation.y = stuurNu; G.stuurwiel.rotation.y = -stuurNu * 6; bezig = true; }
  // hefinrichting op en neer, aftakas draait
  const hDoel = h.hef ? 0.5 - 0.5 * Math.cos((hefT += dt) * 0.9) : 0.15;
  if (h.hef || Math.abs(hefNu - hDoel) > 0.002) { hefNu += (hDoel - hefNu) * Math.min(1, dt * 3); zetHef(hefNu); bezig = true; }
  const aDoel = h.hef ? 9 : 0; aftak += (aDoel - aftak) * Math.min(1, dt * 1.5);
  if (aftak > 0.01) { G.aftakas.rotation.x += aftak * dt; bezig = true; }
  // motor: de ventilator draait, het klepje op de uitlaat wipt
  const fDoel = h.motor ? 14 : 0; fan += (fDoel - fan) * Math.min(1, dt * 1.5);
  if (fan > 0.01) { G.ventilator.rotation.x += fan * dt; G.uitlaatKlep.rotation.z = (fan / 14) * (0.25 + 0.12 * Math.sin(s.t * 0.03)); bezig = true; }
  else G.uitlaatKlep.rotation.z = 0;
  // lampen
  lichtT += dt; const aan = s.lichtAan || h.lichten;
  for (const k of ["teken", "donker"]) {
    MAT.lamp[k].emissiveIntensity = aan ? 2.0 : 0; MAT.achterlicht[k].emissiveIntensity = aan ? 2.2 : 0.1;
    MAT[ORANJE][k].emissiveIntensity = aan ? 0.5 + 2.6 * Math.max(0, Math.sin(lichtT * 7)) ** 2 : 0.05;
  }
  if (aan) { G.zwaaiTop.rotation.y += dt * 7; bezig = true; }
  return bezig;
}
return {
  titel: "De trekker", label: "Trekker", model: "Landbouwtrekker · 4 wielen", schaal: "Maten in meters", hint: "Sleep om te draaien · tik op de lampen", SECTIES, KIND, mini, beweeg,
  doorzicht: (aan) => { for (const m of G.motorBinnen) m.visible = aan; },
  anker: () => ({ cabine: G.cabine, kap: G.kapVorm, achterwiel: G.achterR, voorwiel: G.voorR, gewichten: G.gewichten, uitlaat: G.uitlaat,
    motor: G.blok, radiator: G.radiator, filter: G.filter,
    stoel: G.stoel, stuurwiel: G.stuurwiel, treden: G.treden, dak: G.dak,
    onderarm: G.onder[0], hefarm: G.hefarm[0], topstang: G.topstang, aftakas: G.aftakas,
    voorbord: G.voorbordR, spiegel: G.spiegelAnker, nop: G.nopAnker, zwaai: G.zwaai, werklampen: G.lampAnker, koplampen: G.lampen.kop, achterlicht: G.achterlichten[0] }),
  uiteenCam: [0.75, 0.4, 12.0, [0.3, 1.6, 0], 34],
  uiteen: () => [
    [G.cabine, [-0.2, 1.3, 0], "CABINE", [-140, -30]], [G.kap, [0.35, 0.75, 0], "MOTORKAP", [60, -40]], [G.uitlaat, [0.7, 1.0, 0.55], null],
    [G.achter[0], [0, 0, 0.9], "ACHTERWIEL", [-100, 110]], [G.achter[1], [0, 0, -0.9], null],
    [G.stuur[0], [0.2, 0, 0.8], "VOORWIEL", [110, 60]], [G.stuur[1], [0.2, 0, -0.8], null],
    [G.bordR, [0, 0.35, 0.45], "SPATBORD", [60, -30]], [G.bordL, [0, 0.35, -0.45], null],
    [G.gewichten, [0.75, 0, 0], "GEWICHTEN", [60, 20]], [G.hef, [-1.2, 0, 0], "HEFINRICHTING", [-40, -90]], [G.treden, [0, -0.1, 0], null],
  ],
};
}
