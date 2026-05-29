'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// ---- Video embed detection ----

interface VideoEmbed {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'twitch';
  embedUrl: string;
}

function isTwitterUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === 'twitter.com' || h === 'www.twitter.com' || h === 'x.com' || h === 'www.x.com';
  } catch { return false; }
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com' || u.hostname === 'm.youtube.com') && u.pathname === '/watch') {
      return u.searchParams.get('v');
    }
    const pathMatch = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?&]+)/);
    if (pathMatch && u.hostname.includes('youtube.com')) return pathMatch[2] ?? null;
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split(/[?/]/)[0] || null;
  } catch { /* ignore */ }
  return null;
}

function detectVideoEmbed(url: string): VideoEmbed | null {
  const ytId = extractYouTubeId(url);
  if (ytId) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1` };

  try {
    const u = new URL(url);
    const tiktokMatch = u.pathname.match(/\/@[^/]+\/video\/(\d+)/);
    if (u.hostname.includes('tiktok.com') && tiktokMatch) {
      return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}` };
    }
    // vm.tiktok.com short links
    if (u.hostname === 'vm.tiktok.com') {
      const shortId = u.pathname.replace(/^\//, '').split('/')[0];
      if (shortId) return { platform: 'tiktok', embedUrl: url };
    }
    // Instagram — reels use /reel/{id}/embed, posts use /p/{id}/embed
    const instaReel = u.pathname.match(/\/reels?\/([A-Za-z0-9_-]+)/);
    const instaPost = u.pathname.match(/\/p\/([A-Za-z0-9_-]+)/);
    if (u.hostname.includes('instagram.com') && (instaReel || instaPost)) {
      const id = instaReel ? instaReel[1] : instaPost![1];
      const type = instaReel ? 'reel' : 'p';
      return { platform: 'instagram', embedUrl: `https://www.instagram.com/${type}/${id}/embed/` };
    }
    const twitchClip = url.match(/clips\.twitch\.tv\/([A-Za-z0-9_-]+)/) || u.pathname.match(/\/clip\/([A-Za-z0-9_-]+)/);
    if (u.hostname.includes('twitch.tv') && twitchClip) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      return { platform: 'twitch', embedUrl: `https://clips.twitch.tv/embed?clip=${twitchClip[1]}&parent=${host}` };
    }
  } catch { /* ignore */ }
  return null;
}

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  url: string;
}

// Detect direct GIF URLs (GIPHY media links, tenor, etc.)
function extractGifUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Any giphy.com subdomain with giphy.gif in path
    if (u.hostname.includes('giphy.com') && u.pathname.includes('/giphy.gif')) {
      return url.split('?')[0] ?? null;
    }
    // GIPHY page URLs — convert to direct media
    if ((u.hostname === 'giphy.com' || u.hostname === 'www.giphy.com') && u.pathname.startsWith('/gifs/')) {
      const match = u.pathname.match(/\/gifs\/(?:.*-)?([a-zA-Z0-9]+)$/);
      if (match) return `https://media.giphy.com/media/${match[1]}/giphy.gif`;
    }
    // Any direct .gif URL
    if (u.pathname.endsWith('.gif')) return url;
  } catch { /* ignore */ }
  return null;
}

