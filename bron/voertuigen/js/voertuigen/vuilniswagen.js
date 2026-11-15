// De vuilniswagen: een algemene achterlader op drie assen, in code getekend. Maten in meters, zoals een gewone wagen van 10 m.
// Lage cabine voor de ploeg, een laadbak voor het afval, achter een laadklep met een persplaat en een kiepinrichting
// die een minicontainer optilt en leeg kiept. De voorkant wijst naar +x, rechts is +z.
// Geen bestaand type, geen merk, geen tekst. Module voor /js/kern.js; gedeelde onderdelen in ./_wagen.js.
import { maakWagen } from "./_wagen.js";

export default function maak(ctx) {
const { THREE, V, TAU, root, MAT, soort, mesh, op, samen, staaf, rondeDoos } = ctx;
const W = maakWagen(ctx), { S, doos, cil, lijn, plaat, strook } = W;
const G = { wielen: [] };
const lak = soort("vuilnisoranje", 0xf6dcc6, { color: 0xd4702c, roughness: 0.4, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.25 });
const grijs = soort("containergrijs", 0xdcdcda, { color: 0x5b5f64, roughness: 0.7, metalness: 0 });
const groen = soort("dekselgroen", 0xd3e3d3, { color: 0x3c6b45, roughness: 0.6, metalness: 0 });
const afvalS = soort("afval", 0xd6d6cf, { color: 0x3d4239, roughness: 0.9, metalness: 0 });
const zwaaiA = soort("zwaaioranjeA", 0xffd9b0, { color: 0xd98a2e, roughness: 0.15, metalness: 0, emissive: 0xff8a1a, emissiveIntensity: 0, transparent: true, opacity: 0.85 });
const zwaaiB = soort("zwaaioranjeB", 0xffd9b0, { color: 0xd98a2e, roughness: 0.15, metalness: 0, emissive: 0xff8a1a, emissiveIntensity: 0, transparent: true, opacity: 0.85 });

// ================= Cabine, chassis, wielen =================
const XV = 5.0, XF = 3.9, XR = -0.35, XN = -1.7, RW = 0.52; // voorkant, vooras, aandrijfas, naloopas, straal van het wiel
const cab = W.cabine({
  x: XV, L: 2.55, W: 2.5, H: 2.95, yVoor: 0.42, yAchter: 0.5, wiel: [XF, RW, 0.6], ruit: [1.38, 2.55, 0.14], deurVoor: 3.28, deurAchter: 2.62, vloer: 0.9, laag: true,
  ploeg: true, treden: [0.36], spiegelY: 2.32,
  ramen: [
    [[4.62, 1.36, 0.04], [4.5, 2.47, 0.05], [3.4, 2.47, 0.05], [3.4, 1.36, 0.04]],   // vast raam boven het voorwiel
    [[3.18, 1.0, 0.04], [3.18, 2.47, 0.05], [2.72, 2.47, 0.05], [2.72, 1.0, 0.04]],  // deurraam, laag voor goed zicht
    [[2.62, 1.36, 0.04], [2.62, 2.47, 0.05], [2.5, 2.47, 0.04], [2.5, 1.36, 0.04]],
  ],
});
G.cab = cab.g; root.add(G.cab);
// twee zwaailichten op het dak
G.cab.add(mesh(samen([1, -1].map((k) => doos(0.22, 0.06, 0.22, 4.25, 2.98, k * 0.85, 0.02))), S.kunststof, "lichten"));
G.zwaai = [mesh(samen([new THREE.SphereGeometry(0.09, 18, 10, 0, TAU, 0, Math.PI / 2).translate(4.25, 3.01, 0.85), cil(0.09, 0.08, 4.25, 3.01, 0.85, "y", 18)]), zwaaiA, "lichten"),
  mesh(samen([new THREE.SphereGeometry(0.09, 18, 10, 0, TAU, 0, Math.PI / 2).translate(4.25, 3.01, -0.85), cil(0.09, 0.08, 4.25, 3.01, -0.85, "y", 18)]), zwaaiB, "lichten")];
G.cab.add(...G.zwaai);
// chassis
G.chassis = new THREE.Group(); root.add(G.chassis);
G.chassis.add(W.balk(4.6, -2.95, 1.0, 0.28, 0.43), W.balk(4.6, -2.95, 1.0, 0.28, -0.43));
G.chassis.add(mesh(samen([4.4, 2.6, 0.8, -1.0, -2.85].map((x) => doos(0.08, 0.2, 0.86, x, 0.86, 0, 0.01))), S.chassis, "chassis"));
G.chassis.add(W.as(XF, 2.06, RW, { veer: "blad", yBalk: 0.72 }), W.as(XR, 1.84, RW, { aangedreven: true, veer: "lucht", yBalk: 0.72 }), W.as(XN, 2.06, RW, { veer: "lucht", yBalk: 0.72 }));
G.chassis.add(mesh(staaf(V(2.4, 0.8, 0), V(XR + 0.3, 0.56, 0.05), 0.055, 14), "metaal", "chassis"));
function zetWiel(x, z, o) { const w = W.wiel({ D: 2 * RW, B: 0.315, ...o, kant: Math.sign(z) }); w.position.set(x, RW, z); root.add(w); G.wielen.push(w); return w; }
G.voorR = zetWiel(XF, 1.03, { stijl: "rib" }); G.voorL = zetWiel(XF, -1.03, { stijl: "rib" });
G.achterR = zetWiel(XR, 0.92, { dubbel: true }); G.achterL = zetWiel(XR, -0.92, { dubbel: true });
G.naloopR = zetWiel(XN, 1.03, { stijl: "rib" }); G.naloopL = zetWiel(XN, -1.03, { stijl: "rib" });
// spatborden boven de achterwielen, zijafscherming, tank
{
  const sp = [];
  for (const k of [1, -1]) for (const [x, z0, z1] of [[XR, 0.56, 1.28], [XN, 0.8, 1.28]]) {
    const za = k > 0 ? z0 : -z1, zb = k > 0 ? z1 : -z0;
    const l = new THREE.LatheGeometry([new THREE.Vector2(0.565, za), new THREE.Vector2(0.565, zb)], 30, 0.25 + Math.PI / 2, Math.PI - 0.5); l.rotateX(Math.PI / 2); l.translate(x, RW, 0);
    const l2 = l.clone(); const ix = l2.index.array; for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; }
    sp.push(l, l2, doos(0.03, 0.4, 0.62, x - 0.6, 0.42, k * 0.98, 0.01));
  }
  G.chassis.add(mesh(samen(sp), S.kunststof, "chassis"));
  const zij = [];
  for (const k of [1, -1]) { zij.push(doos(2.6, 0.08, 0.04, 1.75, 0.5, k * 1.2, 0.012), doos(2.6, 0.08, 0.04, 1.75, 0.82, k * 1.2, 0.012)); for (const x of [2.95, 1.75, 0.55]) zij.push(doos(0.05, 0.4, 0.04, x, 0.66, k * 1.2, 0.01), doos(0.05, 0.05, 0.75, x, 0.92, k * 0.83, 0.01)); }
  G.chassis.add(mesh(samen(zij), "metaal", "chassis"));
}
G.tank = new THREE.Group(); root.add(G.tank);
G.tank.add(W.tank(1.75, 1.0, 0.72, 0.76, "tank", 0.5, 0.56), W.tank(2.0, 0.45, 0.72, -0.74, "tank", 0.5, 0.5));
G.tank.add(mesh(doos(0.7, 0.45, 0.5, 1.2, 0.74, -0.74, 0.04), S.kunststof, "tank"));

