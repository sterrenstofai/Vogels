// De bus: een algemene elektrische stadsbus met een lage vloer en drie deuren, in code getekend (maten in meters,
// zoals een bus van 12 meter; de voorkant wijst naar +x, rechts is +z, de deuren zitten rechts).
// Geen bestaand type, geen merk, geen lijnnummer, geen kleuren van een vervoerder. Module voor /js/kern.js.
import { kast, vlakje, wiel, wielkast, boogRand } from "./_auto.js";

export default function maak(ctx) {
const { THREE, V, TAU, root, MAT, soort, DELEN, mesh, groep, op, buis, samen, staaf, rondeDoos } = ctx;
const G = { wielen: [], deuren: [], lichten: {} };
soort("binnenwand", 0xecebe8, { color: 0x74777c, roughness: 0.8, metalness: 0 });
soort("stang", 0xeee3bd, { color: 0xc89b2c, roughness: 0.35, metalness: 0.4, clearcoat: 0.4 });
soort("kleding", 0xdcd9d2, { color: 0x3a4757, roughness: 0.85, metalness: 0 });
soort("gezicht", 0xf1e7dc, { color: 0xc49a7c, roughness: 0.7, metalness: 0 });
soort("bord", 0x77797c, { color: 0x111111, roughness: 0.3, metalness: 0, emissive: 0xffa53a, emissiveIntensity: 0 });
soort("knipper", 0xf3d9a6, { color: 0xc77d16, roughness: 0.2, metalness: 0, emissive: 0xff9a20, emissiveIntensity: 0 });

// ---- maten
const X0 = -6, X1 = 6, Y0 = 0.3, Y1 = 3.0, ZB = 1.275, DIK = 0.04;
const XV = 3.3, XA = -2.6, RW = 0.48, RA = 0.6, YA = 0.48; // voor- en achteras, wielstraal, wielkast
const VLOER = 0.37, DT = 2.35; // bovenkant van de vloer, bovenkant van de deuren
const DEUREN = [[4.25, 5.45], [0.05, 1.35], [-4.6, -3.4]]; // rechts (+z), van voor naar achter
const inBoog = (x, y) => [XV, XA].some((xa) => (x - xa) ** 2 + (y - YA) ** 2 < RA * RA);
const bak = new THREE.Group(); root.add(bak); G.bak = bak; // alles behalve de wielen: kan knielen

// ---- de kast: buitenkant en binnenwand, met gaten voor de deuren en de wielen
const K = kast(ctx, { x0: X0, x1: X1, y0: Y0, y1: Y1, z0: -ZB, z1: ZB }, { xn: 0.22, xp: 0.34, yn: 0.06, yp: 0.22, zn: 0.3, zp: 0.3 }, {
  dikte: DIK, stap: 0.2,
  knip: { x: DEUREN.flat().concat([XV - RA, XV + RA, XA - RA, XA + RA]), y: [DT] },
  gat: (vlak, x, y, z) => {
    if (vlak === "z+" && y < DT && DEUREN.some(([a, b]) => x > a && x < b)) return true;
    if (vlak[0] === "z" && inBoog(x, y)) return true;
    if (vlak === "y-") { if (Math.abs(z) > 0.55 && [XV, XA].some((xa) => Math.abs(x - xa) < RA)) return true; if (z > 1.0 && DEUREN.some(([a, b]) => x > a && x < b)) return true; }
    return false;
  },
});
const huid = mesh(K.buiten, "romp", "romp"); huid.userData.romp = true;
const wand = mesh(K.binnen, "binnenwand", "romp", { schaduw: false }); wand.userData.romp = true;
bak.add(huid, wand); G.huid = huid;
const V_ = (vlak, s0, s1, t0, t1, o) => vlakje(ctx, K, vlak, s0, s1, t0, t1, o);
// ramen: voorruit (om de hoeken heen), zijramen, achterruit; elk met een zwarte rubberen rand
{
  const glas = [], rand = [];
  const ruit = (vlak, s0, s1, t0, t1, rc = 0.07, ringen = 8) => { glas.push(V_(vlak, s0, s1, t0, t1, { rc, off: 0.012, ringen })); rand.push(V_(vlak, s0 - 0.035, s1 + 0.035, t0 - 0.035, t1 + 0.035, { rc: rc + 0.03, off: 0.006, ringen: 3 })); };
  ruit("x+", -1.36, 1.36, 0.92, 2.42, 0.14, 18); // voorruit
  ruit("x-", -0.86, 0.86, 1.82, 2.62, 0.1); // achterruit
  // rechts: tussen de deuren
  const rechts = [[5.62, 5.9], [1.47, 2.72], [2.84, 4.12], [-1.0, -0.07], [-2.15, -1.12], [-3.28, -2.27], [-5.72, -4.72]];
  for (const [a, b] of rechts) ruit("z+", a, b, 1.2, 2.6);
  for (const [a, b] of DEUREN) ruit("z+", a + 0.04, b - 0.04, 2.44, 2.62, 0.04, 3); // smal raampje boven de deur
  // links: het raam van de chauffeur (lager) en dan een rij ramen
  ruit("z-", 4.3, 5.55, 1.0, 2.6);
  const links = []; for (let i = 0; i < 7; i++) { const a = -5.72 + i * 1.426; links.push([a, a + 1.31]); }
  for (const [a, b] of links) ruit("z-", a, b, 1.2, 2.6);
  // één ruit apart, als anker voor de naam
  const een = mesh(glas.splice(3, 1)[0], "raam", "romp"); een.userData.romp = true; G.ruit = een;
  const gm = mesh(samen(glas), "raam", "romp"), rm = mesh(samen(rand), "rubber", "romp");
  gm.userData.romp = rm.userData.romp = true; bak.add(gm, rm, een);
}
// de lijst boven en onder: stootranden langs de zijkant, bumpers voor en achter
{
  const strip = [];
  const delen = (lijst) => { for (let i = 0; i < lijst.length - 1; i++) strip.push(lijst[i]); };
  // rechts: niet over de deuren en de wielkasten
  const vrijR = [[X0 + 0.25, -4.68], [-3.32, XA - RA - 0.06], [XA + RA + 0.06, -0.03], [1.43, XV - RA - 0.06], [XV + RA + 0.06, 4.17]];
  const vrijL = [[X0 + 0.25, XA - RA - 0.06], [XA + RA + 0.06, XV - RA - 0.06], [XV + RA + 0.06, X1 - 0.38]];
  for (const [a, b] of vrijR) strip.push(rondeDoos(b - a, 0.07, 0.04, 0.015).translate((a + b) / 2, 0.66, ZB + 0.012));
  for (const [a, b] of vrijL) strip.push(rondeDoos(b - a, 0.07, 0.04, 0.015).translate((a + b) / 2, 0.66, -ZB - 0.012));
  delen([]);
  const sm = mesh(samen(strip), "rubber", "romp"); sm.userData.romp = true;
  const bumpers = mesh(samen([V_("x+", -1.42, 1.42, 0.33, 0.56, { rc: 0.06, off: 0.022, ringen: 5 }), V_("x-", -1.4, 1.4, 0.33, 0.6, { rc: 0.06, off: 0.022, ringen: 5 })]), "rubber", "romp");
  // de randen om de wielkasten
  const randen = []; for (const xa of [XV, XA]) for (const k of [1, -1]) randen.push(boogRand(ctx, xa, YA, RA + 0.015, Y0, k * (ZB + 0.004), 0.035));
  const rb = mesh(samen(randen), "rubber", "romp");
  bak.add(sm, bumpers, rb);
  // achter: een rooster voor de koeling
  const rooster = []; for (let i = 0; i < 6; i++) rooster.push(rondeDoos(0.03, 0.035, 1.1, 0.01).translate(X0 - 0.008, 0.98 + i * 0.09, 0));
  bak.add(mesh(samen(rooster), "zwartmetaal", "romp"));
  // ruitenwissers
  const wis = []; for (const z of [-0.08, 0.88]) { const g = rondeDoos(0.025, 0.025, 0.82, 0.01); g.rotateX(-0.12); g.translate(X1 + 0.03, 1.0, z - 0.4); wis.push(g); }
  bak.add(mesh(samen(wis), "zwartmetaal", "romp"));
  // het bord boven de voorruit (zonder tekst) en achter
  bak.add(mesh(samen([V_("x+", -0.98, 0.98, 2.5, 2.72, { rc: 0.03, off: 0.012, ringen: 4 }), V_("z+", 4.3, 5.4, 2.44, 2.62, { rc: 0.02, off: 0.016, ringen: 3 })]), "bord", "lichten"));
}
// ---- de deuren: twee vleugels per deur, die eerst naar buiten en dan opzij schuiven
for (const [a, b] of DEUREN) {
  const w = (b - a) / 2, h = DT - 0.02 - (VLOER + 0.01), g = new THREE.Group(); g.position.set((a + b) / 2, 0, 0);
  // deurpost en bovenstuk
  const post = [];
  for (const x of [a, b]) post.push(new THREE.BoxGeometry(0.05, DT - Y0 + 0.04, 0.09).translate(x - (a + b) / 2, (DT + Y0) / 2, ZB - 0.035));
  post.push(new THREE.BoxGeometry(b - a + 0.05, 0.05, 0.09).translate(0, DT + 0.02, ZB - 0.035));
  g.add(mesh(samen(post), "rubber", "romp"));
  // de drempel (geel, zodat je hem ziet)
  g.add(mesh(new THREE.BoxGeometry(b - a, 0.02, 0.1).translate(0, VLOER + 0.005, ZB - 0.07), "stang", "deuren"));
  const vleugels = [];
  for (const k of [-1, 1]) {
    const vl = new THREE.Group(), frame = [], cx = k * w / 2;
    frame.push(rondeDoos(w - 0.02, 0.09, 0.045, 0.015).translate(0, h / 2 - 0.045, 0), rondeDoos(w - 0.02, 0.16, 0.045, 0.015).translate(0, -h / 2 + 0.08, 0), rondeDoos(w - 0.02, 0.07, 0.045, 0.015).translate(0, -0.05, 0));
    for (const x of [-(w - 0.02) / 2 + 0.035, (w - 0.02) / 2 - 0.035]) frame.push(rondeDoos(0.07, h, 0.045, 0.015).translate(x, 0, 0));
    const fm = mesh(samen(frame), "naad", "deuren"), gl = mesh(new THREE.BoxGeometry(w - 0.1, h - 0.2, 0.014).translate(0, 0.02, 0), "raam", "deuren");
    // een greep aan de binnenkant
    const greep = mesh(staaf(V(-k * (w / 2 - 0.12), -0.35, -0.05), V(-k * (w / 2 - 0.12), 0.35, -0.05), 0.016, 10), "stang", "deuren");
    fm.userData.romp = gl.userData.romp = true;
    vl.add(fm, gl, greep); vl.position.set(cx, VLOER + 0.01 + h / 2, ZB - 0.03); vl.userData = { cx, k, w };
    g.add(vl); vleugels.push(vl);
  }
  bak.add(g); G.deuren.push({ g, vleugels });
}
// ---- spiegels: aan gebogen armen voor de voorruit
{
  const sp = new THREE.Group();
  for (const k of [1, -1]) {
    const arm = buis([V(5.7, 2.86, k * 1.17), V(6.05, 2.93, k * 1.26), V(6.3, 2.78, k * 1.33), V(6.36, 2.42, k * 1.35)], 0.025, { seg: 40, rond: 10 });
    const voet = rondeDoos(0.14, 0.08, 0.1, 0.02).translate(5.68, 2.86, k * 1.15);
    const kop = rondeDoos(0.11, 0.44, 0.26, 0.04).translate(6.36, 2.2, k * 1.36);
    const glas = new THREE.BoxGeometry(0.01, 0.38, 0.21).translate(6.3, 2.2, k * 1.36);
    sp.add(mesh(samen([arm, voet, kop]), "zwartmetaal", "spiegels"), mesh(glas, "raam", "spiegels"));
  }
  bak.add(sp); G.spiegels = sp;
}
// ---- lampen: koplampen, knipperlichten, achterlichten, lampen binnen
{
  const kop = [], knip = [], achter = [];
  for (const k of [1, -1]) {
    kop.push(V_("x+", k > 0 ? 0.62 : -1.3, k > 0 ? 1.3 : -0.62, 0.62, 0.82, { rc: 0.07, off: 0.014, ringen: 6 }));
    knip.push(V_("x+", k > 0 ? 1.32 : -1.5, k > 0 ? 1.5 : -1.32, 0.62, 0.82, { rc: 0.05, off: 0.014, ringen: 4 }));
    achter.push(V_("x-", k > 0 ? 1.0 : -1.48, k > 0 ? 1.48 : -1.0, 0.72, 1.62, { rc: 0.08, off: 0.014, ringen: 6 }));
    knip.push(V_("z" + (k > 0 ? "+" : "-"), 4.0, 4.16, 0.82, 0.88, { rc: 0.02, off: 0.016, ringen: 2 })); // zijknipperlicht
  }
  const kl = mesh(samen(kop), "lamp", "lichten"), kn = mesh(samen(knip), "knipper", "lichten"), al = mesh(samen(achter), "achterlicht", "lichten");
  bak.add(kl, kn, al); G.lichten.kop = kl;
}
// ---- het dak: accu's, airco, een luik
{
  const dak = new THREE.Group();
  const acc = [];
  for (const z of [-0.58, 0.58]) acc.push(rondeDoos(4.2, 0.26, 1.0, 0.07).translate(-2.9, Y1 + 0.13, z));
  const ribbels = []; for (let x = -4.8; x <= -1.0; x += 0.38) for (const z of [-0.58, 0.58]) ribbels.push(rondeDoos(0.05, 0.02, 0.9, 0.008).translate(x, Y1 + 0.265, z));
  const accus = mesh(samen(acc.concat(ribbels)), "klep", "dak");
  const airco = mesh(rondeDoos(2.3, 0.3, 1.95, 0.1).translate(2.75, Y1 + 0.13, 0), "klep", "dak");
  const roosters = []; for (const x of [2.15, 3.35]) roosters.push(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 32).translate(x, Y1 + 0.285, 0));
  const luik = rondeDoos(0.85, 0.07, 0.85, 0.03).translate(0.6, Y1 + 0.02, 0);
  dak.add(accus, airco, mesh(samen(roosters), "zwartmetaal", "dak"), mesh(luik, "klep", "dak"));
  bak.add(dak); G.dak = dak; G.accus = accus; G.airco = airco;
}
// ---- binnen: vloer, wielkasten, stoelen, stangen, lampen
{
  const binnen = new THREE.Group();
  const vl = [];
  const zw = 0.55, zr = ZB - DIK - 0.005; // de wielkasten beginnen bij |z| = zw
  vl.push(new THREE.BoxGeometry(X1 - X0 - 0.3, 0.03, 2 * zw).translate(0, VLOER - 0.015, 0));
  for (const k of [1, -1]) for (const [a, b] of [[X0 + 0.15, XA - RA - 0.04], [XA + RA + 0.04, XV - RA - 0.04], [XV + RA + 0.04, X1 - 0.2]]) vl.push(new THREE.BoxGeometry(b - a, 0.03, zr - zw).translate((a + b) / 2, VLOER - 0.015, k * (zw + zr) / 2));
  // achterin een verhoging met een trede
  vl.push(rondeDoos(1.1, 0.27, 2 * zr, 0.02).translate(-5.3, VLOER + 0.12, 0));
  binnen.add(mesh(samen(vl), "vloer", "binnen"));
  for (const xa of [XV, XA]) for (const k of [1, -1]) binnen.add(wielkast(ctx, xa, 0.46, 0.62, k * zw, k * (ZB - 0.02), "binnenwand", "binnen"));
  // stoelen: kussen, rugleuning, poot; kijken naar voren (+x)
  const st = [], poot = [];
  const stoel = (x, z, y0, draai = 0) => {
    const c = rondeDoos(0.44, 0.09, 0.43, 0.035), r = rondeDoos(0.07, 0.52, 0.43, 0.03);
    c.translate(0.02, 0.45, 0); r.rotateZ(0.12); r.translate(-0.2, 0.77, 0);
    const p = new THREE.BoxGeometry(0.08, 0.4, 0.08).translate(0, 0.2, 0);
    for (const g of [c, r, p]) { g.rotateY(draai); g.translate(x, y0, z); }
    st.push(c, r); poot.push(p);
  };
  const rijL = [2.2, 1.45, -0.6, -1.35, -3.75, -4.45], rijR = [2.3, 1.7, -0.6, -1.35];
  for (const x of rijL) for (const z of [-0.99, -0.55]) stoel(x, z, VLOER);
  for (const x of rijR) for (const z of [0.55, 0.99]) stoel(x, z, VLOER);
  for (const z of [-0.99, -0.55, 0.55, 0.99]) stoel(-4.95, z, VLOER + 0.25 - 0.01);
  for (const z of [-0.99, -0.55, 0, 0.55, 0.99]) stoel(-5.6, z, VLOER + 0.25 - 0.01);
  // klapstoel en leunkussen bij de plek voor de rolstoel en de kinderwagen (links, tegenover de middelste deur)
  st.push(rondeDoos(0.4, 0.08, 0.42, 0.03).translate(0.75, VLOER + 0.48, -1.0), rondeDoos(1.0, 0.36, 0.08, 0.04).translate(0.25, VLOER + 0.82, -ZB + DIK + 0.06));
  binnen.add(mesh(samen(st), "stoel", "binnen"), mesh(samen(poot), "zwartmetaal", "binnen"));
  // stangen: rechtop, en twee leuningen langs het plafond
  const top = Y1 - DIK - 0.03, stang = [], knop = [];
  const paal = (x, z) => { stang.push(staaf(V(x, VLOER, z), V(x, top, z), 0.02, 12)); };
  for (const x of rijL) paal(x - 0.3, -0.36);
  for (const x of rijR) paal(x - 0.3, 0.36);
  for (const [a, b] of DEUREN) { paal(a - 0.05, 1.08); paal(b + 0.05, 1.08); paal((a + b) / 2, 0.5); }
  paal(-0.35, -0.36); paal(1.05, -0.36); paal(4.45, -0.3);
  for (const z of [-0.36, 0.36]) stang.push(staaf(V(-5.2, 2.05, z), V(4.5, 2.05, z), 0.018, 10));
  // de stangen boven gaan met korte stukjes naar het plafond
  for (let x = -5.0; x <= 4.4; x += 1.6) for (const z of [-0.36, 0.36]) stang.push(staaf(V(x, 2.05, z), V(x, top, z), 0.015, 8));
  // stopknoppen (rood) aan een paar palen
  for (const x of rijL.slice(0, 4)) knop.push(rondeDoos(0.06, 0.09, 0.06, 0.02).translate(x - 0.3, 1.35, -0.36 + 0.03));
  for (const [a, b] of DEUREN) knop.push(rondeDoos(0.06, 0.09, 0.06, 0.02).translate(a - 0.05, 1.35, 1.08 - 0.03));
  const stangM = mesh(samen(stang), "stang", "binnen");
  binnen.add(stangM, mesh(samen(knop), "rood", "binnen"));
  // lampen langs het plafond
  const lamp = []; for (const z of [-0.62, 0.62]) lamp.push(rondeDoos(10.4, 0.03, 0.12, 0.012).translate(-0.4, top + 0.005, z));
  binnen.add(mesh(samen(lamp), "lamp", "lichten"));
  bak.add(binnen); G.binnen = binnen; G.stangen = stangM;
}
// ---- de chauffeur: stoel, stuur, dashboard, een glazen wandje, en de chauffeur zelf (links voorin)
{
  const ch = new THREE.Group(), zc = -0.72;
  const stoel = [rondeDoos(0.5, 0.11, 0.5, 0.04).translate(4.95, VLOER + 0.5, zc), rondeDoos(0.09, 0.7, 0.5, 0.04).rotateZ(0.16).translate(4.68, VLOER + 0.92, zc), rondeDoos(0.08, 0.16, 0.26, 0.04).translate(4.62, VLOER + 1.38, zc)];
  const voet = [new THREE.CylinderGeometry(0.06, 0.12, 0.44, 16).translate(4.95, VLOER + 0.22, zc)];
  const dash = rondeDoos(0.5, 0.3, 1.1, 0.07); dash.rotateZ(0.35); dash.translate(5.7, 0.9, -0.65);
  const kolom = staaf(V(5.62, 0.92, zc), V(5.3, 1.2, zc), 0.035, 12);
  const voetje = staaf(V(5.68, 0.98, -0.3), V(5.64, 1.08, -0.3), 0.02, 8); // het scherm staat op het dashboard
  const scherm = rondeDoos(0.03, 0.18, 0.3, 0.015); scherm.rotateZ(0.6); scherm.translate(5.62, 1.13, -0.3);
  const stuur = new THREE.TorusGeometry(0.24, 0.022, 12, 40); stuur.rotateX(Math.PI / 2); stuur.rotateZ(0.42); stuur.translate(5.28, 1.22, zc);
  const spaken = [staaf(V(5.28, 1.22, zc - 0.22), V(5.28, 1.22, zc + 0.22), 0.016, 8)];
  // het wandje achter de chauffeur, met glas
  const wandje = [rondeDoos(0.05, 1.0, 0.9, 0.02).translate(4.5, VLOER + 0.5, -0.78)];
  const wglas = new THREE.BoxGeometry(0.015, 0.75, 0.84).translate(4.5, VLOER + 1.38, -0.78);
  // de chauffeur: zit, handen aan het stuur
  const mens = [], hoofd = [];
  mens.push(buis([V(4.86, VLOER + 0.62, zc), V(4.84, VLOER + 0.9, zc), V(4.84, VLOER + 1.18, zc)], (t) => [0.16 - 0.02 * t, 0.17], { seg: 12, rond: 14 }));
  for (const d of [-0.11, 0.11]) {
    mens.push(buis([V(4.92, VLOER + 0.64, zc + d), V(5.32, VLOER + 0.66, zc + d * 1.1), V(5.44, VLOER + 0.34, zc + d * 1.2), V(5.47, VLOER + 0.06, zc + d * 1.2)], 0.065, { seg: 20, rond: 10 }));
    mens.push(rondeDoos(0.24, 0.08, 0.1, 0.03).translate(5.55, VLOER + 0.04, zc + d * 1.2));
    mens.push(buis([V(4.84, VLOER + 1.12, zc + d * 1.8), V(5.0, VLOER + 0.86, zc + d * 2.1), V(5.2, VLOER + 0.86, zc + d * 1.8)], 0.045, { seg: 14, rond: 10 }));
    hoofd.push(new THREE.SphereGeometry(0.045, 12, 8).translate(5.24, VLOER + 0.87, zc + d * 1.8));
  }
  hoofd.push(new THREE.SphereGeometry(0.105, 24, 16).scale(1, 1.15, 0.95).translate(4.87, VLOER + 1.37, zc), new THREE.CylinderGeometry(0.05, 0.055, 0.1, 12).translate(4.86, VLOER + 1.23, zc));
  ch.add(mesh(samen(stoel), "stoel", "chauffeur"), mesh(samen(voet), "zwartmetaal", "chauffeur"), mesh(samen([dash, kolom, voetje]), "klep", "chauffeur"), mesh(scherm, "scherm", "chauffeur"),
    mesh(samen([stuur, ...spaken]), "zwartmetaal", "chauffeur"), mesh(samen(wandje), "binnenwand", "chauffeur"), mesh(wglas, "raam", "chauffeur"),
    mesh(samen(mens), "kleding", "chauffeur"), mesh(samen(hoofd), "gezicht", "chauffeur"));
  bak.add(ch); G.chauffeur = ch;
}
// ---- wielen: voor enkel, achter dubbel
for (const [x, dubbel] of [[XV, false], [XA, true]]) for (const k of [1, -1]) {
  const { wiel: w, draai } = wiel(ctx, { r: RW, breed: 0.28, velg: 0.29, dubbel, deel: "wielen", diep: dubbel ? 0.1 : 0.06 });
  w.position.set(x, RW, k * (dubbel ? 1.08 : 1.06)); if (k < 0) w.rotation.y = Math.PI;
  draai.userData.k = k; root.add(w); G.wielen.push(draai); G[`wiel${x > 0 ? "V" : "A"}${k > 0 ? "R" : "L"}`] = w;
}
// assen (onder de bus, nauwelijks te zien)
root.add(mesh(samen([staaf(V(XV, RW, -0.95), V(XV, RW, 0.95), 0.06, 12), staaf(V(XA, RW, -0.8), V(XA, RW, 0.8), 0.09, 12)]), "zwartmetaal", "wielen"));


