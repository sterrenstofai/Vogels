// De vrachtwagen: een algemene trekker met oplegger (een gesloten laadbak met twee deuren achter), in code getekend.
// Maten in meters, zoals een gewone combinatie van 16,9 m. De voorkant wijst naar +x, rechts is +z.
// Geen bestaand type, geen merk, geen tekst. Module voor /js/kern.js; gedeelde onderdelen in ./_wagen.js.
import { maakWagen } from "./_wagen.js";

export default function maak(ctx) {
const { THREE, V, TAU, root, MAT, soort, mesh, groep, op, samen, buis } = ctx;
const W = maakWagen(ctx), { S, doos, cil, lijn } = W;
const G = { wielen: [], oplWielen: [] };
const bak = soort("opleggerwit", 0xf6f6f4, { color: 0xcfd3d7, roughness: 0.42, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.3 });
const marker = soort("markeroranje", 0xffd9b0, { color: 0xd98a2e, roughness: 0.2, metalness: 0, emissive: 0xff8a1a, emissiveIntensity: 0 });
const geel = soort("slanggeel", 0xf5e7b8, { color: 0xc9a227, roughness: 0.5, metalness: 0 });

// ================= De trekker =================
const XV = 8.35, XW = 6.95, XA = 3.15, RW = 0.51; // voorkant cabine, vooras, achteras, straal van het wiel
G.trekker = new THREE.Group(); root.add(G.trekker);
// cabine (hoog dak, met een bed achter de stoelen)
const cab = W.cabine({ x: XV, L: 2.3, W: 2.5, H: 3.72, yVoor: 0.5, yAchter: 1.05, wiel: [XW, RW, 0.6], ruit: [2.1, 3.0, 0.3], deurAchter: 6.45, vloer: 1.42, bed: true });
G.cab = cab.g;
// de cabine kan naar voren kantelen, om een scharnier vooraan (dan zie je de motor)
G.kantel = op(new THREE.Group(), 8.2, 0.98, 0); { const binnen = op(new THREE.Group(), -8.2, -0.98, 0); binnen.add(G.cab); G.kantel.add(binnen); }
G.trekker.add(G.kantel); G.trekker.add(cab.bumper); // de bumper zit vast aan het chassis
// zijschermen achter de cabine (dicht het gat naar de oplegger) en twee luchthoorns op het dak
G.cab.add(mesh(samen([1, -1].map((k) => doos(0.5, 2.3, 0.03, 5.83, 2.5, k * 1.235, 0.012))), S.wit, "cabine"));
{
  const h = [];
  for (const k of [1, -1]) { const t = new THREE.CylinderGeometry(0.07, 0.025, 0.5, 18, 1, false); t.rotateZ(-Math.PI / 2); t.translate(6.9, 3.82, k * 0.28); h.push(t, cil(0.03, 0.12, 6.75, 3.76, k * 0.28, "y", 10)); }
  G.toeter = mesh(samen(h), "metaal", "toeter"); G.cab.add(G.toeter);
}
// chassis: twee C-balken met dwarsbalken
G.chassis = new THREE.Group(); G.trekker.add(G.chassis);
G.balkR = W.balk(7.95, 2.25, 1.0, 0.3, 0.43); G.balkL = W.balk(7.95, 2.25, 1.0, 0.3, -0.43);
G.chassis.add(G.balkR, G.balkL);
G.chassis.add(mesh(samen([7.8, 6.2, 4.6, 3.9, 2.35].map((x) => doos(0.08, 0.22, 0.86, x, 0.85, 0, 0.01))), S.chassis, "chassis"));
// motor onder de cabine, versnellingsbak en cardanas naar de achteras
G.motor = W.motorblok(6.4, 0.95); G.trekker.add(G.motor);
G.motor.add(mesh(samen([W.doos(0.6, 0.42, 0.45, 5.55, 0.86, 0, 0.06)]), "zwartmetaal", "motor"));
G.chassis.add(mesh(ctx.staaf(V(5.25, 0.8, 0), V(XA + 0.3, 0.55, 0.05), 0.055, 14), "metaal", "chassis"));
// assen en vering
G.chassis.add(W.as(XW, 2.06, RW, { veer: "blad", yBalk: 0.7 }), W.as(XA, 1.84, RW, { aangedreven: true, veer: "lucht", yBalk: 0.7 }));
// wielen: voor enkel, achter dubbel (dubbellucht)
function zetWiel(x, z, o, lijst = G.wielen) { const w = W.wiel({ ...o, kant: Math.sign(z) }); w.position.set(x, o.D / 2, z); G.trekker.add(w); lijst.push(w); return w; }
G.voorR = zetWiel(XW, 1.03, { D: 1.02, B: 0.315, stijl: "rib" }); G.voorL = zetWiel(XW, -1.03, { D: 1.02, B: 0.315, stijl: "rib" });
G.achterR = zetWiel(XA, 0.92, { D: 1.02, B: 0.315, dubbel: true }); G.achterL = zetWiel(XA, -0.92, { D: 1.02, B: 0.315, dubbel: true });
// spatborden boven de achterwielen, spatlappen erachter
{
  const sp = [];
  for (const k of [1, -1]) {
    const z0 = k > 0 ? 0.56 : -1.28, z1 = k > 0 ? 1.28 : -0.56, a0 = 0.35, a1 = Math.PI - 0.15;
    const l = new THREE.LatheGeometry([new THREE.Vector2(0.6, z0), new THREE.Vector2(0.6, z1)], 30, a0 + Math.PI / 2, a1 - a0); l.rotateX(Math.PI / 2); l.translate(XA, RW, 0);
    const l2 = l.clone(); const ix = l2.index.array; for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; }
    sp.push(l, l2, W.doos(0.03, 0.42, 0.66, XA - 0.62, 0.42, k * 0.92, 0.01));
    sp.push(ctx.staaf(V(XA + 0.3, 1.0, k * 0.5), V(XA + 0.3, 1.05, k * 0.75), 0.02), ctx.staaf(V(XA - 0.4, 1.0, k * 0.5), V(XA - 0.4, 1.05, k * 0.75), 0.02));
  }
  G.chassis.add(mesh(samen(sp), S.kunststof, "chassis"));
}
// tank rechts, AdBlue-tank, accubak en luchtketels links
G.tank = new THREE.Group(); G.trekker.add(G.tank);
G.tank.add(W.tank(5.12, 1.5, 0.8, 0.78), W.tank(5.62, 0.5, 0.8, -0.74, "tank", 0.55, 0.52));
G.tank.add(mesh(samen([W.doos(0.75, 0.5, 0.55, 4.82, 0.82, -0.76, 0.04)]), S.kunststof, "tank"));
G.chassis.add(mesh(samen([cil(0.12, 1.0, 4.65, 0.78, 0.18, "x", 18), cil(0.12, 1.0, 4.65, 0.78, -0.18, "x", 18)]), "zwartmetaal", "chassis"));
// koppelschotel: hier rust de oplegger op
G.koppeling = new THREE.Group(); G.trekker.add(G.koppeling);
G.koppeling.add(mesh(samen([W.doos(1.0, 0.08, 0.95, 3.5, 1.04, 0, 0.02), W.doos(0.2, 0.12, 0.95, 3.5, 1.06, 0, 0.02)]), S.chassis, "koppeling"));
{
  const v = new THREE.Shape(); v.absarc(0, 0, 0.46, 0, TAU, false);
  const sleuf = new THREE.Path(); sleuf.moveTo(-0.47, 0.16); sleuf.lineTo(-0.05, 0.04); sleuf.absarc(0, 0, 0.045, Math.PI / 2 + 0.3, -Math.PI / 2 - 0.3, true); sleuf.lineTo(-0.47, -0.16); sleuf.lineTo(-0.47, 0.16); v.holes.push(sleuf);
  const g = new THREE.ExtrudeGeometry(v, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 24 }); g.rotateX(-Math.PI / 2); g.translate(3.5, 1.09, 0);
  G.koppeling.add(mesh(g, "zwartmetaal", "koppeling"));
}
// achterlichtjes op het eind van het chassis
G.trekker.add(mesh(samen([1, -1].map((k) => W.doos(0.05, 0.1, 0.3, 2.22, 0.9, k * 0.62, 0.02))), "achterlicht", "lichten"));
G.trekker.add(mesh(samen([W.doos(0.06, 0.14, 1.5, 2.25, 0.9, 0, 0.02)]), S.chassis, "chassis"));
// slangen voor lucht en stroom tussen trekker en oplegger (gekruld)
{
  const krul = (z, r0) => { const pts = []; for (let i = 0; i <= 140; i++) { const t = i / 140, x = 6.05 - 0.85 * t, y = 1.75 - 0.18 * Math.sin(Math.PI * t), a = t * 15 * TAU; pts.push(V(x, y + Math.cos(a) * r0, z + Math.sin(a) * r0)); } return buis(pts, 0.009, { seg: 600, rond: 6 }); };
  G.trekker.add(mesh(krul(0.32, 0.045), "rood", "koppeling"), mesh(krul(0.18, 0.045), geel, "koppeling"), mesh(krul(0.04, 0.04), S.kunststof, "koppeling"));
}

