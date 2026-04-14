/**
 * Shared constants for the mobile app.
 */

/** ESPN College Football Scoreboard API base URL */
export const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

/** Default query limit for unbounded list queries */
export const DEFAULT_QUERY_LIMIT = 50;

/** Aging take period in days */
export const AGING_PERIOD_DAYS = 30;

/** Live scoreboard refresh interval (ms) */
export const SCORE_REFRESH_MS = 30_000;

/** War room / scores banner refresh interval (ms) */
export const GAMES_REFRESH_MS = 60_000;

/** Maximum character count for posts */
export const MAX_POST_CHARS = 3000;

/** Web app API base URL for news feeds and article scraping */
export const WEB_API_URL = 'https://www.cfbsocial.com';

/** News feed refresh interval (ms) */
export const NEWS_REFRESH_MS = 10 * 60 * 1000; // 10 minutes
