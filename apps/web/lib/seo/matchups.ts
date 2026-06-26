/**
 * Programmatic rivalry / matchup hub helpers.
 *
 * A matchup page lives at /matchup/{slugA}-vs-{slugB}. To avoid duplicate
 * content the URL is always canonicalised to alphabetical slug order, so each
 * pair has exactly one indexable URL.
 *
 * Two tiers of pages:
 *   - CURATED rivalries (below): always pre-rendered + indexed + in the sitemap.
 *     These target high-intent evergreen queries ("Iron Bowl", "Red River
 *     Rivalry", "Ohio State vs Michigan all-time record").
 *   - AUTO-GROW pages: any other valid school pair renders on demand (ISR) and
 *     only becomes indexable once it has accumulated real aggregated content.
 *     They are discovered through internal links from the school hubs, not the
 *     sitemap, so we never ship thousands of empty templated pages.
 *
 * All slugs below are verified against the live `schools` table.
 */

export interface CuratedRivalry {
  /** school slug */
  a: string;
  /** school slug */
  b: string;
  /** Optional well-known name for the series. */
  name?: string;
}

/**
 * Famous rivalries with confirmed slugs. Only names we're confident about are
 * set; the rest fall back to "{A} vs {B} Rivalry" in copy. Conference shown is
 * post-realignment (e.g. Texas/Oklahoma are SEC, Oregon/USC are Big Ten).
 */
export const CURATED_RIVALRIES: CuratedRivalry[] = [
  { a: 'alabama', b: 'auburn', name: 'The Iron Bowl' },
  { a: 'ohio-state', b: 'michigan', name: 'The Game' },
  { a: 'texas', b: 'oklahoma', name: 'The Red River Rivalry' },
  { a: 'georgia', b: 'florida', name: "The World's Largest Outdoor Cocktail Party" },
  { a: 'georgia', b: 'auburn', name: "The Deep South's Oldest Rivalry" },
  { a: 'oklahoma', b: 'oklahoma-state', name: 'Bedlam' },
  { a: 'georgia', b: 'georgia-tech', name: 'Clean, Old-Fashioned Hate' },
  { a: 'washington', b: 'washington-state', name: 'The Apple Cup' },
  { a: 'texas', b: 'texas-am', name: 'The Lone Star Showdown' },
  { a: 'florida', b: 'florida-state', name: 'The Sunshine Showdown' },
  { a: 'usc', b: 'notre-dame', name: 'The Jeweled Shillelagh' },
  { a: 'michigan', b: 'michigan-state' },
  { a: 'oregon', b: 'oregon-state' },
  { a: 'oregon', b: 'washington' },
  { a: 'alabama', b: 'lsu' },
  { a: 'florida', b: 'lsu' },
  { a: 'auburn', b: 'lsu' },
  { a: 'clemson', b: 'florida-state' },
  { a: 'texas', b: 'texas-tech' },
  { a: 'ohio-state', b: 'oregon' },
];

export interface MatchupSchool {
  id: string;
  name: string;
  slug: string;
  conference: string;
  mascot: string | null;
  state?: string | null;
  is_fbs?: boolean | null;
}

/** Canonical (alphabetical) slug for a pair, used for the URL + dedupe. */
export function matchupSlug(slugA: string, slugB: string): string {
  return [slugA, slugB].sort().join('-vs-');
}

/** Parse a matchup slug into its two school slugs, or null if malformed. */
export function parseMatchupSlug(slug: string): [string, string] | null {
  const idx = slug.indexOf('-vs-');
  if (idx === -1) return null;
  const a = slug.slice(0, idx);
  const b = slug.slice(idx + 4);
  if (!a || !b || a === b) return null;
  return [a, b];
}

/** True if this pair is one of the hand-curated marquee rivalries. */
export function findCuratedRivalry(slugA: string, slugB: string): CuratedRivalry | undefined {
  const canon = matchupSlug(slugA, slugB);
  return CURATED_RIVALRIES.find((r) => matchupSlug(r.a, r.b) === canon);
}

/** generateStaticParams source — every curated pair, canonicalised + deduped. */
export function curatedMatchupSlugs(): string[] {
  return Array.from(new Set(CURATED_RIVALRIES.map((r) => matchupSlug(r.a, r.b))));
}

/**
 * Unique evergreen intro copy (150-300 words) built from the two schools' real
 * data, so no two matchup pages read the same. Returns paragraphs.
 */
export function matchupIntro(a: MatchupSchool, b: MatchupSchool, rivalry?: CuratedRivalry): string[] {
  const aName = a.name;
  const bName = b.name;
  const sameConf = a.conference === b.conference;
  const sameState = !!a.state && a.state === b.state;
  const seriesName = rivalry?.name;

  const lead = seriesName
    ? `${seriesName} is one of college football's signature rivalries, pitting ${aName} against ${bName}. Few matchups carry the history, the bragging rights, and the sheer fan venom that this one does.`
    : `${aName} vs ${bName} is the kind of college football matchup that splits living rooms and group chats. Whenever these two meet, the records get thrown out and the only thing that matters is who walks away with the bragging rights.`;

  const context = sameConf
    ? `Both programs call the ${a.conference} home, so this isn't just pride on the line — it's conference standing, head-to-head tiebreakers, and a direct say in who plays for a title. ${sameState ? `As in-state ${a.state} rivals, the recruiting battles run year-round, long before kickoff.` : `Every recruiting cycle, every transfer-portal swing, and every Saturday result feeds the same argument.`}`
    : `${aName} (${a.conference}) and ${bName} (${b.conference}) come from different corners of the sport, which is exactly why this matchup travels. ${sameState ? `Both flying the ${a.state} flag, it's a state-pride showdown that doesn't need a conference banner to mean everything.` : `It's the kind of non-conference grudge that fans circle the moment the schedule drops.`}`;

  const mascots = a.mascot && b.mascot
    ? `When the ${a.mascot} face the ${b.mascot}, the debate is never settled for long — last year's result just sets up next year's argument.`
    : `The result never settles anything for long — it just sets up next year's argument.`;

  const cta = `Below, ${aName} and ${bName} fans make their cases in real time. Stake your claim, drop your prediction, and talk your trash before kickoff.`;

  return [lead, `${context} ${mascots}`, cta];
}
