/**
 * One-shot script to activate ALL bots and enable the global toggle.
 * Run: npx tsx apps/web/scripts/activate-bots.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zjaclcnjgumdgufoakio.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in your .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function activate() {
  console.log('=== Activating CFB Social Bot System ===\n');

  // Step 1: Set global toggle to active
  const { error: settingError } = await supabase
    .from('admin_settings')
    .upsert({ key: 'bots_global_active', value: 'true' }, { onConflict: 'key' });

  if (settingError) {
    console.error('Failed to set bots_global_active:', settingError.message);
  } else {
    console.log('[OK] bots_global_active = true');
  }

  // Step 2: Count current bot status
  const { count: totalBots } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_bot', true);

  const { count: activeBots } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_bot', true)
    .eq('bot_active', true);

  console.log(`\nBefore: ${activeBots}/${totalBots} bots active`);

  // Step 3: Activate all bots
  const { error: activateError, count: updatedCount } = await supabase
    .from('profiles')
    .update({ bot_active: true })
    .eq('is_bot', true)
    .eq('bot_active', false);

  if (activateError) {
    console.error('Failed to activate bots:', activateError.message);
  } else {
    console.log(`[OK] Activated ${updatedCount ?? 0} additional bots`);
  }

  // Step 4: Reset daily counters
  const { error: resetError } = await supabase
    .from('profiles')
    .update({ bot_post_count_today: 0 })
    .eq('is_bot', true);

  if (resetError) {
    console.error('Failed to reset counters:', resetError.message);
  } else {
    console.log('[OK] Reset all daily post counters');
  }

  // Step 5: Verify
  const { count: finalActive } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_bot', true)
    .eq('bot_active', true);

  console.log(`\nAfter: ${finalActive}/${totalBots} bots active`);

  // Step 6: Check env vars
  console.log('\n=== Environment Check ===');
  console.log(`DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? 'SET' : 'MISSING'}`);
  console.log(`CRON_SECRET: ${process.env.CRON_SECRET ? 'SET' : 'MISSING'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: SET`);

  console.log('\n=== Bot System Ready ===');
  console.log('Bots will start posting on the next cron cycle.');
  console.log('Trigger manually: GET /api/cron/bots with Authorization: Bearer <CRON_SECRET>');
}

activate().catch(console.error);
