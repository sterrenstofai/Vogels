'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type Kaart = { src: string; label: string; href?: string; titel?: string; ondertitel?: string };

// Een gebogen band van omslagen en platen, getekend met WebGL. De band drijft langzaam,
// is te verslepen, buigt mee met de muis en elke kaart is aan te klikken.
// Zonder WebGL, of als iemand om minder beweging vraagt, blijft de stille rij staan (children).
export function Boekenband({ kaarten, start = 0, merk, children }: { kaarten: Kaart[]; start?: number; merk: string; children: React.ReactNode }) {
  const hol = useRef<HTMLDivElement>(null);
  const [klaar, setKlaar] = useState(false);
  const router = useRouter();
  const open = useRef<(i: number) => void>(() => {});
  open.current = (i) => { const h = kaarten[i].href; if (h) router.push(h); };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = hol.current!;
    let weg = false;
    let opruimen = () => {};

    (async () => {
      const THREE = await import('three');
      await document.fonts.ready;
      if (weg) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-hidden', 'true');
      el.appendChild(canvas);
      const scene = new THREE.Scene();
      const FOV = 30;
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
      const band = new THREE.Group();
      scene.add(band);

      // Elke kaart is één plaatje: een klein opschrift erboven en daaronder het beeld met ronde hoeken.
      const stijl = getComputedStyle(document.body);
      const letter = stijl.fontFamily;
      const P = 1024, KOP = 84, RAND = 46;
      const laad = (src: string) => new Promise<HTMLImageElement>((ok, fout) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fout; im.src = src; });
      async function teken(k: Kaart) {
        const c = document.createElement('canvas');
        c.width = P; c.height = P + KOP;
        const g = c.getContext('2d')!;
        g.fillStyle = 'rgba(16,18,20,.62)'; g.textBaseline = 'middle';
        g.font = `500 27px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        g.letterSpacing = '2px';
        g.fillText(k.label.toUpperCase().split('').join(' '), 8, KOP / 2 + 6);
        g.letterSpacing = '0px';
        g.save();
        g.beginPath(); g.roundRect(0, KOP, P, P, RAND); g.clip();
        g.fillStyle = '#0b1440'; g.fillRect(0, KOP, P, P);
        try { g.drawImage(await laad(k.src), 0, KOP, P, P); } catch {}
        if (k.titel) {
          const s = g.createLinearGradient(0, KOP, 0, KOP + P);
          s.addColorStop(0, 'rgba(5,7,26,.9)'); s.addColorStop(0.34, 'rgba(5,7,26,.35)'); s.addColorStop(0.5, 'rgba(5,7,26,0)'); s.addColorStop(0.8, 'rgba(5,7,26,0)'); s.addColorStop(1, 'rgba(5,7,26,.55)');
          g.fillStyle = s; g.fillRect(0, KOP, P, P);
          g.fillStyle = '#fff'; g.textBaseline = 'top'; g.font = `600 104px ${letter}`;
          const regels: string[] = [];
          let r = '';
          for (const w of k.titel.split(' ')) { const t = r ? r + ' ' + w : w; if (r && g.measureText(t).width > P * 0.8) { regels.push(r); r = w; } else r = t; }
          regels.push(r);
          regels.forEach((t, i) => g.fillText(t, P * 0.09, KOP + P * 0.085 + i * 106));
          if (k.ondertitel) { g.globalAlpha = 0.85; g.font = `400 38px ${letter}`; g.fillText(k.ondertitel, P * 0.09, KOP + P * 0.085 + regels.length * 106 + 20); }
          g.globalAlpha = 0.65; g.font = `600 28px ${letter}`;
          g.fillText(merk.toUpperCase().split('').join(' '), P * 0.09, KOP + P * 0.9);
          g.globalAlpha = 1;
        }
        g.restore();
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
      }
      const texturen = await Promise.all(kaarten.map(teken));
      if (weg) { renderer.dispose(); canvas.remove(); return; }

      const W = 2.3, H = W * ((P + KOP) / P), TUSSEN = 0.2, STAP = W + TUSSEN, SEG = 28;
      const LANG = kaarten.length * STAP;
      const kaartjes = texturen.map((map, i) => {
        const geo = new THREE.PlaneGeometry(W, H, SEG, 1);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }));
        m.userData.i = i;
        m.frustumCulled = false;
        band.add(m);
        return { m, basis: Float32Array.from(geo.attributes.position.array as Float32Array), s: 1 };
      });

      let breedPx = 1, perPx = 0.01, R = 9;
      const meet = () => {
        const w = el.clientWidth, h = el.clientHeight;
        breedPx = w;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const t = Math.tan((FOV * Math.PI) / 360);
        const afstand = Math.max(6.4, Math.min(11, (H * 1.5) / (2 * t))); // de kaart vult ruim de helft van de hoogte
        camera.position.set(0, 0.12, afstand);
        camera.updateProjectionMatrix();
        const breed = 2 * t * afstand * camera.aspect;
        perPx = breed / w;
        R = Math.max(6.5, breed * 0.95); // hoe smaller het beeld, hoe sterker de bocht
      };
      meet();
      const ro = new ResizeObserver(meet);
      ro.observe(el);

      const muis = { x: 0, y: 0, tx: 0, ty: 0 };
      const straal = new THREE.Raycaster(), punt = new THREE.Vector2();
      let boven = -1, sleep: { x: number; start: number; laatst: number; tijd: number } | null = null;
      let plek = start * STAP, vaart = 0; // de kaart `start` begint in het midden
      const raak = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        punt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        straal.setFromCamera(punt, camera);
        const h = straal.intersectObjects(band.children, false)[0];
        if (!h || !h.uv || h.uv.y > P / (P + KOP)) return -1; // het opschrift telt niet mee
        return h.object.userData.i as number;
      };
      const beweeg = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        muis.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        muis.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
        if (sleep) {
          const nu = performance.now(), dx = e.clientX - sleep.laatst;
          plek -= dx * perPx;
          vaart = (-dx * perPx) / Math.max(0.008, (nu - sleep.tijd) / 1000);
          sleep.laatst = e.clientX; sleep.tijd = nu;
        } else if (e.target === canvas) {
          boven = raak(e);
          canvas.style.cursor = boven >= 0 && kaarten[boven].href ? 'pointer' : 'grab';
        } else boven = -1;
      };
      const neer = (e: PointerEvent) => { sleep = { x: e.clientX, start: e.clientX, laatst: e.clientX, tijd: performance.now() }; canvas.style.cursor = 'grabbing'; };
      const op = (e: PointerEvent) => {
        if (!sleep) return;
        const klik = Math.abs(e.clientX - sleep.start) < 6;
        sleep = null;
        canvas.style.cursor = 'grab';
        if (klik) { vaart = 0; const i = raak(e); if (i >= 0) open.current(i); }
      };
      const wiel = (e: WheelEvent) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // gewoon scrollen blijft gewoon scrollen
        e.preventDefault();
        vaart += e.deltaX * 0.012;
      };
      const uit = () => { muis.tx = 0; muis.ty = 0; boven = -1; };
      window.addEventListener('pointermove', beweeg, { passive: true });
      canvas.addEventListener('pointerdown', neer);
      window.addEventListener('pointerup', op);
      window.addEventListener('pointercancel', op);
      canvas.addEventListener('wheel', wiel, { passive: false });
      el.addEventListener('pointerleave', uit);

      let zichtbaar = true;
      const io = new IntersectionObserver(([x]) => { zichtbaar = x.isIntersecting; });
      io.observe(el);

      let vorig = performance.now(), raf = 0, t = 0, buig = 0;
      const frame = (nu: number) => {
        raf = requestAnimationFrame(frame);
        if (!zichtbaar || document.hidden) { vorig = nu; return; }
        const dt = Math.min(0.05, (nu - vorig) / 1000);
        vorig = nu; t += dt;
        const zacht = 1 - Math.exp(-dt * 5);
        if (!sleep) {
          const drift = boven >= 0 ? 0 : 0.22; // langzaam doordrijven, behalve als je een kaart aanwijst
          vaart += (drift - vaart) * (1 - Math.exp(-dt * 2.2));
          plek += vaart * dt;
        }
        buig += (Math.max(-6, Math.min(6, vaart)) - buig) * zacht;
        muis.x += (muis.tx - muis.x) * zacht;
        muis.y += (muis.ty - muis.y) * zacht;
        band.rotation.set(muis.y * 0.05, muis.x * 0.07, 0);
        band.position.set(-muis.x * 0.12, -0.18 - muis.y * 0.06, 0);

        kaartjes.forEach((k, i) => {
          let s = ((i * STAP - plek) % LANG + LANG) % LANG;
          if (s > LANG / 2) s -= LANG;
          k.s += ((boven === i ? 1.05 : 1) - k.s) * zacht;
          const dein = Math.sin(t * 0.8 + i * 1.7) * 0.05;
          const pos = k.m.geometry.attributes.position, a = pos.array as Float32Array;
          for (let v = 0; v < a.length; v += 3) {
            const x = k.basis[v] * k.s, y = k.basis[v + 1] * k.s;
            const hoek = (s + x + buig * 0.045 * (y / H)) / R; // bij vaart leunen de kaarten mee
            a[v] = R * Math.sin(hoek);
            a[v + 1] = y + dein;
            a[v + 2] = R * (1 - Math.cos(hoek)) + (k.s - 1) * 4;
          }
          pos.needsUpdate = true;
          k.m.geometry.boundingSphere = null;
          k.m.visible = Math.abs(s) < R * 1.35;
        });
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(frame);
      setKlaar(true);

      opruimen = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        window.removeEventListener('pointermove', beweeg); window.removeEventListener('pointerup', op); window.removeEventListener('pointercancel', op);
        el.removeEventListener('pointerleave', uit);
        texturen.forEach((x) => x.dispose());
        kaartjes.forEach((k) => { k.m.geometry.dispose(); (k.m.material as InstanceType<typeof THREE.MeshBasicMaterial>).dispose(); });
        renderer.dispose(); canvas.remove();
      };
      if (weg) opruimen();
    })();

    return () => { weg = true; opruimen(); };
    // De kaarten veranderen niet tijdens het bekijken van de pagina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="zweef band">
      <div ref={hol} className={`zweef-vlak ${klaar ? 'klaar' : ''}`}>
        <div className="zweef-stil">{children}</div>
      </div>
      {klaar && <p className="zweef-wenk" aria-hidden="true">Sleep om te bladeren</p>}
      {/* Dezelfde boeken als gewone links, voor wie de band niet kan zien of bedienen. */}
      <nav className="alleen-voorlezen" aria-label="Boeken">
        {kaarten.filter((k) => k.titel && k.href).map((k) => <Link key={k.src} href={k.href!}>{k.titel}</Link>)}
      </nav>
    </div>
  );
}