// ================= Teksten (maten zijn die van de tekening) =================
// op een smal scherm (staand) iets verder weg, zodat het hele voertuig in beeld past
const SMAL = typeof matchMedia === "function" && matchMedia("(max-aspect-ratio: 1/1)").matches;
const C = (d, h, a, p, fov) => [d, h, a * (SMAL ? 1.3 : 1), p, fov];
// op een smal scherm alle namen links van hun punt, dan lopen ze niet over de rechterrand
const U = (lijst) => (SMAL ? lijst.map(([o, v, n, pl]) => [o, v, n, pl ? [-Math.abs(pl[0]), pl[1]] : pl]) : lijst);
const N = (lijst) => (SMAL ? lijst.map(([k, t, dx, dy]) => [k, t, -Math.abs(dx), dy]) : lijst);
const SECTIES = [
  { sleutel: "bus", naam: "De bus", titel: "De bus", tekst: "Een stadsbus met een lage vloer: je stapt zo naar binnen, zonder trapje. Deze bus rijdt op stroom. Tik op de lampen.", cam: C(0.62, 0.15, 20, [0.2, 1.4, 0], 32), focus: null,
    specs: [["Lengte", "12 m in de tekening"], ["Breedte", "2,55 m"], ["Hoogte", "3,3 m met het dak"], ["Deuren", "3, aan de rechterkant"], ["Zitplaatsen", "31 in de tekening"], ["Lampen", "tik", "lichten"]],
    namen: N([["deur", "DEUREN", -40, 70], ["ruit", "RAMEN", -50, -70], ["wiel", "WIELEN", 50, 60], ["dak", "DAK · ACCU'S", 40, -60], ["spiegels", "SPIEGEL", 50, -40]]) },
  { sleutel: "deuren", naam: "De deuren", titel: "De deuren", tekst: "Drie brede deuren aan de rechterkant. Ze gaan eerst naar buiten en schuiven dan opzij. De bus zakt aan die kant een stukje omlaag: dat heet knielen.", cam: C(0.24, 0.07, 19.5, [0.2, 1.2, 0.5], 32), focus: ["deuren"], deuren: true,
    specs: [["Deuren", "3, elk met 2 vleugels"], ["Breedte", "1,2 tot 1,3 m in de tekening"], ["Vloer", "37 cm boven de weg"], ["Knielen", "een paar centimeter omlaag"]],
    namen: N([["deur", "MIDDELSTE DEUR", 30, 110], ["deur1", "VOORDEUR", 30, 110], ["deur3", "ACHTERDEUR", -30, 110]]) },
  { sleutel: "binnen", naam: "Binnen", titel: "Binnen in de bus", tekst: "Stoelen aan twee kanten van het gangpad, en overal stangen om je vast te houden. Met de rode knop vraag je de chauffeur om te stoppen.", cam: C(0.55, 0.72, 22, [0.1, 0.8, 0], 32), focus: ["binnen"], doorzicht: true,
    specs: [["Zitplaatsen", "31 in de tekening"], ["Stangen", "geel, van vloer tot plafond"], ["Stopknoppen", "rood, aan de stangen"], ["Rolstoelplek", "tegenover de middelste deur"]],
    namen: N([["stoel", "STOELEN", -60, -60], ["stangen", "STANGEN", 50, -80], ["vloer", "LAGE VLOER", 60, 50]]) },
  { sleutel: "chauffeur", naam: "De chauffeur", titel: "De chauffeur", tekst: "Linksvoor zit de chauffeur, achter een groot stuur dat bijna plat ligt. Voor hem zit een dashboard met knoppen en een scherm.", cam: C(1.72, 0.5, 9.5, [4.9, 1.15, -0.45], 32), focus: ["chauffeur"], doorzicht: true,
    specs: [["Plek", "linksvoor"], ["Stuur", "bijna plat"], ["Wandje", "van glas, achter de stoel"]],
    namen: N([["chauffeur", "CHAUFFEUR", -60, -60], ["stuur", "STUUR", 60, -40]]) },
  { sleutel: "wielen", naam: "De wielen", titel: "De wielen", tekst: "Voor zit aan elke kant één wiel, achter twee wielen naast elkaar. De voorwielen sturen, de achterwielen worden aangedreven.", cam: C(0.14, 0.08, 20, [0.35, 0.9, 0], 32), focus: ["wielen"], rollen: true,
    specs: [["Wielen", "6: voor 2, achter 2 × 2"], ["Doorsnede", "96 cm in de tekening"], ["Tussen de assen", "5,9 m"]],
    namen: N([["wiel", "VOORWIEL", 50, 110], ["wielA", "DUBBELE ACHTERWIELEN", -50, 110]]) },
  { sleutel: "dak", naam: "Het dak", titel: "Het dak", tekst: "Op het dak liggen de accu's: grote batterijen voor de motor. Voorop staat de airco, die het binnen koel of warm maakt.", cam: C(0.75, 0.7, 23, [-0.4, 2.2, 0], 32), focus: ["dak"],
    specs: [["Accu's", "2 lange kasten op het dak"], ["Airco", "voorop het dak"], ["Motor", "elektrisch, bij de achteras"]],
    namen: N([["accus", "ACCU'S", -50, -60], ["airco", "AIRCO", 50, -60]]) },
  { sleutel: "lichten", naam: "Lampen en spiegels", titel: "Lampen en spiegels", tekst: "Voor twee koplampen, achter rode lampen. De spiegels hangen aan lange armen voor de ruit, zodat de chauffeur langs de bus kijkt.", cam: C(1.18, 0.12, 12, [4.6, 1.5, 0], 32), focus: ["lichten", "spiegels"], lichten: true,
    specs: [["Koplampen", "2, wit"], ["Knipperlichten", "oranje, voor en opzij"], ["Spiegels", "2, aan lange armen"], ["Lampen", "tik", "lichten"]],
    namen: N([["koplamp", "KOPLAMP", -50, 50], ["spiegels", "SPIEGEL", 50, -60]]) },
];
const KIND = [
  { naam: "de bus", focus: ["romp"], cam: C(0.62, 0.15, 20, [0.2, 1.4, 0], 32), geluid: "toeter" },
  { naam: "de deuren", focus: ["deuren"], cam: C(0.24, 0.07, 19.5, [0.2, 1.2, 0.5], 32), deuren: true },
  { naam: "de stoelen", focus: ["binnen"], cam: C(0.55, 0.72, 22, [0.1, 0.8, 0], 32), doorzicht: true },
  { naam: "de chauffeur", focus: ["chauffeur"], cam: C(1.72, 0.5, 9.5, [4.9, 1.15, -0.45], 32), doorzicht: true, geluid: "toeter" },
  { naam: "de wielen", focus: ["wielen"], cam: C(0.14, 0.08, 20, [0.35, 0.9, 0], 32), rollen: true, geluid: "rol" },
  { naam: "het dak", focus: ["dak"], cam: C(0.75, 0.7, 23, [-0.4, 2.2, 0], 32) },
  { naam: "de lampen", focus: ["lichten"], cam: C(1.18, 0.12, 12, [4.6, 1.5, 0], 32), lichten: true },
  { naam: "de spiegels", focus: ["spiegels"], cam: C(1.3, 0.25, 8, [5.6, 2.2, 0.3], 32) },
];

