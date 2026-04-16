import { createAdminClient } from '@/lib/admin/supabase/admin';
import { aiChat } from '@/lib/admin/ai/router';
import {
  type SocialPlatform,
  type ToneType,
  type SocialMediaPost,
  type AutomationConfig,
  CHAR_LIMITS,
  PLATFORM_CREDENTIALS,
} from './social-posts-types';

export type { SocialPlatform, PostStatus, ToneType, SocialMediaPost, AutomationConfig } from './social-posts-types';
export { CHAR_LIMITS, PLATFORM_CREDENTIALS } from './social-posts-types';

const AUTOMATION_KEYS = {
  enabled: 'social_auto_enabled',
  platforms: 'social_auto_platforms',
  hour: 'social_auto_hour',
  topics: 'social_auto_topics',
  useDomainContent: 'social_auto_use_domain_content',
  requireApproval: 'social_auto_require_approval',
};

const TONE_DESCRIPTIONS: Record<ToneType, string> = {
  engaging: 'Conversational, attention-grabbing, encourages interaction and replies',
  hype: 'Excited, energetic, building anticipation for games and events',
  informational: 'Clear, factual, sharing stats, scores, and news updates',
  'hot-take': 'Bold, opinionated, provocative statements that spark debate',
  funny: 'Humorous, witty, using college football humor and memes',
  'game-day': 'Hyped for game day, rallying fans, tailgate energy',
  recruiting: 'Focused on recruiting news, transfer portal updates, commitments',
  analytical: 'Data-driven, breaking down plays, matchups, and strategies',
};

/* ── CRUD Operations ───────────────────────────────────────────── */

