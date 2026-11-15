// De step: een gewone trapstep zonder motor, voor kinderen en volwassenen, in code getekend. Maten in meters van een echte step:
// wielen van 200 mm, plank van 44 × 13 cm, stuur 43 cm breed en 96 cm hoog, inklapbaar. De voorkant wijst naar +x, rechts is +z.
// Geen merk, geen print, geen tekst. Module voor /js/kern.js.
export default function maak(ctx) {
const { THREE, V, TAU, root, soort, DELEN, mesh, groep, op, buis, samen, draai } = ctx;
const G = { wielen: [] };

const LAK = soort("steplak", 0xf6f6f3, { color: 0x3d4c57, roughness: 0.32, metalness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25 });
const ALU = soort("alu", 0xe6e7e8, { color: 0xb4b8bc, roughness: 0.32, metalness: 0.9 });
const PU = soort("pu", 0xd9d9d5, { color: 0x232323, roughness: 0.72, metalness: 0 });
const KAP = soort("lagerkap", 0x6d6e6b, { color: 0x1b1b1c, roughness: 0.6, metalness: 0.1 });

// ---- de maten
const R = 0.1, PHI = 0.21;                     // straal van een wiel, helling van de stuuras (12 graden)
const VA = V(0.35, R, 0), AA = V(-0.36, R, 0); // voor- en achteras
const DY0 = 0.083, DY1 = 0.115;                // onder- en bovenkant van de plank
const DX0 = -0.245, DX1 = 0.2, DB = 0.13;      // achter- en voorkant, breedte van de plank

function plaat(lx, ly, lz, r, b = 0.0008) {
  const s = new THREE.Shape(), hx = lx / 2 - b, hz = lz / 2 - b, rr = Math.min(r, hx, hz);
  s.moveTo(-hx + rr, -hz); s.lineTo(hx - rr, -hz); s.quadraticCurveTo(hx, -hz, hx, -hz + rr); s.lineTo(hx, hz - rr); s.quadraticCurveTo(hx, hz, hx - rr, hz);
  s.lineTo(-hx + rr, hz); s.quadraticCurveTo(-hx, hz, -hx, hz - rr); s.lineTo(-hx, -hz + rr); s.quadraticCurveTo(-hx, -hz, -hx + rr, -hz);
  const d = Math.max(0.0002, ly - 2 * b);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -d / 2); g.rotateX(Math.PI / 2); g.computeVertexNormals(); return g;
}
const lathe = (prof, seg = 48) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// een stuk draaivorm om de z-as, alleen tussen hoek a0 en a1 (van +x, tegen de klok in)
function boog(prof, a0, a1, seg = 48) {
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg, a0 + Math.PI / 2, a1 - a0); g.rotateX(Math.PI / 2); return g;
}
function boogKap(prof, a) { // dichtmaken aan het eind van een boog: de doorsnede als vlak, twee kanten op
  const s = new THREE.Shape(prof.map(([r, y]) => new THREE.Vector2(r, y))), g = new THREE.ShapeGeometry(s), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const r = p.getX(i), z = p.getY(i); p.setXYZ(i, r * Math.cos(a), r * Math.sin(a), z); }
  const g2 = g.clone(), ix = g2.index.array; for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; }
  g.computeVertexNormals(); g2.computeVertexNormals(); return [g, g2];
}
const moer = (r, h) => new THREE.CylinderGeometry(r, r, h, 6);

