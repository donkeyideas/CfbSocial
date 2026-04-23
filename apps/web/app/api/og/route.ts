import { NextRequest, NextResponse } from 'next/server';

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  url: string;
}

// ---- YouTube helpers ----

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com' || u.hostname === 'm.youtube.com') && u.pathname === '/watch') {
      return u.searchParams.get('v');
    }
    // youtube.com/shorts/ID or youtube.com/embed/ID or youtube.com/live/ID
    const pathMatch = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?&]+)/);
    if (pathMatch && (u.hostname.includes('youtube.com'))) {
      return pathMatch[2] ?? null;
    }
    // youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split(/[?/]/)[0] || null;
    }
  } catch { /* ignore */ }
  return null;
}

async function fetchYouTubeOg(url: string, videoId: string): Promise<OgData | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
    return {
      title: data.title || null,
      description: data.author_name ? `Video by ${data.author_name}` : null,
      image: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      siteName: 'YouTube',
      favicon: 'https://www.youtube.com/favicon.ico',
      url,
    };
  } catch {
    // Fallback: build preview from video ID alone
    return {
      title: null,
      description: null,
      image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      siteName: 'YouTube',
      favicon: 'https://www.youtube.com/favicon.ico',
      url,
    };
  }
}

// ---- TikTok helper ----

function isTikTokUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h.includes('tiktok.com');
  } catch { return false; }
}

async function fetchTikTokOg(url: string): Promise<OgData | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
    return {
      title: data.title || 'TikTok Video',
      description: data.author_name ? `Video by ${data.author_name}` : null,
      image: data.thumbnail_url || null,
      siteName: 'TikTok',
      favicon: 'https://www.tiktok.com/favicon.ico',
      url,
    };
  } catch {
    return {
      title: 'TikTok Video',
      description: null,
      image: null,
      siteName: 'TikTok',
      favicon: 'https://www.tiktok.com/favicon.ico',
      url,
    };
  }
}

// ---- Twitter/X helper ----

function isTwitterUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === 'twitter.com' || h === 'www.twitter.com' || h === 'x.com' || h === 'www.x.com';
  } catch { return false; }
}

async function fetchTwitterOg(url: string): Promise<OgData> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('Failed');

    const data = await res.json() as { author_name?: string; html?: string };
    // Extract tweet text from the oembed HTML blockquote
    let tweetText: string | null = null;
    if (data.html) {
      const textMatch = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (textMatch?.[1]) {
        tweetText = textMatch[1].replace(/<[^>]+>/g, '').replace(/&mdash;/g, '--').trim();
        if (tweetText.length > 200) tweetText = tweetText.slice(0, 200) + '...';
      }
    }
    return {
      title: data.author_name ? `${data.author_name} on X` : 'Post on X',
      description: tweetText,
      image: null,
      siteName: 'X (Twitter)',
      favicon: 'https://abs.twimg.com/favicons/twitter.3.ico',
      url,
    };
  } catch {
    return {
      title: 'Post on X',
      description: null,
      image: null,
      siteName: 'X (Twitter)',
      favicon: 'https://abs.twimg.com/favicons/twitter.3.ico',
      url,
    };
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const cacheHeaders = { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' };

  // Special handling: YouTube
  const ytId = extractYouTubeId(url);
  if (ytId) {
    const og = await fetchYouTubeOg(url, ytId);
    if (og) return NextResponse.json(og, { headers: cacheHeaders });
  }

  // Special handling: TikTok (blocks server-side scraping)
  if (isTikTokUrl(url)) {
    const og = await fetchTikTokOg(url);
    if (og) return NextResponse.json(og, { headers: cacheHeaders });
  }

  // Special handling: Twitter/X (blocks all scraping)
  if (isTwitterUrl(url)) {
    const og = await fetchTwitterOg(url);
    return NextResponse.json(og, { headers: cacheHeaders });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return NextResponse.json({ error: 'Not an HTML page' }, { status: 400 });
    }

    // Read limited amount of HTML (first 50KB should contain all meta tags)
    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: 'No response body' }, { status: 502 });
    }

    let html = '';
    const decoder = new TextDecoder();
    const maxBytes = 50 * 1024;
    let bytesRead = 0;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
    }
    reader.cancel();

    const og = extractOgData(html, parsed);

    return NextResponse.json(og, { headers: cacheHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'The operation was aborted' || message.includes('abort')) {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 502 });
  }
}

function extractOgData(html: string, baseUrl: URL): OgData {
  function getMeta(property: string): string | null {
    // Match both property="..." and name="..."
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return decodeHtmlEntities(m[1]);
    }
    return null;
  }

  // Get title: og:title > twitter:title > <title>
  let title = getMeta('og:title') ?? getMeta('twitter:title');
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch?.[1]) title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Get description: og:description > twitter:description > meta description
  let description = getMeta('og:description') ?? getMeta('twitter:description') ?? getMeta('description');

  // Sanitize garbage descriptions (nav text, concatenated menu items, etc.)
  if (description) {
    const words = description.split(/\s+/);
    const hasGarbageWord = words.some((w) => w.length > 50);
    const avgWordLen = description.replace(/\s+/g, '').length / Math.max(words.length, 1);
    if (hasGarbageWord || avgWordLen > 20) {
      description = null;
    }
  }

  // Get image: og:image > twitter:image
  let image = getMeta('og:image') ?? getMeta('twitter:image');
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, baseUrl.origin).href;
    } catch {
      image = null;
    }
  }

  const siteName = getMeta('og:site_name');

  // Favicon
  let favicon: string | null = null;
  const iconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i);
  if (iconMatch?.[1]) {
    favicon = iconMatch[1];
    if (!favicon.startsWith('http')) {
      try {
        favicon = new URL(favicon, baseUrl.origin).href;
      } catch {
        favicon = `${baseUrl.origin}/favicon.ico`;
      }
    }
  } else {
    favicon = `${baseUrl.origin}/favicon.ico`;
  }

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    siteName: siteName || null,
    favicon,
    url: baseUrl.href,
  };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}
