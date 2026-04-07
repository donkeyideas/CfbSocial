import type { Metadata } from 'next';
import Script from 'next/script';
import { Playfair_Display, Source_Sans_3, Special_Elite } from 'next/font/google';
import { WebsiteJsonLd, OrganizationJsonLd } from '@/components/seo/JsonLd';
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

export const metadataBase = new URL('https://cfbsocial.com');

export const metadata: Metadata = {
  title: {
    default: 'CFB Social — College Football Fan Community | Debates, Predictions & Portal Tracker',
    template: '%s | CFB Social',
  },
  description:
    'CFB Social is the college football fan community. Debate rivalries, file predictions, track the transfer portal, and build your dynasty across 653 schools. The best college football forum for real fans.',
  keywords: [
    'college football fan community', 'best college football forums', 'CFB fan debates',
    'college football predictions', 'college football forum', 'college football message boards',
    'college football social media', 'college football fan opinions', 'transfer portal tracker',
    'college football takes', 'top college football forums online', 'join college football discussion',
    'real-time CFB fan reactions', 'college football fan content',
  ],
  openGraph: {
    type: 'website',
    siteName: 'CFB Social',
    title: 'CFB Social — College Football Fan Community',
    description: 'The college football fan community. Debate rivalries, file predictions, track the transfer portal, and build your dynasty.',
    images: [{ url: 'https://cfbsocial.com/logo.png', width: 256, height: 256, alt: 'CFB Social Logo' }],
  },
  twitter: {
    card: 'summary',
    title: 'CFB Social — College Football Fan Community',
    description: 'The college football fan community. Debates. Predictions. Transfer Portal. Dynasty.',
    images: ['https://cfbsocial.com/logo.png'],
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
        <link rel="preconnect" href="https://lazwferoamyntvrgsqcu.supabase.co" />
        <link rel="dns-prefetch" href="https://lazwferoamyntvrgsqcu.supabase.co" />
        <link rel="preload" href="/logo.png" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('cfb-theme')==='dark')document.documentElement.classList.add('dark');if(localStorage.getItem('cfb-font-pref')==='modern')document.documentElement.setAttribute('data-font','modern')}catch(e){}})()`,
          }}
        />
        <WebsiteJsonLd />
        <OrganizationJsonLd />
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
