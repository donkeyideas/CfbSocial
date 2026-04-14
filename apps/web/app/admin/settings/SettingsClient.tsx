'use client';

import { useState, useEffect } from 'react';

export function SettingsClient() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // App store links
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');

  // Auto-broadcast settings
  const [autoBroadcastEnabled, setAutoBroadcastEnabled] = useState(false);
  const [autoBroadcastIntervalHours, setAutoBroadcastIntervalHours] = useState(12);

  // Load current settings
  useEffect(() => {
    async function load() {
      try {
        const [linksRes, settingsRes] = await Promise.all([
          fetch('/api/admin/app-links'),
          fetch('/api/admin/broadcast-settings'),
        ]);
        if (linksRes.ok) {
          const data = await linksRes.json();
          setGooglePlayUrl(data.links?.app_google_play_url || '');
          setAppStoreUrl(data.links?.app_apple_store_url || '');
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setAutoBroadcastEnabled(data.settings?.auto_broadcast_enabled === 'true');
          setAutoBroadcastIntervalHours(
            parseInt(data.settings?.auto_broadcast_interval_hours || '12', 10)
          );
        }
      } catch {
        // ignore load errors
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const errors: string[] = [];

    // Save app links
    try {
      const res = await fetch('/api/admin/app-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          links: {
            app_google_play_url: googlePlayUrl,
            app_apple_store_url: appStoreUrl,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        errors.push(data.error || 'Failed to save app links');
      }
    } catch {
      errors.push('Network error saving app links');
    }

    // Save broadcast settings
    try {
      const res = await fetch('/api/admin/broadcast-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            auto_broadcast_enabled: String(autoBroadcastEnabled),
            auto_broadcast_interval_hours: String(autoBroadcastIntervalHours),
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        errors.push(data.error || 'Failed to save broadcast settings');
      }
    } catch {
      errors.push('Network error saving broadcast settings');
    }

    if (errors.length) {
      setMessage(`Errors: ${errors.join('; ')}`);
    } else {
      setMessage('Settings saved.');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="admin-section-title">Admin Settings</h1>

      <div className="admin-card p-6">
        {message && (
          <div
            className="mb-4 rounded-md p-3 text-sm"
            style={{
              background: message.startsWith('Errors')
                ? 'rgba(180,40,40,0.1)'
                : 'rgba(40,140,40,0.1)',
              color: message.startsWith('Errors')
                ? 'var(--crimson)'
                : 'var(--admin-success, #2a8a2a)',
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* App Store Links */}
          <section>
            <h2 className="admin-subsection-title">App Download Links</h2>
            <p className="mb-3 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
              Set the URLs for app store listings. These appear in the site footer.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                  Google Play Store URL
                </label>
                <input
                  type="url"
                  value={googlePlayUrl}
                  onChange={(e) => setGooglePlayUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="admin-input"
                  style={{ width: '100%', maxWidth: 600 }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                  Apple App Store URL
                </label>
                <input
                  type="url"
                  value={appStoreUrl}
                  onChange={(e) => setAppStoreUrl(e.target.value)}
                  placeholder="https://apps.apple.com/app/..."
                  className="admin-input"
                  style={{ width: '100%', maxWidth: 600 }}
                />
              </div>
            </div>
          </section>

          <hr className="border-[var(--admin-border)]" />

          {/* Auto-Broadcast Settings */}
          <section>
            <h2 className="admin-subsection-title">Auto-Broadcast Notifications</h2>
            <p className="mb-3 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
              AI-generated system notifications sent automatically on a timer.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={autoBroadcastEnabled}
                  onChange={(e) => setAutoBroadcastEnabled(e.target.checked)}
                  className="rounded"
                />
                Enable automatic broadcasts
              </label>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                  Broadcast interval (hours)
                </label>
                <input
                  type="number"
                  value={autoBroadcastIntervalHours}
                  onChange={(e) => setAutoBroadcastIntervalHours(parseInt(e.target.value, 10) || 1)}
                  min={1}
                  max={168}
                  className="admin-input w-32"
                />
                <span className="ml-2 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                  (1 = every hour, 12 = twice daily, 24 = once daily)
                </span>
              </div>
            </div>
          </section>

          <hr className="border-[var(--admin-border)]" />

          {/* Moderation settings */}
          <section>
            <h2 className="admin-subsection-title">Moderation</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                  Auto-flag threshold (number of reports)
                </label>
                <input
                  type="number"
                  defaultValue={3}
                  min={1}
                  max={20}
                  className="admin-input w-32"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                  Auto-suspend threshold (warnings)
                </label>
                <input
                  type="number"
                  defaultValue={5}
                  min={1}
                  max={20}
                  className="admin-input w-32"
                />
              </div>
            </div>
          </section>

          <hr className="border-[var(--admin-border)]" />

          {/* Registration settings */}
          <section>
            <h2 className="admin-subsection-title">Registration</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                <input type="checkbox" defaultChecked className="rounded" />
                Require email verification
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                <input type="checkbox" defaultChecked className="rounded" />
                Require school selection
              </label>
            </div>
          </section>

          <hr className="border-[var(--admin-border)]" />

          {/* Game day settings */}
          <section>
            <h2 className="admin-subsection-title">Game Day</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                <input type="checkbox" defaultChecked className="rounded" />
                Enable live scores ticker
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                <input type="checkbox" defaultChecked className="rounded" />
                Enable prediction locking at kickoff
              </label>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="btn-admin"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