// ---- een wiel van 200 mm: band van polyurethaan, velg met vijf spaken, naaf met twee kogellagers
function wiel(deel) {
  const w = new THREE.Group();
  const band = [[0.075, -0.008], [0.08, -0.0128], [0.09, -0.0152], [0.0968, -0.0128], [0.0995, -0.0065], [0.1, 0], [0.0995, 0.0065], [0.0968, 0.0128], [0.09, 0.0152], [0.08, 0.0128], [0.075, 0.008], [0.075, -0.008]];
  const velg = [[0.054, -0.011], [0.0792, -0.011], [0.0792, -0.0082], [0.0752, -0.0082], [0.0752, 0.0082], [0.0792, 0.0082], [0.0792, 0.011], [0.054, 0.011], [0.054, -0.011]];
  const naaf = [[0.0111, -0.02], [0.022, -0.02], [0.024, -0.017], [0.024, 0.017], [0.022, 0.02], [0.0111, 0.02], [0.0111, -0.02]];
  w.add(mesh(draai(band, 72), PU, deel));
  const sp = [];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; const b = new THREE.BoxGeometry(0.036, 0.013, 0.012); b.translate(0.039, 0, 0); b.rotateZ(a); sp.push(b); }
  w.add(mesh(samen([draai(velg, 64), draai(naaf, 40), ...sp]), ALU, deel));
  const ringen = [], kapjes = [];
  for (const zc of [0.0165, -0.0165]) {
    ringen.push(draai([[0.0098, -0.0035], [0.011, -0.0035], [0.011, 0.0035], [0.0098, 0.0035], [0.0098, -0.0035]], 32).translate(0, 0, zc), draai([[0.004, -0.0035], [0.0056, -0.0035], [0.0056, 0.0035], [0.004, 0.0035], [0.004, -0.0035]], 24).translate(0, 0, zc));
    kapjes.push(draai(zc > 0 ? [[0.0098, 0.003], [0.0056, 0.003]] : [[0.0056, -0.003], [0.0098, -0.003]], 32).translate(0, 0, zc));
  }
  w.add(mesh(samen(ringen), "metaal", deel), mesh(samen(kapjes), KAP, deel));
  G.wielen.push(w);
  return w;
}
// as met dopmoeren aan weerskanten, tussen twee plaatjes op afstand b
function as(b, deel) {
  const g = [new THREE.CylinderGeometry(0.004, 0.004, 2 * b + 0.012, 12).rotateX(Math.PI / 2)];
  for (const s of [1, -1]) g.push(moer(0.0065, 0.006).rotateX(Math.PI / 2).translate(0, 0, s * (b + 0.003)), new THREE.SphereGeometry(0.0055, 14, 8, 0, TAU, 0, Math.PI / 2).rotateX(s * Math.PI / 2).translate(0, 0, s * (b + 0.006)));
  return mesh(samen(g), "zwartmetaal", deel);
}

// ================= De plank met de staart en het achterwiel =================
const plank = new THREE.Group();
{
  const dek = plaat(DX1 - DX0, DY1 - DY0, DB, 0.035, 0.006).translate((DX0 + DX1) / 2, (DY0 + DY1) / 2, 0);
  // de staart: een dwarsstuk en twee plaatjes waar de achteras doorheen gaat
  const s = new THREE.Shape(); s.moveTo(DX0 + 0.012, DY1 - 0.002); s.lineTo(DX0 + 0.012, DY0 + 0.004); s.lineTo(AA.x + 0.02, DY0 + 0.003);
  s.absarc(AA.x, AA.y, 0.017, -Math.PI / 2 + 0.25, Math.PI / 2 + 0.6, true);
  s.lineTo(AA.x + 0.03, 0.118); s.lineTo(DX0 - 0.002, DY1 + 0.002);
  const pl = [];
  for (const k of [1, -1]) { const g = new THREE.ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 12 }); g.translate(0, 0, k > 0 ? 0.0215 : -0.0265); pl.push(g); }
  pl.push(plaat(0.016, DY1 - DY0 - 0.004, 0.058, 0.004, 0.002).translate(DX0 - 0.002, (DY0 + DY1) / 2 + 0.001, 0));
  plank.add(mesh(samen([dek, ...pl]), LAK, "plank"));
  // rubber laag met ribbels
  const rub = [plaat(0.37, 0.0022, 0.108, 0.026, 0.0006).translate(-0.025, DY1 + 0.0011, 0)];
  for (let i = 0; i < 26; i++) rub.push(rondeRib(-0.2 + i * 0.0138));
  function rondeRib(x) { return new THREE.CylinderGeometry(0.0013, 0.0013, 0.094, 8).rotateX(Math.PI / 2).translate(x, DY1 + 0.0024, 0); }
  plank.add(mesh(samen(rub), "rubber", "plank"));
  // de hals: van de plank omhoog naar het balhoofd, met een dikke ovale doorsnede
  const hals = buis([V(0.11, 0.1, 0), V(0.18, 0.106, 0), V(0.212, 0.15, 0), V(0.238, 0.205, 0), V(0.272, 0.25, 0), V(0.305, 0.268, 0)], (t) => [0.017 + 0.004 * Math.sin(t * Math.PI), 0.024 - 0.006 * t], { seg: 60, rond: 28 });
  plank.add(mesh(hals, LAK, "plank"));
  root.add(plank);
  const aw = wiel("achterwiel"); aw.position.copy(AA); root.add(aw); G.achterwiel = aw;
  root.add(op(as(0.021, "achterwiel"), AA.x, AA.y, 0));
}