// ================= De oplegger =================
const XO = 5.2, XE = -8.4, YB = 1.22, YT = 4.0, BB = 2.55; // voorkant, achterkant, bodem, dak, breedte
G.trailer = new THREE.Group(); root.add(G.trailer);
G.box = new THREE.Group(); G.trailer.add(G.box);
G.box.add(mesh(W.doos(XO - XE - 0.12, YT - YB, BB, (XO + XE + 0.12) / 2, (YB + YT) / 2, 0, 0.05), bak, "oplegger"));
{
  const r = [];
  for (const k of [1, -1]) {
    const z = k * (BB / 2 + 0.006);
    r.push(W.doos(XO - XE - 0.1, 0.09, 0.03, (XO + XE) / 2, YT - 0.04, z, 0.01), W.doos(XO - XE - 0.1, 0.16, 0.035, (XO + XE) / 2, YB + 0.07, z, 0.01));
    r.push(W.doos(0.1, YT - YB, 0.1, XO - 0.03, (YB + YT) / 2, k * (BB / 2 - 0.03), 0.02));
    for (let x = XE + 0.9; x < XO - 0.3; x += 1.2) r.push(W.doos(0.03, 0.04, 0.02, x, YB + 0.07, k * (BB / 2 + 0.03), 0.008)); // sjorogen
  }
  // portaal achter: twee stijlen, een bovenbalk en een drempel
  for (const k of [1, -1]) r.push(W.doos(0.12, YT - YB, 0.14, XE + 0.06, (YB + YT) / 2, k * (BB / 2 - 0.07), 0.02));
  r.push(W.doos(0.12, 0.2, BB, XE + 0.06, YT - 0.1, 0, 0.02), W.doos(0.14, 0.2, BB, XE + 0.07, YB + 0.1, 0, 0.02));
  G.box.add(mesh(samen(r), "metaal", "oplegger"));
  // aansluitingen voor de slangen op de voorkant
  G.box.add(mesh(W.doos(0.06, 0.2, 0.5, XO + 0.03, 1.72, 0.18, 0.02), S.kunststof, "koppeling"));
}
// twee deuren achter, elk aan scharnieren op de hoek
function deur(k) {
  const d = new THREE.Group(); d.position.set(XE, 0, k * BB / 2);
  const zc = -k * (BB / 4), y0 = YB + 0.22, y1 = YT - 0.2, hoog = y1 - y0;
  d.add(mesh(W.doos(0.05, hoog, BB / 2 - 0.01, -0.03, (y0 + y1) / 2, zc, 0.012), bak, "deuren"));
  const stang = [], beslag = [];
  for (const zz of [0.32, 0.95]) {
    const z = -k * zz;
    stang.push(cil(0.022, hoog + 0.12, -0.09, (y0 + y1) / 2, z, "y", 12));
    beslag.push(W.doos(0.06, 0.08, 0.08, -0.07, y0 + 0.02, z, 0.01), W.doos(0.06, 0.08, 0.08, -0.07, y1 - 0.02, z, 0.01), W.doos(0.08, 0.05, 0.05, -0.1, y0 + 0.85, z, 0.01));
    beslag.push(lijn([V(-0.09, y0 + 0.85, z), V(-0.15, y0 + 0.85, z), V(-0.15, y0 + 0.55, z - k * 0.04)], 0.015, 6));
  }
  for (const y of [y0 + 0.2, y0 + 0.85, y1 - 0.85, y1 - 0.2]) beslag.push(W.doos(0.07, 0.1, 0.16, -0.06, y, -k * 0.07, 0.01));
  d.add(mesh(samen(stang), "metaal", "deuren"), mesh(samen(beslag), S.chassis, "deuren"));
  G.box.add(d); return d;
}
G.deurR = deur(1); G.deurL = deur(-1);
// onderstel: balken, steunpoten, zijafscherming, drie assen, bumper en achterlichten
G.onder = new THREE.Group(); G.trailer.add(G.onder);
for (const k of [1, -1]) G.onder.add(W.balk(XO - 0.1, 2.0, YB, 0.1, k * 0.5, "oplegger"), W.balk(2.0, XE + 0.1, YB, 0.36, k * 0.5, "oplegger"));
G.onder.add(mesh(samen([2.2, 0.4, -1.4, -3.2, -5.0, -6.6, -8.0].map((x) => W.doos(0.08, 0.2, 1.0, x, YB - 0.12, 0, 0.01))), S.chassis, "oplegger"));
G.onder.add(mesh(cil(0.05, 0.1, 3.5, YB - 0.05, 0, "y", 16), "metaal", "koppeling"));
// steunpoten met een slinger
G.poten = new THREE.Group(); G.onder.add(G.poten);
{
  const vast = [], los = [];
  for (const k of [1, -1]) {
    vast.push(W.doos(0.13, 0.62, 0.13, 1.6, YB - 0.33, k * 0.62, 0.015));
    los.push(W.doos(0.1, 0.55, 0.1, 1.6, 0.55, k * 0.62, 0.01), W.doos(0.32, 0.05, 0.26, 1.6, 0.27, k * 0.62, 0.01));
  }
  vast.push(ctx.staaf(V(1.6, YB - 0.15, -0.62), V(1.6, 0.75, 0.62), 0.025), ctx.staaf(V(1.6, YB - 0.15, 0.62), V(1.6, 0.75, -0.62), 0.025), W.doos(0.08, 0.08, 1.3, 1.6, 0.8, 0, 0.01));
  G.onder.add(mesh(samen(vast), S.chassis, "oplegger"));
  G.onder.add(mesh(lijn([V(1.6, 0.95, 0.69), V(1.6, 0.95, 0.85), V(1.6, 0.75, 0.85), V(1.6, 0.75, 0.92)], 0.016, 8), "metaal", "oplegger"));
  G.poten.add(mesh(samen(los), "zwartmetaal", "oplegger"));
}
// zijafscherming tussen de poten en de wielen
{
  const z = [];
  for (const k of [1, -1]) {
    z.push(W.doos(5.0, 0.1, 0.04, -1.15, 0.52, k * 1.22, 0.012), W.doos(5.0, 0.1, 0.04, -1.15, 0.86, k * 1.22, 0.012));
    for (const x of [1.25, -0.4, -2.0, -3.55]) z.push(W.doos(0.06, 0.48, 0.04, x, 0.72, k * 1.2, 0.01), W.doos(0.06, 0.06, 0.72, x, YB - 0.28, k * 0.86, 0.01), W.doos(0.06, 0.3, 0.06, x, YB - 0.42, k * 1.2, 0.01));
  }
  G.onder.add(mesh(samen(z), "metaal", "oplegger"));
}
// drie assen met luchtvering en brede enkele banden
const RO = 0.536, XAS = [-4.28, -5.59, -6.9];
G.assen = new THREE.Group(); G.onder.add(G.assen);
for (const x of XAS) {
  G.assen.add(W.as(x, 2.08, RO, { veer: "lucht", balkZ: 0.5, yBalk: YB - 0.36 }));
  for (const k of [1, -1]) { const w = W.wiel({ D: 1.072, B: 0.385, kant: k, stijl: "rib" }); w.position.set(x, RO, k * 1.04); G.assen.add(w); G.oplWielen.push(w); }
}
G.oplWielR = G.oplWielen[2];
G.onder.add(mesh(samen([1, -1].map((k) => W.doos(0.02, 0.5, 0.45, -7.55, 0.5, k * 1.04, 0.01))), "rubber", "oplegger"));
// bumper achter (tegen onderrijden) met de achterlichten
G.onder.add(mesh(samen([W.doos(0.14, 0.13, 2.36, XE + 0.12, 0.52, 0, 0.03), ...[1, -1].map((k) => W.doos(0.1, 0.62, 0.08, XE + 0.2, 0.86, k * 0.5, 0.01)), W.doos(0.08, 0.1, 2.4, XE + 0.12, YB - 0.1, 0, 0.01)]), S.chassis, "oplegger"));
{
  const huis = [], rood = [], oranje = [], wit = [];
  for (const k of [1, -1]) {
    const z = k * 0.9, x = XE + 0.04, y = YB - 0.22;
    huis.push(W.doos(0.06, 0.2, 0.62, x + 0.02, y, z, 0.02));
    rood.push(W.doos(0.03, 0.14, 0.26, x - 0.01, y, z - k * 0.02, 0.02), W.doos(0.03, 0.1, 0.06, XE + 0.01, YT - 0.05, k * 1.18, 0.012));
    oranje.push(W.doos(0.03, 0.14, 0.13, x - 0.01, y, z + k * 0.2, 0.02));
    wit.push(W.doos(0.03, 0.14, 0.1, x - 0.01, y, z - k * 0.22, 0.02), W.doos(0.03, 0.1, 0.06, XO + 0.015, YT - 0.05, k * 1.18, 0.012));
  }
  G.achterlicht = mesh(samen(rood), "achterlicht", "lichten");
  G.onder.add(mesh(samen(huis), S.kunststof, "lichten"), mesh(samen(oranje), S.oranje, "lichten"), mesh(samen(wit), "lamp", "lichten"));
  G.trailer.add(G.achterlicht);
  const zijlicht = []; for (const k of [1, -1]) for (let x = XO - 0.8; x > XE + 0.5; x -= 2.25) zijlicht.push(W.doos(0.09, 0.045, 0.02, x, YB + 0.03, k * (BB / 2 + 0.025), 0.008));
  G.box.add(mesh(samen(zijlicht), marker, "lichten"));
}