// ================= De laadbak (opbouw) =================
const XB = 2.35, XH = -2.75, YO = 1.12, YH = 3.45, BW = 2.5; // voorkant, scharnier van de laadklep, onder, boven, breedte
G.opbouw = new THREE.Group(); root.add(G.opbouw);
{
  const romp = mesh(doos(XB - XH, YH - YO, BW, (XB + XH) / 2, (YO + YH) / 2, 0, 0.16), lak, "opbouw"); romp.userData.romp = true;
  const rib = []; for (let x = XB - 0.35; x > XH + 0.2; x -= 0.85) for (const k of [1, -1]) rib.push(doos(0.09, YH - YO - 0.34, 0.05, x, (YO + YH) / 2, k * (BW / 2 + 0.012), 0.02));
  for (const k of [1, -1]) rib.push(doos(XB - XH - 0.3, 0.07, 0.05, (XB + XH) / 2, YO + 0.12, k * (BW / 2 + 0.012), 0.02));
  const ribM = mesh(samen(rib), lak, "opbouw"); ribM.userData.romp = true;
  G.opbouw.add(romp, ribM, mesh(doos(XB - XH, 0.12, 0.92, (XB + XH) / 2, 1.06, 0, 0.02), S.chassis, "opbouw"));
  // binnen: het afval en de uitduwplaat (te zien als de laadbak doorzichtig is)
  const lomp = []; let zaad = 7;
  const toeval = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 34; i++) { const r = 0.26 + toeval() * 0.16, g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, 0.75 + toeval() * 0.4, 1); g.translate(-2.15 + toeval() * 2.4, YO + 0.25 + toeval() * (0.45 + (i % 3) * 0.35), -0.9 + toeval() * 1.8); lomp.push(g); }
  G.afval = mesh(samen(lomp), afvalS, "afval"); G.opbouw.add(G.afval);
  G.uitduw = new THREE.Group(); G.uitduw.position.x = XB - 0.18; G.opbouw.add(G.uitduw);
  G.uitduw.add(mesh(samen([doos(0.06, YH - YO - 0.2, BW - 0.2, 0, (YO + YH) / 2, 0, 0.02), ...[-0.8, 0, 0.8].map((z) => doos(0.12, YH - YO - 0.3, 0.06, 0.05, (YO + YH) / 2, z, 0.01))]), "metaal", "opbouw"));
  G.duwcil = mesh(cil(0.07, 1, -0.5, 0, 0, "x", 16), S.chassis, "opbouw"); G.duwcil.position.set(XB - 0.12, 2.3, 0); G.opbouw.add(G.duwcil);
}