// Simple URL regex for detecting links in post content
const URL_REGEX = /https?:\/\/[^\s<>"\])}]+/gi;

// In-memory cache — only stores successful results
const ogCache = new Map<string, OgData>();
// Negative cache — URLs that failed (bot-blocked sites, timeouts, etc.) so we don't retry per-mount
const ogFailedCache = new Set<string>();

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Strip the first URL from post content (LinkedIn-style).
 * Only removes the URL itself; keeps surrounding text intact.
 */
export function stripFirstUrl(text: string): string {
  const url = extractFirstUrl(text);
  if (!url) return text;
  return text.replace(url, '').replace(/\n{2,}$/g, '').trimEnd();
}

export function LinkPreview({ content }: { content: string }) {
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);

  const url = extractFirstUrl(content);
  const videoEmbed = useMemo(() => url ? detectVideoEmbed(url) : null, [url]);
  const gifUrl = useMemo(() => url ? extractGifUrl(url) : null, [url]);
  const isTweet = useMemo(() => url ? isTwitterUrl(url) : false, [url]);

  useEffect(() => {
    if (!url) return;

    // Skip OG fetch for GIF URLs and Twitter — they render directly
    if (extractGifUrl(url)) return;
    if (isTwitterUrl(url)) return;

    // Check cache first (only successes are cached)
    const cached = ogCache.get(url);
    if (cached) {
      setOgData(cached);
      return;
    }
    // Short-circuit URLs we already know are unfetchable (bot-blocked, timeouts, etc.)
    if (ogFailedCache.has(url)) {
      setError(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((data: OgData) => {
        if (cancelled) return;
        if (data.title || data.description || data.image) {
          ogCache.set(url, data);
          setOgData(data);
        } else {
          ogFailedCache.add(url);
          setError(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        ogFailedCache.add(url);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  if (!url) return null;
  // Only hide on error for non-video/non-tweet embeds
  if (error && !videoEmbed && !isTweet) return null;

  // Fallback OG data for video embeds when OG fetch failed
  const platformNames: Record<string, string> = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', twitch: 'Twitch' };
  const effectiveOgData = ogData ?? (error && videoEmbed ? {
    title: `Watch on ${platformNames[videoEmbed.platform] || 'Video'}`,
    description: null,
    image: null,
    siteName: platformNames[videoEmbed.platform] || null,
    favicon: null,
    url,
  } : null);

  // GIF URLs: render image directly, no OG card
  if (gifUrl) {
    return (
      <div className="link-preview" style={{ cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
        <div className="link-preview-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gifUrl} alt="GIF" className="link-preview-img" style={{ objectFit: 'contain', maxHeight: 400 }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="link-preview link-preview-loading">
        <div className="link-preview-skeleton-img" />
        <div className="link-preview-info">
          <div className="link-preview-skeleton-line" style={{ width: '60%' }} />
          <div className="link-preview-skeleton-line" style={{ width: '80%' }} />
          <div className="link-preview-skeleton-line" style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  // Twitter/X: render native embed immediately (before effectiveOgData check since we skip OG fetch)
  if (isTweet) {
    return <TwitterNativeEmbed tweetUrl={url!} />;
  }

  if (!effectiveOgData) return null;

  // If playing, show embedded content
  if (videoEmbed && playing) {
    // Instagram: use native embed (blockquote + embed.js) for automatic sizing
    if (videoEmbed.platform === 'instagram') {
      return <InstagramNativeEmbed embedUrl={videoEmbed.embedUrl} />;
    }

    const isVertical = videoEmbed.platform === 'tiktok';
    return (
      <div
        className="link-preview link-preview-video-embed"
        onClick={(e) => e.stopPropagation()}
        style={{
          aspectRatio: isVertical ? '9/16' : '16/9',
          maxHeight: isVertical ? 700 : undefined,
          maxWidth: isVertical ? 400 : undefined,
          margin: isVertical ? '0 auto' : undefined,
          overflow: 'hidden',
        }}
      >
        <iframe
          src={videoEmbed.embedUrl}
          title={`${videoEmbed.platform} embed`}
          allow="autoplay; encrypted-media; fullscreen"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 6,
          }}
        />
      </div>
    );
  }

  const displayDomain = (() => {
    try {
      return new URL(effectiveOgData.url).hostname.replace(/^www\./, '');
    } catch {
      return effectiveOgData.url;
    }
  })();

  // Video embeds use <div> to avoid nested <a> inside post body link
  if (videoEmbed) {
    return (
      <div
        className="link-preview"
        style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setPlaying(true);
        }}
      >
        {effectiveOgData.image ? (
          <div className="link-preview-image" style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={effectiveOgData.image}
              alt={effectiveOgData.title || 'Link preview'}
              className="link-preview-img"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
            />
            <div className="link-preview-play-overlay">
              <div className="link-preview-play-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="link-preview-image" style={{ position: 'relative', height: 200, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="link-preview-play-overlay" style={{ position: 'relative', inset: 'auto' }}>
              <div className="link-preview-play-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              </div>
            </div>
          </div>
        )}
        <div className="link-preview-info">
          <div className="link-preview-site">
            {effectiveOgData.favicon && (
              <img
                src={effectiveOgData.favicon}
                alt=""
                className="link-preview-favicon"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span>{effectiveOgData.siteName || displayDomain}</span>
          </div>
          {effectiveOgData.title && (
            <div className="link-preview-title">{effectiveOgData.title}</div>
          )}
        </div>
      </div>
    );
  }

  // Non-video links: use <div> with window.open to avoid nested <a> issues
  return (
    <div
      className="link-preview"
      style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        window.open(effectiveOgData.url, '_blank', 'noopener,noreferrer');
      }}
    >
      {effectiveOgData.image && (
        <div className="link-preview-image" style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={effectiveOgData.image}
            alt={effectiveOgData.title || 'Link preview'}
            className="link-preview-img"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="link-preview-info">
        <div className="link-preview-site">
          {effectiveOgData.favicon && (
            <img
              src={effectiveOgData.favicon}
              alt=""
              className="link-preview-favicon"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span>{effectiveOgData.siteName || displayDomain}</span>
        </div>
        {effectiveOgData.title && (
          <div className="link-preview-title">{effectiveOgData.title}</div>
        )}
        {effectiveOgData.description && (
          <div className="link-preview-desc">{effectiveOgData.description}</div>
        )}
      </div>
    </div>
  );
}

// Instagram native embed — uses blockquote + embed.js for auto-sizing
function InstagramNativeEmbed({ embedUrl }: { embedUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const permalink = embedUrl.replace(/\/embed\/?$/, '/');

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    container.innerHTML = '';

    const blockquote = document.createElement('blockquote');
    blockquote.className = 'instagram-media';
    blockquote.dataset.instgrmPermalink = permalink;
    blockquote.dataset.instgrmVersion = '14';
    blockquote.style.width = '100%';
    blockquote.style.maxWidth = '540px';
    blockquote.style.margin = '0 auto';
    blockquote.style.padding = '0';
    container.appendChild(blockquote);

    const w = window as Window & { instgrm?: { Embeds: { process: () => void } } };
    if (w.instgrm) {
      w.instgrm.Embeds.process();
    } else if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [permalink]);

  return (
    <div
      ref={ref}
      className="link-preview"
      onClick={(e) => e.stopPropagation()}
      style={{ border: 'none', background: 'transparent', overflow: 'visible', display: 'flex', justifyContent: 'center' }}
    />
  );
}

// Extract tweet ID from a twitter.com or x.com URL
function extractTweetId(url: string): string | null {
  try {
    const m = new URL(url).pathname.match(/\/status\/(\d+)/);
    return m ? m[1] : null;
  } catch { return null; }
}

type TwttrWidgets = { createTweet: (id: string, el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLElement | undefined> };

// Twitter/X native embed — uses widgets.js createTweet for reliable rendering
function TwitterNativeEmbed({ tweetUrl }: { tweetUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const tweetId = extractTweetId(tweetUrl);

  useEffect(() => {
    const container = ref.current;
    if (!container || !tweetId) return;

    let cancelled = false;
    container.innerHTML = '';
    const isDark = document.documentElement.classList.contains('dark');

    function renderTweet(widgets: TwttrWidgets) {
      if (cancelled) return;
      widgets.createTweet(tweetId!, container!, {
        theme: isDark ? 'dark' : 'light',
        dnt: true,
        align: 'center',
      });
    }

    const w = window as Window & { twttr?: { widgets: TwttrWidgets } };
    if (w.twttr?.widgets) {
      renderTweet(w.twttr.widgets);
    } else {
      if (!document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        document.body.appendChild(script);
      }
      const interval = setInterval(() => {
        const tw = (window as Window & { twttr?: { widgets: TwttrWidgets } }).twttr;
        if (tw?.widgets) {
          clearInterval(interval);
          renderTweet(tw.widgets);
        }
      }, 200);
      setTimeout(() => clearInterval(interval), 10000);
    }

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [tweetId]);

  if (!tweetId) {
    // Fallback: just link to the tweet
    return (
      <div
        className="link-preview"
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); window.open(tweetUrl, '_blank', 'noopener,noreferrer'); }}
      >
        <div className="link-preview-info">
          <div className="link-preview-site"><span>X (Twitter)</span></div>
          <div className="link-preview-title">View post on X</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="link-preview"
      onClick={(e) => e.stopPropagation()}
      style={{ border: 'none', background: 'transparent', overflow: 'visible' }}
    />
  );
}
