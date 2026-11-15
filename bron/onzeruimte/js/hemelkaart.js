// De hemel boven je, op het hele scherm. Opzet overgenomen van de kaartpagina van Voggels (donker vlak onder de kop,
// knoppen erboven, een paneel met een tijdschuif en een kaartje als je ergens op tikt).
// Twee weergaven: "Om je heen" (je staat buiten en kijkt rond, hemel3d.js) en "Kaart" (de ronde sterrenkaart, kaart.js).
import { positie, opOnder, klok, dag, richting, richtingKort } from "./hemel.js";
import * as KAART from "./kaart.js";
import { Hemel3D } from "./hemel3d.js";
import * as PLEK from "./plek.js";
import { esc } from "./app.js";

const STAP = 5, DUUR = 24 * 60; // minuten
const KIJK = [[180, "het zuiden"], [270, "het westen"], [0, "het noorden"], [90, "het oosten"]];
const MAX_ZOOM = 8, FOV_MIN = 20, FOV_MAX = 150;
const rad = Math.PI / 180;
const stil = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const bewaar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const lees = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const hoekVerschil = (a, b) => ((b - a + 540) % 360) - 180;

export function hemelkaartPagina(app, D, { markeer = null, tijd = null } = {}) {
  const doel = markeer && D.perSlug[markeer] ? D.perSlug[markeer] : null;
  let start = new Date();
  let modus = lees("ruimte-weergave") === "plat" ? "plat" : "3d";
  const kanRichten = "DeviceOrientationEvent" in window && matchMedia("(pointer: coarse)").matches;
  app.innerHTML = `
  <section class="sim hk" aria-label="De hemel boven je">
    <canvas class="hk-doek" tabindex="0" aria-label="De hemel. Sleep om rond te kijken, gebruik plus en min om te zoomen, tik op een planeet of ster."></canvas>
    <div class="hk-intro" aria-hidden="true"><span class="hk-intro-etiket">Uitgerekend in je browser</span><span class="hk-intro-kop">De hemel boven <em data-intro-plek></em></span></div>
    <div class="sim-ui sim-boven">
      <div class="sim-bron" role="group" aria-label="Weergave"><button type="button" data-modus="3d" aria-pressed="${modus === "3d"}">Om je heen</button><button type="button" data-modus="plat" aria-pressed="${modus === "plat"}">Kaart</button></div>
      <button class="sim-chip sim-info-knop" type="button" aria-expanded="false" aria-controls="hk-info"><span class="sim-stip"></span>Simulatie</button>
      <button class="sim-chip hk-plek-knop" type="button" aria-expanded="false" aria-controls="hk-plek"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span data-plek-naam></span></button>
      ${doel ? `<a class="sim-chip sim-van" href="/hemel/${doel.slug}?tab=nu" data-link>← ${esc(doel.titel)}</a>` : ""}
    </div>
    <div class="sim-ui sim-info" id="hk-info" hidden>
      <p><strong>Uitgerekend, geen foto.</strong> Je browser rekent uit waar de sterren, de maan en de planeten staan, voor je plek en de tijd die je kiest. Of het bewolkt is, weet de site niet.</p>
      <p><strong>Om je heen</strong>: je staat buiten en kijkt rond. Sleep om te draaien, knijp om te zoomen${kanRichten ? ", of tik op het telefoontje en houd je telefoon omhoog naar de hemel" : ""}. De rand met bomen, huizen, een kerk en een molen is getekend: bij jou staat er iets anders. De maan, de zon en de planeten zijn groter getekend dan je ze ziet. De kleur van de lucht is een benadering.</p>
      <p><strong>Kaart</strong>: de hele hemel op een rondje, zoals je hem ziet als je op je rug ligt met je hoofd naar het noorden. Het midden is recht boven je, de rand is de horizon.</p>
      <p>Sterren, lijnen en de Melkweg: d3-celestial (Olaf Frohn). De lijnen zijn een afspraak; andere culturen tekenen andere figuren. De namen van losse sterren zijn de internationale, Engelse namen.</p>
      <p><a href="/hoe-dit-werkt">Meer in Hoe dit werkt</a></p>
    </div>
    <div class="sim-ui sim-info hk-plek" id="hk-plek" hidden><div data-plek></div></div>
    <p class="sim-ui sim-hint" aria-hidden="true">Sleep om rond te kijken · knijp om te zoomen · tik op een planeet</p>
    <div class="sim-ui sim-knoppen">
      <button class="knop-icoon" type="button" data-zoom="1.6" aria-label="Inzoomen">+</button>
      <button class="knop-icoon" type="button" data-zoom="0.625" aria-label="Uitzoomen">−</button>
      <button class="knop-icoon hk-draai" type="button" data-draai><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 5.5l2.2 6.5h-4.4z" fill="currentColor"/><path d="M12 18.5l-2.2-6.5h4.4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg><b data-kijk-letter>Z</b></button>
      ${kanRichten ? `<button class="knop-icoon hk-richt" type="button" data-richt aria-pressed="false" aria-label="Kijk rond door je telefoon te bewegen"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 18h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>` : ""}
    </div>
    <div class="sim-ui sim-paneel">
      <div class="sim-kaartje" hidden></div>
      <div class="sim-tijd">
        <button class="knop-speel" type="button" aria-label="Laat de hemel draaien" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="ico-speel" d="M8 5l11 7-11 7z"/><path class="ico-pauze" d="M8 5v14M16 5v14"/></svg></button>
        <div class="sim-maand">
          <span class="sim-maandnaam"><span data-klok></span> <small data-dag></small></span>
          <input type="range" min="0" max="${DUUR}" step="${STAP}" value="0" aria-label="Tijd, tot een dag vooruit">
        </div>
        <button class="hk-nu" type="button" data-nu hidden>Nu</button>
      </div>
      <p class="sim-noot" data-noot></p>
      <div class="sim-groepen" role="group" aria-label="Wat staat er op de hemel">
        <button type="button" class="sim-groep" data-laag="lijnen" aria-pressed="true"><i></i>Lijnen</button>
        <button type="button" class="sim-groep" data-laag="beeldNamen" aria-pressed="true"><i></i>Sterrenbeelden</button>
        <button type="button" class="sim-groep" data-laag="sterNamen" aria-pressed="true"><i></i>Namen van sterren</button>
        <button type="button" class="sim-groep" data-laag="melkweg" data-alleen3d aria-pressed="true"><i></i>Melkweg</button>
        <button type="button" class="sim-groep" data-laag="rand" data-alleen3d aria-pressed="true"><i></i>Bomen en huizen</button>
      </div>
    </div>
  </section>`;

  const wrap = app.querySelector(".hk"), doek = wrap.querySelector(".hk-doek");
  const schuif = wrap.querySelector('input[type="range"]'), speelKnop = wrap.querySelector(".knop-speel");
  const kaartje = wrap.querySelector(".sim-kaartje"), paneel = wrap.querySelector(".sim-paneel"), boven = wrap.querySelector(".sim-boven");
  const lagen = { lijnen: true, beeldNamen: true, sterNamen: true, melkweg: true, rand: true };
  const zicht = { z: 1, x: 0, y: 0, kijk: 180 }; // de platte kaart
  const h3d = new Hemel3D(doek, D);
  const cam = h3d.cam; // om je heen: yaw (richting), pitch (hoogte), fov (beeldhoek)
  let kijkStand = 0, gekozen = doel?.slug || null, onder = 0, links = 0, klaar = false;
  setTimeout(() => wrap.querySelector(".sim-hint")?.classList.add("weg"), 5000);

  if (tijd) schuif.value = String(Math.max(0, Math.min(DUUR, Math.round((tijd - start) / 60e3 / STAP) * STAP)));
  const tijdNu = () => new Date(+start + schuif.value * 60e3);

  // ---------- tekenen ----------
  let wacht = false;
  const vraag = () => { if (modus === "3d" || wacht) return; wacht = true; requestAnimationFrame(() => { wacht = false; tekenNu(); }); };
  let laatsteTekst = "";
  function tekenNu(nu = performance.now()) {
    if (!doek.isConnected || !klaar) return;
    const p = PLEK.huidig(), t = tijdNu();
    if (modus === "3d") h3d.teken({ plek: p, t, lagen, markeer: gekozen, tijd: nu, beweging: !stil() });
    else {
      const breed = wrap.clientWidth >= 900;
      if (kaartje.hidden) onder = breed ? 16 : paneel.offsetHeight;
      links = breed && wrap.clientWidth - paneel.offsetWidth - 32 > wrap.clientHeight * 0.9 ? paneel.offsetLeft + paneel.offsetWidth : 0;
      const rand = { boven: boven.offsetTop + boven.offsetHeight + 4, onder, links };
      KAART.teken(doek, D, p, t, { groot: true, markeer: gekozen, uitgelicht: [], lijnen: lagen.lijnen, beeldNamen: lagen.beeldNamen, sterNamen: lagen.sterNamen, zicht, rand });
    }
    // tekst alleen bijwerken als er iets veranderd is (in 3D tekenen we elk beeldje)
    const sleutel = `${klok(t)}|${schuif.value}|${p.naam}|${kaartje.hidden}|${gekozen}|${modus === "3d" ? richtingKort(cam.yaw) : zicht.kijk}`;
    if (sleutel === laatsteTekst) return;
    laatsteTekst = sleutel;
    const n = +schuif.value;
    wrap.querySelector("[data-klok]").textContent = klok(t);
    wrap.querySelector("[data-dag]").textContent = n === 0 ? "nu" : dag(t) === dag(start) ? "vandaag" : "morgen";
    wrap.querySelector("[data-nu]").hidden = n === 0;
    wrap.querySelector("[data-plek-naam]").textContent = p.standaard ? "Midden van Nederland" : p.naam;
    const zon = doek.zonHoogte;
    const zin = zon > 0 ? "De zon is op: de sterren zie je nu niet, de lucht is te licht." : zon > -6 ? "Schemering: alleen de helderste sterren en planeten zie je al." : zon > -12 ? "Het wordt donker: steeds meer sterren." : "Donker genoeg voor de sterren.";
    const dp = doel && kaartje.hidden && positie(doel, t, p, D);
    const doelZin = dp ? `${doel.titel}: ${KAART.waarZin(dp).charAt(0).toLowerCase()}${KAART.waarZin(dp).slice(1)}. ` : "";
    const kijkZin = modus === "3d" ? `Je kijkt naar het ${richting(cam.yaw)}. ` : "";
    wrap.querySelector("[data-noot]").textContent = `${doelZin}${kijkZin}${zin} Uitgerekend voor ${p.standaard ? "het midden van Nederland" : p.naam}.`;
    if (modus === "3d") zetDraaiLabel();
    if (!kaartje.hidden && gekozen) vulKaartje(gekozen);
  }

  // ---------- het kaartje van een hemellichaam, voor de gekozen tijd ----------
  function vulKaartje(slug) {
    const h = D.perSlug[slug]; if (!h) return;
    const p = PLEK.huidig(), t = tijdNu(), pos = positie(h, t, p, D);
    const oo = opOnder(h, t, p, D);
    const f = D.fotos[h.foto];
    const regels = [];
    if (pos) regels.push(esc(KAART.waarZin(pos)) + ".");
    if (oo?.op && oo.op > t) regels.push(`Komt op om ${klok(oo.op)}${dag(oo.op) !== dag(t) ? ` (${dag(oo.op).split(" ")[0]})` : ""}.`);
    else if (oo?.onder) regels.push(`Gaat onder om ${klok(oo.onder)}${dag(oo.onder) !== dag(t) ? ` (${dag(oo.onder).split(" ")[0]})` : ""}.`);
    if (slug === "zon") regels.push("Kijk nooit recht in de zon.");
    else if (pos?.hoogte > 0 && doek.zonHoogte > -3 && slug !== "maan") regels.push("Het is nog te licht om te zien.");
    kaartje.innerHTML = `
      <div class="sim-kaartje-beeld">${f ? `<img src="${f.pad}" alt="" width="96" height="96">` : `<span>${esc(h.titel.charAt(0))}</span>`}</div>
      <div class="sim-kaartje-tekst">
        <a class="sim-kaartje-naam" href="/hemel/${h.slug}?tab=nu" data-link>${esc(h.titel)}</a>
        <p>${regels.join(" ")}</p>
        <div class="sim-kaartje-acties"><a class="knop-pil knop-donker" href="/hemel/${h.slug}" data-link>Meer over ${esc(h.titel)}</a></div>
      </div>
      <button class="sim-kaartje-sluit" type="button" aria-label="Sluiten">×</button>`;
    kaartje.querySelector(".sim-kaartje-sluit").addEventListener("click", () => { kaartje.hidden = true; gekozen = null; laatsteTekst = ""; vraag(); });
  }
  function kies(slug) {
    gekozen = slug; laatsteTekst = "";
    if (!slug) { kaartje.hidden = true; vraag(); return; }
    vulKaartje(slug); kaartje.hidden = false; vraag();
  }

  // ---------- de lus voor "om je heen": vaart na het slepen, de opening, je telefoon ----------
  let lus = 0, vaart = { yaw: 0, pitch: 0 }, opening = null, draaiDoel = null, richt = null;
  const zetPitch = (v) => { cam.pitch = Math.max(-8, Math.min(90, v)); };
  let laatsteBeeld = 0, laatsteCam = "";
  function stap(nu) {
    lus = 0;
    if (modus !== "3d" || !doek.isConnected) return;
    // in rust (alleen twinkelen en de molen) hooguit dertig beeldjes per seconde, voor de batterij
    const camNu = `${cam.yaw.toFixed(2)}|${cam.pitch.toFixed(2)}|${cam.fov.toFixed(2)}|${schuif.value}`;
    const rustig = camNu === laatsteCam && !wijzers.size && !opening && draaiDoel == null && !richt && !speelAnim && Math.abs(vaart.yaw) + Math.abs(vaart.pitch) < 0.02;
    laatsteCam = camNu;
    if (rustig && nu - laatsteBeeld < 32) { lus = requestAnimationFrame(stap); return; }
    laatsteBeeld = nu;
    if (!document.hidden) {
      if (opening) {
        const k = Math.max(0, Math.min(1, (nu - opening.t0) / opening.duur)), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        cam.yaw = opening.van.yaw + hoekVerschil(opening.van.yaw, opening.naar.yaw) * e;
        cam.pitch = opening.van.pitch + (opening.naar.pitch - opening.van.pitch) * e;
        cam.fov = opening.van.fov + (opening.naar.fov - opening.van.fov) * e;
        if (k >= 1) opening = null;
      } else if (richt?.doel) {
        cam.yaw += hoekVerschil(cam.yaw, richt.doel.yaw) * 0.25; zetPitch(cam.pitch + (richt.doel.pitch - cam.pitch) * 0.25);
      } else if (draaiDoel != null) {
        const d = hoekVerschil(cam.yaw, draaiDoel);
        cam.yaw += d * 0.14;
        if (Math.abs(d) < 0.2) { cam.yaw = draaiDoel; draaiDoel = null; }
      } else if (!wijzers.size && (Math.abs(vaart.yaw) > 0.01 || Math.abs(vaart.pitch) > 0.01)) {
        cam.yaw += vaart.yaw; zetPitch(cam.pitch + vaart.pitch);
        vaart.yaw *= 0.92; vaart.pitch *= 0.92;
      }
      cam.yaw = ((cam.yaw % 360) + 360) % 360;
      tekenNu(nu);
    }
    lus = requestAnimationFrame(stap);
  }
  const startLus = () => { if (!lus && modus === "3d") lus = requestAnimationFrame(stap); };

  // ---------- slepen, knijpen, scrollen, tikken ----------
  const grens = () => {
    const R0 = doek.straal || 200, m = R0 * (zicht.z - 1) + 24;
    zicht.x = Math.max(-m, Math.min(m, zicht.x)); zicht.y = Math.max(-m, Math.min(m, zicht.y));
  };
  const mMidden = () => links + (doek.clientWidth - links) / 2;
  const rMidden = () => { const b = boven.offsetTop + boven.offsetHeight + 4; return b + (doek.clientHeight - b - onder) / 2; };
  const stopAnimaties = () => { opening = null; draaiDoel = null; wrap.classList.add("hk-begonnen"); };
  function zoomRond(px, py, f) {
    stopAnimaties();
    if (modus === "3d") { cam.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, cam.fov / f)); return; }
    const z = Math.max(1, Math.min(MAX_ZOOM, zicht.z * f)); f = z / zicht.z;
    const mx = mMidden(), my = rMidden();
    zicht.x = px - mx - (px - mx - zicht.x) * f; zicht.y = py - my - (py - my - zicht.y) * f;
    zicht.z = z;
    if (z === 1) { zicht.x = 0; zicht.y = 0; }
    grens(); vraag();
  }
  function sleep(dx, dy) {
    if (modus === "3d") {
      if (richt?.aan) return;
      const graad = cam.fov / Math.min(doek.clientWidth, doek.clientHeight);
      const dy2 = -dx * graad, dp = dy * graad;
      cam.yaw += dy2; zetPitch(cam.pitch + dp);
      vaart = { yaw: dy2 * 0.9, pitch: dp * 0.9 };
    } else { zicht.x += dx; zicht.y += dy; grens(); vraag(); }
  }

  const wijzers = new Map();
  let begin = null, knijp = null;
  doek.addEventListener("pointerdown", (e) => {
    doek.setPointerCapture(e.pointerId);
    wijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    vaart = { yaw: 0, pitch: 0 };
    if (wijzers.size === 1) begin = { x: e.clientX, y: e.clientY, bewogen: false };
    else { if (begin) begin.bewogen = true; knijp = null; }
  });
  doek.addEventListener("pointermove", (e) => {
    const oud = wijzers.get(e.pointerId); if (!oud) return;
    const nieuw = { x: e.clientX, y: e.clientY };
    wijzers.set(e.pointerId, nieuw);
    if (wijzers.size === 1) {
      if (begin && Math.hypot(nieuw.x - begin.x, nieuw.y - begin.y) > 6) { if (!begin.bewogen) stopAnimaties(); begin.bewogen = true; }
      if (begin?.bewogen) sleep(nieuw.x - oud.x, nieuw.y - oud.y);
    } else if (wijzers.size === 2) {
      const [a, b] = [...wijzers.values()], r = doek.getBoundingClientRect();
      const af = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
      if (knijp) { if (modus === "plat") { zicht.x += mid.x - knijp.mid.x; zicht.y += mid.y - knijp.mid.y; } zoomRond(mid.x, mid.y, af / knijp.af); }
      knijp = { af, mid };
    }
  });
  const los = (e) => {
    if (!wijzers.has(e.pointerId)) return;
    wijzers.delete(e.pointerId);
    if (wijzers.size < 2) knijp = null;
    if (wijzers.size === 0 && begin && !begin.bewogen && e.type === "pointerup") kies(KAART.welke(doek, e));
    if (wijzers.size === 0) begin = null;
  };
  doek.addEventListener("pointerup", los);
  doek.addEventListener("pointercancel", los);
  doek.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = doek.getBoundingClientRect();
    zoomRond(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  doek.addEventListener("keydown", (e) => {
    const stapPx = 40, pijl = { ArrowLeft: [stapPx, 0], ArrowRight: [-stapPx, 0], ArrowUp: [0, stapPx], ArrowDown: [0, -stapPx] }[e.key];
    if (pijl) { e.preventDefault(); stopAnimaties(); sleep(pijl[0], pijl[1]); vaart = { yaw: 0, pitch: 0 }; }
    else if (e.key === "+" || e.key === "=") zoomRond(mMidden(), rMidden(), 1.6);
    else if (e.key === "-") zoomRond(mMidden(), rMidden(), 0.625);
    else if (e.key === "Escape") kies(null);
  });
  wrap.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => zoomRond(mMidden(), rMidden(), +b.dataset.zoom)));

  // ---------- draaien: naar de volgende windrichting ----------
  const draaiKnop = wrap.querySelector("[data-draai]");
  function zetDraaiLabel() {
    const naam = modus === "3d" ? `het ${richting(cam.yaw)}` : KIJK[kijkStand][1];
    draaiKnop.setAttribute("aria-label", `Draai een kwartslag. Nu kijk je naar ${naam}.`);
    draaiKnop.title = `Je kijkt naar ${naam}`;
    draaiKnop.querySelector("[data-kijk-letter]").textContent = modus === "3d" ? richtingKort(cam.yaw) : ["Z", "W", "N", "O"][kijkStand];
  }
  zetDraaiLabel();
  let draaiAnim = 0;
  draaiKnop.addEventListener("click", () => {
    if (modus === "3d") {
      stopAnimaties(); vaart = { yaw: 0, pitch: 0 };
      draaiDoel = (Math.round(cam.yaw / 90) * 90 + 90) % 360;
      return;
    }
    kijkStand = (kijkStand + 1) % 4;
    zetDraaiLabel();
    const van = zicht.kijk, t0 = performance.now(), duur = stil() ? 0 : 450;
    cancelAnimationFrame(draaiAnim);
    const anim = (nu) => {
      const k = duur ? Math.min(1, (nu - t0) / duur) : 1, e = 1 - Math.pow(1 - k, 3);
      // draai de verschuiving mee, zodat je naar hetzelfde stuk hemel blijft kijken
      const a = (van + 90 * e - zicht.kijk) * rad, x = zicht.x, y = zicht.y;
      zicht.x = x * Math.cos(a) - y * Math.sin(a); zicht.y = y * Math.cos(a) + x * Math.sin(a);
      zicht.kijk = van + 90 * e;
      tekenNu();
      if (k < 1) draaiAnim = requestAnimationFrame(anim); else { zicht.kijk = KIJK[kijkStand][0]; laatsteTekst = ""; tekenNu(); }
    };
    draaiAnim = requestAnimationFrame(anim);
  });

  // ---------- je telefoon als venster: kijk rond door hem te bewegen ----------
  const richtKnop = wrap.querySelector("[data-richt]");
  function opRichting(e) {
    let a = e.alpha, b = e.beta, g = e.gamma;
    if (a == null || b == null || g == null) return;
    if (e.webkitCompassHeading != null) a = 360 - e.webkitCompassHeading; // iPhone: kompasrichting
    else if (!e.absolute && e.type !== "deviceorientationabsolute") return;
    const [ca, sa, cb, sb, cg, sg] = [Math.cos(a * rad), Math.sin(a * rad), Math.cos(b * rad), Math.sin(b * rad), Math.cos(g * rad), Math.sin(g * rad)];
    // de achterkant van de telefoon (waar de camera zit), in oost, noord, omhoog
    const x = -(ca * sg + sa * sb * cg), y = -(sa * sg - ca * sb * cg), z = -(cb * cg);
    richt.doel = { yaw: ((Math.atan2(x, y) / rad) + 360) % 360, pitch: Math.asin(Math.max(-1, Math.min(1, z))) / rad };
  }
  const stopRichten = () => {
    if (!richt) return;
    window.removeEventListener(richt.soort, opRichting);
    richt = null; richtKnop?.setAttribute("aria-pressed", "false");
  };
  richtKnop?.addEventListener("click", () => {
    if (richt) return stopRichten();
    const zetAan = () => {
      const soort = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
      richt = { aan: true, soort, doel: null };
      window.addEventListener(soort, opRichting);
      richtKnop.setAttribute("aria-pressed", "true");
      stopAnimaties(); vaart = { yaw: 0, pitch: 0 };
      if (modus !== "3d") zetModus("3d");
    };
    // iPhone vraagt toestemming; dat moet direct in de tik
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then((s) => { if (s === "granted") zetAan(); }).catch(() => {});
    } else zetAan();
  });

  // ---------- de tijd: schuiven, afspelen, terug naar nu ----------
  schuif.addEventListener("input", () => { stopSpelen(); vraag(); });
  wrap.querySelector("[data-nu]").addEventListener("click", () => { stopSpelen(); start = new Date(); schuif.value = "0"; vraag(); });
  let speelAnim = 0, vorige = 0;
  const stopSpelen = () => { cancelAnimationFrame(speelAnim); speelAnim = 0; speelKnop.setAttribute("aria-pressed", "false"); speelKnop.setAttribute("aria-label", "Laat de hemel draaien"); };
  speelKnop.addEventListener("click", () => {
    if (speelAnim) return stopSpelen();
    if (+schuif.value >= DUUR) schuif.value = "0";
    speelKnop.setAttribute("aria-pressed", "true"); speelKnop.setAttribute("aria-label", "Pauzeer");
    vorige = performance.now();
    let minuten = +schuif.value;
    const anim = (nu) => {
      minuten = Math.min(DUUR, minuten + ((nu - vorige) / 1000) * 60); // een uur per seconde
      vorige = nu;
      schuif.value = String(minuten);
      if (modus === "plat") tekenNu();
      if (minuten >= DUUR) return stopSpelen();
      speelAnim = requestAnimationFrame(anim);
    };
    speelAnim = requestAnimationFrame(anim);
  });

  // ---------- lagen en weergave ----------
  wrap.querySelectorAll("[data-laag]").forEach((b) => b.addEventListener("click", () => {
    lagen[b.dataset.laag] = !lagen[b.dataset.laag];
    b.setAttribute("aria-pressed", String(lagen[b.dataset.laag]));
    vraag();
  }));
  function zetModus(m) {
    modus = m; bewaar("ruimte-weergave", m);
    wrap.classList.toggle("hk-3d", m === "3d");
    wrap.querySelectorAll("[data-modus]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modus === m)));
    wrap.querySelectorAll("[data-alleen3d]").forEach((b) => { b.hidden = m !== "3d"; });
    if (m !== "3d") stopRichten();
    laatsteTekst = ""; zetDraaiLabel();
    if (m === "3d") startLus(); else vraag();
  }
  wrap.querySelectorAll("[data-modus]").forEach((b) => b.addEventListener("click", () => { stopAnimaties(); zetModus(b.dataset.modus); }));

  // ---------- uitleg en plek ----------
  const paneelKnop = (knop, vak, ander) => knop.addEventListener("click", () => {
    vak.hidden = !vak.hidden; knop.setAttribute("aria-expanded", String(!vak.hidden));
    if (!vak.hidden) { ander.vak.hidden = true; ander.knop.setAttribute("aria-expanded", "false"); }
  });
  const info = { knop: wrap.querySelector(".sim-info-knop"), vak: wrap.querySelector("#hk-info") };
  const plekVak = { knop: wrap.querySelector(".hk-plek-knop"), vak: wrap.querySelector("#hk-plek") };
  paneelKnop(info.knop, info.vak, plekVak);
  paneelKnop(plekVak.knop, plekVak.vak, info);
  PLEK.kiezer(plekVak.vak.querySelector("[data-plek]"));
  const wegPlek = PLEK.opVerandering(() => { plekVak.vak.hidden = true; plekVak.knop.setAttribute("aria-expanded", "false"); laatsteTekst = ""; vraag(); });

  const ro = new ResizeObserver(vraag); ro.observe(doek);
  // bij "nu" loopt de klok mee
  const klokje = setInterval(() => { if (+schuif.value === 0 && !speelAnim) { start = new Date(); vraag(); } }, 30000);

  // ---------- de opening: van recht omhoog naar de horizon, richting het doel (of het zuiden) ----------
  const p0 = PLEK.huidig();
  wrap.querySelector("[data-intro-plek]").textContent = p0.standaard ? "Nederland" : p0.naam;
  const dp = doel ? positie(doel, tijdNu(), p0, D) : null;
  const naar = dp && dp.hoogte > 2 ? { yaw: dp.az, pitch: Math.max(14, Math.min(60, dp.hoogte - 6)), fov: 80 } : { yaw: dp ? dp.az : 180, pitch: 22, fov: 95 };
  h3d.laad().then(() => {
    klaar = true;
    zetModus(modus);
    if (modus === "3d" && !stil()) {
      Object.assign(cam, { yaw: naar.yaw - 70, pitch: 89, fov: 150 });
      opening = { t0: performance.now() + 300, duur: 3600, van: { ...cam }, naar };
      wrap.classList.add("hk-opening");
      setTimeout(() => wrap.classList.add("hk-begonnen"), 2600);
    } else { Object.assign(cam, naar); wrap.classList.add("hk-begonnen"); }
    tekenNu();
    if (doel && wrap.clientWidth >= 900) setTimeout(() => kies(doel.slug), modus === "3d" && !stil() ? 3600 : 0);
  });

  return () => { stopSpelen(); stopRichten(); cancelAnimationFrame(lus); lus = -1; cancelAnimationFrame(draaiAnim); ro.disconnect(); clearInterval(klokje); wegPlek(); };
}
