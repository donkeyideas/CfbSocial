-- =============================================================================
-- CFBSocial Achievement Definitions
-- All achievements use football-themed names and descriptions
-- =============================================================================

-- Truncate existing achievements (safe for re-seeding)
TRUNCATE TABLE achievements CASCADE;

INSERT INTO achievements (slug, name, description, icon, category, xp_reward, requirement_type, requirement_value) VALUES

-- =============================================================================
-- SOCIAL Achievements — Posts
-- =============================================================================
('first-post', 'First Down', 'Create your first post', 'football', 'SOCIAL', 25, 'post_count', 1),
('ten-posts', 'Drive Leader', 'Create 10 posts and keep the chains moving', 'trophy', 'SOCIAL', 100, 'post_count', 10),
('twenty-five-posts', 'Play Caller', 'Create 25 posts and run the offense', 'clipboard', 'SOCIAL', 150, 'post_count', 25),
('fifty-posts', 'Offensive Coordinator', 'Create 50 posts and call the plays', 'clipboard', 'SOCIAL', 250, 'post_count', 50),
('hundred-posts', 'Quarterback', 'Create 100 posts and lead the offense', 'star', 'SOCIAL', 500, 'post_count', 100),
('two-fifty-posts', 'Head Coach', 'Create 250 posts and build a program', 'whistle', 'SOCIAL', 750, 'post_count', 250),
('five-hundred-posts', 'Program Builder', 'Create 500 posts and establish a dynasty', 'stadium', 'SOCIAL', 1000, 'post_count', 500),
('thousand-posts', 'Blue Blood', 'Create 1,000 posts and join the elite programs', 'crown', 'SOCIAL', 1500, 'post_count', 1000),

-- =============================================================================
-- SOCIAL Achievements — Touchdowns Received
-- =============================================================================
('first-td-received', 'First Touchdown', 'Receive your first TD on a post', 'football', 'SOCIAL', 25, 'td_received_count', 1),
('ten-tds-received', 'Red Zone Threat', 'Receive 10 TDs across your posts', 'target', 'SOCIAL', 50, 'td_received_count', 10),
('twenty-five-tds', 'Scoring Drive', 'Receive 25 TDs across your posts', 'lightning', 'SOCIAL', 100, 'td_received_count', 25),
('fifty-tds-received', 'End Zone Regular', 'Receive 50 TDs across your posts', 'flame', 'SOCIAL', 200, 'td_received_count', 50),
('hundred-tds-received', 'Touchdown Machine', 'Receive 100 TDs across your posts', 'fire', 'SOCIAL', 500, 'td_received_count', 100),
('two-fifty-tds', 'Heisman Highlight', 'Receive 250 TDs across your posts', 'highlight', 'SOCIAL', 750, 'td_received_count', 250),
('five-hundred-tds', 'All-Time Great', 'Receive 500 TDs across your posts', 'statue', 'SOCIAL', 1000, 'td_received_count', 500),
('thousand-tds', 'Record Breaker', 'Receive 1,000 TDs and rewrite the record books', 'record', 'SOCIAL', 1500, 'td_received_count', 1000),

-- =============================================================================
-- SOCIAL Achievements — Followers
-- =============================================================================
('five-followers', 'Walk-On Squad', 'Gain 5 followers', 'people', 'SOCIAL', 50, 'follower_count', 5),
('ten-followers', 'Scholarship Offer', 'Gain 10 followers', 'letter', 'SOCIAL', 100, 'follower_count', 10),
('twenty-five-followers', 'Five-Star Recruit', 'Gain 25 followers', 'star', 'SOCIAL', 200, 'follower_count', 25),
('fifty-followers', 'Fan Favorite', 'Gain 50 followers and build your fanbase', 'megaphone', 'SOCIAL', 400, 'follower_count', 50),
('hundred-followers', 'Program Legend', 'Gain 100 followers and become a household name', 'monument', 'SOCIAL', 750, 'follower_count', 100),
('two-fifty-followers', 'National Brand', 'Gain 250 followers and go nationwide', 'broadcast', 'SOCIAL', 1000, 'follower_count', 250),

