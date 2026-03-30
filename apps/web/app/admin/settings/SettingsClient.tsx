'use client';

import { useState } from 'react';

export function SettingsClient() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Settings are saved to a platform_settings table
    // This is a shell - actual save logic depends on schema
    await new Promise((resolve) => setTimeout(resolve, 500));

    setMessage('Settings saved.');
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Settings</h1>

      <div className="admin-card p-6">
        {message && (
          <div className="mb-4 rounded-md bg-[var(--admin-success)]/10 p-3 text-sm text-[var(--admin-success)]">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Moderation settings */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Moderation</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-[var(--admin-text-secondary)]">
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
                <label className="mb-1 block text-sm text-[var(--admin-text-secondary)]">
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
            <h2 className="mb-3 text-lg font-semibold">Registration</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)]">
                <input type="checkbox" defaultChecked className="rounded" />
                Require email verification
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)]">
                <input type="checkbox" defaultChecked className="rounded" />
                Require school selection
              </label>
            </div>
          </section>

          <hr className="border-[var(--admin-border)]" />

          {/* Game day settings */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Game Day</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)]">
                <input type="checkbox" defaultChecked className="rounded" />
                Enable live scores ticker
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)]">
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
