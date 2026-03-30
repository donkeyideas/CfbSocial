/* ── Shared types & constants for Social Posts ────────────────── */

export type SocialPlatform = 'TWITTER' | 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type ToneType = 'engaging' | 'hype' | 'informational' | 'hot-take' | 'funny' | 'game-day' | 'recruiting' | 'analytical';

export interface SocialMediaPost {
  id: string;
  platform: string;
  content: string;
  status: string;
  media_urls: string[] | null;
  scheduled_at: string | null;
  published_at: string | null;
  external_post_id: string | null;
  external_post_url: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationConfig {
  enabled: boolean;
  platforms: SocialPlatform[];
  hour: number;
  topics: string[];
  useDomainContent: boolean;
  requireApproval: boolean;
}

export const CHAR_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  TIKTOK: 300,
  FACEBOOK: 2000,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
};

export const PLATFORM_CREDENTIALS: Record<string, { key: string; label: string }[]> = {
  TWITTER: [
    { key: 'twitter_api_key', label: 'API Key' },
    { key: 'twitter_api_secret', label: 'API Secret' },
    { key: 'twitter_access_token', label: 'Access Token' },
    { key: 'twitter_access_token_secret', label: 'Access Token Secret' },
  ],
  LINKEDIN: [
    { key: 'linkedin_access_token', label: 'Access Token' },
    { key: 'linkedin_person_urn', label: 'Person URN' },
  ],
  FACEBOOK: [
    { key: 'facebook_page_token', label: 'Page Access Token' },
    { key: 'facebook_page_id', label: 'Page ID' },
  ],
  INSTAGRAM: [
    { key: 'instagram_access_token', label: 'Access Token' },
    { key: 'instagram_account_id', label: 'Account ID' },
  ],
};
