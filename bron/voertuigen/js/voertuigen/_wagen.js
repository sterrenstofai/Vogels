// Gedeelde onderdelen voor de vrachtwagen en de vuilniswagen: cabine, wielen, chassis, assen, tank, motor, lampen.
// Geen voertuig: de motor laadt alleen /js/voertuigen/<slug>.js. Maten in meters, de voorkant wijst naar +x, rechts is +z.
import { toCreasedNormals } from "/js/vendor/BufferGeometryUtils.js";

export function maakWagen(ctx) {
const { THREE, V, TAU, mesh, groep, op, samen, rondeDoos, staaf, soort } = ctx;

// ---- materialen (eerste kleur = stand "Tekening", object = stand "Donker")
const S = {
  wit: soort("cabinewit", 0xfbfbf9, { color: 0xe4e6e8, roughness: 0.32, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
  chassis: soort("chassiszwart", 0xb4b6b8, { color: 0x1e1f21, roughness: 0.55, metalness: 0.45 }),
  kunststof: soort("kunststof", 0xdadad7, { color: 0x2a2b2d, roughness: 0.72, metalness: 0 }),
  velg: soort("velggrijs", 0xeeeeeb, { color: 0xa9adb2, roughness: 0.3, metalness: 0.75 }),
  oranje: soort("oranjelicht", 0xffd9b0, { color: 0xd98a2e, roughness: 0.2, metalness: 0, emissive: 0xff8a1a, emissiveIntensity: 0 }),
  bumper: soort("bumpergrijs", 0xe6e6e3, { color: 0x55585c, roughness: 0.5, metalness: 0.2, clearcoat: 0.3 }),
};

// ---- vormhulpjes
// een veelhoek met afgeronde hoeken: [[x, y, straal], ...]
function rondVorm(pts, vorm = new THREE.Shape()) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = pts[i], [px, py] = pts[(i - 1 + n) % n], [nx, ny] = pts[(i + 1) % n];
    if (!r) { if (i === 0) vorm.moveTo(x, y); else vorm.lineTo(x, y); continue; }
    const l1 = Math.hypot(px - x, py - y), l2 = Math.hypot(nx - x, ny - y), a = Math.min(r, l1 / 2), b = Math.min(r, l2 / 2);
    const ax = x + ((px - x) / l1) * a, ay = y + ((py - y) / l1) * a, bx = x + ((nx - x) / l2) * b, by = y + ((ny - y) / l2) * b;
    if (i === 0) vorm.moveTo(ax, ay); else vorm.lineTo(ax, ay);
    vorm.quadraticCurveTo(x, y, bx, by);
  }
  vorm.closePath(); return vorm;
}
// een plaat met die omtrek (in het x-y-vlak), dikte langs z, gecentreerd op z = 0
function plaat(pts, dikte, bev = 0, o = {}) {
  const vorm = pts instanceof THREE.Shape ? pts : rondVorm(pts);
  let g = new THREE.ExtrudeGeometry(vorm, { depth: Math.max(0.0005, dikte - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: o.bevelSize ?? bev, bevelSegments: o.seg ?? 3, curveSegments: o.curve ?? 10 });
  g.translate(0, 0, -(dikte - 2 * bev) / 2);
  g.deleteAttribute("uv");
  g = o.glad ? toCreasedNormals(g, o.glad) : (g.computeVertexNormals(), g);
  return g;
}
// een strook langs een lijn van punten (x, y) met dikte t naar één kant: voor gebogen platen
function strook(pts, t) {
  const binnen = pts.map(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(bx - ax, by - ay);
    return [x - ((by - ay) / l) * t, y + ((bx - ax) / l) * t];
  });
  return [...pts, ...binnen.reverse()];
}
const doos = (x, y, z, px, py, pz, r = 0.01) => rondeDoos(x, y, z, Math.min(r, x / 2.2, y / 2.2, z / 2.2)).translate(px, py, pz);
const cil = (r, l, px, py, pz, as = "z", seg = 20) => { const g = new THREE.CylinderGeometry(r, r, l, seg); if (as === "z") g.rotateX(Math.PI / 2); else if (as === "x") g.rotateZ(Math.PI / 2); return g.translate(px, py, pz); };
const lijn = (pts, r, seg = 6) => samen(pts.slice(1).map((p, i) => staaf(pts[i], p, r, seg)));

// ================= Wielen =================
// band met profiel: een draaivorm (wangen en loopvlak) plus losse blokjes; as langs z
function band(R, B, Rr, stijl = "blok") {
  const h = B / 2, k = R - 0.018, p = [];
  const wang = [[Rr + 0.012, -h * 0.8], [Rr + 0.045, -h * 0.97], [Rr + (R - Rr) * 0.5, -h * 1.03], [R - 0.06, -h * 0.99], [R - 0.03, -h * 0.92], [k, -h * 0.8]];
  p.push(...wang);
  if (stijl === "rib") for (const [a, b] of [[-0.8, -0.56], [-0.48, -0.1], [-0.02, 0.4], [0.48, 0.8]]) p.push([k, h * a + 0.001], [R, h * a + 0.006], [R, h * b - 0.006], [k, h * b - 0.001]);
  p.push(...wang.slice().reverse().map(([r, z]) => [r, -z]));
  const lathe = new THREE.LatheGeometry(p.map(([r, z]) => new THREE.Vector2(r, z)), 72); lathe.rotateX(Math.PI / 2); lathe.deleteAttribute("uv");
  const lijf = toCreasedNormals(lathe, 0.6);
  let blok = null;
  if (stijl === "blok") {
    const n = Math.round((TAU * R) / 0.07), st = TAU / n, bl = [];
    for (let i = 0; i < n; i++) for (const [z, w, d] of [[-h * 0.5, h * 0.56, 0], [h * 0.5, h * 0.56, 0.5], [0, h * 0.3, 0.25]]) {
      const b = new THREE.BoxGeometry(st * R * (z ? 0.62 : 0.4), 0.022, w); b.translate(0, k + 0.007, z); b.rotateZ((i + d) * st); bl.push(b);
    }
    blok = samen(bl);
  }
  return { lijf, blok };
}
// stalen velg met schotel, handgaten, naaf en tien moeren; de buitenkant wijst naar +z
function velg(Rr, B) {
  const h = B / 2, zd = h * 0.38;
  const schotel = new THREE.LatheGeometry([[Rr + 0.02, h * 0.92], [Rr + 0.003, h * 0.85], [Rr - 0.014, h * 0.72], [Rr - 0.05, h * 0.5], [0.27, zd + 0.006]].map(([r, z]) => new THREE.Vector2(r, z)), 64);
  schotel.rotateX(Math.PI / 2);
  const vorm = new THREE.Shape(); vorm.absarc(0, 0, 0.272, 0, TAU, false);
  const gat = new THREE.Path(); gat.absarc(0, 0, 0.142, 0, TAU, true); vorm.holes.push(gat);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2, g = new THREE.Path(); g.absellipse(Math.cos(a) * 0.222, Math.sin(a) * 0.222, 0.026, 0.026, 0, TAU, true); vorm.holes.push(g); }
  const schijf = new THREE.ExtrudeGeometry(vorm, { depth: 0.014, bevelEnabled: false, curveSegments: 14 }); schijf.translate(0, 0, zd - 0.008);
  const binnen = new THREE.CylinderGeometry(Rr - 0.004, Rr - 0.004, B * 0.82, 48, 1, true); binnen.rotateX(Math.PI / 2); // de velgbedding achter de schotel
  binnen.scale(1, 1, 1).index && binnen.index.array.reverse(); // naar binnen gericht (je kijkt erin door de handgaten)
  const velgG = samen([schotel, schijf, binnen]);
  const moeren = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; moeren.push(new THREE.CylinderGeometry(0.0165, 0.0165, 0.034, 6).rotateX(Math.PI / 2).translate(Math.cos(a) * 0.1675, Math.sin(a) * 0.1675, zd + 0.022)); }
  moeren.push(cil(0.125, 0.07, 0, 0, zd + 0.03, "z", 32), cil(0.085, 0.05, 0, 0, zd + 0.08, "z", 28), cil(0.05, 0.03, 0, 0, zd + 0.115, "z", 20));
  return { velgG, naaf: samen(moeren) };
}
// een wiel (of een dubbel wiel) als draaibare groep; kant +1 = rechts (velg naar +z), -1 = links
const wielCache = new Map();
function wiel({ D = 1.02, B = 0.315, kant = 1, stijl = "blok", dubbel = false, deel = "wielen" }) {
  const R = D / 2, Rr = 0.2858, sleutel = [D, B, stijl, dubbel, kant].join();
  let geo = wielCache.get(sleutel);
  if (!geo) {
    const { lijf, blok } = band(R, B, Rr, stijl), { velgG, naaf } = velg(Rr, B), dz = dubbel ? B / 2 + 0.018 : 0;
    const zet = (g, z) => { const c = g.clone(); c.translate(0, 0, z); return c; };
    const banden = dubbel ? [zet(lijf, dz), zet(lijf, -dz)] : [lijf], blokken = blok ? (dubbel ? [zet(blok, dz), zet(blok, -dz)] : [blok]) : [];
    const binnenVelg = dubbel ? [(() => { const c = velgG.clone(); c.rotateY(Math.PI); c.translate(0, 0, -dz); return c; })()] : [];
    geo = { band: samen(banden), blok: blokken.length ? samen(blokken) : null, velg: samen([zet(velgG, dz), ...binnenVelg]), naaf: zet(naaf, dz) };
    if (kant < 0) for (const g of Object.values(geo)) g?.rotateX(Math.PI);
    wielCache.set(sleutel, geo);
  }
  const g = new THREE.Group();
  g.add(mesh(geo.band, "rubber", deel), mesh(geo.velg, S.velg, deel), mesh(geo.naaf, "metaal", deel));
  if (geo.blok) g.add(mesh(geo.blok, "loopvlak", deel));
  return g;
}

