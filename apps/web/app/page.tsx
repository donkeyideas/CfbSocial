import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LandingPage } from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's `%s | CFB Social` title template.
  title: { absolute: 'CFB Social — College Football Takes, Rivalries & Transfer Portal' },
  description:
    'Join CFB Social, the college football community for all 653 schools. File hot takes, debate rivalries, track the transfer portal, make predictions, and build your dynasty. Free to join.',
  alternates: {
    canonical: 'https://www.cfbsocial.com/',
  },
  openGraph: {
    type: 'website',
    siteName: 'CFB Social',
    locale: 'en_US',
    url: 'https://www.cfbsocial.com/',
    title: "CFB Social — College Football's Social Home",
    description:
      'File hot takes, debate rivalries, track the transfer portal, and build your dynasty across all 653 college football programs. Free to join.',
    images: [
      {
        url: 'https://www.cfbsocial.com/og/home.jpg',
        width: 1200,
        height: 630,
        alt: 'CFB Social — the college football social network front page.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@cfbsocial',
    creator: '@cfbsocial',
    title: "CFB Social — College Football's Social Home",
    description:
      'Takes, rivalries, transfer portal, predictions, and dynasty building across all 653 programs. Free to join.',
    images: ['https://www.cfbsocial.com/og/home.jpg'],
  },
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/feed');

  // WebSite / Organization / FAQPage JSON-LD are already injected globally by
  // the root layout (app/layout.tsx) — no per-page structured data needed here.
  return <LandingPage />;
}
