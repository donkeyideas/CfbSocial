'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface NewsModalProps {
  article: {
    headline: string;
    description: string;
    imageUrl: string | null;
    articleUrl: string;
    byline: string;
    published: string;
  };
  onClose: () => void;
}

export function NewsModal({ article, onClose }: NewsModalProps) {
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = new Date(article.published).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Fetch full article text from our API proxy
  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/espn-article?url=${encodeURIComponent(article.articleUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paragraphs && data.paragraphs.length > 0) {
            setParagraphs(data.paragraphs);
          }
        }
      } catch {
        // Fall back to description
      }
      setLoading(false);
    }
    fetchArticle();
  }, [article.articleUrl]);

  return createPortal(
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal" onClick={(e) => e.stopPropagation()}>
        <button className="news-modal-close" onClick={onClose}>
          X
        </button>

        {article.imageUrl && (
          <img
            src={article.imageUrl}
            alt={article.headline}
            className="news-modal-image"
          />
        )}

        <h2 className="news-modal-headline">{article.headline}</h2>

        <div className="news-modal-meta">
          {article.byline && <span>{article.byline}</span>}
          {article.byline && <span> &middot; </span>}
          <span>{dateStr}</span>
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
          ) : (
            <p className="news-modal-desc">{article.description}</p>
          )}
        </div>

        <a
          href={article.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="news-modal-link"
        >
          Read Full Story
        </a>
      </div>
    </div>,
    document.body,
  );
}
