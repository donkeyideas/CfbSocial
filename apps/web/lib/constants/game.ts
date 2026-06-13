/**
 * Single source of truth for the EA College Football video-game edition.
 *
 * Each year a new edition ships, bump GAME_YEAR (e.g. 27 -> 28) and every
 * title, schema, and CTA updates automatically. Prefer GAME.franchise
 * (year-less) in body copy so most text never goes stale; use GAME.name /
 * GAME.abbr only where the current-year keyword helps search (titles/keywords).
 */
export const GAME_YEAR = 27;

export const GAME = {
  /** Evergreen franchise name — never goes stale. Use this in most prose. */
  franchise: 'EA Sports College Football',
  /** Full current-edition name. */
  full: `EA Sports College Football ${GAME_YEAR}`,
  /** Current-edition short name. */
  name: `College Football ${GAME_YEAR}`,
  /** Current-edition abbreviation. */
  abbr: `CFB ${GAME_YEAR}`,
} as const;
