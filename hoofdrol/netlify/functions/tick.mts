// Roept elke twee minuten de site aan, zodat bestellingen ook doorlopen als de klant weg is.
export default async () => {
  const site = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
  if (!site || !process.env.CRON_SECRET) return new Response('niet ingesteld');
  const res = await fetch(`${site}/api/cron/tick`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  return new Response(await res.text(), { status: res.status });
};

export const config = { schedule: '*/2 * * * *' };
