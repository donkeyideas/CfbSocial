import { createAdminClient } from '@/lib/admin/supabase/admin';

interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  created_at: string;
  reference_id?: string;
}

export async function getAdminActivityFeed(params: {
  type?: string;
  limit?: number;
}): Promise<ActivityFeedItem[]> {
  const supabase = createAdminClient();
  const limit = params.limit ?? 30;

  const [signups, moderationEvents, reports, appeals] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, created_at, school:schools!profiles_school_id_fkey(name)').order('created_at', { ascending: false }).limit(10),
    supabase.from('moderation_events').select('id, event_type, action_taken, created_at, post_id, moderator:profiles!moderation_events_moderator_id_fkey(username)').order('created_at', { ascending: false }).limit(10),
    supabase.from('reports').select('id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(username), reported:profiles!reports_reported_user_id_fkey(username)').order('created_at', { ascending: false }).limit(10),
    supabase.from('appeals').select('id, reason, status, created_at, user:profiles(username)').order('created_at', { ascending: false }).limit(10),
  ]);

  const feed: ActivityFeedItem[] = [];

  for (const s of signups.data ?? []) {
    const schoolRaw = s.school as unknown;
    const schoolName = Array.isArray(schoolRaw) ? (schoolRaw[0] as { name: string } | undefined)?.name : (schoolRaw as { name: string } | null)?.name;
    feed.push({
      id: `signup-${s.id}`,
      type: 'signup',
      title: 'New User Signup',
      description: `${s.display_name || s.username} joined${schoolName ? ` and selected ${schoolName}` : ''}`,
      severity: 'success',
      created_at: s.created_at,
      reference_id: s.id,
    });
  }

  for (const e of moderationEvents.data ?? []) {
    const modRaw = e.moderator as unknown;
    const modName = Array.isArray(modRaw) ? (modRaw[0] as { username: string } | undefined)?.username : (modRaw as { username: string } | null)?.username;
    feed.push({
      id: `mod-${e.id}`,
      type: 'moderation',
      title: `Moderation: ${e.event_type}`,
      description: `${e.action_taken}${modName ? ` by @${modName}` : ''}`,
      severity: e.event_type?.includes('REMOVE') ? 'critical' : e.event_type?.includes('FLAG') ? 'warning' : 'info',
      created_at: e.created_at,
      reference_id: e.post_id,
    });
  }

  for (const r of reports.data ?? []) {
    const reporterRaw = r.reporter as unknown;
    const reporter = Array.isArray(reporterRaw) ? (reporterRaw[0] as { username: string } | undefined)?.username : (reporterRaw as { username: string } | null)?.username;
    const reportedRaw = r.reported as unknown;
    const reported = Array.isArray(reportedRaw) ? (reportedRaw[0] as { username: string } | undefined)?.username : (reportedRaw as { username: string } | null)?.username;
    feed.push({
      id: `report-${r.id}`,
      type: 'report',
      title: 'New Report',
      description: `@${reporter} reported @${reported} for ${r.reason}`,
      severity: 'warning',
      created_at: r.created_at,
      reference_id: r.id,
    });
  }

  for (const a of appeals.data ?? []) {
    const userRaw = a.user as unknown;
    const user = Array.isArray(userRaw) ? (userRaw[0] as { username: string } | undefined)?.username : (userRaw as { username: string } | null)?.username;
    feed.push({
      id: `appeal-${a.id}`,
      type: 'appeal',
      title: 'New Appeal',
      description: `@${user} appealed: "${(a.reason || '').slice(0, 80)}"`,
      severity: 'info',
      created_at: a.created_at,
      reference_id: a.id,
    });
  }

  // Sort by date descending
  feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter by type if specified
  const filtered = params.type ? feed.filter((item) => item.type === params.type) : feed;

  return filtered.slice(0, limit);
}
