'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Moment {
  title: string | null;
  opponent: string | null;
  our_score: number | null;
  opp_score: number | null;
  week: string | null;
  result: string | null;
  game_state: string | null;
  is_team_builder: boolean;
}
interface ItemPost {
  id: string;
  content: string;
  media_urls: string[];
  touchdown_count: number;
  author: { username: string; display_name: string | null } | null;
  school: { name: string; abbreviation: string; primary_color: string | null } | null;
  game_moment: Moment[] | Moment | null;
}
interface Item { id: string; page_label: string | null; post: ItemPost | null }

interface Props {
  issueNumber: number;
  items: Item[];
  title?: string | null;
  coverHeadline?: string | null;
  coverSubtitle?: string | null;
  coverPostId?: string | null;
}

function moment(post: ItemPost | null): Moment | null {
  if (!post?.game_moment) return null;
  return Array.isArray(post.game_moment) ? (post.game_moment[0] ?? null) : post.game_moment;
}

function Page({ it, pageNum }: { it: Item | undefined; pageNum: number }) {
  if (!it?.post) return <div className="gr-mag-pageinner gr-mag-blank" />;
  const post = it.post;
  const m = moment(post);
  const accent = post.school?.primary_color ?? 'var(--crimson)';
  const tag = post.school?.abbreviation ?? (m?.is_team_builder ? 'Team Builder' : 'Moment');
  const img = post.media_urls?.[0];
  return (
    <div className="gr-mag-pageinner" style={{ ['--cm' as string]: accent }}>
      <div className="gr-mag-photo" data-count={1}>
        {img && <div className="gr-mag-cell"><Image src={img} alt="" fill className="gr-mag-cell-img" sizes="460px" quality={95} /></div>}
        <span className="gr-mag-tag">{tag}</span>
        <span className="gr-mag-wm">CFB <span>SOCIAL</span></span>
        {(m?.opponent || m?.our_score != null || m?.result) && (
          <div className="gr-mag-bug">
            <span className="gr-mag-bug-t">{tag} {m?.our_score ?? ''}</span>
            <span className="gr-mag-bug-sc">{m?.game_state ?? (m?.our_score != null ? 'FINAL' : 'vs')}</span>
            <span className="gr-mag-bug-t2">{m?.opponent ?? ''} {m?.opp_score ?? ''}</span>
            {m?.week && <span className="gr-mag-bug-st">{m.week}</span>}
          </div>
        )}
      </div>
      <div className="gr-mag-text">
        <div className="gr-mag-pagekicker">{[it.page_label ?? `Page ${pageNum}`, m?.opponent ? `vs ${m.opponent}` : '', m?.week].filter(Boolean).join(' · ')}</div>
        <div className="gr-mag-head">{m?.title || 'Untitled moment'}</div>
        {post.content && <div className="gr-mag-body">{post.content}</div>}
        <div className="gr-mag-by">Uploaded by <b>@{post.author?.username ?? 'coach'}</b> · {post.touchdown_count ?? 0} TD</div>
      </div>
    </div>
  );
}

