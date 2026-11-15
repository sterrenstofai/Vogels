// De fiets: een racefiets met motor, helemaal in code getekend met three.js (MIT). Geen bestaand model, geen merknamen.
// Opbouw en interactie naar het voorbeeld: anatomie in zeven delen, bouwen in negen stappen, klaar-scherm.
// Maten zijn die van de tekening (maat ML), geen gegevens van een echte fiets. Uitleg is proeftekst.
import * as THREE from "/js/vendor/three.module.min.js";
import { mergeGeometries } from "/js/vendor/BufferGeometryUtils.js";
import { HDRLoader } from "/js/vendor/HDRLoader.js";
import * as STEM from "/js/stem.js";
import * as MIJN from "/js/mijn.js";
const KINDMODUS = location.pathname.replace(/\/$/, "") === "/kinderen/fiets";

const params = new URLSearchParams(location.search);
const TAU = Math.PI * 2;
const HDR = "/modellen/studio_small_09_1k.hdr";
const PAPIER = new THREE.Color(0xf1f0ee);

// ================= Maten van de tekening (meter), trapas in de oorsprong van het frame =================
const BBY = 0.268, R_BAND = 0.343, R_VELG = 0.311;
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const BB = V(0, BBY), ACHTERAS = V(-0.413, R_BAND), VOORAS = V(0.607, R_BAND);
const HT_BOVEN = V(0.385, BBY + 0.59), HT_ONDER = V(0.435, BBY + 0.427);
const ZB = (l) => V(-Math.cos(73.3 * Math.PI / 180) * l, BBY + Math.sin(73.3 * Math.PI / 180) * l); // langs de zitbuis
const ZB_BOVEN = ZB(0.52), ZADEL = ZB(0.73);
const KETTINGLIJN = 0.042;

// ================= Renderer, licht =================
const doek = document.getElementById("doek");
const renderer = new THREE.WebGLRenderer({ canvas: doek, antialias: false, powerPreference: "high-performance" });
const DPR = Math.min(devicePixelRatio || 1, 2);
renderer.setPixelRatio(DPR);
renderer.setClearColor(0xffffff, 0);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 40);
const zon = new THREE.DirectionalLight(0xffffff, 2.0);
zon.position.set(1.2, 4.5, 2.2); zon.castShadow = true; zon.shadow.mapSize.set(2048, 2048);
Object.assign(zon.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 10 });
zon.shadow.bias = -0.0006; zon.shadow.normalBias = 0.01; zon.shadow.radius = 4;
const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d6d1, 1.0); scene.add(zon, hemi);
{ // terugval-omgeving tot de HDR binnen is
  const kamer = new THREE.Scene();
  kamer.add(new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshBasicMaterial({ color: 0xa0a0a0, side: THREE.BackSide })));
  const l = new THREE.Mesh(new THREE.PlaneGeometry(12, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5) })); l.position.set(0, 4.9, 0); l.rotation.x = Math.PI / 2; kamer.add(l);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(kamer, 0.04).texture;
}
fetch(HDR).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then(zetHDR).catch(() => {}); // ARTEFACT-HDR
function zetHDR(buf) {
  const d = new HDRLoader().parse(buf);
  const t = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type);
  t.colorSpace = THREE.LinearSRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; t.flipY = true; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(t).texture; t.dispose();
  scene.environmentRotation.set(0, 1.4, 0); vraag();
}
window.__zetHDR = zetHDR;
const grond = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.17 }));
grond.receiveShadow = true; scene.add(grond);

// ================= Materialen: "tekening" (wit papier) en "donker" (mat zwart, zoals in het voorbeeld) =================
const SOORT = {
  frame: [0xfbfbf9, { color: 0x2a2b2d, roughness: 0.42, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.25 }],
  velg: [0xe6e6e3, { color: 0x1d1e20, roughness: 0.35, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 }],
  carbon: [0xcfd0cd, { color: 0x1d1e20, roughness: 0.35, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 }],
  metaal: [0xe2e4e6, { color: 0xb9bdc1, roughness: 0.28, metalness: 0.95 }],
  schijf: [0xc8cacd, { color: 0xc9cdd1, roughness: 0.22, metalness: 1.0 }],
  spaak: [0x5f605d, { color: 0x2b2c2e, roughness: 0.4, metalness: 0.8 }],
  zwartmetaal: [0x9c9ea1, { color: 0x3a3c3f, roughness: 0.35, metalness: 0.8 }],
  ketting: [0x8f9296, { color: 0x6c7075, roughness: 0.3, metalness: 0.95 }],
  loopvlak: [0x6f6f6b, { color: 0x262626, roughness: 0.85, metalness: 0 }],
  wand: [0xdcc49c, { color: 0xc9a774, roughness: 0.75, metalness: 0 }],
  greep: [0xe2e2df, { color: 0x1a1a1a, roughness: 0.8, metalness: 0 }],
  rubber: [0xc6c6c2, { color: 0x1a1a1a, roughness: 0.8, metalness: 0 }],
  zadel: [0xb8b8b4, { color: 0x1c1c1c, roughness: 0.6, metalness: 0 }],
  lamp: [0xffffff, { color: 0xffffff, roughness: 0.1, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0 }],
  achterlicht: [0xffffff, { color: 0xb3121f, roughness: 0.2, metalness: 0, emissive: 0xff1a2a, emissiveIntensity: 0 }],
  scherm: [0xf0f0f0, { color: 0x111418, roughness: 0.15, metalness: 0.2, emissive: 0x9fd3ff, emissiveIntensity: 0 }],
  cel: [0xf3c7cf, { color: 0x3d6fb3, roughness: 0.4, metalness: 0.3 }],
  karton: [0xe2d2b2, { color: 0xc9a77a, roughness: 0.9, metalness: 0 }],
  rood: [0xf0a7b3, { color: 0xc8102e, roughness: 0.5, metalness: 0 }],
};
const MAT = {};
for (const [k, [teken, donker]] of Object.entries(SOORT)) {
  MAT[k] = {
    teken: new THREE.MeshStandardMaterial({ color: teken, roughness: ["metaal", "schijf", "ketting", "zwartmetaal"].includes(k) ? 0.45 : 0.75, metalness: ["metaal", "schijf", "ketting"].includes(k) ? 0.35 : 0, envMapIntensity: 0.7, emissive: donker.emissive ?? 0x000000, emissiveIntensity: 0 }),
    donker: new THREE.MeshPhysicalMaterial({ ...donker }),
  };
}
const ACCENT = { teken: new THREE.Color(0xf3b7c0), donker: new THREE.Color(0xc8102e) };
const NORM_AAN = new THREE.MeshNormalMaterial({ opacity: 1 }), NORM_UIT = new THREE.MeshNormalMaterial({ opacity: 0.3 });

