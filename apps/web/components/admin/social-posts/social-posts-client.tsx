'use client';

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { TabNav } from '@/components/admin/shared/tab-nav';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { timeAgo } from '@/lib/admin/utils/formatters';
import {
  Share2, FileText, Key, PenTool, Loader2, Copy, Trash2,
  CheckCircle, Send, Settings, Link, Eye, EyeOff, Plus, X,
  Clock, AlertCircle,
} from 'lucide-react';
import type { SocialMediaPost, AutomationConfig, SocialPlatform, ToneType } from '@/lib/admin/actions/social-posts-types';
import { CHAR_LIMITS, PLATFORM_CREDENTIALS } from '@/lib/admin/actions/social-posts-types';

/* ── Types ─────────────────────────────────────────────────────── */

interface Props {
  posts: SocialMediaPost[];
  automationConfig: AutomationConfig;
  credentials: Record<string, string>;
}

const TABS = [
  { id: 'generator', label: 'Generator', icon: PenTool },
  { id: 'queue', label: 'Queue', icon: FileText },
  { id: 'published', label: 'Published', icon: CheckCircle },
  { id: 'automation', label: 'Automation', icon: Settings },
  { id: 'connections', label: 'Connections', icon: Link },
];

const PLATFORMS: SocialPlatform[] = ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK'];

