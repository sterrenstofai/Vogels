// De keuzestrook bovenaan het paneel: alle voertuigen, het huidige gemarkeerd. Vult elk <nav data-kiezer>.
import { lijst, pad } from "/js/voertuigen.js";
const nu = location.pathname.replace(/\/$/, "").split("/").filter(Boolean);
const kind = nu[0] === "kinderen", slug = (kind ? nu[1] : nu[0]) || "";
for (const nav of document.querySelectorAll("nav[data-kiezer]")) {
  nav.textContent = "";
  const alle = document.createElement("a"); alle.href = kind ? "/kinderen" : "/"; alle.textContent = "Alle"; alle.className = "alle"; nav.append(alle);
  for (const v of lijst()) {
    const a = document.createElement("a"); a.href = pad(v, kind); a.textContent = v.label;
    if (v.slug === slug) a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  const a = nav.querySelector("[aria-current]"); // in beeld schuiven zonder de pagina te laten springen
  if (a) requestAnimationFrame(() => { const r = a.getBoundingClientRect(), n = nav.getBoundingClientRect(); nav.scrollLeft += r.left - n.left - (n.width - r.width) / 2; });
}
