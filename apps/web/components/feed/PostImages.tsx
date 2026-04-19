'use client';

import { useCallback, useState } from 'react';

interface PostImagesProps {
  urls: string[];
}

export function PostImages({ urls }: PostImagesProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  if (!urls || urls.length === 0) return null;

  const count = Math.min(urls.length, 4);
  const gridClass =
    count === 1 ? 'post-images-1' :
    count === 2 ? 'post-images-2' :
    count === 3 ? 'post-images-3' :
    'post-images-4';

  return (
    <>
      <div className={`post-images ${gridClass}`}>
        {urls.slice(0, 4).map((url, idx) => (
          <button
            key={idx}
            type="button"
            className="post-images-item"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(idx);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Post image ${idx + 1}`}
              className="post-images-img"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {lightboxIdx !== null && (
        <div className="post-lightbox" onClick={closeLightbox}>
          <button
            type="button"
            className="post-lightbox-close"
            onClick={closeLightbox}
            aria-label="Close"
          >
            X
          </button>
          {urls.length > 1 && lightboxIdx > 0 && (
            <button
              type="button"
              className="post-lightbox-nav post-lightbox-prev"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx - 1);
              }}
              aria-label="Previous"
            >
              &lt;
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[lightboxIdx]!}
            alt="Full size"
            className="post-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          {urls.length > 1 && lightboxIdx < urls.length - 1 && (
            <button
              type="button"
              className="post-lightbox-nav post-lightbox-next"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx + 1);
              }}
              aria-label="Next"
            >
              &gt;
            </button>
          )}
        </div>
      )}
    </>
  );
}
