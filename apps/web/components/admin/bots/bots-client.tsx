'use client';

import { useState, useCallback, useMemo } from 'react';
import { PRESET_LIST } from '@/lib/admin/bots/personalities';
import type { BotRow } from '@/lib/admin/actions/bots';
import { StatCard } from '@/components/admin/shared/stat-card';
import { useSortableTable, SortableHeader } from '@/components/admin/shared/sortable-header';
import { Bot, Power, Zap, MessageSquare, BarChart3, Plus, Search, Pencil, Trash2, Play, RefreshCw, Database, Users } from 'lucide-react';

interface School {
  id: string;
  name: string;
  abbreviation: string;
  conference: string;
  mascot: string;
  primary_color: string;
}

interface Props {
  bots: BotRow[];
  globalActive: boolean;
  stats: { totalBots: number; activeBots: number; totalBotPosts: number; postsToday: number };
  recentActivity: Record<string, unknown>[];
  schools: School[];
  personalityDist: Record<string, number>;
  eventQueue: Record<string, unknown>[];
}

function getMoodColor(mood: number | null): string {
  if (!mood) return 'var(--admin-text-muted)';
  if (mood <= 2) return '#dc2626';
  if (mood <= 4) return '#f59e0b';
  if (mood <= 6) return 'var(--admin-text-secondary)';
  if (mood <= 8) return '#22c55e';
  return '#16a34a';
}

function getMoodLabel(mood: number | null): string {
  if (!mood) return '--';
  if (mood <= 2) return 'Furious';
  if (mood <= 4) return 'Down';
  if (mood === 5) return 'Neutral';
  if (mood <= 7) return 'Good';
  if (mood <= 9) return 'Hyped';
  return 'Peak';
}

function formatRegion(region: string | null): string {
  if (!region) return '--';
  return region.charAt(0).toUpperCase() + region.slice(1);
}

