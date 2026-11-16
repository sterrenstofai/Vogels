'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type Zweefboek = { slug: string; titel: string; ondertitel: string; omslag: string; beschikbaar: boolean };

// De boeken zweven in beeld, draaien mee met de muis en zijn aan te klikken.
// Zonder WebGL, of als iemand om minder beweging vraagt, blijft het stilstaande boek staan (children).
export function Zweefboeken({ boeken, start = 0, merk, children }: { boeken: Zweefboek[]; start?: number; merk: string; children: React.ReactNode }) {
  const hol = useRef<HTMLDivElement>(null);
  const [actief, setActief] = useState(start);
  const [klaar, setKlaar] = useState(false);
  const doel = useRef(start);
  const router = useRouter();
  const naar = useRef<(i: number) => void>(() => {});

  naar.current = (i) => {
    if (i === doel.current) { if (boeken[i].beschikbaar) router.push(`/verhalen/${boeken[i].slug}`); return; }
    kies(i);
  };
  function kies(i: number) {
    const n = Math.max(0, Math.min(boeken.length - 1, i));
    doel.current = n;
    setActief(n);
  }

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
      const FOV = 28;
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xd9deea, 2.1));
      const zon = new THREE.DirectionalLight(0xffffff, 1.5);
      zon.position.set(-3, 5, 7);
      scene.add(zon);

      // De voorkant van elk boek: plaat, donkere sluier bovenaan, titel en merk.
      const letter = getComputedStyle(document.body).fontFamily;
      const laad = (src: string) => new Promise<HTMLImageElement>((ok, fout) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fout; im.src = src; });
      async function voorkant(b: Zweefboek) {
        const P = 1024, c = document.createElement('canvas');
        c.width = c.height = P;
        const g = c.getContext('2d')!;
        g.fillStyle = '#0b1440'; g.fillRect(0, 0, P, P);
        try { g.drawImage(await laad(b.omslag), 0, 0, P, P); } catch {}
        const s = g.createLinearGradient(0, 0, 0, P);
        s.addColorStop(0, 'rgba(5,7,26,.9)'); s.addColorStop(0.34, 'rgba(5,7,26,.35)'); s.addColorStop(0.5, 'rgba(5,7,26,0)'); s.addColorStop(0.8, 'rgba(5,7,26,0)'); s.addColorStop(1, 'rgba(5,7,26,.55)');
        g.fillStyle = s; g.fillRect(0, 0, P, P);
        g.fillStyle = '#fff'; g.textBaseline = 'top';
        g.font = `600 108px ${letter}`;
        const woorden = b.titel.split(' '), regels: string[] = [];
        let r = '';
        for (const w of woorden) { const t = r ? r + ' ' + w : w; if (r && g.measureText(t).width > P * 0.8) { regels.push(r); r = w; } else r = t; }
        regels.push(r);
        regels.forEach((t, i) => g.fillText(t, P * 0.1, P * 0.095 + i * 110));
        g.globalAlpha = 0.85; g.font = `400 38px ${letter}`;
        g.fillText(b.ondertitel, P * 0.1, P * 0.095 + regels.length * 110 + 22);
        g.globalAlpha = 0.65; g.font = `600 30px ${letter}`;
        g.fillText(merk.toUpperCase().split('').join(' '), P * 0.1, P * 0.89);
        g.globalAlpha = 1;
        const kneep = g.createLinearGradient(0, 0, P * 0.06, 0);
        kneep.addColorStop(0, 'rgba(255,255,255,.14)'); kneep.addColorStop(0.4, 'rgba(0,0,0,.24)'); kneep.addColorStop(0.6, 'rgba(255,255,255,.08)'); kneep.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = kneep; g.fillRect(0, 0, P * 0.06, P);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
      }
      const schaduwTex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const g = c.getContext('2d')!, s = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        s.addColorStop(0, 'rgba(0,0,0,.42)'); s.addColorStop(0.6, 'rgba(0,0,0,.12)'); s.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = s; g.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
      })();

      const W = 2.5, D = 0.2, K = 0.035;
      const kaft = new THREE.MeshStandardMaterial({ color: 0x0b1026, roughness: 0.6 });
      const papier = new THREE.MeshStandardMaterial({ color: 0xf1ecdf, roughness: 0.9 });
      const texturen = await Promise.all(boeken.map(voorkant));
      if (weg) { renderer.dispose(); canvas.remove(); return; }

      const groepen = boeken.map((_, i) => {
        const g = new THREE.Group();
        const voor = new THREE.MeshStandardMaterial({ map: texturen[i], roughness: 0.5 });
        const blok = new THREE.Mesh(new THREE.BoxGeometry(W * 0.965, W * 0.955, D - K), papier);
        blok.position.x = W * 0.008;
        const v = new THREE.Mesh(new THREE.BoxGeometry(W, W, K), [kaft, kaft, kaft, kaft, voor, kaft]);
        v.position.z = D / 2;
        const a = new THREE.Mesh(new THREE.BoxGeometry(W, W, K), kaft);
        a.position.z = -D / 2;
        const rug = new THREE.Mesh(new THREE.BoxGeometry(K, W, D + K), kaft);
        rug.position.x = -W / 2 + K / 2;
        g.add(blok, v, a, rug);
        g.userData.i = i;
        const sch = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, W * 0.5), new THREE.MeshBasicMaterial({ map: schaduwTex, transparent: true, depthWrite: false }));
        scene.add(g, sch);
        return { g, sch, s: 1 };
      });

      let breed = 1, tussen = 3, afstand = 9;
      const meet = () => {
        const w = el.clientWidth, h = el.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const t = Math.tan((FOV * Math.PI) / 360);
        afstand = Math.max(8.6, W / 0.58 / (2 * t * camera.aspect)); // op een smal scherm verder weg, zodat het boek past
        camera.position.set(0, 0.1, afstand);
        camera.updateProjectionMatrix();
        breed = 2 * t * afstand * camera.aspect;
        tussen = Math.min(3.5, Math.max(1.75, breed * 0.33));
      };
      meet();
      const ro = new ResizeObserver(meet);
      ro.observe(el);

      const muis = { x: 0, y: 0, tx: 0, ty: 0, binnen: false };
      const straal = new THREE.Raycaster(), punt = new THREE.Vector2();
      let boven = -1, sleep: { x: number; t: number } | null = null;
      const raak = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        punt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        straal.setFromCamera(punt, camera);
        const h = straal.intersectObjects(groepen.map((b) => b.g), true)[0];
        return h ? (h.object.parent!.userData.i as number) : -1;
      };
      const beweeg = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        muis.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        muis.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
        if (e.target === canvas) { boven = raak(e); canvas.style.cursor = boven >= 0 ? 'pointer' : 'grab'; }
      };
      const neer = (e: PointerEvent) => { sleep = { x: e.clientX, t: raak(e) }; };
      const op = (e: PointerEvent) => {
        if (!sleep) return;
        const dx = e.clientX - sleep.x;
        if (Math.abs(dx) > 45) kies(doel.current + (dx < 0 ? 1 : -1));
        else if (sleep.t >= 0) naar.current(sleep.t);
        sleep = null;
      };
      const uit = () => { muis.tx = 0; muis.ty = 0; boven = -1; };
      window.addEventListener('pointermove', beweeg, { passive: true });
      canvas.addEventListener('pointerdown', neer);
      window.addEventListener('pointerup', op);
      el.addEventListener('pointerleave', uit);

      let zichtbaar = true;
      const io = new IntersectionObserver(([x]) => { zichtbaar = x.isIntersecting; });
      io.observe(el);

      let plek = doel.current, vorig = performance.now(), raf = 0, t = 0;
      const teken = (nu: number) => {
        raf = requestAnimationFrame(teken);
        if (!zichtbaar || document.hidden) { vorig = nu; return; }
        const dt = Math.min(0.05, (nu - vorig) / 1000);
        vorig = nu; t += dt;
        const zacht = 1 - Math.exp(-dt * 6);
        plek += (doel.current - plek) * zacht;
        muis.x += (muis.tx - muis.x) * zacht;
        muis.y += (muis.ty - muis.y) * zacht;
        groepen.forEach((b, i) => {
          const o = i - plek, ver = Math.min(Math.abs(o), 1.6);
          const y = Math.sin(t * 0.9 + i * 1.9) * 0.085 + 0.12;
          b.g.position.set(o * tussen + muis.x * 0.16 * (1 + ver), y - muis.y * 0.08, -ver * 1.9);
          b.g.rotation.set(0.06 + muis.y * 0.2, -0.36 - o * 0.42 + muis.x * 0.38, Math.sin(t * 0.6 + i * 1.3) * 0.018);
          const groot = (1 - ver * 0.16) * (boven === i ? 1.045 : 1);
          b.s += (groot - b.s) * zacht;
          b.g.scale.setScalar(b.s);
          b.sch.position.set(b.g.position.x + 0.25, -W / 2 - 0.42, b.g.position.z);
          b.sch.rotation.x = -Math.PI / 2 + 0.9;
          (b.sch.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = 0.75 - y * 1.6 - ver * 0.25;
          b.sch.scale.setScalar(b.s * (1 - y * 0.5));
        });
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(teken);
      setKlaar(true);

      opruimen = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        window.removeEventListener('pointermove', beweeg); window.removeEventListener('pointerup', op);
        el.removeEventListener('pointerleave', uit);
        texturen.forEach((x) => x.dispose()); schaduwTex.dispose();
        scene.traverse((o) => { const m = o as InstanceType<typeof THREE.Mesh>; m.geometry?.dispose(); });
        renderer.dispose(); canvas.remove();
      };
      if (weg) opruimen();
    })();

    return () => { weg = true; opruimen(); };
    // De lijst boeken verandert niet tijdens het bekijken van de pagina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const b = boeken[actief];
  return (
    <div className="zweef">
      <div ref={hol} className={`zweef-vlak ${klaar ? 'klaar' : ''}`}>
        <div className="zweef-stil">{children}</div>
      </div>
      {klaar && (
        <div className="zweef-onder">
          <button className="rond" onClick={() => kies(actief - 1)} disabled={actief === 0} aria-label="Vorig boek">←</button>
          <div aria-live="polite">
            <strong>{b.titel}</strong>
            {b.beschikbaar ? <Link className="pijl" href={`/verhalen/${b.slug}`}>Bekijk dit boek</Link> : <span>Binnenkort</span>}
          </div>
          <button className="rond" onClick={() => kies(actief + 1)} disabled={actief === boeken.length - 1} aria-label="Volgend boek">→</button>
        </div>
      )}
    </div>
  );
}
