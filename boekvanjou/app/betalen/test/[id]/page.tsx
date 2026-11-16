import { notFound, redirect } from 'next/navigation';
import { getOrder } from '@/lib/store';
import { paymentMode } from '@/lib/providers/payment';
import { euro } from '@/lib/pricing';
import { TestBetaalKnop } from './TestBetaalKnop';

export const metadata = { title: 'Testbetaling' };

export default async function TestBetalen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order || paymentMode() !== 'test') notFound();
  if (order.status !== 'awaiting_payment') redirect(`/maken/${id}`);
  return (
    <main className="pagina">
      <div className="wrap" style={{ maxWidth: 560 }}>
        <div className="status">
          <span className="hand">Testbetaling</span>
          <h1>{euro(order.totaalCents)}</h1>
          <p>Hier komt straks het betaalscherm van Mollie (iDEAL). In deze testversie wordt er niets afgeschreven.</p>
          <TestBetaalKnop id={id} />
        </div>
      </div>
    </main>
  );
}
