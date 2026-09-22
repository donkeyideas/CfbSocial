'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/* ── Types (mirror backend contracts) ──────────────────────────── */

interface AdminPost {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  post_type: 'MATCHUP' | 'GENERAL';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  featured: boolean;
  views: number;
  excerpt: string | null;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string | null;
  tags: string[];
  faqs: Array<{ question: string; answer: string }>;
  home_school_id: string | null;
  away_school_id: string | null;
  matchup_slug: string | null;
  cover_image_url: string | null;
}

interface GameOption {
  espnGameId: string;
  date: string | null;
  name: string;
  home: { slug: string; name: string; abbr: string };
  away: { slug: string; name: string; abbr: string };
}

interface SchoolOption {
  slug: string;
  name: string;
  abbr: string;
}

/* Post-type selector options */
type PostGenType = 'matchup' | 'weekly-recap' | 'portal-roundup' | 'power-rankings' | 'freeform';

const POST_TYPE_OPTIONS: Array<{ value: PostGenType; label: string }> = [
  { value: 'matchup', label: 'Matchup Preview' },
  { value: 'weekly-recap', label: 'Weekly Recap' },
  { value: 'portal-roundup', label: 'Transfer Portal Roundup' },
  { value: 'power-rankings', label: 'Power Rankings' },
  { value: 'freeform', label: 'Freeform Topic' },
];

function postTypeLabel(t: PostGenType): string {
  return POST_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? 'Article';
}

/*
 * Backend returns one of two context shapes depending on type.
 * Matchup: full home/away/matchupSlug; editorial/freeform: label only.
 */
interface GeneratedContext {
  postType: 'MATCHUP' | 'GENERAL';
  home?: { id: string; name: string; slug: string };
  away?: { id: string; name: string; slug: string };
  matchupSlug?: string;
  hasGame?: boolean;
  label?: string;
  dataPreview: string;
}

interface Faq {
  question: string;
  answer: string;
}

/* Editable form state used for both new-generated and existing posts */
interface EditableFields {
  id?: string;
  title: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  tags: string; // comma-separated in the UI
  faqs: Faq[];
  postType: 'MATCHUP' | 'GENERAL';
  homeSchoolId: string | null;
  awaySchoolId: string | null;
  matchupSlug: string | null;
  coverImageUrl: string;
  slug?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

/* ── Small styled primitives (admin theme) ─────────────────────── */

const card: React.CSSProperties = {
  background: 'var(--admin-surface)',
  border: '1.5px solid var(--admin-border)',
  borderRadius: '6px',
  padding: '20px',
};

const label: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--admin-sans)',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--admin-text-secondary)',
  marginBottom: '6px',
};

function btnStyle(kind: 'primary' | 'secondary' | 'danger' | 'ghost'): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: 'var(--admin-sans)',
    fontSize: '0.82rem',
    fontWeight: 600,
    padding: '8px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '1.5px solid transparent',
    transition: 'opacity 0.15s',
  };
  if (kind === 'primary') return { ...base, background: 'var(--admin-accent)', color: '#fff' };
  if (kind === 'danger') return { ...base, background: 'transparent', color: 'var(--admin-error)', border: '1.5px solid var(--admin-error)' };
  if (kind === 'ghost') return { ...base, background: 'transparent', color: 'var(--admin-text)', border: '1.5px solid var(--admin-border)' };
  return { ...base, background: 'var(--admin-surface-raised)', color: 'var(--admin-text)', border: '1.5px solid var(--admin-border)' };
}

function statusColor(status: string): string {
  if (status === 'PUBLISHED') return 'var(--admin-success)';
  if (status === 'DRAFT') return 'var(--admin-warning)';
  return 'var(--admin-text-muted)';
}

/* ── Component ─────────────────────────────────────────────────── */

type View = 'list' | 'new' | 'edit';

