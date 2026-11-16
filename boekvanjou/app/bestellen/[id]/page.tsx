import { notFound, redirect } from 'next/navigation';
import { Boek } from '@/components/Cover';
import { Stappen } from '@/components/Stappen';
import { getStory } from '@/lib/stories';
import { getOrder } from '@/lib/store';
import { BestelFormulier } from './BestelFormulier';

export const metadata = { title: 'Bestellen', robots: { index: false } };

export default async function Bestellen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  if (order.status !== 'draft' && order.status !== 'awaiting_payment') redirect(`/maken/${id}`);
  const story = getStory(order.storySlug)!;
  return (
    <main className="pagina">
      <div className="wrap">
        <Stappen nu={2} />
        <div className="twee">
          <div className="stel">
            <h1>Bestellen.</h1>
            <p>{story.titel}, met {order.childName} in de hoofdrol. Na het betalen stuur je de foto in en maken we de platen.</p>
            <div className="toon" style={{ width: '100%' }}><Boek story={story} naam={order.childName} foto={story.omslag} /></div>
          </div>
          <BestelFormulier id={id} start={order.format} />
        </div>
      </div>
    </main>
  );
}
