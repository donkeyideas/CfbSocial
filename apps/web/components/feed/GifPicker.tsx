'use client';

import { useState, useEffect } from 'react';

interface GiphyGif {
  id: string;
  title: string;
  mediaUrl: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

export function GifPicker({ open, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim() || 'college football';
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gifs/search?q=${encodeURIComponent(q)}&limit=18`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const json = (await res.json()) as { gifs: GiphyGif[] };
        setGifs(json.gifs ?? []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Unable to load GIFs. GIPHY_API_KEY may not be configured.');
          setGifs([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="gif-picker-backdrop" onClick={onClose}>
      <div className="gif-picker" onClick={(e) => e.stopPropagation()}>
        <div className="gif-picker-header">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="gif-picker-input"
          />
          <button type="button" onClick={onClose} className="gif-picker-close" aria-label="Close">
            ×
          </button>
        </div>
        <div className="gif-picker-body">
          {loading && <div className="gif-picker-status">Loading GIFs...</div>}
          {error && <div className="gif-picker-status gif-picker-error">{error}</div>}
          {!loading && !error && gifs.length === 0 && (
            <div className="gif-picker-status">No GIFs found.</div>
          )}
          <div className="gif-picker-grid">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                className="gif-picker-item"
                onClick={() => {
                  onSelect(gif.mediaUrl);
                  onClose();
                }}
                title={gif.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.previewUrl} alt={gif.title} loading="lazy" />
              </button>
            ))}
          </div>
          <div className="gif-picker-footer">
            <span>Powered by GIPHY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