// ================= De laadklep met persplaat en kiepinrichting =================
G.klep = op(new THREE.Group(), XH, YH, 0); root.add(G.klep);
const K = op(new THREE.Group(), -XH, -YH, 0); G.klep.add(K); // alles hieronder in gewone coördinaten
const PB = V(-3.85, 2.45), PF = V(-3.2, 2.85), RT = 1.68, PK = V(-5.0, 1.15); // persplaat: achter- en voorstand, straal van de trog; scharnier van de kiep
const opBoog = (r, a) => [PB.x + Math.cos(a) * r, PB.y + Math.sin(a) * r];
const graden = Math.PI / 180;
{
  // zijwanden: een plaat met de vorm van de klep, aan elke kant
  const boog = []; for (let i = 0; i <= 16; i++) boog.push([...opBoog(1.74, (-128 + (76 * i) / 16) * graden), 0]);
  const zijvorm = [[XH, YH, 0.04], [-3.9, 3.42, 0.12], [-4.42, 2.55, 0.06], ...boog, [XH, 1.12, 0]];
  G.zijwand = [];
  for (const k of [1, -1]) { const m = mesh(plaat(zijvorm, 0.07, 0.015).translate(0, 0, k * (BW / 2 - 0.035)), lak, "achterlader"); m.userData.romp = true; G.zijwand.push(m); K.add(m); }
  // dak van de klep en de schuine achterkant (boven de opening)
  const dak = strook([[XH, YH], [-3.9, 3.42], [-4.42, 2.55]], 0.05);
  const dakM = mesh(plaat(dak, BW, 0.02), lak, "achterlader"); dakM.userData.romp = true; K.add(dakM);
  // de trog: een gebogen bodem, precies rond de persplaat
  const trog = []; for (let i = 0; i <= 24; i++) trog.push(opBoog(RT + 0.02, (-125 + (74 * i) / 24) * graden));
  K.add(mesh(plaat(strook(trog, -0.05), BW - 0.14, 0.01), "zwartmetaal", "achterlader"));
  const lip = opBoog(RT + 0.04, -125 * graden);
  K.add(mesh(samen([doos(0.16, 0.12, BW, lip[0] - 0.02, lip[1] + 0.02, 0, 0.03)]), "metaal", "achterlader"));
  // geleiders voor de slede, aan de buitenkant van de zijwanden
  const gl = [], hoek = Math.atan2(PF.y - PB.y, PF.x - PB.x), mid = PB.clone().add(PF).multiplyScalar(0.5), lang = PB.distanceTo(PF) + 0.35;
  for (const k of [1, -1]) gl.push(rondeDoos(lang, 0.14, 0.03, 0.01).rotateZ(hoek).translate(mid.x, mid.y, k * (BW / 2 + 0.012)));
  K.add(mesh(samen(gl), S.chassis, "persplaat"));
  // achterlichten op de achterrand van de zijwanden, werklamp onder het dak
  const rood = [], oranje = [], huis = [], rand = Math.atan2(2.55 - 1.09, -4.42 + 4.915);
  for (const k of [1, -1]) {
    const z = k * (BW / 2 - 0.08);
    huis.push(rondeDoos(0.08, 0.62, 0.16, 0.02).rotateZ(rand - Math.PI / 2).translate(-4.66, 1.85, z));
    rood.push(rondeDoos(0.03, 0.26, 0.12, 0.01).rotateZ(rand - Math.PI / 2).translate(-4.73, 1.95, z), doos(0.06, 0.1, 0.06, -4.42, 2.6, k * 1.15, 0.01));
    oranje.push(rondeDoos(0.03, 0.18, 0.12, 0.01).rotateZ(rand - Math.PI / 2).translate(-4.62, 1.66, z));
  }
  G.achterlicht = mesh(samen(rood), "achterlicht", "lichten");
  K.add(mesh(samen(huis), S.kunststof, "lichten"), G.achterlicht, mesh(samen(oranje), S.oranje, "lichten"), mesh(doos(0.06, 0.08, 0.4, -4.38, 2.52, 0, 0.02), "lamp", "lichten"));
  // zwaailichten achter op het dak van de klep
  K.add(mesh(samen([1, -1].map((k) => doos(0.2, 0.05, 0.2, -3.75, 3.46, k * 1.0, 0.02))), S.kunststof, "lichten"));
  G.zwaai.push(mesh(samen([new THREE.SphereGeometry(0.08, 16, 10, 0, TAU, 0, Math.PI / 2).translate(-3.75, 3.49, 1.0), cil(0.08, 0.07, -3.75, 3.49, 1.0, "y", 16)]), zwaaiB, "lichten"),
    mesh(samen([new THREE.SphereGeometry(0.08, 16, 10, 0, TAU, 0, Math.PI / 2).translate(-3.75, 3.49, -1.0), cil(0.08, 0.07, -3.75, 3.49, -1.0, "y", 16)]), zwaaiA, "lichten"));
  K.add(G.zwaai[2], G.zwaai[3]);
  // cilinders die de klep optillen (tussen laadbak en klep)
  for (const k of [1, -1]) K.add(mesh(staaf(V(-2.95, 1.35, k * (BW / 2 + 0.05)), V(-2.95, 2.6, k * (BW / 2 + 0.05)), 0.05, 12), S.chassis, "achterlader"));
}
// de persplaat: een slede die langs de geleiders schuift, met een plaat die door de trog veegt
G.slede = op(new THREE.Group(), PF.x, PF.y, 0); K.add(G.slede);
G.slede.add(mesh(samen([cil(0.09, BW + 0.04, 0, 0, 0, "z", 18), ...[1, -1].map((k) => doos(0.28, 0.16, 0.06, 0, 0, k * (BW / 2 + 0.05), 0.02))]), S.chassis, "persplaat"));
G.plaat = new THREE.Group(); G.slede.add(G.plaat);
G.plaat.add(mesh(samen([doos(1.5, 0.05, BW - 0.24, 0.8, 0, 0, 0.015), ...[-0.75, 0, 0.75].map((z) => doos(1.3, 0.12, 0.05, 0.75, 0.06, z, 0.01))]), "metaal", "persplaat"));
G.plaat.add(mesh(doos(0.08, 0.1, BW - 0.24, 1.58, -0.01, 0, 0.02), "zwartmetaal", "persplaat"));
const PLAAT_OP = -128 * graden, PLAAT_NEER = -62 * graden;
G.plaat.rotation.z = PLAAT_OP;
// de kiepinrichting: twee armen aan een as achter de lip, met een kam waar de container in haakt
K.add(mesh(samen([cil(0.06, 0.95, PK.x, PK.y, 0, "z", 16), ...[1, -1].map((k) => doos(0.22, 0.26, 0.08, PK.x + 0.1, PK.y - 0.05, k * 0.44, 0.02))]), S.chassis, "kiep"));
G.kiep = op(new THREE.Group(), PK.x, PK.y, 0); K.add(G.kiep);
G.kiep.add(mesh(samen([doos(0.07, 0.36, 0.72, -0.035, -0.3, 0, 0.015), ...[1, -1].map((k) => doos(0.1, 0.5, 0.04, -0.02, -0.2, k * 0.38, 0.015)), doos(0.04, 0.04, 0.6, -0.07, -0.14, 0, 0.01)]), "metaal", "kiep"));
// de container (minicontainer van 240 liter): grijze bak met een groen deksel, het handvat aan de kant van de wagen
G.bak = new THREE.Group(); G.kiep.add(G.bak);
{
  const yT = -0.12, yG = -PK.y; // bovenkant van de bak, de grond
  const lijf = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 * 0.84, 1, 4, 1); lijf.rotateY(Math.PI / 4); lijf.scale(0.7, yT - yG, 0.56); lijf.translate(-0.43, (yT + yG) / 2, 0);
  G.bak.add(mesh(samen([lijf, doos(0.76, 0.06, 0.62, -0.43, yT - 0.01, 0, 0.015), cil(0.022, 0.54, -0.05, yT - 0.05, 0, "z", 12), doos(0.06, 0.06, 0.08, -0.08, yT - 0.05, 0.22), doos(0.06, 0.06, 0.08, -0.08, yT - 0.05, -0.22), cil(0.018, 0.62, -0.13, yG + 0.1, 0, "z", 10)]), grijs, "container"));
  G.bak.add(mesh(samen([1, -1].map((k) => cil(0.1, 0.06, -0.13, yG + 0.1, k * 0.29, "z", 22))), "rubber", "container"));
  G.bak.add(mesh(doos(0.62, 0.01, 0.5, -0.43, yT + 0.02, 0, 0.004), S.kunststof, "container"));
  G.deksel = op(new THREE.Group(), -0.06, yT + 0.025, 0); G.bak.add(G.deksel);
  G.deksel.add(mesh(samen([doos(0.78, 0.035, 0.63, -0.38, 0.0, 0, 0.012), doos(0.05, 0.05, 0.5, -0.76, -0.01, 0, 0.012)]), groen, "container"));
}

