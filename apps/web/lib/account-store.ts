/**
 * Lightweight localStorage helpers for multi-profile switching.
 * Stores the active profile ID so it persists across page loads.
 */

const ACTIVE_PROFILE_KEY = 'cfb_active_profile';

export function getActiveProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export function clearActiveProfileId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}