// ================= De rem: het spatbord boven het achterwiel, met een scharnier =================
const SCH = V(DX0 - 0.006, 0.124, 0);
const rem = new THREE.Group(); rem.position.copy(SCH); root.add(rem);
{
  const U = [[0.097, -0.026], [0.1095, -0.026], [0.1095, 0.026], [0.097, 0.026], [0.097, 0.023], [0.1065, 0.023], [0.1065, -0.023], [0.097, -0.023], [0.097, -0.026]];
  const a0 = 0.2, a1 = 2.75;
  // de ribbels staan dwars op de boog
  const rib = [];
  for (let i = 0; i < 9; i++) { const a = 1.05 + i * 0.075; const b = new THREE.BoxGeometry(0.0035, 0.003, 0.044); b.rotateZ(a - Math.PI / 2); b.translate(AA.x - SCH.x + Math.cos(a) * 0.111, AA.y - SCH.y + Math.sin(a) * 0.111, 0); rib.push(b); }
  const spat = mesh(samen([boog(U, a0, a1, 64), ...boogKap(U.slice(0, -1), a0), ...boogKap(U.slice(0, -1), a1)]).translate(AA.x - SCH.x, AA.y - SCH.y, 0), "zwartmetaal", "rem");
  rem.add(spat, mesh(samen(rib), "rubber", "rem"));
  // scharnier: pen en twee ogen
  rem.add(mesh(samen([new THREE.CylinderGeometry(0.0042, 0.0042, 0.06, 14).rotateX(Math.PI / 2), new THREE.BoxGeometry(0.012, 0.006, 0.05).translate(-0.006, -0.002, 0)]), "zwartmetaal", "rem"));
}

// ================= De standaard: links onder de plank, uitklapbaar =================
const STP = V(-0.05, 0.078, -0.056);
const standaard = new THREE.Group(); standaard.position.copy(STP); root.add(standaard);
const LEG = 0.128, voet = V(-0.13, 0.006, -0.112);
const qUit = new THREE.Quaternion().setFromUnitVectors(V(-1, 0, 0), voet.clone().sub(STP).normalize());
const qIn = new THREE.Quaternion().setFromUnitVectors(V(-1, 0, 0), V(-1, 0.03, -0.02).normalize());
{
  const poot = mesh(samen([new THREE.CylinderGeometry(0.0048, 0.0042, LEG, 12).rotateZ(Math.PI / 2).translate(-LEG / 2, 0, 0), new THREE.SphereGeometry(0.0075, 14, 10).translate(0, 0, 0)]), "zwartmetaal", "standaard");
  const dop = mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.014, 12).rotateZ(Math.PI / 2).translate(-LEG + 0.004, 0, 0), "rubber", "standaard");
  standaard.add(poot, dop); standaard.quaternion.copy(qUit);
  root.add(mesh(plaat(0.03, 0.006, 0.016, 0.004, 0.0015).translate(STP.x, DY0 - 0.001, STP.z + 0.004), "zwartmetaal", "standaard")); // beugel
}

