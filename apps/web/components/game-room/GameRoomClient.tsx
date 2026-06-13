'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { shareIssueToFeed } from '@cfb-social/api';
import { MomentComposer } from './MomentComposer';
import { LeagueComposer } from './LeagueComposer';
import { RequestSlotModal } from './RequestSlotModal';
import { MagazineFlip } from './MagazineFlip';
import { MomentEditModal, type EditableMoment } from './MomentEditModal';
import { IssueManager } from './IssueManager';

interface MomentItem {
  id: string;
  title: string | null;
  our_score: number | null; opp_score: number | null; opponent: string | null;
  week: string | null; result: string | null; game_state: string | null; is_team_builder: boolean;
  post: {
    id: string; content: string; media_urls: string[]; touchdown_count: number;
    author: { username: string; display_name: string | null } | null;
    school: { name: string; abbreviation: string; primary_color: string | null } | null;
  } | null;
}
interface LeagueItem {
  id: string; name: string; platform: string; max_users: number; filled_count: number;
  sim_schedule: string | null; style: string; open_schools: string | null; status: string;
  join_code: string | null; join_password: string | null; is_private: boolean; cross_play: boolean; rules: string | null;
}
interface IssueItem {
  id: string; post_id: string; position: number; page_label: string | null;
  post: {
    id: string; content: string; media_urls: string[]; touchdown_count: number;
    author: { username: string; display_name: string | null } | null;
    school: { name: string; abbreviation: string; primary_color: string | null } | null;
    game_moment: Array<{ title: string | null }> | { title: string | null } | null;
  } | null;
}
interface IssueEntry {
  issue: { id: string; issue_number: number; title: string | null; cover_headline: string | null; cover_subtitle: string | null; cover_post_id: string | null; feed_post_id: string | null };
  items: IssueItem[];
}
interface RequestItem {
  id: string; league_id: string; league_name: string; preferred_school: string | null; platform: string | null; message: string | null;
  applicant: { username: string; display_name: string | null; dynasty_tier: string | null } | null;
}
interface Props {
  initialTab: string;
  moments: unknown[];
  leagues: unknown[];
  issues: unknown[];
  requests: unknown[];
}

const TABS = [
  { key: 'thisweek', label: 'Magazine' },
  { key: 'moments', label: 'Moments' },
  { key: 'leagues', label: 'Leagues' },
];

const issueHasPages = (e: IssueEntry) => e.items.some((it) => it.post && it.post.media_urls?.length > 0);

