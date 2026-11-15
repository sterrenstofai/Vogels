// /kinderen: één groot plaatje per voertuig; een tik opent de kinderstand.
import { lijst, pad } from "/js/voertuigen.js";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
document.querySelector("[data-raster]").innerHTML = lijst().map((v) => `<a class="kinderkaart" href="${pad(v, true)}"><img src="/beeld/${v.slug}.webp" alt="" width="1200" height="800"><span>${esc(v.naam)}</span></a>`).join("");