// ================= Voorkant: balhoofd, vork, voorwiel, vouwblok, stuurstang en stuur =================
// kop: de oorsprong ligt op de vooras, de y-as is de stuuras (12 graden naar achteren)
const kop = new THREE.Group(); kop.position.copy(VA); kop.rotation.z = PHI; root.add(kop);
const balhoofd = mesh(samen([
  lathe([[0.017, 0.14], [0.0215, 0.14], [0.0225, 0.146], [0.0225, 0.239], [0.0215, 0.245], [0.017, 0.245]], 40),
  new THREE.CylinderGeometry(0.0245, 0.0245, 0.007, 36).translate(0, 0.1365, 0), new THREE.CylinderGeometry(0.0245, 0.0245, 0.007, 36).translate(0, 0.2485, 0),
]), LAK, "vork");
kop.add(balhoofd);
const stuur = new THREE.Group(); kop.add(stuur); // draait om de stuuras
{
  // vork: kroon, twee poten en het voorspatbord
  const kroon = plaat(0.03, 0.022, 0.07, 0.008, 0.004).translate(0, 0.122, 0);
  const poten = [];
  for (const k of [1, -1]) poten.push(buis([V(0.003, 0.118, k * 0.026), V(0.002, 0.06, k * 0.027), V(0, 0.004, k * 0.027)], (t) => [0.0085 - 0.002 * t, 0.0062 - 0.001 * t], { seg: 20, rond: 16 }));
  const steel = new THREE.CylinderGeometry(0.0125, 0.0125, 0.14, 16).translate(0, 0.19, 0);
  stuur.add(mesh(samen([kroon, ...poten, steel]), LAK, "vork"));
  const SP = [[0.1, -0.018], [0.1065, -0.018], [0.1065, 0.018], [0.1, 0.018], [0.1, 0.0155], [0.104, 0.0155], [0.104, -0.0155], [0.1, -0.0155], [0.1, -0.018]];
  stuur.add(mesh(samen([boog(SP, 0.75, 2.2, 40), ...boogKap(SP.slice(0, -1), 0.75), ...boogKap(SP.slice(0, -1), 2.2)]), "zwartmetaal", "vork"));
  const vw = wiel("voorwiel"); stuur.add(vw); G.voorwiel = vw;
  stuur.add(as(0.0215, "voorwiel"));
  // vouwblok bovenop het balhoofd; het scharnier zit achter
  const blok = [plaat(0.05, 0.034, 0.042, 0.01, 0.003).translate(0.002, 0.27, 0)];
  for (const k of [1, -1]) blok.push(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 16).rotateX(Math.PI / 2).translate(-0.021, 0.287, k * 0.015));
  stuur.add(mesh(samen(blok), LAK, "stuurstang"));
}
const VS = V(-0.021, 0.287, 0); // het vouwscharnier (in de kop)
const vouw = new THREE.Group(); vouw.position.copy(VS); stuur.add(vouw);
const tele = new THREE.Group(); vouw.add(tele); // het bovenste deel van de stuurstang schuift in en uit
const r = (x, y, z = 0) => V(x - VS.x, y - VS.y, z - VS.z);
{
  // onderkant van de stang met het vouwslot: scharnieroog, kraag en een hendel aan de voorkant
  const voetStang = [plaat(0.046, 0.03, 0.04, 0.01, 0.003).translate(0.002 - VS.x, 0.302 - VS.y, 0), new THREE.CylinderGeometry(0.007, 0.007, 0.017, 16).rotateX(Math.PI / 2).translate(0, 0, 0)];
  const buisOnder = lathe([[0.0175, 0.31], [0.0175, 0.62]], 36).translate(-VS.x, -VS.y, 0);
  const kraag = lathe([[0.0176, 0.598], [0.0205, 0.598], [0.021, 0.602], [0.021, 0.632], [0.0185, 0.636], [0.0152, 0.636]], 36).translate(-VS.x, -VS.y, 0);
  vouw.add(mesh(samen([...voetStang, buisOnder, kraag]), ALU, "stuurstang"));
  vouw.add(mesh(samen([plaat(0.03, 0.009, 0.026, 0.004, 0.002).translate(0.034 - VS.x, 0.296 - VS.y, 0), new THREE.CylinderGeometry(0.004, 0.004, 0.03, 10).rotateX(Math.PI / 2).translate(0.02 - VS.x, 0.296 - VS.y, 0)]), "zwartmetaal", "stuurstang"));
  // snelspanner van de hoogteklem: een hendeltje opzij
  const hendel = buis([r(0.0, 0.617, 0.021), r(0.02, 0.62, 0.026), r(0.045, 0.612, 0.024)], (t) => [0.003 + 0.002 * t, 0.0045 + 0.002 * t], { seg: 16, rond: 10 });
  vouw.add(mesh(samen([hendel, new THREE.CylinderGeometry(0.005, 0.005, 0.01, 12).rotateX(Math.PI / 2).translate(-VS.x, 0.617 - VS.y, 0.0215)]), "zwartmetaal", "stuurstang"));
  // bovenbuis met gaatjes voor de hoogte en het T-stuk met het stuur
  const boven = [lathe([[0.0148, 0.5], [0.0148, 0.868]], 32)];
  for (let i = 0; i < 4; i++) boven.push(new THREE.CylinderGeometry(0.0028, 0.0028, 0.002, 12).rotateX(Math.PI / 2).translate(0, 0.66 + i * 0.03, 0.0147));
  tele.add(mesh(samen(boven.map((g) => g.translate(-VS.x, -VS.y, 0))), ALU, "stuurstang"));
  const tstuk = [new THREE.CylinderGeometry(0.0165, 0.0165, 0.035, 28).translate(0, 0.86, 0), new THREE.CylinderGeometry(0.0145, 0.0145, 0.1, 28).rotateX(Math.PI / 2).translate(0, 0.882, 0)];
  tele.add(mesh(samen(tstuk.map((g) => g.translate(-VS.x, -VS.y, 0))), LAK, "stuur"));
  tele.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.43, 24).rotateX(Math.PI / 2).translate(-VS.x, 0.882 - VS.y, 0), ALU, "stuur"));
  // handvatten: rubber met ribbels en een kraagje, doppen aan het eind
  const gr = [];
  for (const k of [1, -1]) {
    const prof = [[0.011, 0], [0.0205, 0], [0.0205, 0.005], [0.0162, 0.008]];
    for (let i = 0; i < 10; i++) { const y = 0.012 + i * 0.0098; prof.push([0.0158, y], [0.0168, y + 0.0035], [0.0168, y + 0.006], [0.0158, y + 0.0095]); }
    prof.push([0.0165, 0.112], [0.0172, 0.117], [0.0158, 0.122], [0.011, 0.122]);
    const g = lathe(prof, 32); if (k < 0) { g.rotateX(Math.PI); }
    g.rotateX(k > 0 ? Math.PI / 2 : Math.PI / 2); g.translate(-VS.x, 0.882 - VS.y, k * 0.094);
    const m = mesh(g, "greep", "handvatten"); tele.add(m); if (k > 0) G.greepR = m;
  }
}

