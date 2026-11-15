// De gedeelde motor voor alle voertuigen behalve de fiets (die heeft bouwstappen en staat in app.js).
// Een voertuig is een module in /js/voertuigen/<naam>.js met een standaard-export maak(ctx) die zijn vorm bouwt
// en teruggeeft: { naam, SECTIES, KIND, uiteen(), uiteenCam, anker(), mini(aan), beweeg(dt, h, s), doorzicht(aan), tik(d) }.
// Maten zijn in de eenheden van het voertuig; de motor schaalt het voertuig zodat het ongeveer 4 lang is.
// Weergave (licht, materialen, inktlijnen) is overgenomen uit app.js.
import * as THREE from "/js/vendor/three.module.min.js";
import { mergeGeometries } from "/js/vendor/BufferGeometryUtils.js";
import { HDRLoader } from "/js/vendor/HDRLoader.js";
import * as STEM from "/js/stem.js";
import * as MIJN from "/js/mijn.js";
const params = new URLSearchParams(location.search);
const pad = location.pathname.replace(/\/$/, "").split("/").filter(Boolean);
const KINDMODUS = pad[0] === "kinderen";
const RUSTIG = matchMedia("(prefers-reduced-motion: reduce)").matches;
const HELD = params.has("held"); // kaal, als bewegend beeld in de opening van de voorpagina
if (HELD) document.body.classList.add("held");
const SLUG = (params.get("v") || (KINDMODUS ? pad[1] : pad[0]) || "vliegtuig").replace(/[^a-z]/g, "");
const TAU = Math.PI * 2;
const HDR = "/modellen/studio_small_09_1k.hdr";
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// ================= Renderer, licht =================
const doek = document.getElementById("doek");
const renderer = new THREE.WebGLRenderer({ canvas: doek, antialias: false, powerPreference: "high-performance" });
const DPR = Math.min(devicePixelRatio || 1, 2);
renderer.setPixelRatio(DPR);
renderer.setClearColor(0xffffff, 0);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
const zon = new THREE.DirectionalLight(0xffffff, 2.0);
zon.position.set(2.4, 9, 4.4); zon.castShadow = true; zon.shadow.mapSize.set(2048, 2048);
Object.assign(zon.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 0.5, far: 16 });
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
const grond = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.17 }));
grond.receiveShadow = true; scene.add(grond);