// ================= Teksten (maten van de tekening) =================
const SECTIES = [
  { sleutel: "vrachtwagen", naam: "De vrachtwagen", titel: "De vrachtwagen", tekst: "Een trekker met een oplegger erachter. De trekker trekt, de oplegger draagt de lading. Tik op de lampjes.", cam: [0.6, 0.2, 27, [1.2, 1.9, 0], 30], focus: null,
    specs: [["Lengte", "16,9 m in de tekening"], ["Hoogte", "4 m in de tekening"], ["Breedte", "2,55 m"], ["Banden", "12, achter de trekker dubbel"], ["Lampjes", "tik", "lichten"]],
    namen: [["cabine", "CABINE", 50, -60], ["oplegger", "OPLEGGER", -40, -70], ["dubbellucht", "WIELEN", -40, 70], ["tank", "TANK", 110, 50]] },
  { sleutel: "cabine", naam: "De cabine", titel: "De cabine", tekst: "Hier zit de chauffeur, hoog boven de weg. Achter de stoelen ligt een bed. Met de spiegels kijkt de chauffeur naast en achter de wagen.", cam: [0.62, 0.12, 8.2, [7.0, 2.1, 0], 30], focus: ["cabine", "binnen", "spiegels", "opstap", "toeter"], doorzicht: true,
    specs: [["Stoelen", "2"], ["Bed", "achter de stoelen"], ["Spiegels", "2 aan elke kant"], ["Opstap", "2 treden"], ["Hoogte", "3,7 m in de tekening"]],
    namen: [["stuur", "STUUR", -70, -50], ["spiegel", "SPIEGELS", 60, -40], ["opstap", "OPSTAP", 60, 40], ["bed", "BED", -60, 40]] },
  { sleutel: "motor", naam: "De motor", titel: "De motor", tekst: "De motor zit onder de cabine. Kijk: de cabine kantelt naar voren, dan kun je erbij. Voor de motor zit de koeler, met een ventilator.", cam: [0.38, 0.2, 11.5, [6.7, 1.3, 0], 30], focus: ["motor"], kantel: true, draaien: true,
    specs: [["Plek", "onder de cabine"], ["Brandstof", "diesel"], ["Koeler", "voor de motor"], ["Ventilator", "7 bladen in de tekening"]],
    namen: [["motor", "MOTOR", -80, -70], ["koeler", "KOELER", -60, 60]] },
  { sleutel: "chassis", naam: "Het chassis", titel: "Het chassis", tekst: "Twee lange stalen balken dragen alles. Achterop zit de koppelschotel: daar haakt de oplegger in. Kijk, de oplegger rijdt los.", cam: [0.42, 0.42, 14, [4.8, 0.9, 0], 32], focus: ["chassis", "tank", "koppeling"], los: true,
    specs: [["Balken", "2, van staal"], ["Koppelschotel", "boven de achteras"], ["Tank", "rechts, 1,5 m lang in de tekening"], ["Assen", "2 onder de trekker"]],
    namen: [["koppeling", "KOPPELSCHOTEL", -60, -60], ["chassis", "CHASSISBALK", 60, -50], ["tank", "TANK", 60, 40], ["poten", "STEUNPOTEN", -60, 40]] },
  { sleutel: "wielen", naam: "De wielen", titel: "De wielen", tekst: "Achter de trekker zitten twee banden naast elkaar. Dat heet dubbellucht: zo kan de wagen meer dragen. Tien moeren houden elk wiel vast.", cam: [0.3, 0.1, 6.2, [3.5, 0.6, 0.9], 30], focus: ["wielen"], rollen: true,
    specs: [["Voor", "2 enkele banden, die sturen"], ["Achter de trekker", "2 × 2 banden"], ["Onder de oplegger", "6 brede banden"], ["Moeren", "10 per wiel"]],
    namen: [["dubbellucht", "DUBBELLUCHT", 50, -60], ["voorwiel", "VOORWIEL", 60, -40]] },
  { sleutel: "oplegger", naam: "De oplegger", titel: "De oplegger", tekst: "Een grote dichte bak op drie assen. Achter gaan twee deuren open, zo ver dat ze tegen de zijkant komen. Dan kan de lading erin en eruit.", cam: [-0.95, 0.16, 15, [-6.6, 2.1, 0], 32], focus: ["oplegger", "deuren"], deuren: true,
    specs: [["Lengte", "13,6 m in de tekening"], ["Binnen", "2,8 m hoog in de tekening"], ["Deuren", "2, achter"], ["Assen", "3"]],
    namen: [["deuren", "DEUREN", 50, -60], ["oplegger", "LAADBAK", -60, -60], ["oplwiel", "3 ASSEN", -60, 40]] },
  { sleutel: "lichten", naam: "De lichten", titel: "De lichten", tekst: "Voor zitten koplampen, achter rode lampen. De oranje lampjes knipperen als de wagen afslaat. Langs de zijkant zitten oranje lampjes, zo zie je hoe lang hij is.", cam: [1.0, 0.1, 9.5, [7.4, 1.4, 0], 30], focus: ["lichten"], lichten: true,
    specs: [["Koplampen", "2, wit"], ["Knipperlichten", "oranje, voor en opzij"], ["Achterlichten", "rood"], ["Lampjes", "tik", "lichten"]],
    namen: [["koplamp", "KOPLAMP", 70, -60], ["knipper", "KNIPPERLICHT", -80, 60]] },
];
const KIND = [
  { naam: "de vrachtwagen", focus: ["cabine", "oplegger"], cam: [0.6, 0.2, 33, [0, 2.0, 0], 30], geluid: "toeter" },
  { naam: "de motor", focus: ["motor"], cam: [0.38, 0.2, 11.5, [6.7, 1.3, 0], 30], kantel: true, draaien: true, geluid: "brom" },
  { naam: "het stuur", focus: ["binnen"], cam: [0.62, 0.12, 9.5, [7.1, 2.1, 0], 30], doorzicht: true },
  { naam: "de spiegel", focus: ["spiegels"], cam: [0.75, 0.15, 6.5, [7.6, 2.6, 0.8], 30] },
  { naam: "de wielen", focus: ["wielen"], cam: [0.3, 0.1, 6.2, [3.5, 0.6, 0.9], 30], rollen: true, geluid: "rol" },
  { naam: "de tank", focus: ["tank"], cam: [0.45, 0.2, 6.5, [5.0, 0.8, 0.8], 30] },
  { naam: "de oplegger", focus: ["oplegger", "deuren"], cam: [-0.95, 0.16, 15, [-6.6, 2.1, 0], 32], deuren: true },
  { naam: "de lampen", focus: ["lichten"], cam: [1.0, 0.1, 9.5, [7.4, 1.4, 0], 30], lichten: true },
  { naam: "de toeter", focus: ["toeter"], cam: [0.8, 0.35, 6, [7.0, 3.4, 0], 30], geluid: "toeter" },
];