// ================= Chassis =================
// een C-profiel langs x (de opening naar binnen), bovenkant op yBoven
function balk(x0, x1, yBoven, hoog, z, deel = "chassis", flens = 0.075, t = 0.012) {
  const s = Math.sign(z) || 1, f = flens;
  const pts = [[0, 0], [0, hoog], [f, hoog], [f, hoog - t], [t, hoog - t], [t, t], [f, t], [f, 0]].map(([u, y]) => [u, y]);
  const vorm = new THREE.Shape(); pts.forEach(([u, y], i) => (i ? vorm.lineTo(u, y) : vorm.moveTo(u, y))); vorm.closePath();
  const g = new THREE.ExtrudeGeometry(vorm, { depth: x0 - x1, bevelEnabled: false }); g.deleteAttribute("uv");
  g.rotateY(Math.PI / 2); // vorm-x -> -z, uittrekken -> +x
  if (s < 0) g.rotateX(Math.PI).translate(0, hoog, 0); // spiegelen naar links
  g.translate(x1, yBoven - hoog, z);
  return mesh(g, S.chassis, deel);
}
// een as met naven; aangedreven = met differentieelhuis; veer = "blad" of "lucht"
function as(x, spoor, y, { aangedreven = false, veer = "blad", balkZ = 0.43, yBalk = 0.8, deel = "chassis" } = {}) {
  const g = new THREE.Group(), stuk = [];
  stuk.push(cil(0.065, spoor - 0.32, x, y, 0, "z", 16));
  for (const k of [1, -1]) stuk.push(cil(0.11, 0.18, x, y, k * (spoor / 2 - 0.22), "z", 20));
  if (aangedreven) {
    const huis = new THREE.SphereGeometry(0.26, 24, 16); huis.scale(1, 0.95, 0.78); huis.translate(x, y, 0.05); stuk.push(huis, cil(0.1, 0.25, x + 0.28, y + 0.02, 0.05, "x", 16));
  }
  g.add(mesh(samen(stuk), S.chassis, deel));
  const veren = [];
  for (const k of [1, -1]) {
    const z = k * balkZ;
    if (veer === "blad") {
      for (let i = 0; i < 4; i++) { const l = 1.4 - i * 0.25; veren.push(doos(l, 0.022, 0.09, x, y + 0.09 + i * 0.024 - 0.02, z, 0.008)); }
      veren.push(doos(0.14, yBalk - y - 0.1, 0.1, x, (y + yBalk) / 2 + 0.05, z, 0.01));
    } else {
      veren.push(doos(0.5, 0.06, 0.12, x - 0.15, y + 0.08, z, 0.02));
      g.add(mesh(cil(0.15, Math.max(0.12, yBalk - y - 0.2), x - 0.32, (y + 0.12 + yBalk - 0.06) / 2, z, "y", 22), "rubber", deel));
    }
  }
  g.add(mesh(samen(veren), "zwartmetaal", deel));
  return g;
}
// brandstoftank van aluminium met banden en een dop
function tank(xm, L, y, z, deel = "tank", hoog = 0.62, diep = 0.6) {
  const g = new THREE.Group();
  g.add(mesh(rondeDoos(L, hoog, diep, 0.16).translate(xm, y, z), "metaal", deel));
  const banden = [];
  for (const dx of [-L * 0.3, L * 0.3]) banden.push(rondeDoos(0.06, hoog + 0.02, diep + 0.02, 0.12).translate(xm + dx, y, z));
  const s = Math.sign(z);
  banden.push(doos(0.12, 0.06, 0.16, xm - L * 0.3, y + hoog / 2 - 0.05, z - s * (diep / 2 + 0.06)), doos(0.12, 0.06, 0.16, xm + L * 0.3, y + hoog / 2 - 0.05, z - s * (diep / 2 + 0.06)));
  g.add(mesh(samen(banden), S.chassis, deel));
  g.add(mesh(cil(0.06, 0.05, xm + L * 0.32, y + hoog / 2 + 0.02, z + s * 0.12, "y", 18), S.kunststof, deel));
  return g;
}
// motorblok met cilinderkop, koeler en ventilator (onder de cabine)
function motorblok(x, y, deel = "motor") {
  const g = new THREE.Group();
  g.add(mesh(samen([doos(1.15, 0.55, 0.62, x, y, 0, 0.05), doos(0.9, 0.18, 0.5, x - 0.05, y - 0.36, 0, 0.04)]), "zwartmetaal", deel));
  g.add(mesh(samen([doos(1.05, 0.14, 0.5, x - 0.02, y + 0.34, 0, 0.05), cil(0.12, 0.16, x - 0.4, y + 0.1, -0.42, "z", 18), cil(0.07, 0.5, x - 0.1, y + 0.2, 0.36, "x", 14)]), S.velg, deel));
  g.add(mesh(doos(0.08, 0.75, 0.95, x + 0.72, y + 0.1, 0, 0.02), S.kunststof, deel));
  const fan = []; for (let i = 0; i < 7; i++) { const b = new THREE.BoxGeometry(0.02, 0.26, 0.07).translate(0, 0.15, 0).rotateY(0.4); b.rotateX((i / 7) * TAU); fan.push(b); }
  g.fan = op(new THREE.Group(), x + 0.62, y + 0.1, 0); g.fan.add(mesh(samen([...fan, cil(0.05, 0.06, 0, 0, 0, "x", 12)]), S.chassis, deel)); g.add(g.fan);
  return g;
}

