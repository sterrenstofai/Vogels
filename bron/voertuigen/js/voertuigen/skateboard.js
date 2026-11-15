// Het skateboard: een gewoon skateboard met twee opstaande uiteinden, in code getekend. Maten in meters van een echt bord:
// 81 cm lang, 20,5 cm breed, wielen van 53 mm, twee trucks van 20 cm breed. De neus wijst naar +x, rechts is +z.
// Geen merk, geen print, geen tekst. Module voor /js/kern.js.
export default function maak(ctx) {
const { THREE, V, TAU, soort, DELEN, mesh, groep, op, buis, samen, draai } = ctx;
const G = { wielen: [], hangers: [], trucks: [], lagers: [], kappen: [], bushings: [] };

// ---- eigen materialen: eerste kleur = stand "Tekening", daarna stand "Donker"
const HOUT = soort("esdoorn", 0xf3ead8, { color: 0xc59c6c, roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.45 });
const LIJM = soort("lijmlaag", 0xe2d3b6, { color: 0x94693f, roughness: 0.6, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.45 });
const ONDER = soort("deckonder", 0xe6e4de, { color: 0x34414c, roughness: 0.42, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.3 });
const GRIP = soort("grip", 0x8f8f8b, { color: 0x161616, roughness: 1, metalness: 0 });
const URE = soort("urethaan", 0xf8f6ef, { color: 0xe7e0cb, roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5 });
const BUS = soort("bushing", 0xf2dcae, { color: 0xc98f36, roughness: 0.55, metalness: 0 });
const KAP = soort("lagerkap", 0x6d6e6b, { color: 0x1b1b1c, roughness: 0.6, metalness: 0.1 });
const KOGEL = soort("kogel", 0xd9dbdd, { color: 0xd8dce0, roughness: 0.12, metalness: 1 });

// ---- de maten
const L2 = 0.405, W = 0.205, H = 0.0115; // halve lengte, breedte, dikte van de plank
const A = 0.3, KS = 0.245;               // waar de ronde punt begint, waar de plank omhoog gaat buigen
const R = 0.0265, TX = 0.208;            // straal van een wiel, plek van de trucks (wielbasis 36 cm tussen de binnenste gaten)
const YD = 0.0825;                       // onderkant van de plank boven de vloer
const breed = (x) => { const a = Math.abs(x); if (a <= A) return W; const u = Math.min(1, (a - A) / (L2 - A)); return W * Math.pow(Math.max(0, 1 - Math.pow(u, 2.3)), 1 / 2.3); };
const kick = (x) => { const e = Math.abs(x) - KS; return e > 0 ? (0.36 * e * e) / (e + 0.03) : 0; };
const holte = (z) => 0.0055 * (z / (W / 2)) ** 2; // de plank is in de breedte iets hol (concaaf)
const boven = (x, z) => YD + H + kick(x) + holte(z);

// opbouw: root > leun (opzij leunen) > wip (kantelen om de achteras, voor de staart) > bord (alles)
const leun = new THREE.Group(), wip = new THREE.Group(), bord = new THREE.Group();
wip.position.set(-TX, R, 0); bord.position.set(TX, -R, 0);
ctx.root.add(leun); leun.add(wip); wip.add(bord);

// ---- de plank: doorsneden langs x, elk een afgeronde strook; drie stukken (staart, midden, neus)
function plankStuk(xs, kapBegin, kapEind) {
  const nT = 18, nA = 7, pos = [], idx = [];
  let per = 0;
  for (const x of xs) {
    const half = Math.max(0, breed(x) / 2 - H / 2), ring = [], yR = boven(x, half) - H / 2;
    for (let i = 0; i <= nT; i++) { const z = -half + (2 * half * i) / nT; ring.push([x, boven(x, z), z]); }
    for (let i = 1; i < nA; i++) { const a = Math.PI / 2 - (Math.PI * i) / nA; ring.push([x, yR + (Math.sin(a) * H) / 2, half + (Math.cos(a) * H) / 2]); }
    for (let i = 0; i <= nT; i++) { const z = half - (2 * half * i) / nT; ring.push([x, boven(x, z) - H, z]); }
    for (let i = 1; i < nA; i++) { const a = -Math.PI / 2 - (Math.PI * i) / nA; ring.push([x, yR + (Math.sin(a) * H) / 2, -half + (Math.cos(a) * H) / 2]); }
    per = ring.length; for (const p of ring) pos.push(...p);
  }
  const n = xs.length, streep = [];
  // de rand: de vlakjes van de twee bogen om en om hout en lijm, zo zie je de laagjes
  const isStreep = (j) => { const r = j - nT, l = j - (2 * nT + nA); return (r >= 0 && r < nA && r % 2 === 1) || (l >= 0 && l < nA && l % 2 === 1); };
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < per; j++) { const a = i * per + j, b = i * per + ((j + 1) % per), c = a + per, d = b + per; (isStreep(j) ? streep : idx).push(a, b, c, b, d, c); }
  const kap = (ri, naarVoren) => {
    let cx = 0, cy = 0, cz = 0; for (let j = 0; j < per; j++) { cx += pos[(ri * per + j) * 3]; cy += pos[(ri * per + j) * 3 + 1]; cz += pos[(ri * per + j) * 3 + 2]; }
    const ci = pos.length / 3; pos.push(cx / per, cy / per, cz / per);
    for (let j = 0; j < per; j++) { const a = ri * per + j, b = ri * per + ((j + 1) % per); naarVoren ? idx.push(ci, a, b) : idx.push(ci, b, a); }
  };
  if (kapBegin) kap(0, false); if (kapEind) kap(n - 1, true);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex([...idx, ...streep]); g.computeVertexNormals();
  const hout = new THREE.BufferGeometry(), lijm = new THREE.BufferGeometry();
  for (const x of [hout, lijm]) { x.setAttribute("position", g.attributes.position); x.setAttribute("normal", g.attributes.normal); }
  hout.setIndex(idx); lijm.setIndex(streep);
  return [hout, lijm];
}
const neusX = Array.from({ length: 52 }, (_, i) => KS + (L2 - KS) * Math.sin(((i / 51) * Math.PI) / 2));
const staartX = neusX.map((x) => -x).reverse();
const middenX = Array.from({ length: 33 }, (_, i) => -KS + (2 * KS * i) / 32);
const plank = new THREE.Group();
const stuk = (xs, b, e, deel) => { const [h, l] = plankStuk(xs, b, e), m = mesh(h, HOUT, deel); plank.add(m, mesh(l, LIJM, deel)); return m; };
const midden = stuk(middenX, false, false, "plank"), neus = stuk(neusX, false, true, "neus"), staart = stuk(staartX, true, false, "staart");
// een vel op of onder de plank (griptape boven, gekleurde laklaag onder)
function vel(inspring, dy, onder) {
  const xs = [...staartX, ...middenX.slice(1, -1), ...neusX], nT = 22, pos = [], idx = [];
  for (const x of xs) {
    const half = Math.max(0, breed(x) / 2 - H / 2 - inspring);
    for (let i = 0; i <= nT; i++) { const z = -half + (2 * half * i) / nT; pos.push(x, boven(x, z) + (onder ? -H - dy : dy), z); }
  }
  const per = nT + 1;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < nT; j++) { const a = i * per + j, b = a + 1, c = a + per, d = c + 1; onder ? idx.push(a, c, b, b, c, d) : idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const onderlaag = mesh(vel(0.0035, 0.00045, true), ONDER, "plank");
plank.add(onderlaag);
const grip = mesh(vel(0.0009, 0.0006, false), GRIP, "griptape");
bord.add(plank, grip);

// ---- schroeven: acht bouten door de plank, met de koppen in de griptape
const GATEN = [];
for (const k of [1, -1]) for (const dx of [-0.027, 0.027]) for (const dz of [-0.0205, 0.0205]) GATEN.push([k * TX + dx, dz]);
const schroeven = new THREE.Group();
{
  const koppen = [], gat = [], stelen = [];
  for (const [x, z] of GATEN) {
    const y = boven(x, z);
    koppen.push(new THREE.CylinderGeometry(0.0042, 0.0036, 0.0014, 24).translate(x, y + 0.0004, z));
    gat.push(new THREE.CylinderGeometry(0.0017, 0.0017, 0.0004, 6).translate(x, y + 0.0012, z));
    stelen.push(new THREE.CylinderGeometry(0.0021, 0.0021, 0.03, 10).translate(x, YD - 0.012 + 0.003, z));
  }
  schroeven.add(mesh(samen(koppen), "zwartmetaal", "schroeven"), mesh(samen(gat), "spaak", "schroeven"), mesh(samen(stelen), "zwartmetaal", "schroeven"));
  bord.add(schroeven); G.schroefKop = schroeven.children[0];
}

// ---- de trucks
// In een truck: x wijst naar het eind van de plank, de oorsprong ligt tegen de onderkant van de plank.
const D = V(-Math.sin(0.7), -Math.cos(0.7), 0).normalize(); // richting van de kingpin en de draaias: schuin omlaag, naar het midden
const K0 = V(-0.01, -0.009, 0), P = V(0.028, -0.02, 0), AS = V(0, R - YD, 0);
const qD = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), D);
function langs(geo, basis, s) { geo.applyQuaternion(qD); const p = basis.clone().addScaledVector(D, s); geo.translate(p.x, p.y, p.z); return geo; }
const ring = (rBinnen, rBuiten, h, af = 0.0012, seg = 40) => new THREE.LatheGeometry([[rBinnen, 0], [rBuiten - af, 0], [rBuiten, af], [rBuiten, h - af], [rBuiten - af, h], [rBinnen, h], [rBinnen, 0]].map(([r, y]) => new THREE.Vector2(r, y)), seg);
const moer = (r, h) => new THREE.CylinderGeometry(r, r, h, 6).translate(0, h / 2, 0);
function plaat(lx, ly, lz, r, b = 0.0008) {
  const s = new THREE.Shape(), hx = lx / 2 - b, hz = lz / 2 - b, rr = Math.min(r, hx, hz);
  s.moveTo(-hx + rr, -hz); s.lineTo(hx - rr, -hz); s.quadraticCurveTo(hx, -hz, hx, -hz + rr); s.lineTo(hx, hz - rr); s.quadraticCurveTo(hx, hz, hx - rr, hz);
  s.lineTo(-hx + rr, hz); s.quadraticCurveTo(-hx, hz, -hx, hz - rr); s.lineTo(-hx, -hz + rr); s.quadraticCurveTo(-hx, -hz, -hx + rr, -hz);
  const d = Math.max(0.0002, ly - 2 * b);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -d / 2); g.rotateX(Math.PI / 2); g.computeVertexNormals(); return g;
}
// een wiel: polyurethaan met twee kogellagers (buitenring, binnenring, kapjes en zeven kogeltjes)
function wiel() {
  const w = new THREE.Group();
  const prof = [[0.0111, -0.016], [0.0175, -0.016], [0.0215, -0.0157], [0.0243, -0.0143], [0.0259, -0.0118], [0.0265, -0.0088], [0.0265, 0.0088], [0.0259, 0.0118], [0.0243, 0.0143], [0.0215, 0.0157], [0.0175, 0.016], [0.0111, 0.016],
    [0.0111, 0.0085], [0.0094, 0.0085], [0.0094, -0.0085], [0.0111, -0.0085], [0.0111, -0.016]];
  w.add(mesh(draai(prof, 64), URE, "wielen"));
  const lager = new THREE.Group(), races = [], kapjes = [], kogels = [];
  for (const zc of [0.012, -0.012]) {
    races.push(draai([[0.0098, -0.0035], [0.011, -0.0035], [0.011, 0.0035], [0.0098, 0.0035], [0.0098, -0.0035]], 40).translate(0, 0, zc));
    races.push(draai([[0.004, -0.0035], [0.0056, -0.0035], [0.0056, 0.0035], [0.004, 0.0035], [0.004, -0.0035]], 32).translate(0, 0, zc));
    kapjes.push(draai([[0.0098, 0.003], [0.0056, 0.003]], 40).translate(0, 0, zc), draai([[0.0056, -0.003], [0.0098, -0.003]], 40).translate(0, 0, zc));
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; kogels.push(new THREE.SphereGeometry(0.0019, 12, 8).translate(Math.cos(a) * 0.0077, Math.sin(a) * 0.0077, zc)); }
  }
  const kap = mesh(samen(kapjes), KAP, "lagers"); kap.userData.romp = true; G.kappen.push(kap);
  lager.add(mesh(samen(races), "metaal", "lagers"), kap, mesh(samen(kogels), KOGEL, "lagers"));
  w.add(lager); G.lagers.push(lager);
  return w;
}
function truck(k) {
  const t = new THREE.Group(); t.position.set(k * TX, YD, 0); if (k < 0) t.rotation.y = Math.PI;
  // riser (rubber plaatje) en baseplate (de voet die aan de plank vastzit)
  const riser = op(mesh(plaat(0.074, 0.003, 0.06, 0.007), "rubber", "trucks"), 0, -0.0015, 0);
  const bp = [plaat(0.07, 0.006, 0.058, 0.008).translate(0, -0.006, 0)];
  bp.push(langs(new THREE.CylinderGeometry(0.0125, 0.0125, 0.0075, 32).translate(0, 0.00375, 0), K0, -0.002)); // zitting van de kingpin
  bp.push(langs(new THREE.CylinderGeometry(0.0088, 0.0094, 0.016, 28).translate(0, 0.008, 0), P, -0.0145));   // huis van de draaipen
  bp.push(new THREE.BoxGeometry(0.04, 0.007, 0.012).translate(0.008, -0.0115, 0));                           // rib
  for (const dz of [-1, 1]) bp.push(new THREE.BoxGeometry(0.05, 0.005, 0.004).translate(0.004, -0.0105, dz * 0.022));
  const baseplate = groep(mesh(samen(bp), "metaal", "trucks"));
  const moertjes = [];
  for (const dx of [-0.027, 0.027]) for (const dz of [-0.0205, 0.0205]) moertjes.push(moer(0.0042, 0.0042).translate(dx, -0.0132, dz));
  baseplate.add(mesh(samen(moertjes), "zwartmetaal", "schroeven"));
  // kingpin met de bushings (rubbers), het kommetje en de moer
  const kingpin = mesh(langs(new THREE.CylinderGeometry(0.0045, 0.0045, 0.056, 16).translate(0, 0.028, 0), K0, -0.002), "zwartmetaal", "trucks");
  const busBoven = mesh(langs(ring(0.0046, 0.0098, 0.0115, 0.0018), K0, 0.0045), BUS, "bushings");
  const busOnder = mesh(langs(new THREE.LatheGeometry([[0.0046, 0], [0.0085, 0], [0.0092, 0.0015], [0.0084, 0.0095], [0.0075, 0.011], [0.0046, 0.011], [0.0046, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 40), K0, 0.0285), BUS, "bushings");
  const kom = mesh(langs(ring(0.0046, 0.0102, 0.0018, 0.0006), K0, 0.0395), "metaal", "bushings");
  const kpMoer = mesh(langs(moer(0.0068, 0.006), K0, 0.0413), "zwartmetaal", "bushings");
  const draaiKom = mesh(langs(ring(0.003, 0.0072, 0.006, 0.001), P, -0.0035), BUS, "bushings");
  const rubbers = groep(busOnder, kom, kpMoer);
  // de hanger draait om de schuine as door het kommetje van de draaipen (P), in de richting van de kingpin
  const hanger = new THREE.Group(); hanger.position.copy(P);
  const rel = (v) => v.clone().sub(P);
  const H0 = K0.clone().addScaledVector(D, 0.022), uit = V(Math.cos(0.7), -Math.sin(0.7), 0);
  const hg = [];
  hg.push(langs(ring(0.0047, 0.0122, 0.0115, 0.002, 36), rel(K0), 0.0165));                                    // oog om de kingpin
  hg.push(buis([rel(H0.clone().addScaledVector(uit, 0.004)), rel(V(-0.012, -0.044, 0)), rel(V(-0.003, AS.y + 0.002, 0))], (t) => [0.0085 + 0.002 * t, 0.0105 - 0.001 * t], { seg: 24, rond: 20 }));
  hg.push(buis(Array.from({ length: 9 }, (_, i) => rel(V(0.0, AS.y, -0.066 + (0.132 * i) / 8))), (t) => { const m = 1 - Math.abs(2 * t - 1); return [0.0068 + 0.0062 * m ** 1.6, 0.0068 + 0.0042 * m ** 1.6]; }, { seg: 40, rond: 22 }));
  hg.push(buis([rel(V(0.004, AS.y + 0.004, 0)), rel(P.clone().addScaledVector(D, 0.03)), rel(P.clone().addScaledVector(D, 0.002))], (t) => [0.0068 - 0.0022 * t, 0.0068 - 0.0022 * t], { seg: 18, rond: 16 }));
  const hangerM = mesh(samen(hg), "metaal", "trucks");
  const as = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.213, 14).rotateX(Math.PI / 2).translate(-P.x, AS.y - P.y, 0), "metaal", "trucks");
  const kl = [];
  for (const s of [1, -1]) {
    kl.push(ring(0.004, 0.0058, 0.001, 0.0003, 20).rotateX(Math.PI / 2).translate(0, 0, s > 0 ? 0.067 : -0.066), ring(0.004, 0.0058, 0.001, 0.0003, 20).rotateX(Math.PI / 2).translate(0, 0, s > 0 ? 0.1 : -0.099));
    kl.push(moer(0.0066, 0.0058).rotateX(s > 0 ? Math.PI / 2 : -Math.PI / 2).translate(0, 0, s * 0.1)); // borgmoer
  }
  const asMoeren = mesh(samen(kl).translate(-P.x, AS.y - P.y, 0), "zwartmetaal", "lagers");
  hanger.add(hangerM, as, asMoeren);
  for (const s of [1, -1]) { const w = wiel(); w.position.set(-P.x, AS.y - P.y, s * 0.083); hanger.add(w); G.wielen.push(w); G[(k > 0 ? "wielV" : "wielA") + (s > 0 ? "R" : "L")] = w; }
  t.add(riser, baseplate, kingpin, busBoven, draaiKom, rubbers, hanger);
  bord.add(t);
  G.trucks.push(t); G.hangers.push({ hanger, k });
  return { t, riser, baseplate, kingpin, busBoven, rubbers, hanger };
}
const TV = truck(1), TA = truck(-1);

