import type { Metadata } from 'next';
import Script from 'next/script';
import { Playfair_Display, Source_Sans_3, Special_Elite } from 'next/font/google';
import { WebsiteJsonLd, OrganizationJsonLd, FAQPageJsonLd, SoftwareApplicationJsonLd } from '@/components/seo/JsonLd';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
});

const specialElite = Special_Elite({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-special-elite',
  display: 'swap',
});

export const metadataBase = new URL('https://www.cfbsocial.com');

export const metadata: Metadata = {
  title: {
    default: 'CFB Social -- College Football Fan Debates, Takes & Predictions',
    template: '%s | CFB Social',
  },
  description:
    'The #1 community for college football fans. Post takes, debate rivals, file predictions, and track the transfer portal across all 653 CFB schools.',
  keywords: [
    'college football fan community', 'best college football forums', 'CFB fan debates',
    'college football predictions', 'college football forum', 'college football message boards',
    'college football social media', 'college football fan opinions', 'transfer portal tracker',
    'college football takes', 'top college football forums online', 'join college football discussion',
    'real-time CFB fan reactions', 'college football fan content',
    'college football debate app', 'CFB social network',
    'college football dynasty game', 'mascot wars bracket',
    'college football rivalry debates', 'CFB transfer portal news',
  ],
  openGraph: {
    type: 'website',
    siteName: 'CFB Social',
    title: 'CFB Social — College Football Fan Community',
    description: 'The college football fan community. Debate rivalries, file predictions, track the transfer portal, and build your dynasty.',
    images: [{ url: 'https://www.cfbsocial.com/logo.png', width: 256, height: 256, alt: 'CFB Social Logo' }],
  },
  twitter: {
    card: 'summary',
    title: 'CFB Social — College Football Fan Community',
    description: 'The college football fan community. Debates. Predictions. Transfer Portal. Dynasty.',
    images: ['https://www.cfbsocial.com/logo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large' as const,
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSans.variable} ${specialElite.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://zjaclcnjgumdgufoakio.supabase.co" />
        <link rel="dns-prefetch" href="https://zjaclcnjgumdgufoakio.supabase.co" />
        <link rel="preload" href="/logo.png" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('cfb-theme')==='dark')document.documentElement.classList.add('dark');if(localStorage.getItem('cfb-font-pref')==='modern')document.documentElement.setAttribute('data-font','modern')}catch(e){}})()`,
          }}
        />
        <WebsiteJsonLd />
        <OrganizationJsonLd />
        <SoftwareApplicationJsonLd />
        <FAQPageJsonLd
          questions={[
            { question: 'What is CFB Social?', answer: 'CFB Social is the #1 college football fan community where fans debate rivalries, file predictions, track the transfer portal, and build their dynasty across all 653 FBS and FCS schools.' },
            { question: 'How do I join CFB Social?', answer: 'Create a free account, pick your school, and start posting takes. You can also vote in Mascot Wars, enter Rivalry Ring debates, and climb the Dynasty leaderboard.' },
            { question: 'Is CFB Social free to use?', answer: 'Yes, CFB Social is completely free. Sign up, choose your school, and start engaging with the college football community today.' },
            { question: 'What features does CFB Social offer?', answer: 'CFB Social offers fan debates in the Rivalry Ring, transfer portal tracking, prediction filing with receipt tracking, Mascot Wars bracket tournaments, Dynasty Mode progression, live War Room game threads, recruiting heat maps, and School Hub pages for all 653 colleges.' },
            { question: 'What is Dynasty Mode in CFB Social?', answer: 'Dynasty Mode is a progression system where fans earn XP for posting takes, winning debates, and making correct predictions. Level up through ranks from Walk-On to Heisman contender and compete on the Hall of Fame leaderboard.' },
            { question: 'What are Mascot Wars?', answer: 'Mascot Wars is a 64-team bracket tournament where fans vote on head-to-head mascot matchups. New brackets run each season, and results are decided entirely by fan voting.' },
            { question: 'How does the War Room work?', answer: 'The War Room is a live game-day experience with real-time chat, ESPN score updates, and quick reactions during active college football games. Threads are auto-created from ESPN game data.' },
            { question: 'Can I track the transfer portal on CFB Social?', answer: 'Yes. The Transfer Portal Wire tracks player movements across all FBS and FCS schools. Filter by status, position, and star rating, and file claims on where you think players will land.' },
            { question: 'What is the Rivalry Ring?', answer: 'The Rivalry Ring is where fans engage in structured debates about rivalries, game outcomes, and hot takes. Challenge other fans, vote on sides, and settle college football arguments.' },
            { question: 'Is CFB Social available on mobile?', answer: 'Yes. CFB Social is available as a web app at cfbsocial.com and as a native mobile app for iOS and Android with push notifications and full feature parity.' },
          ]}
        />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6K18TPL4B2"
          strategy="lazyOnload"
        />
        <Script id="gtag-init" strategy="lazyOnload">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-6K18TPL4B2');`}
        </Script>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function u(){var m=document.querySelector('.masthead');var s=document.querySelector('.scores-ribbon');var mh=m?m.offsetHeight:80;var sh=s?s.offsetHeight:42;document.documentElement.style.setProperty('--masthead-h',mh+'px');document.documentElement.style.setProperty('--header-total-h',(mh+sh)+'px')}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',u)}else{u()}window.addEventListener('resize',u)})()`,
          }}
        />
      </body>
    </html>
  );
}
