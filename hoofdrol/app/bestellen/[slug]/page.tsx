import { notFound } from 'next/navigation';
import { Boek } from '@/components/Cover';
import { getStory } from '@/lib/stories';
import { BestelFormulier } from './BestelFormulier';

export const metadata = { title: 'Bestellen' };

export default async function Bestellen({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story?.beschikbaar) notFound();
  return (
    <main className="pagina">
      <div className="wrap twee">
        <div className="stel">
          <h1>{story.titel}.</h1>
          <p>Na het betalen stuur je de foto in en maken we de platen. Je bekijkt het hele boek voordat het naar de drukker gaat.</p>
          <div className="toon" style={{ width: '100%' }}><Boek story={story} /></div>
        </div>
        <BestelFormulier slug={story.slug} />
      </div>
    </main>
  );
}
