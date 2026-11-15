// Wat zie je vanavond? Uitgerekend in je browser voor jouw plek (of het midden van Nederland).
// De sterrenkaart is een donker paneel binnen het lichte thema. Met een tijdschuif van zonsondergang tot de ochtend.
import { vanavond, avond, maanfase, klok, dag, richting, positie, opOnder, middernachtNa } from "./hemel.js";
import * as KAART from "./kaart.js";
import * as PLEK from "./plek.js";
import { maanSvg, esc, naar, GROOT_KNOP } from "./app.js";

const BEELDEN = [["UMa", "de Grote Beer", "Zeven sterren in de vorm van een steelpan. Altijd te zien in Nederland."], ["Cas", "Cassiopeia", "Vijf sterren in de vorm van een W (of een M). Altijd te zien in Nederland."],
  ["Ori", "Orion", "Drie sterren op een rij: de gordel van de jager. In de winter."], ["Cyg", "de Zwaan", "Een groot kruis. In de zomer en de herfst."], ["Leo", "de Leeuw", "Een achterstevoren vraagteken. In de lente."],
  ["Lyr", "de Lier", "Klein, met de heldere ster Wega."], ["Tau", "de Stier", "Met de rode ster Aldebaran en het sterrenhoopje de Zevengesternte."], ["CMa", "de Grote Hond", "Met Sirius, de helderste ster."]];