// ================= Teksten (maten zijn die van de tekening) =================
const SECTIES = [
  { sleutel: "skateboard", naam: "Het skateboard", titel: "Het skateboard", tekst: "Een plank op vier wieltjes. Je zet af met één voet en rolt dan verder. Leun je opzij, dan maakt het bord een bocht.", cam: [0.72, 0.42, 1.45, [0, 0.07, 0], 32], focus: null, rollen: true,
    specs: [["Lengte", "81 cm in de tekening"], ["Breedte", "20,5 cm"], ["Wielen", "4, van 53 mm"], ["Kogellagers", "8, twee in elk wiel"]],
    namen: [["neus", "NEUS", 50, -50], ["grip", "GRIPTAPE", -40, -130], ["truckV", "TRUCK", 60, 40], ["wielAL", "WIEL", -60, 40]] },
  { sleutel: "plank", naam: "De plank", titel: "De plank (het deck)", tekst: "De plank is gemaakt van zeven dunne laagjes hout, op elkaar gelijmd. Voor en achter buigt hij omhoog: de neus en de staart. Trap je op de staart, dan gaat de neus omhoog.", cam: [0.32, 0.22, 1.5, [0, 0.12, 0], 30], focus: ["plank", "neus", "staart"], pop: true,
    specs: [["Hout", "7 laagjes esdoorn"], ["Dikte", "11,5 mm"], ["Neus en staart", "ongeveer 19° omhoog"], ["Hol in de breedte", "5,5 mm in de tekening"]],
    namen: [["neus", "NEUS", 40, -50], ["staart", "STAART", -50, -40], ["plank", "7 LAAGJES HOUT", 40, 60]] },
  { sleutel: "griptape", naam: "De griptape", titel: "De griptape", tekst: "Bovenop zit griptape. Dat is ruw, net als schuurpapier. Daardoor glijden je schoenen niet weg. Door de griptape heen zie je de koppen van acht schroeven.", cam: [0.45, 0.85, 1.65, [0.03, 0.08, 0], 30], focus: ["griptape", "schroeven"],
    specs: [["Oppervlak", "ruw, zoals schuurpapier"], ["Kleur", "zwart"], ["Schroeven", "8, vier per truck"]],
    namen: [["grip", "GRIPTAPE", -90, -150], ["schroef", "SCHROEVEN", 120, 150]] },
  { sleutel: "trucks", naam: "De trucks", titel: "De trucks", tekst: "Onder de plank zitten twee trucks: de assen met de wielen. Leun je opzij, dan draaien de assen een beetje mee en maak je een bocht. De rubbertjes duwen ze weer recht.", cam: [1.2, 0.06, 0.78, [0.2, 0.045, 0], 30], focus: ["trucks", "bushings"], kantel: true,
    specs: [["Trucks", "2, 20 cm breed"], ["Onderdelen", "voet, hanger, kingpin"], ["Rubbertjes", "2 per truck"], ["Wielbasis", "36 cm in de tekening"]],
    namen: [["baseplate", "VOET (BASEPLATE)", 90, -90], ["hanger", "HANGER", 110, 70], ["kingpin", "KINGPIN", -110, -80], ["bushing", "RUBBERTJES", -110, 60]] },
  { sleutel: "wielen", naam: "De wielen", titel: "De wielen", tekst: "Vier harde wieltjes van polyurethaan, een soort kunststof. Kleine wielen zijn licht. Daarmee kun je makkelijk trucjes doen.", cam: [0.6, 0.2, 0.85, [0.15, 0.03, 0.04], 30], focus: ["wielen"], rollen: true,
    specs: [["Wielen", "4"], ["Doorsnede", "53 mm"], ["Breedte", "32 mm"], ["Materiaal", "polyurethaan"]],
    namen: [["wielVR", "WIEL", 90, 60], ["wielAR", "WIEL", -90, 60]] },
  { sleutel: "lagers", naam: "De kogellagers", titel: "De kogellagers", tekst: "In elk wiel zitten twee kogellagers. Binnenin rollen zeven kleine kogeltjes rond. Daardoor draait het wiel zo makkelijk om de as.", cam: [0.18, 0.08, 0.36, [0.208, 0.03, 0.1], 28], focus: ["lagers"], rollen: true, doorzicht: true,
    specs: [["Lagers", "8, twee in elk wiel"], ["Kogeltjes", "7 in elk lager"], ["Buitenmaat", "22 mm"], ["Breedte", "7 mm"]],
    namen: [["lagerV", "KOGELLAGER", 130, -110], ["asMoer", "MOER OP DE AS", -140, 90]] },
];
const KIND = [
  { naam: "het skateboard", focus: ["plank", "neus", "staart", "griptape"], cam: [0.72, 0.42, 1.45, [0, 0.07, 0], 32], rollen: true, geluid: "rol" },
  { naam: "de plank", focus: ["plank", "neus", "staart"], cam: [0.32, 0.22, 1.5, [0, 0.12, 0], 30] },
  { naam: "de staart", focus: ["staart"], cam: [-0.5, 0.25, 1.2, [-0.15, 0.1, 0], 30], pop: true },
  { naam: "de griptape", focus: ["griptape"], cam: [0.45, 0.85, 1.5, [0.03, 0.08, 0], 30] },
  { naam: "de trucks", focus: ["trucks", "bushings"], cam: [1.2, 0.06, 0.78, [0.2, 0.045, 0], 30], kantel: true },
  { naam: "de wielen", focus: ["wielen"], cam: [0.6, 0.2, 0.85, [0.15, 0.03, 0.04], 30], rollen: true, geluid: "rol" },
  { naam: "de kogellagers", focus: ["lagers"], cam: [0.18, 0.08, 0.3, [0.208, 0.026, 0.1], 28], rollen: true, doorzicht: true, geluid: "rol" },
  { naam: "de schroeven", focus: ["schroeven"], cam: [0.5, 0.95, 0.9, [0.15, 0.08, 0], 30] },
];

