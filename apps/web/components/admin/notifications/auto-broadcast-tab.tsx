'use client';

import { useState, useEffect } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function AutoBroadcastTab() {
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/broadcast-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.auto_broadcast_schedule) {
          try {
            const hours = JSON.parse(data.settings.auto_broadcast_schedule);
            if (Array.isArray(hours)) setSelectedHours(hours);
          } catch {
            // ignore
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function toggleHour(h: number) {
    setSelectedHours((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort((a, b) => a - b)
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/broadcast-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            auto_broadcast_enabled: selectedHours.length > 0 ? 'true' : 'false',
            auto_broadcast_schedule: JSON.stringify(selectedHours),
          },
        }),
      });
      if (res.ok) {
        setMessage('Schedule saved.');
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
      const res = await fetch('/api/cron/auto-broadcast?force=true', {
        headers: {
          Authorization: `Bearer ${window.prompt('Enter CRON_SECRET to trigger manually (or leave blank in dev mode):', '') || ''}`,
        },
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

  const summary =
    selectedHours.length === 0
      ? 'No broadcasts scheduled'
      : `${selectedHours.length} broadcast${selectedHours.length === 1 ? '' : 's'}/day: ${selectedHours.map(formatHour).join(', ')} ET`;

  if (!loaded) return null;

  return (
    <div className="auto-broadcast-tab">
      <div className="admin-card" style={{ padding: 24 }}>
        <h3 className="admin-subsection-title" style={{ marginTop: 0 }}>
          Auto-Broadcast Schedule
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 400,
              color: 'var(--admin-text-secondary)',
              marginLeft: 12,
              letterSpacing: 0,
              textTransform: 'none',
            }}
          >
            (Eastern Time)
          </span>
        </h3>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 16,
            marginBottom: 20,
          }}
        >
          {HOURS.map((h) => {
            const active = selectedHours.includes(h);
            return (
              <button
                key={h}
                onClick={() => toggleHour(h)}
                style={{
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  fontWeight: active ? 700 : 400,
                  border: `1.5px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border, #555)'}`,
                  borderRadius: 20,
                  background: active ? 'var(--admin-accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--admin-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  minWidth: 64,
                }}
              >
                {formatHour(h)}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn-admin" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
          <span
            style={{
              fontSize: '0.78rem',
              color: 'var(--admin-text-secondary)',
            }}
          >
            {summary}
          </span>
        </div>

        {message && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 14px',
              borderRadius: 4,
              fontSize: '0.8rem',
              background:
                message.startsWith('Error') || message.startsWith('Trigger failed')
                  ? 'rgba(180,40,40,0.1)'
                  : 'rgba(40,140,40,0.1)',
              color:
                message.startsWith('Error') || message.startsWith('Trigger failed')
                  ? 'var(--crimson, #8b1a1a)'
                  : 'var(--admin-success, #2a8a2a)',
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* Manual trigger */}
      <div className="admin-card" style={{ padding: 24, marginTop: 16 }}>
        <h3 className="admin-subsection-title" style={{ marginTop: 0 }}>Manual Trigger</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: 12 }}>
          Send an AI-generated broadcast right now, regardless of the schedule.
        </p>
        <button
          className="btn-admin"
          disabled={triggering}
          onClick={handleTriggerNow}
          style={{
            background: 'var(--admin-accent-secondary, #555)',
            opacity: triggering ? 0.6 : 1,
          }}
        >
          {triggering ? 'Triggering...' : 'Trigger Broadcast Now'}
        </button>
      </div>
    </div>
  );
}