export function vanavondPagina(app, D) {
  let datum = new Date();
  app.innerHTML = `<section class="breed vanavond">
    <p class="etiket" data-datum></p>
    <h1 class="index-kop">Wat zie je <span class="accent">vanavond</span>?</h1>
    <p class="held-sub">Uitgerekend in je eigen browser: welke planeten, de maan en sterren je vanavond kunt zien, en waar je moet kijken. Of het bewolkt is, weet de site niet. Kijk dus even naar buiten.</p>
    <div data-plek></div>
    <div class="vv-twee">
      <div class="vv-kaart">
        <div class="kaart-vak"><canvas class="sterrenkaart groot" aria-label="Sterrenkaart van vanavond"></canvas>${GROOT_KNOP("/hemelkaart")}</div>
        <label class="vv-tijd"><span>Tijd: <b data-tijd></b></span><input type="range" min="0" max="48" step="1" value="0" aria-label="Kies een tijd vanavond of vannacht"></label>
        <p class="noot zacht">Zo staat de hemel boven je als je op je rug ligt, met je hoofd naar het noorden. De rand is de horizon; in het midden is het recht boven je. Tik op een planeet voor meer. <span class="label">simulatie</span></p>
      </div>
      <div class="vv-lijst" data-lijst></div>
    </div>
    <div class="vv-blokken">
      <div class="vv-blok" data-maan></div>
      <div class="vv-blok" data-beelden></div>
      <div class="vv-blok" data-wolken></div>
    </div>
  </section>`;
  PLEK.kiezer(app.querySelector("[data-plek]"));
  const doek = app.querySelector(".sterrenkaart"), schuif = app.querySelector(".vv-tijd input");
  let av = null;
  const tijdVan = () => new Date(+av.schemering + schuif.value * 15 * 60e3);

  function lijst() {
    const p = PLEK.huidig();
    av = avond(datum, p);
    const v = vanavond(D, p, datum, { tot: "ochtend" });
    app.querySelector("[data-datum]").textContent = `${dag(datum)}, ${p.standaard ? "het midden van Nederland" : p.naam}`;
    schuif.max = Math.max(4, Math.round((av.ochtend - av.schemering) / (15 * 60e3)));
    const nu = new Date();
    if (nu > av.schemering && nu < av.ochtend) schuif.value = Math.round((nu - av.schemering) / (15 * 60e3));
    const oog = v.lijst.filter((x) => x.blootOog), kijker = v.lijst.filter((x) => !x.blootOog && x.mag != null && x.mag < 9);
    const rij = (x) => `<li><a href="/hemel/${x.item.slug}?tab=nu" data-link>
      <strong>${esc(x.item.titel)}</strong>
      <span>${klok(x.van)} tot ${klok(x.tot)}. Het hoogst om ${klok(x.tijd)}: ${Math.round(x.hoogte)}° hoog in het ${richting(x.az)}.</span>
      ${x.mag != null ? `<span class="zacht">Helderheid ${x.mag.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}${x.mag < 0 ? ", heel helder" : ""}</span>` : ""}</a></li>`;
    app.querySelector("[data-lijst]").innerHTML = `
      <p class="vv-zon">Zon onder om <b>${klok(av.zonOnder)}</b>. Schemering voorbij om ${klok(av.schemering)}, echt donker om ${klok(av.donker)}. Zon op om ${klok(av.zonOp)}.</p>
      <h2>Met het blote oog</h2>
      ${oog.length ? `<ul class="vv-items">${oog.map(rij).join("")}</ul>` : `<p>Vannacht staat er niets uit onze lijst hoog genoeg. Sterren zie je wel: kijk naar de sterrenbeelden hieronder.</p>`}
      ${kijker.length ? `<h2>Met een verrekijker of telescoop</h2><ul class="vv-items">${kijker.map(rij).join("")}</ul>` : ""}
      <p class="noot zacht">Telt mee als het minstens 8° boven de horizon staat (ongeveer een vuist met gestrekte arm) tussen het eind van de schemering en de ochtend. Bomen en huizen staan vaak hoger.</p>`;
    // de maan
    const f = maanfase(nu), m = D.perSlug.maan, oo = opOnder(m, nu, p, D);
    app.querySelector("[data-maan]").innerHTML = `<h2>De maan</h2><div class="vv-maan">${maanSvg(f.hoek, 96)}<div><p class="vv-groot">${Math.round(f.verlicht * 100)}% verlicht</p><p>${esc(f.naam[0].toUpperCase() + f.naam.slice(1))}. ${oo?.op ? `Komt op ${dag(oo.op)} om ${klok(oo.op)}.` : ""} ${oo?.onder ? `Gaat onder ${dag(oo.onder)} om ${klok(oo.onder)}.` : ""}</p></div></div>
      <ul class="vv-fasen">${f.kwartieren.map((k) => `<li><b>${esc(k.naam)}</b> ${new Date(k.datum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" })}</li>`).join("")}</ul>`;
    kaart();
  }

  function kaart() {
    const p = PLEK.huidig(), t = tijdVan();
    app.querySelector("[data-tijd]").textContent = `${klok(t)}${t >= middernachtNa(av.schemering) ? " (na middernacht)" : ""}`;
    KAART.teken(doek, D, p, t, { beeldNamen: true, sterNamen: true, uitgelicht: BEELDEN.map((b) => b[0]) });
    app.querySelector(".kaart-groot").href = `/hemelkaart?tijd=${+t}`;
    // sterrenbeelden om te zoeken: welke staan er nu hoog genoeg?
    KAART.laadSterren().then(({ beelden }) => {
      const nu = BEELDEN.map(([afk, naam, uitleg]) => {
        const pts = beelden[afk].lijnen.flat();
        const hoog = pts.map(([ra, dec]) => positie({ baan: { ster: { ra, dec, parallax_mas: 1 } }, cijfers: [] }, t, p, D));
        const gem = hoog.reduce((s, x) => s + x.hoogte, 0) / hoog.length;
        const az = Math.atan2(hoog.reduce((s, x) => s + Math.sin(x.az * Math.PI / 180), 0), hoog.reduce((s, x) => s + Math.cos(x.az * Math.PI / 180), 0)) * 180 / Math.PI;
        return { naam, uitleg, gem, az };
      }).filter((b) => b.gem > 15);
      const vak = app.querySelector("[data-beelden]");
      if (vak) vak.innerHTML = `<h2>Sterrenbeelden om ${klok(t)}</h2>${nu.length ? `<ul class="vv-beelden">${nu.map((b) => `<li><strong>${esc(b.naam[0].toUpperCase() + b.naam.slice(1))}</strong>, in het ${richting(b.az)}. <span class="zacht">${esc(b.uitleg)}</span></li>`).join("")}</ul>` : "<p>Geen van de bekende sterrenbeelden staat nu hoog genoeg.</p>"}
        <p class="noot zacht">Op de kaart in paars. Lijnen en sterren: d3-celestial (Olaf Frohn), namen: Wikidata.</p>`;
    });
  }

  function wolken() {
    const vak = app.querySelector("[data-wolken]");
    vak.innerHTML = `<h2>Bewolking</h2><p>De site weet niet of het bij jou bewolkt is. Een weersverwachting kan helpen, maar die zit er vaak naast: in een test gaf dezelfde dienst voor hetzelfde uur twee keer kort na elkaar heel andere waarden.</p>
      <p><button class="knop-pil" type="button" data-wolken-knop>Vraag de weersverwachting op</button></p>
      <p class="noot zacht">Dan stuurt je browser je plek, afgerond op ongeveer 10 kilometer, naar Open-Meteo. Pas als je op de knop tikt.</p>`;
    vak.querySelector("[data-wolken-knop]").addEventListener("click", async (e) => {
      e.target.disabled = true;
      const p = PLEK.huidig();
      try {
        const u = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({ latitude: p.lat.toFixed(1), longitude: p.lon.toFixed(1), hourly: "cloud_cover", forecast_days: "2", timezone: "Europe/Amsterdam" })}`;
        const r = await fetch(u, { referrerPolicy: "no-referrer" });
        if (!r.ok) throw new Error(r.status);
        const j = await r.json();
        const uren = j.hourly.time.map((t, i) => ({ t: new Date(t + ":00"), w: j.hourly.cloud_cover[i] }))
          .filter((x) => x.t >= new Date(+av.zonOnder - 3600e3) && x.t <= av.ochtend);
        vak.querySelector("p:nth-of-type(2)").outerHTML = `<ul class="vv-wolken">${uren.map((x) => `<li><span>${klok(x.t)}</span><i style="--w:${x.w}%"></i><span>${x.w}%</span></li>`).join("")}</ul>
          <p class="noot zacht">Verwachte bewolking per uur. Weather data by <a href="https://open-meteo.com/" rel="noopener">Open-Meteo.com</a> (CC BY 4.0). Een verwachting, geen meting.</p>`;
      } catch { e.target.disabled = false; vak.querySelector(".noot").textContent = "De weersverwachting is nu niet op te halen. Probeer het later opnieuw."; }
    });
  }

  schuif.addEventListener("input", kaart);
  doek.addEventListener("click", (e) => { const s = KAART.welke(doek, e); if (s) naar(`/hemel/${s}?tab=nu`); });
  lijst(); wolken();
  const weg = PLEK.opVerandering(() => { if (doek.isConnected) { lijst(); wolken(); } });
  return () => weg();
}