// ================= Teksten (maten zijn die van de tekening) =================
const SECTIES = [
  { sleutel: "step", naam: "De step", titel: "De step", tekst: "Een step zonder motor. Je staat met één voet op de plank en zet af met de andere voet. Remmen doe je met je voet op het spatbord achter.", cam: [0.7, 0.24, 2.6, [0, 0.42, 0], 32], focus: null, rollen: true,
    specs: [["Lengte", "89 cm in de tekening"], ["Stuur", "96 cm hoog, 43 cm breed"], ["Wielen", "2, van 200 mm"], ["Inklapbaar", "ja"]],
    namen: [["stuur", "STUUR", 60, -30], ["stang", "STUURSTANG", 70, 0], ["plank", "PLANK", 40, 70], ["rem", "REM", -60, -40], ["voorwiel", "VOORWIEL", 60, 40]] },
  { sleutel: "plank", naam: "De plank", titel: "De plank", tekst: "Hier sta je op. De plank is van aluminium: licht en sterk. Er ligt rubber op, zodat je voet niet wegglijdt. Links zit de standaard: klap hem uit, dan blijft de step staan.", cam: [2.55, 0.5, 1.75, [-0.03, 0.12, 0], 30], focus: ["plank", "standaard"], standaard: true,
    specs: [["Plank", "44 × 13 cm in de tekening"], ["Hoogte", "11,5 cm boven de grond"], ["Bovenop", "rubber met ribbels"], ["Standaard", "links, klapt uit"]],
    namen: [["plank", "PLANK", -50, -60], ["standaard", "STANDAARD", 60, 50]] },
  { sleutel: "stuur", naam: "Het stuur", titel: "Het stuur", tekst: "Met het stuur bepaal je de richting. Draai je het stuur, dan draaien de vork en het voorwiel mee. De handvatten zijn van zacht rubber, zodat je goed grip hebt.", cam: [0.85, 0.38, 1.55, [0.15, 0.86, 0], 30], focus: ["stuur", "handvatten"], sturen: true,
    specs: [["Breedte", "43 cm in de tekening"], ["Hoogte", "96 cm boven de grond"], ["Handvatten", "rubber, 12 cm lang"]],
    namen: [["stuur", "STUUR", -80, -60], ["greep", "HANDVAT", 70, 50]] },
  { sleutel: "stuurstang", naam: "De stuurstang", titel: "De stuurstang", tekst: "De stuurstang kan langer en korter: maak de klem open, schuif, en zet de klem weer vast. Onderaan zit het vouwslot. Daarmee klap je de step in, zo past hij overal.", cam: [1.25, 0.3, 2.45, [0.02, 0.46, 0], 32], focus: ["stuurstang"], vouw: true,
    specs: [["Buizen", "2, de bovenste schuift"], ["Hoogteklem", "met een hendeltje"], ["Vouwslot", "onderaan, met een scharnier"], ["Ingeklapt", "even lang als de step"]],
    namen: [["klem", "HOOGTEKLEM", 60, -30], ["vouwslot", "VOUWSLOT", 60, 30]] },
  { sleutel: "vork", naam: "De voorvork", titel: "De voorvork", tekst: "De vork houdt het voorwiel vast. Bovenaan draait hij in het balhoofd, een buis met kogellagers. Zo kun je sturen.", cam: [0.95, 0.18, 0.85, [0.3, 0.17, 0], 30], focus: ["vork"], sturen: true,
    specs: [["Helling van de stuuras", "12°"], ["Poten", "2, aan elke kant van het wiel"], ["Balhoofd", "met 2 lagers"], ["Spatbord", "klein, boven het voorwiel"]],
    namen: [["balhoofd", "BALHOOFD", 60, -40], ["vork", "VORK", 60, 30]] },
  { sleutel: "wielen", naam: "De wielen", titel: "De wielen", tekst: "Twee wielen van 20 centimeter. De band is van polyurethaan, een stevige kunststof. Er hoeft geen lucht in, dus hij kan niet lek.", cam: [0.35, 0.12, 1.75, [-0.0, 0.12, 0], 30], focus: ["voorwiel", "achterwiel"], rollen: true,
    specs: [["Wielen", "2"], ["Doorsnede", "200 mm"], ["Band", "polyurethaan, zonder lucht"], ["Kogellagers", "2 in elk wiel"]],
    namen: [["voorwiel", "VOORWIEL", 90, -110], ["achterwiel", "ACHTERWIEL", -90, -110]] },
  { sleutel: "rem", naam: "De rem", titel: "De rem", tekst: "De rem is het spatbord boven het achterwiel. Druk je er met je voet op, dan schuurt het tegen de band en ga je langzamer. Kijk: het spatbord gaat omlaag.", cam: [-0.75, 0.38, 1.25, [-0.3, 0.13, 0], 30], focus: ["rem"], rem: true,
    specs: [["Soort", "voetrem op het spatbord"], ["Werkt op", "het achterwiel"], ["Scharnier", "met een veer"]],
    namen: [["rem", "SPATBORD · REM", -100, -100], ["scharnier", "SCHARNIER", 110, -90]] },
];
const KIND = [
  { naam: "de step", focus: ["plank", "stuur", "stuurstang", "vork"], cam: [0.7, 0.2, 3.3, [0, 0.47, 0], 32], rollen: true, geluid: "rol" },
  { naam: "de plank", focus: ["plank"], cam: [0.55, 0.62, 1.75, [-0.03, 0.12, 0], 30] },
  { naam: "het stuur", focus: ["stuur"], cam: [0.85, 0.38, 1.55, [0.15, 0.86, 0], 30], sturen: true },
  { naam: "de handvatten", focus: ["handvatten"], cam: [0.85, 0.4, 1.25, [0.15, 0.88, 0], 30] },
  { naam: "de stuurstang", focus: ["stuurstang"], cam: [1.25, 0.3, 2.45, [0.02, 0.46, 0], 32], vouw: true },
  { naam: "het voorwiel", focus: ["voorwiel"], cam: [0.95, 0.18, 0.85, [0.33, 0.12, 0], 30], rollen: true, geluid: "rol" },
  { naam: "het achterwiel", focus: ["achterwiel"], cam: [-0.75, 0.2, 0.85, [-0.34, 0.12, 0], 30], rollen: true, geluid: "rol" },
  { naam: "de rem", focus: ["rem"], cam: [-0.75, 0.38, 1.1, [-0.3, 0.13, 0], 30], rem: true },
  { naam: "de standaard", focus: ["standaard"], cam: [3.75, 0.3, 1.0, [-0.08, 0.06, -0.06], 30], standaard: true },
];

