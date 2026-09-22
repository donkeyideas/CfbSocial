import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPublishedPostBySlug,
  getRelatedPosts,
  getAllPublishedSlugs,
  incrementViews,
  type BlogListItem,
} from '@/lib/blog/queries';
import { JsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const revalidate = 300;

const BASE = 'https://www.cfbsocial.com';
const FALLBACK_OG = `${BASE}/og/home.jpg`;

export async function generateStaticParams() {
  try {
    const slugs = await getAllPublishedSlugs();
    return slugs.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) {
    return { title: 'Story not found | CFB Social' };
  }
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || 'College football preview and analysis on CFB Social.';
  const url = `${BASE}/blog/${post.slug}`;
  const image = post.cover_image_url || FALLBACK_OG;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: image }],
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

/* Strip HTML for word-count / reading time */
function readingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  // Fire-and-forget view increment; do not block render.
  void incrementViews(post.id);

  const related = await getRelatedPosts(post.id, post.tags ?? [], 3);
  const url = `${BASE}/blog/${post.slug}`;
  const published = post.published_at ?? post.created_at;
  const mins = readingTime(post.content);
  const hasFaqs = Array.isArray(post.faqs) && post.faqs.length > 0;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.meta_description || post.excerpt || undefined,
          image: post.cover_image_url || FALLBACK_OG,
          datePublished: published,
          dateModified: post.updated_at,
          author: { '@type': 'Organization', name: 'CFB Social' },
          publisher: {
            '@type': 'Organization',
            name: 'CFB Social',
            logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          ...(post.keywords ? { keywords: post.keywords } : {}),
        }}
      />
      {hasFaqs && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: post.faqs.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          }}
        />
      )}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE },
          { name: 'The Wire', url: `${BASE}/blog` },
          { name: post.title, url },
        ]}
      />

      <article className="blog-article">
        <nav className="blog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true"> / </span>
          <Link href="/blog">The Wire</Link>
          <span aria-hidden="true"> / </span>
          <span className="blog-breadcrumb-current">{post.title}</span>
        </nav>

        <h1 className="blog-article-title">{post.title}</h1>

        <div className="blog-article-meta">
          <span>{formatDate(published)}</span>
          <span aria-hidden="true"> · </span>
          <span>{mins} min read</span>
        </div>

        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_image_url} alt="" className="blog-article-cover" />
        )}

        <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.content }} />

        {hasFaqs && (
          <section className="blog-faqs" aria-label="Frequently asked questions">
            <h2 className="blog-faqs-title">Frequently Asked Questions</h2>
            {post.faqs.map((faq, i) => (
              <details key={i} className="blog-faq">
                <summary className="blog-faq-q">{faq.question}</summary>
                <div className="blog-faq-a">{faq.answer}</div>
              </details>
            ))}
          </section>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="blog-article-tags">
            {post.tags.map((t) => (
              <span key={t} className="blog-card-tag">{t}</span>
            ))}
          </div>
        )}

        <div className="blog-cta">
          <p>Have a take on this matchup? Take it to the community.</p>
          <div className="blog-cta-links">
            <Link href="/rivalry" className="blog-cta-btn">Enter the Rivalry Ring</Link>
            <Link href="/predictions" className="blog-cta-btn blog-cta-btn-ghost">File a prediction</Link>
          </div>
        </div>

        {related.length > 0 && (
          <section className="blog-related" aria-label="Related stories">
            <h2 className="blog-related-title">More from The Wire</h2>
            <div className="blog-related-grid">
              {related.map((r: BlogListItem) => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="blog-related-card">
                  <span className="blog-related-card-title">{r.title}</span>
                  {r.excerpt && <span className="blog-related-card-excerpt">{r.excerpt}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="blog-back">
          <Link href="/blog">Back to The Wire</Link>
        </div>
      </article>
    </>
  );
}
