import { notFound } from 'next/navigation';
import { Cover } from '@/components/Cover';
import { Knop } from '@/components/Knop';
import { getStory, vulNaam } from '@/lib/stories';
import { PRIJZEN, euro } from '@/lib/pricing';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getStory((await params).slug)?.titel };
}

export default async function Verhaal({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story?.beschikbaar) notFound();
  return (
    <main className="pagina">
      <div className="wrap twee">
        <Cover story={story} naam="jouw kind" />
        <div style={{ display: 'grid', gap: 18 }}>
          <span className="hand" style={{ justifySelf: 'start' }}>{story.leeftijd}</span>
          <h1>{story.titel}</h1>
          <p style={{ fontSize: '1.15rem' }}>{story.kort}</p>
          <p>{story.scenes.length} platen met jouw kind als held, in korte zinnen om zelf te lezen. Vanaf {euro(PRIJZEN.boek.softcover)}.</p>
          <div><Knop href={`/bestellen/${story.slug}`}>Bestel dit boek</Knop></div>
        </div>
      </div>
      <div className="wrap" style={{ marginTop: 60 }}>
        <h2 style={{ fontSize: '2.2rem' }}>Zo begint het</h2>
        <div className="proefbladen">
          {story.scenes.slice(0, 6).map((s, i) => <div className="proefblad" key={i}>{vulNaam(s.tekst, 'Fos')}</div>)}
        </div>
      </div>
    </main>
  );
}
