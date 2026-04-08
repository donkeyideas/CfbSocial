// ============================================================
// Bot Content Humanizer
// Post-processing pipeline that makes AI output sound like a real person
// ============================================================

import type { BotPersonality } from './personalities';

interface HumanizerProfile {
  bot_region: string | null;
  bot_age_bracket: string | null;
  bot_mood: number | null;
  schoolName?: string;
  mascotName?: string;
}

// ============================================================
// Extended AI-speak removal
// ============================================================

const AI_SPEAK_PATTERNS = [
  /^as a (?:fan|supporter|follower|student|alum|alumni) of\s+/i,
  /^in my (?:honest )?opinion[,.]?\s*/i,
  /^it[''\u2019]s worth noting (?:that\s+)?/i,
  /^at the end of the day[,.]?\s*/i,
  /^that being said[,.]?\s*/i,
  /^i believe (?:that\s+)?/i,
  /^i think (?:that\s+)?/i,
  /^i feel like\s+/i,
  /^personally[,.]?\s*/i,
  /^if you ask me[,.]?\s*/i,
  /^one could argue (?:that\s+)?/i,
  /^it[''\u2019]s important to (?:consider|note|remember) (?:that\s+)?/i,
  /^from (?:a|my) (?:fan|football|sports) perspective[,.]?\s*/i,
  /^as (?:someone|a person) who\s+/i,
  /^to be (?:fair|honest)[,.]?\s*/i,
  /^you know what[,.]?\s*/i,
  /^i mean[,.]?\s*/i,
  // DeepSeek throat-clear patterns
  /^seeing\s+(?:the|how|what|this|that)\s+/i,
  /^hearing\s+(?:the|about|that|this)\s+/i,
  /^looking at\s+(?:the|this|how)\s+/i,
  /^the (?:reality|truth|fact) is[,:]?\s*/i,
  /^what (?:people|fans|everyone) (?:don[''\u2019]t|do not|need to)\s+/i,
  /^given (?:the|that|how)\s+/i,
  /^in light of\s+/i,
  /^with (?:the|all|that) (?:recent|being|said)\s+/i,
];

