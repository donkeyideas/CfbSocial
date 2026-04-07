import { Suspense } from 'react';
import { AchievementCard } from '@/components/dynasty/AchievementCard';
import { DynastyLeaderboard } from '@/components/dynasty/DynastyLeaderboard';
import { DynastyTierBadge } from '@/components/dynasty/DynastyTierBadge';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dynasty Mode | Build Your College Football Legacy',
  description: 'Build your college football dynasty on CFB Social. Earn XP, unlock achievements, climb the leaderboard, and rise through tiers from Walk-On to Hall of Fame across 653 schools.',
  openGraph: {
    title: 'Dynasty Mode | CFB Social',
    description: 'Build your college football dynasty. Earn XP, unlock achievements, and climb the leaderboard.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com/dynasty',
  },
};

interface DynastyPageProps {
  searchParams: Promise<{ tab?: string }>;
}

const tabs = [
  { key: 'profile', label: 'My Dynasty' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'achievements', label: 'Achievements' },
] as const;

type DynastyTab = (typeof tabs)[number]['key'];

export default async function DynastyPage({ searchParams }: DynastyPageProps) {
  const params = await searchParams;
  const tab = (params.tab as DynastyTab) || 'profile';

  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Dynasty Mode</h1>
        <div className="feed-tabs">
          {tabs.map((t) => (
            <a
              key={t.key}
              href={`/dynasty${t.key === 'profile' ? '' : `?tab=${t.key}`}`}
              className={`feed-tab ${tab === t.key ? 'active' : ''}`}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      <section style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 16, padding: '0 4px' }}>
        <p>
          Dynasty Mode is how you build your legacy on CFB Social. Earn XP by posting takes, winning challenges, nailing predictions, and engaging with the college football fan community. Rise through the tiers from Walk-On to Starter, All-Conference, All-American, Heisman, and ultimately Hall of Fame. Unlock achievements for milestones like your first touchdown, first correct prediction, or first rivalry challenge won. Compete on the all-time dynasty leaderboard against fans from all 653 schools. Every interaction counts toward your dynasty, from voting on posts to filing receipts on bold takes. Dynasty Mode rewards the most active, most accurate, and most respected voices in the college football fan community. Track your XP history, see which activities earn the most points, and plan your path to the top tier. Your dynasty is your permanent record on CFB Social.
        </p>
      </section>

      <Suspense fallback={<DynastySkeleton />}>
        {tab === 'profile' && <DynastyProfile />}
        {tab === 'leaderboard' && <LeaderboardSection />}
        {tab === 'achievements' && <AchievementsSection />}
      </Suspense>
    </div>
  );
}

function DynastySkeleton() {
  return (
    <div className="content-card" style={{ padding: 24 }}>
      <div className="skeleton" style={{ width: 180, height: 18, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '100%', height: 12, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '60%', height: 12 }} />
    </div>
  );
}

async function DynastyProfile() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>Sign in to view your dynasty.</p>
      </div>
    );
  }

  const { getDynastyProfile } = await import('@cfb-social/api');
  const dynasty = await getDynastyProfile(supabase, user.id);
  const { profile, achievements, xpLog } = dynasty;

  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600, 8200, 10000, 12500, 15500, 19000, 23000, 28000, 34000, 41000, 50000];
  const currentLevel = profile.level ?? 1;
  const currentXP = profile.xp ?? 0;
  const currentThreshold = thresholds[currentLevel - 1] ?? 0;
  const nextThreshold = thresholds[currentLevel] ?? thresholds[thresholds.length - 1]!;
  const progressPct = nextThreshold > currentThreshold
    ? Math.min(100, ((currentXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Profile Card */}
      <div className="content-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--dark-brown)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 700, color: 'var(--cream)',
            fontFamily: 'var(--serif)',
          }}>
            {(profile.display_name ?? profile.username)?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontWeight: 700 }}>
              {profile.display_name ?? profile.username}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <DynastyTierBadge tier={profile.dynasty_tier ?? 'WALK_ON'} size="md" />
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Level {currentLevel}
              </span>
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--sans)', fontSize: '0.75rem', marginBottom: 4 }}>
            <span style={{ fontWeight: 700 }}>{currentXP.toLocaleString()} XP</span>
            <span style={{ color: 'var(--text-muted)' }}>{nextThreshold.toLocaleString()} XP to Lvl {currentLevel + 1}</span>
          </div>
          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progressPct}%`,
              background: 'var(--crimson)', borderRadius: 4,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
          {[
            { label: 'Posts', value: profile.post_count ?? 0 },
            { label: 'Touchdowns', value: profile.touchdown_count ?? 0 },
            { label: 'Followers', value: profile.follower_count ?? 0 },
            { label: 'Achievements', value: achievements.length },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 700 }}>
                {stat.value.toLocaleString()}
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent XP Activity */}
      {xpLog.length > 0 && (
        <div className="content-card" style={{ padding: '16px 24px' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
            Recent XP Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {xpLog.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem' }}>
                    {entry.description ?? entry.source}
                  </span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)' }}>
                  +{entry.amount} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Achievements */}
      {achievements.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 700, marginBottom: 8, paddingLeft: 4 }}>
            Unlocked Achievements
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {achievements.slice(0, 5).map((ua) => (
              <AchievementCard
                key={ua.id}
                name={ua.achievement.name}
                description={ua.achievement.description}
                category={ua.achievement.category}
                xpReward={ua.achievement.xp_reward}
                unlocked={true}
                earnedAt={ua.earned_at}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function LeaderboardSection() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { getDynastyLeaderboard } = await import('@cfb-social/api');

  const users = await getDynastyLeaderboard(supabase, { limit: 25 });

  return (
    <div>
      <div className="content-card" style={{ padding: '16px 20px', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 700 }}>
          All-Time Dynasty Rankings
        </h3>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Top users by total XP earned across all activities.
        </p>
      </div>
      <DynastyLeaderboard users={users} />
    </div>
  );
}

async function AchievementsSection() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { getAchievements, getUserAchievements } = await import('@cfb-social/api');

  const allAchievements = await getAchievements(supabase);
  const userAchievements = user ? await getUserAchievements(supabase, user.id) : [];
  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));

  // Group by category
  const categories = new Map<string, typeof allAchievements>();
  for (const ach of allAchievements) {
    const list = categories.get(ach.category) ?? [];
    list.push(ach);
    categories.set(ach.category, list);
  }

  const categoryLabels: Record<string, string> = {
    SOCIAL: 'Social',
    PREDICTION: 'Prediction',
    RIVALRY: 'Rivalry',
    RECRUITING: 'Recruiting',
    ENGAGEMENT: 'Engagement',
    MILESTONE: 'Milestone',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="content-card" style={{ padding: '16px 20px' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 700 }}>
          Achievements
        </h3>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {unlockedIds.size} of {allAchievements.length} unlocked
        </p>
      </div>

      {Array.from(categories.entries()).map(([category, achievements]) => (
        <div key={category}>
          <h4 style={{
            fontFamily: 'var(--sans)', fontSize: '0.75rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '1.5px',
            color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4,
          }}>
            {categoryLabels[category] ?? category}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {achievements.map((ach) => (
              <AchievementCard
                key={ach.id}
                name={ach.name}
                description={ach.description}
                category={ach.category}
                xpReward={ach.xp_reward}
                unlocked={unlockedIds.has(ach.id)}
                earnedAt={userAchievements.find((ua) => ua.achievement_id === ach.id)?.earned_at}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
