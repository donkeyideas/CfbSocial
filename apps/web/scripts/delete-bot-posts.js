const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: bots } = await sb.from('profiles').select('id').eq('is_bot', true);
  if (!bots || bots.length === 0) { console.log('No bots found'); return; }
  const botIds = bots.map(b => b.id);
  console.log('Found', botIds.length, 'bots');

  // Delete all posts by bots
  const { data, error } = await sb.from('posts').delete().in('author_id', botIds).select('id');
  if (error) { console.log('Error:', error.message); return; }
  console.log('Deleted', data.length, 'bot posts');
})();
