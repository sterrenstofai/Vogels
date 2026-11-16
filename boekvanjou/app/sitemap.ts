import type { MetadataRoute } from 'next';
import { STORIES } from '@/lib/stories';

const site = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site, priority: 1 },
    ...STORIES.filter((s) => s.beschikbaar).map((s) => ({ url: `${site}/verhalen/${s.slug}`, priority: 0.8 })),
    { url: `${site}/privacy` }, { url: `${site}/voorwaarden` },
  ];
}