-- =============================================================================
-- PREDICTION Achievements
-- =============================================================================
('first-prediction', 'Coin Toss', 'Make your first game prediction', 'coin', 'PREDICTION', 25, 'prediction_count', 1),
('five-predictions', 'Pregame Show', 'Make 5 predictions', 'mic', 'PREDICTION', 75, 'prediction_count', 5),
('twenty-five-predictions', 'Studio Analyst', 'Make 25 predictions from the desk', 'desk', 'PREDICTION', 200, 'prediction_count', 25),
('fifty-predictions', 'Oddsmaker', 'Make 50 predictions and set the line', 'chart', 'PREDICTION', 400, 'prediction_count', 50),
('hundred-predictions', 'Vegas Insider', 'Make 100 predictions', 'dice', 'PREDICTION', 750, 'prediction_count', 100),
('three-correct-predictions', 'Winning Record', 'Get 3 predictions correct', 'check', 'PREDICTION', 75, 'correct_prediction_count', 3),
('five-correct-predictions', 'Sharp Bettor', 'Get 5 predictions correct', 'chart', 'PREDICTION', 150, 'correct_prediction_count', 5),
('ten-correct-predictions', 'Oracle of the Gridiron', 'Get 10 predictions correct', 'crystal-ball', 'PREDICTION', 300, 'correct_prediction_count', 10),
('twenty-five-correct', 'Nostradamus', 'Get 25 predictions correct and see the future', 'eye', 'PREDICTION', 500, 'correct_prediction_count', 25),
('fifty-correct', 'Crystal Ball', 'Get 50 predictions correct', 'orb', 'PREDICTION', 1000, 'correct_prediction_count', 50),
('first-receipt-verified', 'Receipt Keeper', 'Have your first prediction receipt verified', 'receipt', 'PREDICTION', 50, 'receipt_verified_count', 1),
('five-receipts', 'Filing Cabinet', 'Have 5 prediction receipts verified', 'folder', 'PREDICTION', 200, 'receipt_verified_count', 5),
('ten-receipts', 'Receipt Hoarder', 'Have 10 prediction receipts verified', 'archive', 'PREDICTION', 400, 'receipt_verified_count', 10),

-- =============================================================================
-- RIVALRY Achievements
-- =============================================================================
('first-rivalry-vote', 'Pick a Side', 'Cast your first rivalry vote', 'versus', 'RIVALRY', 25, 'rivalry_vote_count', 1),
('ten-rivalry-votes', 'Conference Loyalist', 'Cast 10 rivalry votes', 'shield', 'RIVALRY', 100, 'rivalry_vote_count', 10),
('twenty-five-rivalry-votes', 'Rivalry Week Regular', 'Cast 25 rivalry votes', 'calendar', 'RIVALRY', 200, 'rivalry_vote_count', 25),
('fifty-rivalry-votes', 'Iron Bowl Veteran', 'Cast 50 rivalry votes across every matchup', 'iron', 'RIVALRY', 400, 'rivalry_vote_count', 50),
('hundred-rivalry-votes', 'Rivalry Historian', 'Cast 100 rivalry votes', 'book', 'RIVALRY', 750, 'rivalry_vote_count', 100),
('enter-the-ring', 'Enter the Ring', 'Participate in your first rivalry matchup', 'ring', 'RIVALRY', 50, 'rivalry_participation_count', 1),
('ten-rivalry-participations', 'Ring General', 'Participate in 10 rivalry matchups', 'boxing', 'RIVALRY', 200, 'rivalry_participation_count', 10),
('first-challenge-won', 'Upset Special', 'Win your first rivalry challenge', 'medal', 'RIVALRY', 100, 'challenge_win_count', 1),
('five-challenges-won', 'Rivalry Dominator', 'Win 5 rivalry challenges', 'crown', 'RIVALRY', 300, 'challenge_win_count', 5),
('ten-challenges-won', 'Dynasty Defender', 'Win 10 rivalry challenges and protect the throne', 'castle', 'RIVALRY', 500, 'challenge_win_count', 10),
('twenty-five-challenges-won', 'Conference Kingpin', 'Win 25 rivalry challenges and own the conference', 'scepter', 'RIVALRY', 1000, 'challenge_win_count', 25),