const TONES: { value: ToneType; label: string }[] = [
  { value: 'engaging', label: 'Engaging' },
  { value: 'hype', label: 'Hype' },
  { value: 'informational', label: 'Informational' },
  { value: 'hot-take', label: 'Hot Take' },
  { value: 'funny', label: 'Funny' },
  { value: 'game-day', label: 'Game Day' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'analytical', label: 'Analytical' },
];

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  TWITTER: 'Twitter / X',
  LINKEDIN: 'LinkedIn',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
};

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: 'text-[var(--admin-text-secondary)]',
    scheduled: 'text-[var(--admin-info)]',
    published: 'text-[var(--admin-success)]',
    failed: 'text-[var(--admin-error)]',
  };
  return (
    <span className={`text-xs font-semibold ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
}

/* ── Main Client ───────────────────────────────────────────────── */

export function SocialPostsClient({ posts: initialPosts, automationConfig: initialAutoConfig, credentials: initialCreds }: Props) {
  const [activeTab, setActiveTab] = useState('generator');
  const [posts, setPosts] = useState<SocialMediaPost[]>(initialPosts);

  return (
    <div>
      <TabNav
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="mt-6">
        {activeTab === 'generator' && <GeneratorTab posts={posts} setPosts={setPosts} />}
        {activeTab === 'queue' && <QueueTab posts={posts} setPosts={setPosts} />}
        {activeTab === 'published' && <PublishedTab posts={posts} />}
        {activeTab === 'automation' && <AutomationTab initialConfig={initialAutoConfig} />}
        {activeTab === 'connections' && <ConnectionsTab initialCreds={initialCreds} />}
      </div>
    </div>
  );
}

/* ── Tab 1: Generator ──────────────────────────────────────────── */

function GeneratorTab({ posts, setPosts }: { posts: SocialMediaPost[]; setPosts: Dispatch<SetStateAction<SocialMediaPost[]>> }) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<ToneType>('engaging');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['TWITTER']);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<SocialMediaPost[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  function togglePlatform(p: SocialPlatform) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function handleGenerate() {
    if (selectedPlatforms.length === 0) return;
    setGenerating(true);
    setGenerated([]);
    setErrors([]);
    try {
      const res = await fetch('/api/admin/social-posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic || undefined, tone, platforms: selectedPlatforms }),
      });
      const data = await res.json();
      if (data.error) {
        setErrors([data.error]);
      } else {
        setGenerated(data.posts || []);
        if (data.errors?.length) setErrors(data.errors);
        if (data.posts?.length) {
          setPosts([...data.posts, ...posts]);
        }
      }
    } catch {
      setErrors(['Failed to generate posts. Check your connection.']);
    }
    setGenerating(false);
  }

  async function handleApprove(id: string) {
    const res = await fetch('/api/admin/social-posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'scheduled', scheduled_at: new Date(Date.now() + 86400000).toISOString() }),
    });
    if (res.ok) {
      setGenerated((prev) => prev.filter((p) => p.id !== id));
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'scheduled' } : p));
    }
  }

  async function handleDiscard(id: string) {
    const res = await fetch('/api/admin/social-posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setGenerated((prev) => prev.filter((p) => p.id !== id));
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="admin-card p-6">
        <h3 className="mb-4 text-base font-semibold">AI Content Generator</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--admin-text-muted)]">
              Topic / Theme (optional - AI will pick a trending CFB topic if blank)
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. rivalry week, transfer portal news, playoff predictions..."
              className="admin-input w-full"
              rows={2}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--admin-text-muted)]">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value as ToneType)} className="admin-select w-full">
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-[var(--admin-text-muted)]">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedPlatforms.includes(p)
                      ? 'bg-[var(--admin-accent)] text-white'
                      : 'bg-[var(--admin-surface-raised)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-border)]'
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || selectedPlatforms.length === 0}
          className="btn-admin mt-5 flex items-center gap-2"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
          {generating ? 'Generating...' : `Generate for ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="admin-card border-l-4 border-[var(--admin-error)] p-4">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-[var(--admin-error)]">{err}</p>
          ))}
        </div>
      )}

      {generated.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text-secondary)]">
            Generated Posts ({generated.length})
          </h3>
          {generated.map((post) => {
            const limit = CHAR_LIMITS[(post.platform as SocialPlatform)] || 280;
            const over = post.content.length > limit;
            const meta = (post.metadata || {}) as Record<string, unknown>;
            const hashtags = (meta.hashtags as string[]) || [];

            return (
              <div key={post.id} className="admin-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase">
                    {post.platform}
                  </span>
                  {statusBadge(post.status)}
                </div>

                <p className="whitespace-pre-wrap text-sm">{post.content}</p>

                {hashtags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hashtags.map((h) => (
                      <span key={h} className="rounded bg-[var(--admin-accent)]/10 px-1.5 py-0.5 text-xs text-[var(--admin-accent)]">
                        #{h}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs ${over ? 'text-[var(--admin-error)]' : 'text-[var(--admin-text-muted)]'}`}>
                    {post.content.length}/{limit}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(post.content)}
                      className="btn-admin-outline btn-admin-sm flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <button
                      onClick={() => handleApprove(post.id)}
                      className="btn-admin btn-admin-sm flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" /> Approve
                    </button>
                    <button
                      onClick={() => handleDiscard(post.id)}
                      className="btn-admin-outline btn-admin-sm flex items-center gap-1 text-[var(--admin-error)]"
                    >
                      <Trash2 className="h-3 w-3" /> Discard
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Tab 2: Queue ──────────────────────────────────────────────── */

function QueueTab({ posts, setPosts }: { posts: SocialMediaPost[]; setPosts: Dispatch<SetStateAction<SocialMediaPost[]>> }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [approving, setApproving] = useState(false);

  const queuePosts = posts.filter((p) => p.status !== 'published');
  const filtered = queuePosts
    .filter((p) => statusFilter === 'ALL' || p.status === statusFilter)
    .filter((p) => platformFilter === 'ALL' || p.platform === platformFilter);

  const draftCount = queuePosts.filter((p) => p.status === 'draft').length;

  async function handleApproveAll() {
    setApproving(true);
    try {
      const res = await fetch('/api/admin/social-posts/bulk-approve', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0) {
          setPosts((prev) =>
            prev.map((p) =>
              p.status === 'draft' ? { ...p, status: 'scheduled' } : p,
            ),
          );
        }
      }
    } catch { /* ignore */ }
    setApproving(false);
  }

  async function handlePublish(id: string) {
    try {
      const res = await fetch(`/api/social-posts/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => p.id === id ? { ...p, status: 'published', published_at: new Date().toISOString() } : p),
        );
      } else {
        alert(data.error || 'Publishing failed');
      }
    } catch {
      alert('Publishing failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/admin/social-posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-select"
        >
          <option value="ALL">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="admin-select"
        >
          <option value="ALL">All Platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>

        {draftCount > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={approving}
            className="btn-admin flex items-center gap-2"
          >
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approve All Drafts ({draftCount})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No Posts in Queue" description="Generate content from the Generator tab to populate the queue." />
      ) : (
        <div className="admin-card overflow-hidden overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Content</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="text-xs font-semibold uppercase">
                      {p.platform}
                    </span>
                  </td>
                  <td className="max-w-[300px] truncate text-sm">{p.content}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td className="text-xs text-[var(--admin-text-muted)]">
                    {p.scheduled_at ? timeAgo(p.scheduled_at) : '-'}
                  </td>
                  <td className="text-xs text-[var(--admin-text-muted)]">{timeAgo(p.created_at)}</td>
                  <td>
                    <div className="flex gap-1">
                      {(p.status === 'draft' || p.status === 'scheduled') && (
                        <button
                          onClick={() => handlePublish(p.id)}
                          className="rounded p-1 text-[var(--admin-accent)] hover:bg-[var(--admin-surface-raised)]"
                          title="Publish now"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-error)]"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Tab 3: Published ──────────────────────────────────────────── */

function PublishedTab({ posts }: { posts: SocialMediaPost[] }) {
  const [platformFilter, setPlatformFilter] = useState('ALL');

  const published = posts.filter((p) => p.status === 'published');
  const filtered = platformFilter === 'ALL'
    ? published
    : published.filter((p) => p.platform === platformFilter);

  const platformCounts: Record<string, number> = {};
  for (const p of published) {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PLATFORMS.map((p) => (
          <div key={p} className="admin-card p-4 text-center">
            <p className="text-2xl font-bold">{platformCounts[p] || 0}</p>
            <p className="text-xs text-[var(--admin-text-muted)]">{PLATFORM_LABELS[p]}</p>
          </div>
        ))}
      </div>

      <select
        value={platformFilter}
        onChange={(e) => setPlatformFilter(e.target.value)}
        className="admin-select"
      >
        <option value="ALL">All Platforms</option>
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
        ))}
      </select>

      {filtered.length === 0 ? (
        <EmptyState icon={Share2} title="No Published Posts" description="Posts will appear here once they are published to social media platforms." />
      ) : (
        <div className="admin-card overflow-hidden overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Content</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="text-xs font-semibold uppercase">
                      {p.platform}
                    </span>
                  </td>
                  <td className="max-w-[400px] truncate text-sm">{p.content}</td>
                  <td className="text-xs text-[var(--admin-text-muted)]">
                    {p.published_at ? timeAgo(p.published_at) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Tab 4: Automation ─────────────────────────────────────────── */

function AutomationTab({ initialConfig }: { initialConfig: AutomationConfig }) {
  const [config, setConfig] = useState<AutomationConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newTopic, setNewTopic] = useState('');

  function update(partial: Partial<AutomationConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  }

  function togglePlatform(p: SocialPlatform) {
    update({
      platforms: config.platforms.includes(p)
        ? config.platforms.filter((x) => x !== p)
        : [...config.platforms, p],
    });
  }

  function addTopic() {
    if (!newTopic.trim()) return;
    update({ topics: [...config.topics, newTopic.trim()] });
    setNewTopic('');
  }

  function removeTopic(topic: string) {
    update({ topics: config.topics.filter((t) => t !== topic) });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/social-posts/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) setSaved(true);
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="admin-card p-6">
        <h3 className="mb-4 text-base font-semibold">Daily Auto-Generation</h3>

        <div className="space-y-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--admin-border)] accent-[var(--admin-accent)]"
            />
            <span className="text-sm font-medium">Enable daily auto-generation</span>
          </label>

          <div>
            <label className="mb-2 block text-xs font-semibold text-[var(--admin-text-muted)]">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    config.platforms.includes(p)
                      ? 'bg-[var(--admin-accent)] text-white'
                      : 'bg-[var(--admin-surface-raised)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-border)]'
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--admin-text-muted)]">
              Generation Hour (UTC): {config.hour}:00
            </label>
            <input
              type="range"
              min={0}
              max={23}
              value={config.hour}
              onChange={(e) => update({ hour: parseInt(e.target.value, 10) })}
              className="w-full max-w-xs"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-[var(--admin-text-muted)]">Topic Rotation Pool</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {config.topics.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-[var(--admin-surface-raised)] px-3 py-1 text-xs">
                  {t}
                  <button onClick={() => removeTopic(t)} className="ml-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-error)]">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                placeholder="Add topic..."
                className="admin-input flex-1"
              />
              <button onClick={addTopic} className="btn-admin-outline btn-admin-sm flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.useDomainContent}
              onChange={(e) => update({ useDomainContent: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--admin-border)] accent-[var(--admin-accent)]"
            />
            <span className="text-sm">Use recent site content for post ideas</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.requireApproval}
              onChange={(e) => update({ requireApproval: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--admin-border)] accent-[var(--admin-accent)]"
            />
            <span className="text-sm">Require approval before publishing</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-admin mt-5 flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

/* ── Tab 5: Connections ────────────────────────────────────────── */

function ConnectionsTab({ initialCreds }: { initialCreds: Record<string, string> }) {
  const [creds, setCreds] = useState<Record<string, string>>(initialCreds);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  function updateCred(key: string, value: string) {
    setCreds((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function toggleShow(key: string) {
    setShowFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/social-posts/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      if (res.ok) setSaved(true);
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleTest(platform: string) {
    setTesting(platform);
    try {
      const res = await fetch('/api/admin/social-posts/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [platform]: {
          success: !!data.success,
          message: data.message || data.error || 'Unknown result',
        },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [platform]: { success: false, message: 'Connection test failed' },
      }));
    }
    setTesting(null);
  }

  const connectionPlatforms = ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM'] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {connectionPlatforms.map((platform) => {
          const fields = PLATFORM_CREDENTIALS[platform] || [];
          const isConfigured = fields.some((f) => !!creds[f.key]);
          const testResult = testResults[platform];

          return (
            <div key={platform} className="admin-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{PLATFORM_LABELS[platform as SocialPlatform]}</h3>
                <span
                  className={`text-xs font-semibold ${
                    isConfigured
                      ? 'text-[var(--admin-success)]'
                      : 'text-[var(--admin-text-muted)]'
                  }`}
                >
                  {isConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </div>

              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-xs font-semibold text-[var(--admin-text-muted)]">
                      {field.label}
                    </label>
                    <div className="flex gap-1">
                      <input
                        type={showFields[field.key] ? 'text' : 'password'}
                        value={creds[field.key] || ''}
                        onChange={(e) => updateCred(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="admin-input flex-1"
                      />
                      <button
                        onClick={() => toggleShow(field.key)}
                        className="rounded border border-[var(--admin-border)] p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-raised)]"
                      >
                        {showFields[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {testResult && (
                <div
                  className={`mt-3 text-xs ${
                    testResult.success
                      ? 'text-[var(--admin-success)]'
                      : 'text-[var(--admin-error)]'
                  }`}
                >
                  {testResult.success ? (
                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {testResult.message}</span>
                  ) : (
                    <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {testResult.message}</span>
                  )}
                </div>
              )}

              <button
                onClick={() => handleTest(platform)}
                disabled={testing === platform || !isConfigured}
                className="btn-admin-outline btn-admin-sm mt-3 flex items-center gap-1"
              >
                {testing === platform ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Link className="h-3 w-3" />
                )}
                Test Connection
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-admin flex items-center gap-2"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
        {saving ? 'Saving...' : saved ? 'Credentials Saved' : 'Save All Credentials'}
      </button>
    </div>
  );
}
