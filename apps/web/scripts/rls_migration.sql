-- PROFILES: Allow insert for alt profiles (owner_id = auth.uid(), id can be anything)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- PROFILES: Allow update own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (owner_id = auth.uid());

-- PROFILES: Allow delete own alt profiles (but not primary)
CREATE POLICY "Users can delete own alt profiles" ON profiles
  FOR DELETE USING (owner_id = auth.uid() AND id != owner_id);

-- POSTS: author_id must be one of user's profiles
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (author_id IN (SELECT public.user_profile_ids()));

DROP POLICY IF EXISTS "Authors can update own posts" ON posts;
CREATE POLICY "Authors can update own posts" ON posts
  FOR UPDATE USING (author_id IN (SELECT public.user_profile_ids()));

DROP POLICY IF EXISTS "Authors can delete own posts" ON posts;
CREATE POLICY "Authors can delete own posts" ON posts
  FOR DELETE USING (author_id IN (SELECT public.user_profile_ids()));

DROP POLICY IF EXISTS "Published and flagged posts are readable" ON posts;
CREATE POLICY "Published and flagged posts are readable" ON posts
  FOR SELECT USING (
    status IN ('PUBLISHED', 'FLAGGED')
    OR author_id IN (SELECT public.user_profile_ids())
  );

-- REACTIONS
DROP POLICY IF EXISTS "Users can add reactions" ON reactions;
CREATE POLICY "Users can add reactions" ON reactions
  FOR INSERT WITH CHECK (user_id IN (SELECT public.user_profile_ids()));

DROP POLICY IF EXISTS "Users can remove own reactions" ON reactions;
CREATE POLICY "Users can remove own reactions" ON reactions
  FOR DELETE USING (user_id IN (SELECT public.user_profile_ids()));

-- BOOKMARKS
DROP POLICY IF EXISTS "Users can add bookmarks" ON bookmarks;
CREATE POLICY "Users can add bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (user_id IN (SELECT public.user_profile_ids()));

DROP POLICY IF EXISTS "Users can read own bookmarks" ON bookmarks;
CREATE POLICY "Users can read own bookmarks" ON bookmarks
  FOR SELECT USING (user_id IN (SELECT public.user_profile_ids()));

DROP POLICY IF EXISTS "Users can remove bookmarks" ON bookmarks;
CREATE POLICY "Users can remove bookmarks" ON bookmarks
  FOR DELETE USING (user_id IN (SELECT public.user_profile_ids()));

-- REPOSTS
DROP POLICY IF EXISTS "Users can create reposts" ON reposts;
CREATE POLICY "Users can create reposts" ON reposts
  FOR INSERT WITH CHECK (user_id IN (SELECT public.user_profile_ids()));

DROP POLICY IF EXISTS "Users can delete own reposts" ON reposts;
CREATE POLICY "Users can delete own reposts" ON reposts
  FOR DELETE USING (user_id IN (SELECT public.user_profile_ids()));

-- FOLLOWS
DROP POLICY IF EXISTS "Users can follow" ON follows;
CREATE POLICY "Users can follow" ON follows
  FOR INSERT WITH CHECK (follower_id IN (SELECT public.user_profile_ids()));

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE USING (follower_id IN (SELECT public.user_profile_ids()));

-- GAME THREAD MESSAGES
DROP POLICY IF EXISTS "Authenticated can send messages" ON game_thread_messages;
CREATE POLICY "Authenticated can send messages" ON game_thread_messages
  FOR INSERT WITH CHECK (user_id IN (SELECT public.user_profile_ids()));

-- MASCOT VOTES
DROP POLICY IF EXISTS "Authenticated can vote" ON mascot_votes;
CREATE POLICY "Authenticated can vote" ON mascot_votes
  FOR INSERT WITH CHECK (user_id IN (SELECT public.user_profile_ids()));

-- REPORTS
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (reporter_id IN (SELECT public.user_profile_ids()));

-- PREDICTIONS
DROP POLICY IF EXISTS "Users can create predictions" ON predictions;
CREATE POLICY "Users can create predictions" ON predictions
  FOR INSERT WITH CHECK (user_id IN (SELECT public.user_profile_ids()));

-- ROSTER CLAIMS
DROP POLICY IF EXISTS "Users can make claims" ON roster_claims;
CREATE POLICY "Users can make claims" ON roster_claims
  FOR INSERT WITH CHECK (user_id IN (SELECT public.user_profile_ids()));
