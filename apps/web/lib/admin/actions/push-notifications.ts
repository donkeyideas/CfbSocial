import { createAdminClient } from '@/lib/admin/supabase/admin';

// ============================================================
// Push Notification Admin Actions
// ============================================================

export interface PushLogEntry {
  id: string;
  notification_id: string | null;
  system_notification_id: string | null;
  user_id: string;
  device_token: string;
  platform: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  recipient?: { username: string | null; display_name: string | null } | null;
  notification_type?: string | null;
}

export interface SystemNotificationEntry {
  id: string;
  title: string;
  body: string;
  target_audience: string;
  target_id: string | null;
  created_by: string;
  sent_count: number;
  failed_count: number;
  read_count: number;
  status: string;
  created_at: string;
  sent_at: string | null;
  creator?: { username: string | null; display_name: string | null } | null;
}

export interface PushStats {
  totalSentToday: number;
  totalFailedToday: number;
  deliveryRate: number;
  activeDevices: number;
  totalSystemNotifications: number;
}

/**
 * Get push notification log with pagination and filters
 */
export async function getPushNotificationLog(params: {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  type?: string;
}): Promise<{ data: PushLogEntry[]; total: number }> {
  const supabase = createAdminClient();
  const page = params.page ?? 1;
  const limit = params.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('push_notification_log')
    .select(`
      *,
      recipient:profiles!push_notification_log_user_id_fkey(username, display_name),
      notification:notifications!push_notification_log_notification_id_fkey(id, type)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.platform) {
    query = query.eq('platform', params.platform);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('[Push Log] Error:', error);
    return { data: [], total: 0 };
  }

  // Enrich with joined data (single query, no N+1)
  const enriched: PushLogEntry[] = (data ?? []).map((entry) => {
    const recipientRaw = entry.recipient as unknown;
    const recipient = Array.isArray(recipientRaw) ? recipientRaw[0] : recipientRaw;
    const notifRaw = (entry as Record<string, unknown>).notification as { type: string } | null;
    const notifType = notifRaw?.type ?? null;
    return {
      ...entry,
      recipient: recipient as PushLogEntry['recipient'],
      notification_type: notifType,
    };
  });

  return { data: enriched, total: count ?? 0 };
}

/**
 * Get system notifications with pagination
 */
export async function getSystemNotifications(params: {
  page?: number;
  limit?: number;
}): Promise<{ data: SystemNotificationEntry[]; total: number }> {
  const supabase = createAdminClient();
  const page = params.page ?? 1;
  const limit = params.limit ?? 25;
  const offset = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from('system_notifications')
    .select(`
      *,
      creator:profiles!system_notifications_created_by_fkey(username, display_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[System Notifications] Error:', error);
    return { data: [], total: 0 };
  }

  const enriched: SystemNotificationEntry[] = (data ?? []).map((entry) => {
    const creatorRaw = entry.creator as unknown;
    const creator = Array.isArray(creatorRaw) ? creatorRaw[0] : creatorRaw;
    return {
      ...entry,
      creator: creator as SystemNotificationEntry['creator'],
    };
  });

  return { data: enriched, total: count ?? 0 };
}

/**
 * Get push notification stats
 */
export async function getPushStats(): Promise<PushStats> {
  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [sentToday, failedToday, activeDevices, systemNotifs] = await Promise.all([
    supabase
      .from('push_notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', todayISO),
    supabase
      .from('push_notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', todayISO),
    supabase
      .from('device_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('system_notifications')
      .select('*', { count: 'exact', head: true }),
  ]);

  const totalSent = sentToday.count ?? 0;
  const totalFailed = failedToday.count ?? 0;
  const total = totalSent + totalFailed;

  return {
    totalSentToday: totalSent,
    totalFailedToday: totalFailed,
    deliveryRate: total > 0 ? Math.round((totalSent / total) * 100) : 100,
    activeDevices: activeDevices.count ?? 0,
    totalSystemNotifications: systemNotifs.count ?? 0,
  };
}

/**
 * Get all schools (for compose audience picker)
 */
export async function getSchoolsForPicker(): Promise<{ id: string; name: string; conference: string | null }[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('schools')
    .select('id, name, conference')
    .order('name');
  return data ?? [];
}

/**
 * Get unique conferences for picker
 */
export async function getConferences(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('schools')
    .select('conference')
    .not('conference', 'is', null)
    .order('conference');

  const unique = [...new Set((data ?? []).map((s) => s.conference).filter(Boolean))] as string[];
  return unique;
}
