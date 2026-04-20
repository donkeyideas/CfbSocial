'use client';

import { useState, useEffect, useCallback } from 'react';

interface XpConfigRow {
  id: string;
  source: string;
  label: string;
  xp_value: number;
  daily_cap: number | null;
  is_active: boolean;
  sort_order: number;
}

interface LevelThreshold {
  level: number;
  min_xp: number;
  dynasty_tier: string;
}

interface Distribution {
  totalUsers: number;
  tierCounts: Record<string, number>;
  levelCounts: Record<number, number>;
  avgXp: number;
  maxXp: number;
}

type Tab = 'activity-xp' | 'levels' | 'distribution' | 'tools';

const TIER_ORDER = ['WALK_ON', 'STARTER', 'ALL_CONFERENCE', 'ALL_AMERICAN', 'HEISMAN', 'HALL_OF_FAME'];

const TIER_LABELS: Record<string, string> = {
  WALK_ON: 'Walk-On',
  STARTER: 'Starter',
  ALL_CONFERENCE: 'All-Conference',
  ALL_AMERICAN: 'All-American',
  HEISMAN: 'Heisman',
  HALL_OF_FAME: 'Hall of Fame',
};

export function XpEconomyClient() {
  const [activeTab, setActiveTab] = useState<Tab>('activity-xp');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [xpConfig, setXpConfig] = useState<XpConfigRow[]>([]);
  const [levelThresholds, setLevelThresholds] = useState<LevelThreshold[]>([]);
  const [distribution, setDistribution] = useState<Distribution | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/xp-config');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setXpConfig(data.xpConfig);
      setLevelThresholds(data.levelThresholds);
      setDistribution(data.distribution);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load XP configuration' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleSaveXpConfig() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/xp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_xp_config',
          configs: xpConfig.map((c) => ({
            source: c.source,
            xp_value: c.xp_value,
            daily_cap: c.daily_cap,
            is_active: c.is_active,
          })),
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      showMessage('success', 'XP values saved successfully');
    } catch {
      showMessage('error', 'Failed to save XP values');
    }
    setSaving(false);
  }

  async function handleSaveLevels() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/xp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_level_thresholds',
          thresholds: levelThresholds,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      showMessage('success', 'Level thresholds saved successfully');
    } catch {
      showMessage('error', 'Failed to save level thresholds');
    }
    setSaving(false);
  }

  async function handleRecalculate() {
    if (!confirm('This will recalculate XP, levels, and tiers for ALL users based on their xp_log history. Continue?')) return;
    setRecalculating(true);
    try {
      const res = await fetch('/api/admin/xp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalculate_all' }),
      });
      if (!res.ok) throw new Error('Recalculation failed');
      showMessage('success', 'All user XP recalculated successfully');
      await loadData();
    } catch {
      showMessage('error', 'Failed to recalculate. Check server logs.');
    }
    setRecalculating(false);
  }

  function updateXpConfig(source: string, field: string, value: unknown) {
    setXpConfig((prev) =>
      prev.map((c) => (c.source === source ? { ...c, [field]: value } : c))
    );
  }

  function updateThreshold(level: number, field: string, value: unknown) {
    setLevelThresholds((prev) =>
      prev.map((t) => (t.level === level ? { ...t, [field]: value } : t))
    );
  }

  if (loading) {
    return <div className="admin-card p-6">Loading XP configuration...</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'activity-xp', label: 'Activity XP' },
    { key: 'levels', label: 'Level Thresholds' },
    { key: 'distribution', label: 'User Distribution' },
    { key: 'tools', label: 'Tools' },
  ];

  return (
    <div className="space-y-4">
      {/* Message banner */}
      {message && (
        <div className={`admin-card p-3 text-center ${message.type === 'success' ? 'admin-success-msg' : 'admin-error-msg'}`}
          style={{
            borderColor: message.type === 'success' ? 'var(--admin-success)' : 'var(--admin-error)',
            color: message.type === 'success' ? 'var(--admin-success)' : 'var(--admin-error)',
          }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid var(--admin-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? 'btn-admin' : 'btn-admin-outline'}
            style={{
              borderRadius: '4px 4px 0 0',
              borderBottom: 'none',
              fontSize: '0.82rem',
              padding: '8px 16px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity XP Tab */}
      {activeTab === 'activity-xp' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-subsection-title">XP Rewards Per Activity</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '16px' }}>
            Set XP awarded for each user action. Daily caps prevent spam by limiting XP earned per source per day.
            The server enforces these values — client-side amounts are ignored.
          </p>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Activity</th>
                <th style={{ textAlign: 'left' }}>Source Key</th>
                <th style={{ width: '100px' }}>XP Value</th>
                <th style={{ width: '100px' }}>Daily Cap</th>
                <th style={{ width: '80px' }}>Active</th>
              </tr>
            </thead>
            <tbody>
              {xpConfig.map((cfg) => (
                <tr key={cfg.source}>
                  <td style={{ fontWeight: 600 }}>{cfg.label}</td>
                  <td style={{ fontFamily: 'var(--admin-mono)', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                    {cfg.source}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="admin-input"
                      value={cfg.xp_value}
                      onChange={(e) => updateXpConfig(cfg.source, 'xp_value', parseInt(e.target.value) || 0)}
                      min={0}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="admin-input"
                      value={cfg.daily_cap ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateXpConfig(cfg.source, 'daily_cap', v ? parseInt(v) || null : null);
                      }}
                      placeholder="None"
                      min={0}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={cfg.is_active}
                      onChange={(e) => updateXpConfig(cfg.source, 'is_active', e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button className="btn-admin" onClick={handleSaveXpConfig} disabled={saving}>
              {saving ? 'Saving...' : 'Save XP Values'}
            </button>
          </div>
        </div>
      )}

      {/* Level Thresholds Tab */}
      {activeTab === 'levels' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-subsection-title">Level Thresholds</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '16px' }}>
            Configure the XP required to reach each level and its associated dynasty tier.
            Changes take effect on new XP awards. Use &ldquo;Recalculate All&rdquo; in Tools to apply retroactively.
          </p>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Level</th>
                <th style={{ width: '140px' }}>Min XP</th>
                <th style={{ width: '180px' }}>Dynasty Tier</th>
              </tr>
            </thead>
            <tbody>
              {levelThresholds.map((t) => (
                <tr key={t.level}>
                  <td style={{ fontWeight: 700, textAlign: 'center' }}>{t.level}</td>
                  <td>
                    <input
                      type="number"
                      className="admin-input"
                      value={t.min_xp}
                      onChange={(e) => updateThreshold(t.level, 'min_xp', parseInt(e.target.value) || 0)}
                      min={0}
                      style={{ width: '120px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <select
                      className="admin-select"
                      value={t.dynasty_tier}
                      onChange={(e) => updateThreshold(t.level, 'dynasty_tier', e.target.value)}
                      style={{ width: '160px' }}
                    >
                      {TIER_ORDER.map((tier) => (
                        <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button className="btn-admin" onClick={handleSaveLevels} disabled={saving}>
              {saving ? 'Saving...' : 'Save Level Thresholds'}
            </button>
          </div>
        </div>
      )}

      {/* Distribution Tab */}
      {activeTab === 'distribution' && distribution && (
        <div className="space-y-4">
          {/* Stats strip */}
          <div className="admin-metrics-strip">
            <div className="admin-stat-ticket">
              <span className="admin-stat-ticket-label">Total Users</span>
              <span className="admin-stat-ticket-value">{distribution.totalUsers.toLocaleString()}</span>
            </div>
            <div className="admin-stat-ticket">
              <span className="admin-stat-ticket-label">Avg XP</span>
              <span className="admin-stat-ticket-value">{distribution.avgXp.toLocaleString()}</span>
            </div>
            <div className="admin-stat-ticket">
              <span className="admin-stat-ticket-label">Max XP</span>
              <span className="admin-stat-ticket-value">{distribution.maxXp.toLocaleString()}</span>
            </div>
          </div>

          {/* Tier distribution */}
          <div className="admin-card p-6">
            <h2 className="admin-subsection-title">Tier Distribution</h2>
            <table className="admin-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Tier</th>
                  <th style={{ width: '100px' }}>Users</th>
                  <th style={{ width: '100px' }}>Percentage</th>
                  <th>Bar</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ORDER.map((tier) => {
                  const count = distribution.tierCounts[tier] || 0;
                  const pct = distribution.totalUsers > 0 ? (count / distribution.totalUsers * 100) : 0;
                  return (
                    <tr key={tier}>
                      <td style={{ fontWeight: 600 }}>{TIER_LABELS[tier]}</td>
                      <td style={{ textAlign: 'center' }}>{count}</td>
                      <td style={{ textAlign: 'center' }}>{pct.toFixed(1)}%</td>
                      <td>
                        <div style={{
                          height: '14px',
                          background: 'var(--admin-surface)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(pct, 100)}%`,
                            background: 'var(--admin-accent)',
                            borderRadius: '3px',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Level distribution */}
          <div className="admin-card p-6">
            <h2 className="admin-subsection-title">Level Distribution</h2>
            <table className="admin-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Level</th>
                  <th style={{ width: '100px' }}>Users</th>
                  <th>Bar</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 21 }, (_, i) => i + 1).map((level) => {
                  const count = distribution.levelCounts[level] || 0;
                  const maxCount = Math.max(...Object.values(distribution.levelCounts), 1);
                  return (
                    <tr key={level}>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{level}</td>
                      <td style={{ textAlign: 'center' }}>{count}</td>
                      <td>
                        <div style={{
                          height: '14px',
                          background: 'var(--admin-surface)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(count / maxCount) * 100}%`,
                            background: 'var(--admin-gold)',
                            borderRadius: '3px',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tools Tab */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="admin-card p-6">
            <h2 className="admin-subsection-title">Recalculate All Users</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', marginBottom: '16px' }}>
              Recalculates XP totals, levels, and dynasty tiers for every user based on their xp_log history.
              Use after changing level thresholds or fixing XP data.
            </p>
            <button
              className="btn-admin-danger"
              onClick={handleRecalculate}
              disabled={recalculating}
              style={{ padding: '10px 24px' }}
            >
              {recalculating ? 'Recalculating...' : 'Recalculate All User XP'}
            </button>
          </div>

          <div className="admin-card p-6">
            <h2 className="admin-subsection-title">XP Economy Summary</h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', lineHeight: 1.8 }}>
              <p><strong>How it works:</strong> The server-side <code>award_xp()</code> function reads XP values from the <code>xp_config</code> table.
              Client-sent amounts are ignored (except for achievements). Daily caps limit how much XP a user can earn per source per day.</p>
              <p style={{ marginTop: '8px' }}><strong>Level calculation:</strong> The <code>level_thresholds</code> table maps XP ranges to levels and dynasty tiers.
              Both <code>award_xp()</code> and <code>check_achievements()</code> read from this table.</p>
              <p style={{ marginTop: '8px' }}><strong>Achievement XP:</strong> Achievement rewards are stored in the <code>achievements</code> table (5-50 XP range).
              They are awarded via the <code>check_achievements()</code> trigger when profile stats change.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
