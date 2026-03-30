import { Suspense } from 'react';
import { ExportsClient } from './ExportsClient';

export const dynamic = 'force-dynamic';

export default function ExportsPage() {
  return (
    <Suspense>
      <ExportsClient />
    </Suspense>
  );
}
