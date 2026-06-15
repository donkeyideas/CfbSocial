// ============================================================
// @cfb-social/api - Central exports
// ============================================================

// Client factories
export { createBrowserClient, createServerClient, createServiceClient } from './client';
export type { SupabaseClient } from './client';

// Queries
export { getSchools, getSchoolBySlug, getSchoolById, searchSchools } from './queries/schools';
export { getProfile, getProfileByUsername, searchProfiles, getLeaderboard } from './queries/profiles';
export { getFeed, getPost, getPostReplies, getUserPosts, searchPosts } from './queries/posts';
export { getRivalries, getFeaturedRivalry, getRivalryById } from './queries/rivalries';
export { getChallenges, getChallengeById, getUserChallenges } from './queries/challenges';
export { getPortalPlayers, getPortalPlayer, getPlayerClaims } from './queries/portal';
export { getPredictions, getPredictionById, getUserPredictions, getPredictionLeaderboard } from './queries/predictions';
export { getFlaggedPosts, getPostModerationEvents, getPendingReports, getPendingAppeals, getUserModerationHistory } from './queries/moderation';
export { getAchievements, getUserAchievements, getXPLog, getDynastyProfile, getDynastyLeaderboard } from './queries/dynasty';
export { getNotifications, getUnreadNotificationCount, getNotificationPreferences } from './queries/notifications';
export { getGameThreads, getGameThread, getGameThreadMessages } from './queries/games';
export { getActiveBracket, getBracketById, getBracketMatchups, getUserMascotVotes } from './queries/mascot-wars';
export { getRecruitingStats } from './queries/recruiting';
export type { RecruitingSchoolStats } from './queries/recruiting';
export { getMoments, getMomentByPostId, getSaves, getLeagues, getLeagueById, getLeagueRequests, getLatestIssue, getUserIssues, getOwnerIssues, getIssueByFeedPost, getPublicIssues, getPublicIssueById, getCommissionerRequests, getMyLeagueIds } from './queries/game-room';

// Mutations
export { signUp, signIn, signInWithOAuth, signOut, resetPassword } from './mutations/auth';
export { createPost, updatePost, deletePost, reactToPost, removeReaction, repost, bookmark, removeBookmark } from './mutations/posts';
export { updateProfile, selectSchool, uploadAvatar } from './mutations/profiles';
export { followUser, unfollowUser, blockUser, unblockUser } from './mutations/follows';
export { voteOnRivalry, submitRivalryTake } from './mutations/rivalries';
export { claimPlayer } from './mutations/portal';
export { createChallenge, respondToChallenge, voteOnChallenge, resolveChallenge } from './mutations/challenges';
export { createPrediction } from './mutations/predictions';
export { markForAging, voteOnAgingTake } from './mutations/aging-takes';
export { reportPost, appealPost, restorePost, removePost, dismissReport, actionReport, approveAppeal, denyAppeal } from './mutations/moderation';
export { awardXP, unlockAchievement } from './mutations/dynasty';
export { markNotificationRead, markAllNotificationsRead, createNotification, updateNotificationPreferences } from './mutations/notifications';
export { findOrCreateGameThread, sendGameMessage, updateGameScore } from './mutations/games';
export { voteOnMascotMatchup, advanceBracketRound } from './mutations/mascot-wars';
export { createMoment, updateMoment, createSave, createLeague, requestSlot, approveRequest, declineRequest, shareIssueToFeed, assignMomentToIssue, saveIssueSettings, deleteIssue, resolveLeagueRequest } from './mutations/game-room';

// Constants
export { XP_VALUES } from './constants/xp';
export type { XPAction } from './constants/xp';
export { ACHIEVEMENTS } from './constants/achievements';
export type { AchievementDef } from './constants/achievements';

// Hooks (client-side only)
export { useSession } from './hooks/use-session';
export { useRealtimeFeed, useRealtimeNotifications, useRealtimeGameChat } from './hooks/use-realtime';

// Realtime (non-React)
export { subscribeFeed, subscribeNotifications, subscribePresence } from './realtime';
