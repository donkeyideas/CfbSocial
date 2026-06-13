import Link from 'next/link';
import type { Metadata } from 'next';
import { FAQPageJsonLd, BreadcrumbJsonLd, VideoGameJsonLd, JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 86400;

const TITLE = 'College Football 26 Dynasty Guide — Share Moments & Join Online Leagues | CFB Social';
const DESC =
  'How to share EA Sports College Football 26 dynasty screenshots, build a magazine of your season, and find an online dynasty league to join on PS5, Xbox, or PC. A free Game Room guide.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'how to share College Football 26 screenshots', 'how to join CFB 26 online dynasty',
    'College Football 26 dynasty guide', 'CFB 26 online dynasty', 'College Football 26 magazine',
  ],
  openGraph: { title: TITLE, description: DESC, type: 'article', images: [{ url: 'https://www.cfbsocial.com/logo.png' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
  alternates: { canonical: 'https://www.cfbsocial.com/game-room/guide' },
};

const FAQS = [
  { question: 'Where can I share my College Football 26 dynasty screenshots?', answer: 'Open the CFB Social Game Room and use the Moments tab to upload your College Football 26 screenshots (up to four per moment). Each moment posts to your feed and can be added to your own magazine issue. It is free.' },
  { question: 'How do I find a College Football 26 online dynasty league to join?', answer: 'Go to the Game Room Leagues directory. Browse open CFB 26 leagues by platform (PS5, Xbox, PC), cross-play, sim schedule, and open schools. Open one to get the in-game League Name and request a spot. Private leagues require commissioner approval.' },
  { question: 'How do I list my own College Football 26 online dynasty?', answer: 'In the Game Room, open the Leagues tab and tap "List your league." Enter your in-game League Name and password, platform, max users, cross-play, sim schedule, open schools, and rules. Set it public to show the password, or private to approve coaches who request to join.' },
  { question: 'What is a Game Room magazine?', answer: 'A magazine is a flip-through issue you build from your College Football 26 moments. Assign moments to an issue, pick a cover, write a masthead and headline, then share the finished issue to the feed for anyone to read.' },
  { question: 'Is CFB Social affiliated with EA Sports?', answer: 'No. CFB Social is an independent fan community. It is not affiliated with or endorsed by EA Sports or Electronic Arts. All College Football 26 content is created by users.' },
  { question: 'What platforms does College Football 26 support?', answer: 'EA Sports College Football 26 is available on PlayStation 5, Xbox Series X|S, and PC. The Game Room league finder lets you filter by platform and cross-play.' },
];

export default function GameRoomGuidePage() {
  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: 'CFB Social', url: 'https://www.cfbsocial.com' },
          { name: 'Game Room', url: 'https://www.cfbsocial.com/game-room' },
          { name: 'Guide', url: 'https://www.cfbsocial.com/game-room/guide' },
        ]}
      />
      <VideoGameJsonLd url="https://www.cfbsocial.com/game-room/guide" />
      <FAQPageJsonLd questions={FAQS} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to share College Football 26 dynasty moments and join an online league',
          step: [
            { '@type': 'HowToStep', name: 'Open the Game Room', text: 'Go to the CFB Social Game Room.' },
            { '@type': 'HowToStep', name: 'Upload a moment', text: 'In the Moments tab, upload your College Football 26 screenshots.' },
            { '@type': 'HowToStep', name: 'Build a magazine', text: 'Assign moments to an issue, pick a cover, and share it to the feed.' },
            { '@type': 'HowToStep', name: 'Find a league', text: 'Browse the Leagues directory and request to join an online dynasty.' },
          ],
        }}
      />

      <div className="feed-header">
        <h1 className="feed-title">College Football 26 Game Room Guide</h1>
      </div>

      <section className="content-card" style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', lineHeight: 1.6 }}>
          The <Link href="/game-room">Game Room</Link> is the free home for <strong>EA Sports College Football 26</strong> players to
          share dynasty screenshots, build a flip-magazine of their season, and find{' '}
          <Link href="/game-room/leagues">online dynasty leagues to join</Link>. Here&apos;s how it works.
        </p>
      </section>

      <section className="content-card">
        <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--dark-brown)', marginBottom: 12 }}>College Football 26 dynasty FAQ</h2>
        {FAQS.map((f) => (
          <div key={f.question} style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'var(--sans)', fontWeight: 700, color: 'var(--ink)', fontSize: '1rem', marginBottom: 4 }}>{f.question}</h3>
            <p style={{ fontFamily: 'var(--sans)', color: 'var(--faded-ink)', lineHeight: 1.6 }}>{f.answer}</p>
          </div>
        ))}
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.74rem', color: 'var(--faded-ink)', marginTop: 8 }}>
          Not affiliated with or endorsed by EA Sports or Electronic Arts.
        </p>
      </section>
    </div>
  );
}