// ================= Bouwhulpjes =================
const meshes = [];
const DELEN = {}; // deel -> [meshes]
function mesh(geo, soort, deel, o = {}) {
  const m = new THREE.Mesh(geo, MAT[soort].teken);
  m.castShadow = o.schaduw !== false; m.receiveShadow = true;
  m.userData = { soort, deel };
  meshes.push(m); (DELEN[deel] ||= []).push(m);
  return m;
}
const groep = (...k) => { const g = new THREE.Group(); if (k.length) g.add(...k); return g; };
const op = (o, x, y, z) => (o.position.set(x, y, z), o);
// Een buis langs een kromme, met een doorsnede die per plek anders mag zijn: r(t) geeft [in het vlak, dwars].
function veeg(pts, r, o = {}) {
  const kromme = pts.isCurve ? pts : new THREE.CatmullRomCurve3(pts, !!o.dicht, "centripetal");
  const nS = o.seg ?? 48, nR = o.rond ?? 20, ref = o.ref ?? V(0, 0, 1);
  const pos = [], idx = [];
  for (let i = 0; i <= nS; i++) {
    const t = i / nS, P = kromme.getPointAt(t), T = kromme.getTangentAt(t);
    let rf = ref; if (Math.abs(T.dot(rf)) > 0.95) rf = V(0, 1, 0);
    const N = new THREE.Vector3().crossVectors(T, rf).normalize(), B = new THREE.Vector3().crossVectors(N, T).normalize();
    const [a, b] = typeof r === "function" ? r(t) : Array.isArray(r) ? r : [r, r];
    for (let j = 0; j < nR; j++) { const h = (j / nR) * TAU; pos.push(P.x + N.x * a * Math.cos(h) + B.x * b * Math.sin(h), P.y + N.y * a * Math.cos(h) + B.y * b * Math.sin(h), P.z + N.z * a * Math.cos(h) + B.z * b * Math.sin(h)); }
  }
  for (let i = 0; i < nS; i++) for (let j = 0; j < nR; j++) { const a = i * nR + j, b = i * nR + ((j + 1) % nR), c = a + nR, d = b + nR; idx.push(a, c, b, b, c, d); }
  if (!o.dicht && o.dop !== false) for (const [i0, s] of [[0, -1], [nS, 1]]) { // doppen
    const c = kromme.getPointAt(i0 / nS), ci = pos.length / 3; pos.push(c.x, c.y, c.z);
    for (let j = 0; j < nR; j++) { const a = i0 * nR + j, b = i0 * nR + ((j + 1) % nR); if (s < 0) idx.push(ci, b, a); else idx.push(ci, a, b); }
  }
  let g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g = g.toNonIndexed(); g.computeVertexNormals();
  // gladde normalen op de buis zelf, scherp bij de doppen: opnieuw indexeren met een kleine hoek
  return g;
}
function zacht(geo) { const m = mergeVerts(geo); m.computeVertexNormals(); return m; }
// geometrieën samenvoegen: alles zonder index, alleen positie en normaal
function samen(geos) { return mergeGeometries(geos.map((g) => { const n = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k); if (!n.attributes.normal) n.computeVertexNormals(); return n; })); }
function mergeVerts(g) { // eenvoudige weld voor gladde normalen
  const p = g.attributes.position, map = new Map(), nieuw = [], idx = [];
  for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(5)},${p.getY(i).toFixed(5)},${p.getZ(i).toFixed(5)}`; let n = map.get(k); if (n === undefined) { n = nieuw.length / 3; map.set(k, n); nieuw.push(p.getX(i), p.getY(i), p.getZ(i)); } idx.push(n); }
  const o = new THREE.BufferGeometry(); o.setAttribute("position", new THREE.Float32BufferAttribute(nieuw, 3)); o.setIndex(idx); return o;
}
const buis = (pts, r, o) => zacht(veeg(pts, r, o));
function staaf(a, b, r, seg = 6) { const d = b.clone().sub(a), l = d.length(); const g = new THREE.CylinderGeometry(r, r, l, seg, 1, true); g.translate(0, l / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; }
function draai(profiel, seg = 72) { const g = new THREE.LatheGeometry(profiel.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.rotateX(Math.PI / 2); return g; } // as langs z
function rondeDoos(x, y, z, r) {
  const s = new THREE.Shape(), hx = x / 2 - r, hy = y / 2 - r;
  s.moveTo(-hx, -y / 2); s.lineTo(hx, -y / 2); s.quadraticCurveTo(x / 2, -y / 2, x / 2, -hy); s.lineTo(x / 2, hy); s.quadraticCurveTo(x / 2, y / 2, hx, y / 2); s.lineTo(-hx, y / 2); s.quadraticCurveTo(-x / 2, y / 2, -x / 2, hy); s.lineTo(-x / 2, -hy); s.quadraticCurveTo(-x / 2, -y / 2, -hx, -y / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.0005, z - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.9, bevelSegments: 4, curveSegments: 6 }); g.translate(0, 0, -(z - 2 * r) / 2); g.computeVertexNormals(); return g;
}
function tandwiel(T, dikte, gaten = 0, binnen = 0.4) { // T tanden, steek 12,7 mm (zoals een fietsketting)
  const r = (T * 0.0127) / TAU, h = 0.0045, s = new THREE.Shape();
  for (let i = 0; i < T; i++) {
    const a0 = (i / T) * TAU, p = (a, rr) => [Math.cos(a) * rr, Math.sin(a) * rr], st = TAU / T;
    if (i === 0) s.moveTo(...p(a0 - st * 0.18, r - h));
    s.quadraticCurveTo(...p(a0, r - h * 1.15), ...p(a0 + st * 0.18, r - h)); s.lineTo(...p(a0 + st * 0.36, r + h * 0.55)); s.lineTo(...p(a0 + st * 0.64, r + h * 0.55)); s.lineTo(...p(a0 + st * 0.82, r - h));
  }
  if (gaten) for (let k = 0; k < gaten; k++) { const a0 = (k / gaten) * TAU + 0.2, a1 = a0 + TAU / gaten - 0.55, r1 = r * binnen, r2 = r - 0.012, g = new THREE.Path(); g.absarc(0, 0, r2, a0, a1, false); g.absarc(0, 0, r1, a1, a0, true); s.holes.push(g); }
  else { const g = new THREE.Path(); g.absarc(0, 0, Math.min(0.012, r * 0.5), 0, TAU, true); s.holes.push(g); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: dikte, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0004, bevelSegments: 1, curveSegments: 3 }); geo.translate(0, 0, -dikte / 2); geo.computeVertexNormals(); return geo;
}

// ================= De fiets =================
const fiets = new THREE.Group(); scene.add(fiets);
const G = {}; // beweegbare groepen
// ---- frame (carbon, aero-buizen)
{
  const rad = (a) => (a * Math.PI) / 180;
  const frame = [];
  frame.push(buis([HT_BOVEN.clone().add(V(-0.006, 0.02)), HT_ONDER.clone().add(V(0.006, -0.02))], (t) => [0.028 + t * 0.01, 0.024 + t * 0.008], { seg: 12 }));
  frame.push(buis([ZB_BOVEN.clone().add(V(0.01, 0.0)), V(0.12, BBY + 0.53), HT_BOVEN.clone().add(V(-0.01, -0.03))], (t) => [0.018 + 0.003 * t, 0.016 + 0.003 * t], { seg: 40 }));
  frame.push(buis([BB.clone().add(V(0.04, 0.03)), V(0.2, BBY + 0.2), HT_ONDER.clone().add(V(-0.012, 0.03))], (t) => [0.05 - 0.008 * t, 0.04 - 0.004 * t], { seg: 40 }));
  frame.push(buis([BB.clone().add(V(-0.01, 0.03)), ZB(0.3), ZB_BOVEN.clone().add(ZB(0.04).sub(BB))], (t) => [0.026 - 0.008 * t, 0.018 - 0.002 * t], { seg: 30 }));
  for (const k of [1, -1]) {
    frame.push(buis([BB.clone().add(V(-0.04, -0.005, k * 0.03)), V(-0.22, BBY + 0.025, k * 0.058), ACHTERAS.clone().add(V(0.012, 0, k * 0.066))], (t) => [0.017 - 0.005 * t, 0.014 - 0.004 * t], { seg: 30 }));
    frame.push(buis([ZB(0.4).add(V(0.008, 0, k * 0.012)), V(-0.27, BBY + 0.22, k * 0.05), ACHTERAS.clone().add(V(0.01, 0.02, k * 0.066))], (t) => [0.013 - 0.004 * t, 0.011 - 0.003 * t], { seg: 30 }));
  }
  // knooppunten glad laten overlopen: een afgeplatte bol waar buizen samenkomen
  for (const [p, sx, sy, sz] of [[HT_ONDER.clone().add(V(-0.004, 0.028)), 0.04, 0.046, 0.036]])
    frame.push(new THREE.SphereGeometry(1, 24, 16).scale(sx, sy, sz).translate(p.x, p.y, p.z));
  const fm = frame.map((g) => mesh(g, "frame", "frame"));
  G.buizen = { balhoofd: fm[0], boven: fm[1], onder: fm[2], zit: fm[3] };
  for (const k of [1, -1]) fm.push(op(mesh(rondeDoos(0.045, 0.04, 0.006, 0.006), "frame", "frame"), ACHTERAS.x + 0.008, ACHTERAS.y + 0.006, k * 0.068));
  const motor = mesh(samen([new THREE.CylinderGeometry(0.068, 0.068, 0.1, 48).rotateX(Math.PI / 2), rondeDoos(0.16, 0.1, 0.088, 0.035).translate(0.035, 0.035, 0)]), "frame", "motor");
  motor.position.copy(BB);
  const deksel = op(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 40).rotateX(Math.PI / 2), "zwartmetaal", "motor"), BB.x, BB.y, -0.05);
  // accu in de onderbuis: cellen, alleen te zien als het frame doorzichtig is
  const cellen = []; const dt0 = BB.clone().add(V(0.07, 0.09)), dt1 = HT_ONDER.clone().add(V(-0.05, -0.08)), dtd = dt1.clone().sub(dt0);
  for (let i = 0; i < 8; i++) for (const z of [-0.011, 0.011]) cellen.push(staaf(dt0.clone().addScaledVector(dtd, i / 8 + 0.01), dt0.clone().addScaledVector(dtd, (i + 0.92) / 8), 0.0105, 12).translate(0, 0, z));
  const accu = mesh(samen(cellen), "cel", "accu"); accu.visible = false; accu.userData.verborgen = true;
  const poort = op(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 24).rotateX(Math.PI / 2), "rubber", "accu"), 0.12, BBY + 0.13, -0.028);
  const scherm = mesh(rondeDoos(0.045, 0.006, 0.022, 0.003), "scherm", "scherm");
  scherm.position.copy(HT_BOVEN).add(V(-0.08, -0.002)); scherm.rotation.z = -0.13;
  fiets.add(...fm, motor, deksel, accu, poort, scherm);
  G.accu = accu; G.scherm = scherm; G.motor = motor; G.deksel = deksel;
}
// ---- voorvork en stuur (draaien samen om de stuuras)
const stuuras = HT_BOVEN.clone().sub(HT_ONDER).normalize();
const voorkant = new THREE.Group(); voorkant.position.copy(HT_ONDER); fiets.add(voorkant); // alles hierin is relatief aan het balhoofd-onder
const rel = (p) => p.clone().sub(HT_ONDER);
{
  const vork = [];
  vork.push(mesh(buis([rel(HT_ONDER).add(V(0, -0.025)), rel(HT_BOVEN).addScaledVector(stuuras, 0.05)], 0.014, { seg: 6 }), "frame", "vork"));
  vork.push(mesh(rondeDoos(0.06, 0.035, 0.11, 0.016).translate(0.006, -0.035, 0), "frame", "vork"));
  for (const k of [1, -1]) vork.push(mesh(buis([V(0.008, -0.04, k * 0.042), V(0.055, -0.2, k * 0.052), rel(VOORAS).add(V(-0.004, 0.012, k * 0.054))], (t) => [0.017 - 0.008 * t, 0.012 - 0.004 * t], { seg: 30 }), "frame", "vork"));
  voorkant.add(...vork);
  // stuurpen, ringen, stuur, remgrepen, koplamp
  const top = rel(HT_BOVEN).addScaledVector(stuuras, 0.035);
  const ringen = [0, 1, 2].map((i) => op(mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.009, 32), "carbon", "stuur"), top.x - stuuras.x * 0.01 * i, top.y - 0.011 * i, 0));
  for (const r of ringen) r.quaternion.setFromUnitVectors(V(0, 1, 0), stuuras);
  const penEind = top.clone().add(V(0.085, -0.004, 0));
  const pen = mesh(buis([top.clone().add(V(-0.02, 0.012)), penEind], (t) => [0.021 - 0.002 * t, 0.02 - 0.002 * t], { seg: 10 }), "zwartmetaal", "stuur");
  const plaat = op(mesh(rondeDoos(0.012, 0.042, 0.05, 0.005), "zwartmetaal", "stuur"), penEind.x + 0.014, penEind.y, 0);
  const bouten = [[0.012, 0.016], [-0.012, -0.016], [-0.012, 0.016], [0.012, -0.016]].map(([y, z]) => op(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.006, 12).rotateZ(Math.PI / 2), "metaal", "bouten"), penEind.x + 0.021, penEind.y + y, z));
  const stuurG = new THREE.Group(); stuurG.position.copy(penEind).add(V(0.012, 0, 0));
  const helft = (k) => [V(0, 0, 0), V(0.0, 0.0, k * 0.15), V(0.02, 0.0, k * 0.19), V(0.075, -0.012, k * 0.205), V(0.098, -0.06, k * 0.21), V(0.07, -0.12, k * 0.212), V(0.02, -0.125, k * 0.214)];
  const stuur = mesh(samen([buis(helft(1), 0.0135, { seg: 48 }), buis(helft(-1), 0.0135, { seg: 48 })]), "rubber", "stuur");
  const grepen = [1, -1].map((k) => { const g = new THREE.SphereGeometry(0.02, 20, 14); g.scale(1.6, 1.15, 0.9); const m = mesh(g, "greep", "stuur"); m.position.set(0.085, -0.002, k * 0.205); m.rotation.z = -0.35; return m; });
  const hendels = [1, -1].map((k) => mesh(buis([V(0.11, -0.01, k * 0.207), V(0.125, -0.06, k * 0.21), V(0.1, -0.11, k * 0.212)], [0.006, 0.004], { seg: 20 }), "carbon", "stuur"));
  const bel = groep(mesh(new THREE.SphereGeometry(0.016, 24, 12, 0, TAU, 0, Math.PI / 2), "metaal", "bel"), mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 10), "zwartmetaal", "bel"));
  bel.position.set(0.004, 0.011, -0.07); stuurG.add(bel); G.bel = bel;
  stuurG.add(stuur, ...grepen, ...hendels);
  const lamp = groep(mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.045, 24).rotateZ(Math.PI / 2), "zwartmetaal", "koplamp"), op(mesh(new THREE.CircleGeometry(0.014, 24).rotateY(Math.PI / 2), "lamp", "koplamp"), 0.0231, 0, 0));
  lamp.position.copy(penEind).add(V(0.035, -0.04, 0));
  const lichtbundel = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 40, 1, true).rotateZ(Math.PI / 2).translate(1.33, 0, 0), new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
  lichtbundel.position.copy(lamp.position); lichtbundel.rotation.z = -0.12; lichtbundel.userData.geenLijn = true;
  voorkant.add(...ringen, pen, plaat, ...bouten, stuurG, lamp, lichtbundel); G.lamp = lamp;
  Object.assign(G, { stuur: stuurG, stuurThuis: stuurG.position.clone(), bouten, bundel: lichtbundel });
  // remleiding voor, langs de vork
  G.remleiding = (voorkant.add(mesh(buis([V(0.13, 0.1, -0.21).add(rel(penEind)).add(V(-0.1, -0.06, 0)), V(0.06, 0.02, -0.06), V(0.04, -0.06, -0.06), V(0.06, -0.2, -0.06), rel(VOORAS).add(V(-0.06, 0.02, -0.06))], 0.0025, { seg: 50 }), "rubber", "remmen")), voorkant.children[voorkant.children.length - 1]);
}
// ---- wielen
function wiel(achter) {
  const draaiG = new THREE.Group();
  const velg = mesh(draai([[0.2745, 0.0], [0.276, -0.0085], [0.288, -0.0125], [0.3085, -0.0125], [0.311, -0.0112], [0.311, 0.0112], [0.3085, 0.0125], [0.288, 0.0125], [0.276, 0.0085], [0.2745, 0.0]]), "velg", "wielen");
  const rc = R_VELG + 0.0155, rb = 0.0162, arc = (a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [rc + Math.cos(a) * rb, Math.sin(a) * rb * 0.98]; });
  const loop = mesh(draai(arc(-0.42, 0.42, 10), 96), "loopvlak", "wielen");
  const wanden = [mesh(draai(arc(0.42, 2.35, 14), 96), "wand", "wielen"), mesh(draai(arc(-2.35, -0.42, 14), 96), "wand", "wielen")];
  const naaf = mesh(draai([[0.006, -0.07], [0.017, -0.07], [0.018, -0.045], [0.03, -0.042], [0.03, -0.036], [0.016, -0.03], [0.014, 0.0], [0.016, 0.03], [0.03, 0.036], [0.03, 0.042], [0.018, 0.045], [0.017, 0.07], [0.006, 0.07]], 40), "zwartmetaal", "wielen");
  const spaken = [];
  for (let i = 0; i < 24; i++) {
    const kant = i % 2 ? 1 : -1, a = (i / 24) * TAU, kruis = (i % 4 < 2 ? 1 : -1) * 2 * (TAU / 12) * 0.5;
    const naafP = V(Math.cos(a) * 0.029, Math.sin(a) * 0.029, kant * 0.039), velgP = V(Math.cos(a + kruis) * 0.276, Math.sin(a + kruis) * 0.276, kant * 0.003);
    spaken.push(staaf(naafP, velgP, 0.0011, 5));
  }
  const spaak = mesh(samen(spaken), "spaak", "wielen", { schaduw: true }); spaak.userData.geenLijn = true;
  // remschijf links (-z)
  const s = new THREE.Shape(); s.absarc(0, 0, 0.08, 0, TAU, false);
  const gat = new THREE.Path(); gat.absarc(0, 0, 0.021, 0, TAU, true); s.holes.push(gat);
  for (let k = 0; k < 6; k++) { const a0 = (k / 6) * TAU + 0.15, a1 = a0 + 0.62, g = new THREE.Path(); g.absarc(0, 0, 0.058, a0, a1, false); g.absarc(0, 0, 0.03, a1, a0, true); s.holes.push(g); }
  for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU, g = new THREE.Path(); g.absarc(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.0028, 0, TAU, true); s.holes.push(g); }
  const schijfGeo = new THREE.ExtrudeGeometry(s, { depth: 0.0018, bevelEnabled: false, curveSegments: 28 }); schijfGeo.translate(0, 0, -0.058);
  const schijf = mesh(schijfGeo, "schijf", "remmen");
  draaiG.add(velg, loop, ...wanden, naaf, spaak, schijf);
  if (achter) { // cassette 10–46, 13 tandwielen (rechts, +z)
    const T = [46, 38, 32, 28, 24, 21, 19, 17, 15, 13, 12, 11, 10];
    const cass = samen(T.map((t, i) => tandwiel(t, 0.0016, t > 20 ? 5 : 0, 0.55).translate(0, 0, 0.02 + i * 0.0035)));
    draaiG.add(mesh(cass, "metaal", "aandrijving"));
  }
  const steekas = mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.16, 16).rotateX(Math.PI / 2), "zwartmetaal", "wielen");
  const w = groep(draaiG, steekas);
  return { w, draaiG, loop, wanden, steekas };
}
const AW = wiel(true), VW = wiel(false);
AW.w.position.copy(ACHTERAS); fiets.add(AW.w);
VW.w.position.copy(rel(VOORAS)); voorkant.add(VW.w);
G.voorwielThuis = VW.w.position.clone();
// remklauwen
{
  const klauw = (c, a) => { const m = mesh(rondeDoos(0.05, 0.026, 0.034, 0.008), "zwartmetaal", "remmen"); m.position.copy(c).add(V(Math.cos(a) * 0.077, Math.sin(a) * 0.077, -0.058)); m.rotation.z = a + Math.PI / 2; return m; };
  G.klauwA = klauw(ACHTERAS, -0.45); fiets.add(G.klauwA);
  const vk = klauw(rel(VOORAS), Math.PI + 0.4); voorkant.add(vk);
  const blokje = mesh(rondeDoos(0.026, 0.012, 0.003, 0.001), "rood", "afstandhouder"); blokje.position.copy(vk.position).add(V(0, -0.005, 0)); voorkant.add(blokje);
  G.blokje = blokje; G.blokjeThuis = blokje.position.clone();
}
// ---- aandrijving: crank met kettingblad, trappers, ketting, achterderailleur
{
  const crank = new THREE.Group(); crank.position.copy(BB); fiets.add(crank);
  const blad = mesh(tandwiel(46, 0.0035, 4, 0.5), "zwartmetaal", "aandrijving"); blad.position.z = KETTINGLIJN + 0.003;
  const as = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 20).rotateX(Math.PI / 2), "metaal", "aandrijving");
  const arm = (k) => mesh(buis([V(0, 0, k * 0.058), V(0, -0.085, k * 0.066), V(0, -0.17, k * 0.07)], (t) => [0.011 - 0.003 * t, 0.007], { seg: 12 }), "carbon", "aandrijving");
  const armR = arm(1), armL = arm(-1); armL.rotation.z = Math.PI;
  crank.add(blad, as, armR, armL);
  const trapper = (k) => { const g = new THREE.Group(); const lijf = mesh(samen([rondeDoos(0.075, 0.016, 0.06, 0.007), new THREE.CylinderGeometry(0.006, 0.006, 0.05, 12).rotateX(Math.PI / 2).translate(0, 0, -k * 0.045)]), "carbon", "trappers"); lijf.position.z = k * 0.03; g.add(lijf); return g; };
  const tR = trapper(1), tL = trapper(-1);
  tR.position.set(0, -0.17, 0.085); tL.position.set(0, 0.17, -0.09);
  crank.add(tR, tL);
  Object.assign(G, { crank, trappers: [tR, tL], trapperThuis: [tR.position.clone(), tL.position.clone()] });
  // derailleur
  const d = new THREE.Group(); d.position.copy(ACHTERAS).add(V(0.005, -0.012, 0.075));
  d.add(mesh(rondeDoos(0.03, 0.05, 0.028, 0.008).translate(0.0, -0.03, 0), "zwartmetaal", "aandrijving"));
  const kooi = mesh(rondeDoos(0.025, 0.085, 0.004, 0.006).translate(0.012, -0.095, -0.004), "zwartmetaal", "aandrijving"); kooi.rotation.z = 0.25;
  const jockeyBoven = V(-0.395, ACHTERAS.y - 0.065), jockeyOnder = V(-0.365, ACHTERAS.y - 0.135);
  const j1 = mesh(tandwiel(12, 0.003), "zwartmetaal", "aandrijving"), j2 = mesh(tandwiel(12, 0.003), "zwartmetaal", "aandrijving");
  j1.position.set(jockeyBoven.x - d.position.x, jockeyBoven.y - d.position.y, KETTINGLIJN - d.position.z); j2.position.set(jockeyOnder.x - d.position.x, jockeyOnder.y - d.position.y, KETTINGLIJN - d.position.z);
  d.add(kooi, j1, j2); fiets.add(d); G.jockeys = [j1, j2]; G.derailleur = d;
  // kettingpad: rond het blad (voorkant), naar de onderste en bovenste jockey, rond het 21-tandwiel (achterkant)
  const rBlad = (46 * 0.0127) / TAU + 0.002, rTw = (21 * 0.0127) / TAU + 0.002, rJ = (12 * 0.0127) / TAU + 0.002;
  const pts = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI / 2 - (i / 16) * Math.PI * 1.08; pts.push(V(BB.x + Math.cos(a) * rBlad, BB.y + Math.sin(a) * rBlad, KETTINGLIJN)); }
  for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 - 0.3 - (i / 5) * 1.6; pts.push(V(jockeyOnder.x + Math.cos(a) * rJ, jockeyOnder.y + Math.sin(a) * rJ, KETTINGLIJN)); }
  for (let i = 0; i <= 5; i++) { const a = Math.PI - 0.2 + (i / 5) * 1.5; pts.push(V(jockeyBoven.x + Math.cos(a) * rJ, jockeyBoven.y + Math.sin(a) * rJ, KETTINGLIJN)); }
  for (let i = 0; i <= 10; i++) { const a = -Math.PI * 0.62 - (i / 10) * Math.PI * 0.95; pts.push(V(ACHTERAS.x + Math.cos(a) * rTw, ACHTERAS.y + Math.sin(a) * rTw, KETTINGLIJN)); }
  const pad = new THREE.CatmullRomCurve3(pts, true, "centripetal");
  const n = Math.round(pad.getLength() / 0.0127);
  const plaat = rondeDoos(0.0175, 0.0075, 0.0009, 0.00035);
  const binnen = new THREE.InstancedMesh(plaat, MAT.ketting.teken, n), buiten = new THREE.InstancedMesh(plaat, MAT.ketting.teken, n);
  for (const im of [binnen, buiten]) { im.castShadow = true; im.userData = { soort: "ketting", deel: "aandrijving" }; meshes.push(im); (DELEN.aandrijving ||= []).push(im); fiets.add(im); }
  Object.assign(G, { ketting: { pad, n, binnen, buiten } });
}
// ---- zadelpen, zadel, achterlicht
{
  const asZ = ZADEL.clone().sub(ZB_BOVEN).normalize();
  const pen = new THREE.Group(); fiets.add(pen);
  const penBuis = mesh(buis([ZB_BOVEN.clone().addScaledVector(asZ, -0.12), ZADEL.clone()], [0.016, 0.012], { seg: 6 }), "carbon", "zadelpen");
  const streep = mesh(buis([ZB_BOVEN.clone().addScaledVector(asZ, -0.075), ZB_BOVEN.clone().addScaledVector(asZ, -0.071)], [0.0165, 0.0125], { seg: 2 }), "rood", "zadelpen");
  const klem = op(mesh(rondeDoos(0.04, 0.02, 0.03, 0.008), "zwartmetaal", "zadelpen"), ZADEL.x, ZADEL.y + 0.012, 0);
  // zadel: doorsneden van achter naar de neus
  const sec = [], NX = 26, NR = 18;
  for (let i = 0; i <= NX; i++) {
    const t = i / NX, x = ZADEL.x - 0.135 + t * 0.27, b = t < 0.45 ? 0.072 - 0.01 * t : 0.068 * Math.pow(1 - (t - 0.45) / 0.55, 0.9) + 0.016 * ((t - 0.45) / 0.55);
    const h = 0.03 - 0.012 * t, ytop = ZADEL.y + 0.04 + 0.006 * Math.sin(t * Math.PI) - (t > 0.9 ? (t - 0.9) * 0.08 : 0) + (t < 0.08 ? (0.08 - t) * 0.25 : 0);
    const ring = []; for (let j = 0; j < NR; j++) { const a = (j / NR) * TAU; const y = Math.sin(a) > 0 ? ytop - h * 0.5 + Math.sin(a) * h * 0.5 : ytop - h * 0.5 + Math.sin(a) * h * 0.35; ring.push([x, y, Math.cos(a) * b * (Math.sin(a) > 0 ? 1 : 0.85)]); }
    sec.push(ring);
  }
  const pos = [], idx = []; for (const r of sec) for (const p of r) pos.push(...p);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NR; j++) { const a = i * NR + j, b2 = i * NR + ((j + 1) % NR); idx.push(a, b2, a + NR, b2, b2 + NR, a + NR); }
  for (const [i0, s] of [[0, 1], [NX, -1]]) { const c = sec[i0].reduce((m, p) => m.add(V(...p)), V(0, 0, 0)).multiplyScalar(1 / NR), ci = pos.length / 3; pos.push(c.x, c.y, c.z); for (let j = 0; j < NR; j++) { const a = i0 * NR + j, b2 = i0 * NR + ((j + 1) % NR); if (s > 0) idx.push(ci, b2, a); else idx.push(ci, a, b2); } }
  const zg = new THREE.BufferGeometry(); zg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); zg.setIndex(idx); zg.computeVertexNormals();
  const zadel = mesh(zg, "zadel", "zadel");
  const rails = mesh(samen([1, -1].map((k) => buis([V(ZADEL.x - 0.11, ZADEL.y + 0.02, k * 0.035), V(ZADEL.x - 0.02, ZADEL.y + 0.008, k * 0.022), V(ZADEL.x + 0.1, ZADEL.y + 0.022, k * 0.012)], 0.0035, { seg: 16 }))), "metaal", "zadel");
  const licht = groep(mesh(rondeDoos(0.018, 0.04, 0.03, 0.006), "zwartmetaal", "achterlicht"), op(mesh(rondeDoos(0.004, 0.032, 0.022, 0.0015), "achterlicht", "achterlicht"), -0.011, 0, 0));
  licht.position.copy(ZB_BOVEN).addScaledVector(asZ, 0.06).add(V(-0.022, 0, 0)); licht.rotation.z = 0.28;
  pen.add(penBuis, streep, klem, zadel, rails, licht);
  Object.assign(G, { zadelpen: pen, penAs: asZ, streep });
}
// ---- de doos (alleen bij uitpakken)
{
  const doos = new THREE.Group(); const L = 1.42, H = 0.82, D = 0.26, d = 0.006;
  const wand = (w, h, x, y, z, ry) => { const m = mesh(new THREE.BoxGeometry(w, h, d), "karton", "doos"); m.position.set(x, y, z); m.rotation.y = ry; return m; };
  doos.add(wand(L, H, 0, H / 2, D / 2, 0), wand(L, H, 0, H / 2, -D / 2, 0), wand(D, H, L / 2, H / 2, 0, Math.PI / 2), wand(D, H, -L / 2, H / 2, 0, Math.PI / 2));
  doos.add(op(mesh(new THREE.BoxGeometry(L, d, D), "karton", "doos"), 0, d / 2, 0));
  const flappen = [];
  for (const k of [1, -1]) { const f = new THREE.Group(); f.position.set(0, H, k * D / 2); const p = mesh(new THREE.BoxGeometry(L, D * 0.55, d), "karton", "doos"); p.position.y = D * 0.275; f.add(p); doos.add(f); flappen.push({ f, k }); }
  doos.position.set(0.1, 0, 0); doos.visible = false; scene.add(doos);
  Object.assign(G, { doos, flappen });
}
for (const m of meshes) if (m.userData.deel === "doos") m.castShadow = true;

// ================= Teksten =================
const DEEL_NAAM = { bel: "de bel", frame: "het frame", vork: "de voorvork", motor: "de motor", accu: "de accu", scherm: "het scherm", stuur: "het stuur", koplamp: "de koplamp", wielen: "de wielen", remmen: "de remmen", aandrijving: "de aandrijving", trappers: "de trappers", zadel: "het zadel", zadelpen: "de zadelpen", achterlicht: "het achterlicht", bouten: "de boutjes", afstandhouder: "het blokje", doos: "de doos" };
const SECTIES = [
  { naam: "De fiets", titel: "De fiets", tekst: "Een lichte racefiets met een motor die je bijna niet ziet. Tik op de lampen.", cam: [2.42, 0.68, 1.9, [0.14, 0.48, -0.06], 48], focus: null,
    specs: [["Wielbasis, maat ML", "1020 mm"], ["Motor bij de trappers", "helpt tot 25 km/u"], ["Accu in de onderbuis", "verstopt"], ["1 × 13 versnellingen", "10–46 T"], ["Lampen voor en achter", "tik", "lampen"]],
    namen: [["achterlicht", "ACHTERLICHT", -110, -20], ["frame", "CARBON FRAME", -90, -50], ["koplamp", "KOPLAMP", 30, -40], ["motor", "MOTOR BIJ DE TRAPPERS", 70, 45], ["wielen:voor", "CARBON WIELEN · 37 MM", -40, 90]], maat: true },
  { naam: "Het frame", titel: "Het frame", tekst: "Het geraamte: buizen in twee driehoeken, van carbon. Licht en stijf, en de onderbuis is dik genoeg voor de accu.", cam: [Math.PI - 0.25, 0.14, 3.7, [0.1, 0.5, 0]], focus: ["frame", "vork"],
    specs: [["Bovenbuis", "loopt iets af"], ["Onderbuis", "met de accu erin"], ["Zitbuis", "73,3° in de tekening"], ["Balhoofd", "72,9° in de tekening"], ["Liggende en staande achtervork", "naar de achteras"]],
    namen: [["frame:boven", "BOVENBUIS", -40, -50], ["frame:onder", "ONDERBUIS", 60, 40], ["frame:zit", "ZITBUIS", -80, -10], ["vork", "VOORVORK", 70, 20]] },
  { naam: "Motor & accu", titel: "Motor & accu", tekst: "Een kleine motor bij de trappers helpt mee als jij trapt. De accu zit in de onderbuis. Tik op het scherm.", cam: [2.75, 0.26, 2.0, [0.15, 0.45, 0]], focus: ["motor", "accu", "scherm"], doorzicht: true,
    specs: [["Motor bij de trappers", "helpt tot 25 km/u"], ["Accu in de onderbuis", "16 cellen in de tekening"], ["Laadpoort", "onderaan de onderbuis"], ["Scherm op de bovenbuis", "tik", "scherm"]],
    namen: [["motor", "MOTOR", 60, 50], ["accu", "ACCU IN DE ONDERBUIS", 70, -30], ["scherm", "SCHERM", 30, -50]] },
  { naam: "Aandrijving", titel: "Aandrijving", tekst: "Jij trapt, het kettingblad draait, de ketting trekt aan het tandwiel en het achterwiel gaat rond.", cam: [0.45, 0.25, 1.9, [-0.18, 0.33, 0]], focus: ["aandrijving", "trappers"], trappen: true,
    specs: [["Kettingblad", "46 tanden"], ["Cassette, 13 tandwielen", "10–46 tanden"], ["Cranks", "170 mm"], ["Achterderailleur", "verzet de ketting"]],
    namen: [["aandrijving:blad", "KETTINGBLAD", 50, 50], ["aandrijving:cassette", "CASSETTE", -70, -40], ["trappers", "TRAPPER", 60, -30]] },
  { naam: "Wielen & remmen", titel: "Wielen & remmen", tekst: "Hoge carbon velgen met 24 spaken, brede banden met een lichte wand, en schijfremmen.", cam: [1.95, 0.18, 3.5, [0.1, 0.4, 0]], focus: ["wielen", "remmen"], rollen: true,
    specs: [["Wielmaat", "700C · 622 mm"], ["Banden", "32 mm breed"], ["Spaken", "24 per wiel"], ["Remschijven", "160 mm"]],
    namen: [["wielen:voor", "VELG · 37 MM HOOG", 60, -60], ["remmen", "SCHIJFREM", -70, 40]] },
  { naam: "Cockpit", titel: "Cockpit", tekst: "Hier stuur je, rem je en schakel je. Tik op de koplamp.", cam: [1.9, 0.55, 1.35, [0.47, 0.84, 0]], focus: ["stuur", "koplamp", "scherm"],
    specs: [["Stuur", "420 mm breed"], ["Stuurpen", "100 mm"], ["Remgrepen", "met schakelknoppen"], ["Koplamp", "tik", "lampen"]],
    namen: [["stuur", "STUUR", -60, -50], ["koplamp", "KOPLAMP", 60, 30], ["scherm", "SCHERM", -80, 10]] },
  { naam: "Geometrie", titel: "Geometrie", tekst: "Een racefiets om lang op te fietsen: wat hoger voorin en rustig sturend. Maat ML.", cam: [Math.PI, 0.02, 3.9, [0.1, 0.48, 0]], focus: null, geometrie: true,
    specs: [["Stack", "590 mm"], ["Reach", "385 mm"], ["Balhoofdhoek", "72,9°"], ["Zitbuishoek", "73,3°"], ["Liggende achtervork", "420 mm"], ["Wielbasis", "1020 mm"], ["Trapasverlaging", "75 mm"]], volgende: "Bouw hem" },
];
const ICOON = {
  doos: '<svg viewBox="0 0 30 16"><path d="M3 5l12-3 12 3-12 3z M3 5v7l12 3 12-3V5 M15 8v7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  moment: '<svg viewBox="0 0 30 16"><path d="M2 8h18 M20 5h4a3 3 0 010 6h-4z M6 6v4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  pedaal: '<svg viewBox="0 0 30 16"><path d="M2 8h20 M22 4l5 4-5 4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  vet: '<svg viewBox="0 0 30 16"><path d="M3 5h18l5 3-5 3H3z M6 5v6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  inbus: '<svg viewBox="0 0 30 16"><path d="M4 12L20 4h6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  pomp: '<svg viewBox="0 0 30 16"><path d="M6 3v10 M2 13h8 M6 6h14l6-2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  hand: '<svg viewBox="0 0 30 16"><path d="M8 13V5a1.5 1.5 0 013 0v4-6a1.5 1.5 0 013 0v6-5a1.5 1.5 0 013 0v5-3a1.5 1.5 0 013 0v6c0 3-2 4-5 4h-3c-2 0-3-1-4-2l-3-3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
};
const STAPPEN = [
  { naam: "Uitpakken", min: 4, titel: "Til de fiets uit de doos", tekst: "Open de doos, til de fiets er samen uit en haal het karton van de voorvork.", nodig: [["doos", "Fietsdoos", "met een doosje gereedschap", "1×"], ["moment", "Momentsleutel", "klikt als het vast genoeg is", "5–7 Nm"], ["pedaal", "Pedaalsleutel", "15 mm", "1×"], ["vet", "Vet", "voor de draad van de trappers", "1×"]], tip: "Kijk of de voorvork en de achtervork niet beschadigd zijn.", icoon: "doos", focus: ["doos"], cam: [2.1, 0.32, 4.3, [0.1, 0.5, 0]] },
  { naam: "Stuur vastzetten", min: 3, titel: "Zet het stuur op zijn plek", tekst: "Leg het stuur recht in de stuurpen en zet het voorplaatje erop.", nodig: [["inbus", "Inbussleutel", "4 mm", "1×"]], icoon: "inbus", focus: ["stuur"], cam: [1.9, 0.5, 1.5, [0.47, 0.84, 0]] },
  { naam: "Kruislings aandraaien", min: 3, titel: "Draai kruislings aan", tekst: "Draai de vier boutjes om de beurt een beetje aan: 1, 3, 2, 4. Tot de momentsleutel klikt.", nodig: [["moment", "Momentsleutel", "zet hem op 5 Nm", "5 Nm"]], tip: "Kruislings houdt het plaatje recht.", icoon: "moment", focus: ["bouten"], cam: [0.6, 0.25, 0.65, [0.5, 0.87, 0]] },
  { naam: "Trappers", min: 4, titel: "Draai de trappers erin", tekst: "Eerst met de hand, dan met de pedaalsleutel. Allebei draai je ze naar de voorkant van de fiets toe vast.", nodig: [["pedaal", "Pedaalsleutel", "15 mm", "1×"], ["vet", "Vet", "een dun laagje op de draad", "1×"]], tip: "De linkertrapper heeft linkse draad: die draai je andersom.", icoon: "pedaal", focus: ["trappers"], cam: [0.5, 0.3, 1.5, [0.0, 0.3, 0]] },
  { naam: "Blokje uit de rem", min: 1, titel: "Haal het blokje uit de rem", tekst: "Tussen de remblokken zit een plastic blokje voor het vervoer. Trek het eruit.", nodig: [["hand", "Je handen", "", "2×"]], tip: "Knijp niet in de remgreep zolang de schijf er niet tussen zit.", let: true, icoon: "hand", focus: ["afstandhouder", "remmen"], cam: [2.7, 0.2, 1.1, [0.55, 0.35, 0]] },
  { naam: "Voorwiel", min: 3, titel: "Zet het voorwiel erin", tekst: "Laat het wiel in de vork zakken, met de remschijf tussen de remblokken, en schuif de steekas erdoor.", nodig: [["inbus", "Inbussleutel", "6 mm", "1×"]], icoon: "inbus", focus: ["wielen"], cam: [2.4, 0.25, 2.0, [0.5, 0.4, 0]] },
  { naam: "Banden oppompen", min: 3, titel: "Pomp de banden op", tekst: "Pomp tot de druk die op de zijkant van de band staat.", nodig: [["pomp", "Pomp", "met een drukmeter", "1×"]], icoon: "pomp", focus: ["wielen"], cam: [2.2, 0.3, 3.8, [0.1, 0.45, 0]] },
  { naam: "Zadelpen", min: 2, titel: "Schuif de zadelpen erin", tekst: "Tot je zittend met je hiel net bij de trapper kunt. Draai de klem vast tot de sleutel klikt.", nodig: [["moment", "Momentsleutel", "zie de klem", "5 Nm"]], tip: "Rijd nooit als het rode streepje te zien is.", let: true, icoon: "moment", focus: ["zadelpen", "zadel"], cam: [Math.PI - 0.6, 0.3, 2.3, [-0.15, 0.8, 0]] },
  { naam: "Afstellen & aanzetten", min: 2, titel: "Afstellen en aanzetten", tekst: "Zet het zadel recht en druk op de knop: de lampen en het scherm gaan aan.", nodig: [["hand", "Je handen", "", "2×"]], icoon: "hand", focus: ["koplamp", "achterlicht", "scherm"], cam: [2.3, 0.4, 4.1, [0.1, 0.5, 0]] },
];

// ================= Inktlijnen en weergave =================
let rtKleur, rtNormaal;
const lijnMat = new THREE.ShaderMaterial({
  uniforms: { kleur: { value: null }, normaal: { value: null }, diepte: { value: null }, pixel: { value: new THREE.Vector2() }, dik: { value: 0.85 * DPR }, aan: { value: 1 }, inkt: { value: new THREE.Color(0x1e1e1e) }, papier: { value: new THREE.Vector3(241 / 255, 240 / 255, 238 / 255) }, brandpunt: { value: 800 }, ao: { value: 0.55 }, near: { value: camera.near }, far: { value: camera.far } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `
    uniform sampler2D kleur, normaal, diepte; uniform vec2 pixel; uniform float dik, aan, near, far; uniform vec3 inkt; uniform vec3 papier; uniform float brandpunt, ao; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
    void main(){
      vec4 c = texture2D(kleur, vUv);
      float d0r = texture2D(diepte, vUv).r;
      float lijn = 0.0, nadruk = texture2D(normaal, vUv).a;
      if (aan > 0.5) {
        float d0 = lin(d0r); vec3 n0 = texture2D(normaal, vUv).rgb * 2.0 - 1.0; float de = 0.0, ne = 0.0;
        for (int i = 0; i < 4; i++) {
          float a = float(i) * 1.570796; vec2 o = vec2(cos(a), sin(a)) * pixel * dik;
          vec4 nb = texture2D(normaal, vUv + o); float db = texture2D(diepte, vUv + o).r;
          float d = lin(db); de = max(de, (d - d0) / max(d0, 0.001)); // alleen de voorste rand krijgt de lijn
          ne = max(ne, 1.0 - dot(n0, nb.rgb * 2.0 - 1.0));
          if (db < d0r) nadruk = max(nadruk, nb.a);
        }
        lijn = max(smoothstep(0.01, 0.03, de), smoothstep(0.5, 0.8, ne));
      }
      vec3 kl = c.rgb;
      // zachte schaduw in hoeken: hoeveel buren liggen dichterbij (binnen een straal van 4 cm)?
      if (ao > 0.0 && d0r < 0.99999) {
        float d0 = lin(d0r), straal = 0.04 * brandpunt / d0, dicht = 0.0;
        for (int i = 0; i < 14; i++) {
          float a = float(i) * 2.39996, rr = straal * sqrt((float(i) + 0.5) / 14.0);
          vec2 o = vec2(cos(a), sin(a)) * rr * pixel;
          float d = lin(texture2D(diepte, vUv + o).r), v = d0 - d;
          dicht += smoothstep(0.004, 0.02, v) * (1.0 - smoothstep(0.08, 0.16, v));
        }
        kl *= 1.0 - ao * pow(dicht / 14.0, 1.2);
      }
      float zicht = clamp(nadruk, 0.0, 1.0);
      gl_FragColor = vec4(kl, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      vec3 achter = papier;
      vec3 uit = mix(achter, gl_FragColor.rgb, c.a);
      uit = mix(uit, inkt, lijn * mix(0.25, 0.78, zicht));
      gl_FragColor = vec4(uit, 1.0);
    }`,
  depthTest: false, depthWrite: false, toneMapped: true,
});
const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
{ const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lijnMat); q.frustumCulled = false; quadScene.add(q); }
function maakDoelen(w, h) {
  rtKleur?.dispose(); rtNormaal?.dispose();
  rtKleur = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.HalfFloatType });
  rtNormaal = new THREE.WebGLRenderTarget(w, h, { samples: 0, depthTexture: new THREE.DepthTexture(w, h) });
  lijnMat.uniforms.kleur.value = rtKleur.texture; lijnMat.uniforms.normaal.value = rtNormaal.texture; lijnMat.uniforms.diepte.value = rtNormaal.depthTexture;
  lijnMat.uniforms.pixel.value.set(1 / w, 1 / h);
  lijnMat.uniforms.brandpunt.value = (h / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}

// ================= Weetjes en gezien =================
const SECTIE_SLEUTEL = ["fiets", "frame", "motor", "aandrijving", "wielen", "cockpit", "geometrie"];
let WEETJES = {};
fetch("/data/weetjes.json").then((r) => (r.ok ? r.json() : {})).then((d) => { WEETJES = d.secties || {}; if (tab === "anatomie") toon(); }).catch(() => {});
const GEZIEN = [[["wielen", "de wielen"], ["zadel", "het zadel"], ["bel", "de bel"]], [["frame", "het frame"], ["vork", "de voorvork"]], [["motor", "een motor bij de trappers"], ["accu", "een fietsaccu"]], [["ketting", "de ketting"], ["trappers", "de trappers"], ["versnellingen", "de versnellingen"]], [["wielen", "de wielen"], ["ventiel", "het ventiel"], ["remmen", "de remmen"]], [["stuur", "het stuur"], ["bel", "de bel"], ["koplamp", "de koplamp"], ["achterlicht", "het achterlicht"]], []];
const zetTeller = () => { const t = document.getElementById("mijnteller"); if (t) t.textContent = MIJN.aantal(); };
MIJN.opVerandering(zetTeller);

// ================= Kinderen: groot beeld, één knop, een stem =================
const KIND = [
  { naam: "het wiel", focus: ["wielen"], cam: [2.2, 0.32, 2.4, [0.55, 0.35, 0], 40], trappen: true },
  { naam: "het stuur", focus: ["stuur"], cam: [1.9, 0.55, 1.4, [0.47, 0.84, 0], 32] },
  { naam: "de bel", focus: ["bel"], cam: [1.6, 0.7, 0.75, [0.47, 0.88, -0.07], 30], geluid: "bel" },
  { naam: "het zadel", focus: ["zadel"], cam: [Math.PI - 0.7, 0.4, 1.4, [-0.2, 0.95, 0], 32] },
  { naam: "de trappers", focus: ["trappers"], cam: [0.7, 0.3, 1.5, [0, 0.28, 0], 34], trappen: true },
  { naam: "de ketting", focus: ["aandrijving"], cam: [0.45, 0.25, 1.9, [-0.18, 0.33, 0], 30], trappen: true, geluid: "ratel" },
  { naam: "de lamp", focus: ["koplamp", "achterlicht"], cam: [2.3, 0.35, 2.2, [0.3, 0.7, 0], 36], licht: true },
  { naam: "de rem", focus: ["remmen"], cam: [2.7, 0.2, 1.2, [0.55, 0.35, 0], 32] },
  { naam: "de motor", focus: ["motor"], cam: [2.75, 0.26, 1.6, [0.1, 0.3, 0], 34] },
  { naam: "het frame", focus: ["frame", "vork"], cam: [2.42, 0.6, 2.4, [0.14, 0.5, -0.06], 44] },
];
let kindI = 0;
function kindToon(i, praatOok = true) {
  kindI = (i + KIND.length) % KIND.length; const k = KIND[kindI];
  document.getElementById("kindnaam").textContent = k.naam;
  for (const b of document.querySelectorAll("#kindstrook button")) b.setAttribute("aria-current", String(+b.dataset.i === kindI));
  camNaar(k.cam); kleuren(); tekenMini();
  if (praatOok) STEM.zeg(k.naam, { kind: true });
}
function kindGeluid() { const k = KIND[kindI]; if (k.geluid === "bel") STEM.bel(); else if (k.geluid === "ratel") STEM.ratel(); else STEM.zeg(k.naam, { kind: true }); }
function kindTik(d) { const i = KIND.findIndex((k) => k.focus.includes(d)); if (i >= 0 && i !== kindI) kindToon(i); else kindGeluid(); handWeg(); }
function handWeg() { document.getElementById("kindhand")?.remove(); try { localStorage.setItem("fiets-kind-hand", "1"); } catch {} }

// ================= Toestand =================
let stand = params.get("stand") === "donker" ? "donker" : "tekening";
let tab = "anatomie", sectie = 0, stap = 0, gedaan = 0, lampen = false, schermAan = false, tourAan = false, stemAan = false, geluidAan = true;
const stapTijd = { start: 0, duur: 2.6, pauze: false, traag: false, p: 1 };
const podium = document.querySelector(".podium");
const focusVan = () => (tab === "kind" ? KIND[kindI].focus : tab === "anatomie" ? SECTIES[sectie].focus : tab === "bouwen" ? STAPPEN[stap].focus : null);
function kleuren() {
  const f = focusVan(), donker = stand === "donker";
  for (const m of meshes) {
    const basis = MAT[m.userData.soort][donker ? "donker" : "teken"];
    let mat = basis;
    if ((tab === "bouwen" || tab === "kind") && f && f.includes(m.userData.deel) && !["doos"].includes(m.userData.deel)) mat = (m.userData.nadruk ||= {})[stand] ||= Object.assign(basis.clone(), { color: ACCENT[donker ? "donker" : "teken"].clone() });
    m.material = mat;
  }
  const doorzicht = tab === "anatomie" && SECTIES[sectie].doorzicht;
  for (const m of DELEN.frame) { const basis = m.material; if (doorzicht) { m.material = (m.userData.glas ||= {})[stand] ||= Object.assign(basis.clone(), { transparent: true, opacity: 0.28, depthWrite: false }); } }
  if (doorzicht && !G.accu.parent) fiets.add(G.accu); G.accu.visible = doorzicht || uiteenNu > 0.001;
  renderer.toneMapping = donker ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
  renderer.toneMappingExposure = donker ? 1.05 : 1;
  scene.environmentIntensity = donker ? 0.9 : 0.55;
  zon.intensity = donker ? 1.6 : 2.6; hemi.intensity = donker ? 1.0 : 0.55;
  lijnMat.uniforms.aan.value = donker ? 0 : 1; lijnMat.uniforms.ao.value = donker ? 0.35 : 0.6;
  podium.classList.toggle("donker", false);
  zetLichten();
  vraag();
}
function zetLichten() {
  const aan = lampen || (tab === "bouwen" && stap === 8 && stapTijd.p > 0.6) || tab === "klaar" || (tab === "kind" && KIND[kindI].licht);
  for (const s of ["lamp", "achterlicht"]) for (const k of ["teken", "donker"]) MAT[s][k].emissiveIntensity = aan ? (s === "lamp" ? 2.2 : 1.8) : 0;
  const sch = schermAan || aan;
  for (const k of ["teken", "donker"]) MAT.scherm[k].emissiveIntensity = sch ? 0.9 : 0;
  G.bundel.material.opacity = aan ? 0.2 : 0;
  vraag();
}

// ================= Paneel =================
const $ = (id) => document.getElementById(id);
const lijstEl = $("lijst"), inhoudEl = $("inhoud"), knoppenEl = $("onderknoppen"), toetsenEl = $("toetsen");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function toon() {
  for (const b of document.querySelectorAll("[data-tab]")) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  $("teller").textContent = `${Math.min(gedaan, 9)}/9`;
  $("stapnummer").hidden = tab !== "bouwen"; $("speler").hidden = tab !== "bouwen";
  $("hint").textContent = tab === "bouwen" ? "Sleep om te draaien · de stap speelt vanzelf af" : "Sleep om te draaien · tik op de lampen";
  if (tab === "anatomie") {
    lijstEl.innerHTML = SECTIES.map((s, i) => `<li class="${i === sectie ? "aan" : ""}"><button type="button" data-sectie="${i}">${esc(s.naam)}</button></li>`).join("");
    const s = SECTIES[sectie];
    const w = [...(WEETJES[SECTIE_SLEUTEL[sectie]] || []), ...(sectie === 4 ? WEETJES.remmen || [] : []), ...(sectie === 0 ? WEETJES.veiligheid || [] : [])];
    const gezien = GEZIEN[sectie].map(([k, naam]) => { const m = MIJN.lees()[k]; return `<button type="button" class="gezien${m ? " aan" : ""}" data-gezien="${k}" data-naam="${esc(naam)}" aria-pressed="${!!m}">${m ? "✓" : "+"} ${esc(naam.replace(/^(de|het|een) /, ""))}${m ? `<small>${esc(MIJN.datumTekst(m.datum))}</small>` : ""}</button>`; }).join("");
    inhoudEl.innerHTML = `<h2>${esc(s.titel)}</h2><p class="tekst">${esc(s.tekst)}</p><ul class="specs">${s.specs.map(([a, b, tik]) => `<li${tik ? ` class="tik" data-tik="${tik}"` : ""}><span class="label">${esc(a)}</span><span class="waarde">${esc(b)}</span></li>`).join("")}</ul>
      ${gezien ? `<p class="nodig">In het echt gezien?</p><div class="gezienrij">${gezien}</div>` : ""}
      ${w.length ? `<details class="weetjes"><summary>Weetjes <span class="mono zacht">nagekeken · ${w.length}</span></summary><ul>${w.map((x) => `<li>${esc(x.tekst)}<a href="${esc(x.bron)}" target="_blank" rel="noopener noreferrer">${esc(x.bron.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48))}</a></li>`).join("")}</ul></details>` : ""}`;
    knoppenEl.innerHTML = `<button type="button" class="knop licht" id="terug" ${sectie === 0 ? "disabled" : ""}>Terug</button><button type="button" class="knop" id="verder">${esc(s.volgende || "Verder")}</button>`;
    toetsenEl.innerHTML = `<span><kbd>←</kbd> <kbd>→</kbd> verder</span><span><kbd>T</kbd> tour</span>`;
  } else if (tab === "bouwen") {
    lijstEl.innerHTML = STAPPEN.map((s, i) => `<li class="${i === stap ? "aan" : i < gedaan ? "gedaan" : ""}"><button type="button" data-stap="${i}">${esc(s.naam)}<span class="tijd">${s.min} min</span></button></li>`).join("");
    const s = STAPPEN[stap], over = STAPPEN.slice(stap).reduce((a, x) => a + x.min, 0);
    inhoudEl.innerHTML = `<p class="stapregel"><span>Stap ${stap + 1} van 9</span><span class="pil">◷ nog ${over} min</span></p><h2>${esc(s.titel)}</h2><p class="tekst">${esc(s.tekst)}</p>
      <p class="nodig">Je hebt nodig</p><ul class="gereedschap">${s.nodig.map(([ic, a, b, n]) => `<li>${ICOON[ic]}<span><b>${esc(a)}</b><small>${esc(b)}</small></span><span class="aantal">${esc(n)}</span></li>`).join("")}</ul>
      ${s.tip ? `<p class="tip${s.let ? " let" : ""}">${s.let ? "⚠ " : "☼ "}${esc(s.tip)}</p>` : ""}<p class="tip">Doe dit samen met een volwassene.</p>`;
    knoppenEl.innerHTML = `<button type="button" class="knop rond" id="terug" aria-label="Vorige stap">←</button><button type="button" class="knop pil-zwart" id="verder"><span class="v">✓</span><span>Klaar, volgende stap</span><span>→</span></button>`;
    toetsenEl.innerHTML = `<span><u>Vast?</u></span><span><kbd>←</kbd> <kbd>→</kbd> verder · <kbd>R</kbd> opnieuw</span>`;
    $("stapgetal").textContent = stap + 1; $("stapicoon").innerHTML = ICOON[s.icoon];
  } else {
    lijstEl.innerHTML = STAPPEN.map((s) => `<li class="gedaan"><button type="button" tabindex="-1">${esc(s.naam)}<span class="tijd">${s.min} min</span></button></li>`).join("");
    inhoudEl.innerHTML = `<div class="vink">✓</div><h2>Je fiets is af.</h2><p class="tekst">Alle stappen gedaan. Goed gedaan.</p><div class="cijfers"><div><small>Gemiddelde tijd</small><b>25 min</b></div><div><small>Stappen</small><b>9</b></div><div><small>Klikken</small><b>6</b></div></div><p class="nodig">Voor je eerste rit: kijk samen of de remmen werken.</p>`;
    knoppenEl.innerHTML = `<button type="button" class="knop rond" id="terug" aria-label="Terug naar bouwen">←</button><button type="button" class="knop pil-zwart" id="verder"><span></span><span>Bekijk de onderdelen weer</span><span>→</span></button>`;
    toetsenEl.innerHTML = "";
  }
  for (const b of lijstEl.querySelectorAll("[data-sectie]")) b.addEventListener("click", () => gaSectie(+b.dataset.sectie));
  for (const b of lijstEl.querySelectorAll("[data-stap]")) b.addEventListener("click", () => gaStap(+b.dataset.stap));
  for (const b of inhoudEl.querySelectorAll("[data-gezien]")) b.addEventListener("click", () => { MIJN.wissel(b.dataset.gezien, b.dataset.naam); klik(); toon(); });
  for (const li of inhoudEl.querySelectorAll("[data-tik]")) li.addEventListener("click", () => { if (li.dataset.tik === "lampen") lampen = !lampen; else schermAan = !schermAan; klik(); zetLichten(); });
  $("terug")?.addEventListener("click", vorige); $("verder")?.addEventListener("click", volgende);
  tekenMini(); maakNamen(); kleuren(); zetTeller();
}
function praat(t) { if (stemAan) STEM.zeg(t); }
let ac = null;
function klik() { if (!geluidAan || !navigator.userActivation?.hasBeenActive) return; STEM.klik(); return; try { ac ||= new AudioContext(); ac.resume(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 1400; g.gain.setValueAtTime(0.05, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.05); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.06); } catch {} }
function gaSectie(i) { if (uiteen) { uiteen = 0; $("uiteenknop").setAttribute("aria-pressed", "false"); } tab = "anatomie"; sectie = Math.max(0, Math.min(SECTIES.length - 1, i)); camNaar(SECTIES[sectie].cam); klik(); toon(); praat(SECTIES[sectie].titel + ". " + SECTIES[sectie].tekst); }
function gaStap(i) { if (uiteen) { uiteen = 0; $("uiteenknop").setAttribute("aria-pressed", "false"); } tab = "bouwen"; stap = Math.max(0, Math.min(8, i)); stapTijd.start = performance.now(); stapTijd.p = 0; camNaar(STAPPEN[stap].cam); klik(); toon(); praat(STAPPEN[stap].titel + ". " + STAPPEN[stap].tekst); }
function volgende() {
  if (tab === "anatomie") { if (sectie < SECTIES.length - 1) gaSectie(sectie + 1); else gaStap(0); }
  else if (tab === "bouwen") { gedaan = Math.max(gedaan, stap + 1); if (stap < 8) gaStap(stap + 1); else { tab = "klaar"; camNaar([2.3, 0.6, 4.2, [0.1, 0.5, 0]]); klik(); toon(); praat("Je fiets is af. Goed gedaan."); } }
  else gaSectie(0);
}
function vorige() { if (tab === "anatomie") gaSectie(sectie - 1); else if (tab === "bouwen") { if (stap > 0) gaStap(stap - 1); else gaSectie(SECTIES.length - 1); } else gaStap(8); }
for (const b of document.querySelectorAll("[data-tab]")) b.addEventListener("click", () => (b.dataset.tab === "anatomie" ? gaSectie(sectie) : b.dataset.tab === "bouwen" ? gaStap(Math.min(gedaan, 8)) : (gedaan = 9, (tab = "klaar"), toon())));
for (const b of document.querySelectorAll("[data-stand]")) b.addEventListener("click", () => { stand = b.dataset.stand === "echt" ? "donker" : "tekening"; for (const x of document.querySelectorAll("[data-stand]")) x.setAttribute("aria-pressed", String(x === b)); klik(); kleuren(); });
let tourKlok = null;
$("tour").addEventListener("click", (e) => { tourAan = !tourAan; e.currentTarget.setAttribute("aria-pressed", String(tourAan)); clearInterval(tourKlok); if (tourAan) { gaSectie(0); tourKlok = setInterval(() => { if (sectie >= SECTIES.length - 1) { tourAan = false; $("tour").setAttribute("aria-pressed", "false"); clearInterval(tourKlok); } else gaSectie(sectie + 1); }, 6000); } });
$("geluid").addEventListener("click", (e) => { geluidAan = !geluidAan; e.currentTarget.setAttribute("aria-pressed", String(geluidAan)); e.currentTarget.textContent = geluidAan ? "Geluid" : "Stil"; });
$("stem").addEventListener("click", (e) => { stemAan = !stemAan; e.currentTarget.setAttribute("aria-pressed", String(stemAan)); if (stemAan) praat(tab === "anatomie" ? SECTIES[sectie].titel + ". " + SECTIES[sectie].tekst : STAPPEN[stap].titel); else speechSynthesis?.cancel(); });
$("opnieuw").addEventListener("click", () => { stapTijd.start = performance.now(); stapTijd.p = 0; vraag(); });
$("pauze").addEventListener("click", (e) => { stapTijd.pauze = !stapTijd.pauze; e.currentTarget.textContent = stapTijd.pauze ? "▶" : "❚❚"; if (!stapTijd.pauze) stapTijd.start = performance.now() - stapTijd.p * stapTijd.duur * 1000 * (stapTijd.traag ? 2.5 : 1); });
$("traag").addEventListener("click", (e) => { stapTijd.traag = !stapTijd.traag; e.currentTarget.setAttribute("aria-pressed", String(stapTijd.traag)); });
$("uiteenknop").addEventListener("click", () => zetUitElkaar(!uiteen));
addEventListener("keydown", (e) => { if (e.target.closest?.("input,textarea")) return; if (KINDMODUS) { if (e.key === "ArrowRight") kindToon(kindI + 1); else if (e.key === "ArrowLeft") kindToon(kindI - 1); else if (e.key === " ") kindGeluid(); return; } if (e.key.toLowerCase() === "e") zetUitElkaar(!uiteen); if (e.key === "ArrowRight") volgende(); else if (e.key === "ArrowLeft") vorige(); else if (e.key.toLowerCase() === "t") $("tour").click(); else if (e.key.toLowerCase() === "r" && tab === "bouwen") $("opnieuw").click(); });

// minifiets: zijaanzicht in lijnen, het onderdeel van nu in rood
function tekenMini() {
  const sx = (x) => 14 + (x + 0.75) * 62, sy = (y) => 64 - y * 62;
  const ln = (a, b, cls) => `<line x1="${sx(a.x).toFixed(1)}" y1="${sy(a.y).toFixed(1)}" x2="${sx(b.x).toFixed(1)}" y2="${sy(b.y).toFixed(1)}" class="${cls}"/>`;
  const f = focusVan() || [], aan = (d) => (f.includes(d) ? "aan" : "");
  const rw = 0.343 * 62;
  $("minifiets").innerHTML = `<circle cx="${sx(ACHTERAS.x)}" cy="${sy(ACHTERAS.y)}" r="${rw}" class="${aan("wielen")}"/><circle cx="${sx(VOORAS.x)}" cy="${sy(VOORAS.y)}" r="${rw}" class="${aan("wielen")}"/>` +
    [[ZB_BOVEN, HT_BOVEN], [BB, HT_ONDER], [BB, ZB_BOVEN], [BB, ACHTERAS], [ZB(0.4), ACHTERAS], [HT_BOVEN, HT_ONDER]].map(([a, b]) => ln(a, b, aan("frame"))).join("") +
    ln(HT_ONDER, VOORAS, aan("vork")) + ln(ZB_BOVEN, ZADEL, aan("zadelpen")) + ln(ZADEL.clone().add(V(-0.1, 0.04)), ZADEL.clone().add(V(0.12, 0.04)), aan("zadel")) +
    ln(HT_BOVEN, HT_BOVEN.clone().add(V(0.12, 0.02)), aan("stuur")) + `<circle cx="${sx(BB.x)}" cy="${sy(BB.y)}" r="6" class="${aan("aandrijving") || aan("motor")}"/>`;
}

// ================= Namen met lijntjes, en maten =================
const namenEl = $("namen"), lijnEl = $("lijntjes");
const ANKER = {};
function anker(naam) { // geeft [object, lokaal punt]
  if (ANKER[naam]) return ANKER[naam];
  const [d, sub] = naam.split(":");
  let obj = DELEN[d]?.[0], p = new THREE.Vector3();
  if (d === "frame") obj = G.buizen[sub || "onder"];
  if (d === "wielen") { obj = sub === "voor" ? VW.w : AW.w; }
  if (d === "aandrijving" && sub === "cassette") obj = AW.w;
  if (d === "aandrijving" && sub === "blad") obj = G.crank;
  const b = new THREE.Box3().setFromObject(obj); b.getCenter(p);
  if (d === "wielen") p.add(V(0.12, 0.22, 0));
  if (sub === "cassette") p.add(V(0, 0.04, 0.05));
  if (sub === "blad") p.add(V(0.05, 0.06, 0.04));
  return (ANKER[naam] = [obj, obj.worldToLocal(p)]);
}
let namen = [];
function maakNamen() {
  namenEl.textContent = ""; lijnEl.textContent = ""; namen = [];
  if (uiteen) {
    if (!EX.length) exDef();
    const kant = (e) => (e.v.x >= 0 ? 1 : -1);
    for (const e of EX) if (e.naam) {
      const el = document.createElement("span"); el.className = "naam"; el.textContent = e.naam; namenEl.append(el);
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line"); lijnEl.append(l);
      namen.push({ ex: e, el, l, dx: e.plek ? e.plek[0] : kant(e) * 46, dy: e.plek ? e.plek[1] : e.v.y >= 0 ? -26 : 26 });
    }
    return;
  }
  if (tab !== "anatomie") return;
  const s = SECTIES[sectie];
  for (const [ank, tekst, dx, dy] of s.namen || []) {
    const el = document.createElement("span"); el.className = "naam"; el.textContent = tekst; namenEl.append(el);
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line"); lijnEl.append(l);
    namen.push({ ank, el, l, dx, dy });
  }
  const maten = s.geometrie ? [
    [V(ACHTERAS.x, 0.005, -0.3), V(VOORAS.x, 0.005, -0.3), "WIELBASIS 1020", 0, 14],
    [V(BB.x, BBY, -0.2), V(BB.x, HT_BOVEN.y, -0.2), "STACK 590", -10, 0],
    [V(BB.x, HT_BOVEN.y + 0.06, -0.2), V(HT_BOVEN.x, HT_BOVEN.y + 0.06, -0.2), "REACH 385", 0, -10],
    [V(BB.x, BBY, -0.25), V(ACHTERAS.x, ACHTERAS.y, -0.25), "ACHTERVORK 420", -40, 22],
  ] : s.maat ? [[V(ACHTERAS.x, 0.005, -0.42), V(VOORAS.x, 0.005, -0.42), "1020 MM", 0, 14]] : [];
  for (const [a, b, tekst, ox, oy] of maten) {
    const el = document.createElement("span"); el.className = "naam maatlabel"; el.textContent = tekst; namenEl.append(el);
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("class", "maat"); lijnEl.append(p);
    namen.push({ maat: [a, b], el, p, ox, oy });
  }
  if (s.geometrie) for (const [tekst, p] of [["BALHOOFDHOEK 72,9°", HT_ONDER.clone().add(V(0.05, 0.05, -0.1))], ["ZITBUISHOEK 73,3°", ZB(0.3).add(V(-0.1, 0, -0.1))], ["TRAPASVERLAGING 75", BB.clone().add(V(0.0, -0.05, -0.1))]]) {
    const el = document.createElement("span"); el.className = "naam"; el.textContent = tekst; namenEl.append(el); namen.push({ vast: p, el });
  }
}
const pw = new THREE.Vector3();
function scherm(p, r) { pw.copy(p).project(camera); return [((pw.x + 1) / 2) * r.width, ((1 - pw.y) / 2) * r.height]; }
function namenBijwerken() {
  if (!namen.length) return;
  const r = doek.getBoundingClientRect();
  for (const n of namen) {
    if (n.maat) {
      const [ax, ay] = scherm(n.maat[0], r), [bx, by] = scherm(n.maat[1], r);
      let px = -(by - ay), py = bx - ax; const l = Math.hypot(px, py) || 1; px = (px / l) * 5; py = (py / l) * 5;
      n.p.setAttribute("d", `M${ax},${ay}L${bx},${by}M${ax - px},${ay - py}L${ax + px},${ay + py}M${bx - px},${by - py}L${bx + px},${by + py}`);
      n.el.style.left = (ax + bx) / 2 + (n.ox || 0) + "px"; n.el.style.top = (ay + by) / 2 + (n.oy || 0) + "px";
    } else if (n.vast) { const [x, y] = scherm(n.vast, r); n.el.style.left = x + "px"; n.el.style.top = y + "px"; }
    else {
      if (n.ex && !n.ex.lok) continue;
      const [obj, lok] = n.ex ? [n.ex.obj, n.ex.lok] : anker(n.ank); pw.copy(lok); obj.localToWorld(pw);
      n.el.style.opacity = n.ex ? Math.min(1, uiteenNu * 2) : 1; if (n.l) n.l.style.opacity = n.el.style.opacity;
      const [ax, ay] = scherm(pw, r), links = n.dx < 0, bw = (n.w ||= n.el.offsetWidth || 90);
      const lx = links ? Math.max(8 + bw, ax + n.dx) : Math.min(r.width - 8 - bw, ax + n.dx), ly = Math.max(70, Math.min(r.height - 40, ay + n.dy));
      n.el.classList.toggle("links", links); n.el.style.left = lx + (links ? -3 : 3) + "px"; n.el.style.top = ly + "px";
      n.l.setAttribute("x1", ax); n.l.setAttribute("y1", ay); n.l.setAttribute("x2", lx); n.l.setAttribute("y2", ly);
    }
  }
}

// ================= Camera =================
const cam = { draai: 2.42, helling: 0.68, afstand: 1.9, doel: V(0.14, 0.48, -0.06), fov: 48 }, camDoel = { ...cam, doel: cam.doel.clone() };
let camVolgt = true;
function camNaar([d, h, a, p, fov = 30]) { camDoel.draai = cam.draai + Math.atan2(Math.sin(d - cam.draai), Math.cos(d - cam.draai)); camDoel.helling = h; camDoel.afstand = a; camDoel.doel = V(...p); camDoel.fov = fov; camVolgt = true; vraag(); }
const wijzers = new Map(); let vaart = 0, knijp = null;
doek.addEventListener("pointerdown", (e) => { doek.setPointerCapture(e.pointerId); wijzers.set(e.pointerId, { x: e.clientX, y: e.clientY }); vaart = 0; camVolgt = false; if (wijzers.size === 2) { const [a, b] = [...wijzers.values()]; knijp = { d: Math.hypot(a.x - b.x, a.y - b.y), a: cam.afstand }; } });
doek.addEventListener("pointermove", (e) => {
  const w = wijzers.get(e.pointerId); if (!w) return; const dx = e.clientX - w.x, dy = e.clientY - w.y; w.x = e.clientX; w.y = e.clientY;
  if (wijzers.size === 2 && knijp) { const [a, b] = [...wijzers.values()]; cam.afstand = THREE.MathUtils.clamp(knijp.a * knijp.d / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), 0.5, 7); }
  else { vaart = -dx * 0.007; cam.draai += vaart; cam.helling = THREE.MathUtils.clamp(cam.helling + dy * 0.004, -0.05, 1.3); }
  vraag();
});
const los = (e) => { wijzers.delete(e.pointerId); if (wijzers.size < 2) knijp = null; };
doek.addEventListener("pointerup", los); doek.addEventListener("pointercancel", los);
doek.addEventListener("wheel", (e) => { e.preventDefault(); camVolgt = false; cam.afstand = THREE.MathUtils.clamp(cam.afstand * Math.exp(e.deltaY * 0.001), 0.5, 7); vraag(); }, { passive: false });
const ray = new THREE.Raycaster();
doek.addEventListener("click", (e) => {
  const r = doek.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const h = ray.intersectObjects(meshes.filter((m) => m.visible), false)[0]; if (!h) return;
  const d = h.object.userData.deel;
  if (KINDMODUS) { kindTik(d); return; }
  if (d === "bel") { if (geluidAan) STEM.bel(); }
  else if (["koplamp", "achterlicht"].includes(d)) { lampen = !lampen; klik(); zetLichten(); }
  else if (d === "scherm") { schermAan = !schermAan; klik(); zetLichten(); }
  else { const i = SECTIES.findIndex((s) => s.focus?.includes(d)); if (i >= 0 && tab === "anatomie") gaSectie(i); }
});

// ================= Beweging per stap =================
let krukHoek = 0.6, kettingT = 0, wielHoek = 0;
const glad = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const tussen = (p, a, b) => glad((p - a) / (b - a));
function zetBouw() {
  const s = (i) => (tab !== "bouwen" ? 1 : i < stap ? 1 : i > stap ? 0 : stapTijd.p);
  const s1 = s(0), s2 = s(1), s4 = s(3), s5 = s(4), s6 = s(5), s7 = s(6), s8 = s(7);
  // 1: uit de doos
  const inDoos = tab === "bouwen" && stap === 0;
  G.doos.visible = inDoos || (tab === "bouwen" && stap === 0);
  fiets.position.y = (1 - tussen(s1, 0.25, 0.85)) * -0.42 * (tab === "bouwen" ? 1 : 0);
  fiets.position.z = 0;
  for (const { f, k } of G.flappen) f.rotation.x = k * -tussen(s1, 0, 0.25) * 2.1;
  // 2: stuur
  const a2 = 1 - tussen(s2, 0, 1);
  G.stuur.position.copy(G.stuurThuis).add(V(-0.05 * a2, -0.18 * a2, -0.25 * a2));
  G.stuur.rotation.set(0, a2 * 1.4, a2 * 0.6);
  // 3: boutjes kruislings
  const p3 = tab === "bouwen" && stap === 2 ? stapTijd.p : -1;
  G.bouten.forEach((b, i) => { const aan = p3 >= 0 && p3 > i * 0.22 && p3 < i * 0.22 + 0.3; b.scale.setScalar(aan ? 1.5 : 1); });
  // 4: trappers
  G.trappers.forEach((t, i) => { const a = 1 - tussen(s4, i * 0.3, i * 0.3 + 0.6), k = i ? -1 : 1; t.position.copy(G.trapperThuis[i]).add(V(0, 0, k * 0.16 * a)); t.rotation.z = -krukHoek; t.rotation.x = a * 6; });
  // 5: blokje eruit
  const a5 = tussen(s5, 0.1, 0.8); G.blokje.position.copy(G.blokjeThuis).add(V(0.08 * a5, -0.06 * a5, -0.03 * a5)); G.blokje.visible = s5 < 0.98;
  // 6: voorwiel
  const a6 = 1 - tussen(s6, 0, 0.7); VW.w.position.copy(G.voorwielThuis).add(V(0.05 * a6, -0.3 * a6, 0)); VW.steekas.position.z = (1 - tussen(s6, 0.7, 1)) * 0.14;
  // 7: banden oppompen
  const p7 = tab === "bouwen" && stap === 6 ? stapTijd.p : 1, opg = tab === "bouwen" && stap < 6 ? 0.965 : 0.965 + 0.035 * glad(p7);
  for (const W of [AW, VW]) for (const m of [W.loop, ...W.wanden]) m.scale.set(opg, opg, 1);
  // 8: zadelpen
  const a8 = 1 - tussen(s8, 0, 0.8); G.zadelpen.position.copy(G.penAs).multiplyScalar(-0.16 * a8); G.streep.visible = tab === "bouwen" && stap === 7;
  // 9: aanzetten
  zetLichten();
}

// ================= Uit elkaar (explosietekening) =================
// Verschuiving in wereldrichtingen: x = vooruit, y = omhoog, z = rechts. Volgorde = wie het eerst vertrekt.
let uiteen = 0, uiteenNu = 0;
const EX = [];
function exDef() {
  const lijst = [
    [voorkant, [0.2, 0.04, 0], "VOORVORK", [50, -20]], [VW.w, [0.22, -0.04, 0.05], "VOORWIEL", [60, 30]], [G.stuur, [0.06, 0.26, 0], "STUUR", [50, -24]], [G.lamp, [0.2, 0.08, 0], "KOPLAMP", [50, 10]],
    [AW.w, [-0.4, 0, 0], "ACHTERWIEL · CASSETTE", [-60, -40]], [G.klauwA, [-0.4, 0, -0.16], null], [G.derailleur, [-0.3, -0.14, 0.26], "DERAILLEUR", [-70, 20]],
    [G.crank, [0.02, -0.16, 0.3], "CRANKSTEL", [-80, 30]], [G.trappers[0], [0, 0, 0.16], null], [G.trappers[1], [0, 0, -0.16], null],
    [G.ketting.binnen, [-0.12, -0.06, 0.18], null], [G.ketting.buiten, [-0.12, -0.06, 0.18], "KETTING", [-60, -30]],
    [G.motor, [0.04, -0.26, -0.06], "MOTOR", [60, 26]], [G.deksel, [0.04, -0.26, -0.2], null], [G.accu, [0.16, -0.1, -0.36], "ACCU · 16 CELLEN", [60, -26]],
    [G.scherm, [0, 0.22, -0.1], "SCHERM", [50, -20]], [G.zadelpen, [-0.05, 0.32, 0], "ZADELPEN · ZADEL", [-60, -20]],
  ];
  lijst.forEach(([obj, v, naam, plek], i) => EX.push({ obj, v: V(...v), naam, plek, vertraging: i * 0.035, beheerd: [G.stuur, VW.w, G.zadelpen, ...G.trappers].includes(obj) }));
}
const gidsGeo = new THREE.BufferGeometry(), gidsMat = new THREE.LineDashedMaterial({ color: 0x8a8a87, dashSize: 0.012, gapSize: 0.01 });
const gids = new THREE.LineSegments(gidsGeo, gidsMat); gids.userData.geenLijn = true; gids.frustumCulled = false; scene.add(gids);
const qInv = new THREE.Quaternion(), wp = new THREE.Vector3();
function zetUiteen() {
  if (!EX.length) exDef();
  const u = uiteenNu, pts = [];
  if (u > 0.001 && !G.accu.parent) fiets.add(G.accu);
  G.accu.visible = u > 0.001 || (tab === "anatomie" && SECTIES[sectie].doorzicht);
  if (u <= 0.001 && !G.accu.visible && G.accu.parent) fiets.remove(G.accu);
  fiets.updateMatrixWorld(true);
  for (const e of EX) {
    if (!e.beheerd) { e.thuis ||= e.obj.position.clone(); e.obj.position.copy(e.thuis); }
    e.obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(e.obj); const thuisW = b.getCenter(new THREE.Vector3());
    if (!e.lok) e.lok = e.obj.worldToLocal(thuisW.clone());
    const k = glad((u - e.vertraging) / (1 - 0.6)) ;
    if (k <= 0) continue;
    e.obj.parent.getWorldQuaternion(qInv).invert();
    e.obj.position.add(e.v.clone().multiplyScalar(k).applyQuaternion(qInv));
    e.obj.updateMatrixWorld(true);
    if (e.naam || true) { pts.push(thuisW, thuisW.clone().addScaledVector(e.v, k)); }
  }
  gidsGeo.setFromPoints(pts.length ? pts : [V(0, 0, 0), V(0, 0, 0)]); gids.computeLineDistances();
  gids.visible = u > 0.02;
  G.remleiding.visible = u < 0.05;
}
function zetUitElkaar(aan) {
  uiteen = aan ? 1 : 0; $("uiteenknop").setAttribute("aria-pressed", String(aan));
  if (aan) camNaar([2.45, 0.5, 3.3, [0.04, 0.5, 0], 44]); else camNaar(tab === "anatomie" ? SECTIES[sectie].cam : tab === "bouwen" ? STAPPEN[stap].cam : [2.3, 0.6, 4.2, [0.1, 0.5, 0]]);
  podium.classList.toggle("smal-uit", !!aan);
  klik(); maakNamen(); vraag();
}

// ================= Klaar-scherm: rondzwevende onderdeeltjes =================
const snippers = new THREE.Group(); scene.add(snippers); snippers.visible = false;
{
  const vormen = [new THREE.CylinderGeometry(0.006, 0.006, 0.02, 10), new THREE.TorusGeometry(0.012, 0.003, 8, 20), rondeDoos(0.025, 0.01, 0.006, 0.002), new THREE.BoxGeometry(0.004, 0.03, 0.004)];
  for (let i = 0; i < 34; i++) { const m = new THREE.Mesh(vormen[i % 4], (i % 5 === 0 ? MAT.rood : MAT.zwartmetaal).teken); const a = Math.random() * TAU, rr = 0.6 + Math.random() * 0.9; m.position.set(0.1 + Math.cos(a) * rr, 0.2 + Math.random() * 1.2, Math.sin(a) * rr * 0.8); m.rotation.set(Math.random() * 6, Math.random() * 6, 0); m.userData = { soort: i % 5 === 0 ? "rood" : "zwartmetaal", deel: "snipper", v: Math.random() * 0.4 + 0.1 }; snippers.add(m); meshes.push(m); }
}

// ================= Tekenen =================
let vraagNu = true; const vraag = () => { vraagNu = true; };
function zetLens() {
  const fov = camera.userData.fov || cam.fov || 30;
  camera.fov = camera.aspect < 1.2 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov * 0.62)) / camera.aspect)) : fov;
  camera.updateProjectionMatrix();
  if (rtKleur) lijnMat.uniforms.brandpunt.value = (rtKleur.height / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}
function maat() {
  const r = doek.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height); zetLens(); maakDoelen(Math.round(r.width * DPR), Math.round(r.height * DPR)); vraag();
}
new ResizeObserver(maat).observe(doek);
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), vT = new THREE.Vector3(), vP = new THREE.Vector3(), Z = V(0, 0, 1), X = V(1, 0, 0);
function zetKetting() {
  const { pad, n, binnen, buiten } = G.ketting;
  for (let i = 0; i < n; i++) {
    const t = (((i + 0.5) / n + kettingT) % 1 + 1) % 1; pad.getPointAt(t, vP); pad.getTangentAt(t, vT);
    q4.setFromUnitVectors(X, vT);
    for (const [im, dz] of [[binnen, i % 2 ? 0.0032 : 0.0044], [buiten, -(i % 2 ? 0.0032 : 0.0044)]]) { m4.compose(vP.clone().add(V(0, 0, dz)), q4, V(1, 1, 1)); im.setMatrixAt(i, m4); }
  }
  binnen.instanceMatrix.needsUpdate = buiten.instanceMatrix.needsUpdate = true;
}
const fpsEl = { tijden: [] }; window.__meting = { frames: 0 };
let vorigeT = performance.now(), opening = params.has("stil") ? 1 : 0;
function stap_(t) {
  requestAnimationFrame(stap_);
  const dt = Math.max(0, Math.min(0.05, (t - vorigeT) / 1000)); vorigeT = t;
  let bezig = false;
  if (opening < 1) { opening = Math.min(1, opening + dt / 1.6); bezig = true; }
  if (camVolgt) { const k = Math.min(1, dt * 2.6); for (const key of ["draai", "helling", "afstand", "fov"]) cam[key] += (camDoel[key] - cam[key]) * k; zetLens(); cam.doel.lerp(camDoel.doel, k); if (Math.abs(camDoel.draai - cam.draai) + Math.abs(camDoel.afstand - cam.afstand) + cam.doel.distanceTo(camDoel.doel) > 0.002) bezig = true; }
  if (Math.abs(vaart) > 1e-4 && !wijzers.size) { cam.draai += vaart; vaart *= 0.94; bezig = true; }
  // trappen en rollen
  const trap = (tab === "anatomie" && (SECTIES[sectie].trappen || SECTIES[sectie].rollen)) || tab === "klaar" || (tab === "kind" && KIND[kindI].trappen);
  if (trap) { krukHoek -= dt * 2.2; wielHoek -= dt * 2.2 * (46 / 21); kettingT -= dt * 2.2 * ((46 * 0.0127) / TAU) / G.ketting.pad.getLength(); bezig = true; }
  if (tab === "bouwen" && !stapTijd.pauze && stapTijd.p < 1) { stapTijd.p = Math.min(1, (t - stapTijd.start) / (stapTijd.duur * 1000 * (stapTijd.traag ? 2.5 : 1))); bezig = true; }
  if (tab === "klaar") { cam.draai += dt * 0.12; bezig = true; }
  if (Math.abs(uiteenNu - uiteen) > 1e-3) { uiteenNu += Math.sign(uiteen - uiteenNu) * Math.min(Math.abs(uiteen - uiteenNu), dt / 1.6); bezig = true; } else uiteenNu = uiteen;
  snippers.visible = tab === "klaar" || uiteenNu > 0.3;
  if (snippers.visible) for (const s of snippers.children) { s.rotation.x += dt * s.userData.v; s.rotation.y += dt * s.userData.v * 0.7; s.position.y += Math.sin(t / 900 + s.id) * 0.0006; }
  if (!rtKleur || (!bezig && !vraagNu)) return; vraagNu = false;
  G.crank.rotation.z = krukHoek; AW.draaiG.rotation.z = wielHoek; VW.draaiG.rotation.z = wielHoek;
  for (const j of G.jockeys) j.rotation.z = wielHoek * 3;
  zetKetting(); zetBouw(); zetUiteen();
  const o = glad(opening), dr = cam.draai - (1 - o) * 1.2, af = cam.afstand + (1 - o) * 2.5;
  camera.position.set(cam.doel.x + Math.sin(dr) * Math.cos(cam.helling) * af, cam.doel.y + Math.sin(cam.helling) * af, cam.doel.z + Math.cos(dr) * Math.cos(cam.helling) * af); camera.lookAt(cam.doel);
  // 1. kleur, 2. normalen + diepte (alfa: zit het in de nadruk?), 3. samen
  renderer.setRenderTarget(rtKleur); renderer.setClearColor(0xffffff, 0); renderer.clear(); renderer.render(scene, camera);
  const f = focusVan(), bewaar = new Map();
  for (const m of meshes) { bewaar.set(m, m.material); m.material = !f || f.includes(m.userData.deel) || m.userData.deel === "snipper" ? NORM_AAN : NORM_UIT; }
  const zichtbaar = []; scene.traverse((o) => { if (o.userData?.geenLijn && o.visible) { zichtbaar.push(o); o.visible = false; } });
  grond.visible = false; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(rtNormaal); renderer.setClearColor(0x8080ff, 0); renderer.clear(); renderer.render(scene, camera);
  renderer.shadowMap.autoUpdate = true; grond.visible = true; zichtbaar.forEach((o) => (o.visible = true));
  for (const [m, mat] of bewaar) m.material = mat;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  namenBijwerken();
  window.__meting.frames++;
}
if (KINDMODUS) {
  document.body.classList.add("kindmodus"); tab = "kind";
  const strook = document.getElementById("kindstrook");
  strook.innerHTML = KIND.map((k, i) => `<button type="button" data-i="${i}">${esc(k.naam.replace(/^(de|het) /, ""))}</button>`).join("");
  for (const b of strook.querySelectorAll("button")) b.addEventListener("click", () => { kindToon(+b.dataset.i); handWeg(); });
  document.getElementById("kindknop").addEventListener("click", () => { kindGeluid(); handWeg(); });
  document.getElementById("kindvorige").addEventListener("click", () => { kindToon(kindI - 1); handWeg(); });
  document.getElementById("kindvolgende").addEventListener("click", () => { kindToon(kindI + 1); handWeg(); });
  let sx = null; doek.addEventListener("pointerdown", (e) => (sx = e.clientX)); doek.addEventListener("pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 90 && !wijzers.size) kindToon(kindI + (e.clientX < sx ? 1 : -1)); sx = null; });
  try { if (localStorage.getItem("fiets-kind-hand")) document.getElementById("kindhand")?.remove(); } catch {}
  kindToon(0, false); zetTeller();
} else { toon(); camNaar(SECTIES[0].cam); }
if (params.get("cam")) { const c = params.get("cam").split(",").map(Number); camNaar([c[0], c[1], c[2], [c[3], c[4], c[5]], +(params.get("fov") || 30)]); }

if (params.get("sectie")) gaSectie(+params.get("sectie"));
if (params.get("stap")) { gaStap(+params.get("stap")); if (params.has("af")) stapTijd.start = -1e9; }
if (params.has("klaar")) { gedaan = 9; tab = "klaar"; toon(); camNaar([2.3, 0.6, 4.2, [0.1, 0.5, 0]]); }
if (params.get("stand") !== "tekening") document.querySelector('[data-stand="echt"]').click();
if (params.has("uiteen")) { zetUitElkaar(true); if (params.has("af")) uiteenNu = 1; }
requestAnimationFrame(stap_);
window.__klaar = true;
requestAnimationFrame(() => document.getElementById("laden")?.remove());
window.__info = { meshes: meshes.length };
