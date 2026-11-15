// Gedeelde bouwstenen voor de browser: gegevens laden, de API en het menu.
import { oordeel } from "./score.js";

const html = document.documentElement;
export const BASIS = html.dataset.basis ?? "";
export const VOORBEELD = html.dataset.voorbeeld === "ja";

async function haal(pad) {
  const antwoord = await fetch(pad, { cache: "no-cache" });
  if (!antwoord.ok) throw new Error(`${pad}: ${antwoord.status}`);
  return antwoord.json();
}

// Eén aanroep naar de API. Geeft { ok, status, data } terug en gooit nooit,
// zodat een pagina ook zonder achterkant blijft werken.
export async function api(pad, body) {
  try {
    const antwoord = await fetch(`/api${pad}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      // Wie is ingelogd wil zijn eigen wijziging meteen zien; bezoekers mogen de korte cache gebruiken.
      cache: ooitIngelogd() ? "no-store" : "default",
    });
    const tekst = await antwoord.text();
    let data = null;
    try {
      data = JSON.parse(tekst);
    } catch {
      /* geen JSON: de achterkant is er niet */
    }
    return { ok: antwoord.ok && data !== null, status: antwoord.status, data };
  } catch (fout) {
    return { ok: false, status: 0, data: null, fout };
  }
}

let geladen;

// Laadt de selectie, de jury en de beoordelingen, en hangt aan elke
// oplossing haar oordeel. De vaste bestanden zijn de basis; wat de
// achterkant weet (nieuwe juryleden, cijfers, gepubliceerde inzendingen,
// verborgen vermeldingen) komt eroverheen.
export function laadData() {
  geladen ??= (async () => {
    const [oplossingen, jury, beoordelingen, staat] = await Promise.all([
      haal(`${BASIS}/data/oplossingen.json`),
      haal(`${BASIS}/data/jury.json`),
      haal(`${BASIS}/data/beoordelingen.json`),
      VOORBEELD ? null : api("/staat"),
    ]);
    let belangen = [];
    if (staat?.ok) {
      const s = staat.data;
      const bekend = new Set(oplossingen.map((o) => o.id));
      for (const o of s.oplossingen ?? []) if (!bekend.has(o.id)) oplossingen.push({ ...o, los: true });
      const juryIds = new Set(jury.map((j) => j.id));
      for (const j of s.jury ?? []) if (!juryIds.has(j.id)) jury.push(j);
      beoordelingen.push(...(s.beoordelingen ?? []));
      belangen = s.belangen ?? [];
      const verborgen = new Set(s.verborgen ?? []);
      for (let i = oplossingen.length - 1; i >= 0; i--) if (verborgen.has(oplossingen[i].id)) oplossingen.splice(i, 1);
    }
    const perOplossing = new Map();
    for (const b of beoordelingen) {
      if (!perOplossing.has(b.oplossing)) perOplossing.set(b.oplossing, []);
      perOplossing.get(b.oplossing).push(b);
    }
    for (const o of oplossingen) {
      o.oordeel = oordeel(perOplossing.get(o.id));
      // De datum van de uitslag: de laatste beoordeling die meetelt.
      o.uitslag = o.oordeel.compleet ? o.oordeel.stemmen.map((s) => String(s.datum ?? "")).sort().pop() : null;
    }
    return { oplossingen, jury, beoordelingen, belangen, live: Boolean(staat?.ok) };
  })();
  return geladen;
}

export function toonFout(doel, fout) {
  console.error(fout);
  if (doel) doel.innerHTML = `<p class="melding">De gegevens konden niet worden geladen. Ververs de pagina om het opnieuw te proberen.</p>`;
}

// Weeknummer volgens ISO 8601, voor de wekelijkse uitgelichte oplossing.
export function weeknummer(datum = new Date()) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const dag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dag);
  const begin = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { jaar: d.getUTCFullYear(), week: Math.ceil(((d - begin) / 86400000 + 1) / 7) };
}

// Laat blokken rustig binnenkomen als ze in beeld schuiven.
export function onthul(wortel = document) {
  const doelen = wortel.querySelectorAll("[data-onthul]:not(.zichtbaar)");
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const d of doelen) d.classList.add("zichtbaar");
    return;
  }
  const kijker = new IntersectionObserver(
    (items) => {
      for (const item of items) {
        if (item.isIntersecting) {
          item.target.classList.add("zichtbaar");
          kijker.unobserve(item.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  for (const d of doelen) kijker.observe(d);
}

// Het menu: mobiel openen en sluiten, en de inlogstatus in de kop.
export function menu() {
  const knop = document.querySelector(".menuknop");
  const nav = document.querySelector(".kop-nav");
  const sluit = () => {
    nav.classList.remove("open");
    knop.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };
  knop?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    knop.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && sluit());

  const kop = document.querySelector(".kop");
  const bijScroll = () => kop?.classList.toggle("gescrold", scrollY > 8);
  addEventListener("scroll", bijScroll, { passive: true });
  bijScroll();

  onthul();
  if (VOORBEELD || !ooitIngelogd()) return;
  api("/ik").then((r) => {
    if (r.status === 401) onthoudLogin(false);
    const link = document.querySelector("[data-account]");
    if (r.ok && link) link.textContent = r.data.rol === "beheer" ? "Beheer" : "Mijn jurywerk";
    if (r.ok && link && r.data.rol === "beheer") link.href = "/beheer/";
  });
}

// Een bezoeker die nooit inlogde hoeven we niet naar een sessie te vragen.
export function ooitIngelogd() {
  try {
    return localStorage.getItem("mp-ingelogd") === "ja";
  } catch {
    return false;
  }
}
export function onthoudLogin(aan) {
  try {
    if (aan) localStorage.setItem("mp-ingelogd", "ja");
    else localStorage.removeItem("mp-ingelogd");
  } catch {
    /* geen opslag */
  }
}

// Verstuurt een formulier als JSON naar de API en meldt eerlijk of het lukte.
export function formulier(form, pad, { naGelukt, verzamel } = {}) {
  if (!form) return;
  const status = form.querySelector(".formstatus");
  const knop = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", async (gebeurtenis) => {
    gebeurtenis.preventDefault();
    if (!form.reportValidity()) return;
    knop.disabled = true;
    status.className = "formstatus";
    status.textContent = "Bezig met versturen.";
    const gegevens = verzamel ? verzamel() : leesFormulier(form);
    const r = await api(pad, gegevens);
    knop.disabled = false;
    if (r.ok) {
      status.className = "formstatus gelukt";
      status.textContent = form.dataset.gelukt ?? "Verstuurd. Dank je wel.";
      form.reset();
      naGelukt?.(r.data);
    } else {
      status.className = "formstatus mislukt";
      status.textContent = r.data?.fout ?? "Het versturen is niet gelukt. Er is niets opgeslagen; probeer het later opnieuw.";
    }
  });
}

export function leesFormulier(form) {
  const uit = {};
  for (const veld of form.elements) {
    if (!veld.name) continue;
    if (veld.type === "checkbox") uit[veld.name] = veld.checked;
    else if (veld.type === "radio") {
      if (veld.checked) uit[veld.name] = veld.value;
    } else uit[veld.name] = veld.value;
  }
  return uit;
}