function mini(aan) {
  const sx = (x) => 60 + x * 125, sy = (y) => 50 - y * 125;
  const xs = Array.from({ length: 41 }, (_, i) => -L2 + (2 * L2 * i) / 40);
  const top = xs.map((x) => [sx(x), sy(boven(x, 0))]), bodem = xs.slice().reverse().map((x) => [sx(x), sy(boven(x, 0) - H)]);
  const pad = (p) => p.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  let s = `<path d="${pad([...top, ...bodem])}Z" class="${aan("plank") || aan("neus") || aan("staart")}"/>`;
  s += `<path d="${pad(xs.filter((x) => breed(x) > 0.05).map((x) => [sx(x), sy(boven(x, 0)) - 1.2]))}" class="${aan("griptape")}"/>`;
  for (const k of [1, -1]) {
    const x0 = sx(k * TX), yb = sy(YD), ya = sy(R);
    s += `<path d="M${x0 - 4.5},${yb}L${x0 + 4.5},${yb}L${x0 + 2},${yb + 2.4}L${x0 + 1},${ya}L${x0 - 1},${ya}L${x0 - 3},${yb + 2}Z" class="${aan("trucks") || aan("bushings")}"/>`;
    s += `<circle cx="${x0}" cy="${ya}" r="${(R * 125).toFixed(1)}" class="${aan("wielen")}"/><circle cx="${x0}" cy="${ya}" r="1.3" class="${aan("lagers")}"/>`;
  }
  return s;
}