function mini(aan) {
  const sx = (x) => 60 + x * 58, sy = (y) => 64 - y * 58;
  const kp = (lx, ly) => [VA.x + lx * Math.cos(PHI) - ly * Math.sin(PHI), VA.y + lx * Math.sin(PHI) + ly * Math.cos(PHI)];
  const P = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join("");
  const [s0, s1] = [kp(0, 0.29), kp(0, 0.882)], [h0, h1] = [kp(0, 0.14), kp(0, 0.245)];
  return `<path d="${P([[DX0, DY1], [DX1, DY1], [0.24, 0.2], [0.29, 0.262]])}" class="${aan("plank")}"/>` +
    `<path d="${P([s0, s1])}" class="${aan("stuurstang")}"/>` +
    `<path d="${P([[s1[0] - 0.02, s1[1]], [s1[0] + 0.02, s1[1]]])}" class="${aan("stuur") || aan("handvatten")}" style="stroke-width:3"/>` +
    `<path d="${P([h0, h1])}" class="${aan("vork")}" style="stroke-width:3"/><path d="${P([kp(0, 0.12), kp(0, 0)])}" class="${aan("vork")}"/>` +
    `<circle cx="${sx(VA.x)}" cy="${sy(VA.y)}" r="${(R * 58).toFixed(1)}" class="${aan("voorwiel")}"/><circle cx="${sx(AA.x)}" cy="${sy(AA.y)}" r="${(R * 58).toFixed(1)}" class="${aan("achterwiel")}"/>` +
    `<path d="M${sx(AA.x + 0.104)},${sy(0.125)}A${(0.108 * 58).toFixed(1)},${(0.108 * 58).toFixed(1)} 0 0 0 ${sx(AA.x - 0.1)},${sy(0.14)}" class="${aan("rem")}"/>` +
    `<path d="${P([[-0.05, 0.08], [-0.13, 0.006]])}" class="${aan("standaard")}"/>`;
}