function mini(aan) {
  const sx = (x) => 60 + x * 8.6, sy = (y) => 58 - y * 12;
  const kastPad = `M${sx(-6)},${sy(0.36)}L${sx(-6)},${sy(2.8)}Q${sx(-6)},${sy(3)} ${sx(-5.8)},${sy(3)}L${sx(5.6)},${sy(3)}Q${sx(6)},${sy(3)} ${sx(6)},${sy(2.6)}L${sx(6)},${sy(0.36)}Z`;
  const ramen = `M${sx(-5.7)},${sy(1.2)}H${sx(5.9)}M${sx(-5.7)},${sy(2.6)}H${sx(5.9)}`;
  const deuren = DEUREN.map(([a, b]) => `<path d="M${sx(a)},${sy(0.4)}V${sy(DT)}H${sx(b)}V${sy(0.4)}M${sx((a + b) / 2)},${sy(0.4)}V${sy(DT)}" class="${aan("deuren")}"/>`).join("");
  const wielen = [XV, XA].map((x) => `<circle cx="${sx(x)}" cy="${sy(RW)}" r="${RW * 10}" class="${aan("wielen")}"/>`).join("");
  return `<path d="${kastPad}" class="${aan("romp") || aan("binnen") || aan("chauffeur")}"/><path d="${ramen}" class="${aan("binnen")}"/>${deuren}${wielen}` +
    `<path d="M${sx(-5)},${sy(3)}V${sy(3.26)}H${sx(-0.8)}V${sy(3)}M${sx(1.6)},${sy(3)}V${sy(3.28)}H${sx(3.9)}V${sy(3)}" class="${aan("dak")}"/>` +
    `<path d="M${sx(5.75)},${sy(0.72)}H${sx(6)}" class="${aan("lichten")}" style="stroke-width:4"/>`;
}

