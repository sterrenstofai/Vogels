// Het vliegtuig: een algemeen tweemotorig passagiersvliegtuig, in code getekend (schaal 1:10 in meters; de neus wijst naar +x, rechts is +z).
// Geen bestaand type, geen merk. Module voor /js/kern.js.
export default function maak(ctx) {
const { THREE, V, TAU, root, MAT, DELEN, mesh, groep, op, buis, samen, rondeDoos, vleugelvorm, naarBuitenG } = ctx;
const vliegtuig = root;
const G = { draaien: [], wielen: [], kleppen: [], roer: null, lichten: {} };
const RR = 0.2, LANG = 3.8, X0 = -1.9, YM = 0.45; // straal van de romp, lengte, achterkant, hoogte van de as
const ruimte = (t) => t * t * (3 - 2 * t);
const NEUS = 0.86, STAART = 0.28;
const rompStraal = (t) => {
  if (t > NEUS) { const u = (t - NEUS) / (1 - NEUS); return Math.max(0.004, RR * Math.pow(Math.max(0, 1 - u ** 2.3), 0.56)); }
  if (t < STAART) return 0.018 + (RR - 0.018) * Math.pow(ruimte(t / STAART), 0.75);
  return RR;
};
// de bovenkant loopt bijna recht door naar de staart; de neus zakt iets omlaag
const rompY = (t) => YM + (t < STAART ? (RR - rompStraal(t)) * 0.8 : 0) - (t > NEUS ? 0.055 * ((t - NEUS) / (1 - NEUS)) ** 1.6 : 0);
const rompX = (t) => X0 + LANG * t;
// een punt op de romp: x langs de lengte, phi rond (0 = boven, + = rechts), off = iets naar buiten
function opRomp(x, phi, off = 0) { const t = THREE.MathUtils.clamp((x - X0) / LANG, 0, 1), r = rompStraal(t) + off; return V(x, rompY(t) + Math.cos(phi) * r * 1.04, Math.sin(phi) * r); }
// een stukje huid op de romp (raam, deur): een afgeronde vorm die precies op het oppervlak ligt
function huid(xc, phic, w, h, off = 0.0015, n = 4, rond = 4) {
  const pos = [], idx = [], ringen = 6, hoeken = 28, rc = rompStraal((xc - X0) / LANG);
  pos.push(...opRomp(xc, phic, off).toArray());
  for (let i = 1; i <= ringen; i++) for (let j = 0; j < hoeken; j++) {
    const a = (j / hoeken) * TAU, c = Math.cos(a), sn = Math.sin(a), ex = 2 / rond;
    const s = Math.sign(c) * Math.abs(c) ** ex, u = Math.sign(sn) * Math.abs(sn) ** ex, rho = i / ringen;
    pos.push(...opRomp(xc + s * rho * w / 2, phic + (u * rho * h / 2) / rc, off).toArray());
  }
  for (let j = 0; j < hoeken; j++) idx.push(0, 1 + j, 1 + ((j + 1) % hoeken));
  for (let i = 1; i < ringen; i++) for (let j = 0; j < hoeken; j++) { const a = 1 + (i - 1) * hoeken + j, b = 1 + (i - 1) * hoeken + ((j + 1) % hoeken), c2 = a + hoeken, d = b + hoeken; idx.push(a, c2, b, b, c2, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // naar buiten gericht?
  const nrm = g.attributes.normal, mid = opRomp(xc, phic, 0).sub(V(xc, rompY((xc - X0) / LANG), 0));
  if (V(nrm.getX(0), nrm.getY(0), nrm.getZ(0)).dot(mid) < 0) { const ix = g.index.array; for (let q = 0; q < ix.length; q += 3) { const tmp = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = tmp; } g.computeVertexNormals(); }
  return g.toNonIndexed();
}
// ---- de romp
{
  const pts = Array.from({ length: 80 }, (_, i) => { const t = i / 79; return V(rompX(t), rompY(t), 0); });
  const romp = mesh(buis(pts, (t) => [rompStraal(t) * 1.04, rompStraal(t)], { seg: 220, rond: 56 }), "romp", "romp");
  romp.userData.romp = true;
  const phiRaam = Math.PI / 2 - 0.26, ramen = [];
  for (let x = -1.18; x <= 1.24; x += 0.074) for (const k of [1, -1]) ramen.push(huid(x, k * phiRaam, 0.028, 0.04, 0.0012, 4, 3.2));
  const deuren = [];
  for (const x of [1.33, -1.34]) for (const k of [1, -1]) deuren.push(huid(x, k * (Math.PI / 2 - 0.05), 0.085, 0.16, 0.0008, 4, 6));
  // vleugel-rompkap onder de vleugels
  const kap = mesh(new THREE.SphereGeometry(1, 48, 24).scale(0.66, 0.1, 0.212).translate(-0.06, YM - 0.15, 0), "romp", "romp");
  const ramenM = mesh(samen(ramen), "raam", "romp"), deurenM = mesh(samen(deuren), "naad", "romp");
  ramenM.userData.romp = deurenM.userData.romp = kap.userData.romp = true;
  vliegtuig.add(romp, ramenM, deurenM, kap);
  // cockpitruiten: zes ruiten in een band rond de neus
  const cr = [];
  for (const [phi, xc, w] of [[0.24, 1.7, 0.05], [-0.24, 1.7, 0.05], [0.66, 1.692, 0.052], [-0.66, 1.692, 0.052], [1.06, 1.676, 0.05], [-1.06, 1.676, 0.05]]) cr.push(huid(xc, phi, w, 0.058, 0.006, 4, 5));
  vliegtuig.add(mesh(samen(cr), "raam", "cockpit"));
}
// ---- vleugels met kleppen en winglets
const VL_Y = 0.345, V_HOEK = 0.09; // hoogte van de vleugelwortel, V-stand (5 graden)
const voorrand = (z) => 0.39 - 0.526 * (Math.abs(z) - 0.1);
const achterrand = (z) => { const a = Math.abs(z); return a < 0.95 ? -0.39 - (0.03 * (a - 0.1)) / 0.85 : -0.42 - (0.18 * (a - 0.95)) / 0.73; };
for (const k of [1, -1]) {
  const vg = new THREE.Group(); vg.position.set(0, VL_Y, 0); vg.rotation.x = -k * V_HOEK;
  const secs = [0.1, 0.62, 0.95, 1.3, 1.68].map((z) => ({ le: voorrand(z), c: voorrand(z) - achterrand(z), t: 0.15 - 0.05 * (z / 1.68), z }));
  const naar = (x, y, sc) => V(x, y, k * sc.z);
  vg.add(mesh(naarBuitenG(vleugelvorm(secs, naar), V(-0.1, 0, k * 0.8)), "romp", "vleugels"));
  // winglet: omhoog aan de punt
  const wsecs = [0, 0.06, 0.2].map((h) => ({ le: -0.441 - 0.6 * h, c: 0.159 - 0.42 * h, t: 0.1, h }));
  const wnaar = (x, y, sc) => V(x, 0.004 + sc.h, k * (1.68 + 0.18 * sc.h * sc.h) + k * y);
  vg.add(mesh(naarBuitenG(vleugelvorm(wsecs, wnaar), V(-0.5, 0.1, k * 1.7)), "romp", "vleugels"));
  // kleppen achter het binnenste deel: een dun profiel aan een scharnier
  for (const [z0, z1] of [[0.24, 0.6], [0.64, 0.94]]) {
    const scharnier = new THREE.Group(); scharnier.position.set(achterrand(z0) + 0.012, -0.004, 0);
    const ks = [z0, z1].map((z) => ({ le: achterrand(z) - achterrand(z0), c: 0.1, t: 0.07, z }));
    ks.wortelDicht = true;
    const klep = mesh(naarBuitenG(vleugelvorm(ks, (x, y, sc) => V(x, y, k * sc.z)), V(-0.05, 0, k * (z0 + z1) / 2)), "klep", "kleppen");
    scharnier.add(klep); vg.add(scharnier); G.kleppen.push(scharnier);
  }
  // lampjes op de vleugeltip: rood links, groen rechts
  const lamp = op(mesh(new THREE.SphereGeometry(0.012, 16, 10), k > 0 ? "groenlicht" : "roodlicht", "lichten"), -0.47, 0.0, k * 1.686);
  vg.add(lamp); G.lichten[k > 0 ? "groen" : "rood"] = lamp;
  vliegtuig.add(vg); G[k > 0 ? "vleugelR" : "vleugelL"] = vg;
}
// ---- motoren
function nacel() {
  const prof = [[0.0, 0.29], [0.105, 0.29], [0.122, 0.27], [0.128, 0.2], [0.124, 0.02], [0.11, -0.12], [0.085, -0.2], [0.07, -0.21], [0.06, -0.2], [0.04, -0.29], [0.0, -0.31]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56); g.rotateZ(-Math.PI / 2); return g;
}
for (const k of [1, -1]) {
  const z = k * 0.6, x = voorrand(z) + 0.02, y = VL_Y + 0.5 * V_HOEK - 0.16;
  const mg = new THREE.Group(); mg.position.set(x, y, z);
  const huis = mesh(nacel(), "romp", "motoren");
  const inlaat = op(mesh(new THREE.CylinderGeometry(0.104, 0.104, 0.02, 48).rotateZ(Math.PI / 2), "zwartmetaal", "motoren"), 0.26, 0, 0);
  const fan = new THREE.Group(); fan.position.x = 0.265;
  const bladen = []; for (let i = 0; i < 20; i++) { const b = new THREE.BoxGeometry(0.006, 0.092, 0.018); b.translate(0, 0.052, 0); b.rotateY(0.5); b.rotateX((i / 20) * TAU); bladen.push(b); }
  fan.add(mesh(samen(bladen), "metaal", "motoren"), op(mesh(new THREE.ConeGeometry(0.028, 0.06, 24).rotateZ(-Math.PI / 2), "metaal", "motoren"), 0.03, 0, 0));
  const ps = new THREE.Shape(); ps.moveTo(0.2, 0.105); ps.lineTo(-0.26, 0.105); ps.quadraticCurveTo(-0.33, 0.12, -0.36, 0.185); ps.lineTo(0.02, 0.185); ps.quadraticCurveTo(0.12, 0.15, 0.2, 0.105);
  const pg = new THREE.ExtrudeGeometry(ps, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 8 }); pg.translate(0, 0, -0.006); pg.computeVertexNormals();
  const pyloon = mesh(pg, "romp", "motoren");
  const kegel = op(mesh(new THREE.ConeGeometry(0.045, 0.12, 28).rotateZ(Math.PI / 2), "zwartmetaal", "motoren"), -0.33, 0, 0);
  mg.add(kegel);
  mg.add(huis, inlaat, fan, pyloon); vliegtuig.add(mg);
  G.draaien.push(fan); G[k > 0 ? "motorR" : "motorL"] = mg;
}
// ---- de staart: kielvlak met richtingsroer, en hoogteroeren (met vleugelprofiel)
{
  const voet = opRomp(-1.45, 0).y - 0.025, st = new THREE.Group(); st.position.set(0, voet, 0);
  const vsecs = [0, 0.3, 0.6].map((h) => ({ le: -1.17 - 0.82 * h, c: 0.48 - 0.47 * h, t: 0.11 - 0.03 * h, h }));
  vsecs.wortelDicht = true;
  st.add(mesh(naarBuitenG(vleugelvorm(vsecs, (x, y, sc) => V(x, sc.h, y)), V(-1.5, 0.3, 0)), "romp", "staart"));
  const rug = new THREE.Shape(); rug.moveTo(-0.9, 0); rug.quadraticCurveTo(-1.1, 0.02, -1.2, 0.12); rug.lineTo(-1.25, 0.0);
  const rugG = new THREE.ExtrudeGeometry(rug, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3 }); rugG.translate(0, 0, -0.004); rugG.computeVertexNormals();
  st.add(mesh(rugG, "romp", "staart"));
  const scharnierX = -1.65, roer = new THREE.Group(); roer.position.set(scharnierX, 0, 0);
  const rsecs = [0.03, 0.3, 0.58].map((h) => { const fin = vsecs[0].le - 0.82 * h - (0.48 - 0.47 * h); return { le: fin - scharnierX + 0.004, c: 0.12 - 0.08 * h, t: 0.09, h }; });
  rsecs.wortelDicht = true;
  roer.add(mesh(naarBuitenG(vleugelvorm(rsecs, (x, y, sc) => V(x, sc.h, y)), V(-0.06, 0.3, 0)), "klep", "staart"));
  st.add(roer); G.roer = roer;
  vliegtuig.add(st); G.staartVert = st;
  for (const k of [1, -1]) {
    const hg = new THREE.Group(); hg.position.set(0, rompY(0.06) + 0.005, 0); hg.rotation.x = -k * 0.1;
    const hsecs = [0.02, 0.64].map((z) => ({ le: -1.42 - 0.55 * (z - 0.02), c: 0.38 - 0.42 * (z - 0.02), t: 0.1, z }));
    hg.add(mesh(naarBuitenG(vleugelvorm(hsecs, (x, y, sc) => V(x, y, k * sc.z)), V(-1.6, 0, k * 0.3)), "romp", "staart"));
    vliegtuig.add(hg); G[k > 0 ? "hoogteR" : "hoogteL"] = hg;
  }
  const staartlicht = op(mesh(new THREE.SphereGeometry(0.012, 12, 8), "witlicht", "lichten"), X0 + 0.003, rompY(0), 0); vliegtuig.add(staartlicht); G.lichten.wit = staartlicht;
  const zwaai = op(mesh(new THREE.SphereGeometry(0.016, 14, 8, 0, TAU, 0, Math.PI / 2), "roodlicht", "lichten"), 0.1, YM + RR * 1.04, 0); vliegtuig.add(zwaai); G.lichten.zwaai = zwaai;
}
// ---- landingsgestel
function gestel(x, z, yBoven, rw, twee) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const poot = mesh(samen([new THREE.CylinderGeometry(0.014, 0.014, yBoven - rw, 14).translate(0, rw + (yBoven - rw) / 2, 0), new THREE.CylinderGeometry(0.02, 0.02, 0.06, 14).translate(0, yBoven - 0.05, 0)]), "metaal", "landingsgestel");
  const as = mesh(new THREE.CylinderGeometry(0.008, 0.008, twee ? 0.12 : 0.08, 10).rotateX(Math.PI / 2).translate(0, rw, 0), "metaal", "landingsgestel");
  g.add(poot, as);
  for (const dz of twee ? [-0.045, 0.045] : [-0.028, 0.028]) {
    const w = new THREE.Group(); w.position.set(0, rw, dz);
    const band = mesh(new THREE.TorusGeometry(rw * 0.72, rw * 0.3, 14, 32), "rubber", "landingsgestel");
    const naaf = mesh(new THREE.CylinderGeometry(rw * 0.55, rw * 0.55, rw * 0.5, 24).rotateX(Math.PI / 2), "metaal", "landingsgestel");
    w.add(band, naaf); g.add(w); G.wielen.push(w);
  }
  vliegtuig.add(g); return g;
}
G.neuswiel = gestel(1.42, 0, YM - RR + 0.01, 0.038, false);
G.hoofdL = gestel(-0.12, -0.36, VL_Y - 0.03, 0.064, true);
G.hoofdR = gestel(-0.12, 0.36, VL_Y - 0.03, 0.064, true);
// ---- binnen: cockpit en cabine (te zien als de romp doorzichtig is of het vliegtuig uit elkaar is)
{
  const st = [];
  for (let x = -1.05; x <= 1.15; x += 0.084) for (const z of [-0.13, -0.085, -0.04, 0.04, 0.085, 0.13]) {
    st.push(rondeDoos(0.035, 0.018, 0.038, 0.006).translate(x, YM - 0.075, z), rondeDoos(0.012, 0.06, 0.038, 0.005).translate(x - 0.017, YM - 0.045, z));
  }
  const cabine = mesh(samen(st), "stoel", "cabine");
  const vloer = mesh(new THREE.BoxGeometry(2.3, 0.008, 0.34).translate(0.05, YM - 0.09, 0), "vloer", "cabine");
  G.cabine = groep(cabine, vloer); vliegtuig.add(G.cabine);
  const cs = [];
  for (const z of [-0.06, 0.06]) cs.push(rondeDoos(0.05, 0.02, 0.045, 0.008).translate(1.54, YM - 0.04, z), rondeDoos(0.014, 0.08, 0.045, 0.006).translate(1.515, YM, z));
  const paneel = rondeDoos(0.03, 0.045, 0.2, 0.006); paneel.rotateZ(0.5); paneel.translate(1.64, YM + 0.02, 0);
  G.cockpitBinnen = groep(mesh(samen(cs), "stoel", "cockpit"), mesh(paneel, "scherm", "cockpit"));
  vliegtuig.add(G.cockpitBinnen);
}