// ================= Teksten (maten van de tekening) =================
const SECTIES = [
  { sleutel: "vuilniswagen", naam: "De vuilniswagen", titel: "De vuilniswagen", tekst: "Deze wagen haalt het afval op. Achter kiept hij de containers leeg en perst hij het afval in de laadbak. Tik op de lampjes.", cam: [0.62, 0.2, 19, [0.7, 1.7, 0], 30], focus: null,
    specs: [["Lengte", "10,6 m in de tekening, met de container"], ["Hoogte", "3,45 m in de tekening"], ["Assen", "3"], ["Kleur", "oranje en wit"], ["Lampjes", "tik", "lichten"]],
    namen: [["cabine", "CABINE", 50, -60], ["opbouw", "LAADBAK", 20, -80], ["klep", "LAADKLEP", -60, -60], ["container", "CONTAINER", -60, 40]] },
  { sleutel: "cabine", naam: "De cabine", titel: "De cabine", tekst: "Een lage cabine: de ploeg stapt snel in en uit, vaak wel honderd keer per dag. Er is plek voor de chauffeur en drie helpers.", cam: [0.72, 0.12, 8.4, [3.8, 1.5, 0], 30], focus: ["cabine", "binnen", "spiegels", "opstap"], doorzicht: true,
    specs: [["Stoelen", "5 in de tekening"], ["Opstap", "1 lage trede"], ["Ramen", "laag in de deur, voor goed zicht"], ["Spiegels", "2 aan elke kant"]],
    namen: [["stuur", "STUUR", -70, -50], ["spiegel", "SPIEGELS", 60, -40], ["opstap", "OPSTAP", -60, 50]] },
  { sleutel: "opbouw", naam: "De laadbak", titel: "De laadbak", tekst: "Hier gaat het afval in. Is de bak vol, dan rijdt de wagen naar de verwerking. De laadklep gaat omhoog en een grote plaat duwt het afval eruit.", cam: [-0.55, 0.22, 15, [-1.3, 2.1, 0], 32], focus: ["opbouw", "afval", "achterlader"], doorzicht: true, klep: true,
    specs: [["Lengte", "5,1 m in de tekening"], ["Hoogte binnen", "2,3 m in de tekening"], ["Uitduwplaat", "voorin, schuift naar achteren"], ["Laadklep", "kantelt omhoog"]],
    namen: [["afval", "AFVAL", -60, -60], ["uitduw", "UITDUWPLAAT", 60, -50], ["klep", "LAADKLEP", -60, 40]] },
  { sleutel: "kiep", naam: "De kiepinrichting", titel: "De kiepinrichting", tekst: "Achter haakt de container in de kam. De kiepinrichting tilt hem op, draait hem om, en het afval valt in de trog. Daarna zet hij hem weer neer.", cam: [-1.15, 0.14, 7.6, [-4.8, 1.55, 0], 30], focus: ["kiep", "container"], kiep: true,
    specs: [["Container", "240 liter in de tekening"], ["Hoogte container", "1,07 m in de tekening"], ["Draait", "150 graden in de tekening"], ["Deksel", "valt vanzelf open"]],
    namen: [["container", "CONTAINER", -70, 40], ["kiep", "KAM", 60, 40]] },
  { sleutel: "persplaat", naam: "De persplaat", titel: "De persplaat", tekst: "In de laadklep zit een persplaat. Die veegt het afval uit de trog en duwt het de laadbak in. Zo past er veel meer in.", cam: [0.2, 0.14, 9.2, [-3.5, 1.9, 0], 30], focus: ["persplaat", "achterlader"], doorzicht: true, persen: true,
    specs: [["Plaat", "1,5 m lang in de tekening"], ["Beweging", "vegen, dan duwen"], ["Trog", "rond, onder de opening"], ["Kracht", "met olie onder druk"]],
    namen: [["persplaat", "PERSPLAAT", 60, -50], ["slede", "SLEDE", -60, -60], ["trog", "TROG", -60, 40]] },
  { sleutel: "wielen", naam: "De wielen", titel: "De wielen", tekst: "Drie assen. De middelste as wordt aangedreven en heeft dubbele banden. De achterste as loopt mee en draagt een deel van het gewicht.", cam: [0.32, 0.1, 7.5, [-1.0, 0.6, 1.0], 30], focus: ["wielen"], rollen: true,
    specs: [["Vooras", "2 banden, die sturen"], ["Aandrijfas", "2 × 2 banden"], ["Naloopas", "2 banden"], ["Moeren", "10 per wiel"]],
    namen: [["dubbellucht", "DUBBELLUCHT", 50, -60], ["naloop", "NALOOPAS", -60, -50]] },
  { sleutel: "lichten", naam: "De lichten", titel: "De lichten", tekst: "Een vuilniswagen staat vaak stil op straat. Daarom draaien er oranje zwaailichten, voor op de cabine en achter op de klep. Zo ziet iedereen hem.", cam: [0.9, 0.32, 14, [1.0, 2.1, 0], 32], focus: ["lichten"], lichten: true,
    specs: [["Zwaailichten", "4, oranje"], ["Koplampen", "2, wit"], ["Achterlichten", "rood, op de klep"], ["Lampjes", "tik", "lichten"]],
    namen: [["zwaai", "ZWAAILICHT", 60, -50], ["koplamp", "KOPLAMP", 50, -40], ["zwaaiAchter", "ZWAAILICHT", -60, -50]] },
];
const KIND = [
  { naam: "de vuilniswagen", focus: ["opbouw", "cabine", "achterlader"], cam: [0.62, 0.2, 21, [0.1, 1.7, 0], 30], geluid: "toeter" },
  { naam: "de container", focus: ["container"], cam: [-1.15, 0.14, 7.6, [-4.8, 1.55, 0], 30], kiep: true },
  { naam: "de persplaat", focus: ["persplaat"], cam: [0.2, 0.14, 9.2, [-3.5, 1.9, 0], 30], doorzicht: true, persen: true, geluid: "brom" },
  { naam: "de laadbak", focus: ["opbouw", "achterlader"], cam: [-0.55, 0.22, 15, [-1.3, 2.1, 0], 32], klep: true },
  { naam: "de wielen", focus: ["wielen"], cam: [0.32, 0.1, 7.5, [-1.0, 0.6, 1.0], 30], rollen: true, geluid: "rol" },
  { naam: "de zwaailichten", focus: ["lichten"], cam: [0.9, 0.32, 14, [1.0, 2.1, 0], 32], lichten: true },
  { naam: "het stuur", focus: ["binnen"], cam: [0.72, 0.12, 8.4, [3.8, 1.5, 0], 30], doorzicht: true },
  { naam: "de spiegel", focus: ["spiegels"], cam: [0.75, 0.15, 5.5, [4.4, 1.9, 0.9], 30] },
];

