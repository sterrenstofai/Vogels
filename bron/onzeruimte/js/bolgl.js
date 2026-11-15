// De grote draaiende bol op de pagina van een hemellichaam: WebGL, zonder bibliotheek.
// Eén vlak over het hele canvas; per beeldpunt rekent de grafische kaart uit waar je op de bol kijkt
// en welk punt van de kaart (van echte foto's, of een egale kleur) daarbij hoort. Licht van linksboven;
// de zon en sterren gloeien. Saturnus krijgt ringen uit een meting van Cassini, met de schaduw van de planeet.
// Sleep om te draaien en te kantelen. Zonder WebGL tekenen we hem met bol.js.
import { laadKaart, tekenBol, optiesVoor } from "./bol.js";

// gemiddelde kleur van een afbeelding (voor de gloed), even helder als het felste kanaal
function gemiddeldeVan(img) {
  const c = document.createElement("canvas"); c.width = 32; c.height = 16;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, 32, 16);
  const d = g.getImageData(0, 0, 32, 16).data; let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const m = Math.max(r, gg, b) || 1;
  return [r * 255 / m, gg * 255 / m, b * 255 / m];
}

const VS = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision highp float;
uniform sampler2D kaart, ringen;
uniform vec2 maat; uniform vec3 pool;
uniform float straal, schaal, lengte, kantel, helling, gloeit, heeftRing, binnen, buiten, dikte, gloed;
uniform vec3 halokleur;
void main() {
  vec2 q = (gl_FragCoord.xy - maat * 0.5) / straal * schaal;
  float r = length(q);
  vec3 L = normalize(vec3(-0.45, 0.4, 0.8));
  vec4 uit = vec4(0.0);
  float zBol = -1e9;
  // dampkring: een zachte rand van licht, het sterkst aan de kant van de zon; de zon en sterren gloeien rondom
  float kant = r > 0.0 ? 0.25 + 0.75 * max(0.0, dot(q / r, normalize(L.xy))) : 1.0;
  if (r > 1.0) {
    float a = gloed > 0.0 ? 0.85 * exp(-((r - 1.0) / gloed) * 2.4) : dikte > 0.0 ? 0.75 * kant * exp(-((r - 1.0) / dikte) * 1.7) : 0.0;
    uit = vec4(halokleur * a, a);
  }
  if (r <= 1.0) {
    float rand = 1.0 - smoothstep(1.0 - 1.5 * schaal / straal, 1.0, r);
    vec3 n = vec3(q, sqrt(max(0.0, 1.0 - r * r)));
    zBol = n.z;
    float licht = gloeit > 0.5
      ? 1.0 - 0.55 * (1.0 - n.z) - 0.15 * (1.0 - n.z) * (1.0 - n.z)
      : min(1.08, 0.16 + 0.95 * pow(max(dot(n, L), 0.0), 0.8)) * (0.82 + 0.18 * n.z);
    float c = cos(kantel), s = sin(kantel);
    vec3 a = vec3(c * n.x + s * n.y, -s * n.x + c * n.y, n.z);
    float ch = cos(helling), sh = sin(helling);
    vec3 b = vec3(a.x, ch * a.y - sh * a.z, sh * a.y + ch * a.z);
    float u = fract(atan(b.x, b.z) / 6.2831853 + lengte);
    float v = 0.5 - asin(clamp(b.y, -1.0, 1.0)) / 3.1415927;
    vec3 kleur = texture2D(kaart, vec2(u, v)).rgb * licht;
    if (dikte > 0.0) kleur = mix(kleur, halokleur, 0.55 * kant * pow(1.0 - n.z, 2.5));
    uit = vec4(kleur * rand, rand) + uit * (1.0 - rand);
  }
  if (heeftRing > 0.5 && abs(pool.z) > 0.001) {
    float zr = -(pool.x * q.x + pool.y * q.y) / pool.z;
    vec3 P = vec3(q, zr);
    float rr = length(P);
    if (rr >= binnen && rr <= buiten && zr > zBol) {
      vec4 rc = texture2D(ringen, vec2((rr - binnen) / (buiten - binnen), 0.5));
      float t = dot(P, L);
      vec3 dicht = P - t * L;
      float l = (t < 0.0 && dot(dicht, dicht) < 1.0) ? 0.25 : 0.95; // in de schaduw van de planeet
      uit = vec4(rc.rgb * l * rc.a + uit.rgb * (1.0 - rc.a), rc.a + uit.a * (1.0 - rc.a));
    }
  }
  gl_FragColor = uit;
}`;

// doek: canvas; b: regel uit bollen.json. Geeft een functie terug die alles stopt.
export function groteBol(doek, b, { stil = false } = {}) {
  const rad = Math.PI / 180;
  const stand = { lengte: b.begin ?? 0.5, helling: (b.helling || 0) * rad, vaart: 0, laatsteSleep: -1e9 };
  const kantel = (b.kanteling || 0) * rad;
  const ring = b.ringen || null;
  const dikte = b.atmosfeer?.dikte || 0, gloed = b.gloed || 0;
  const schaal = Math.max(ring ? ring.buiten * 1.02 : 1, dikte ? 1 + dikte * 2.6 : 1, gloed ? 1 + gloed * 2.2 : 1);
  let teken = null, anim = 0, weg = false, vorige = 0, wijzer = null;
  const gl = doek.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true });

  if (gl) {
    const maak = (soort, bron) => { const s = gl.createShader(soort); gl.shaderSource(s, bron); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, maak(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, maak(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return terugval();
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = Object.fromEntries(["kaart", "ringen", "maat", "pool", "straal", "schaal", "lengte", "kantel", "helling", "gloeit", "heeftRing", "binnen", "buiten", "dikte", "gloed", "halokleur"].map((n) => [n, gl.getUniformLocation(prog, n)]));
    const textuur = (eenheid, img, rgba, herhaal) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + eenheid); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, rgba ? gl.RGBA : gl.RGB, rgba ? gl.RGBA : gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, herhaal ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    const laad = (src) => new Promise((ok, fout) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fout; i.src = src; });
    Promise.all([laad(b.groot || b.pad), ring ? laad(ring.pad) : null]).then(([img, rimg]) => {
      if (weg) return;
      // een egale kaart is klein en niet 2^n breed: dan niet herhalen (dat mag in WebGL 1 alleen bij 2^n)
      const macht = (x) => (x & (x - 1)) === 0;
      textuur(0, img, false, macht(img.naturalWidth) && macht(img.naturalHeight));
      if (rimg) textuur(1, rimg, true, false);
      gl.uniform1i(U.kaart, 0); gl.uniform1i(U.ringen, 1);
      gl.uniform1f(U.gloeit, b.gloeit ? 1 : 0); gl.uniform1f(U.heeftRing, ring ? 1 : 0);
      gl.uniform1f(U.schaal, schaal);
      gl.uniform1f(U.dikte, dikte); gl.uniform1f(U.gloed, gloed);
      const hk = b.atmosfeer ? b.atmosfeer.rgb : gemiddeldeVan(img);
      gl.uniform3f(U.halokleur, hk[0] / 255, hk[1] / 255, hk[2] / 255);
      if (ring) { gl.uniform1f(U.binnen, ring.binnen); gl.uniform1f(U.buiten, ring.buiten); }
      teken = () => {
        gl.viewport(0, 0, doek.width, doek.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(U.maat, doek.width, doek.height);
        gl.uniform1f(U.straal, Math.min(doek.width, doek.height) * 0.47);
        gl.uniform1f(U.lengte, stand.lengte); gl.uniform1f(U.kantel, kantel); gl.uniform1f(U.helling, stand.helling);
        const hc = Math.cos(stand.helling), hs = Math.sin(stand.helling);
        gl.uniform3f(U.pool, -Math.sin(kantel) * hc, Math.cos(kantel) * hc, -hs);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      doek.classList.add("klaar");
      start();
    }).catch(() => terugval());
  } else return terugval();

  // zonder WebGL: dezelfde bol met bol.js, kleiner opgelost
  function terugval() {
    const vervang = doek.cloneNode(); doek.replaceWith(vervang); doek = vervang;
    Promise.all([laadKaart(b.pad), optiesVoor(b)]).then(([k, opt]) => {
      if (weg) return;
      teken = () => {
        const n = Math.min(doek.width, doek.height, 700);
        const tmp = doek._tmp || (doek._tmp = document.createElement("canvas"));
        tmp.width = tmp.height = n;
        tekenBol(tmp, k, stand.lengte, { ...opt, helling: stand.helling });
        const g = doek.getContext("2d"), d = Math.min(doek.width, doek.height) * 0.94;
        g.clearRect(0, 0, doek.width, doek.height);
        g.drawImage(tmp, (doek.width - d) / 2, (doek.height - d) / 2, d, d);
      };
      doek.classList.add("klaar");
      start();
    });
    koppel();
    return stop;
  }

  function maat() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(doek.clientWidth * dpr), h = Math.round(doek.clientHeight * dpr);
    if (doek.width !== w || doek.height !== h) { doek.width = w; doek.height = h; }
  }
  function stap(nu) {
    anim = 0;
    if (weg || !doek.isConnected) return;
    const dt = Math.min(50, nu - (vorige || nu)); vorige = nu;
    if (!document.hidden) {
      const zelf = nu - stand.laatsteSleep < 2500 || wijzer;
      if (!zelf && !stil) stand.lengte -= dt / 30000; // een omwenteling in een halve minuut, van west naar oost
      else if (!wijzer) { stand.lengte -= stand.vaart; stand.vaart *= 0.94; }
      maat(); teken?.();
    }
    anim = requestAnimationFrame(stap);
  }
  function start() { if (!anim && !weg) anim = requestAnimationFrame(stap); }

  // slepen: links-rechts draait, op-neer kantelt
  function koppel() {
    doek.addEventListener("pointerdown", (e) => { doek.setPointerCapture(e.pointerId); wijzer = { x: e.clientX, y: e.clientY }; stand.vaart = 0; });
    doek.addEventListener("pointermove", (e) => {
      if (!wijzer) return;
      const r = (Math.min(doek.clientWidth, doek.clientHeight) * 0.47) / schaal;
      const dx = e.clientX - wijzer.x, dy = e.clientY - wijzer.y;
      stand.vaart = -dx / (2 * Math.PI * r);
      stand.lengte += stand.vaart;
      stand.helling = Math.max(-1.1, Math.min(1.1, stand.helling + dy / r));
      wijzer = { x: e.clientX, y: e.clientY };
      stand.laatsteSleep = performance.now();
    });
    const los = () => { wijzer = null; stand.laatsteSleep = performance.now(); };
    doek.addEventListener("pointerup", los); doek.addEventListener("pointercancel", los);
  }
  if (gl) koppel();
  function stop() { weg = true; cancelAnimationFrame(anim); }
  return stop;
}
