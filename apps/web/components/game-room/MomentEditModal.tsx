'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/upload/imageUpload';
import { revalidateFeed } from '@/lib/actions/feed';
import { updateMoment } from '@cfb-social/api';

export interface EditableMoment {
  postId: string;
  title: string | null;
  content: string;
  mediaUrls: string[];
  opponent: string | null;
  ourScore: number | null;
  oppScore: number | null;
  week: string | null;
  isTeamBuilder: boolean;
}

export interface IssueOption { id: string; issueNumber: number; title: string }

interface Props {
  moment: EditableMoment;
  issues: IssueOption[];
  assignment: { issueId: string | null; page: number; isCover: boolean };
  onClose: () => void;
  onSaved: () => void;
}

const MAX_IMAGES = 4;

export function MomentEditModal({ moment, issues, assignment, onClose, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>(moment.mediaUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(moment.title ?? '');
  const [caption, setCaption] = useState(moment.content ?? '');
  const [opponent, setOpponent] = useState(moment.opponent ?? '');
  const [ourScore, setOurScore] = useState(moment.ourScore != null ? String(moment.ourScore) : '');
  const [oppScore, setOppScore] = useState(moment.oppScore != null ? String(moment.oppScore) : '');
  const [week, setWeek] = useState(moment.week ?? '');
  const [isTeamBuilder, setIsTeamBuilder] = useState(moment.isTeamBuilder);
  const [issueChoice, setIssueChoice] = useState<string>(assignment.issueId ?? '');
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [page, setPage] = useState(String(assignment.page || 1));
  const [isCover, setIsCover] = useState(assignment.isCover);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const makeCover = (i: number) => setUrls((prev) => { const c = [...prev]; const [x] = c.splice(i, 1); return [x!, ...c]; });
  const remove = (i: number) => setUrls((prev) => prev.filter((_, idx) => idx !== i));

  const addFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (fileRef.current) fileRef.current.value = '';
    const room = MAX_IMAGES - urls.length;
    setUploading(true);
    setError('');
    try {
      const added = await Promise.all(files.slice(0, room).map((f) => uploadImage(f)));
      setUrls((prev) => [...prev, ...added]);
    } catch {
      setError('One or more uploads failed.');
    } finally {
      setUploading(false);
    }
  }, [urls.length]);

  async function save() {
    if (urls.length === 0) { setError('Keep at least one image.'); return; }
    if (submitting || uploading) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      await updateMoment(supabase, {
        postId: moment.postId,
        title: title.trim() || null,
        content: caption.trim(),
        mediaUrls: urls,
        opponent: opponent.trim() || null,
        ourScore: ourScore ? parseInt(ourScore, 10) : null,
        oppScore: oppScore ? parseInt(oppScore, 10) : null,
        week: week.trim() || null,
        isTeamBuilder,
      });

      // Issue assignment (page + cover)
      const assignBody: Record<string, unknown> = { postId: moment.postId, page: parseInt(page, 10) || 1, isCover };
      if (issueChoice === '__new__') assignBody.newIssueTitle = newIssueTitle.trim() || 'Game Room Weekly';
      else if (issueChoice) assignBody.issueId = issueChoice;
      else assignBody.issueId = null; // unassign
      const aRes = await fetch('/api/game-room/assign-moment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignBody) });
      if (!aRes.ok) { const d = await aRes.json().catch(() => ({})); throw new Error(d.error || 'Could not assign to issue'); }

      await revalidateFeed();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
      setSubmitting(false);
    }
  }

  return (
    <div className="gr-modal-backdrop" onClick={onClose}>
      <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gr-modal-head">
          <span className="gr-modal-title">Edit Moment</span>
          <button className="gr-modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="gr-modal-body">
          <div className="gr-edit-hint">The <strong>cover</strong> image is what shows in the magazine and grid. Use “Make cover” to choose it.</div>
          <div className="gr-thumbs">
            {urls.map((url, i) => (
              <div key={url + i} className={`gr-thumb ${i === 0 ? 'is-cover' : ''}`}>
                <Image src={url} alt="" width={120} height={84} className="gr-thumb-img" unoptimized />
                {i === 0 ? <span className="gr-cover-badge">Cover</span> : <button className="gr-makecover" onClick={() => makeCover(i)}>Make cover</button>}
                {urls.length > 1 && <button className="gr-thumb-x" onClick={() => remove(i)} aria-label="Remove">×</button>}
              </div>
            ))}
            {urls.length < MAX_IMAGES && (
              <button className="gr-thumb gr-thumb-add" onClick={() => fileRef.current?.click()} aria-label="Add image">{uploading ? '…' : '+'}</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} style={{ display: 'none' }} />

          <label className="gr-field gr-field-full"><span>Title (magazine headline)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. The Catch in Death Valley" />
          </label>
          <div className="gr-field-grid">
            <label className="gr-field"><span>Opponent</span><input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. Texas" /></label>
            <label className="gr-field gr-field-sm"><span>Your score</span><input value={ourScore} onChange={(e) => setOurScore(e.target.value)} inputMode="numeric" /></label>
            <label className="gr-field gr-field-sm"><span>Opp score</span><input value={oppScore} onChange={(e) => setOppScore(e.target.value)} inputMode="numeric" /></label>
            <label className="gr-field gr-field-sm"><span>Week</span><input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="Wk 6" /></label>
          </div>
          <label className="gr-field gr-field-full"><span>Caption (the story)</span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2000} rows={3} />
          </label>
          <label className="gr-toggle">
            <input type="checkbox" checked={isTeamBuilder} onChange={(e) => setIsTeamBuilder(e.target.checked)} />
            <span>Team Builder (custom team) moment</span>
          </label>

          <div className="gr-im-assign">
            <div className="gr-im-assign-h">Magazine</div>
            <div className="gr-field-grid gr-assign-grid">
              <label className="gr-field"><span>Issue</span>
                <select value={issueChoice} onChange={(e) => setIssueChoice(e.target.value)}>
                  <option value="">Not in an issue</option>
                  {issues.map((i) => <option key={i.id} value={i.id}>{i.title} · No. {i.issueNumber}</option>)}
                  <option value="__new__">+ New issue…</option>
                </select>
              </label>
              <label className="gr-field"><span>Page</span>
                <input value={page} onChange={(e) => setPage(e.target.value)} inputMode="numeric" disabled={!issueChoice} />
              </label>
            </div>
            {issueChoice === '__new__' && (
              <label className="gr-field gr-field-full"><span>New issue title</span>
                <input value={newIssueTitle} onChange={(e) => setNewIssueTitle(e.target.value)} placeholder="e.g. LSU Dynasty — Season 1" />
              </label>
            )}
            {issueChoice && (
              <label className="gr-toggle"><input type="checkbox" checked={isCover} onChange={(e) => setIsCover(e.target.checked)} /><span>Set as this issue&apos;s cover</span></label>
            )}
          </div>
          {error && <div className="gr-error">{error}</div>}
        </div>
        <div className="gr-modal-foot">
          <button className="gr-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="gr-btn-primary" disabled={submitting || uploading} onClick={save} style={{ opacity: submitting || uploading ? 0.5 : 1 }}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