export async function getSocialPosts(filters?: { status?: string; platform?: string }) {
  const supabase = createAdminClient();
  let query = supabase.from('social_media_posts').select('*').order('created_at', { ascending: false });
  if (filters?.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
  if (filters?.platform && filters.platform !== 'ALL') query = query.eq('platform', filters.platform);
  const { data } = await query;
  return data ?? [];
}

export async function createSocialPost(post: {
  platform: string;
  content: string;
  status?: string;
  scheduled_at?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('social_media_posts')
    .insert({ ...post, status: post.status || 'draft' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { success: true as const, id: data.id as string };
}

export async function updateSocialPost(id: string, updates: {
  content?: string;
  status?: string;
  scheduled_at?: string | null;
  published_at?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('social_media_posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  return { success: true as const };
}

export async function deleteSocialPost(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('social_media_posts').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true as const };
}

export async function bulkApproveDrafts() {
  const supabase = createAdminClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const { data, error } = await supabase
    .from('social_media_posts')
    .update({ status: 'scheduled', scheduled_at: tomorrow.toISOString(), updated_at: new Date().toISOString() })
    .eq('status', 'draft')
    .select('id');

  if (error) return { error: error.message };
  return { success: true as const, count: data?.length ?? 0 };
}

/* ── AI Generation ─────────────────────────────────────────────── */

function buildPrompt(platform: SocialPlatform, topic: string | undefined, tone: ToneType): string {
  const limit = CHAR_LIMITS[platform];
  const toneDesc = TONE_DESCRIPTIONS[tone];
  const topicLine = topic
    ? `Write about: ${topic}`
    : 'Pick a trending college football topic (rivalries, transfer portal, game predictions, recruiting, playoff debates, coaching changes).';

  return `You are a college football social media content creator for "CFB Social" -- a passionate college football community platform.

${topicLine}

Platform: ${platform}
Character limit: ${limit} characters (STRICT -- do not exceed)
Tone: ${tone} -- ${toneDesc}

Rules:
- Write exactly ONE post for ${platform}
- Stay within ${limit} characters for the main content
- No emojis
- Use college football terminology naturally
- Reference real teams, conferences, rivalries, or players when relevant
- Make it feel authentic, not corporate
- Do NOT use markdown formatting (no bold, italics, headers, etc.)

After the post content, add on separate lines:
---HASHTAGS---
3-5 relevant college football hashtags (without # prefix)

---IMAGE_PROMPT---
One-sentence image description that would complement this post`;
}

function parseGeneratedContent(raw: string): {
  content: string;
  hashtags: string[];
  imagePrompt: string;
} {
  let content = raw;
  let hashtags: string[] = [];
  let imagePrompt = '';

  const imgIdx = content.indexOf('---IMAGE_PROMPT---');
  if (imgIdx !== -1) {
    imagePrompt = content.slice(imgIdx + 18).trim();
    content = content.slice(0, imgIdx).trim();
  }

  const hashIdx = content.indexOf('---HASHTAGS---');
  if (hashIdx !== -1) {
    const hashSection = content.slice(hashIdx + 14).trim();
    content = content.slice(0, hashIdx).trim();
    hashtags = hashSection
      .split(/[\n,]+/)
      .map((h) => h.replace(/^#/, '').trim())
      .filter(Boolean);
    hashtags = [...new Set(hashtags)];
  }

  content = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/^-\s+/gm, '- ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { content, hashtags, imagePrompt };
}

export async function generateSocialPosts(params: {
  topic?: string;
  tone: ToneType;
  platforms: SocialPlatform[];
}): Promise<{ error?: string; posts?: SocialMediaPost[]; errors?: string[] }> {
  const { topic, tone, platforms } = params;
  if (platforms.length === 0) return { error: 'Select at least one platform' };

  const results: SocialMediaPost[] = [];
  const errors: string[] = [];

  await Promise.all(
    platforms.map(async (platform) => {
      try {
        const prompt = buildPrompt(platform, topic, tone);
        const limit = CHAR_LIMITS[platform];
        const maxTokens = limit <= 300 ? 150 : 600;

        const raw = await aiChat(prompt, { temperature: 0.8, maxTokens });
        const { content, hashtags, imagePrompt } = parseGeneratedContent(raw);

        const result = await createSocialPost({
          platform,
          content,
          status: 'draft',
          metadata: { hashtags, imagePrompt, tone, topic: topic || 'auto' },
        });

        if ('error' in result) {
          errors.push(`${platform}: ${result.error}`);
        } else {
          const supabase = createAdminClient();
          const { data } = await supabase.from('social_media_posts').select('*').eq('id', result.id).single();
          if (data) results.push(data as SocialMediaPost);
        }
      } catch (err) {
        errors.push(`${platform}: ${err instanceof Error ? err.message : 'Generation failed'}`);
      }
    }),
  );

  if (results.length === 0 && errors.length > 0) {
    return { error: errors.join('; ') };
  }

  return { posts: results, errors };
}

/* ── Publishing ────────────────────────────────────────────────── */

export async function publishPost(id: string): Promise<{ error?: string; success?: true }> {
  const supabase = createAdminClient();
  const { data: post } = await supabase.from('social_media_posts').select('*').eq('id', id).single();
  if (!post) return { error: 'Post not found' };

  const platform = (post.platform as string).toUpperCase();
  const creds = await getCredentials();
  const metadata = (post.metadata ?? {}) as Record<string, unknown>;
  const hashtags = (metadata.hashtags as string[]) ?? [];

  let fullContent = post.content as string;
  if (hashtags.length > 0) {
    fullContent += '\n\n' + hashtags.map((h) => `#${h}`).join(' ');
  }

  try {
    if (platform === 'TWITTER') {
      await publishToTwitter(fullContent, creds);
    } else if (platform === 'LINKEDIN') {
      await publishToLinkedIn(fullContent, creds);
    } else if (platform === 'FACEBOOK') {
      await publishToFacebook(fullContent, creds);
    } else if (platform === 'INSTAGRAM') {
      return { error: 'Instagram text-only posts are not supported via API.' };
    } else if (platform === 'TIKTOK') {
      return { error: 'TikTok publishing is not yet implemented.' };
    } else {
      return { error: `Unsupported platform: ${platform}` };
    }

    await supabase.from('social_media_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Publishing failed';
    await supabase.from('social_media_posts').update({
      status: 'failed',
      error_message: msg,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    return { error: msg };
  }
}

async function publishToTwitter(content: string, creds: Record<string, string>) {
  const { TwitterApi } = await import('twitter-api-v2').catch(() => {
    throw new Error('twitter-api-v2 not installed. Run: pnpm add twitter-api-v2');
  });
  const client = new TwitterApi({
    appKey: creds.twitter_api_key || '',
    appSecret: creds.twitter_api_secret || '',
    accessToken: creds.twitter_access_token || '',
    accessSecret: creds.twitter_access_token_secret || '',
  });
  await client.v2.tweet(content.slice(0, 280));
}

async function publishToLinkedIn(content: string, creds: Record<string, string>) {
  const token = creds.linkedin_access_token;
  const urn = creds.linkedin_person_urn;
  if (!token || !urn) throw new Error('LinkedIn credentials not configured');

  const res = await fetch('https://api.linkedin.com/v2/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: urn.startsWith('urn:') ? urn : `urn:li:person:${urn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: content.slice(0, 3000) }, shareMediaCategory: 'NONE' } },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn API error: ${res.status}`);
}

async function publishToFacebook(content: string, creds: Record<string, string>) {
  const pageToken = creds.facebook_page_token;
  const pageId = creds.facebook_page_id;
  if (!pageToken || !pageId) throw new Error('Facebook credentials not configured');

  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: content.slice(0, 2000), access_token: pageToken }),
  });
  if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
}

/* ── Credentials ───────────────────────────────────────────────── */

export async function getCredentials(): Promise<Record<string, string>> {
  const supabase = createAdminClient();
  const allKeys = Object.values(PLATFORM_CREDENTIALS).flat().map((c) => c.key);
  const { data } = await supabase.from('admin_settings').select('key, value').in('key', allKeys);
  const creds: Record<string, string> = {};
  for (const row of data ?? []) {
    creds[row.key] = row.value;
  }
  return creds;
}

export async function saveCredentials(creds: Record<string, string>): Promise<{ error?: string; success?: true }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(creds)) {
    if (!value) continue;
    const { error } = await supabase.from('admin_settings').upsert({ key, value, updated_at: now }, { onConflict: 'key' });
    if (error) return { error: error.message };
  }
  return { success: true };
}

export async function testConnection(platform: string): Promise<{ error?: string; success?: true; message?: string }> {
  const creds = await getCredentials();
  try {
    if (platform === 'TWITTER') {
      const { TwitterApi } = await import('twitter-api-v2').catch(() => { throw new Error('twitter-api-v2 not installed'); });
      const client = new TwitterApi({ appKey: creds.twitter_api_key || '', appSecret: creds.twitter_api_secret || '', accessToken: creds.twitter_access_token || '', accessSecret: creds.twitter_access_token_secret || '' });
      const me = await client.v2.me();
      return { success: true, message: `Connected as @${me.data.username}` };
    }
    if (platform === 'LINKEDIN') {
      const token = creds.linkedin_access_token;
      if (!token) throw new Error('Access token not set');
      const res = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      return { success: true, message: `Connected as ${data.name || data.sub}` };
    }
    if (platform === 'FACEBOOK') {
      const pageToken = creds.facebook_page_token;
      const pageId = creds.facebook_page_id;
      if (!pageToken || !pageId) throw new Error('Page token or page ID not set');
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=name&access_token=${pageToken}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      return { success: true, message: `Connected to ${data.name}` };
    }
    if (platform === 'INSTAGRAM') {
      const token = creds.instagram_access_token;
      const accountId = creds.instagram_account_id;
      if (!token || !accountId) throw new Error('Access token or account ID not set');
      const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}?fields=username&access_token=${token}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      return { success: true, message: `Connected as @${data.username}` };
    }
    return { error: `Unsupported platform: ${platform}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Connection test failed' };
  }
}

/* ── Automation Config ─────────────────────────────────────────── */

export async function getAutomationConfig(): Promise<AutomationConfig> {
  const supabase = createAdminClient();
  const keys = Object.values(AUTOMATION_KEYS);
  const { data } = await supabase.from('admin_settings').select('key, value').in('key', keys);
  const map: Record<string, string | undefined> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  const platformsRaw = map[AUTOMATION_KEYS.platforms];
  const topicsRaw = map[AUTOMATION_KEYS.topics];

  return {
    enabled: map[AUTOMATION_KEYS.enabled] === 'true',
    platforms: platformsRaw ? JSON.parse(platformsRaw) : [],
    hour: parseInt(map[AUTOMATION_KEYS.hour] || '9', 10),
    topics: topicsRaw ? JSON.parse(topicsRaw) : [],
    useDomainContent: map[AUTOMATION_KEYS.useDomainContent] === 'true',
    requireApproval: map[AUTOMATION_KEYS.requireApproval] !== 'false',
  };
}

export async function saveAutomationConfig(config: AutomationConfig): Promise<{ error?: string; success?: true }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const entries = [
    { key: AUTOMATION_KEYS.enabled, value: String(config.enabled) },
    { key: AUTOMATION_KEYS.platforms, value: JSON.stringify(config.platforms) },
    { key: AUTOMATION_KEYS.hour, value: String(config.hour) },
    { key: AUTOMATION_KEYS.topics, value: JSON.stringify(config.topics) },
    { key: AUTOMATION_KEYS.useDomainContent, value: String(config.useDomainContent) },
    { key: AUTOMATION_KEYS.requireApproval, value: String(config.requireApproval) },
  ];
  for (const { key, value } of entries) {
    const { error } = await supabase.from('admin_settings').upsert({ key, value, updated_at: now }, { onConflict: 'key' });
    if (error) return { error: error.message };
  }
  return { success: true };
}
