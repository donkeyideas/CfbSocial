import { Suspense } from 'react';
import { XpEconomyClient } from './XpEconomyClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'XP Economy — Admin' };

export default function XpEconomyPage() {
  return (
    <div className="space-y-6">
      <h1 className="admin-section-title">XP Economy</h1>
      <Suspense fallback={<div className="admin-card p-6">Loading XP configuration...</div>}>
        <XpEconomyClient />
      </Suspense>
    </div>
  );
}