// ================= Materialen: "tekening" (wit papier) en "donker" (mat zwart, zoals in het voorbeeld) =================
const SOORT = {
  romp: [0xfbfbf9, { color: 0x2a2b2d, roughness: 0.4, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.2 }],
  klep: [0xe4e4e1, { color: 0x3a3c3f, roughness: 0.45, metalness: 0.3 }],
  raam: [0x55575a, { color: 0x0d0f11, roughness: 0.1, metalness: 0.4, clearcoat: 1 }],
  naad: [0xd2d2cf, { color: 0x232426, roughness: 0.4, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.2 }],
  stoel: [0xc4c9d1, { color: 0x3c4658, roughness: 0.8, metalness: 0 }],
  vloer: [0xe6e6e3, { color: 0x2a2b2d, roughness: 0.8, metalness: 0 }],
  roodlicht: [0xff8a8a, { color: 0xc8102e, roughness: 0.2, metalness: 0, emissive: 0xff2030, emissiveIntensity: 0 }],
  groenlicht: [0x8fe0a6, { color: 0x1d8a3a, roughness: 0.2, metalness: 0, emissive: 0x20ff60, emissiveIntensity: 0 }],
  witlicht: [0xffffff, { color: 0xffffff, roughness: 0.2, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0 }],
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
    teken: new THREE.MeshStandardMaterial({ color: teken, roughness: ["metaal", "schijf", "ketting", "zwartmetaal", "klep"].includes(k) ? 0.45 : 0.75, metalness: ["metaal", "schijf", "ketting"].includes(k) ? 0.35 : 0, envMapIntensity: 0.7, emissive: donker.emissive ?? 0x000000, emissiveIntensity: 0 }),
    donker: new THREE.MeshPhysicalMaterial({ ...donker }),
  };
}
// een voertuig kan eigen materialen toevoegen: soort(naam, kleur voor de tekening, opties voor donker)
function soort(naam, teken, donker) {
  if (MAT[naam]) return naam;
  const gedeeld = {}; for (const k of ["transparent", "opacity", "side", "depthWrite"]) if (k in donker) gedeeld[k] = donker[k];
  MAT[naam] = { teken: new THREE.MeshStandardMaterial({ color: teken, roughness: 0.75, metalness: 0, envMapIntensity: 0.7, emissive: donker.emissive ?? 0x000000, emissiveIntensity: 0, ...gedeeld }), donker: new THREE.MeshPhysicalMaterial({ ...donker }) };
  return naam;
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

// ---- een vleugelprofiel, uitgetrokken over doorsneden (NACA 4-cijfers, 2 procent welving)
function profiel(n = 30) {
  const p = [], m = 0.02, pp = 0.4;
  for (let i = 0; i <= n; i++) { const b = (i / n) * Math.PI, x = (1 - Math.cos(b)) / 2; p.push(x); }
  const pt = (x, onder) => { const yt = 5 * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = x < pp ? (m / pp ** 2) * (2 * pp * x - x * x) : (m / (1 - pp) ** 2) * (1 - 2 * pp + 2 * pp * x - x * x); return [x, yc + (onder ? -yt : yt), yt]; };
  return [...p.slice().reverse().map((x) => pt(x, false)), ...p.slice(1).map((x) => pt(x, true))]; // van achterrand over de bovenkant naar voren en onderlangs terug
}
const PROFIEL = profiel();
// een vleugelachtig deel: dikte per doorsnede schaalt het profiel (12 procent) naar t
function vleugelvorm(secs, naar, soort, deel, dicht = true) {
  const echte = secs.map((sc) => ({ ...sc }));
  const pos = [], idx = [], n = PROFIEL.length;
  for (const sc of echte) for (const [x, y] of PROFIEL) pos.push(...naar(sc.le - x * sc.c, y * sc.c * sc.t, sc).toArray());
  for (let i = 0; i < echte.length - 1; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
  if (dicht) for (const [l, kant] of [[echte.length - 1, 1], [0, -1]]) { if (kant < 0 && !secs.wortelDicht) continue; const sc = echte[l], ci = pos.length / 3; pos.push(...naar(sc.le - 0.4 * sc.c, 0.02 * sc.c, sc).toArray()); for (let j = 0; j < n - 1; j++) kant > 0 ? idx.push(l * n + j, ci, l * n + j + 1) : idx.push(l * n + j + 1, ci, l * n + j); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function naarBuitenG(g, binnen) { // draai de vlakken om als de normalen naar het punt "binnen" wijzen
  const p = g.attributes.position, nrm = g.attributes.normal; let som = 0;
  for (let i = 0; i < p.count; i += 7) som += (p.getX(i) - binnen.x) * nrm.getX(i) + (p.getY(i) - binnen.y) * nrm.getY(i) + (p.getZ(i) - binnen.z) * nrm.getZ(i);
  if (som < 0) { const ix = g.index.array; for (let q = 0; q < ix.length; q += 3) { const tmp = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = tmp; } g.computeVertexNormals(); }
  return g;
}

// ================= Het voertuig bouwen =================
const root = new THREE.Group(); scene.add(root);
const ctx = { THREE, V, TAU, root, MAT, soort, DELEN, meshes, mesh, groep, op, veeg, buis, samen, staaf, draai, rondeDoos, tandwiel, vleugelvorm, naarBuitenG, PROFIEL, mergeGeometries };
const DEF = (await import(`/js/voertuigen/${SLUG}.js`)).default(ctx);
const { SECTIES, KIND } = DEF;
root.updateMatrixWorld(true);
const F = (() => { const s = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()); return 4 / Math.max(s.x, s.z, 0.001); })();
root.scale.setScalar(F); root.updateMatrixWorld(true);
// pagina vullen: titel, schakelaar, kinderstrook
document.title = `${DEF.titel} · Voertuigen`;
{
  const zet = (id, f) => { const el = document.getElementById(id); if (el) f(el); };
  zet("model", (el) => (el.textContent = DEF.model || DEF.label));
  zet("paginakop", (el) => (el.textContent = DEF.titel));
  zet("kindterug", (el) => (el.href = "/" + SLUG));
  zet("kindlink", (el) => (el.href = "/kinderen/" + SLUG));
  if (DEF.hint) zet("hint", (el) => (el.textContent = DEF.hint));
  zet("minitekst", (el) => (el.textContent = (DEF.schaal ? DEF.schaal + " · " : "") + "sleep om te draaien"));
  zet("doek", (el) => el.setAttribute("aria-label", `Een getekend voertuig: ${DEF.titel.toLowerCase()}. Sleep om te draaien.`));
  document.querySelector(".podium")?.setAttribute("aria-label", `${DEF.titel} in 3D`);
}

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

// ================= Weetjes =================
const SECTIE_SLEUTEL = SECTIES.map((s) => s.sleutel);
let WEETJES = {};
fetch(`/data/weetjes-${SLUG}.json`).then((r) => (r.ok ? r.json() : {})).then((d) => { WEETJES = d.secties || {}; if (tab === "anatomie") toon(); }).catch(() => {});
const zetTeller = () => { const t = document.getElementById("mijnteller"); if (t) t.textContent = MIJN.aantal(); };

// ================= Toestand en kleuren =================
let stand = "donker", tab = KINDMODUS ? "kind" : "anatomie", sectie = 0, kindI = 0, lichtAan = false, stemAan = false, geluidAan = true, tourAan = false;
const podium = document.querySelector(".podium");
const huidig = () => (tab === "kind" ? KIND[kindI] : SECTIES[sectie]);
const focusVan = () => huidig().focus;
function kleuren() {
  const f = focusVan(), donker = stand === "donker", h = huidig(), doorzicht = !!h.doorzicht || uiteenNu > 0.01;
  for (const m of meshes) {
    const basis = MAT[m.userData.soort][donker ? "donker" : "teken"];
    let mat = basis;
    if (tab === "kind" && f && f.includes(m.userData.deel)) mat = (m.userData.nadruk ||= {})[stand] ||= Object.assign(basis.clone(), { color: ACCENT[donker ? "donker" : "teken"].clone() });
    if (doorzicht && m.userData.romp) mat = (m.userData.glas ||= {})[stand] ||= Object.assign(basis.clone(), { transparent: true, opacity: 0.22, depthWrite: false });
    m.material = mat;
  }
  DEF.doorzicht?.(doorzicht);
  renderer.toneMapping = donker ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
  renderer.toneMappingExposure = donker ? 1.05 : 1;
  scene.environmentIntensity = donker ? 0.9 : 0.55;
  zon.intensity = donker ? 1.6 : 2.6; hemi.intensity = donker ? 1.0 : 0.55;
  lijnMat.uniforms.aan.value = donker ? 0 : 1; lijnMat.uniforms.ao.value = donker ? 0.35 : 0.6;
  vraag();
}

// ================= Paneel =================
const $ = (id) => document.getElementById(id);
const lijstEl = $("lijst"), inhoudEl = $("inhoud"), knoppenEl = $("onderknoppen"), toetsenEl = $("toetsen");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function toon() {
  lijstEl.innerHTML = SECTIES.map((s, i) => `<li class="${i === sectie ? "aan" : ""}"><button type="button" data-sectie="${i}">${esc(s.naam)}</button></li>`).join("");
  const s = SECTIES[sectie], w = WEETJES[SECTIE_SLEUTEL[sectie]] || [];
  inhoudEl.innerHTML = `<h2>${esc(s.titel)}</h2><p class="tekst">${esc(s.tekst)}</p><ul class="specs">${s.specs.map(([a, b, tik]) => `<li${tik ? ` class="tik" data-tik="${tik}"` : ""}><span class="label">${esc(a)}</span><span class="waarde">${esc(b)}</span></li>`).join("")}</ul>
    ${w.length ? `<details class="weetjes"><summary>Weetjes <span class="mono zacht">nagekeken · ${w.length}</span></summary><ul>${w.map((x) => `<li>${esc(x.tekst)}<a href="${esc(x.bron)}" target="_blank" rel="noopener noreferrer">${esc(x.bron.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48))}</a></li>`).join("")}</ul></details>` : ""}`;
  knoppenEl.innerHTML = `<button type="button" class="knop licht" id="terug" ${sectie === 0 ? "disabled" : ""}>Terug</button><button type="button" class="knop" id="verder" ${sectie === SECTIES.length - 1 ? "disabled" : ""}>Verder</button>`;
  toetsenEl.innerHTML = `<span><kbd>←</kbd> <kbd>→</kbd> verder</span><span><kbd>E</kbd> uit elkaar · <kbd>T</kbd> tour</span>`;
  for (const b of lijstEl.querySelectorAll("[data-sectie]")) b.addEventListener("click", () => gaSectie(+b.dataset.sectie));
  for (const li of inhoudEl.querySelectorAll("[data-tik]")) li.addEventListener("click", () => { lichtAan = !lichtAan; klik(); vraag(); });
  $("terug").addEventListener("click", () => gaSectie(sectie - 1)); $("verder").addEventListener("click", () => gaSectie(sectie + 1));
  tekenMini(); maakNamen(); kleuren(); zetTeller();
}
function praat(t) { if (stemAan) STEM.zeg(t); }
function klik() { if (geluidAan && navigator.userActivation?.hasBeenActive) STEM.klik(); }
function gaSectie(i) { if (uiteen) { uiteen = 0; $("uiteenknop").setAttribute("aria-pressed", "false"); } sectie = Math.max(0, Math.min(SECTIES.length - 1, i)); camNaar(SECTIES[sectie].cam); klik(); toon(); praat(SECTIES[sectie].titel + ". " + SECTIES[sectie].tekst); }
for (const b of document.querySelectorAll("[data-stand]")) b.addEventListener("click", () => { stand = b.dataset.stand === "echt" ? "donker" : "tekening"; for (const x of document.querySelectorAll("[data-stand]")) x.setAttribute("aria-pressed", String(x === b)); klik(); kleuren(); });
let tourKlok = null;
$("tour")?.addEventListener("click", (e) => { tourAan = !tourAan; e.currentTarget.setAttribute("aria-pressed", String(tourAan)); clearInterval(tourKlok); if (tourAan) { gaSectie(0); tourKlok = setInterval(() => { if (sectie >= SECTIES.length - 1) { tourAan = false; $("tour").setAttribute("aria-pressed", "false"); clearInterval(tourKlok); } else gaSectie(sectie + 1); }, 6000); } });
$("geluid")?.addEventListener("click", (e) => { geluidAan = !geluidAan; e.currentTarget.setAttribute("aria-pressed", String(geluidAan)); e.currentTarget.textContent = geluidAan ? "Geluid" : "Stil"; });
$("stem")?.addEventListener("click", (e) => { stemAan = !stemAan; e.currentTarget.setAttribute("aria-pressed", String(stemAan)); if (stemAan) praat(SECTIES[sectie].titel + ". " + SECTIES[sectie].tekst); else STEM.stil(); });
$("uiteenknop").addEventListener("click", () => zetUitElkaar(!uiteen));
addEventListener("keydown", (e) => {
  if (e.target.closest?.("input,textarea")) return;
  if (KINDMODUS) { if (e.key === "ArrowRight") kindToon(kindI + 1); else if (e.key === "ArrowLeft") kindToon(kindI - 1); else if (e.key === " ") kindGeluid(); return; }
  if (e.key === "ArrowRight") gaSectie(sectie + 1); else if (e.key === "ArrowLeft") gaSectie(sectie - 1); else if (e.key.toLowerCase() === "e") zetUitElkaar(!uiteen); else if (e.key.toLowerCase() === "t") $("tour")?.click();
});
// minivoertuig rechtsonder: lijnen, het onderdeel van nu in rood
function tekenMini() { const f = focusVan() || []; $("minifiets").innerHTML = DEF.mini((d) => (f.includes(d) ? "aan" : "")); }

// ================= Kinderen =================
function kindToon(i, praatOok = true) {
  kindI = (i + KIND.length) % KIND.length; const k = KIND[kindI];
  $("kindnaam").textContent = k.naam;
  for (const b of document.querySelectorAll("#kindstrook button")) b.setAttribute("aria-current", String(+b.dataset.i === kindI));
  camNaar(k.cam); kleuren(); tekenMini();
  if (praatOok) STEM.zeg(k.naam, { kind: true });
}
function kindGeluid() { const k = KIND[kindI]; if (k.geluid && STEM[k.geluid]) STEM[k.geluid](); else STEM.zeg(k.naam, { kind: true }); }
function kindTik(d) { const i = KIND.findIndex((k) => k.focus.includes(d)); if (i >= 0 && i !== kindI) kindToon(i); else kindGeluid(); handWeg(); }
function handWeg() { $("kindhand")?.remove(); try { localStorage.setItem("fiets-kind-hand", "1"); } catch {} }

// ================= Namen met lijntjes =================
const namenEl = $("namen"), lijnEl = $("lijntjes");
const ANKEROBJ = () => DEF.anker();
let namen = [];
function lokaal(obj) { const b = new THREE.Box3().setFromObject(obj); return b.isEmpty() ? new THREE.Vector3() : obj.worldToLocal(b.getCenter(new THREE.Vector3())); }
function maakNamen() {
  namenEl.textContent = ""; lijnEl.textContent = ""; namen = [];
  if (KINDMODUS) return;
  const A = ANKEROBJ();
  const lijst = uiteen ? EX.filter((e) => e.naam).map((e) => [e.obj, e.naam, e.plek[0], e.plek[1], e]) : (SECTIES[sectie].namen || []).map(([k, t, dx, dy]) => [A[k], t, dx, dy, null]);
  for (const [obj, tekst, dx, dy, ex] of lijst) {
    if (!obj) continue;
    const el = document.createElement("span"); el.className = "naam"; el.textContent = tekst; namenEl.append(el);
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line"); lijnEl.append(l);
    namen.push({ obj, lok: ex ? null : lokaal(obj), ex, el, l, dx, dy });
  }
}
const pw = new THREE.Vector3();
function scherm(p, r) { pw.copy(p).project(camera); return [((pw.x + 1) / 2) * r.width, ((1 - pw.y) / 2) * r.height]; }
function namenBijwerken() {
  if (!namen.length) return;
  const r = doek.getBoundingClientRect();
  for (const n of namen) {
    const lok = n.ex ? n.ex.lok : n.lok; if (!lok) continue;
    pw.copy(lok); n.obj.localToWorld(pw);
    if (n.ex) { n.el.style.opacity = n.l.style.opacity = Math.min(1, uiteenNu * 2); }
    const [ax, ay] = scherm(pw, r), links = n.dx < 0, bw = n.w || (n.w = n.el.offsetWidth) || 90;
    const lx = links ? Math.max(8 + bw, ax + n.dx) : Math.min(r.width - 8 - bw, ax + n.dx), ly = Math.max(70, Math.min(r.height - 40, ay + n.dy));
    n.el.classList.toggle("links", links); n.el.style.left = lx + (links ? -3 : 3) + "px"; n.el.style.top = ly + "px";
    n.l.setAttribute("x1", ax); n.l.setAttribute("y1", ay); n.l.setAttribute("x2", lx); n.l.setAttribute("y2", ly);
  }
}

// ================= Uit elkaar =================
let uiteen = 0, uiteenNu = 0;
const EX = [];
function exDef() {
  DEF.uiteen().forEach(([obj, v, naam, plek], i, a) => obj && EX.push({ obj, v: V(...v).multiplyScalar(F), naam, plek: plek || [0, 0], vertraging: (i / Math.max(1, a.length)) * 0.45 }));
}
const gidsGeo = new THREE.BufferGeometry(), gidsMat = new THREE.LineDashedMaterial({ color: 0x8a8a87, dashSize: 0.05, gapSize: 0.04 });
const gids = new THREE.LineSegments(gidsGeo, gidsMat); gids.userData.geenLijn = true; gids.frustumCulled = false; scene.add(gids);
const qInv = new THREE.Quaternion();
function zetUiteen() {
  if (!EX.length) exDef();
  const u = uiteenNu, pts = [];
  root.updateMatrixWorld(true);
  for (const e of EX) {
    e.thuis ||= e.obj.position.clone(); e.obj.position.copy(e.thuis); e.obj.updateMatrixWorld(true);
    const thuisW = new THREE.Box3().setFromObject(e.obj).getCenter(new THREE.Vector3());
    if (!e.lok) e.lok = e.obj.worldToLocal(thuisW.clone());
    const k = glad((u - e.vertraging) / 0.55); if (k <= 0) continue;
    const ouder = e.obj.parent, a = ouder.worldToLocal(thuisW.clone()), b = ouder.worldToLocal(thuisW.clone().addScaledVector(e.v, k));
    e.obj.position.add(b.sub(a)); e.obj.updateMatrixWorld(true);
    pts.push(thuisW, thuisW.clone().addScaledVector(e.v, k));
  }
  gids.geometry.dispose(); gids.geometry = new THREE.BufferGeometry().setFromPoints(pts.length ? pts : [V(0, 0, 0), V(0, 0, 0)]); gids.computeLineDistances(); gids.visible = u > 0.02;
}
function zetUitElkaar(aan) {
  uiteen = aan ? 1 : 0; $("uiteenknop").setAttribute("aria-pressed", String(aan)); if (!EX.length) exDef();
  camNaar(aan ? DEF.uiteenCam : SECTIES[sectie].cam);
  podium.classList.toggle("smal-uit", !!aan); klik(); maakNamen(); kleuren(); vraag();
}

// ================= Camera =================
const c0 = SECTIES[0].cam, cam = { draai: c0[0], helling: c0[1], afstand: c0[2] * F, doel: V(...c0[3]).multiplyScalar(F), fov: c0[4] || 32 }, camDoel = { ...cam, doel: cam.doel.clone() };
let camVolgt = true;
function camNaar([d, h, a, p, fov = 32]) { camDoel.draai = cam.draai + Math.atan2(Math.sin(d - cam.draai), Math.cos(d - cam.draai)); camDoel.helling = h; camDoel.afstand = a * F; camDoel.doel = V(...p).multiplyScalar(F); camDoel.fov = fov; camVolgt = true; vraag(); }
const wijzers = new Map(); let vaart = 0, knijp = null;
doek.addEventListener("pointerdown", (e) => { doek.setPointerCapture(e.pointerId); wijzers.set(e.pointerId, { x: e.clientX, y: e.clientY }); vaart = 0; camVolgt = false; if (wijzers.size === 2) { const [a, b] = [...wijzers.values()]; knijp = { d: Math.hypot(a.x - b.x, a.y - b.y), a: cam.afstand }; } });
doek.addEventListener("pointermove", (e) => {
  const w = wijzers.get(e.pointerId); if (!w) return; const dx = e.clientX - w.x, dy = e.clientY - w.y; gesleept += Math.abs(dx) + Math.abs(dy); w.x = e.clientX; w.y = e.clientY;
  if (wijzers.size === 2 && knijp) { const [a, b] = [...wijzers.values()]; cam.afstand = THREE.MathUtils.clamp(knijp.a * knijp.d / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), 1.2, 14); }
  else { vaart = -dx * 0.007; cam.draai += vaart; cam.helling = THREE.MathUtils.clamp(cam.helling + dy * 0.004, -0.05, 1.35); }
  vraag();
});
let losTijd = 0, sleepTijd = 0, gesleept = 0;
const los = (e) => { wijzers.delete(e.pointerId); if (wijzers.size < 2) knijp = null; losTijd = performance.now(); if (gesleept < 6) sleepTijd = Date.now(); gesleept = 0; };
doek.addEventListener("pointerup", los); doek.addEventListener("pointercancel", los);
doek.addEventListener("wheel", (e) => { e.preventDefault(); camVolgt = false; cam.afstand = THREE.MathUtils.clamp(cam.afstand * Math.exp(e.deltaY * 0.001), 1.2, 14); vraag(); }, { passive: false });
const ray = new THREE.Raycaster();
doek.addEventListener("click", (e) => {
  if (HELD) { if (Date.now() - sleepTijd > 300) return; window.top.location.href = "/" + SLUG; return; }
  const r = doek.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const zicht = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const h = ray.intersectObjects(meshes.filter(zicht), false).find((x) => !(x.object.userData.romp && huidig().doorzicht)) ; if (!h) return;
  const d = h.object.userData.deel;
  if (KINDMODUS) { kindTik(d); return; }
  if (d === "lichten") { lichtAan = !lichtAan; klik(); vraag(); return; }
  if (DEF.tik?.(d)) { vraag(); return; }
  const i = SECTIES.findIndex((s) => s.focus?.includes(d)); if (i >= 0 && i !== sectie) gaSectie(i);
});

// ================= Tekenen =================
let vraagNu = true; const vraag = () => { vraagNu = true; };
const glad = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
function zetLens() {
  const fov = cam.fov || 32;
  camera.fov = camera.aspect < 1.2 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov * 0.62)) / camera.aspect)) : fov;
  camera.updateProjectionMatrix();
  if (rtKleur) lijnMat.uniforms.brandpunt.value = (rtKleur.height / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}