function formatAge(age: string | null): string {
  if (!age) return '--';
  const map: Record<string, string> = { gen_z: 'Gen Z', millennial: 'Mill.', gen_x: 'Gen X', boomer: 'Boom.' };
  return map[age] || age;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function BotsClient({ bots: initialBots, globalActive: initialGlobalActive, stats, recentActivity, schools, personalityDist, eventQueue: initialEventQueue }: Props) {
  const [bots, setBots] = useState(initialBots);
  const [globalActive, setGlobalActive] = useState(initialGlobalActive);
  const [tab, setTab] = useState<'bots' | 'create' | 'activity' | 'events' | 'seed'>('bots');
  const [search, setSearch] = useState('');
  const [filterConf, setFilterConf] = useState('');
  const [filterPersonality, setFilterPersonality] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toggling, setToggling] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [eventQueue, setEventQueue] = useState(initialEventQueue);

  // Create form
  const [createUsername, setCreateUsername] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createBio, setCreateBio] = useState('');
  const [createSchool, setCreateSchool] = useState('');
  const [createPersonality, setCreatePersonality] = useState('homer');
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editBot, setEditBot] = useState<BotRow | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editPersonality, setEditPersonality] = useState('');
  const [editBannerColor, setEditBannerColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState('');

  // Seed
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState('');
  const [diversifying, setDiversifying] = useState(false);
  const [seedingKnowledge, setSeedingKnowledge] = useState(false);
  const [seedingP5, setSeedingP5] = useState(false);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  }

  const refreshBots = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bots');
      const data = await res.json();
      if (data.bots) setBots(data.bots);
    } catch { /* ignore */ }
  }, []);

  // ---- Global Toggle ----
  async function handleToggleAll() {
    setToggling(true);
    try {
      const res = await fetch('/api/admin/bots/toggle-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !globalActive }),
      });
      if (res.ok) {
        setGlobalActive(!globalActive);
        showSuccess(`All bots ${!globalActive ? 'activated' : 'deactivated'}`);
        refreshBots();
      } else {
        const data = await res.json();
        showError(data.error || 'Toggle failed');
      }
    } catch { showError('Toggle failed'); }
    setToggling(false);
  }

  // ---- Create Bot ----
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createUsername || !createDisplayName || !createSchool) {
      showError('Username, display name, and school are required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: createUsername,
          displayName: createDisplayName,
          bio: createBio,
          schoolId: createSchool,
          personalityType: createPersonality,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Bot created');
        setCreateUsername(''); setCreateDisplayName(''); setCreateBio(''); setCreateSchool(''); setCreatePersonality('homer');
        setTab('bots');
        refreshBots();
      } else {
        showError(data.error || 'Create failed');
      }
    } catch { showError('Create failed'); }
    setCreating(false);
  }

  // ---- Trigger Post ----
  async function handleTriggerPost(botId: string) {
    setPosting(botId);
    try {
      const res = await fetch(`/api/admin/bots/${botId}/trigger`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) showSuccess(`Post created: ${data.postId?.slice(0, 8)}...`);
      else showError(data.error || 'Post trigger failed');
    } catch { showError('Post trigger failed'); }
    setPosting(null);
  }

  // ---- Toggle Individual Bot ----
  async function handleToggleBot(botId: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botActive: !currentActive }),
      });
      if (res.ok) {
        setBots((prev) => prev.map((b) => b.id === botId ? { ...b, bot_active: !currentActive } : b));
      }
    } catch { /* ignore */ }
  }

  // ---- Delete Bot ----
  async function handleDelete(botId: string) {
    if (!confirm('Deactivate this bot?')) return;
    try {
      const res = await fetch(`/api/admin/bots/${botId}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Bot deactivated');
        refreshBots();
      }
    } catch { showError('Delete failed'); }
  }

  // ---- Edit Modal ----
  function openEdit(bot: BotRow) {
    setEditBot(bot);
    setEditDisplayName(bot.display_name || '');
    setEditBio(bot.bio || '');
    setEditSchool(bot.school_id || '');
    setEditBannerColor(bot.banner_color || '');
    setEditAvatarFile(null);
    setEditAvatarPreview(bot.avatar_url || '');
    setEditBannerFile(null);
    setEditBannerPreview(bot.banner_url || '');
    const p = bot.bot_personality as Record<string, unknown> | null;
    setEditPersonality((p?.type as string) || 'homer');
  }

  async function uploadImage(botId: string, file: File, type: 'avatar' | 'banner'): Promise<string | null> {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve((e.target?.result as string).split(',')[1] ?? '');
      reader.readAsDataURL(file);
    });
    const res = await fetch(`/api/admin/bots/${botId}/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType: file.type }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return type === 'avatar' ? data.avatarUrl : data.bannerUrl;
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editBot) return;
    setSaving(true);
    try {
      if (editAvatarFile) {
        const avatarUrl = await uploadImage(editBot.id, editAvatarFile, 'avatar');
        if (!avatarUrl) showError('Avatar upload failed');
      }
      if (editBannerFile) {
        const bannerUrl = await uploadImage(editBot.id, editBannerFile, 'banner');
        if (!bannerUrl) showError('Banner upload failed');
      }

      const res = await fetch(`/api/admin/bots/${editBot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editDisplayName,
          bio: editBio,
          schoolId: editSchool,
          personalityType: editPersonality,
          bannerColor: editBannerColor,
        }),
      });
      if (res.ok) {
        showSuccess('Bot updated');
        setEditBot(null);
        refreshBots();
      } else {
        const data = await res.json();
        showError(data.error || 'Update failed');
      }
    } catch (err) { showError('Update failed: ' + (err instanceof Error ? err.message : String(err))); }
    setSaving(false);
  }

  // ---- Seed Bots ----
  async function handleSeed() {
    if (!confirm('This will create 100 bots across top FBS schools. Continue?')) return;
    setSeeding(true);
    setSeedProgress('Creating bots...');
    try {
      const res = await fetch('/api/admin/bots/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Seeded ${data.created} bots`);
        setSeedProgress(`Done: ${data.created} bots created`);
        refreshBots();
      } else {
        showError(data.error || 'Seed failed');
        setSeedProgress('');
      }
    } catch { showError('Seed failed'); setSeedProgress(''); }
    setSeeding(false);
  }

  // ---- Diversify Bots ----
  async function handleDiversify() {
    if (!confirm('This will reassign personalities, regions, and age brackets for all 100 bots. Continue?')) return;
    setDiversifying(true);
    try {
      const res = await fetch('/api/admin/bots/diversify', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Diversified ${data.updated} bots`);
        refreshBots();
      } else {
        showError(data.error || 'Diversify failed');
      }
    } catch { showError('Diversify failed'); }
    setDiversifying(false);
  }

  // ---- Seed Knowledge ----
  async function handleSeedKnowledge() {
    if (!confirm('Seed local knowledge (traditions, landmarks, bars) for top 25 schools?')) return;
    setSeedingKnowledge(true);
    try {
      const res = await fetch('/api/admin/bots/seed-knowledge', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Seeded ${data.inserted} knowledge entries`);
      } else {
        showError(data.error || 'Seed knowledge failed');
      }
    } catch { showError('Seed knowledge failed'); }
    setSeedingKnowledge(false);
  }

  // ---- Seed Power 5 Bots ----
  async function handleSeedPowerFive() {
    if (!confirm('Create 1 bot for every uncovered Power 5 school (SEC, Big Ten, Big 12, ACC)?')) return;
    setSeedingP5(true);
    try {
      const res = await fetch('/api/admin/bots/seed-power-five', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Created ${data.created} P5 bots (${data.skipped} already covered)`);
        if (data.errors?.length) console.warn('P5 seed errors:', data.errors);
        window.location.reload();
      } else {
        showError(data.error || 'P5 seed failed');
      }
    } catch { showError('P5 seed failed'); }
    setSeedingP5(false);
  }

  // ---- Refresh Event Queue ----
  async function refreshEvents() {
    try {
      const res = await fetch('/api/admin/bots');
      const data = await res.json();
      if (data.eventQueue) setEventQueue(data.eventQueue);
    } catch { /* ignore */ }
  }

  // ---- Filtering ----
  const conferences = [...new Set(schools.map((s) => s.conference))].sort();
  const filteredBots = bots.filter((b) => {
    if (search) {
      const q = search.toLowerCase();
      if (!b.username.toLowerCase().includes(q) && !(b.display_name || '').toLowerCase().includes(q) && !(b.school?.name || '').toLowerCase().includes(q)) return false;
    }
    if (filterConf && b.school?.conference !== filterConf) return false;
    if (filterPersonality) {
      const p = b.bot_personality as Record<string, unknown> | null;
      if ((p?.type as string) !== filterPersonality) return false;
    }
    return true;
  });

  // Sort accessors for the bot table
  const botAccessors = useMemo(() => ({
    name: (b: BotRow) => (b.display_name || b.username).toLowerCase(),
    school: (b: BotRow) => b.school?.abbreviation ?? '',
    type: (b: BotRow) => ((b.bot_personality as Record<string, unknown> | null)?.type as string) || 'homer',
    mood: (b: BotRow) => b.bot_mood ?? 5,
    region: (b: BotRow) => b.bot_region ?? '',
    age: (b: BotRow) => b.bot_age_bracket ?? '',
    today: (b: BotRow) => b.bot_post_count_today ?? 0,
    total: (b: BotRow) => (b as unknown as Record<string, number>).total_posts ?? 0,
    lastPost: (b: BotRow) => b.bot_last_post_at ?? '',
    active: (b: BotRow) => b.bot_active ?? false,
  }), []);
  const { sorted: sortedBots, sortConfig: botSortConfig, requestSort: requestBotSort } = useSortableTable(filteredBots, botAccessors);

  // Personality distribution for display
  const totalDist = Object.values(personalityDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && <div className="admin-card p-3 text-sm" style={{ borderLeft: '3px solid var(--admin-error)', color: 'var(--admin-error)' }}>{error}</div>}
      {success && <div className="admin-card p-3 text-sm" style={{ borderLeft: '3px solid var(--admin-success)', color: 'var(--admin-success)' }}>{success}</div>}

      {/* Global Toggle */}
      <div className="admin-card p-4 flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily: 'var(--admin-serif)', fontSize: '1.1rem', fontWeight: 700 }}>Global Bot Control</h2>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            {globalActive ? 'All bots are ACTIVE and will post on schedule' : 'All bots are OFF'}
          </p>
        </div>
        <button
          onClick={handleToggleAll}
          disabled={toggling}
          className="btn-admin"
          style={{
            background: globalActive ? 'var(--admin-error)' : 'var(--admin-success)',
            color: '#fff',
            padding: '10px 24px',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Power className="h-4 w-4" />
          {toggling ? 'Switching...' : globalActive ? 'SHUT OFF ALL BOTS' : 'ACTIVATE ALL BOTS'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Bots" value={stats.totalBots} icon={Bot} />
        <StatCard label="Active Bots" value={stats.activeBots} icon={Zap} />
        <StatCard label="Posts Today" value={stats.postsToday} icon={MessageSquare} />
        <StatCard label="Total Bot Posts" value={stats.totalBotPosts} icon={BarChart3} />
      </div>

      {/* Personality Distribution */}
      <div className="admin-card p-4">
        <h3 className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--admin-serif)', textTransform: 'uppercase', letterSpacing: '1px' }}>Personality Distribution</h3>
        <div className="flex gap-1" style={{ height: 8, borderRadius: 4, overflow: 'hidden' }}>
          {Object.entries(personalityDist).map(([type, count]) => {
            const colors: Record<string, string> = { homer: '#dc2626', analyst: '#2563eb', hot_take: '#f59e0b', old_school: '#6b7280', recruiting_insider: '#16a34a' };
            return (
              <div
                key={type}
                style={{ width: `${(count / totalDist) * 100}%`, background: colors[type] || '#888', minWidth: count > 0 ? 2 : 0 }}
                title={`${type}: ${count}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-2">
          {Object.entries(personalityDist).map(([type, count]) => {
            const colors: Record<string, string> = { homer: '#dc2626', analyst: '#2563eb', hot_take: '#f59e0b', old_school: '#6b7280', recruiting_insider: '#16a34a' };
            const labels: Record<string, string> = { homer: 'Homer', analyst: 'Analyst', hot_take: 'Hot Take', old_school: 'Old School', recruiting_insider: 'Recruiting' };
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[type] || '#888', flexShrink: 0 }} />
                <span className="text-xs">{labels[type] || type}: {count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'bots', label: 'Manage Bots' },
          { key: 'create', label: 'Create Bot' },
          { key: 'activity', label: 'Activity Log' },
          { key: 'events', label: 'Event Queue' },
          { key: 'seed', label: 'Setup' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className="btn-admin"
            style={{
              background: tab === t.key ? 'var(--admin-accent)' : 'var(--admin-surface)',
              color: tab === t.key ? '#fff' : 'var(--admin-text)',
              fontWeight: tab === t.key ? 700 : 400,
            }}
          >
            {t.label}
            {t.key === 'events' && eventQueue.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--admin-error)', color: '#fff', borderRadius: 8, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700 }}>
                {eventQueue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'bots' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="admin-card p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4" style={{ color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bots..."
                className="admin-input flex-1"
              />
            </div>
            <select value={filterConf} onChange={(e) => setFilterConf(e.target.value)} className="admin-select">
              <option value="">All Conferences</option>
              {conferences.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterPersonality} onChange={(e) => setFilterPersonality(e.target.value)} className="admin-select">
              <option value="">All Personalities</option>
              {PRESET_LIST.map((p) => <option key={p.type} value={p.type}>{p.label}</option>)}
            </select>
            <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>{filteredBots.length} bots</span>
          </div>

          {/* Bot Table */}
          <div className="admin-card overflow-hidden" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--admin-border)', background: 'var(--admin-surface-raised)' }}>
                  <SortableHeader label="Bot" sortKey="name" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="School" sortKey="school" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="Type" sortKey="type" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="Mood" sortKey="mood" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="Region" sortKey="region" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="Age" sortKey="age" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="Today" sortKey="today" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="Total" sortKey="total" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="Last Post" sortKey="lastPost" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <SortableHeader label="Active" sortKey="active" sortConfig={botSortConfig} onSort={requestBotSort} style={thStyle} />
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBots.map((bot) => {
                  const personality = bot.bot_personality as Record<string, unknown> | null;
                  const personalityType = (personality?.type as string) || 'homer';
                  const typeColors: Record<string, string> = { homer: '#dc2626', analyst: '#2563eb', hot_take: '#f59e0b', old_school: '#6b7280', recruiting_insider: '#16a34a' };
                  return (
                    <tr key={bot.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td style={tdStyle}>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                            background: 'var(--admin-surface-raised)', flexShrink: 0,
                          }}>
                            {bot.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={bot.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot className="h-3.5 w-3.5" style={{ color: 'var(--admin-text-muted)' }} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold" style={{ lineHeight: 1.2 }}>{bot.display_name || bot.username}</p>
                            <p className="text-xs" style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem' }}>@{bot.username}</p>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {bot.school ? (
                          <div className="flex items-center gap-1.5">
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: bot.school.primary_color, flexShrink: 0,
                            }} />
                            <span className="text-xs">{bot.school.abbreviation}</span>
                          </div>
                        ) : <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>--</span>}
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs px-1.5 py-0.5" style={{
                          background: typeColors[personalityType] || '#888',
                          color: '#fff',
                          borderRadius: '3px',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                        }}>
                          {(personality?.label as string) || personalityType}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div className="flex items-center gap-1.5">
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: getMoodColor(bot.bot_mood),
                            flexShrink: 0,
                          }} />
                          <span className="text-xs" style={{ color: getMoodColor(bot.bot_mood) }}>
                            {bot.bot_mood ?? '--'} {getMoodLabel(bot.bot_mood)}
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs">{formatRegion(bot.bot_region)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs">{formatAge(bot.bot_age_bracket)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs font-semibold">{bot.bot_post_count_today ?? 0}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs">{bot.post_count ?? 0}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{timeAgo(bot.bot_last_post_at)}</span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleToggleBot(bot.id, !!bot.bot_active)}
                          style={{
                            width: 36, height: 20, borderRadius: 10,
                            background: bot.bot_active ? 'var(--admin-success)' : 'var(--admin-border)',
                            position: 'relative', cursor: 'pointer', border: 'none',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
                            background: '#fff', transition: 'left 0.2s',
                            left: bot.bot_active ? 18 : 2,
                          }} />
                        </button>
                      </td>
                      <td style={tdStyle}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(bot)} className="btn-admin" style={actionBtnStyle} title="Edit">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleTriggerPost(bot.id)}
                            disabled={posting === bot.id}
                            className="btn-admin"
                            style={actionBtnStyle}
                            title="Trigger Post"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleDelete(bot.id)} className="btn-admin" style={{ ...actionBtnStyle, color: 'var(--admin-error)' }} title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedBots.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ ...tdStyle, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                      {bots.length === 0 ? 'No bots yet. Create one or seed 100 bots.' : 'No bots match filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'create' && (
        <div className="admin-card p-6" style={{ maxWidth: 600 }}>
          <h2 style={{ fontFamily: 'var(--admin-serif)', fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Create New Bot</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input type="text" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} className="admin-input w-full" placeholder="e.g. bama_homer_1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input type="text" value={createDisplayName} onChange={(e) => setCreateDisplayName(e.target.value)} className="admin-input w-full" placeholder="e.g. Roll Tide Randy" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea value={createBio} onChange={(e) => setCreateBio(e.target.value)} className="admin-input w-full" rows={2} placeholder="Optional bio..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">School</label>
              <select value={createSchool} onChange={(e) => setCreateSchool(e.target.value)} className="admin-select w-full" required>
                <option value="">Select a school...</option>
                {conferences.map((conf) => (
                  <optgroup key={conf} label={conf}>
                    {schools.filter((s) => s.conference === conf).map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.abbreviation})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Personality</label>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_LIST.map((p) => (
                  <label key={p.type} className="flex items-start gap-3 p-3 cursor-pointer" style={{
                    background: createPersonality === p.type ? 'var(--admin-surface-raised)' : 'transparent',
                    border: `1px solid ${createPersonality === p.type ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                    borderRadius: 4,
                  }}>
                    <input type="radio" name="personality" value={p.type} checked={createPersonality === p.type} onChange={(e) => setCreatePersonality(e.target.value)} />
                    <div>
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{p.tone}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={creating} className="btn-admin" style={{ background: 'var(--admin-accent)', color: '#fff', padding: '10px 20px', fontWeight: 600 }}>
              <Plus className="inline h-4 w-4 mr-1" />
              {creating ? 'Creating...' : 'Create Bot'}
            </button>
          </form>
        </div>
      )}

      {tab === 'activity' && (
        <div className="admin-card overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--admin-border)', background: 'var(--admin-surface-raised)' }}>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Preview</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((log) => (
                <tr key={log.id as string} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td style={tdStyle}>
                    <span className="text-xs">{new Date(log.created_at as string).toLocaleString()}</span>
                  </td>
                  <td style={tdStyle}>
                    <span className="text-xs px-2 py-1 font-semibold" style={{
                      background: 'var(--admin-surface-raised)', borderRadius: 4,
                    }}>
                      {log.action_type as string}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                      {((log.content_preview as string) || '').slice(0, 80)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: log.success ? 'var(--admin-success)' : 'var(--admin-error)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {log.success ? 'OK' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--admin-serif)' }}>Active Event Queue</h3>
            <button onClick={refreshEvents} className="btn-admin" style={{ padding: '4px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <div className="admin-card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--admin-border)', background: 'var(--admin-surface-raised)' }}>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Scheduled</th>
                  <th style={thStyle}>Expires</th>
                  <th style={thStyle}>Consumed By</th>
                  <th style={thStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {eventQueue.map((evt) => {
                  const typeColors: Record<string, string> = {
                    game_live: '#dc2626', game_final: '#16a34a', portal_commit: '#2563eb',
                    user_mention: '#f59e0b', bot_to_bot: '#8b5cf6',
                  };
                  const evtType = evt.event_type as string;
                  const consumed = (evt.consumed_by as string[] | null) ?? [];
                  return (
                    <tr key={evt.id as string} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td style={tdStyle}>
                        <span className="text-xs px-2 py-0.5 font-semibold" style={{
                          background: typeColors[evtType] || '#888',
                          color: '#fff',
                          borderRadius: 3,
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                        }}>
                          {evtType}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs font-bold">{evt.priority as number}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs">{evt.scheduled_at ? timeAgo(evt.scheduled_at as string) : '--'}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs">{evt.expires_at ? timeAgo(evt.expires_at as string) : '--'}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs">{consumed.length} bot{consumed.length !== 1 ? 's' : ''}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{timeAgo(evt.created_at as string)}</span>
                      </td>
                    </tr>
                  );
                })}
                {eventQueue.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                      No active events. Events are created when games start, end, or portal moves happen.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'seed' && (
        <div className="space-y-4" style={{ maxWidth: 700 }}>
          {/* Seed Bots */}
          <div className="admin-card p-6">
            <h2 style={{ fontFamily: 'var(--admin-serif)', fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Seed 100 Bots</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--admin-text-secondary)' }}>
              Creates 100 AI bots across top FBS schools. Each bot gets a unique personality, school assignment, username, and bio.
            </p>
            {seedProgress && <p className="text-sm mb-4" style={{ color: 'var(--admin-info)' }}>{seedProgress}</p>}
            <button
              onClick={handleSeed}
              disabled={seeding || bots.length >= 50}
              className="btn-admin"
              style={{ background: 'var(--admin-accent)', color: '#fff', padding: '10px 20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Bot className="h-4 w-4" />
              {seeding ? 'Seeding...' : bots.length >= 50 ? 'Bots Already Seeded' : 'Seed 100 Bots'}
            </button>
          </div>

          {/* Seed Power 5 */}
          <div className="admin-card p-6">
            <h2 style={{ fontFamily: 'var(--admin-serif)', fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Seed Power 5 Bots</h2>
            <p className="text-sm mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Creates 1 bot for every Power 5 school (SEC, Big Ten, Big 12, ACC, Pac-12, Independents) that does not already have one.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
              Bots are assigned rotating personalities (Homer, Analyst, Hot Take, Old School, Recruiting Insider) and activated immediately.
            </p>
            <button
              onClick={handleSeedPowerFive}
              disabled={seedingP5}
              className="btn-admin"
              style={{ background: '#b45309', color: '#fff', padding: '10px 20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Users className={`h-4 w-4 ${seedingP5 ? 'animate-spin' : ''}`} />
              {seedingP5 ? 'Seeding P5 Bots...' : 'Seed Power 5 Bots'}
            </button>
          </div>

          {/* Diversify */}
          <div className="admin-card p-6">
            <h2 style={{ fontFamily: 'var(--admin-serif)', fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Diversify Personalities</h2>
            <p className="text-sm mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Reassigns all bots to a balanced personality distribution: 40 Homer, 20 Analyst, 15 Hot Take, 15 Old School, 10 Recruiting Insider.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
              Also sets region (based on school state) and age bracket (weighted random: 30% Gen Z, 40% Millennial, 20% Gen X, 10% Boomer).
            </p>
            <button
              onClick={handleDiversify}
              disabled={diversifying || bots.length === 0}
              className="btn-admin"
              style={{ background: '#6b21a8', color: '#fff', padding: '10px 20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw className={`h-4 w-4 ${diversifying ? 'animate-spin' : ''}`} />
              {diversifying ? 'Diversifying...' : 'Diversify All Bots'}
            </button>
          </div>

          {/* Seed Knowledge */}
          <div className="admin-card p-6">
            <h2 style={{ fontFamily: 'var(--admin-serif)', fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Seed Local Knowledge</h2>
            <p className="text-sm mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Populates the school_local_knowledge table with traditions, landmarks, bars, famous plays, and chants for the top 25 schools.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
              This data is injected into bot prompts so they reference things only a real fan would know.
            </p>
            <button
              onClick={handleSeedKnowledge}
              disabled={seedingKnowledge}
              className="btn-admin"
              style={{ background: '#0f766e', color: '#fff', padding: '10px 20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Database className={`h-4 w-4 ${seedingKnowledge ? 'animate-spin' : ''}`} />
              {seedingKnowledge ? 'Seeding...' : 'Seed Local Knowledge'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editBot && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setEditBot(null)}>
          <div className="admin-card p-6" style={{ maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--admin-serif)', fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>
              Edit Bot: @{editBot.username}
            </h2>

            {/* Bot info summary */}
            <div className="flex flex-wrap gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <div className="text-xs">
                <span style={{ color: 'var(--admin-text-muted)' }}>Mood: </span>
                <span style={{ color: getMoodColor(editBot.bot_mood), fontWeight: 700 }}>
                  {editBot.bot_mood ?? '--'}/10 ({getMoodLabel(editBot.bot_mood)})
                </span>
              </div>
              <div className="text-xs">
                <span style={{ color: 'var(--admin-text-muted)' }}>Region: </span>
                <span>{formatRegion(editBot.bot_region)}</span>
              </div>
              <div className="text-xs">
                <span style={{ color: 'var(--admin-text-muted)' }}>Age: </span>
                <span>{formatAge(editBot.bot_age_bracket)}</span>
              </div>
              <div className="text-xs">
                <span style={{ color: 'var(--admin-text-muted)' }}>Posts today: </span>
                <span className="font-semibold">{editBot.bot_post_count_today ?? 0}</span>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="admin-input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="admin-input w-full" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">School</label>
                <select value={editSchool} onChange={(e) => setEditSchool(e.target.value)} className="admin-select w-full">
                  <option value="">Select...</option>
                  {conferences.map((conf) => (
                    <optgroup key={conf} label={conf}>
                      {schools.filter((s) => s.conference === conf).map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.abbreviation})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Personality</label>
                <select value={editPersonality} onChange={(e) => setEditPersonality(e.target.value)} className="admin-select w-full">
                  {PRESET_LIST.map((p) => <option key={p.type} value={p.type}>{p.label}</option>)}
                </select>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium mb-1">Profile Picture</label>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--admin-surface-raised)',
                  marginBottom: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {editAvatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editAvatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Bot className="h-6 w-6" style={{ color: 'var(--admin-text-muted)' }} />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!f.type.startsWith('image/')) { showError('Select an image file'); return; }
                  if (f.size > 5 * 1024 * 1024) { showError('Image must be under 5MB'); return; }
                  setEditAvatarFile(f);
                  const url = URL.createObjectURL(f);
                  setEditAvatarPreview(url);
                }} style={{ fontSize: '0.75rem' }} />
              </div>

              {/* Banner Upload */}
              <div>
                <label className="block text-sm font-medium mb-1">Banner</label>
                <div style={{
                  width: '100%', height: 80, borderRadius: 4, overflow: 'hidden',
                  background: editBannerColor || 'var(--admin-surface-raised)',
                  marginBottom: 8,
                  position: 'relative',
                }}>
                  {editBannerPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editBannerPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!f.type.startsWith('image/')) { showError('Select an image file'); return; }
                    if (f.size > 5 * 1024 * 1024) { showError('Image must be under 5MB'); return; }
                    setEditBannerFile(f);
                    const url = URL.createObjectURL(f);
                    setEditBannerPreview(url);
                  }} style={{ fontSize: '0.75rem' }} />
                  <input type="color" value={editBannerColor || '#8b1a1a'} onChange={(e) => setEditBannerColor(e.target.value)} style={{ width: 32, height: 32, cursor: 'pointer', border: 'none' }} title="Banner color" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-admin" style={{ background: 'var(--admin-accent)', color: '#fff', padding: '8px 16px', fontWeight: 600 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditBot(null)} className="btn-admin" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: 'var(--admin-serif)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '0.8rem',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: '0.7rem',
};
