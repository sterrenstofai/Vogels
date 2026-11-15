import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '@fontsource-variable/bricolage-grotesque/wdth.css';
import '@fontsource/caveat/700.css';
import './globals.css';
import { paymentMode } from '@/lib/providers/payment';

export const metadata: Metadata = {
  title: { default: 'Hoofdrol — een boek met jouw kind als held', template: '%s — Hoofdrol' },
  description: 'Kies een verhaal, stuur een foto en krijg een gedrukt prentenboek met jouw kind in de hoofdrol.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffd23f' };
export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        {paymentMode() === 'test' && <div className="testband">Testversie: betalen, beelden en drukker zijn nagemaakt. Er wordt niets afgeschreven of gedrukt.</div>}
        <header className="nav">
          <Link href="/" className="logo"><i aria-hidden="true">★</i>Hoofdrol</Link>
          <nav className="pills" aria-label="Hoofdmenu">
            <Link className="pill hide-s" href="/#verhalen">Verhalen</Link>
            <Link className="pill hide-s" href="/#zo-werkt-het">Zo werkt het</Link>
            <Link className="pill hide-s" href="/#prijs">Prijs</Link>
            <Link className="pill" href="/#vragen">Vragen</Link>
          </nav>
        </header>
        {children}
        <footer>
          <div className="wrap">
            <Link href="/" className="logo"><i aria-hidden="true">★</i>Hoofdrol</Link>
            <nav aria-label="Voettekst">
              <Link href="/privacy">Privacy en foto’s</Link>
              <Link href="/voorwaarden">Voorwaarden</Link>
            </nav>
            <span>Gemaakt in Twente</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