// ================= De cabine =================
// Een frontstuurcabine (de motor eronder), getekend als een zijprofiel dat over de breedte is uitgetrokken met ronde randen.
// o: { x: voorkant, L, W, H: dak, yVoor: onderkant voor, yAchter: onderkant achter, wiel: [x, y, straal boog],
//      ruit: [onder, boven, terug], deurAchter: x achterkant deur, raamOnder, vloer, kleur, bed, ploeg, laag, deel }
function cabine(o) {
  const { x: xV, L, W, H, yVoor, yAchter, ruit: [yO, yB, terug], kleur = S.wit, deel = "cabine" } = o;
  const [xw, yw, ra] = o.wiel, b = 0.08, G = { g: new THREE.Group(), binnen: new THREE.Group(), lampen: [], knipper: [] };
  const d = V(-terug + 0.06, yB - yO, 0).normalize(), n = V(d.y, -d.x, 0); // langs de voorruit omhoog, en naar buiten
  const ws0 = V(xV - 0.06, yO, 0), ws1 = V(xV - terug, yB, 0);
  const rr = ra + b, aR = Math.PI - Math.asin(THREE.MathUtils.clamp((yAchter + b - yw) / rr, -1, 1)), aV = Math.asin(THREE.MathUtils.clamp((yVoor + b - yw) / rr, -1, 1));
  const boog = []; for (let i = 0; i <= 20; i++) { const a = aR + (aV - aR) * (i / 20); boog.push([xw + Math.cos(a) * rr, yw + Math.sin(a) * rr, 0]); }
  const prof = [
    [xV - b, yVoor + b, 0.05], [xV - b - 0.03, yO - 0.1, 0.1],
    [ws0.x - n.x * b, ws0.y - n.y * b, 0.06], [ws1.x - n.x * b, ws1.y - n.y * b, 0.16], [xV - terug - 0.2, H - b, 0.24],
    [xV - L + b, H - b, 0.12], [xV - L + b, yAchter + b, 0.04], ...boog,
  ];
  const schaal = mesh(plaat(prof, W, b, { seg: 5, glad: 0.7 }), kleur, deel);
  schaal.userData.romp = true; G.schaal = schaal; G.g.add(schaal);
  // voorruit met zwarte rand
  const lang = ws0.distanceTo(ws1), mid = ws0.clone().add(ws1).multiplyScalar(0.5), hoek = Math.atan2(d.y, d.x), breed = W - 2 * b - 0.05;
  const ruitG = rondeDoos(lang - 0.12, 0.024, breed - 0.04, 0.01).rotateZ(hoek).translate(mid.x + n.x * 0.014, mid.y + n.y * 0.014, 0);
  const randG = rondeDoos(lang - 0.04, 0.014, breed + 0.03, 0.006).rotateZ(hoek).translate(mid.x + n.x * 0.006, mid.y + n.y * 0.006, 0);
  // zijruiten: een deurraam (bij een ploegcabine ook een achterdeur)
  const zij = [], zijRand = [], naden = [], xDV = xV - 0.2;
  const opRuit = (y) => xV - 0.06 - ((terug - 0.06) * (y - yO)) / (yB - yO); // x van de voorruit op hoogte y
  const rO = o.raamOnder ?? yO + 0.05, rB = Math.min(yB - 0.04, H - 0.3), xDA = o.deurAchter;
  const deurRaam = [[opRuit(rO) - 0.2, rO, 0.04], [opRuit(rB) - 0.18, rB, 0.05], [xDA + 0.1, rB, 0.05], [xDA + 0.1, Math.max(rO, yO - 0.15), 0.05]];
  const ramen = o.ramen ?? [deurRaam];
  if (typeof o.ploeg === "number") ramen.push([[xDA - 0.1, rO, 0.04], [xDA - 0.1, rB, 0.05], [o.ploeg + 0.12, rB, 0.05], [o.ploeg + 0.12, rO, 0.04]]);
  if (o.laag && !o.ramen) ramen.push([[opRuit(rO) - 0.2, 0.82, 0.04], [opRuit(rO) - 0.22, rO - 0.12, 0.04], [xDA + 0.32, rO - 0.12, 0.04], [xDA + 0.32, 0.82, 0.04]]); // kijkraam laag in de deur
  for (const k of [1, -1]) for (const pts of ramen) {
    zij.push(plaat(pts, 0.014, 0.004).translate(0, 0, k * (W / 2 + 0.006)));
    zijRand.push(plaat(pts, 0.006, 0.002, { bevelSize: 0.018 }).translate(0, 0, k * (W / 2 + 0.002)));
  }
  // deurnaden (een dun lijntje rond elke deur)
  const yDO = o.laag ? yAchter + b + 0.04 : yAchter + b + 0.03, naadPts = (x0, x1, top) => [V(x0, yDO, 0), V(x0, yO - 0.05, 0), ...(top ? [V(opRuit(yO + 0.02) - 0.1, yO + 0.02, 0), V(opRuit(H - 0.25) - 0.1, H - 0.25, 0)] : [V(x0, H - 0.22, 0)]), V(x1, top ? H - 0.25 : H - 0.22, 0), V(x1, yDO, 0), V(x0, yDO, 0)];
  const deuren = [o.deurVoor ? naadPts(o.deurVoor, xDA, false) : naadPts(xDV - 0.05, xDA, true)];
  if (typeof o.ploeg === "number") deuren.push(naadPts(xDA - 0.04, o.ploeg, false));
  for (const k of [1, -1]) for (const pts of deuren) naden.push(lijn(pts.map((p) => V(p.x, p.y, k * (W / 2 + 0.003))), 0.007));
  const ruiten = mesh(samen([ruitG, ...zij]), "raam", deel), randen = mesh(samen([randG, ...zijRand]), S.kunststof, deel), naadM = mesh(samen(naden), "naad", deel);
  ruiten.userData.romp = randen.userData.romp = naadM.userData.romp = true;
  G.g.add(ruiten, randen, naadM); G.ruiten = ruiten;
  // grepen bij de deuren, handgreep naast de deur
  const grepen = [];
  for (const k of [1, -1]) {
    const z = k * (W / 2 + 0.02);
    grepen.push(doos(0.22, 0.045, 0.035, xDA + 0.2, yO - 0.18, z, 0.012));
    if (typeof o.ploeg === "number") grepen.push(doos(0.22, 0.045, 0.035, o.ploeg + 0.22, yO - 0.18, z, 0.012));
    grepen.push(lijn([V(xDA - 0.04, yAchter + 0.45, z), V(xDA - 0.08, yAchter + 0.5, z + k * 0.04), V(xDA - 0.08, yO + 0.2, z + k * 0.04), V(xDA - 0.04, yO + 0.25, z)], 0.016, 8));
  }
  G.g.add(mesh(samen(grepen), S.kunststof, deel));
  // grille, bumper, zonneklep
  const lean = Math.atan2(0.03, yO - 0.1 - yVoor); // de voorkant helt een beetje naar achteren
  const gy0 = yVoor + 0.55, gy1 = yO - 0.14, gx = xV + 0.002;
  const gril = [rondeDoos(0.03, gy1 - gy0, W - 0.62, 0.012).rotateZ(lean).translate(gx - 0.012, (gy0 + gy1) / 2, 0)], lat = [];
  const nl = Math.max(3, Math.round((gy1 - gy0) / 0.11));
  for (let i = 0; i < nl; i++) { const y = gy0 + ((i + 0.5) / nl) * (gy1 - gy0); lat.push(rondeDoos(0.03, 0.04, W - 0.7, 0.012).translate(gx - 0.015 * ((y - yVoor) / (yO - yVoor)) + 0.012, y, 0)); }
  G.g.add(mesh(samen(gril), "zwartmetaal", deel), mesh(samen(lat), o.latten ?? S.velg, deel));
  G.bumper = new THREE.Group();
  G.bumper.add(mesh(samen([doos(0.34, 0.42, W + 0.02, xV - 0.1, yVoor + 0.23, 0, 0.07)]), S.bumper, deel));
  G.bumper.add(mesh(samen([doos(0.3, 0.1, W - 0.1, xV - 0.08, yVoor - 0.0, 0, 0.03), doos(0.12, 0.05, 0.5, xV + 0.03, yVoor + 0.46, 0, 0.015)]), S.kunststof, deel));
  G.g.add(G.bumper);
  if (o.zonneklep !== false) G.g.add(mesh(rondeDoos(0.3, 0.04, W - 0.16, 0.015).rotateZ(-0.12).translate(ws1.x + 0.06, yB + 0.03, 0), kleur, deel));
  // koplampen, knipperlichten, mistlampen (deel "lichten")
  const glas = [], kop = [], knip = [];
  for (const k of [1, -1]) {
    const z = k * (W / 2 - 0.36), y = yVoor + 0.28, xf = xV + 0.133; // in de voorkant van de bumper (rondeDoos is 0,9 r groter dan opgegeven)
    glas.push(doos(0.03, 0.2, 0.52, xf + 0.004, y, z, 0.03));
    kop.push(doos(0.03, 0.12, 0.17, xf + 0.012, y + 0.01, z - k * 0.1, 0.03), doos(0.03, 0.12, 0.13, xf + 0.012, y + 0.01, z + k * 0.08, 0.03), doos(0.02, 0.022, 0.42, xf + 0.016, y - 0.07, z, 0.008));
    kop.push(cil(0.05, 0.025, xf + 0.008, yVoor + 0.11, k * 0.62, "x", 18));
    knip.push(doos(0.03, 0.12, 0.12, xf + 0.004, y, k * (W / 2 - 0.08), 0.02), doos(0.1, 0.05, 0.02, xV - 0.45, yVoor + 0.6, k * (W / 2 + 0.005), 0.01));
  }
  G.g.add(mesh(samen(glas), "raam", "lichten"));
  const kopM = mesh(samen(kop), "lamp", "lichten"), knipM = mesh(samen(knip), S.oranje, "lichten");
  G.g.add(kopM, knipM); G.koplamp = kopM; G.knipper.push(knipM);
  // spiegels: hoofdspiegel en groothoekspiegel aan een arm
  G.spiegels = [];
  for (const k of [1, -1]) {
    const sg = new THREE.Group(), z0 = k * (W / 2), xs = opRuit(yB - 0.25) - 0.18, ys = o.spiegelY ?? yB - 0.2;
    const arm = lijn([V(xs, ys + 0.12, z0), V(xs + 0.06, ys + 0.16, z0 + k * 0.18), V(xs + 0.04, ys + 0.1, z0 + k * 0.32)], 0.02, 8);
    const arm2 = lijn([V(xs, ys - 0.62, z0), V(xs + 0.06, ys - 0.62, z0 + k * 0.2), V(xs + 0.04, ys - 0.55, z0 + k * 0.32)], 0.018, 8);
    sg.add(mesh(samen([arm, arm2]), S.kunststof, "spiegels"));
    sg.add(mesh(samen([doos(0.075, 0.42, 0.22, xs + 0.05, ys - 0.12, z0 + k * 0.36, 0.03), doos(0.075, 0.22, 0.2, xs + 0.05, ys - 0.52, z0 + k * 0.36, 0.03)]), o.spiegelKleur ?? kleur, "spiegels"));
    sg.add(mesh(samen([doos(0.012, 0.39, 0.2, xs + 0.005, ys - 0.12, z0 + k * 0.36, 0.004), doos(0.012, 0.2, 0.18, xs + 0.005, ys - 0.52, z0 + k * 0.36, 0.004)]), "raam", "spiegels"));
    G.g.add(sg); G.spiegels.push(sg);
  }
  // opstap: treden onder de deur, achter het voorwiel
  {
    const treden = [], kast = [], xa = xw - Math.cos(Math.PI - aR) * rr, x0 = xa - 0.03, x1 = Math.max(xV - L + 0.04, x0 - 0.55);
    const ys = o.treden ?? [0.42, 0.78];
    for (const k of [1, -1]) {
      for (const y of ys) treden.push(doos(x0 - x1 - 0.04, 0.035, 0.26, (x0 + x1) / 2, y, k * (W / 2 - 0.16), 0.01));
      if (ys.length > 1) kast.push(doos(x0 - x1, yAchter + b - ys[0] + 0.12, 0.03, (x0 + x1) / 2, (yAchter + b + ys[0] - 0.12) / 2, k * (W / 2 - 0.3), 0.01));
      kast.push(doos(0.03, yAchter + b - ys[0] + 0.1, 0.3, x0, (yAchter + b + ys[0] - 0.1) / 2, k * (W / 2 - 0.16), 0.01), doos(0.03, yAchter + b - ys[0] + 0.1, 0.3, x1, (yAchter + b + ys[0] - 0.1) / 2, k * (W / 2 - 0.16), 0.01));
    }
    G.opstap = new THREE.Group(); G.opstap.add(mesh(samen(treden), "zwartmetaal", "opstap"), mesh(samen(kast), S.kunststof, "opstap")); G.g.add(G.opstap);
  }
  // wielkast: een zwarte rand om de boog en een binnenscherm
  {
    const rand = [], scherm = [];
    for (const k of [1, -1]) {
      const t = new THREE.TorusGeometry(ra + 0.02, 0.035, 8, 36, aR - aV); t.rotateZ(aV); t.translate(xw, yw, k * (W / 2 - 0.02)); rand.push(t);
      const prof = k > 0 ? [[ra + 0.04, W / 2 - 0.5], [ra + 0.04, W / 2 - 0.04]] : [[ra + 0.04, -W / 2 + 0.04], [ra + 0.04, -W / 2 + 0.5]];
      const l = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 30, aV + Math.PI / 2, aR - aV); l.rotateX(Math.PI / 2); l.translate(xw, yw, 0);
      const ix = l.index.array; for (let q = 0; q < ix.length; q += 3) { const tmp = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = tmp; } // naar de as gericht
      scherm.push(l);
    }
    const randM = mesh(samen(rand), S.kunststof, deel), schermM = mesh(samen(scherm), S.kunststof, deel);
    schermM.userData.romp = true; G.g.add(randM, schermM);
  }
  // binnen: vloer, dashboard, stuur, stoelen (en een bed achterin)
  {
    const vl = o.vloer, dash = [], stoel = [], zDr = -(W / 2 - 0.62);
    dash.push(doos(0.55, 0.42, W - 0.3, xV - 0.38, yO - 0.12, 0, 0.08), doos(L - 0.3, 0.04, W - 0.22, xV - L / 2 - 0.05, vl, 0, 0.01));
    const zetels = o.ploeg ? [[xV - 1.05, zDr], [xV - 1.05, W / 2 - 0.62], [xV - L + 0.55, zDr], [xV - L + 0.55, 0], [xV - L + 0.55, W / 2 - 0.62]] : [[xV - 1.05, zDr], [xV - 1.05, W / 2 - 0.62]];
    for (const [x, z] of zetels) stoel.push(doos(0.5, 0.12, 0.5, x, vl + 0.48, z, 0.04), doos(0.14, 0.7, 0.5, x - 0.27, vl + 0.86, z, 0.05), doos(0.12, 0.16, 0.3, x - 0.3, vl + 1.28, z, 0.04), doos(0.36, 0.42, 0.36, x, vl + 0.22, z, 0.03));
    if (o.bed) stoel.push(doos(0.72, 0.16, W - 0.3, xV - L + 0.46, vl + 0.55, 0, 0.05));
    const stuur = new THREE.TorusGeometry(0.23, 0.026, 10, 36); stuur.rotateX(Math.PI / 2); stuur.rotateZ(0.6);
    const sx = xV - 0.62, sy = vl + 0.9, spaak = [new THREE.BoxGeometry(0.4, 0.03, 0.05), new THREE.BoxGeometry(0.05, 0.03, 0.22).translate(0, 0, -0.1)].map((g) => g.rotateZ(0.6));
    const stuurG = samen([stuur, ...spaak, cil(0.06, 0.06, 0, 0, 0, "y", 16).rotateZ(0.6)]).translate(sx, sy, zDr);
    const kolom = staaf(V(sx, sy, zDr), V(xV - 0.3, vl + 0.55, zDr), 0.035, 10);
    G.binnen.add(mesh(samen(dash), S.kunststof, "binnen"), mesh(samen(stoel), "stoel", "binnen"), mesh(samen([stuurG, kolom]), "greep", "binnen"));
    G.binnen.add(mesh(rondeDoos(0.02, 0.16, 0.36, 0.01).rotateZ(0.3).translate(xV - 0.42, yO + 0.14, zDr + 0.05), "scherm", "binnen"));
    G.stuur = G.binnen.children[2]; G.binnen.visible = false; G.g.add(G.binnen);
  }
  return G;
}

// ================= Lampen laten knipperen =================
// zet de lampen aan of uit; knipper = de knipperlichten (oranje) gaan aan en uit
function lampen(MAT, aan, t, extra = []) {
  const k = aan ? 2.4 : 0.0, blink = aan && t % 0.9 < 0.45;
  for (const s of ["teken", "donker"]) {
    MAT.lamp[s].emissiveIntensity = aan ? 1.8 : 0;
    MAT.achterlicht[s].emissiveIntensity = aan ? 2.0 : 0.1;
    MAT[S.oranje][s].emissiveIntensity = blink ? 2.6 : 0.05;
    for (const naam of extra) MAT[naam][s].emissiveIntensity = k;
  }
  return blink;
}

return { S, rondVorm, plaat, strook, doos, cil, lijn, band, velg, wiel, balk, as, tank, motorblok, cabine, lampen };
}
