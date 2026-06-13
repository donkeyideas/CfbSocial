'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { uploadImage } from '@/lib/upload/imageUpload';
import { revalidateFeed } from '@/lib/actions/feed';
import { createMoment } from '@cfb-social/api';

interface Props {
  onClose: () => void;
  onPosted: () => void;
}

interface PendingImage {
  id: string;
  previewUrl: string;
  publicUrl?: string;
  uploading: boolean;
  error?: boolean;
}

const MAX_IMAGES = 4;

export function MomentComposer({ onClose, onPosted }: Props) {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [opponent, setOpponent] = useState('');
  const [ourScore, setOurScore] = useState('');
  const [oppScore, setOppScore] = useState('');
  const [week, setWeek] = useState('');
  const [isTeamBuilder, setIsTeamBuilder] = useState(false);

  const uploading = images.some((i) => i.uploading);
  const readyUrls = images.filter((i) => i.publicUrl && !i.error).map((i) => i.publicUrl!);

  const handleFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError('');

    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    const newImages: PendingImage[] = toAdd.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }));
    setImages((prev) => [...prev, ...newImages]);
    if (fileRef.current) fileRef.current.value = '';

    await Promise.all(
      toAdd.map(async (file, idx) => {
        const target = newImages[idx]!;
        try {
          const url = await uploadImage(file);
          setImages((prev) => prev.map((p) => (p.id === target.id ? { ...p, publicUrl: url, uploading: false } : p)));
        } catch {
          setImages((prev) => prev.map((p) => (p.id === target.id ? { ...p, uploading: false, error: true } : p)));
        }
      })
    );
  }, [images.length]);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((p) => p.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  async function handleSubmit() {
    if (readyUrls.length === 0 || !profile?.id || submitting || uploading) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      await createMoment(supabase, {
        imageUrls: readyUrls,
        authorId: profile.id,
        schoolId: profile.school_id ?? null,
        title: title.trim() || null,
        content: caption.trim(),
        opponent: opponent.trim() || null,
        ourScore: ourScore ? parseInt(ourScore, 10) : null,
        oppScore: oppScore ? parseInt(oppScore, 10) : null,
        week: week.trim() || null,
        isTeamBuilder,
        momentTags: [],
        gameVersion: 'CFB 27',
      });
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      await revalidateFeed();
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post the moment.');
      setSubmitting(false);
    }
  }

  return (
    <div className="gr-modal-backdrop" onClick={onClose}>
      <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gr-modal-head">
          <span className="gr-modal-title">Upload a Moment</span>
          <button className="gr-modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="gr-modal-body">
          {images.length === 0 ? (
            <button className="gr-drop" onClick={() => fileRef.current?.click()}>
              <div className="gr-drop-ic" aria-hidden>▦</div>
              <strong>Choose screenshots</strong>
              <span>Add up to {MAX_IMAGES} (they form a grid in the magazine) · JPG or PNG</span>
            </button>
          ) : (
            <div className="gr-thumbs">
              {images.map((img) => (
                <div key={img.id} className="gr-thumb">
                  <Image src={img.previewUrl} alt="preview" width={120} height={84} className="gr-thumb-img" unoptimized />
                  {img.uploading && <div className="gr-thumb-status"><span className="gr-thumb-spinner" /></div>}
                  {img.error && <div className="gr-thumb-err">!</div>}
                  <button className="gr-thumb-x" onClick={() => removeImage(img.id)} aria-label="Remove">×</button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button className="gr-thumb gr-thumb-add" onClick={() => fileRef.current?.click()} aria-label="Add more">+</button>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} style={{ display: 'none' }} />

          <label className="gr-field gr-field-full"><span>Title (magazine headline)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. The Catch in Death Valley" />
          </label>
          <div className="gr-field-grid">
            <label className="gr-field"><span>Opponent</span><input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. Texas" /></label>
            <label className="gr-field gr-field-sm"><span>Your score</span><input value={ourScore} onChange={(e) => setOurScore(e.target.value)} inputMode="numeric" placeholder="28" /></label>
            <label className="gr-field gr-field-sm"><span>Opp score</span><input value={oppScore} onChange={(e) => setOppScore(e.target.value)} inputMode="numeric" placeholder="24" /></label>
            <label className="gr-field gr-field-sm"><span>Week</span><input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="Wk 6" /></label>
          </div>

          <label className="gr-field gr-field-full">
            <span>Caption (the story)</span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2000} rows={3} placeholder="Tell the story of the moment…" />
          </label>

          <label className="gr-toggle">
            <input type="checkbox" checked={isTeamBuilder} onChange={(e) => setIsTeamBuilder(e.target.checked)} />
            <span>This is a Team Builder (custom team) moment</span>
          </label>

          {error && <div className="gr-error">{error}</div>}
        </div>

        <div className="gr-modal-foot">
          <button className="gr-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="gr-btn-primary"
            disabled={readyUrls.length === 0 || uploading || submitting}
            onClick={handleSubmit}
            style={{ opacity: readyUrls.length === 0 || uploading || submitting ? 0.5 : 1 }}
          >
            {submitting ? 'Posting…' : uploading ? 'Uploading…' : `Post Moment${readyUrls.length > 1 ? ` (${readyUrls.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
