import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedPosts, countPublishedPosts, type BlogListItem } from '@/lib/blog/queries';
import { CollectionPageJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const revalidate = 300;

const TITLE = 'The Wire — College Football Previews & Analysis | CFB Social';
const DESCRIPTION =
  'Matchup previews, rivalry breakdowns, and college football analysis from The Wire on CFB Social. Fresh takes on every big game.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://www.cfbsocial.com/blog' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.cfbsocial.com/blog',
    type: 'website',
    images: [{ url: 'https://www.cfbsocial.com/og/home.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function BlogIndexPage() {
  const [posts, total] = await Promise.all([getPublishedPosts({ limit: 24 }), countPublishedPosts()]);

  return (
    <>
      <CollectionPageJsonLd
        name="The Wire — College Football Previews & Analysis"
        description={DESCRIPTION}
        url="https://www.cfbsocial.com/blog"
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.cfbsocial.com' },
          { name: 'The Wire', url: 'https://www.cfbsocial.com/blog' },
        ]}
      />

      <header className="blog-masthead">
        <p className="blog-masthead-kicker">CFB Social</p>
        <h1 className="blog-masthead-title">The Wire</h1>
        <p className="blog-masthead-sub">
          Matchup previews, rivalry breakdowns, and college football analysis. Read the storylines before kickoff.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="blog-empty">
          <p>No stories on The Wire yet. Check back soon for the first previews.</p>
        </div>
      ) : (
        <div className="blog-grid">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {total > posts.length && (
        <p className="blog-count-note">Showing {posts.length} of {total} stories.</p>
      )}
    </>
  );
}

function BlogCard({ post }: { post: BlogListItem }) {
  return (
    <Link href={`/blog/${post.slug}`} className="blog-card">
      {post.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_image_url} alt="" className="blog-card-cover" loading="lazy" />
      ) : (
        <div className="blog-card-cover blog-card-cover-fallback" aria-hidden="true">
          <span>The Wire</span>
        </div>
      )}
      <div className="blog-card-body">
        <h2 className="blog-card-title">{post.title}</h2>
        {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
        <div className="blog-card-meta">
          <span className="blog-card-date">{formatDate(post.published_at ?? post.created_at)}</span>
          {post.tags && post.tags.length > 0 && (
            <span className="blog-card-tags">
              {post.tags.slice(0, 3).map((t) => (
                <span key={t} className="blog-card-tag">{t}</span>
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
