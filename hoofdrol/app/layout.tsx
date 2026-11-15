import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '@fontsource-variable/inter';
import './globals.css';
import { paymentMode } from '@/lib/providers/payment';
import { STORIES } from '@/lib/stories';

export const metadata: Metadata = {
  title: { default: 'Hoofdrol. Een boek met jouw kind als held.', template: '%s · Hoofdrol' },
  description: 'Kies een verhaal, stuur een foto en krijg een gedrukt prentenboek met jouw kind in de hoofdrol.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };
export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        {paymentMode() === 'test' && <div className="testband">Testversie. Er wordt niets afgeschreven en niets gedrukt.</div>}
        <header className="nav">
          <div>
            <Link href="/" className="logo">Hoofdrol</Link>
            <nav className="pills" aria-label="Hoofdmenu">
              <Link className="pill hide-s" href="/#verhalen">Verhalen</Link>
              <Link className="pill hide-s" href="/#zo-werkt-het">Zo werkt het</Link>
              <Link className="pill hide-s" href="/#prijs">Prijs</Link>
              <Link className="pill hide-s" href="/#vragen">Vragen</Link>
              <Link className="pill koop" href={`/bestellen/${STORIES[0].slug}`}>Bestel</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer>
          <div className="wrap">
            <span>© 2026 Hoofdrol</span>
            <nav aria-label="Voettekst">
              <Link href="/privacy">Privacy en foto’s</Link>
              <Link href="/voorwaarden">Voorwaarden</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