const glad = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
let deurNu = 0, deurKlok = 0, rol = 0, lichtT = 0;
function zetDeuren(t) {
  for (const { vleugels } of G.deuren) for (const vl of vleugels) {
    const { cx, k, w } = vl.userData, uit = 0.12 * glad(t / 0.3), opzij = (w - 0.06) * glad((t - 0.22) / 0.78);
    vl.position.x = cx + k * opzij; vl.position.z = ZB - 0.03 + uit;
  }
  G.bak.rotation.x = 0.03 * glad(t); G.bak.position.y = -0.035 * glad(t);
}
function beweeg(dt, h, s) {
  let bezig = false;
  let doel = 0;
  G.dak.visible = !h.doorzicht || !!s.uiteen; // als je binnen kijkt, staat het dak niet in de weg
  if (h.deuren) { deurKlok += dt; doel = deurKlok % 9 < 6.2 ? 1 : 0; bezig = true; } else deurKlok = 0;
  if (Math.abs(deurNu - doel) > 1e-3) { deurNu += Math.sign(doel - deurNu) * Math.min(Math.abs(doel - deurNu), dt / 1.6); zetDeuren(deurNu); bezig = true; }
  if (h.rollen) { rol += dt * 2.4; for (const d of G.wielen) d.rotation.z = -d.userData.k * rol; bezig = true; }
  lichtT += dt;
  const aan = s.lichtAan || h.lichten || s.uiteen;
  const knip = aan && h.lichten && lichtT % 0.9 < 0.45;
  for (const k of ["teken", "donker"]) {
    MAT.lamp[k].emissiveIntensity = aan ? 2.4 : 0;
    MAT.achterlicht[k].emissiveIntensity = aan ? 2.2 : 0.12;
    MAT.bord[k].emissiveIntensity = aan ? 0.9 : 0.03;
    MAT.knipper[k].emissiveIntensity = knip ? 2.4 : 0.05;
  }
  if (h.lichten) bezig = true;
  return bezig;
}
return {
  titel: "De bus", label: "Bus", model: "Stadsbus · lage vloer", schaal: "Maten in meters", hint: "Sleep om te draaien · tik op de lampen", SECTIES, KIND, mini, beweeg,
  doorzicht: () => {},
  anker: () => ({ romp: G.huid, ruit: G.ruit, deur: G.deuren[1].vleugels[1], deur1: G.deuren[0].vleugels[0], deur3: G.deuren[2].vleugels[1], wiel: G.wielVR, wielA: G.wielAR, dak: G.dak, accus: G.accus, airco: G.airco,
    spiegels: G.spiegels.children[0], stoel: G.binnen.children[5], stangen: G.stangen, vloer: G.binnen.children[0], chauffeur: G.chauffeur.children[7], stuur: G.chauffeur.children[4], koplamp: G.lichten.kop }),
  uiteenCam: C(0.6, 0.42, 30, [0, 2.2, 0], 34),
  uiteen: () => U([
    [G.dak, [0, 2.4, 0], "DAK · ACCU'S · AIRCO", [-60, -30]],
    [G.binnen, [0, 0, -3.4], "STOELEN · STANGEN", [-60, -40]],
    [G.chauffeur, [2.6, 0.4, -0.6], "CHAUFFEUR", [60, -30]],
    [G.spiegels, [1.4, 0.5, 0], null],
    [G.deuren[0].g, [0, 0, 1.6], null], [G.deuren[1].g, [0, 0, 1.6], "DEUREN", [40, 40]], [G.deuren[2].g, [0, 0, 1.6], null],
    [G.wielVR, [0, 0, 2.6], "WIELEN", [50, 30]], [G.wielAR, [0, 0, 2.6], null], [G.wielVL, [0, 0, -2.2], null], [G.wielAL, [0, 0, -2.2], null],
  ]),
};
}
