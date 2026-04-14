'use client';

import { useState, useEffect } from 'react';

interface BroadcastSettings {
  auto_broadcast_enabled: string;
  auto_broadcast_interval_hours: string;
}

export function AutoBroadcastTab() {
  const [settings, setSettings] = useState<BroadcastSettings>({
    auto_broadcast_enabled: 'false',
    auto_broadcast_interval_hours: '12',
  });
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastBroadcast, setLastBroadcast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, broadcastsRes] = await Promise.all([
          fetch('/api/admin/broadcast-settings'),
          fetch('/api/admin/push-log?limit=1'),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.settings) {
            setSettings({
              auto_broadcast_enabled: data.settings.auto_broadcast_enabled || 'false',
              auto_broadcast_interval_hours: data.settings.auto_broadcast_interval_hours || '12',
            });
          }
        }

        // Get last system broadcast timestamp
        if (broadcastsRes.ok) {
          const data = await broadcastsRes.json();
          if (data.entries?.[0]?.created_at) {
            setLastBroadcast(data.entries[0].created_at);
          }
        }
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/broadcast-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setMessage('Settings saved.');
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTriggerNow() {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cron/auto-broadcast', {
        headers: { 'Authorization': `Bearer ${window.prompt('Enter CRON_SECRET to trigger manually (or leave blank in dev mode):', '') || ''}` },
      });
      if (res.ok) {
        setMessage('Auto-broadcast triggered. Check System Broadcasts tab for results.');
      } else {
        const data = await res.json();
        setMessage(`Trigger failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      setMessage('Network error triggering broadcast');
    } finally {
      setTriggering(false);
    }
  }

  const isEnabled = settings.auto_broadcast_enabled === 'true';
  const intervalHours = parseInt(settings.auto_broadcast_interval_hours, 10) || 12;

  return (
    <div className="auto-broadcast-tab">
      <div className="admin-card" style={{ padding: 24 }}>
        <h3 className="admin-subsection-title" style={{ marginTop: 0 }}>Auto-Broadcast Configuration</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: 20 }}>
          When enabled, the system automatically generates and sends AI-powered broadcast notifications
          to all users on a configurable schedule. The cron runs every hour and checks if enough time has
          passed since the last broadcast.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 6,
              background: isEnabled ? 'rgba(40,140,40,0.1)' : 'rgba(180,40,40,0.1)',
              border: `1px solid ${isEnabled ? 'rgba(40,140,40,0.3)' : 'rgba(180,40,40,0.3)'}`,
              width: 'fit-content',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isEnabled ? '#2a8a2a' : '#8b1a1a',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {isEnabled ? 'ACTIVE' : 'DISABLED'}
            </span>
            {isEnabled && (
              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>
                — every {intervalHours}h
              </span>
            )}
          </div>

          {/* Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, auto_broadcast_enabled: e.target.checked ? 'true' : 'false' }))
              }
              className="rounded"
            />
            Enable automatic broadcasts
          </label>

          {/* Interval */}
          <div>
            <label className="admin-label" style={{ display: 'block', marginBottom: 4 }}>
              Broadcast Interval (hours)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={settings.auto_broadcast_interval_hours}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, auto_broadcast_interval_hours: e.target.value }))
                }
                min={1}
                max={168}
                className="admin-input"
                style={{ width: 80 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>
                1 = hourly, 6 = 4x daily, 12 = 2x daily, 24 = daily, 168 = weekly
              </span>
            </div>
          </div>

          {/* Last broadcast */}
          {lastBroadcast && (
            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>
              Last broadcast: {new Date(lastBroadcast).toLocaleString()}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              className="btn-admin"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              className="btn-admin"
              disabled={triggering}
              onClick={handleTriggerNow}
              style={{ background: 'var(--admin-accent-secondary, #555)', opacity: triggering ? 0.6 : 1 }}
            >
              {triggering ? 'Triggering...' : 'Trigger Broadcast Now'}
            </button>
          </div>

          {message && (
            <div
              style={{
                padding: '8px 14px',
                borderRadius: 4,
                fontSize: '0.8rem',
                background: message.startsWith('Error') || message.startsWith('Trigger failed')
                  ? 'rgba(180,40,40,0.1)'
                  : 'rgba(40,140,40,0.1)',
                color: message.startsWith('Error') || message.startsWith('Trigger failed')
                  ? 'var(--crimson, #8b1a1a)'
                  : 'var(--admin-success, #2a8a2a)',
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="admin-card" style={{ padding: 24, marginTop: 16 }}>
        <h3 className="admin-subsection-title" style={{ marginTop: 0 }}>How Auto-Broadcast Works</h3>
        <ol style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', lineHeight: 1.8, paddingLeft: 20 }}>
          <li>Vercel cron runs the auto-broadcast endpoint every hour</li>
          <li>The endpoint checks if auto-broadcast is enabled in settings</li>
          <li>If enabled, it checks the time since the last broadcast against the configured interval</li>
          <li>If enough time has passed, it generates unique content via DeepSeek AI</li>
          <li>Content is college-football themed: rivalry hype, prediction challenges, portal news, dynasty rankings</li>
          <li>The notification is created as a system notification and sent as a push to all users</li>
          <li>All broadcasts appear in the System Broadcasts tab</li>
        </ol>
      </div>
    </div>
  );
}