export function GameRoomClient({ initialTab, moments, leagues, issues, requests }: Props) {
  const router = useRouter();
  const { isLoggedIn, profile } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [editMoment, setEditMoment] = useState<EditableMoment | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [requestLeague, setRequestLeague] = useState<LeagueItem | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerInitial, setManagerInitial] = useState<{ issueId: string | null; title: string; coverHeadline?: string | null; coverSubtitle?: string | null; coverPostId?: string | null; pages?: { postId: string; coverUrl: string; title: string }[] } | null>(null);
  const [sharing, setSharing] = useState(false);

  const momentList = moments as MomentItem[];
  const leagueList = leagues as LeagueItem[];
  const issueList = issues as IssueEntry[];
  const requestList = requests as RequestItem[];
  const [resolving, setResolving] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);

  async function resolveRequest(requestId: string, action: 'approve' | 'decline') {
    if (resolving) return;
    setResolving(requestId);
    try {
      const res = await fetch('/api/game-room/league-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (!res.ok) throw new Error('failed');
      router.refresh();
    } catch {
      setResolving(null);
    }
  }

  const ownedCount = momentList.filter((m) => m.post && m.post.author?.username === profile?.username).length;

  // Default to the newest issue that actually has pages, else the newest issue.
  const defaultIssueId = (issueList.find(issueHasPages) ?? issueList[0])?.issue.id ?? null;
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(defaultIssueId);
  const selected =
    issueList.find((e) => e.issue.id === selectedIssueId) ??
    issueList.find((e) => e.issue.id === defaultIssueId) ??
    issueList[0] ?? null;

  const issueOptions = issueList.map((e) => ({ id: e.issue.id, issueNumber: e.issue.issue_number, title: e.issue.title || 'Game Room Weekly' }));
  const assignmentByPost: Record<string, { issueId: string | null; page: number; isCover: boolean }> = {};
  issueList.forEach((e) => e.items.forEach((it) => {
    assignmentByPost[it.post_id] = { issueId: e.issue.id, page: it.position ?? 1, isCover: e.issue.cover_post_id === it.post_id };
  }));

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function newIssue() {
    setManagerInitial({ issueId: null, title: '', coverHeadline: '', coverSubtitle: '' });
    setManagerOpen(true);
  }
  async function shareToFeed() {
    if (!selected || sharing) return;
    setSharing(true);
    try {
      await shareIssueToFeed(createClient(), selected.issue.id);
      router.refresh();
    } catch {
      setSharing(false);
    }
  }
  function arrangeIssue() {
    if (!selected) return;
    const pages = selected.items
      .filter((it) => it.post && it.post.media_urls?.length)
      .map((it) => {
        const gm = it.post!.game_moment;
        const t = Array.isArray(gm) ? gm[0]?.title : gm?.title;
        return { postId: it.post!.id, coverUrl: it.post!.media_urls[0]!, title: t || it.post!.content || 'Untitled' };
      });
    setManagerInitial({
      issueId: selected.issue.id,
      title: selected.issue.title || '',
      coverHeadline: selected.issue.cover_headline,
      coverSubtitle: selected.issue.cover_subtitle,
      coverPostId: selected.issue.cover_post_id,
      pages,
    });
    setManagerOpen(true);
  }

  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Game Room</h1>
        <div className="feed-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`feed-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'moments' && (
        <div className="gr-upload">
          <div className="gr-upload-ic" aria-hidden>▦</div>
          <div className="gr-upload-tx">
            <strong>Upload a Moment from your save</strong>
            <span>Screenshot in. It posts to Game Room and your Feed.</span>
          </div>
          {isLoggedIn ? (
            <button className="gr-upload-btn" onClick={() => setComposerOpen(true)}>Upload</button>
          ) : (
            <Link className="gr-upload-btn" href="/login?redirect=/game-room">Log in to post</Link>
          )}
        </div>
      )}

      {/* MAGAZINE */}
      {tab === 'thisweek' && (
        !selected ? (
          <div className="content-card gr-placeholder">
            <p>No issue yet. <strong>Create an issue</strong>, then add pages by assigning your moments (Moments → Edit → Issue). Start a new issue each season.</p>
            {isLoggedIn && (
              <button className="gr-btn-primary" style={{ marginTop: 14 }} onClick={newIssue} disabled={ownedCount === 0}>
                {ownedCount === 0 ? 'Upload a moment first' : 'Create your first issue'}
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="gr-issue-bar">
              {issueList.length > 1 ? (
                <select className="gr-issue-select" aria-label="Choose an issue" value={selected.issue.id} onChange={(e) => setSelectedIssueId(e.target.value)}>
                  {issueList.map((e) => (
                    <option key={e.issue.id} value={e.issue.id}>
                      {(e.issue.title || 'Game Room Weekly')} · No. {e.issue.issue_number}{issueHasPages(e) ? '' : ' (empty)'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="gr-issue-label">{selected.issue.title || 'Game Room Weekly'} · Issue No. {selected.issue.issue_number}</div>
              )}
              {isLoggedIn && (
                <span className="gr-issue-actions">
                  {issueHasPages(selected) && (
                    selected.issue.feed_post_id ? (
                      <Link className="gr-link-btn gr-shared" href={`/game-room/issue/${selected.issue.feed_post_id}`}>On the Feed ✓</Link>
                    ) : (
                      <button className="gr-link-btn" onClick={shareToFeed} disabled={sharing}>{sharing ? 'Sharing…' : 'Share to Feed'}</button>
                    )
                  )}
                  <button className="gr-link-btn" onClick={arrangeIssue}>Edit issue</button>
                  <button className="gr-link-btn" onClick={newIssue}>New Issue</button>
                </span>
              )}
            </div>

            {issueHasPages(selected) ? (
              <>
                <MagazineFlip issueNumber={selected.issue.issue_number} items={selected.items as never[]} title={selected.issue.title} coverHeadline={selected.issue.cover_headline} coverSubtitle={selected.issue.cover_subtitle} coverPostId={selected.issue.cover_post_id} />
                {leagueList.length > 0 && (
                  <div className="gr-mag-leagues">
                    <div className="gr-mag-leagues-head">
                      <h3 className="gr-mag-leagues-title">Open Online Dynasties</h3>
                      <button className="gr-link-btn" onClick={() => setTab('leagues')}>See all leagues</button>
                    </div>
                    <div className="gr-mag-leagues-row">
                      {leagueList.slice(0, 3).map((lg) => {
                        const full = lg.status === 'FULL' || lg.filled_count >= lg.max_users;
                        const styleLabel = lg.style === 'CASUAL' ? 'Casual' : 'Competitive';
                        return (
                          <button key={lg.id} className="gr-mag-league" onClick={() => setTab('leagues')}>
                            <div className="gr-mag-league-name">{lg.name}</div>
                            <div className="gr-mag-league-meta">{lg.platform} · {styleLabel}{lg.is_private ? ' · Private' : ''}</div>
                            <span className={`gr-league-badge ${full ? 'full' : 'open'}`}>{full ? 'Full' : `${lg.max_users - lg.filled_count} open`}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="content-card gr-placeholder">
                <p><strong>{selected.issue.title || 'Game Room Weekly'} · Issue No. {selected.issue.issue_number}</strong> has no pages yet. Go to <strong>Moments → Edit</strong> and assign moments to this issue (choose a page and a cover).</p>
              </div>
            )}
          </div>
        )
      )}

      {/* MOMENTS */}
      {tab === 'moments' && (
        momentList.length === 0 ? (
          <div className="content-card gr-placeholder"><p>No moments yet. Be the first — upload a screenshot from your College Football save.</p></div>
        ) : (
          <div className="gr-grid">{momentList.map((m) => {
            const a = m.post ? assignmentByPost[m.post.id] : undefined;
            const e = a?.issueId ? issueList.find((x) => x.issue.id === a.issueId) : null;
            const assignment = e ? { label: `${e.issue.title || 'Game Room Weekly'} · No. ${e.issue.issue_number}`, page: a!.page, isCover: a!.isCover } : null;
            return <MomentCard key={m.id} m={m} currentUsername={profile?.username ?? null} onEdit={setEditMoment} assignment={assignment} />;
          })}</div>
        )
      )}

      {/* LEAGUES */}
      {tab === 'leagues' && (
        <div>
          <div className="gr-lf-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="gr-lf-eyebrow">League Finder</div>
              <h2 className="gr-lf-title">Open Online Dynasties</h2>
            </div>
            {isLoggedIn && (
              <span className="gr-lf-head-actions">
                <button className="gr-inbox-btn" onClick={() => setInboxOpen(true)}>
                  Inbox
                  {requestList.length > 0 && <span className="gr-inbox-badge">{requestList.length}</span>}
                </button>
                <button className="gr-link-btn" onClick={() => setLeagueOpen(true)}>List your league</button>
              </span>
            )}
          </div>

          {leagueList.length === 0 ? (
            <div className="content-card gr-placeholder"><p>No leagues listed yet. {isLoggedIn ? 'List a CFB 27 league for coaches to join.' : 'Check back soon.'}</p></div>
          ) : (
            <div className="gr-leagues">
              {leagueList.map((lg) => {
                const pct = Math.min(100, Math.round((lg.filled_count / Math.max(1, lg.max_users)) * 100));
                const full = lg.status === 'FULL' || lg.filled_count >= lg.max_users;
                const styleLabel = lg.style === 'CASUAL' ? 'Casual' : 'Competitive';
                return (
                  <div className="gr-league-card" key={lg.id}>
                    <div className="gr-league-top">
                      <div>
                        <div className="gr-league-name">{lg.name}</div>
                        <div className="gr-league-meta">{lg.platform} · {lg.max_users}-user · {lg.cross_play ? 'Cross-play' : 'No cross-play'} · {styleLabel}{lg.is_private ? ' · Private' : ''}</div>
                      </div>
                      <span className={`gr-league-badge ${full ? 'full' : 'open'}`}>{full ? 'Full' : `${lg.max_users - lg.filled_count} open`}</span>
                    </div>
                    {lg.sim_schedule && <div className="gr-league-line">Sims: <strong>{lg.sim_schedule}</strong></div>}
                    {lg.open_schools && <div className="gr-league-line">Open schools: <strong>{lg.open_schools}</strong></div>}
                    {lg.rules && <div className="gr-league-rules">{lg.rules}</div>}
                    <div className="gr-lf-bar"><div className="gr-lf-fill" style={{ width: `${pct}%` }} /></div>
                    <div className="gr-lf-slots">{lg.filled_count} / {lg.max_users} filled</div>

                    <div className="gr-league-join">
                      <div className="gr-join-row"><span className="gr-join-k">League Name</span><code className="gr-join-v">{lg.join_code || '—'}</code>{lg.join_code && <button className="gr-copy" onClick={() => copy(lg.join_code!)}>Copy</button>}</div>
                      {lg.is_private && !lg.join_password ? (
                        <>
                          <div className="gr-join-row"><span className="gr-join-k">Password</span><span className="gr-join-locked">Private — request to get it</span></div>
                          <button className={`gr-lf-btn ${full ? 'wait' : ''}`} disabled={full} onClick={() => !full && (isLoggedIn ? setRequestLeague(lg) : router.push('/login?redirect=/game-room'))}>
                            {full ? 'Full' : 'Request to Join'}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="gr-join-row"><span className="gr-join-k">Password</span><code className="gr-join-v">{lg.join_password || '—'}</code>{lg.join_password && <button className="gr-copy" onClick={() => copy(lg.join_password!)}>Copy</button>}</div>
                          <div className="gr-join-note">In CFB 27 → Online Dynasty → Join with this League Name + Password.</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {inboxOpen && (
        <div className="gr-modal-backdrop" onClick={() => setInboxOpen(false)}>
          <div className="gr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gr-modal-head">
              <span className="gr-modal-title">Join Requests{requestList.length > 0 ? ` (${requestList.length})` : ''}</span>
              <button className="gr-modal-x" onClick={() => setInboxOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="gr-modal-body">
              {requestList.length === 0 ? (
                <p className="gr-inbox-empty">No pending requests yet. When a coach asks to join one of your private leagues, it shows up here.</p>
              ) : (
                requestList.map((r) => (
                  <div className="gr-inbox-row" key={r.id}>
                    <div className="gr-inbox-info">
                      <div className="gr-inbox-who">
                        <Link href={`/profile/${r.applicant?.username ?? ''}`}>@{r.applicant?.username ?? 'coach'}</Link>
                        <span className="gr-inbox-league">{r.league_name}</span>
                      </div>
                      <div className="gr-inbox-meta">
                        {[r.preferred_school ? `Wants ${r.preferred_school}` : null, r.platform].filter(Boolean).join(' · ')}
                      </div>
                      {r.message && <div className="gr-inbox-msg">&ldquo;{r.message}&rdquo;</div>}
                    </div>
                    <div className="gr-inbox-actions">
                      <button className="gr-inbox-approve" disabled={resolving === r.id} onClick={() => resolveRequest(r.id, 'approve')}>{resolving === r.id ? '…' : 'Approve'}</button>
                      <button className="gr-inbox-decline" disabled={resolving === r.id} onClick={() => resolveRequest(r.id, 'decline')}>Decline</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {composerOpen && <MomentComposer onClose={() => setComposerOpen(false)} onPosted={() => { setComposerOpen(false); router.refresh(); }} />}
      {leagueOpen && <LeagueComposer onClose={() => setLeagueOpen(false)} onCreated={() => { setLeagueOpen(false); router.refresh(); }} />}
      {requestLeague && <RequestSlotModal league={requestLeague} onClose={() => setRequestLeague(null)} onSent={() => { setRequestLeague(null); router.refresh(); }} />}
      {editMoment && <MomentEditModal moment={editMoment} issues={issueOptions} assignment={assignmentByPost[editMoment.postId] ?? { issueId: null, page: 1, isCover: false }} onClose={() => setEditMoment(null)} onSaved={() => { setEditMoment(null); router.refresh(); }} />}
      {managerOpen && <IssueManager initial={managerInitial} allIssues={issueOptions} onClose={() => setManagerOpen(false)} onSaved={() => { setManagerOpen(false); router.refresh(); }} />}
    </div>
  );
}

function MomentCard({ m, currentUsername, onEdit, assignment }: { m: MomentItem; currentUsername: string | null; onEdit: (e: EditableMoment) => void; assignment: { label: string; page: number; isCover: boolean } | null }) {
  const post = m.post;
  if (!post) return null;
  const img = post.media_urls?.[0];
  const accent = post.school?.primary_color ?? 'var(--crimson)';
  const tag = post.school?.abbreviation ?? (m.is_team_builder ? 'Team Builder' : 'Moment');
  const score = (m.our_score != null && m.opp_score != null) ? `${tag} ${m.our_score}—${m.opp_score}` : (m.result ?? '');
  const owned = !!currentUsername && post.author?.username === currentUsername;

  function startEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onEdit({
      postId: post!.id,
      title: m.title,
      content: post!.content ?? '',
      mediaUrls: post!.media_urls ?? [],
      opponent: m.opponent,
      ourScore: m.our_score,
      oppScore: m.opp_score,
      week: m.week,
      isTeamBuilder: m.is_team_builder,
    });
  }

  return (
    <Link href={`/post/${post.id}`} className="gr-card" style={{ ['--m' as string]: accent }}>
      <div className="gr-card-frame">
        {img && <Image src={img} alt={post.content || 'Moment'} fill className="gr-card-img" sizes="(max-width: 700px) 100vw, 560px" quality={90} />}
        <span className="gr-card-tag">{tag}</span>
        <span className="gr-card-wm">CFB <span>SOCIAL</span></span>
        {score && <span className="gr-card-score">{score}{m.week ? ` · ${m.week}` : ''}</span>}
      </div>
      <div className="gr-card-body">
        <div className="gr-card-cap">{m.title || post.content || 'Untitled moment'}</div>
        {assignment ? (
          <div className="gr-card-issue">
            <span className="gr-card-issue-tag">{assignment.isCover ? 'Cover' : `Page ${assignment.page}`}</span>
            {assignment.label}
          </div>
        ) : (
          <div className="gr-card-issue gr-card-issue-none">Not in an issue</div>
        )}
        <div className="gr-card-foot">
          <span>@{post.author?.username ?? 'unknown'}</span>
          <span className="gr-card-foot-right">
            {owned && <button className="gr-card-edit" onClick={startEdit}>Edit</button>}
            {post.touchdown_count} TD
          </span>
        </div>
      </div>
    </Link>
  );
}