// ================= Teksten (maten zijn die van de tekening, schaal 1:10) =================
const SECTIES = [
  { sleutel: "vliegtuig", naam: "Het vliegtuig", titel: "Het vliegtuig", tekst: "Een passagiersvliegtuig met twee motoren, zoals je er veel ziet op Schiphol. Tik op de lampjes.", cam: [0.78, 0.3, 7.2, [0.0, 0.5, 0], 32], focus: null,
    specs: [["Lengte", "38 m in de tekening"], ["Spanwijdte", "34 m in de tekening"], ["Motoren", "2, onder de vleugels"], ["Stoelen", "162 in de tekening"], ["Lampjes", "tik", "lichten"]],
    namen: [["vleugelR", "VLEUGEL", 60, -40], ["motorR", "MOTOR", 70, 40], ["staartVert", "STAART", -70, -30], ["neuswiel", "LANDINGSGESTEL", 40, 50], ["romp", "ROMP", -60, -50]] },
  { sleutel: "romp", naam: "De romp", titel: "De romp", tekst: "De lange buis waar de mensen in zitten. Voorin de piloten, daarachter rijen stoelen, en onderin de koffers.", cam: [0.12, 0.18, 6.4, [0.0, 0.5, 0], 30], focus: ["romp", "cabine"], doorzicht: true,
    specs: [["Rijen stoelen", "27 in de tekening"], ["Stoelen per rij", "6, met een gangpad"], ["Deuren", "2 aan elke kant"], ["Ramen", "een lange rij aan elke kant"]],
    namen: [["cabine", "CABINE · STOELEN", -60, -60], ["romp", "ROMP", 60, -50]] },
  { sleutel: "vleugels", naam: "De vleugels", titel: "De vleugels", tekst: "Door de vorm van de vleugels gaat het vliegtuig omhoog als het hard genoeg gaat. Kijk: de kleppen gaan uit.", cam: [0.55, 1.05, 5.6, [-0.15, 0.4, 0.5], 34], focus: ["vleugels", "kleppen"], kleppen: true,
    specs: [["Spanwijdte", "34 m in de tekening"], ["Pijlstand", "naar achteren"], ["Kleppen", "2 aan elke kant"], ["Winglets", "omhoog aan de punt"]],
    namen: [["vleugelR", "VLEUGEL", 60, -30], ["kleppen", "KLEPPEN", -70, 30]] },
  { sleutel: "motoren", naam: "De motoren", titel: "De motoren", tekst: "Voorin draait een grote ventilator. Die blaast lucht hard naar achteren, en dan gaat het vliegtuig vooruit.", cam: [0.95, 0.16, 2.3, [0.18, 0.25, 0.62], 32], focus: ["motoren"], draaien: true,
    specs: [["Motoren", "2 straalmotoren"], ["Ventilator", "20 bladen in de tekening"], ["Plek", "onder de vleugels"]],
    namen: [["motorR", "STRAALMOTOR", 60, -40]] },
  { sleutel: "staart", naam: "De staart", titel: "De staart", tekst: "De staart houdt het vliegtuig recht. Met het roer stuurt de piloot naar links en naar rechts.", cam: [-0.95, 0.35, 2.9, [-1.55, 0.8, 0], 32], focus: ["staart"], roer: true,
    specs: [["Richtingsroer", "links en rechts"], ["Hoogteroeren", "omhoog en omlaag"], ["Staartlicht", "wit"]],
    namen: [["staartVert", "RICHTINGSROER", -60, -40], ["hoogteR", "HOOGTEROER", 60, 30]] },
  { sleutel: "landingsgestel", naam: "Het landingsgestel", titel: "Het landingsgestel", tekst: "Wielen om op te landen en te rijden. In de lucht klappen ze in de romp, zodat het vliegtuig makkelijker vliegt.", cam: [0.85, 0.03, 3.3, [0.4, 0.18, 0], 34], focus: ["landingsgestel"], rollen: true,
    specs: [["Neuswiel", "2 wielen, stuurt op de grond"], ["Hoofdwielen", "2 × 2 wielen"], ["Wielen samen", "6"]],
    namen: [["neuswiel", "NEUSWIEL", 60, -30], ["hoofdR", "HOOFDWIELEN", -60, -30]] },
  { sleutel: "cockpit", naam: "De cockpit", titel: "De cockpit", tekst: "Hier zitten de piloten, met schermen en knoppen. Buiten knipperen de lampjes: rood links, groen rechts.", cam: [0.62, 0.22, 2.3, [1.45, 0.5, 0], 30], focus: ["cockpit", "lichten"], doorzicht: true, lichten: true,
    specs: [["Piloten", "2"], ["Ramen", "4 in de tekening"], ["Lampjes", "rood, groen en wit"]],
    namen: [["cockpit", "COCKPIT", 60, -40], ["lichten", "LAMPJES", -60, 40]] },
];
const KIND = [
  { naam: "het vliegtuig", focus: ["romp"], cam: [0.78, 0.3, 7.2, [0.0, 0.5, 0], 32] },
  { naam: "de vleugel", focus: ["vleugels", "kleppen"], cam: [0.55, 1.05, 5.6, [-0.15, 0.4, 0.5], 34], kleppen: true },
  { naam: "de motor", focus: ["motoren"], cam: [0.95, 0.16, 2.3, [0.18, 0.25, 0.62], 32], draaien: true, geluid: "straal" },
  { naam: "de staart", focus: ["staart"], cam: [-0.95, 0.35, 2.9, [-1.55, 0.8, 0], 32], roer: true },
  { naam: "de wielen", focus: ["landingsgestel"], cam: [0.85, 0.03, 3.3, [0.4, 0.18, 0], 34], rollen: true },
  { naam: "de ramen", focus: ["romp"], cam: [0.12, 0.15, 3.4, [0.3, 0.5, 0], 30] },
  { naam: "de cockpit", focus: ["cockpit"], cam: [0.62, 0.22, 2.3, [1.45, 0.5, 0], 30] },
  { naam: "de lampjes", focus: ["lichten"], cam: [0.6, 0.6, 5.0, [-0.2, 0.45, 0], 34], lichten: true },
];


