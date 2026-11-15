import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getOrder } from '@/lib/store';
import { getStory, voorbeeldPlaten } from '@/lib/stories';
import { boekBladen } from '@/lib/boek';
import { PRIJZEN, euro } from '@/lib/pricing';
import { Stappen } from '@/components/Stappen';
import { Bladerboek } from '@/components/Bladerboek';

export const metadata = { title: 'Voorbeeld', robots: { index: false } };

export default async function Voorbeeld({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  if (order.status !== 'draft' && order.status !== 'awaiting_payment') redirect(`/maken/${id}`);
  const story = getStory(order.storySlug)!;
  return (
    <main className="pagina">
      <div className="wrap">
        <Stappen nu={1} />
        <div className="kop midden" style={{ marginBottom: 34 }}>
          <h1>Zo wordt het boek van {order.childName}.</h1>
          <p>{story.voorbeeld ? `De tekst is al van ${order.childName}. De platen hieronder komen uit het voorbeeldboek van ${story.voorbeeld.naam}; die van ${order.childName} maken we met jullie foto, zodra je hebt besteld.` : 'De tekst staat er al. De platen maken we met de foto, zodra je hebt besteld.'}</p>
        </div>
        <Bladerboek story={story} naam={order.childName} bladen={boekBladen(story, order.childName, order.opdracht)} platen={voorbeeldPlaten(story)} />
        <div className="cta" style={{ marginTop: 40 }}>
          <Link className="btn" href={`/bestellen/${id}`}>Bestel dit boek voor {euro(PRIJZEN.boek[order.format])}</Link>
          <Link className="pijl" href={`/ontwerpen/${story.slug}`}>Pas het ontwerp aan</Link>
        </div>
      </div>
    </main>
  );
}