const qT = new THREE.Quaternion();
let wielHoek = 0, kantel = 0, kantelT = 0, pop = 0, popT = 0;
function beweeg(dt, h, s) {
  let bezig = false;
  if (h.rollen || s.uiteen) { wielHoek -= dt * (s.uiteen ? 3 : 5); for (const w of G.wielen) w.rotation.z = wielHoek; bezig = true; }
  if (h.kantel && !s.uiteen) kantelT += dt;
  const kDoel = h.kantel && !s.uiteen ? Math.sin(kantelT * 1.5) * 0.24 : 0;
  kantel += (kDoel - kantel) * Math.min(1, dt * 5);
  for (const { hanger, k } of G.hangers) { qT.setFromAxisAngle(D, kantel * k); hanger.quaternion.copy(qT); }
  leun.rotation.x = Math.sin(0.7) * kantel; // de plank leunt mee, de wielen blijven op de grond
  if (h.pop && !s.uiteen) popT += dt;
  const pDoel = h.pop && !s.uiteen ? 0.44 * Math.max(0, Math.sin(popT * 1.7)) ** 0.7 : 0;
  pop += (pDoel - pop) * Math.min(1, dt * 6); wip.rotation.z = pop;
  if (h.kantel || h.pop || Math.abs(kantel) > 1e-4 || pop > 1e-4) bezig = true;
  return bezig;
}

