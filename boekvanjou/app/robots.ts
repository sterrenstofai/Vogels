import type { MetadataRoute } from 'next';
import { testversie } from '@/lib/stand';

const site = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  // Zolang de winkel een testversie is, hoort hij niet in zoekmachines.
  if (testversie()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/maken/', '/voorbeeld/', '/bestellen/', '/betalen/', '/mijn', '/beheer', '/api/'] }], sitemap: `${site}/sitemap.xml` };
}