function mini(aan) {
  const sx = (x) => (60 + x * 6.3).toFixed(1), sy = (y) => (57 - y * 6.3).toFixed(1); // voorkant rechts
  const P = (pts) => "M" + pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join("L");
  const cirkel = (x, r) => `<circle cx="${sx(x)}" cy="${sy(r)}" r="${(r * 6.3).toFixed(1)}" class="${aan("wielen")}"/>`;
  return `<path d="${P([[8.42, 0.5], [8.32, 2.1], [8.05, 3.0], [7.85, 3.72], [6.05, 3.72], [6.05, 1.05]])}" class="${aan("cabine") || aan("binnen") || aan("spiegels") || aan("opstap") || aan("toeter")}"/>` +
    `<path d="${P([[5.2, 1.22], [5.2, 4.0], [-8.4, 4.0], [-8.4, 1.22], [5.2, 1.22]])}" class="${aan("oplegger")}"/>` +
    `<path d="${P([[-8.4, 1.4], [-8.4, 3.8]])}" class="${aan("deuren")}" style="stroke-width:3"/>` +
    `<path d="${P([[7.95, 0.85], [2.25, 0.85]])}" class="${aan("chassis") || aan("koppeling")}"/>` +
    `<path d="${P([[5.87, 0.5], [4.37, 0.5], [4.37, 1.1], [5.87, 1.1], [5.87, 0.5]])}" class="${aan("tank")}"/>` +
    `<path d="${P([[7.0, 0.7], [7.0, 1.4], [5.85, 1.4], [5.85, 0.7], [7.0, 0.7]])}" class="${aan("motor")}"/>` +
    `<path d="${P([[8.4, 1.02], [8.4, 1.1]])} ${P([[-8.4, 1.0], [-8.4, 1.08]])}" class="${aan("lichten")}" style="stroke-width:4"/>` +
    [XW, XA, ...XAS].map((x, i) => cirkel(x, i < 2 ? RW : RO)).join("");
}