function mini(aan) {
  const sx = (x) => (63 + x * 10.2).toFixed(1), sy = (y) => (60 - y * 10.2).toFixed(1);
  const P = (pts) => "M" + pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join("L");
  const cirkel = (x) => `<circle cx="${sx(x)}" cy="${sy(RW)}" r="${(RW * 10.2).toFixed(1)}" class="${aan("wielen")}"/>`;
  return `<path d="${P([[5.06, 0.45], [4.96, 1.38], [4.86, 2.55], [4.7, 2.95], [2.45, 2.95], [2.45, 0.5]])}" class="${aan("cabine") || aan("binnen") || aan("spiegels") || aan("opstap")}"/>` +
    `<path d="${P([[2.35, 1.12], [2.35, 3.45], [-2.75, 3.45], [-2.75, 1.12], [2.35, 1.12]])}" class="${aan("opbouw") || aan("afval")}"/>` +
    `<path d="${P([[-2.75, 3.45], [-3.9, 3.42], [-4.42, 2.55], [-4.9, 1.1], [-3.85, 0.72], [-2.75, 1.12]])}" class="${aan("achterlader") || aan("persplaat")}"/>` +
    `<path d="${P([[-5.06, 1.05], [-5.79, 1.05], [-5.7, 0], [-5.16, 0], [-5.06, 1.05]])}" class="${aan("container") || aan("kiep")}"/>` +
    `<path d="${P([[4.6, 0.86], [-2.95, 0.86]])}" class="${aan("chassis")}"/>` +
    `<path d="${P([[4.25, 3.0], [4.25, 3.1]])} ${P([[-3.75, 3.48], [-3.75, 3.58]])}" class="${aan("lichten")}" style="stroke-width:4"/>` +
    [XF, XR, XN].map(cirkel).join("");
}