function stripAiSpeak(text: string): string {
  let result = text;
  for (const pattern of AI_SPEAK_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

// ============================================================
// Pronoun enforcement
// ============================================================

function enforcePronounStyle(
  text: string,
  style: BotPersonality['pronounStyle'],
  schoolName: string,
  mascotName: string
): string {
  if (style === 'we_us') {
    // Replace third-person school references with first-person
    const schoolPattern = new RegExp(`\\b${escapeRegex(schoolName)}\\s+(should|needs?|has|have|is|are|was|were|will|can|could|must|might)\\b`, 'gi');
    text = text.replace(schoolPattern, (_, verb) => `We ${verb.toLowerCase()}`);

    const mascotPattern = new RegExp(`\\bThe\\s+${escapeRegex(mascotName)}\\s+(should|need|has|have|is|are|was|were|will|can|could|must|might)\\b`, 'gi');
    text = text.replace(mascotPattern, (_, verb) => `We ${verb.toLowerCase()}`);
  } else if (style === 'they_them') {
    // Replace first-person with school name
    text = text.replace(/\bwe (should|need|have|has|are|were|will|can|could|must|might)\b/gi, (_, verb) => `${schoolName} ${verb.toLowerCase()}`);
    text = text.replace(/\bour (team|offense|defense|secondary|O-line|D-line|roster|coaching|staff|season|schedule|program)\b/gi, (_, noun) => `${schoolName}'s ${noun.toLowerCase()}`);
  }
  return text;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// Typo injection
// ============================================================

const TYPO_TRANSFORMS: ((word: string) => string)[] = [
  // Double letter
  (w) => {
    const i = Math.floor(Math.random() * (w.length - 1)) + 1;
    return w.slice(0, i) + w[i - 1] + w.slice(i);
  },
  // Transposition
  (w) => {
    const i = Math.floor(Math.random() * (w.length - 2)) + 1;
    return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
  },
  // Missing letter
  (w) => {
    const i = Math.floor(Math.random() * (w.length - 2)) + 1;
    return w.slice(0, i) + w.slice(i + 1);
  },
];

function injectTypos(text: string, probability: number): string {
  if (probability <= 0) return text;
  const words = text.split(/(\s+)/);
  let typoCount = 0;
  const maxTypos = 1; // Max 1 typo per post — keeps it subtle

  return words.map((word) => {
    // Skip whitespace, punctuation, short words
    if (word.length <= 5 || /^\s+$/.test(word) || /^[^a-zA-Z]/.test(word)) return word;
    if (typoCount >= maxTypos) return word;
    if (Math.random() > probability) return word;

    // NEVER typo proper nouns (capitalized words) — these are names, places, teams
    if (/^[A-Z]/.test(word)) return word;

    // Strip trailing punctuation, apply typo, re-attach
    const match = word.match(/^([a-zA-Z]+)(.*)$/);
    if (!match) return word;
    const [, letters, trailing] = match;
    if (!letters || letters.length <= 4) return word;

    const transform = TYPO_TRANSFORMS[Math.floor(Math.random() * TYPO_TRANSFORMS.length)]!;
    typoCount++;
    return transform(letters) + (trailing || '');
  }).join('');
}

// ============================================================
// Capitalization variation
// ============================================================

function applyCapitalizationStyle(text: string, ageBracket: string): string {
  if (ageBracket === 'gen_z') {
    // 30% chance all lowercase
    if (Math.random() < 0.3) {
      return text.toLowerCase();
    }
    // 10% chance to emphasize one random word with caps
    if (Math.random() < 0.1) {
      const words = text.split(' ');
      if (words.length > 3) {
        const idx = Math.floor(Math.random() * (words.length - 1)) + 1;
        words[idx] = words[idx]!.toUpperCase();
        return words.join(' ');
      }
    }
  } else if (ageBracket === 'millennial') {
    // 15% chance to ALL CAPS one emphasis word
    if (Math.random() < 0.15) {
      const emphasisWords = ['not', 'never', 'always', 'every', 'best', 'worst', 'so', 'very', 'actually', 'literally'];
      for (const word of emphasisWords) {
        const pattern = new RegExp(`\\b${word}\\b`, 'i');
        if (pattern.test(text)) {
          text = text.replace(pattern, word.toUpperCase());
          break;
        }
      }
    }
  }
  // gen_x and boomer: standard capitalization (no changes)
  return text;
}

// ============================================================
// Regional slang injection
// ============================================================

const REGIONAL_REPLACEMENTS: Record<string, [RegExp, string, number][]> = {
  south: [
    [/\byou all\b/gi, "y'all", 0.5],
    [/\byou guys\b/gi, "y'all", 0.4],
    [/\babout to\b/gi, "fixin' to", 0.3],
    [/\bgoing to\b/gi, "gonna", 0.25],
    [/\beveryone\b/gi, 'everybody', 0.3],
    [/\bvery\b/gi, 'real', 0.2],
  ],
  midwest: [
    [/\byou guys\b/gi, 'you guys', 0.5], // Midwest keeps "you guys"
    [/\bgoing to\b/gi, 'gonna', 0.2],
    [/\byes\b/gi, 'yeah', 0.3],
  ],
  northeast: [
    [/\bvery\b/gi, 'wicked', 0.15],
    [/\byou guys\b/gi, 'youse', 0.1],
  ],
  west: [
    [/\bgoing to\b/gi, 'gonna', 0.2],
    [/\breally\b/gi, 'hella', 0.1],
  ],
  plains: [
    [/\bgoing to\b/gi, 'gonna', 0.2],
    [/\byou all\b/gi, "y'all", 0.3],
  ],
};

function injectRegionalSlang(text: string, region: string): string {
  const replacements = REGIONAL_REPLACEMENTS[region];
  if (!replacements) return text;

  for (const [pattern, replacement, probability] of replacements) {
    if (Math.random() < probability) {
      text = text.replace(pattern, replacement);
    }
  }
  return text;
}

// ============================================================
// CFB slang injection
// ============================================================

const CFB_SLANG: [RegExp, string, number][] = [
  [/\brecruits\b/gi, 'croots', 0.20],
  [/\bnational championship\b/gi, 'natty', 0.30],
  [/\btransfer portal\b/gi, 'portal', 0.50],
  [/\bcommitment\b/gi, 'commit', 0.40],
  [/\bcoordinator\b/gi, 'coordinator', 0.0], // keep as-is
  [/\bofficial visit\b/gi, 'OV', 0.25],
  [/\bgoing to be\b/gi, 'gonna be', 0.20],
];

function injectCfbSlang(text: string): string {
  for (const [pattern, replacement, probability] of CFB_SLANG) {
    if (Math.random() < probability) {
      text = text.replace(pattern, replacement);
    }
  }
  return text;
}

// ============================================================
// Angry fragment conversion
// ============================================================

function fragmentize(text: string): string {
  // Only fragmentize the first sentence
  const firstSentenceEnd = text.match(/[.!?]\s/);
  if (!firstSentenceEnd || firstSentenceEnd.index === undefined) return text;

  const firstSentence = text.slice(0, firstSentenceEnd.index);
  const rest = text.slice(firstSentenceEnd.index + firstSentenceEnd[0].length);

  // Split first sentence into key words and make fragments
  const words = firstSentence.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 4) return text;

  // Take 3-4 key words and make fragments
  const fragmentCount = Math.min(4, Math.floor(words.length / 2));
  const fragments = words.slice(0, fragmentCount).map(w => {
    // Strip trailing punctuation and capitalize
    const clean = w.replace(/[,;:]$/, '');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  });

  return fragments.join('. ') + '. ' + rest;
}

// ============================================================
// Post-social-media styling
// ============================================================

function socialMediaStyle(text: string): string {
  // Strip trailing period from single-sentence posts (humans skip them)
  const sentenceCount = (text.match(/[.!?]/g) || []).length;
  if (sentenceCount === 1 && text.endsWith('.')) {
    text = text.slice(0, -1);
  }
  return text;
}

// ============================================================
// Main humanizer pipeline
// ============================================================

export function humanizeContent(
  content: string,
  personality: BotPersonality,
  profile: HumanizerProfile
): string {
  let text = content;
  const mood = profile.bot_mood ?? 5;
  const region = profile.bot_region ?? 'south';
  const ageBracket = profile.bot_age_bracket ?? 'millennial';

  // 1. Extended AI-speak removal
  text = stripAiSpeak(text);

  // 2. Pronoun enforcement
  if (profile.schoolName && profile.mascotName) {
    text = enforcePronounStyle(text, personality.pronounStyle, profile.schoolName, profile.mascotName);
  }

  // 3. Typo injection (not for analysts - they proofread)
  const typoRate = personality.type === 'analyst' ? 0
    : ageBracket === 'gen_z' ? 0.04
    : ageBracket === 'boomer' ? 0.01
    : 0.02;
  text = injectTypos(text, typoRate);

  // 4. Capitalization variation
  text = applyCapitalizationStyle(text, ageBracket);

  // 5. Regional slang injection
  text = injectRegionalSlang(text, region);

  // 6. CFB slang injection
  text = injectCfbSlang(text);

  // 7. Angry fragment conversion (when mood is low and personality supports it)
  if (personality.angryFragments && mood <= 3 && Math.random() < 0.3) {
    text = fragmentize(text);
  }

  // 8. Length enforcement
  if (personality.maxPostLength && text.length > personality.maxPostLength) {
    // Truncate at sentence boundary
    const truncated = text.slice(0, personality.maxPostLength);
    const lastSentence = truncated.lastIndexOf('. ');
    const lastExclaim = truncated.lastIndexOf('! ');
    const lastQuestion = truncated.lastIndexOf('? ');
    const lastBreak = Math.max(lastSentence, lastExclaim, lastQuestion);
    if (lastBreak > personality.maxPostLength * 0.4) {
      text = truncated.slice(0, lastBreak + 1);
    } else {
      text = truncated;
    }
  }

  // 9. Social media styling
  text = socialMediaStyle(text);

  // Ensure first char is uppercase (unless gen_z all-lowercase)
  if (text.length > 0 && text !== text.toLowerCase()) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text.trim();
}

// ============================================================
// Opener diversity check
// ============================================================

/**
 * Check if a new post's opener is too similar to recent openers.
 * Returns true if the opener should be rejected.
 */
export function isOpenerTooSimilar(
  newContent: string,
  recentOpeners: string[]
): boolean {
  const newOpener = newContent.split(/\s+/).slice(0, 5).join(' ').toLowerCase();
  if (!newOpener) return false;

  for (const existing of recentOpeners) {
    const existingLower = existing.toLowerCase();
    // Exact prefix match
    if (newOpener.startsWith(existingLower) || existingLower.startsWith(newOpener)) {
      return true;
    }
    // Jaccard similarity on words
    const newWords = new Set(newOpener.split(/\s+/));
    const existingWords = new Set(existingLower.split(/\s+/));
    const intersection = [...newWords].filter(w => existingWords.has(w));
    const similarity = intersection.length / Math.max(newWords.size, existingWords.size);
    if (similarity > 0.6) return true;
  }

  return false;
}

/**
 * Check if new content is too similar to any recent post (cross-bot check).
 * Uses word-overlap similarity.
 */
export function isTooSimilar(newContent: string, recentPosts: string[]): boolean {
  const newWords = new Set(
    newContent.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  );
  if (newWords.size < 3) return false;

  for (const existing of recentPosts) {
    const existingWords = new Set(
      existing.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    const intersection = [...newWords].filter(w => existingWords.has(w));
    const similarity = intersection.length / Math.min(newWords.size, existingWords.size);
    if (similarity > 0.6) return true;
  }

  return false;
}

/**
 * Extract topic/theme from content using keyword matching.
 * Returns a topic slug for tracking.
 */
export function extractTopicTheme(content: string): string {
  const lower = content.toLowerCase();

  if (/\b(fire|fired|firing|hot seat)\b/.test(lower) && /\b(coach|coordinator|dc|oc)\b/.test(lower)) return 'coach_hot_seat';
  if (/\b(defense|defensive|secondary|d-line|linebacker)\b/.test(lower) && /\b(good|great|elite|improved|dominant|shutdown)\b/.test(lower)) return 'defense_praise';
  if (/\b(defense|defensive)\b/.test(lower) && /\b(bad|terrible|worst|awful|trash|exposed)\b/.test(lower)) return 'defense_criticism';
  if (/\b(offense|offensive|o-line|quarterback|qb)\b/.test(lower) && /\b(good|great|elite|explosive|dynamic)\b/.test(lower)) return 'offense_praise';
  if (/\b(ref|refs|official|officials|penalty|call)\b/.test(lower) && /\b(bad|terrible|blind|rigged|robbed|wrong)\b/.test(lower)) return 'ref_blame';
  if (/\b(transfer|portal)\b/.test(lower)) return 'portal_moves';
  if (/\b(recruit|recruiting|commit|commitment|croot|247|rivals)\b/.test(lower)) return 'recruiting';
  if (/\b(nil|name image|collective)\b/.test(lower)) return 'nil_discussion';
  if (/\b(rivalry|rival|hate|enemy)\b/.test(lower)) return 'rivalry_talk';
  if (/\b(playoff|cfp|championship|natty|title)\b/.test(lower)) return 'playoff_talk';
  if (/\b(overrated|fraud|pretender|exposed|bubble)\b/.test(lower)) return 'overrated_callout';
  if (/\b(underrated|sleeping|sleeper|disrespect)\b/.test(lower)) return 'underrated_hype';
  if (/\b(tradition|stadium|atmosphere|tailgate|game day)\b/.test(lower)) return 'fan_culture';
  if (/\b(back in|used to|remember when|glory days|legendary|classic)\b/.test(lower)) return 'nostalgia';
  if (/\b(conference|realignment|big ten|sec|acc|big 12)\b/.test(lower)) return 'conference_talk';
  if (/\b(bowl|bowl game|postseason)\b/.test(lower)) return 'bowl_talk';
  if (/\b(predict|prediction|will win|going undefeated|record will be)\b/.test(lower)) return 'prediction';

  return 'general';
}