let wielHoek = 0, deurNu = 0, losNu = 0, fanV = 0, lichtT = 0, kantelNu = 0;
const glad = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
let tVorig = null;
function beweeg(dt0, h, s) {
  // eigen klok: de bewegingen duren even lang, ook als het tekenen traag gaat
  const dt = tVorig === null ? dt0 : Math.min(0.25, Math.max(0, (s.t - tVorig) / 1000)); tVorig = s.t;
  let bezig = false;
  if (h.rollen) { wielHoek -= dt * 2.2; bezig = true; }
  for (const w of G.wielen) w.rotation.z = wielHoek;
  const dDoel = h.deuren ? 1 : 0; if (Math.abs(dDoel - deurNu) > 0.001) { deurNu += Math.sign(dDoel - deurNu) * Math.min(Math.abs(dDoel - deurNu), dt / 2.6); bezig = true; }
  G.deurR.rotation.y = 4.4 * glad(deurNu * 1.15); G.deurL.rotation.y = -4.4 * glad(deurNu * 1.15 - 0.15);
  const lDoel = h.los ? 1 : 0; if (Math.abs(lDoel - losNu) > 0.001) { losNu += Math.sign(lDoel - losNu) * Math.min(Math.abs(lDoel - losNu), dt / 3); bezig = true; }
  const poot = glad(losNu * 3), weg = glad(losNu * 1.5 - 0.5);
  G.poten.position.y = -0.24 * poot; G.trailer.position.x = -3.6 * weg;
  for (const w of G.oplWielen) w.rotation.z = wielHoek + (3.6 * weg) / RO;
  const kaDoel = h.kantel ? 1 : 0; if (Math.abs(kaDoel - kantelNu) > 0.001) { kantelNu += Math.sign(kaDoel - kantelNu) * Math.min(Math.abs(kaDoel - kantelNu), dt / 2.5); bezig = true; }
  G.kantel.rotation.z = -0.95 * glad(kantelNu);
  const fDoel = h.draaien ? 14 : 0; fanV += (fDoel - fanV) * Math.min(1, dt * 1.5);
  if (fanV > 0.01) { G.motor.fan.rotation.x += fanV * dt; bezig = true; }
  lichtT += dt; const aan = s.lichtAan || h.lichten || s.uiteen;
  W.lampen(MAT, aan, lichtT, [marker]);
  if (aan) bezig = true;
  return bezig;
}

