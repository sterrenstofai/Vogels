import type { MetadataRoute } from 'next';

const site = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/maken/', '/voorbeeld/', '/bestellen/', '/betalen/', '/mijn', '/beheer', '/api/'] }], sitemap: `${site}/sitemap.xml` };
}
