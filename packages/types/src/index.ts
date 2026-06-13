// ============================================================
// @cfb-social/types - Central type exports
// ============================================================

// Database (generated from Supabase)
export type { Database } from './database';

// Enums
export {
  UserRole,
  UserStatus,
  PostType,
  PostStatus,
  ReactionType,
  DynastyTier,
  ChallengeStatus,
  PortalPlayerStatus,
  PredictionResult,
  ModerationAction,
  ReportReason,
  ReportStatus,
  AppealStatus,
  NotificationType,
  AchievementCategory,
  XPSource,
  LeaderboardPeriod,
} from './enums';

// School
export type { School, SchoolRow } from './school';
export { toSchool } from './school';

// User / Profile
export type { Profile, ProfileRow, UserSession, PublicProfile } from './user';
export { toProfile, toPublicProfile } from './user';

// Post
export type { Post, PostRow, Reaction, ReactionRow, Repost, RepostRow, Bookmark, BookmarkRow, CreatePostInput, FeedFilters } from './post';
export { CreatePostInputSchema, toPost } from './post';

// Rivalry & Challenges
export type { Rivalry, RivalryRow, RivalryVote, RivalryVoteRow, RivalryTake, RivalryTakeRow, Challenge, ChallengeRow, ChallengeVote, ChallengeVoteRow, FactCheck, FactCheckRow } from './rivalry';
export { toRivalry, toChallenge } from './rivalry';

// Portal & Predictions
export type { PortalPlayer, PortalPlayerRow, RosterClaim, RosterClaimRow, Prediction, PredictionRow, AgingTake, AgingTakeRow } from './portal';
export { toPortalPlayer, toRosterClaim, toPrediction } from './portal';

// Moderation
export type { ModerationEvent, ModerationEventRow, Report, ReportRow, Appeal, AppealRow, ModerationResult } from './moderation';

// Dynasty / Gamification
export type { Achievement, AchievementRow, UserAchievement, UserAchievementRow, XPLogEntry, XPLogEntryRow, LeaderboardEntry, LeaderboardEntryRow, DynastyProgress } from './dynasty';
export { XP_THRESHOLDS, getTierForLevel, getXPToNextLevel, getLevelProgress } from './dynasty';

// Notifications
export type { Notification, NotificationRow, NotificationPreferences, NotificationPreferencesRow } from './notification';
export { toNotification, toNotificationPreferences } from './notification';

// Analytics
export type { AnalyticsEvent, AnalyticsEventRow, DailyStats, DailyStatsRow, APIPerformanceLog, APIPerformanceLogRow, DashboardOverview } from './analytics';

// Referrals
export type { ReferralTier, ReferralRow } from './referral';
export { REFERRAL_CHAR_TIERS, getCharLimitForReferrals, getReferralTier, getNextReferralTier } from './referral';

// Game Room — Moments, Dynasty Saves, Online Leagues
export type {
  GameMomentRow, DynastySaveRow, OnlineLeagueRow, LeagueMemberRow, LeagueRequestRow,
  CreateMomentInput, CreateLeagueInput, RequestSlotInput,
} from './game-room';
export { CreateMomentInputSchema, CreateLeagueInputSchema, RequestSlotInputSchema } from './game-room';