let wielHoek = 0, stuurT = 0, stuurNu = 0, vouwT = 0, vouwNu = 0, remT = 0, remNu = 0, stT = 0, stNu = 1;
const glad = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
function beweeg(dt, h, s) {
  let bezig = false;
  if (h.rollen || s.uiteen) { wielHoek -= dt * (s.uiteen ? 1.2 : 3); for (const w of G.wielen) w.rotation.z = wielHoek; bezig = true; }
  // sturen: heen en weer
  if (h.sturen && !s.uiteen) stuurT += dt;
  const sDoel = h.sturen && !s.uiteen ? Math.sin(stuurT * 1.3) * 0.42 : 0;
  stuurNu += (sDoel - stuurNu) * Math.min(1, dt * 5); stuur.rotation.y = stuurNu;
  // vouwen: eerst de stang korter, dan klappen; even wachten, en weer terug
  if (h.vouw && !s.uiteen) vouwT += dt; else vouwT = 0;
  const fase = h.vouw && !s.uiteen ? (vouwT % 8) / 8 : 0, heen = fase < 0.5 ? glad(fase / 0.35) : glad((1 - fase) / 0.35);
  vouwNu += (heen - vouwNu) * Math.min(1, dt * 6);
  tele.position.y = -0.19 * glad(vouwNu / 0.4);
  vouw.rotation.z = 1.25 * glad((vouwNu - 0.35) / 0.65);
  // remmen: het spatbord gaat een paar keer omlaag
  if (h.rem && !s.uiteen) remT += dt; else remT = 0;
  const rDoel = h.rem && !s.uiteen ? 0.058 * glad(Math.sin(remT * 2.2) * 1.6) : 0;
  remNu += (rDoel - remNu) * Math.min(1, dt * 10); rem.rotation.z = remNu;
  // standaard: in- en uitklappen
  if (h.standaard && !s.uiteen) stT += dt; else stT = 0;
  const stDoel = h.standaard && !s.uiteen ? glad(0.5 + Math.cos(stT * 1.1) * 0.9) : 1;
  stNu += (stDoel - stNu) * Math.min(1, dt * 5); standaard.quaternion.slerpQuaternions(qIn, qUit, stNu);
  if (h.sturen || h.vouw || h.rem || h.standaard || Math.abs(stuurNu) > 1e-4 || vouwNu > 1e-4 || remNu > 1e-4 || stNu < 0.9999) bezig = true;
  return bezig;
}