return {
  titel: "Het skateboard", label: "Skateboard", model: "Skateboard · 4 wielen", schaal: "Maten in meters", hint: "Sleep om te draaien", SECTIES, KIND, mini, beweeg,
  anker: () => ({ plank: midden, neus, staart, grip, schroef: G.schroefKop, truckV: TV.t, baseplate: TV.baseplate, hanger: TV.hanger.children[0], kingpin: TV.kingpin, bushing: TV.busBoven,
    wielVR: G.wielVR, wielVL: G.wielVL, wielAL: G.wielAL, wielAR: G.wielAR, lagerV: G.wielVR.children[1], asMoer: TV.hanger.children[2] }),
  uiteenCam: [0.6, 0.5, 1.65, [0, 0.14, 0], 32],
  uiteen: () => [
    [schroeven, [0, 0.31, 0], "SCHROEVEN", [-30, -110]], [grip, [0, 0.23, 0], "GRIPTAPE", [80, -40]], [plank, [0, 0.15, 0], "PLANK", [-80, 20]],
    [TV.riser, [0, 0.095, 0], null], [TA.riser, [0, 0.095, 0], null],
    [TV.baseplate, [0, 0.055, 0], "VOET", [70, -30]], [TA.baseplate, [0, 0.055, 0], null], [TV.kingpin, [0, 0.055, 0], null], [TA.kingpin, [0, 0.055, 0], null],
    [TV.busBoven, [0, 0.025, 0], null], [TA.busBoven, [0, 0.025, 0], null],
    [TV.rubbers, [-0.06, -0.012, 0], "RUBBERTJES", [-70, 30]], [TA.rubbers, [0.06, -0.012, 0], null],
    [TV.hanger, [0.0, 0.0, 0], "HANGER", [70, 10]], [TA.hanger, [0, 0, 0], null],
    [G.wielVR, [0, 0, 0.075], "WIEL", [60, 40]], [G.wielVL, [0, 0, -0.075], null], [G.wielAR, [0, 0, 0.075], null], [G.wielAL, [0, 0, -0.075], null],
    [G.wielVR.children[1], [0, 0, 0.05], "KOGELLAGERS", [70, -10]], [G.wielVL.children[1], [0, 0, -0.05], null], [G.wielAR.children[1], [0, 0, 0.05], null], [G.wielAL.children[1], [0, 0, -0.05], null],
  ],
};
}