-- =============================================================================
-- RECRUITING Achievements
-- =============================================================================
('first-portal-claim', 'Transfer Portal Scout', 'Make your first transfer portal claim', 'magnifying-glass', 'RECRUITING', 25, 'portal_claim_count', 1),
('five-portal-claims', 'Recruiting Trail', 'Make 5 transfer portal claims', 'map', 'RECRUITING', 75, 'portal_claim_count', 5),
('twenty-five-portal-claims', 'National Recruiter', 'Make 25 transfer portal claims', 'plane', 'RECRUITING', 250, 'portal_claim_count', 25),
('correct-portal-claim', 'Good Eye', 'Get a transfer portal prediction correct', 'eye', 'RECRUITING', 75, 'correct_portal_count', 1),
('five-correct-claims', 'Recruiting Coordinator', 'Get 5 transfer portal predictions correct', 'clipboard', 'RECRUITING', 250, 'correct_portal_count', 5),
('scout-master', 'Scout Master', 'Get 10 transfer portal predictions correct', 'binoculars', 'RECRUITING', 500, 'correct_portal_count', 10),
('twenty-five-correct-claims', 'GM of the Year', 'Get 25 transfer portal predictions correct', 'briefcase', 'RECRUITING', 1000, 'correct_portal_count', 25),

-- =============================================================================
-- ENGAGEMENT Achievements
-- =============================================================================
('first-fact-check', 'Film Room Analyst', 'Submit your first fact check on a post', 'film', 'ENGAGEMENT', 25, 'fact_check_count', 1),
('five-fact-checks', 'Film Study', 'Submit 5 fact checks', 'projector', 'ENGAGEMENT', 100, 'fact_check_count', 5),
('ten-fact-checks', 'Tape Junkie', 'Submit 10 fact checks and break down the film', 'reel', 'ENGAGEMENT', 250, 'fact_check_count', 10),
('first-challenge-issued', 'Throw the Flag', 'Issue your first challenge to another user', 'flag', 'ENGAGEMENT', 25, 'challenge_issued_count', 1),
('five-challenges-issued', 'Penalty Enforcer', 'Issue 5 challenges', 'whistle', 'ENGAGEMENT', 100, 'challenge_issued_count', 5),
('ten-challenges-issued', 'Rules Committee', 'Issue 10 challenges and enforce the rules', 'gavel', 'ENGAGEMENT', 250, 'challenge_issued_count', 10),
('aging-take-creator', 'Aging Like Fine Wine', 'Create a take that gets revisited', 'wine', 'ENGAGEMENT', 100, 'aging_take_count', 1),
('five-aging-takes', 'Wine Cellar', 'Create 5 aging takes', 'barrel', 'ENGAGEMENT', 200, 'aging_take_count', 5),
('ten-aging-takes', 'Vintage Collection', 'Create 10 aging takes and build a vintage collection', 'collection', 'ENGAGEMENT', 400, 'aging_take_count', 10),

-- =============================================================================
-- MILESTONE Achievements (Level & Tier-based)
-- =============================================================================
('level-3', 'Scholarship Player', 'Reach Level 3', 'jersey', 'MILESTONE', 50, 'level', 3),
('level-5', 'Varsity Letter', 'Reach Level 5', 'badge', 'MILESTONE', 100, 'level', 5),
('level-7', 'Starting Lineup', 'Reach Level 7', 'lineup', 'MILESTONE', 150, 'level', 7),
('level-10', 'Team Captain', 'Reach Level 10', 'captain', 'MILESTONE', 250, 'level', 10),
('level-15', 'Conference Champion', 'Reach Level 15', 'trophy', 'MILESTONE', 400, 'level', 15),
('level-20', 'National Champion', 'Reach Level 20', 'championship', 'MILESTONE', 600, 'level', 20),
('all-conference-tier', 'All-Conference', 'Reach the All-Conference tier', 'ribbon', 'MILESTONE', 300, 'tier', 1),
('all-american-tier', 'All-American', 'Reach the All-American tier', 'shield', 'MILESTONE', 500, 'tier', 2),
('heisman-tier', 'Heisman Contender', 'Reach the Heisman tier', 'heisman', 'MILESTONE', 750, 'tier', 3),
('hall-of-fame-tier', 'Hall of Famer', 'Reach the Hall of Fame tier', 'hall-of-fame', 'MILESTONE', 1000, 'tier', 4);
