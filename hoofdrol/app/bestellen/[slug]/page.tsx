import { notFound } from 'next/navigation';
import { Cover } from '@/components/Cover';
import { getStory } from '@/lib/stories';
import { BestelFormulier } from './BestelFormulier';

export const metadata = { title: 'Bestellen' };

export default async function Bestellen({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story?.beschikbaar) notFound();
  return (
    <main className="pagina">
      <div className="wrap twee">
        <div style={{ display: 'grid', gap: 18 }}>
          <h1>Bestel {story.titel.toLowerCase()}</h1>
          <p>Na het betalen stuur je de foto in en maken we de platen. Je bekijkt het hele boek voordat het naar de drukker gaat.</p>
          <div style={{ maxWidth: 300 }}><Cover story={story} /></div>
        </div>
        <BestelFormulier slug={story.slug} />
      </div>
    </main>
  );
}
