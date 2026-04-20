import { NextRequest, NextResponse } from 'next/server';

// Whitelisted hostnames for article scraping (prevents SSRF)
const ALLOWED_HOSTS = [
  'espn.com',
  'www.espn.com',
  'cbssports.com',
  'www.cbssports.com',
  'sports.yahoo.com',
  '247sports.com',
  'www.247sports.com',
  'on3.com',
  'www.on3.com',
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`)
  );
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cleanParagraph(raw: string): string {
  return decodeHTMLEntities(raw.replace(/<[^>]+>/g, '')).trim();
}

function isGarbageText(text: string): boolean {
  const words = text.split(/\s+/);
  // Any single word over 40 chars is concatenated nav garbage
  if (words.some((w) => w.length > 40)) return true;
  // High average word length
  const avgWordLen = text.replace(/\s+/g, '').length / Math.max(words.length, 1);
  if (avgWordLen > 15) return true;
  // CamelCase concatenation: 3+ lowercase→uppercase transitions in one word
  // e.g. "querySearchNewsFinanceSports" has many transitions = nav text
  for (const w of words) {
    if (w.length < 15) continue;
    let transitions = 0;
    for (let i = 1; i < w.length; i++) {
      if (/[a-z]/.test(w[i - 1]) && /[A-Z]/.test(w[i])) transitions++;
    }
    if (transitions >= 3) return true;
  }
  // Reject common nav/menu patterns
  if (/^(Search|Menu|Navigation|Home|About|Contact)/i.test(text) && text.length < 300) return true;
  return false;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Strict hostname validation to prevent SSRF
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CFBSocial/1.0)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ paragraphs: [], imageUrl: null });
    }

    const html = await res.text();

    // Extract og:image for articles that didn't have an image in RSS
    const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
    const imageUrl = ogImageMatch?.[1] || null;

    // Extract article body paragraphs
    const paragraphs: string[] = [];
    let match;

    // Strategy 1: <p> tags with class attributes (ESPN, CBS, most sites)
    const pClassRegex = /<p[^>]*class="[^"]*"[^>]*>(.*?)<\/p>/gs;
    while ((match = pClassRegex.exec(html)) !== null) {
      const text = cleanParagraph(match[1]!);
      if (
        text.length > 50 &&
        !text.includes('Subscribe') &&
        !text.includes('Sign up') &&
        !text.includes('cookie') &&
        !text.includes('privacy policy') &&
        !isGarbageText(text)
      ) {
        paragraphs.push(text);
      }
      if (paragraphs.length >= 5) break;
    }

    // Strategy 2: plain <p> tags (fallback)
    if (paragraphs.length < 3) {
      const simplePRegex = /<p>(.*?)<\/p>/gs;
      while ((match = simplePRegex.exec(html)) !== null) {
        const text = cleanParagraph(match[1]!);
        if (text.length > 50 && !paragraphs.includes(text) && !isGarbageText(text)) {
          paragraphs.push(text);
        }
        if (paragraphs.length >= 5) break;
      }
    }

    // Strategy 3: <article> body with any <p> tags
    if (paragraphs.length < 2) {
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (articleMatch) {
        const articlePRegex = /<p[^>]*>(.*?)<\/p>/gs;
        while ((match = articlePRegex.exec(articleMatch[1]!)) !== null) {
          const text = cleanParagraph(match[1]!);
          if (text.length > 50 && !paragraphs.includes(text) && !isGarbageText(text)) {
            paragraphs.push(text);
          }
          if (paragraphs.length >= 5) break;
        }
      }
    }

    return NextResponse.json({ paragraphs, imageUrl }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ paragraphs: [], imageUrl: null });
  }
}
