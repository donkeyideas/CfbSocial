'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

function isGarbageText(text: string): boolean {
  const words = text.split(/\s+/);
  if (words.some((w) => w.length > 40)) return true;
  const avgWordLen = text.replace(/\s+/g, '').length / Math.max(words.length, 1);
  if (avgWordLen > 15) return true;
  for (const w of words) {
    if (w.length < 15) continue;
    let transitions = 0;
    for (let i = 1; i < w.length; i++) {
      if (/[a-z]/.test(w[i - 1]) && /[A-Z]/.test(w[i])) transitions++;
    }
    if (transitions >= 3) return true;
  }
  if (/^(Search|Menu|Navigation|Home|About|Contact)/i.test(text) && text.length < 300) return true;
  return false;
}

interface NewsModalProps {
  article: {
    headline: string;
    description: string;
    imageUrl: string | null;
    articleUrl: string;
    byline: string;
    published: string;
    source?: string;
  };
  onClose: () => void;
}

export function NewsModal({ article, onClose }: NewsModalProps) {
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedImage, setResolvedImage] = useState<string | null>(article.imageUrl);

  const dateStr = article.published
    ? new Date(article.published).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  // Fetch full article text from our API proxy (all whitelisted sources)
  useEffect(() => {
    async function fetchArticle() {
      if (!article.articleUrl) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/espn-article?url=${encodeURIComponent(article.articleUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paragraphs && data.paragraphs.length > 0) {
            setParagraphs(data.paragraphs.filter((p: string) => !isGarbageText(p)));
          }
          // Use og:image from scraper if RSS didn't have one
          if (!resolvedImage && data.imageUrl) {
            setResolvedImage(data.imageUrl);
          }
        }
      } catch {
        // Fall back to description
      }
      setLoading(false);
    }
    fetchArticle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.articleUrl]);

  return createPortal(
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal" onClick={(e) => e.stopPropagation()}>
        <button className="news-modal-close" onClick={onClose}>
          X
        </button>

        {resolvedImage && (
          <Image
            src={resolvedImage}
            alt={article.headline}
            width={600}
            height={338}
            className="news-modal-image"
            unoptimized
          />
        )}

        <h2 className="news-modal-headline">{article.headline}</h2>

        <div className="news-modal-meta">
          {article.source && <span>{article.source}</span>}
          {article.source && (article.byline || dateStr) && <span> &middot; </span>}
          {article.byline && <span>{article.byline}</span>}
          {article.byline && dateStr && <span> &middot; </span>}
          {dateStr && <span>{dateStr}</span>}
        </div>

        <div className="news-modal-body">
          {loading ? (
            <div className="news-modal-skeleton">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="news-modal-skeleton-block">
                  <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 14, width: '92%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 14, width: '78%' }} />
                </div>
              ))}
            </div>
          ) : paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <p key={i} className="news-modal-desc">{p}</p>
            ))
          ) : article.description && !isGarbageText(article.description) ? (
            <p className="news-modal-desc">{article.description}</p>
          ) : null}
        </div>

        <a
          href={article.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="news-modal-link"
        >
          Read Full Story{article.source ? ` on ${article.source}` : ''}
        </a>
      </div>
    </div>,
    document.body,
  );
}
