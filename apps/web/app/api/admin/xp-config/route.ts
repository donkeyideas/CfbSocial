import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const supabase = createAdminClient();

  const [{ data: xpConfig }, { data: levelThresholds }, { data: stats }] = await Promise.all([
    supabase.from('xp_config').select('*').order('sort_order'),
    supabase.from('level_thresholds').select('*').order('level'),
    supabase.from('profiles').select('xp, level, dynasty_tier'),
  ]);

  // Compute distribution stats
  const profiles = stats ?? [];
  const tierCounts: Record<string, number> = {};
  const levelCounts: Record<number, number> = {};
  let totalXp = 0;
  let maxXp = 0;

  for (const p of profiles) {
    const tier = (p as Record<string, unknown>).dynasty_tier as string || 'WALK_ON';
    const level = (p as Record<string, unknown>).level as number || 1;
    const xp = (p as Record<string, unknown>).xp as number || 0;
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    levelCounts[level] = (levelCounts[level] || 0) + 1;
    totalXp += xp;
    if (xp > maxXp) maxXp = xp;
  }

  return NextResponse.json({
    xpConfig: xpConfig ?? [],
    levelThresholds: levelThresholds ?? [],
    distribution: {
      totalUsers: profiles.length,
      tierCounts,
      levelCounts,
      avgXp: profiles.length > 0 ? Math.round(totalXp / profiles.length) : 0,
      maxXp,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const supabase = createAdminClient();
  const body = await req.json();
  const { action } = body;

  if (action === 'update_xp_config') {
    const { configs } = body as { configs: Array<{ source: string; xp_value: number; daily_cap: number | null; is_active: boolean }> };

    for (const cfg of configs) {
      await supabase
        .from('xp_config')
        .update({
          xp_value: cfg.xp_value,
          daily_cap: cfg.daily_cap,
          is_active: cfg.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('source', cfg.source);
    }

    return NextResponse.json({ success: true });
  }

  if (action === 'update_level_thresholds') {
    const { thresholds } = body as { thresholds: Array<{ level: number; min_xp: number; dynasty_tier: string }> };

    for (const t of thresholds) {
      await supabase
        .from('level_thresholds')
        .upsert({ level: t.level, min_xp: t.min_xp, dynasty_tier: t.dynasty_tier });
    }

    return NextResponse.json({ success: true });
  }

  if (action === 'recalculate_all') {
    // Recalculate all user XP from xp_log and update levels
    const { error } = await supabase.rpc('recalculate_all_xp');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