let wielHoek = 0, klepNu = 0, kiepT = 0, persT = 0, lichtT = 0, kiepAan = 0, persAan = 0;
const glad = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const fase = (t, a, b) => glad((t - a) / (b - a));
let tVorig = null;
function beweeg(dt0, h, s) {
  // eigen klok: de bewegingen duren even lang, ook als het tekenen traag gaat
  const dt = tVorig === null ? dt0 : Math.min(0.25, Math.max(0, (s.t - tVorig) / 1000)); tVorig = s.t;
  let bezig = false;
  if (h.rollen) { wielHoek -= dt * 2.2; bezig = true; }
  for (const w of G.wielen) w.rotation.z = wielHoek;
  // laadklep omhoog, uitduwplaat naar achteren
  const kDoel = h.klep ? 1 : 0; if (Math.abs(kDoel - klepNu) > 0.001) { klepNu += Math.sign(kDoel - klepNu) * Math.min(Math.abs(kDoel - klepNu), dt / 3); bezig = true; }
  const open = glad(klepNu * 1.6), duw = glad(klepNu * 1.6 - 0.6);
  G.klep.rotation.z = -1.0 * open;
  G.uitduw.position.x = XB - 0.18 - 1.25 * duw; G.duwcil.scale.x = Math.max(0.05, 0.06 + 1.25 * duw);
  G.bak.visible = open < 0.03; // met de klep omhoog is er geen container (de wagen staat dan bij de verwerking)
  // de kiepinrichting: optillen en omkiepen, deksel valt open, weer neerzetten
  if (h.kiep || kiepT > 0) { kiepT += dt / 7; if (kiepT >= 1) kiepT = h.kiep ? kiepT - 1 : 0; bezig = true; }
  const k = fase(kiepT, 0.08, 0.42) - fase(kiepT, 0.62, 0.92), alfa = -150 * k;
  G.kiep.rotation.z = alfa * (Math.PI / 180) + (k > 0.98 ? Math.sin(kiepT * 90) * 0.02 : 0);
  G.deksel.rotation.z = -120 * glad((-alfa - 95) / 45) * (Math.PI / 180);
  // de persplaat: slede naar achteren, plaat veegt door de trog, slede duwt naar voren, plaat terug omhoog
  if (h.persen || persT > 0) { persT += dt / 6.5; if (persT >= 1) persT = h.persen ? persT - 1 : 0; bezig = true; }
  const slede = fase(persT, 0.02, 0.2) - fase(persT, 0.5, 0.75), veeg = fase(persT, 0.22, 0.48) - fase(persT, 0.77, 0.96);
  G.slede.position.set(PF.x + (PB.x - PF.x) * slede, PF.y + (PB.y - PF.y) * slede, 0);
  G.plaat.rotation.z = PLAAT_OP + (PLAAT_NEER - PLAAT_OP) * veeg;
  // lampen: koplampen, knipperlichten en de zwaailichten om en om
  lichtT += dt; const aan = s.lichtAan || h.lichten || s.uiteen;
  W.lampen(MAT, aan, lichtT);
  const zw = aan ? (lichtT * 1.6) % 1 : -1;
  for (const st of ["teken", "donker"]) { MAT[zwaaiA][st].emissiveIntensity = zw >= 0 && zw < 0.5 ? 3 : 0.05; MAT[zwaaiB][st].emissiveIntensity = zw >= 0.5 ? 3 : 0.05; }
  if (aan) bezig = true;
  return bezig;
}