function mini(aan) {
  const sx = (x) => 60 + x * 26, sy = (y) => 52 - y * 26;
  const romp = Array.from({ length: 31 }, (_, i) => { const t = i / 30; return [rompX(t), rompY(t) + rompStraal(t)]; }).concat(Array.from({ length: 31 }, (_, i) => { const t = 1 - i / 30; return [rompX(t), rompY(t) - rompStraal(t)]; }));
  return `<path d="M${romp.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join("L")}Z" class="${aan("romp") || aan("cockpit")}"/>` +
    `<path d="M${sx(-1.2)},${sy(0.66)}L${sx(-1.66)},${sy(1.28)}L${sx(-1.84)},${sy(1.28)}L${sx(-1.76)},${sy(0.66)}" class="${aan("staart")}"/>` +
    `<path d="M${sx(0.36)},${sy(0.36)}L${sx(-0.5)},${sy(0.42)}L${sx(-0.36)},${sy(0.33)}Z" class="${aan("vleugels")}"/>` +
    `<path d="M${sx(0.42)},${sy(0.24)}L${sx(-0.18)},${sy(0.24)}" class="${aan("motoren")}" style="stroke-width:6"/>` +
    `<line x1="${sx(1.42)}" y1="${sy(0.26)}" x2="${sx(1.42)}" y2="${sy(0)}" class="${aan("landingsgestel")}"/><line x1="${sx(-0.12)}" y1="${sy(0.33)}" x2="${sx(-0.12)}" y2="${sy(0)}" class="${aan("landingsgestel")}"/>`;
}