export function BlogManagerClient() {
  const [view, setView] = useState<View>('list');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch('/api/admin/blog', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load posts');
      setPosts(json.posts ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load posts');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const [editPost, setEditPost] = useState<AdminPost | null>(null);

  const openEdit = useCallback((post: AdminPost) => {
    setEditPost(post);
    setView('edit');
  }, []);

  const backToList = useCallback(() => {
    setEditPost(null);
    setView('list');
    void loadPosts();
  }, [loadPosts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <h1 className="admin-section-title" style={{ margin: 0 }}>The Wire — Blog Manager</h1>
        {view === 'list' && (
          <button style={btnStyle('primary')} onClick={() => setView('new')}>
            New Post
          </button>
        )}
        {view !== 'list' && (
          <button style={btnStyle('ghost')} onClick={backToList}>
            Back to list
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          <BackfillTools />
          <PostList
            posts={posts}
            loading={loadingList}
            error={listError}
            onEdit={openEdit}
            onChanged={loadPosts}
          />
        </>
      )}

      {view === 'new' && <NewPostFlow onSaved={backToList} />}

      {view === 'edit' && editPost && <EditPostForm post={editPost} onSaved={backToList} />}
    </div>
  );
}

/* ── Tools: backfill game history ──────────────────────────────── */

function BackfillTools() {
  const [years, setYears] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ upserted: number; years: number[]; errors: string[] } | null>(null);

  async function backfill() {
    setError(null);
    setResult(null);
    const parsed = years
      .split(',')
      .map((y) => parseInt(y.trim(), 10))
      .filter((y) => Number.isFinite(y));
    if (parsed.length === 0) {
      setError('Enter at least one valid year.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/blog/backfill-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ years: parsed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Backfill failed');
      setResult({ upserted: json.upserted ?? 0, years: json.years ?? parsed, errors: json.errors ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backfill failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={card}>
      <span style={label}>Tools</span>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '8px' }}>
        <div style={{ minWidth: '220px' }}>
          <label style={label} htmlFor="backfill-years">Years (comma-separated)</label>
          <input
            id="backfill-years"
            className="admin-input"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder="2024, 2025"
            style={inputStyle}
          />
        </div>
        <button style={btnStyle('secondary')} onClick={backfill} disabled={busy}>
          {busy ? 'Backfilling...' : 'Backfill game history'}
        </button>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: '8px', marginBottom: 0 }}>
        Pulls historical games into the matchup index so older matchups can be linked. Uses your CFBD API quota.
      </p>
      {error && <div style={{ color: 'var(--admin-error)', marginTop: '10px', fontSize: '0.85rem' }}>{error}</div>}
      {result && (
        <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>
          <div>
            Upserted <strong style={{ color: 'var(--admin-text)' }}>{result.upserted}</strong> game
            {result.upserted === 1 ? '' : 's'} for years {result.years.join(', ')}.
          </div>
          {result.errors.length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px', color: 'var(--admin-error)' }}>
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ── List view ─────────────────────────────────────────────────── */

function PostList({
  posts,
  loading,
  error,
  onEdit,
  onChanged,
}: {
  posts: AdminPost[];
  loading: boolean;
  error: string | null;
  onEdit: (p: AdminPost) => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function togglePublish(post: AdminPost) {
    setBusyId(post.id);
    setRowError(null);
    const nextStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      onChanged();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(post: AdminPost) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setBusyId(post.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      onChanged();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div style={{ ...card, color: 'var(--admin-text-secondary)' }}>Loading posts...</div>;
  }
  if (error) {
    return <div style={{ ...card, color: 'var(--admin-error)' }}>{error}</div>;
  }
  if (!posts.length) {
    return (
      <div style={{ ...card, textAlign: 'center', color: 'var(--admin-text-secondary)' }}>
        No blog posts yet. Use &ldquo;New Post&rdquo; to generate your first article.
      </div>
    );
  }

  return (
    <div style={card}>
      {rowError && (
        <div style={{ marginBottom: '12px', color: 'var(--admin-error)', fontSize: '0.85rem' }}>{rowError}</div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Published</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, color: 'var(--admin-text)' }}>{post.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>/{post.slug}</div>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-secondary)' }}>{post.post_type}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor(post.status) }}>
                    {post.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-secondary)' }}>
                    {post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button style={btnStyle('ghost')} onClick={() => onEdit(post)}>
                      Edit
                    </button>
                    {post.status === 'PUBLISHED' && (
                      <a
                        style={{ ...btnStyle('ghost'), textDecoration: 'none' }}
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview
                      </a>
                    )}
                    <button
                      style={btnStyle('secondary')}
                      disabled={busyId === post.id}
                      onClick={() => togglePublish(post)}
                    >
                      {post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button style={btnStyle('danger')} disabled={busyId === post.id} onClick={() => remove(post)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--admin-text-muted)',
};
const tdStyle: React.CSSProperties = { padding: '10px', verticalAlign: 'top' };

/* ── New post flow (pick + generate + edit) ────────────────────── */

function encv(s: string): string {
  return encodeURIComponent(s ?? '');
}

function NewPostFlow({ onSaved }: { onSaved: () => void }) {
  const [postType, setPostType] = useState<PostGenType>('matchup');

  const [games, setGames] = useState<GameOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);

  const [mode, setMode] = useState<'game' | 'manual'>('game');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [homeSlug, setHomeSlug] = useState('');
  const [awaySlug, setAwaySlug] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [fields, setFields] = useState<EditableFields | null>(null);
  const [context, setContext] = useState<GeneratedContext | null>(null);

  /* Games/schools are only needed for the matchup type; fetch lazily. */
  useEffect(() => {
    if (postType !== 'matchup' || games.length > 0 || !loadingGames) return;
    (async () => {
      setLoadingGames(true);
      setGamesError(null);
      try {
        const res = await fetch('/api/admin/blog/games', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load games');
        setGames(json.games ?? []);
        setSchools(json.schools ?? []);
      } catch (e) {
        setGamesError(e instanceof Error ? e.message : 'Failed to load games');
      } finally {
        setLoadingGames(false);
      }
    })();
  }, [postType, games.length, loadingGames]);

  const selectedGame = useMemo(
    () => games.find((g) => g.espnGameId === selectedGameId) ?? null,
    [games, selectedGameId],
  );

  const espnGameId = mode === 'game' ? selectedGame?.espnGameId : undefined;
  const effectiveHome = mode === 'game' ? selectedGame?.home.slug ?? '' : homeSlug;
  const effectiveAway = mode === 'game' ? selectedGame?.away.slug ?? '' : awaySlug;

  async function generate() {
    setGenError(null);

    // Validate + build type-specific payload.
    const body: Record<string, unknown> = { type: postType };
    if (postType === 'matchup') {
      if (!effectiveHome || !effectiveAway) {
        setGenError('Pick a game or two schools first.');
        return;
      }
      if (effectiveHome === effectiveAway) {
        setGenError('Pick two different schools.');
        return;
      }
      body.homeSlug = effectiveHome;
      body.awaySlug = effectiveAway;
      if (espnGameId) body.espnGameId = espnGameId;
    } else if (postType === 'freeform') {
      if (!topic.trim()) {
        setGenError('Enter a topic / working title first.');
        return;
      }
      body.title = topic.trim();
    }
    if (notes.trim()) body.notes = notes.trim();

    setGenerating(true);
    try {
      const res = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      const blog = json.blog;
      const ctx: GeneratedContext = json.context;

      // Default cover URL by type.
      const coverUrl =
        ctx.postType === 'MATCHUP' && ctx.home && ctx.away
          ? `/api/blog/cover?home=${encv(ctx.home.slug)}&away=${encv(ctx.away.slug)}&title=${encv(blog.title ?? '')}`
          : `/api/blog/cover?kicker=${encv(ctx.label || postTypeLabel(postType))}&title=${encv(blog.title ?? '')}`;

      setContext(ctx);
      setFields({
        title: blog.title ?? '',
        content: blog.content ?? '',
        excerpt: blog.excerpt ?? '',
        metaTitle: '',
        metaDescription: blog.metaDescription ?? '',
        keywords: blog.keywords ?? '',
        tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
        faqs: Array.isArray(blog.faqs) ? blog.faqs : [],
        postType: ctx.postType,
        homeSchoolId: ctx.home?.id ?? null,
        awaySchoolId: ctx.away?.id ?? null,
        matchupSlug: ctx.matchupSlug ?? null,
        coverImageUrl: coverUrl,
      });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  /* Once generated, show the editable form */
  if (fields) {
    return (
      <ArticleForm
        initial={fields}
        context={context}
        submitLabels={{ draft: 'Save Draft', publish: 'Publish' }}
        onSubmit={async (values, status) => {
          const res = await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toCreateBody(values, status)),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Save failed');
          onSaved();
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={card}>
        <div style={{ marginBottom: '16px' }}>
          <label style={label} htmlFor="post-type-select">Post type</label>
          <select
            id="post-type-select"
            className="admin-select"
            value={postType}
            onChange={(e) => setPostType(e.target.value as PostGenType)}
            style={selectStyle}
          >
            {POST_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {postType === 'matchup' && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button style={mode === 'game' ? btnStyle('primary') : btnStyle('ghost')} onClick={() => setMode('game')}>
                This week&rsquo;s games
              </button>
              <button style={mode === 'manual' ? btnStyle('primary') : btnStyle('ghost')} onClick={() => setMode('manual')}>
                Pick two schools
              </button>
            </div>

            {gamesError && <div style={{ color: 'var(--admin-error)', marginBottom: '12px' }}>{gamesError}</div>}

            {mode === 'game' && (
              <div>
                <label style={label} htmlFor="game-select">Game</label>
                {loadingGames ? (
                  <div style={{ color: 'var(--admin-text-secondary)' }}>Loading this week&rsquo;s games...</div>
                ) : games.length === 0 ? (
                  <div style={{ color: 'var(--admin-text-secondary)', fontSize: '0.85rem' }}>
                    No mapped games this week. Switch to &ldquo;Pick two schools&rdquo; to build a matchup manually.
                  </div>
                ) : (
                  <select
                    id="game-select"
                    className="admin-select"
                    value={selectedGameId}
                    onChange={(e) => setSelectedGameId(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">Select a game...</option>
                    {games.map((g) => (
                      <option key={g.espnGameId} value={g.espnGameId}>
                        {g.name}
                        {g.date ? ` — ${new Date(g.date).toLocaleDateString()}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {mode === 'manual' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <SchoolPicker label="Away school" value={awaySlug} onChange={setAwaySlug} schools={schools} loading={loadingGames} />
                <SchoolPicker label="Home school" value={homeSlug} onChange={setHomeSlug} schools={schools} loading={loadingGames} />
              </div>
            )}
          </>
        )}

        {postType === 'freeform' && (
          <div>
            <label style={label} htmlFor="topic">Topic / working title</label>
            <input
              id="topic"
              className="admin-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Why the SEC is unbeatable in September"
              style={inputStyle}
            />
          </div>
        )}

        {(postType === 'weekly-recap' || postType === 'portal-roundup' || postType === 'power-rankings') && (
          <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>
            No extra inputs needed — the generator pulls the latest data for this report. Add editor notes below to steer it, then Generate.
          </div>
        )}

        <div style={{ marginTop: '16px' }}>
          <label style={label} htmlFor="notes">Editor notes (optional)</label>
          <textarea
            id="notes"
            className="admin-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Angle, key storylines, tone hints for the generator..."
            rows={3}
            style={textareaStyle}
          />
        </div>

        {genError && <div style={{ color: 'var(--admin-error)', marginTop: '12px' }}>{genError}</div>}

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={btnStyle('primary')} onClick={generate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate with AI'}
          </button>
          {generating && (
            <span style={{ fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>
              Writing the article — this usually takes 5 to 15 seconds.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SchoolPicker({
  label: lbl,
  value,
  onChange,
  schools,
  loading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  schools: SchoolOption[];
  loading: boolean;
}) {
  const [query, setQuery] = useState('');
  const selected = schools.find((s) => s.slug === value) || null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return schools
      .filter((s) => s.name.toLowerCase().includes(q) || s.abbr.toLowerCase().includes(q))
      .slice(0, 8);
  }, [schools, query]);

  return (
    <div>
      <label style={label}>{lbl}</label>

      {selected ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '4px',
            border: '1.5px solid var(--admin-accent)',
            background: 'var(--admin-surface-raised)',
            color: 'var(--admin-text)',
            fontSize: '0.85rem',
          }}
        >
          <span><strong>{selected.name}</strong>{selected.abbr ? ` (${selected.abbr})` : ''}</span>
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); }}
            style={{ ...btnStyle('ghost'), padding: '4px 8px', fontSize: '0.72rem' }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            className="admin-input"
            placeholder="Type a school name, then click it..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={inputStyle}
            disabled={loading}
            autoComplete="off"
          />
          {query.trim() && (
            <div
              style={{
                marginTop: '4px',
                border: '1.5px solid var(--admin-border)',
                borderRadius: '4px',
                background: 'var(--admin-surface-raised)',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ padding: '8px 10px', color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                  No schools match &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => { onChange(s.slug); setQuery(''); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--admin-border)',
                      color: 'var(--admin-text)',
                      fontFamily: 'var(--admin-sans)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {s.name}{s.abbr ? ` (${s.abbr})` : ''}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Edit existing post ────────────────────────────────────────── */

function EditPostForm({ post, onSaved }: { post: AdminPost; onSaved: () => void }) {
  const initial: EditableFields = {
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt ?? '',
    metaTitle: post.meta_title ?? '',
    metaDescription: post.meta_description ?? '',
    keywords: post.keywords ?? '',
    tags: (post.tags ?? []).join(', '),
    faqs: post.faqs ?? [],
    postType: post.post_type,
    homeSchoolId: post.home_school_id,
    awaySchoolId: post.away_school_id,
    matchupSlug: post.matchup_slug,
    coverImageUrl: post.cover_image_url ?? '',
    slug: post.slug,
    status: post.status,
  };

  return (
    <ArticleForm
      initial={initial}
      context={null}
      existingSlug={post.slug}
      existingStatus={post.status}
      submitLabels={{ draft: 'Save', publish: post.status === 'PUBLISHED' ? 'Update (published)' : 'Publish' }}
      onSubmit={async (values, status) => {
        const res = await fetch(`/api/admin/blog/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toPatchBody(values, status)),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Update failed');
        onSaved();
      }}
    />
  );
}

/* ── Shared article form ───────────────────────────────────────── */

function ArticleForm({
  initial,
  context,
  submitLabels,
  onSubmit,
  existingSlug,
  existingStatus,
}: {
  initial: EditableFields;
  context: GeneratedContext | null;
  submitLabels: { draft: string; publish: string };
  onSubmit: (values: EditableFields, status: 'DRAFT' | 'PUBLISHED') => Promise<void>;
  existingSlug?: string;
  existingStatus?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}) {
  const [values, setValues] = useState<EditableFields>(initial);
  const [saving, setSaving] = useState<'DRAFT' | 'PUBLISHED' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showData, setShowData] = useState(false);

  function set<K extends keyof EditableFields>(key: K, val: EditableFields[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function updateFaq(i: number, patch: Partial<Faq>) {
    setValues((v) => ({ ...v, faqs: v.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) }));
  }
  function addFaq() {
    setValues((v) => ({ ...v, faqs: [...v.faqs, { question: '', answer: '' }] }));
  }
  function removeFaq(i: number) {
    setValues((v) => ({ ...v, faqs: v.faqs.filter((_, idx) => idx !== i) }));
  }

  async function submit(status: 'DRAFT' | 'PUBLISHED') {
    setError(null);
    if (!values.title.trim() || !values.content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSaving(status);
    try {
      await onSubmit(values, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={card}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="Title">
            <input className="admin-input" value={values.title} onChange={(e) => set('title', e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Content (HTML)">
            <textarea
              className="admin-textarea"
              value={values.content}
              onChange={(e) => set('content', e.target.value)}
              rows={18}
              style={{ ...textareaStyle, fontFamily: 'var(--admin-mono)', fontSize: '0.8rem' }}
            />
          </Field>

          <Field label="Excerpt">
            <textarea className="admin-textarea" value={values.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={2} style={textareaStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <Field label="Meta description">
              <textarea className="admin-textarea" value={values.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} rows={2} style={textareaStyle} />
            </Field>
            <Field label="Keywords">
              <input className="admin-input" value={values.keywords} onChange={(e) => set('keywords', e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Tags (comma-separated)">
            <input className="admin-input" value={values.tags} onChange={(e) => set('tags', e.target.value)} style={inputStyle} />
          </Field>

          {/* Cover image */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ ...label, marginBottom: 0 }} htmlFor="cover-url">Cover image URL</label>
              {values.coverImageUrl && (
                <button style={btnStyle('ghost')} type="button" onClick={() => set('coverImageUrl', '')}>
                  Clear
                </button>
              )}
            </div>
            <input
              id="cover-url"
              className="admin-input"
              value={values.coverImageUrl}
              onChange={(e) => set('coverImageUrl', e.target.value)}
              placeholder="/api/blog/cover?... or paste an uploaded image URL"
              style={{ ...inputStyle, fontFamily: 'var(--admin-mono)', fontSize: '0.78rem' }}
            />
            {values.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values.coverImageUrl}
                alt="Cover preview"
                style={{
                  marginTop: '10px',
                  width: '100%',
                  maxWidth: '480px',
                  aspectRatio: '1200 / 630',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  border: '1.5px solid var(--admin-border)',
                  background: 'var(--admin-surface-raised)',
                }}
              />
            ) : (
              <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', marginTop: '6px' }}>
                No cover image — the post will render without a hero image.
              </div>
            )}
          </div>

          {/* FAQs */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={label}>FAQs</span>
              <button style={btnStyle('ghost')} onClick={addFaq} type="button">Add FAQ</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {values.faqs.length === 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>No FAQs.</span>
              )}
              {values.faqs.map((faq, i) => (
                <div key={i} style={{ border: '1px solid var(--admin-border)', borderRadius: '4px', padding: '10px' }}>
                  <input
                    className="admin-input"
                    placeholder="Question"
                    value={faq.question}
                    onChange={(e) => updateFaq(i, { question: e.target.value })}
                    style={{ ...inputStyle, marginBottom: '6px' }}
                  />
                  <textarea
                    className="admin-textarea"
                    placeholder="Answer"
                    value={faq.answer}
                    onChange={(e) => updateFaq(i, { answer: e.target.value })}
                    rows={2}
                    style={textareaStyle}
                  />
                  <div style={{ textAlign: 'right', marginTop: '6px' }}>
                    <button style={btnStyle('danger')} onClick={() => removeFaq(i)} type="button">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data used panel (only for generated posts) */}
      {context && (
        <div style={card}>
          <button
            style={{ ...btnStyle('ghost'), width: '100%', textAlign: 'left' }}
            onClick={() => setShowData((s) => !s)}
            type="button"
          >
            {showData ? 'Hide' : 'Show'} data used
            {context.postType === 'MATCHUP' && context.home && context.away
              ? ` — ${context.away.name} at ${context.home.name}${context.hasGame ? ' (live game linked)' : ' (no live game)'}`
              : context.label
                ? ` — ${context.label}`
                : ''}
          </button>
          {showData && (
            <pre
              style={{
                marginTop: '12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'var(--admin-mono)',
                fontSize: '0.72rem',
                color: 'var(--admin-text-secondary)',
                background: 'var(--admin-surface-raised)',
                padding: '12px',
                borderRadius: '4px',
                maxHeight: '320px',
                overflow: 'auto',
              }}
            >
              {context.dataPreview}
            </pre>
          )}
        </div>
      )}

      {error && <div style={{ ...card, color: 'var(--admin-error)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={btnStyle('secondary')} onClick={() => submit('DRAFT')} disabled={saving !== null}>
          {saving === 'DRAFT' ? 'Saving...' : submitLabels.draft}
        </button>
        <button style={btnStyle('primary')} onClick={() => submit('PUBLISHED')} disabled={saving !== null}>
          {saving === 'PUBLISHED' ? 'Publishing...' : submitLabels.publish}
        </button>
        {existingSlug && existingStatus === 'PUBLISHED' && (
          <a
            style={{ ...btnStyle('ghost'), textDecoration: 'none' }}
            href={`/blog/${existingSlug}`}
            target="_blank"
            rel="noreferrer"
          >
            Preview live
          </a>
        )}
      </div>
    </div>
  );
}

function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={label}>{lbl}</label>
      {children}
    </div>
  );
}

/* ── Body builders ─────────────────────────────────────────────── */

function tagsArray(tags: string): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function toCreateBody(v: EditableFields, status: 'DRAFT' | 'PUBLISHED') {
  return {
    title: v.title,
    content: v.content,
    excerpt: v.excerpt || undefined,
    metaTitle: v.metaTitle || undefined,
    metaDescription: v.metaDescription || undefined,
    keywords: v.keywords || undefined,
    tags: tagsArray(v.tags),
    faqs: v.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    postType: v.postType,
    homeSchoolId: v.postType === 'MATCHUP' ? v.homeSchoolId : undefined,
    awaySchoolId: v.postType === 'MATCHUP' ? v.awaySchoolId : undefined,
    matchupSlug: v.postType === 'MATCHUP' ? v.matchupSlug : undefined,
    coverImageUrl: v.coverImageUrl || undefined,
    status,
  };
}

function toPatchBody(v: EditableFields, status: 'DRAFT' | 'PUBLISHED') {
  return {
    title: v.title,
    content: v.content,
    excerpt: v.excerpt,
    metaTitle: v.metaTitle,
    metaDescription: v.metaDescription,
    keywords: v.keywords,
    tags: tagsArray(v.tags),
    faqs: v.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    coverImageUrl: v.coverImageUrl || null,
    status,
  };
}

/* ── Shared input styles ───────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '4px',
  border: '1.5px solid var(--admin-border)',
  background: 'var(--admin-surface-raised)',
  color: 'var(--admin-text)',
  fontFamily: 'var(--admin-sans)',
  fontSize: '0.85rem',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  lineHeight: 1.5,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
};
