import type { MetadataRoute } from 'next';

const DISALLOW = ['/settings', '/notifications', '/api/', '/auth/'];

// AI / answer-engine crawlers we explicitly welcome (GEO). Allowing these lets
// ChatGPT, Claude, Perplexity, and Google's AI surfaces read and cite our pages.
const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: 'https://www.cfbsocial.com/sitemap.xml',
  };
}