return {
  titel: "De step", label: "Step", model: "Step · 2 wielen", schaal: "Maten in meters", hint: "Sleep om te draaien", SECTIES, KIND, mini, beweeg,
  anker: () => ({ plank: DELEN.plank[0], standaard: standaard, stuur: DELEN.stuur[0], greep: G.greepR, stang: DELEN.stuurstang[1], klem: DELEN.stuurstang[3], vouwslot: DELEN.stuurstang[2],
    balhoofd: balhoofd, vork: DELEN.vork[1], voorwiel: G.voorwiel, achterwiel: G.achterwiel, rem: DELEN.rem[0], scharnier: DELEN.rem[2] }),
  uiteenCam: [0.62, 0.3, 2.9, [0.0, 0.46, 0], 32],
  uiteen: () => [
    [stuur, [0.1, 0, 0], null], [G.voorwiel, [0.09, 0, 0], "VOORWIEL", [60, 30]], [vouw, [0, 0.06, 0], "STUURSTANG", [70, 0]], [tele, [0, 0.07, 0], null],
    [DELEN.stuur[1], [0, 0, 0], "STUUR", [60, -20]], [DELEN.vork[1], [0, 0, 0], "VORK", [70, -10]],
    [G.achterwiel, [-0.14, 0, 0], "ACHTERWIEL", [-60, 30]], [rem, [-0.04, 0.12, 0], "REM", [-60, -30]],
    [standaard, [0.03, 0, 0.26], "STANDAARD", [-70, 40]], [DELEN.plank[1], [0, 0.07, 0], "RUBBER", [-50, -50]], [DELEN.plank[0], [0, 0, 0], "PLANK", [50, 60]],
  ],
};
}
