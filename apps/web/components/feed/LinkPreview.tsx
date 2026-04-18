'use client';

import { useEffect, useMemo, useState } from 'react';

// ---- Video embed detection ----

interface VideoEmbed {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'twitch';
  embedUrl: string;
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
    const instaPost = u.pathname.match(/\/(?:reels?|p)\/([A-Za-z0-9_-]+)/);
    if (u.hostname.includes('instagram.com') && instaPost) {
      return { platform: 'instagram', embedUrl: `https://www.instagram.com/p/${instaPost[1]}/embed` };
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

  useEffect(() => {
    if (!url) return;

    // Skip OG fetch for GIF URLs — they render directly
    if (extractGifUrl(url)) return;

    // Check cache first (only successes are cached)
    const cached = ogCache.get(url);
    if (cached) {
      setOgData(cached);
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
          setError(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  if (!url) return null;
  // Only hide on error for non-video embeds; video embeds show a play button regardless
  if (error && !videoEmbed) return null;

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

  if (!effectiveOgData) return null;

  // If playing, show embedded iframe
  if (videoEmbed && playing) {
    const isVertical = videoEmbed.platform === 'tiktok' || videoEmbed.platform === 'instagram';
    return (
      <div
        className="link-preview link-preview-video-embed"
        onClick={(e) => e.stopPropagation()}
        style={{
          aspectRatio: isVertical ? undefined : '16/9',
          height: isVertical ? 800 : undefined,
          maxWidth: isVertical ? 480 : undefined,
          margin: isVertical ? '0 auto' : undefined,
        }}
      >
        <iframe
          src={videoEmbed.embedUrl}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          scrolling="no"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 6, overflow: 'hidden' }}
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
