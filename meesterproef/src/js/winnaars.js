import { laadData, toonFout, menu, BASIS } from "./kern.js";
import { kaart } from "./weergave.js";
import { stand } from "./score.js";

menu();
const doel = document.querySelector("#winnaars-lijst");

try {
  const { oplossingen } = await laadData();
  const winnaars = oplossingen.filter((o) => ["meesterproef", "eervol"].includes(stand(o))).sort((a, b) => (b.uitslag ?? "").localeCompare(a.uitslag ?? "") || b.oordeel.eindcijfer - a.oordeel.eindcijfer);
  if (!winnaars.length) {
    doel.innerHTML = `<div class="leegstaat">
      <div><p class="meta">Eerste juryronde</p><h2>Er zijn nog geen winnaars.</h2></div>
      <p>De jury wordt nu samengesteld. Een oplossing krijgt pas een eindcijfer als minstens drie juryleden haar hebben beoordeeld. Vanaf een 6,5 volgt een eervolle vermelding, vanaf een 8,0 de Meesterproef.</p>
      <p class="leegstaat-links"><a class="pijl" href="${BASIS}/oplossingen/">Bekijk de genomineerden</a><a class="pijl" href="/voorbeeld/winnaars/">Bekijk een voorbeeld met cijfers</a></p>
    </div>`;
  } else {
    // Gegroepeerd per maand van de uitslag.
    const maanden = new Map();
    for (const o of winnaars) {
      const sleutel = (o.uitslag ?? "").slice(0, 7);
      if (!maanden.has(sleutel)) maanden.set(sleutel, []);
      maanden.get(sleutel).push(o);
    }
    doel.innerHTML = [...maanden.entries()]
      .map(([sleutel, lijst]) => {
        const naam = /^\d{4}-\d{2}$/.test(sleutel) ? new Date(sleutel + "-15").toLocaleDateString("nl-NL", { month: "long", year: "numeric" }) : "Eerder";
        const meesters = lijst.filter((o) => stand(o) === "meesterproef").length;
        return `<section class="maand"><div class="blok-kop"><h2>${naam}</h2><p class="meta">${meesters} Meesterproef${meesters === 1 ? "" : "en"} · ${lijst.length - meesters} eervolle vermelding${lijst.length - meesters === 1 ? "" : "en"}</p></div><div class="raster raster-4">${lijst.map((o) => kaart(o, BASIS)).join("")}</div></section>`;
      })
      .join("");
  }
} catch (fout) {
  toonFout(doel, fout);
}