return {
  titel: "De vrachtwagen", label: "Vrachtwagen", model: "Trekker met oplegger", schaal: "Maten in meters", hint: "Sleep om te draaien · tik op de lampjes", SECTIES, KIND, mini, beweeg,
  doorzicht: (aan) => { cab.binnen.visible = aan; },
  anker: () => ({ cabine: cab.schaal, stuur: cab.stuur, bed: cab.binnen.children[1], spiegel: cab.spiegels[0], opstap: cab.opstap, motor: G.motor.children[0], koeler: G.motor.children[2], tank: G.tank.children[0], koppeling: G.koppeling, chassis: G.balkR, poten: G.poten, voorwiel: G.voorR, dubbellucht: G.achterR, oplegger: G.box.children[0], deuren: G.deurR, oplwiel: G.oplWielR, koplamp: cab.koplamp, knipper: cab.knipper[0], achterlicht: G.achterlicht }),
  uiteenCam: [0.66, 0.32, 40, [0, 2.6, 0], 32],
  uiteen: () => [
    [G.kantel, [1.3, 1.6, 0], "CABINE", [50, -40]], [G.motor, [0.4, 0.35, 0], "MOTOR", [60, 30]], [G.tank, [0, 0, 1.4], "TANK", [50, 40]],
    [G.voorL, [0, 0, -1.1], null], [G.voorR, [0, 0, 1.1], "VOORWIEL", [40, 50]], [G.achterL, [0, 0, -1.2], null], [G.achterR, [0, 0, 1.2], "DUBBELLUCHT", [30, 60]],
    [G.koppeling, [0, 0.9, 0], "KOPPELSCHOTEL", [-40, -50]], [G.box, [-1.2, 1.8, 0], "OPLEGGER", [-40, -50]], [G.assen, [-1.2, -0.0, 1.0], "3 ASSEN", [-50, 40]],
  ],
};
}