let fan = 0, kleppenNu = 0, roerT = 0, wielHoek = 0, lichtT = 0;
function beweeg(dt, h, s) {
  let bezig = false;
  const fanDoel = h.draaien || s.uiteen ? 9 : 0; fan += (fanDoel - fan) * Math.min(1, dt * 1.5);
  if (fan > 0.01) { for (const f of G.draaien) f.rotation.x += fan * dt; bezig = true; }
  if (h.kleppen || h.roer || h.rollen || s.lichtAan || h.lichten || Math.abs(kleppenNu - (h.kleppen ? 0.55 : 0)) > 0.002) bezig = true;
  const kDoel = h.kleppen ? 0.55 : 0; kleppenNu += (kDoel - kleppenNu) * Math.min(1, dt * 2); for (const k of G.kleppen) k.rotation.z = kleppenNu;
  if (h.roer) roerT += dt; G.roer.rotation.y = h.roer ? Math.sin(roerT * 1.6) * 0.35 : G.roer.rotation.y * 0.9;
  if (h.rollen) { wielHoek -= dt * 2.5; for (const w of G.wielen) w.rotation.z = wielHoek; }
  lichtT += dt; const aan = s.lichtAan || h.lichten || s.uiteen;
  for (const k of ["teken", "donker"]) { MAT.roodlicht[k].emissiveIntensity = MAT.groenlicht[k].emissiveIntensity = MAT.witlicht[k].emissiveIntensity = aan ? 2.2 : 0.15; }
  G.lichten.zwaai.scale.setScalar(aan && lichtT % 1.1 < 0.12 ? 1.6 : 1);
  return bezig;
}
return {
  titel: "Het vliegtuig", label: "Vliegtuig", model: "Passagiersvliegtuig", schaal: "Schaal 1:10", hint: "Sleep om te draaien · tik op de lampjes", SECTIES, KIND, mini, beweeg,
  doorzicht: (aan) => { G.cabine.visible = G.cockpitBinnen.visible = aan; },
  anker: () => ({ romp: DELEN.romp[0], cabine: G.cabine, vleugelR: G.vleugelR, kleppen: G.kleppen[1], motorR: G.motorR, staartVert: G.staartVert, hoogteR: G.hoogteR, neuswiel: G.neuswiel, hoofdR: G.hoofdR, cockpit: DELEN.cockpit[0], lichten: G.lichten.groen }),
  uiteenCam: [0.75, 0.45, 8.8, [-0.1, 0.65, 0], 34],
  uiteen: () => [
    [G.staartVert, [-0.35, 0.55, 0], "STAART", [-60, -30]], [G.hoogteL, [-0.45, 0.2, -0.35], null], [G.hoogteR, [-0.45, 0.2, 0.35], "HOOGTEROER", [60, -20]],
    [G.vleugelL, [0, 0.05, -0.65], null], [G.vleugelR, [0, 0.05, 0.65], "VLEUGEL", [60, -30]],
    [G.motorL, [0.15, -0.3, -0.95], null], [G.motorR, [0.15, -0.3, 0.95], "MOTOR", [60, 30]],
    [G.neuswiel, [0.35, -0.3, 0], "NEUSWIEL", [50, 20]], [G.hoofdL, [0, -0.35, -0.3], null], [G.hoofdR, [0, -0.35, 0.3], "HOOFDWIELEN", [60, 20]],
    [G.cabine, [0, 0.75, 0], "CABINE · 162 STOELEN", [-70, -30]], [G.cockpitBinnen, [0.45, 0.6, 0], "COCKPIT", [60, -20]],
  ],
};
}
