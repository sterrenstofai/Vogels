import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getOrder } from '@/lib/store';
import { getStory, vulNaam } from '@/lib/stories';
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
          <p>De tekst staat er al. De platen maken we met de foto, zodra je hebt besteld.</p>
        </div>
        <Bladerboek story={story} naam={order.childName} opdracht={order.opdracht} platen={story.scenes.map((s) => ({ tekst: vulNaam(s.tekst, order.childName), beeld: s.beeld }))} />
        <div className="cta" style={{ marginTop: 40 }}>
          <Link className="btn" href={`/bestellen/${id}`}>Bestel dit boek voor {euro(PRIJZEN.boek[order.format])}</Link>
          <Link className="pijl" href={`/ontwerpen/${story.slug}`}>Pas het ontwerp aan</Link>
        </div>
      </div>
    </main>
  );
}
