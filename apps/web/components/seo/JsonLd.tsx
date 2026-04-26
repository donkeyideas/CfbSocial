interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'CFB Social',
        alternateName: 'CFB Social - College Football Community',
        url: 'https://www.cfbsocial.com',
        description:
          "College football's social home. Stake claims, debate rivalries, track the transfer portal, and build your dynasty.",
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://www.cfbsocial.com/feed?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.feed-title', '.section-headline'],
        },
      }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'CFB Social',
        alternateName: 'CFB Social - College Football Community',
        url: 'https://www.cfbsocial.com',
        description:
          'The college football fan community. Debates, predictions, transfer portal tracking, and dynasty building across 653 schools.',
        foundingDate: '2026',
        sameAs: [
          'https://x.com/cfbsocial',
          'https://www.instagram.com/cfbsocial',
          'https://www.tiktok.com/@cfbsocial',
          'https://www.facebook.com/cfbsocial',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          url: 'https://www.cfbsocial.com/contact',
        },
      }}
    />
  );
}

export function SportsTeamJsonLd({
  name,
  conference,
  mascot,
  url,
}: {
  name: string;
  conference?: string;
  mascot?: string;
  url: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        name,
        sport: 'American Football',
        memberOf: conference
          ? { '@type': 'SportsOrganization', name: conference }
          : undefined,
        ...(mascot ? { alternateName: `${name} ${mascot}` } : {}),
        url,
      }}
    />
  );
}

export function DiscussionPostJsonLd({
  author,
  datePublished,
  text,
  url,
  interactionCount,
}: {
  author: string;
  datePublished: string;
  text: string;
  url: string;
  interactionCount?: number;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        author: {
          '@type': 'Person',
          name: author,
        },
        datePublished,
        text: text.slice(0, 500),
        url,
        ...(interactionCount !== undefined
          ? {
              interactionStatistic: {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/LikeAction',
                userInteractionCount: interactionCount,
              },
            }
          : {}),
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function CollectionPageJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        description,
        url,
        isPartOf: {
          '@type': 'WebSite',
          name: 'CFB Social',
          url: 'https://www.cfbsocial.com',
        },
      }}
    />
  );
}

export function ProfilePageJsonLd({
  name,
  url,
  description,
}: {
  name: string;
  url: string;
  description?: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name,
        url,
        ...(description ? { description } : {}),
        isPartOf: {
          '@type': 'WebSite',
          name: 'CFB Social',
          url: 'https://www.cfbsocial.com',
        },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'CFB Social',
        alternateName: 'The Gridiron',
        applicationCategory: 'SocialNetworkingApplication',
        operatingSystem: 'Web, iOS, Android',
        url: 'https://www.cfbsocial.com',
        description:
          'The #1 college football fan community. Post takes, debate rivalries, file predictions, track the transfer portal, and build your dynasty across all 653 FBS and FCS schools.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Rivalry Ring fan debates',
          'Transfer Portal tracker',
          'Prediction filing with receipt tracking',
          'Mascot Wars bracket tournaments',
          'Dynasty Mode progression system',
          'Live War Room game threads',
          'Recruiting heat maps',
          'School Hub pages for 653 colleges',
          'Chaos Meter live activity tracking',
          'Hall of Fame leaderboards',
        ],
        screenshot: 'https://www.cfbsocial.com/logo.png',
      }}
    />
  );
}

export function FAQPageJsonLd({
  questions,
}: {
  questions: Array<{ question: string; answer: string }>;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: questions.map((q) => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: q.answer,
          },
        })),
      }}
    />
  );
}