function maat() {
  const r = doek.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height); zetLens(); maakDoelen(Math.round(r.width * DPR), Math.round(r.height * DPR)); vraag();
}
new ResizeObserver(maat).observe(doek);
let vorigeT = performance.now(), opening = params.has("stil") ? 1 : 0;
window.__meting = { frames: 0 };
function stap_(t) {
  requestAnimationFrame(stap_);
  const echt = Math.max(0, Math.min(0.5, (t - vorigeT) / 1000)), dt = Math.min(0.05, echt); vorigeT = t;
  let bezig = false;
  const h = huidig();
  if (opening < 1) { opening = Math.min(1, opening + echt / 1.6); bezig = true; }
  if (camVolgt) { const k = 1 - Math.exp(-echt * 2.8); for (const key of ["draai", "helling", "afstand", "fov"]) cam[key] += (camDoel[key] - cam[key]) * k; zetLens(); cam.doel.lerp(camDoel.doel, k); if (Math.abs(camDoel.draai - cam.draai) + Math.abs(camDoel.afstand - cam.afstand) + cam.doel.distanceTo(camDoel.doel) > 0.002) bezig = true; }
  if (Math.abs(vaart) > 1e-4 && !wijzers.size) { cam.draai += vaart; vaart *= 0.94; bezig = true; }
  if (Math.abs(uiteenNu - uiteen) > 1e-3) { uiteenNu += Math.sign(uiteen - uiteenNu) * Math.min(Math.abs(uiteen - uiteenNu), echt / 1.6); bezig = true; if (uiteenNu < 0.02 || uiteenNu > 0.98) kleuren(); } else uiteenNu = uiteen;
  if (DEF.beweeg(dt, h, { uiteen, lichtAan, t })) bezig = true;
  if (HELD && !RUSTIG && !wijzers.size && performance.now() - losTijd > 2500) { cam.draai += echt * 0.22; camDoel.draai = cam.draai; bezig = true; }
  if (!rtKleur || (!bezig && !vraagNu)) return; vraagNu = false;
  zetUiteen();
  const o = glad(opening), dr = cam.draai - (1 - o) * 1.2, af = cam.afstand + (1 - o) * 5;
  camera.position.set(cam.doel.x + Math.sin(dr) * Math.cos(cam.helling) * af, cam.doel.y + Math.sin(cam.helling) * af, cam.doel.z + Math.cos(dr) * Math.cos(cam.helling) * af); camera.lookAt(cam.doel);
  renderer.setRenderTarget(rtKleur); renderer.setClearColor(0xffffff, 0); renderer.clear(); renderer.render(scene, camera);
  const f = focusVan(), bewaar = new Map(), verborgen = [];
  for (const m of meshes) { bewaar.set(m, m.material); m.material = !f || f.includes(m.userData.deel) || uiteen ? NORM_AAN : NORM_UIT; if (m.visible && m.userData.romp && (h.doorzicht || uiteenNu > 0.01)) { m.visible = false; verborgen.push(m); } }
  const zichtbaar = []; scene.traverse((x) => { if (x.userData?.geenLijn && x.visible) { zichtbaar.push(x); x.visible = false; } });
  grond.visible = false; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(rtNormaal); renderer.setClearColor(0x8080ff, 0); renderer.clear(); renderer.render(scene, camera);
  renderer.shadowMap.autoUpdate = true; grond.visible = true; zichtbaar.forEach((x) => (x.visible = true));
  for (const [m, mat] of bewaar) m.material = mat; for (const m of verborgen) m.visible = true;
  renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  namenBijwerken();
  window.__meting.frames++;
  if (HELD && window.__meting.frames === 2) parent.postMessage("held-klaar", location.origin);
}
if (KINDMODUS) {
  document.body.classList.add("kindmodus");
  const strook = $("kindstrook");
  strook.innerHTML = KIND.map((k, i) => `<button type="button" data-i="${i}">${esc(k.naam.replace(/^(de|het) /, ""))}</button>`).join("");
  for (const b of strook.querySelectorAll("button")) b.addEventListener("click", () => { kindToon(+b.dataset.i); handWeg(); });
  $("kindknop").addEventListener("click", () => { kindGeluid(); handWeg(); });
  $("kindvorige").addEventListener("click", () => { kindToon(kindI - 1); handWeg(); });
  $("kindvolgende").addEventListener("click", () => { kindToon(kindI + 1); handWeg(); });
  let sx = null; doek.addEventListener("pointerdown", (e) => (sx = e.clientX)); doek.addEventListener("pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 90 && !wijzers.size) kindToon(kindI + (e.clientX < sx ? 1 : -1)); sx = null; });
  try { if (localStorage.getItem("fiets-kind-hand")) $("kindhand")?.remove(); } catch {}
  kindToon(0, false);
} else { toon(); camNaar(SECTIES[0].cam); }
if (params.get("sectie")) gaSectie(+params.get("sectie"));
if (params.get("cam")) { const c = params.get("cam").split(",").map(Number); camNaar([c[0], c[1], c[2], [c[3], c[4], c[5]], c[6] || 32]); }
if (params.get("stand") === "tekening") document.querySelector('[data-stand="tekening"]').click(); else document.querySelector('[data-stand="echt"]').click();
if (params.has("uiteen")) { zetUitElkaar(true); if (params.has("af")) uiteenNu = 1; }
if (HELD) { camDoel.afstand *= params.has("uiteen") ? 0.8 : 0.95; camDoel.doel.y *= 0.8; if (params.has("af")) { cam.afstand = camDoel.afstand; cam.doel.copy(camDoel.doel); } }
requestAnimationFrame(stap_);
window.__klaar = true;
requestAnimationFrame(() => document.getElementById("laden")?.remove());
window.__info = { meshes: meshes.length, voertuig: SLUG, schaal: +F.toFixed(3) };
