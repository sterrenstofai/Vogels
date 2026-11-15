import { notFound } from 'next/navigation';
import { getStory } from '@/lib/stories';
import { Stappen } from '@/components/Stappen';
import { Ontwerper } from './Ontwerper';

export const metadata = { title: 'Ontwerp jullie boek' };

export default async function Ontwerpen({ params }: { params: Promise<{ slug: string }> }) {
  const story = getStory((await params).slug);
  if (!story?.beschikbaar) notFound();
  return (
    <main className="pagina">
      <div className="wrap">
        <Stappen nu={0} />
        <Ontwerper story={story} />
      </div>
    </main>
  );
}
