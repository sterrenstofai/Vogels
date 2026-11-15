// Lokale server: node scripts/dev.mjs
// /api/* gaat naar dezelfde code als op Netlify; al het andere komt uit dist/.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORTEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// MEESTERPROEF_DIST wijst desgewenst een andere map aan, bijvoorbeeld om de server zelf te toetsen.
const DIST = path.resolve(process.env.MEESTERPROEF_DIST || path.join(WORTEL, "dist"));
const POORT = Number(process.env.PORT) || 8811;
const MAX_BODY = 1_000_000; // ruim boven de grens van de API, zodat die zelf 413 kan antwoorden

// Lokale standaardwaarden. Op Netlify horen hier echte geheimen te staan.
const STANDAARD = {
  MEESTERPROEF_OPSLAG_MAP: path.join(WORTEL, ".opslag"),
  SESSIE_GEHEIM: "lokaal-geheim",
  BEHEER_CODE: "lokaal-beheer",
};
const ingevuld = [];
for (const [naam, waarde] of Object.entries(STANDAARD)) {
  if (!process.env[naam]) {
    process.env[naam] = waarde;
    ingevuld.push(naam);
  }
}

// Pas nu laden: de API leest de omgeving.
const { behandel } = await import("../netlify/lib/api.mjs");

const SOORTEN = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

function leesBody(req) {
  return new Promise((klaar, mis) => {
    const stukken = [];
    let grootte = 0;
    req.on("data", (stuk) => {
      grootte += stuk.length;
      if (grootte <= MAX_BODY) stukken.push(stuk);
    });
    req.on("end", () => klaar(Buffer.concat(stukken)));
    req.on("error", mis);
  });
}

async function api(req, res) {
  const methode = req.method ?? "GET";
  const headers = new Headers();
  for (const [naam, waarde] of Object.entries(req.headers)) {
    if (waarde !== undefined) headers.set(naam, Array.isArray(waarde) ? waarde.join(", ") : waarde);
  }
  const metBody = methode !== "GET" && methode !== "HEAD";
  const body = metBody ? await leesBody(req) : undefined;
  // De lengte hoort bij wat we zelf doorgeven, niet bij wat er binnenkwam.
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  const verzoek = new Request(`http://${req.headers.host ?? `localhost:${POORT}`}${req.url}`, { method: methode, headers, body });

  const antwoord = await behandel(verzoek, { ip: req.socket.remoteAddress });
  res.statusCode = antwoord.status;
  for (const [naam, waarde] of antwoord.headers) {
    if (naam !== "set-cookie") res.setHeader(naam, waarde);
  }
  // Set-Cookie apart: elke cookie is een eigen regel.
  const cookies = antwoord.headers.getSetCookie();
  if (cookies.length > 0) res.setHeader("Set-Cookie", cookies);
  res.end(Buffer.from(await antwoord.arrayBuffer()));
}

const soortBestand = async (pad) => {
  try {
    const s = await stat(pad);
    return s.isDirectory() ? "map" : s.isFile() ? "bestand" : null;
  } catch {
    return null;
  }
};

async function stuurBestand(res, pad, status = 200, alleenKop = false) {
  const inhoud = await readFile(pad);
  res.writeHead(status, {
    "Content-Type": SOORTEN[path.extname(pad).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": inhoud.length,
    "Cache-Control": "no-cache",
  });
  res.end(alleenKop ? undefined : inhoud);
}

async function nietGevonden(res, alleenKop) {
  const pagina = path.join(DIST, "404.html");
  if ((await soortBestand(pagina)) === "bestand") return stuurBestand(res, pagina, 404, alleenKop);
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(alleenKop ? undefined : "404: deze pagina bestaat niet.\n");
}

async function statisch(req, res) {
  const alleenKop = req.method === "HEAD";
  if (req.method !== "GET" && !alleenKop) {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", Allow: "GET, HEAD" });
    return res.end("405: deze methode is hier niet toegestaan.\n");
  }
  const url = new URL(req.url, "http://localhost");
  let pad;
  try {
    pad = decodeURIComponent(url.pathname);
  } catch {
    return nietGevonden(res, alleenKop);
  }
  // Nooit buiten dist/ lezen, wat er ook in het adres staat.
  const doel = path.join(DIST, path.normalize(pad));
  if (pad.includes("\0") || (doel !== DIST && !doel.startsWith(DIST + path.sep))) return nietGevonden(res, alleenKop);

  if (pad.endsWith("/")) {
    const index = path.join(doel, "index.html");
    return (await soortBestand(index)) === "bestand" ? stuurBestand(res, index, 200, alleenKop) : nietGevonden(res, alleenKop);
  }
  const soort = await soortBestand(doel);
  if (soort === "bestand") return stuurBestand(res, doel, 200, alleenKop);
  if (path.extname(pad) === "") {
    // Nette adressen: /pad hoort /pad/ te zijn als die map bestaat.
    if (soort === "map") {
      res.writeHead(302, { Location: `${url.pathname}/${url.search}` });
      return res.end();
    }
    if ((await soortBestand(`${doel}.html`)) === "bestand") return stuurBestand(res, `${doel}.html`, 200, alleenKop);
  }
  return nietGevonden(res, alleenKop);
}

const server = createServer(async (req, res) => {
  try {
    const pad = (req.url ?? "/").split("?")[0];
    if (pad === "/api" || pad.startsWith("/api/")) await api(req, res);
    else await statisch(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500: er ging iets mis in de lokale server.\n");
  }
});

server.listen(POORT, async () => {
  console.log(`Meesterproef lokaal: http://localhost:${POORT}`);
  console.log(`  statisch uit  ${DIST}`);
  if ((await soortBestand(DIST)) !== "map") console.log("  LET OP: dist/ bestaat nog niet; draai eerst de bouw. Tot die tijd geeft elke pagina 404.");
  console.log(`  opslag in     ${process.env.MEESTERPROEF_OPSLAG_MAP}`);
  if (ingevuld.length > 0) {
    console.log("  LET OP: lokale standaardwaarden in gebruik, niet geschikt voor productie:");
    for (const naam of ingevuld) console.log(`    ${naam}=${STANDAARD[naam]}`);
  }
  if (ingevuld.includes("BEHEER_CODE")) console.log(`  inloggen als beheerder met de code: ${STANDAARD.BEHEER_CODE}`);
});
