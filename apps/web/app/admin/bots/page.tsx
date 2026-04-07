import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'AI Bots' };

export default function BotsPage() {
  return (
    <div className="space-y-6">
      <h1 className="admin-section-title">AI Bots</h1>
      <Suspense fallback={<LoadingSkeleton type="cards" rows={4} />}>
        <BotsData />
      </Suspense>
    </div>
  );
}

async function BotsData() {
  const { getAllBots, getGlobalBotStatus, getBotStats, getBotActivityLog, getPersonalityDistribution, getEventQueue } = await import('@/lib/admin/actions/bots');
  const [{ bots }, globalActive, stats, { logs }, personalityDist, { events }] = await Promise.all([
    getAllBots(),
    getGlobalBotStatus(),
    getBotStats(),
    getBotActivityLog({ limit: 20 }),
    getPersonalityDistribution(),
    getEventQueue(),
  ]);

  // Fetch schools for the create form
  const { createAdminClient } = await import('@/lib/admin/supabase/admin');
  const supabase = createAdminClient();
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, abbreviation, conference, mascot, primary_color')
    .eq('is_active', true)
    .order('conference')
    .order('name');

  const { BotsClient } = await import('@/components/admin/bots/bots-client');

  return (
    <BotsClient
      bots={bots}
      globalActive={globalActive}
      stats={stats}
      recentActivity={logs}
      schools={(schools ?? []) as Array<{ id: string; name: string; abbreviation: string; conference: string; mascot: string; primary_color: string }>}
      personalityDist={personalityDist}
      eventQueue={events}
    />
  );
}
