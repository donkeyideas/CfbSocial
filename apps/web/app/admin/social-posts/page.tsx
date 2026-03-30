import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { SocialPostsClient } from '@/components/admin/social-posts/social-posts-client';

export const metadata = { title: 'Social Posts' };

export const dynamic = 'force-dynamic';

export default function SocialPostsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Social Posts</h1>
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <SocialPostsData />
      </Suspense>
    </div>
  );
}

async function SocialPostsData() {
  const {
    getSocialPosts,
    getAutomationConfig,
    getCredentials,
  } = await import('@/lib/admin/actions/social-posts');

  const [posts, automationConfig, credentials] = await Promise.all([
    getSocialPosts(),
    getAutomationConfig(),
    getCredentials(),
  ]);

  return (
    <SocialPostsClient
      posts={posts}
      automationConfig={automationConfig}
      credentials={credentials}
    />
  );
}
