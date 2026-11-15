import { menu } from "./kern.js";
import { CRITERIA, ONDERSCHEIDINGEN, gewogenCijfer, toonCijfer } from "./score.js";

menu();

const hulp = document.querySelector("#rekenhulp");
const schuiven = [...hulp.querySelectorAll("input[type=range]")];

function reken() {
  const scores = {};
  for (const s of schuiven) {
    scores[s.dataset.criterium] = Number(s.value);
    s.nextElementSibling.textContent = s.value;
    s.style.setProperty("--vul", `${((s.value - 1) / 9) * 100}%`);
  }
  const cijfer = gewogenCijfer(scores);
  const afgerond = Math.round(cijfer * 10) / 10;
  document.querySelector("#reken-cijfer").textContent = toonCijfer(cijfer);
  document.querySelector("#reken-som").textContent = CRITERIA.map((c) => `${scores[c.id]} × ${c.gewicht}%`).join(" + ");
  const prijs = ONDERSCHEIDINGEN.find((o) => afgerond >= o.vanaf);
  document.querySelector("#reken-uitslag").innerHTML = prijs
    ? `Als de hele jury zo oordeelt: <span class="etiket etiket-${prijs.id}">${prijs.naam}</span>`
    : `Als de hele jury zo oordeelt: <span class="etiket etiket-beoordeeld">Beoordeeld</span>`;
}
for (const s of schuiven) s.addEventListener("input", reken);
reken();

// Markeer in de zijnavigatie het deel dat in beeld is.
const links = [...document.querySelectorAll(".inhoud-nav a")];
const kijker = new IntersectionObserver(
  (items) => {
    for (const item of items) {
      if (item.isIntersecting) for (const l of links) l.classList.toggle("actief", l.hash === `#${item.target.id}`);
    }
  },
  { rootMargin: "-20% 0px -70% 0px" }
);
for (const deel of document.querySelectorAll(".werkwijze-lijf > section")) kijker.observe(deel);
