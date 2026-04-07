const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await sb
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, school_id, dynasty_tier),
      school:schools!posts_school_id_fkey(id, name, abbreviation, primary_color, secondary_color, logo_url, slug),
      aging_takes(id, user_id, revisit_date, is_surfaced, community_verdict)
    `)
    .in('status', ['PUBLISHED', 'FLAGGED'])
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('ERROR:', error.message);
    console.log('Code:', error.code);
    console.log('Details:', error.details);
    console.log('Hint:', error.hint);
  } else {
    console.log('Success! Got', data.length, 'posts');
    if (data[0]) {
      console.log('First post:', data[0].content?.slice(0, 80));
      console.log('Author:', data[0].author?.username);
      console.log('School:', data[0].school?.abbreviation);
    }
  }
})();
