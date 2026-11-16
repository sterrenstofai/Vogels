import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/store';
import { Werkplaats } from './Werkplaats';

export const metadata = { title: 'Jullie boek', robots: { index: false } };

export default async function Maken({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getOrder(id))) notFound();
  return (
    <main className="pagina">
      <div className="wrap" style={{ maxWidth: 860 }}>
        <Werkplaats id={id} />
      </div>
    </main>
  );
}
