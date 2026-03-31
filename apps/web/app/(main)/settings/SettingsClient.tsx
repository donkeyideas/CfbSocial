'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { CreateProfileModal } from '@/components/profiles/CreateProfileModal';
import { useAuth } from '@/components/auth/AuthProvider';

interface School {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
}

export function SettingsClient() {
  const router = useRouter();
  const supabase = createClient();
  const { profile: activeProfile, profiles, switchProfile, refreshProfiles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Re-load form fields when the active profile changes
  useEffect(() => {
    async function loadProfile() {
      if (!activeProfile) {
        // Wait for auth context to load
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/login');
          return;
        }
      }

      const editId = activeProfile?.id;
      if (!editId) return;

      const [profileResult, schoolsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', editId).single(),
        supabase.from('schools').select('id, name, primary_color, secondary_color').eq('is_active', true).order('name'),
      ]);

      if (profileResult.data) {
        setUsername(profileResult.data.username ?? '');
        setDisplayName(profileResult.data.display_name ?? '');
        setBio(profileResult.data.bio ?? '');
        setSchoolId(profileResult.data.school_id ?? '');
        setBannerPreview(profileResult.data.banner_url ?? null);
        setAvatarPreview(profileResult.data.avatar_url ?? null);
        setBannerFile(null);
        setAvatarFile(null);
      }

      if (schoolsResult.data) {
        setSchools(schoolsResult.data);
      }

      setMessage(null);
      setLoading(false);
    }

    loadProfile();
  }, [supabase, router, activeProfile]);

  // Get current school colors for preview
  const selectedSchool = schools.find((s) => s.id === schoolId);
  const previewBannerStyle: React.CSSProperties = bannerPreview
    ? { background: `url(${bannerPreview}) center/cover no-repeat` }
    : selectedSchool
      ? { background: `linear-gradient(135deg, ${selectedSchool.primary_color}, ${selectedSchool.secondary_color})` }
      : { background: 'var(--crimson)' };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const editId = activeProfile?.id;
    const ownerId = activeProfile?.owner_id;
    if (!editId || !ownerId) {
      setSaving(false);
      return;
    }

    // Storage paths use owner_id (auth user ID) as base so RLS passes,
    // with profile ID subfolder for alt profiles
    const storageBase = editId === ownerId ? ownerId : `${ownerId}/${editId}`;

    // Upload avatar if selected
    let avatarUrl: string | undefined;
    if (avatarFile) {
      // Use a fixed filename (no extension variation) to avoid stale cached URLs
      const filePath = `${storageBase}/avatar`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type });

      if (uploadError) {
        setMessage({ type: 'error', text: 'Failed to upload avatar: ' + uploadError.message });
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      // Append cache-bust param so browsers pick up the new image
      avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    }

    // Upload banner if selected
    let bannerUrl: string | undefined;
    if (bannerFile) {
      const filePath = `${storageBase}/banner`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, bannerFile, { upsert: true, contentType: bannerFile.type });

      if (uploadError) {
        setMessage({ type: 'error', text: 'Failed to upload banner: ' + uploadError.message });
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      bannerUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    }

    const updatePayload: Record<string, unknown> = {
      username,
      display_name: displayName || null,
      bio: bio || null,
      school_id: schoolId || null,
      updated_at: new Date().toISOString(),
    };

    if (avatarUrl) {
      updatePayload.avatar_url = avatarUrl;
    }

    if (bannerUrl) {
      updatePayload.banner_url = bannerUrl;
    } else if (!bannerPreview) {
      updatePayload.banner_url = null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', editId);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
      await refreshProfiles();
      router.refresh();
    }

    setSaving(false);
  }

  async function handleDeleteProfile(profileId: string) {
    setDeletingId(profileId);
    const res = await fetch(`/api/profiles/${profileId}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshProfiles();
      // If we deleted the active profile, switch to primary
      if (activeProfile?.id === profileId) {
        const primary = profiles.find((p) => p.id === p.owner_id);
        if (primary) switchProfile(primary.id);
      }
    }
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-3xl font-bold">Settings</h1>
        <div className="gridiron-card p-6">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const altProfiles = profiles.filter((p) => p.id !== p.owner_id);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="gridiron-card p-6">
        <h2 className="mb-4 font-serif text-lg font-semibold">
          Profile{activeProfile && activeProfile.id !== activeProfile.owner_id ? ` — @${activeProfile.username}` : ''}
        </h2>

        {message && (
          <div
            className={`mb-4 rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-[var(--success)]/10 text-[var(--success)]'
                : 'bg-[var(--error)]/10 text-[var(--error)]'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Banner image */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Profile Banner
            </label>
            <div
              className="h-24 rounded-md"
              style={previewBannerStyle}
            />
            <div className="mt-2 flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setBannerFile(file);
                  if (file) {
                    setBannerPreview(URL.createObjectURL(file));
                  }
                }}
                className="gridiron-input flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface)] file:px-3 file:py-1 file:text-sm file:font-medium"
              />
              {bannerPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerPreview(null);
                    setBannerFile(null);
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-ink"
                >
                  Reset to school colors
                </button>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={24}
              pattern="^[a-zA-Z0-9_]+$"
              className="gridiron-input w-full"
            />
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="gridiron-input w-full"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              className="gridiron-input w-full resize-none"
              placeholder="Tell the conference about yourself..."
            />
            <p className="mt-1 text-right text-xs text-[var(--text-muted)]">{bio.length}/280</p>
          </div>

          {/* School */}
          <div>
            <label htmlFor="school" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              School Affiliation
            </label>
            <select
              id="school"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="gridiron-input w-full"
            >
              <option value="">No school selected</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          {/* Avatar */}
          <div>
            <label htmlFor="avatar" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              Avatar
            </label>
            <div className="flex items-center gap-4">
              {avatarPreview && (
                <img src={avatarPreview} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
              )}
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setAvatarFile(file);
                  if (file) {
                    setAvatarPreview(URL.createObjectURL(file));
                  }
                }}
                className="gridiron-input flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface)] file:px-3 file:py-1 file:text-sm file:font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-crimson w-full py-3 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Your Profiles */}
      <div className="gridiron-card p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold">Your Profiles</h2>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Create alternate profiles to post with different personas. All profiles share one login.
        </p>
        <div className="space-y-3">
          {profiles.map((p) => {
            const isPrimary = p.id === p.owner_id;
            const isActive = p.id === activeProfile?.id;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-md p-3"
                style={{
                  border: `1px solid ${isActive ? 'var(--crimson)' : 'var(--border)'}`,
                  background: isActive ? 'var(--crimson-faint, rgba(139,26,26,0.05))' : 'transparent',
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--surface)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--serif)', fontWeight: 700, fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (p.username?.[0] ?? '?').toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="text-sm font-semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{p.username}{isPrimary ? ' (Primary)' : ''}
                  </p>
                  {p.display_name && (
                    <p className="text-xs text-[var(--text-muted)]" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.display_name}
                    </p>
                  )}
                </div>
                {isActive ? (
                  <span className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold" style={{ background: 'var(--crimson)', color: '#fff' }}>
                    Active
                  </span>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => switchProfile(p.id)}
                      className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)]"
                    >
                      Switch
                    </button>
                    {!isPrimary && (
                      <button
                        onClick={() => handleDeleteProfile(p.id)}
                        disabled={deletingId === p.id}
                        className="rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--error)]"
                        title="Delete profile"
                      >
                        {deletingId === p.id ? '...' : 'X'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 text-sm font-semibold text-crimson hover:underline"
        >
          + Create new profile
        </button>
      </div>

      {/* Appearance */}
      <div className="gridiron-card p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold">Appearance</h2>
        <div>
          <label htmlFor="fontPref" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            Font Style
          </label>
          <select
            id="fontPref"
            defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('cfb-font-pref') ?? 'classic') : 'classic'}
            onChange={(e) => {
              const val = e.target.value;
              localStorage.setItem('cfb-font-pref', val);
              if (val === 'modern') {
                document.documentElement.setAttribute('data-font', 'modern');
              } else {
                document.documentElement.removeAttribute('data-font');
              }
            }}
            className="gridiron-input w-full"
          >
            <option value="classic">Classic (Serif)</option>
            <option value="modern">Modern (Sans-Serif)</option>
          </select>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Changes how headlines and body text appear across the site.
          </p>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="gridiron-card p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold">Notification Preferences</h2>
        <NotificationPreferences />
      </div>

      {/* Legal */}
      <div className="gridiron-card p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold">Legal</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="text-sm font-medium text-[var(--text-secondary)] hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-sm font-medium text-[var(--text-secondary)] hover:text-ink">
            Terms of Service
          </Link>
          <Link href="/contact" className="text-sm font-medium text-[var(--text-secondary)] hover:text-ink">
            Contact Us
          </Link>
        </div>
      </div>

      {/* Account */}
      <div className="gridiron-card p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold">Account</h2>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
              router.refresh();
            }}
            className="rounded-md border border-[var(--error)] px-4 py-2 text-sm font-semibold text-[var(--error)] transition-colors hover:bg-[var(--error)]/10"
          >
            Sign Out
          </button>
          <Link
            href="/delete-account"
            className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--error)]"
          >
            Delete Account
          </Link>
        </div>
      </div>

      <CreateProfileModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
