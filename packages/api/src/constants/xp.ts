// ============================================================
// XP Values for each action type
// Single-digit values with daily caps to ensure slow progression.
// Level 21 (max) should take ~4 years of active daily play.
// Server-side award_xp() function enforces these values and caps.
// ============================================================

export const XP_VALUES = {
  POST_CREATED: 2,
  TOUCHDOWN_RECEIVED: 1,
  CHALLENGE_WON: 15,
  PREDICTION_CORRECT: 10,
  PORTAL_CLAIM_CORRECT: 12,
  RIVALRY_PARTICIPATION: 3,
  FACT_CHECK: 4,
  ACHIEVEMENT_UNLOCKED: 0, // varies per achievement (5-50 range)
  DAILY_LOGIN: 2,
  STREAK_BONUS: 3,
  RECEIPT_VERIFIED: 8,
  AGING_TAKE_CORRECT: 5,
  REFERRAL_ACTIVATED: 5,
} as const;

// Daily XP caps per source (prevents spam)
export const DAILY_XP_CAPS: Partial<Record<XPAction, number>> = {
  POST_CREATED: 10,        // 5 posts/day max
  TOUCHDOWN_RECEIVED: 15,  // 15 TDs/day max
  RIVALRY_PARTICIPATION: 6, // 2 votes/day max
  FACT_CHECK: 8,            // 2 fact checks/day max
};

export type XPAction = keyof typeof XP_VALUES;
