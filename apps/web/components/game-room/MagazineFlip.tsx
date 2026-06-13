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

export function MagazineFlip({ issueNumber, items, title, coverHeadline, coverSubtitle, coverPostId }: Props) {
  const masthead = (title ?? '').trim() || 'Game Room Weekly';
  const isDefaultMasthead = masthead.toLowerCase() === 'game room weekly';
  const valid = items.filter((it) => it.post && it.post.media_urls?.length);
  // pages: cover, EVERY moment as a page (incl. the cover story), back cover
  const pageCount = valid.length + 2;
  const [turned, setTurned] = useState(0);

  if (valid.length === 0) return null;

  const labels = ['Cover', ...valid.map((_, i) => `Page ${i + 2}`), 'Back cover'];
  const next = () => setTurned((t) => Math.min(pageCount - 1, t + 1));
  const prev = () => setTurned((t) => Math.max(0, t - 1));

  // Build page nodes
  const pages: React.ReactNode[] = [];

  // Cover = the designated cover moment (cover_post_id), else the first page
  const cover = valid.find((it) => it.post?.id === coverPostId) ?? valid[0]!;
  const cm = moment(cover.post);
  const coverAccent = cover.post?.school?.primary_color ?? 'var(--crimson)';
  pages.push(
    <div className="gr-mag-page gr-mag-cover" key="cover" style={{ ['--cm' as string]: coverAccent }}>
      <Image src={cover.post!.media_urls[0]!} alt="cover" fill className="gr-mag-cover-img" sizes="(max-width: 560px) 640px, 960px" quality={95} priority />
      <div className="gr-mag-veil" />
      <div className="gr-mag-cover-top">
        <div className="gr-mag-logo">
          {isDefaultMasthead ? <>GAME <b>ROOM</b> WEEKLY</> : masthead}
        </div>
        <div className="gr-mag-issue">Issue No. {issueNumber}</div>
      </div>
      <div className="gr-mag-cover-bottom">
        <div className="gr-mag-kicker">Cover Story · Moment of the Week</div>
        <div className="gr-mag-headline">{(coverHeadline ?? '').trim() || cm?.title || cover.post!.content || 'A moment worth framing'}</div>
        {(coverSubtitle ?? '').trim() && <div className="gr-mag-dek">{coverSubtitle}</div>}
        <div className="gr-mag-byline">@{cover.post!.author?.username ?? 'coach'}{cm?.our_score != null ? ` · ${cm.our_score}—${cm.opp_score}` : ''}</div>
      </div>
      <div className="gr-mag-openhint">click to open →</div>
    </div>
  );

  // Moment pages — every moment gets a full page (cover story included)
  valid.forEach((it, i) => {
    const m = moment(it.post);
    const accent = it.post?.school?.primary_color ?? 'var(--crimson)';
    const tag = it.post?.school?.abbreviation ?? (m?.is_team_builder ? 'Team Builder' : 'Moment');
    const imgs = (it.post!.media_urls ?? []).slice(0, 4);
    pages.push(
      <div className="gr-mag-page gr-mag-moment" key={it.id} style={{ ['--cm' as string]: accent }}>
        <div className="gr-mag-photo" data-count={imgs.length}>
          {imgs.map((u, k) => (
            <div className="gr-mag-cell" key={k}><Image src={u} alt="" fill className="gr-mag-cell-img" sizes="640px" quality={95} /></div>
          ))}
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
          <div className="gr-mag-pagekicker">{[it.page_label ?? `Page ${i + 2}`, m?.opponent ? `vs ${m.opponent}` : '', m?.week].filter(Boolean).join(' · ')}</div>
          <div className="gr-mag-head">{m?.title || 'Untitled moment'}</div>
          {it.post!.content && <div className="gr-mag-body">{it.post!.content}</div>}
          <div className="gr-mag-by">Uploaded by <b>@{it.post!.author?.username ?? 'coach'}</b> · {it.post!.touchdown_count ?? 0} TD</div>
        </div>
      </div>
    );
  });

  // Back cover
  pages.push(
    <div className="gr-mag-page gr-mag-back" key="back">
      <div className="gr-mag-back-logo">GAME <b>ROOM</b></div>
      <p>Your save deserves a cover. Upload your moments and make next week&apos;s issue.</p>
    </div>
  );

  return (
    <div className="gr-mag-wrap">
      <div className="gr-mag-stage">
        <div className="gr-mag-book">
          {pages.map((node, i) => (
            <div
              key={i}
              className={`gr-mag-leaf ${i < turned ? 'flipped' : ''}`}
              style={{ zIndex: i < turned ? i : pageCount - i }}
              onClick={() => (i < turned ? prev() : next())}
            >
              {node}
            </div>
          ))}
        </div>
      </div>
      <div className="gr-mag-controls">
        <button onClick={prev} disabled={turned === 0}>← Prev</button>
        <span className="gr-mag-pos">{labels[turned] ?? `Page ${turned + 1}`}</span>
        <button onClick={next} disabled={turned >= pageCount - 1}>Next →</button>
      </div>
    </div>
  );
}
