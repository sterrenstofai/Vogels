// Sessiecookie en inlogcodes.
// De cookie is base64url(JSON {rol, id, tot}) + "." + HMAC-SHA256 daarover.

import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { bestandsmodus } from "./opslag.mjs";

export const COOKIE = "mp_sessie";
export const SESSIEDUUR_S = 2592000; // dertig dagen

// Zonder 0/O, 1/I/L: die worden bij overtypen verward.
const ALFABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODELENGTE = 20;

export function sessieGeheim() {
  const geheim = process.env.SESSIE_GEHEIM;
  if (geheim) return geheim;
  // Alleen lokaal en in tests mag een vaste sleutel; op Netlify is ontbreken een fout.
  return bestandsmodus() ? "lokaal-geheim" : null;
}

export const beheerCode = () => process.env.BEHEER_CODE || null;

export const sha256 = (tekst) => createHash("sha256").update(String(tekst), "utf8").digest("hex");

// Vergelijkt twee teksten in constante tijd. Eerst hashen maakt de lengtes gelijk.
export function gelijk(a, b) {
  const ha = createHash("sha256").update(String(a), "utf8").digest();
  const hb = createHash("sha256").update(String(b), "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function gelijkeHash(hexA, hexB) {
  const a = Buffer.from(String(hexA ?? ""), "hex");
  const b = Buffer.from(String(hexB ?? ""), "hex");
  return a.length === 32 && b.length === 32 && timingSafeEqual(a, b);
}

export function nieuweCode() {
  let code = "";
  for (let i = 0; i < CODELENGTE; i++) code += ALFABET[randomInt(ALFABET.length)];
  return code;
}

// Juryleden mogen hun code met spaties, streepjes of kleine letters intikken.
export const normaliseerCode = (code) => String(code).replace(/[\s-]/g, "").toUpperCase();

export const hashCode = (code) => sha256(normaliseerCode(code));

// `binding` tekent mee en hangt aan de inlogcode: de beheercode voor de beheerder,
// de hash van de eigen code voor een jurylid. Verandert de code, dan vervallen de sessies.
function handtekening(deel, binding) {
  return createHmac("sha256", sessieGeheim()).update(`${deel}|${binding}`).digest();
}

export function maakSessie(rol, id, binding, nu = Date.now()) {
  const inhoud = { rol, id, tot: nu + SESSIEDUUR_S * 1000 };
  const deel = Buffer.from(JSON.stringify(inhoud), "utf8").toString("base64url");
  return `${deel}.${handtekening(deel, binding).toString("base64url")}`;
}

// Haalt de cookie uit elkaar zonder hem al te vertrouwen. De aanroeper zoekt met
// rol en id de binding op en laat daarna `sessieKlopt` de handtekening controleren.
export function ontleedSessie(req) {
  const waarde = cookieWaarde(req.headers.get("cookie"), COOKIE);
  if (!waarde || waarde.length > 1000) return null;
  const punt = waarde.indexOf(".");
  if (punt < 1) return null;
  const deel = waarde.slice(0, punt);
  let inhoud;
  try {
    inhoud = JSON.parse(Buffer.from(deel, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!inhoud || typeof inhoud !== "object") return null;
  const { rol, id, tot } = inhoud;
  if ((rol !== "jury" && rol !== "beheer") || typeof id !== "string" || !Number.isFinite(tot)) return null;
  return { rol, id, tot, deel, getekend: Buffer.from(waarde.slice(punt + 1), "base64url") };
}

export function sessieKlopt(sessie, binding, nu = Date.now()) {
  if (!binding) return false;
  const verwacht = handtekening(sessie.deel, binding);
  if (sessie.getekend.length !== verwacht.length || !timingSafeEqual(sessie.getekend, verwacht)) return false;
  return sessie.tot > nu;
}

function cookieWaarde(kop, naam) {
  for (const stuk of String(kop ?? "").split(";")) {
    const is = stuk.indexOf("=");
    if (is > 0 && stuk.slice(0, is).trim() === naam) return stuk.slice(is + 1).trim();
  }
  return null;
}

// Secure hoort er altijd bij, behalve op de lokale server: die spreekt gewoon http.
function lokaalHttp(url) {
  return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

export function sessieCookie(url, waarde) {
  const leeftijd = waarde ? SESSIEDUUR_S : 0;
  const delen = [`${COOKIE}=${waarde ?? ""}`, "HttpOnly", "SameSite=Lax", "Path=/", `Max-Age=${leeftijd}`];
  if (!lokaalHttp(url)) delen.push("Secure");
  return delen.join("; ");
}