export function MagazineFlip({ issueNumber, items, title, coverHeadline, coverSubtitle, coverPostId }: Props) {
  const masthead = (title ?? '').trim() || 'Game Room Weekly';
  const isDefaultMasthead = masthead.toLowerCase() === 'game room weekly';
  const valid = items.filter((it) => it.post && it.post.media_urls?.length);

  // Views: 0 = cover (single page), then one spread per pair of pages (1-2, 3-4, ...).
  const spreadCount = Math.ceil(valid.length / 2);
  const viewCount = 1 + spreadCount;
  const [view, setView] = useState(0);
  // Page-turn animation between spreads. `lo` = the lower of the two spread indices.
  const [flip, setFlip] = useState<{ dir: 'next' | 'prev'; lo: number } | null>(null);

  if (valid.length === 0) return null;

  const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;

  const next = () => {
    if (flip) return;
    if (view === 0) { setView(1); return; }
    if (view >= viewCount - 1) return;
    if (isMobile()) { setView(view + 1); return; }
    setFlip({ dir: 'next', lo: view });
  };
  const prev = () => {
    if (flip) return;
    if (view === 0) return;
    if (view === 1) { setView(0); return; }
    if (isMobile()) { setView(view - 1); return; }
    setFlip({ dir: 'prev', lo: view - 1 });
  };
  const commitFlip = () => {
    if (!flip) return;
    setView(flip.dir === 'next' ? flip.lo + 1 : flip.lo);
    setFlip(null);
  };

  // Cover = the designated cover moment (cover_post_id), else the first page.
  const cover = (valid.find((it) => it.post?.id === coverPostId) ?? valid[0]!).post!;
  const cm = moment(cover);
  const coverAccent = cover.school?.primary_color ?? 'var(--crimson)';

  const leftIdx = (view - 1) * 2;
  const leftItem = valid[leftIdx];
  const rightItem = valid[leftIdx + 1];
  const posLabel =
    view === 0
      ? 'Cover'
      : rightItem
        ? `Pages ${leftIdx + 1}–${leftIdx + 2}`
        : `Page ${leftIdx + 1}`;

  return (
    <div className="gr-mag-wrap">
      <div className="gr-mag-stage">
        {view === 0 ? (
          <div className="gr-mag-single" onClick={next} style={{ ['--cm' as string]: coverAccent }}>
            <Image src={cover.media_urls[0]!} alt="cover" fill className="gr-mag-cover-img" sizes="(max-width: 560px) 420px, 480px" quality={95} priority />
            <div className="gr-mag-veil" />
            <div className="gr-mag-cover-top">
              <div className="gr-mag-logo">
                {isDefaultMasthead ? <>GAME <b>ROOM</b> WEEKLY</> : masthead}
              </div>
              <div className="gr-mag-issue">Issue No. {issueNumber}</div>
            </div>
            <div className="gr-mag-cover-bottom">
              <div className="gr-mag-kicker">Cover Story · Moment of the Week</div>
              <div className="gr-mag-headline">{(coverHeadline ?? '').trim() || cm?.title || cover.content || 'A moment worth framing'}</div>
              {(coverSubtitle ?? '').trim() && <div className="gr-mag-dek">{coverSubtitle}</div>}
              <div className="gr-mag-byline">@{cover.author?.username ?? 'coach'}{cm?.our_score != null ? ` · ${cm.our_score}—${cm.opp_score}` : ''}</div>
            </div>
            <div className="gr-mag-openhint">click to open →</div>
          </div>
        ) : flip ? (
          (() => {
            // Pages involved in the turn (lo = lower spread index):
            //   page A = lo's left, page B = lo's right, page C = (lo+1)'s left, page D = (lo+1)'s right
            const a = (flip.lo - 1) * 2;          // base left  (stays)
            const b = a + 1;                       // lo's right
            const c = a + 2;                       // (lo+1)'s left
            const d = a + 3;                       // base right (stays)
            const frontIsB = flip.dir === 'next';  // the page visible at the start of the turn
            const frontIdx = frontIsB ? b : c;
            const backIdx = frontIsB ? c : b;
            return (
              <div className="gr-mag-spread gr-mag-flipping">
                <div className="gr-mag-half gr-mag-half-l"><Page it={valid[a]} pageNum={a + 1} /></div>
                <div className="gr-mag-half gr-mag-half-r"><Page it={valid[d]} pageNum={d + 1} /></div>
                <div className={`gr-mag-flip gr-mag-flip-${flip.dir}`} onAnimationEnd={commitFlip}>
                  <div className="gr-mag-flip-face gr-mag-flip-front"><Page it={valid[frontIdx]} pageNum={frontIdx + 1} /></div>
                  <div className="gr-mag-flip-face gr-mag-flip-back"><Page it={valid[backIdx]} pageNum={backIdx + 1} /></div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="gr-mag-spread">
            <div className="gr-mag-half gr-mag-half-l" onClick={prev}>
              <Page it={leftItem} pageNum={leftIdx + 1} />
            </div>
            <div className="gr-mag-half gr-mag-half-r" onClick={next}>
              {rightItem ? <Page it={rightItem} pageNum={leftIdx + 2} /> : <div className="gr-mag-pageinner gr-mag-blank" />}
            </div>
          </div>
        )}
      </div>
      <div className="gr-mag-controls">
        <button onClick={prev} disabled={view === 0 || !!flip}>← Prev</button>
        <span className="gr-mag-pos">{posLabel}</span>
        <button onClick={next} disabled={view >= viewCount - 1 || !!flip}>Next →</button>
      </div>
    </div>
  );
}
