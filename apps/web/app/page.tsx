import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CFB Social — The College Football Fan Community | Debates, Predictions & Transfer Portal',
  description:
    'CFB Social is the college football fan community where you debate rivalries, file predictions, track the transfer portal, and build your dynasty across 653 FBS and FCS programs. Join the conversation.',
  keywords: [
    'college football forum',
    'college football fan community',
    'CFB fan debates',
    'college football predictions',
    'college football message boards',
    'college football social media',
    'college football fan opinions',
    'transfer portal tracker',
    'college football takes',
    'best college football forums',
    'top college football forums online',
    'real-time CFB fan reactions',
    'join college football discussion',
    'college football fan content',
  ],
  openGraph: {
    type: 'website',
    siteName: 'CFB Social',
    title: 'CFB Social — College Football Fan Community',
    description:
      'The college football fan community. Debate rivalries, file predictions, track the transfer portal, and build your dynasty.',
    url: 'https://cfbsocial.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CFB Social — College Football Fan Community',
    description:
      'The college football fan community. Debate rivalries, file predictions, track the portal, build your dynasty.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com',
  },
};

export default async function HomePage() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { count: userCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  const { count: postCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PUBLISHED');

  const { count: schoolCount } = await supabase
    .from('schools')
    .select('id', { count: 'exact', head: true });

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://cfbsocial.com' },
        ]}
      />
      <div className="landing-page">
        {/* Hero */}
        <header className="landing-hero">
          <div className="landing-hero-inner">
            <h1 className="landing-h1">The College Football Fan Community</h1>
            <p className="landing-subtitle">
              CFB Social is where college football fans debate rivalries, file predictions, track the transfer portal, and build their dynasty. 653 schools. One community. No gatekeepers.
            </p>
            <div className="landing-cta-row">
              <Link href="/register" className="landing-cta-primary">
                Join the Community
              </Link>
              <Link href="/feed" className="landing-cta-secondary">
                Browse the Feed
              </Link>
            </div>
            <div className="landing-stats-row">
              <div className="landing-stat">
                <span className="landing-stat-value">{schoolCount?.toLocaleString() ?? '653'}</span>
                <span className="landing-stat-label">Schools</span>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-value">{(userCount ?? 0).toLocaleString()}</span>
                <span className="landing-stat-label">Fans</span>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-value">{(postCount ?? 0).toLocaleString()}</span>
                <span className="landing-stat-label">Takes Filed</span>
              </div>
            </div>
          </div>
        </header>

        {/* Features — targeting keyword clusters */}
        <section className="landing-section">
          <h2 className="landing-h2">Everything a College Football Fan Needs</h2>
          <div className="landing-features">
            <div className="landing-feature-card">
              <h3 className="landing-h3">College Football Fan Debates</h3>
              <p className="landing-feature-text">
                Take sides in school-vs-school rivalry debates. Issue challenges to fans from opposing programs and let the community judge. Every debate is tracked, scored, and remembered.
              </p>
              <Link href="/rivalry" className="landing-feature-link">Enter the Rivalry Ring</Link>
            </div>

            <div className="landing-feature-card">
              <h3 className="landing-h3">College Football Predictions</h3>
              <p className="landing-feature-text">
                File your college football predictions and put your takes on record. When the results come in, the platform delivers the receipts. Build your prediction track record over time.
              </p>
              <Link href="/predictions" className="landing-feature-link">Make a Prediction</Link>
            </div>

            <div className="landing-feature-card">
              <h3 className="landing-h3">Transfer Portal Tracker</h3>
              <p className="landing-feature-text">
                Track every transfer portal entry and commitment across all FBS programs. Filter by position, star rating, and status. See which schools are winning and losing the portal wars.
              </p>
              <Link href="/portal" className="landing-feature-link">Track the Portal</Link>
            </div>

            <div className="landing-feature-card">
              <h3 className="landing-h3">Live Game-Day Threads</h3>
              <p className="landing-feature-text">
                Join real-time game threads during every college football game. Live scores, quick reactions, and fan commentary in one place. The digital tailgate for every matchup.
              </p>
              <Link href="/war-room" className="landing-feature-link">Enter the War Room</Link>
            </div>

            <div className="landing-feature-card">
              <h3 className="landing-h3">College Football Fan Community</h3>
              <p className="landing-feature-text">
                Join the college football discussion with fans from all 653 programs. Share takes, react to news, and follow fans from your school or across the country. No paywalls, no algorithms.
              </p>
              <Link href="/feed" className="landing-feature-link">Join the Conversation</Link>
            </div>

            <div className="landing-feature-card">
              <h3 className="landing-h3">Dynasty System &amp; Recruiting</h3>
              <p className="landing-feature-text">
                Earn XP for every take, prediction, and debate. Rise through the dynasty tiers from Walk-On to Hall of Fame. Track recruiting activity and claim portal players for your school.
              </p>
              <Link href="/recruiting" className="landing-feature-link">See the Recruiting Desk</Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="landing-section landing-section-alt">
          <h2 className="landing-h2">How CFB Social Works</h2>
          <div className="landing-steps">
            <div className="landing-step">
              <span className="landing-step-number">1</span>
              <h3 className="landing-h3">Pick Your School</h3>
              <p className="landing-feature-text">Choose from 653 college football programs. Your school colors, your community, your identity.</p>
            </div>
            <div className="landing-step">
              <span className="landing-step-number">2</span>
              <h3 className="landing-h3">Stake Your Claims</h3>
              <p className="landing-feature-text">Post takes, file predictions, enter rivalry debates, and track the transfer portal.</p>
            </div>
            <div className="landing-step">
              <span className="landing-step-number">3</span>
              <h3 className="landing-h3">Build Your Dynasty</h3>
              <p className="landing-feature-text">Earn XP from community engagement. Rise through dynasty tiers. Let your track record speak.</p>
            </div>
          </div>
        </section>

        {/* FAQ targeting long-tail keywords */}
        <section className="landing-section">
          <h2 className="landing-h2">Frequently Asked Questions</h2>
          <div className="landing-faq">
            <details className="landing-faq-item">
              <summary className="landing-faq-q">What is CFB Social?</summary>
              <p className="landing-faq-a">CFB Social is a free college football fan community where you can debate rivalries, file predictions, track the transfer portal, and build your dynasty across 653 FBS and FCS programs. Think of it as the college football message board built for the modern fan.</p>
            </details>
            <details className="landing-faq-item">
              <summary className="landing-faq-q">Is CFB Social free to use?</summary>
              <p className="landing-faq-a">Yes, CFB Social is completely free. No paywalls, no premium tiers, no algorithms hiding your content. Every feature is available to every fan.</p>
            </details>
            <details className="landing-faq-item">
              <summary className="landing-faq-q">How is this different from other college football forums?</summary>
              <p className="landing-faq-a">Unlike traditional college football message boards, CFB Social has built-in predictions tracking (with receipts), a live transfer portal tracker, real-time game-day threads, school-vs-school rivalry debates, and a dynasty progression system that rewards your best takes.</p>
            </details>
            <details className="landing-faq-item">
              <summary className="landing-faq-q">Can I track the college football transfer portal?</summary>
              <p className="landing-faq-a">Yes. The Portal Wire tracks every transfer portal entry and commitment across FBS. Filter by position, star rating, and status. You can also claim players for your school and predict where they will commit.</p>
            </details>
            <details className="landing-faq-item">
              <summary className="landing-faq-q">How do college football predictions work?</summary>
              <p className="landing-faq-a">File a prediction on any college football topic. When the outcome is decided, the community delivers the verdict: Receipt (you were right), Bust (you were wrong), or Push (too close to call). Your prediction track record is permanently on your profile.</p>
            </details>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="landing-section landing-section-cta">
          <h2 className="landing-h2">Ready to Join the Best College Football Fan Community?</h2>
          <p className="landing-subtitle">
            Thousands of college football fans are already debating, predicting, and building their dynasty. Your school is waiting.
          </p>
          <div className="landing-cta-row">
            <Link href="/register" className="landing-cta-primary">
              Create Your Free Account
            </Link>
            <Link href="/feed" className="landing-cta-secondary">
              Browse Without Signing Up
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <div className="landing-footer-col">
              <h4 className="landing-footer-heading">CFB Social</h4>
              <p className="landing-footer-text">The college football fan community. Built by fans, for fans.</p>
            </div>
            <div className="landing-footer-col">
              <h4 className="landing-footer-heading">Features</h4>
              <Link href="/feed" className="landing-footer-link">The Feed</Link>
              <Link href="/rivalry" className="landing-footer-link">Rivalry Ring</Link>
              <Link href="/predictions" className="landing-footer-link">Predictions</Link>
              <Link href="/portal" className="landing-footer-link">Portal Wire</Link>
              <Link href="/war-room" className="landing-footer-link">War Room</Link>
              <Link href="/recruiting" className="landing-footer-link">Recruiting</Link>
            </div>
            <div className="landing-footer-col">
              <h4 className="landing-footer-heading">Legal</h4>
              <Link href="/privacy" className="landing-footer-link">Privacy Policy</Link>
              <Link href="/terms" className="landing-footer-link">Terms of Service</Link>
              <Link href="/contact" className="landing-footer-link">Contact</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* FAQ Schema for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is CFB Social?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'CFB Social is a free college football fan community where you can debate rivalries, file predictions, track the transfer portal, and build your dynasty across 653 FBS and FCS programs.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is CFB Social free to use?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes, CFB Social is completely free. No paywalls, no premium tiers, no algorithms hiding your content.',
                },
              },
              {
                '@type': 'Question',
                name: 'How is this different from other college football forums?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Unlike traditional college football message boards, CFB Social has built-in predictions tracking with receipts, a live transfer portal tracker, real-time game-day threads, school-vs-school rivalry debates, and a dynasty progression system.',
                },
              },
              {
                '@type': 'Question',
                name: 'Can I track the college football transfer portal?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes. The Portal Wire tracks every transfer portal entry and commitment across FBS. Filter by position, star rating, and status.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do college football predictions work?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'File a prediction on any college football topic. When the outcome is decided, the community delivers the verdict: Receipt, Bust, or Push. Your prediction track record is permanently on your profile.',
                },
              },
            ],
          }),
        }}
      />
    </>
  );
}
