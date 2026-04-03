import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { DynastyProgress } from '@/components/profile/DynastyProgress';
import { PostCard } from '@/components/feed/PostCard';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return {
    title: `@${username} | CFB Social Profile`,
    description: `Check out @${username}'s college football takes, predictions, and dynasty stats on CFB Social.`,
    openGraph: {
      title: `@${username} | CFB Social`,
      description: `@${username}'s college football takes and dynasty stats.`,
    },
  };
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="gridiron-card overflow-hidden">
        <div className="skeleton h-24 w-full" />
        <div className="p-6">
          <div className="-mt-12">
            <div className="skeleton h-24 w-24 rounded-full" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="gridiron-card p-4">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent username={username} />
    </Suspense>
  );
}

async function ProfileContent({ username }: { username: string }) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Fetch user profile with school join
  const { data: user, error } = await supabase
    .from('profiles')
    .select(`
      *,
      school:schools!profiles_school_id_fkey(
        id, name, abbreviation, primary_color, secondary_color, logo_url
      )
    `)
    .eq('username', username)
    .single();

  if (error || !user) {
    notFound();
  }

  // Check if viewing own profile (works for primary + alt profiles via owner_id)
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const isOwnProfile = !!authUser && (authUser.id === user.id || authUser.id === user.owner_id);

  // Fetch user's posts with author + school joins (same shape as feed)
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(
        id, username, display_name, avatar_url, school_id, dynasty_tier
      ),
      school:schools!posts_school_id_fkey(
        id, name, abbreviation, primary_color, secondary_color, logo_url, slug
      )
    `)
    .eq('author_id', user.id)
    .eq('status', 'PUBLISHED')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <ProfileHeader user={user} isOwnProfile={isOwnProfile} />

      <DynastyProgress
        xp={user.xp ?? 0}
        level={user.level ?? 1}
        dynastyTier={user.dynasty_tier ?? 'WALK_ON'}
      />

      <ProfileStats
        postCount={user.post_count ?? 0}
        touchdownCount={user.touchdown_count ?? 0}
        fumbleCount={user.fumble_count ?? 0}
        predictionCount={user.prediction_count ?? 0}
        correctPredictions={user.correct_predictions ?? 0}
        challengeWins={user.challenge_wins ?? 0}
        challengeLosses={user.challenge_losses ?? 0}
      />

      {/* User's posts */}
      <div>
        <h2 className="mb-4 font-serif text-xl font-semibold">Posts</h2>
        {!posts || posts.length === 0 ? (
          <div className="gridiron-card p-6 text-center text-[var(--text-muted)]">
            No posts yet. Time to make some noise.
          </div>
        ) : (
          <div className="space-y-4">
            {(posts as Record<string, unknown>[]).map((post) => (
              <PostCard key={post.id as string} post={post as never} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
