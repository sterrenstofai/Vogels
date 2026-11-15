'use client';
import { useState } from 'react';

export function TestBetaalKnop({ id }: { id: string }) {
  const [bezig, setBezig] = useState(false);
  return (
    <button
      className="btn"
      disabled={bezig}
      onClick={async () => {
        setBezig(true);
        await fetch('/api/test/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        window.location.href = `/maken/${id}`;
      }}
    >
      <span>Doe alsof ik betaal</span><b aria-hidden="true">→</b>
    </button>
  );
}
