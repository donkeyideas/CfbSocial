'use client';

import { useEffect, useState } from 'react';

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  url: string;
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

  const url = extractFirstUrl(content);

  useEffect(() => {
    if (!url) return;

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

  if (!url || error) return null;

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

  if (!ogData) return null;

  const displayDomain = (() => {
    try {
      return new URL(ogData.url).hostname.replace(/^www\./, '');
    } catch {
      return ogData.url;
    }
  })();

  return (
    <a
      href={ogData.url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview"
      onClick={(e) => e.stopPropagation()}
    >
      {ogData.image && (
        <div className="link-preview-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogData.image}
            alt={ogData.title || 'Link preview'}
            className="link-preview-img"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="link-preview-info">
        <div className="link-preview-site">
          {ogData.favicon && (
            <img
              src={ogData.favicon}
              alt=""
              className="link-preview-favicon"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span>{ogData.siteName || displayDomain}</span>
        </div>
        {ogData.title && (
          <div className="link-preview-title">{ogData.title}</div>
        )}
        {ogData.description && (
          <div className="link-preview-desc">{ogData.description}</div>
        )}
      </div>
    </a>
  );
}
