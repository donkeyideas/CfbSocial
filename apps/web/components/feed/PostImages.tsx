'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PostImagesProps {
  urls: string[];
}

export function PostImages({ urls }: PostImagesProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveSlide(idx);
    }

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (!urls || urls.length === 0) return null;

  const count = urls.length;

  function scrollTo(idx: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  }

  // Single image — simple display, no carousel
  if (count === 1) {
    return (
      <>
        <div className="post-carousel-wrapper">
          <button
            type="button"
            className="post-carousel-slide"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(0); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[0]} alt="Post image" className="post-carousel-img" loading="lazy" />
          </button>
        </div>
        {lightboxIdx !== null && (
          <Lightbox urls={urls} idx={lightboxIdx} onClose={closeLightbox} onChange={setLightboxIdx} />
        )}
      </>
    );
  }

  // Multi-image carousel
  return (
    <>
      <div className="post-carousel-wrapper">
        <div className="post-carousel" ref={scrollRef}>
          {urls.map((url, idx) => (
            <button
              key={idx}
              type="button"
              className="post-carousel-slide"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(idx); }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Post image ${idx + 1}`} className="post-carousel-img" loading="lazy" />
            </button>
          ))}
        </div>

        {/* Arrow buttons */}
        {activeSlide > 0 && (
          <button
            type="button"
            className="post-carousel-arrow post-carousel-arrow--left"
            onClick={(e) => { e.stopPropagation(); scrollTo(activeSlide - 1); }}
            aria-label="Previous image"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {activeSlide < count - 1 && (
          <button
            type="button"
            className="post-carousel-arrow post-carousel-arrow--right"
            onClick={(e) => { e.stopPropagation(); scrollTo(activeSlide + 1); }}
            aria-label="Next image"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}

        {/* Slide counter badge */}
        <span className="post-carousel-counter">{activeSlide + 1}/{count}</span>
      </div>

      {/* Dot indicators */}
      <div className="post-carousel-dots">
        {urls.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`post-carousel-dot${idx === activeSlide ? ' post-carousel-dot--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); scrollTo(idx); }}
            aria-label={`Go to image ${idx + 1}`}
          />
        ))}
      </div>

      {lightboxIdx !== null && (
        <Lightbox urls={urls} idx={lightboxIdx} onClose={closeLightbox} onChange={setLightboxIdx} />
      )}
    </>
  );
}

function Lightbox({
  urls,
  idx,
  onClose,
  onChange,
}: {
  urls: string[];
  idx: number;
  onClose: () => void;
  onChange: (idx: number) => void;
}) {
  return (
    <div className="post-lightbox" onClick={onClose}>
      <button type="button" className="post-lightbox-close" onClick={onClose} aria-label="Close">
        X
      </button>
      {urls.length > 1 && idx > 0 && (
        <button
          type="button"
          className="post-lightbox-nav post-lightbox-prev"
          onClick={(e) => { e.stopPropagation(); onChange(idx - 1); }}
          aria-label="Previous"
        >
          &lt;
        </button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[idx]!}
        alt="Full size"
        className="post-lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
      {urls.length > 1 && idx < urls.length - 1 && (
        <button
          type="button"
          className="post-lightbox-nav post-lightbox-next"
          onClick={(e) => { e.stopPropagation(); onChange(idx + 1); }}
          aria-label="Next"
        >
          &gt;
        </button>
      )}
    </div>
  );
}
