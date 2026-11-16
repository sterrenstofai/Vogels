import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Boek } from '@/components/Cover';
import { getStory, voorbeeldPlaten } from '@/lib/stories';
import { boekBladen } from '@/lib/boek';
import { Bladerboek } from '@/components/Bladerboek';
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
        <div className="toon"><Boek story={story} naam="jouw kind" foto={voorbeeldPlaten(story)?.[0]} /></div>
        <div className="stel">
          <span className="hand">{story.leeftijd}</span>
          <h1>{story.titel}</h1>
          <p>{story.kort}</p>
          <p>{story.scenes.length} platen met jouw kind als held, in korte zinnen om zelf te lezen. Vanaf {euro(PRIJZEN.boek.softcover)}.</p>
          <Link className="btn" href={`/ontwerpen/${story.slug}`}>Ontwerp dit boek</Link>
        </div>
      </div>
      <div className="wrap" style={{ marginTop: 110 }}>
        <div className="kop midden">
          <h2>Blader door een voorbeeld.</h2>
          <p>{story.voorbeeld ? `Dit is het boek van ${story.voorbeeld.naam}. In jullie boek staat jullie eigen kind op elke plaat.` : 'Zo is het boek opgebouwd.'}</p>
        </div>
        <Bladerboek story={story} naam={story.voorbeeld?.naam ?? 'jouw kind'} bladen={boekBladen(story, story.voorbeeld?.naam ?? 'jouw kind', '')} platen={voorbeeldPlaten(story)} />
        {story.voorbeeld && <p className="noot" style={{ textAlign: 'center', marginTop: 18 }}>{story.voorbeeld.naam} is een verzonnen kind. De platen zijn gemaakt op dezelfde manier als die voor jullie boek.</p>}
        <div className="cta" style={{ marginTop: 34 }}><Link className="btn" href={`/ontwerpen/${story.slug}`}>Ontwerp dit boek</Link></div>
      </div>
    </main>
  );
}
