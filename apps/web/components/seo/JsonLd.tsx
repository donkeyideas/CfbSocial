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
        alternateName: 'The Gridiron',
        url: 'https://cfbsocial.com',
        description:
          "College football's social home. Stake claims, debate rivalries, track the transfer portal, and build your dynasty.",
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://cfbsocial.com/feed?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
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
        alternateName: 'The Gridiron',
        url: 'https://cfbsocial.com',
        description:
          'The college football fan community. Debates, predictions, transfer portal tracking, and dynasty building across 653 schools.',
        foundingDate: '2026',
        sameAs: [],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          url: 'https://cfbsocial.com/contact',
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
