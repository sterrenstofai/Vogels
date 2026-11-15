import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Boek } from '@/components/Cover';
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
        <div className="toon"><Boek story={story} naam="jouw kind" /></div>
        <div className="stel">
          <span className="hand">{story.leeftijd}</span>
          <h1>{story.titel}</h1>
          <p>{story.kort}</p>
          <p>{story.scenes.length} platen met jouw kind als held, in korte zinnen om zelf te lezen. Vanaf {euro(PRIJZEN.boek.softcover)}.</p>
          <Link className="btn" href={`/bestellen/${story.slug}`}>Bestel dit boek</Link>
        </div>
      </div>
      <div className="wrap" style={{ marginTop: 110 }}>
        <h2>Zo begint het.</h2>
        <div className="proefbladen">
          {story.scenes.slice(0, 6).map((s, i) => <div className="proefblad" key={i}>{vulNaam(s.tekst, 'Fos')}</div>)}
        </div>
      </div>
    </main>
  );
}