return {
  titel: "De vuilniswagen", label: "Vuilniswagen", model: "Achterlader op drie assen", schaal: "Maten in meters", hint: "Sleep om te draaien · tik op de lampjes", SECTIES, KIND, mini, beweeg,
  doorzicht: (aan) => { cab.binnen.visible = aan; },
  anker: () => ({ cabine: cab.schaal, stuur: cab.stuur, spiegel: cab.spiegels[0], opstap: cab.opstap, opbouw: G.opbouw.children[0], afval: G.afval, uitduw: G.uitduw, klep: G.zijwand[0], container: G.bak, kiep: G.kiep.children[0],
    persplaat: G.plaat, slede: G.slede.children[0], trog: K.children[3], dubbellucht: G.achterR, naloop: G.naloopR, zwaai: G.zwaai[0], zwaaiAchter: G.zwaai[2], koplamp: cab.koplamp, achterlicht: G.achterlicht }),
  uiteenCam: [0.62, 0.3, 27, [-0.3, 2.4, 0], 32],
  uiteen: () => [
    [G.cab, [1.2, 1.1, 0], "CABINE", [50, -40]], [G.opbouw, [0, 1.7, 0], "LAADBAK", [30, -60]], [G.klep, [-1.4, 1.0, 0], "LAADKLEP", [-50, -50]],
    [G.slede, [0, 1.3, 0], "PERSPLAAT", [-60, -30]], [G.kiep, [-1.0, -0.2, 0], "KIEPINRICHTING", [-60, 40]],
    [G.tank, [0, 0, 1.2], "TANK", [50, 40]], [G.voorL, [0, 0, -1.0], null], [G.voorR, [0, 0, 1.0], "VOORWIEL", [40, 50]],
    [G.achterL, [0, 0, -1.1], null], [G.achterR, [0, 0, 1.1], "DUBBELLUCHT", [30, 60]], [G.naloopL, [0, 0, -1.0], null], [G.naloopR, [0, 0, 1.0], null],
  ],
};
}
