// ============================================================
// Bot Seeding Logic - Creates 100 bots across FBS schools
// ============================================================

import { createAdminClient } from '@/lib/admin/supabase/admin';
import { BOT_PRESETS } from './personalities';

// Top FBS school abbreviations for priority seeding (2 bots each)
const TOP_25_ABBREVIATIONS = [
  'ALA', 'UGA', 'OHIO', 'MICH', 'TEX', 'ORE', 'LSU', 'USC', 'CLEM', 'PSU',
  'FSU', 'OKLA', 'TENN', 'ND', 'OLE', 'WISC', 'IOWA', 'MIST', 'AUB', 'FLA',
  'NCST', 'OKST', 'MIZZ', 'TAMU', 'WASH',
];

// Personality types to distribute
const PERSONALITY_TYPES = Object.keys(BOT_PRESETS);

// Fan-style display name templates per personality
const NAME_TEMPLATES: Record<string, string[]> = {
  homer: [
    '{{mascot}} Maniac', 'Die Hard {{abbr}} Fan', '{{mascot}} Nation', 'Bleed {{color}}',
    '{{abbr}} Forever', '{{mascot}} Pride', 'True {{abbr}} Fan', '{{mascot}} Faithful',
    '{{abbr}} Ride or Die', '{{mascot}} Madness', 'All In {{abbr}}', '{{mascot}} Thunder',
    '{{abbr}} Loyal', '{{mascot}} Fury', '{{abbr}} Til I Die', '{{mascot}} Diehard',
    '{{mascot}} Spirit', '{{abbr}} Believer', '{{mascot}} Heart', '{{abbr}} Legend',
    '{{mascot}} Soul', '{{abbr}} True Blue', '{{mascot}} Warrior', '{{abbr}} Fanatic',
    '{{mascot}} Roar', '{{abbr}} Devoted',
  ],
  analyst: [
    '{{abbr}} Film Room', '{{mascot}} Analytics', '{{abbr}} Breakdown', '{{mascot}} Stats',
    '{{abbr}} Scout', '{{mascot}} Tape', '{{abbr}} Data', '{{mascot}} Schemes',
    '{{abbr}} X and O', '{{mascot}} Numbers',
  ],
  old_school: [
    'Old School {{abbr}}', '{{mascot}} Traditions', '{{abbr}} Veteran', '{{mascot}} History',
    'Classic {{abbr}}', '{{mascot}} Legacy', '{{abbr}} Old Guard', '{{mascot}} Memory Lane',
    '{{abbr}} Back in the Day', '{{mascot}} Classics',
  ],
  hot_take: [
    '{{abbr}} Hot Takes', '{{mascot}} Controversy', '{{abbr}} Bold Calls', '{{mascot}} No Filter',
    '{{abbr}} Fearless', '{{mascot}} Unfiltered', '{{abbr}} Spicy', '{{mascot}} Zero Chill',
    '{{abbr}} Say It Loud', '{{mascot}} Raw Takes',
  ],
  recruiting_insider: [
    '{{abbr}} Recruiting', '{{mascot}} Portal Watch', '{{abbr}} Commits', '{{mascot}} Insider',
    '{{abbr}} Crystal Ball', '{{mascot}} Targets', '{{abbr}} Trail', '{{mascot}} Future',
    '{{abbr}} Next Gen', '{{mascot}} Recruits',
  ],
};

// Bio templates
const BIO_TEMPLATES: Record<string, string[]> = {
  homer: [
    'Die-hard {{school}} fan. {{mascot}} for life. Do not @ me.',
    'Bleeding {{color}} since day one. {{school}} is my world.',
    '{{school}} fan through thick and thin. Rivalries are personal.',
    'Living and breathing {{school}} football. Best program in the country.',
    'Born into {{school}} fandom. Would not have it any other way.',
  ],
  analyst: [
    'Breaking down {{school}} film and stats. The numbers tell the story.',
    '{{conference}} football analyst. {{school}} homer at heart.',
    'Data-driven takes on {{school}} and college football at large.',
    'Film junkie. {{school}} season previews, game breakdowns, recruiting analysis.',
  ],
  old_school: [
    'Been watching {{school}} since before most of you were born. The game was better then.',
    '{{school}} alum, class of the good old days. NIL has ruined everything.',
    'Remember when {{school}} football meant something? I was there.',
    'Old-school {{school}} fan. Conference realignment is a crime.',
  ],
  hot_take: [
    'Controversial {{school}} takes that will make you mad. You are welcome.',
    'Hot takes are my specialty. {{school}} is underrated and I will prove it.',
    'Bold predictions, no apologies. {{school}} football without a filter.',
    'I say what everyone is thinking about {{school}}. No holding back.',
  ],
  recruiting_insider: [
    'Tracking every {{school}} recruit and portal target. The future is now.',
    '{{school}} recruiting intel. NIL, commits, decommits, portal moves.',
    'Following the {{school}} recruiting trail. Next class is going to be special.',
    '{{conference}} recruiting news with a {{school}} focus. Crystal balls incoming.',
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

export async function seedBots(onProgress?: (msg: string) => void): Promise<{ created: number; errors: string[] }> {
  const supabase = createAdminClient();

  // Check if already seeded
  const { count: existingBots } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_bot', true);

  if ((existingBots ?? 0) >= 50) {
    return { created: 0, errors: ['Bots already seeded (50+ exist)'] };
  }

  // Fetch all FBS schools
  const { data: allSchools } = await supabase
    .from('schools')
    .select('id, name, abbreviation, mascot, conference, primary_color, secondary_color, slug')
    .eq('is_active', true)
    .order('name');

  if (!allSchools?.length) return { created: 0, errors: ['No schools found'] };

  // Separate top 25 and remaining
  const top25 = allSchools.filter((s) => TOP_25_ABBREVIATIONS.includes(s.abbreviation));
  const remaining = allSchools.filter((s) => !TOP_25_ABBREVIATIONS.includes(s.abbreviation));

  // Shuffle remaining and pick 50
  const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5).slice(0, 50);

  let created = 0;
  const errors: string[] = [];
  let personalityIdx = 0;

  type School = { id: string; name: string; abbreviation: string; mascot: string; conference: string; primary_color: string; secondary_color: string; slug: string };

  // Helper to create one bot
  async function createOneBot(school: School, personalityType: string, suffix: number) {
    const personality = BOT_PRESETS[personalityType] ?? BOT_PRESETS.homer;
    const abbr = school.abbreviation.toLowerCase().replace(/[^a-z]/g, '');
    const username = `${abbr}_${personalityType}_${suffix}`;
    const email = `bot-${username}@cfbsocial.com`;

    const vars = {
      school: school.name,
      mascot: school.mascot,
      abbr: school.abbreviation,
      color: school.primary_color,
      conference: school.conference,
    };

    const nameTemplates = (NAME_TEMPLATES[personalityType] ?? NAME_TEMPLATES.homer)!;
    const displayName = fillTemplate(pickRandom(nameTemplates)!, vars);

    const bioTemplates = (BIO_TEMPLATES[personalityType] ?? BIO_TEMPLATES.homer)!;
    const bio = fillTemplate(pickRandom(bioTemplates)!, vars);

    try {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      });

      if (authError) {
        errors.push(`${username}: ${authError.message}`);
        return;
      }
      if (!authUser?.user) {
        errors.push(`${username}: No user returned`);
        return;
      }

      const botId = authUser.user.id;

      // Wait for trigger
      await new Promise((r) => setTimeout(r, 300));

      // Update profile with bot fields
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName,
          bio,
          is_bot: true,
          bot_active: false,
          bot_personality: personality as unknown as Record<string, unknown>,
          school_id: school.id,
          banner_color: school.primary_color,
          role: 'USER',
          status: 'ACTIVE',
        })
        .eq('id', botId);

      if (updateError) {
        // Profile might not exist yet from trigger; try insert
        await supabase.from('profiles').upsert({
          id: botId,
          username,
          display_name: displayName,
          bio,
          is_bot: true,
          bot_active: false,
          bot_personality: personality as unknown as Record<string, unknown>,
          school_id: school.id,
          banner_color: school.primary_color,
          role: 'USER',
          status: 'ACTIVE',
        });
      }

      created++;
      if (onProgress && created % 10 === 0) {
        onProgress(`Created ${created} bots...`);
      }
    } catch (err) {
      errors.push(`${username}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Create 2 bots per top 25 school (homer + rotating personality)
  for (const school of top25) {
    await createOneBot(school, 'homer', 1);
    const otherType = PERSONALITY_TYPES.filter((t) => t !== 'homer')[personalityIdx % (PERSONALITY_TYPES.length - 1)]!;
    await createOneBot(school, otherType, 1);
    personalityIdx++;
  }

  // Create 1 bot per remaining 50 schools (homer)
  for (const school of shuffledRemaining) {
    await createOneBot(school, 'homer', 1);
  }

  return { created, errors };
}

// ============================================================
// Region mapping from US state to bot region
// ============================================================

const STATE_TO_REGION: Record<string, string> = {
  // South
  'Alabama': 'south', 'Arkansas': 'south', 'Florida': 'south', 'Georgia': 'south',
  'Kentucky': 'south', 'Louisiana': 'south', 'Mississippi': 'south', 'North Carolina': 'south',
  'South Carolina': 'south', 'Tennessee': 'south', 'Virginia': 'south', 'West Virginia': 'south',
  'Texas': 'south',
  // Midwest
  'Illinois': 'midwest', 'Indiana': 'midwest', 'Iowa': 'midwest', 'Kansas': 'midwest',
  'Michigan': 'midwest', 'Minnesota': 'midwest', 'Missouri': 'midwest', 'Nebraska': 'midwest',
  'North Dakota': 'midwest', 'Ohio': 'midwest', 'South Dakota': 'midwest', 'Wisconsin': 'midwest',
  // Northeast
  'Connecticut': 'northeast', 'Delaware': 'northeast', 'Maine': 'northeast',
  'Maryland': 'northeast', 'Massachusetts': 'northeast', 'New Hampshire': 'northeast',
  'New Jersey': 'northeast', 'New York': 'northeast', 'Pennsylvania': 'northeast',
  'Rhode Island': 'northeast', 'Vermont': 'northeast', 'District of Columbia': 'northeast',
  // West
  'Arizona': 'west', 'California': 'west', 'Colorado': 'west', 'Hawaii': 'west',
  'Nevada': 'west', 'New Mexico': 'west', 'Oregon': 'west', 'Utah': 'west',
  'Washington': 'west',
  // Plains
  'Idaho': 'plains', 'Montana': 'plains', 'Oklahoma': 'plains', 'Wyoming': 'plains',
};

function getRegion(state: string): string {
  return STATE_TO_REGION[state] || 'south';
}

const AGE_BRACKETS = ['gen_z', 'gen_z', 'gen_z', 'millennial', 'millennial', 'millennial', 'millennial', 'gen_x', 'gen_x', 'boomer'];

function getAgeBracket(): string {
  return AGE_BRACKETS[Math.floor(Math.random() * AGE_BRACKETS.length)]!;
}

/**
 * Diversify existing bots: reassign personalities, regions, age brackets.
 * Target distribution: 40 Homer, 20 Analyst, 15 Hot Take, 15 Old School, 10 Recruiting Insider
 */
export async function diversifyBotPersonalities(): Promise<{ updated: number; errors: string[] }> {
  const supabase = createAdminClient();

  // Fetch all bots with school data
  const { data: bots } = await supabase
    .from('profiles')
    .select('id, username, display_name, school_id, bot_personality, school:schools!profiles_school_id_fkey(name, mascot, abbreviation, conference, primary_color, state)')
    .eq('is_bot', true)
    .eq('status', 'ACTIVE')
    .order('created_at');

  if (!bots?.length) return { updated: 0, errors: ['No bots found'] };

  // Desired distribution
  const distribution: { type: string; count: number }[] = [
    { type: 'homer', count: 40 },
    { type: 'analyst', count: 20 },
    { type: 'hot_take', count: 15 },
    { type: 'old_school', count: 15 },
    { type: 'recruiting_insider', count: 10 },
  ];

  // Build assignment list
  const assignments: string[] = [];
  for (const { type, count } of distribution) {
    for (let i = 0; i < count; i++) assignments.push(type);
  }
  // Shuffle assignments
  for (let i = assignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j]!, assignments[i]!];
  }

  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i]!;
    const newType = assignments[i % assignments.length]!;
    const personality = BOT_PRESETS[newType] ?? BOT_PRESETS.homer!;
    const school = Array.isArray(bot.school) ? bot.school[0] : bot.school;
    if (!school) continue;

    const state = (school as Record<string, unknown>).state as string || '';
    const region = getRegion(state);
    // Old School bots get gen_x or boomer; Gen Z never gets old_school
    let ageBracket = getAgeBracket();
    if (newType === 'old_school') {
      ageBracket = Math.random() < 0.6 ? 'gen_x' : 'boomer';
    }

    const vars = {
      school: (school as Record<string, unknown>).name as string,
      mascot: (school as Record<string, unknown>).mascot as string,
      abbr: (school as Record<string, unknown>).abbreviation as string,
      color: (school as Record<string, unknown>).primary_color as string,
      conference: '',
    };

    const nameTemplates = (NAME_TEMPLATES[newType] ?? NAME_TEMPLATES.homer)!;
    const displayName = fillTemplate(pickRandom(nameTemplates)!, vars);

    const bioTemplates = (BIO_TEMPLATES[newType] ?? BIO_TEMPLATES.homer)!;
    const bio = fillTemplate(pickRandom(bioTemplates)!, vars);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio,
        bot_personality: personality as unknown as Record<string, unknown>,
        bot_region: region,
        bot_age_bracket: ageBracket,
        bot_mood: 5,
        bot_topics_covered: JSON.stringify({ recentTopics: [], recentOpeners: [], recentThemes: [], topicDeckIndex: 0 }),
        bot_post_count_today: 0,
      })
      .eq('id', bot.id);

    if (error) {
      errors.push(`${bot.username}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return { updated, errors };
}

// ============================================================
// Seed Power 5 coverage — create 1 bot per uncovered P5 school
// ============================================================

const POWER_CONFERENCES = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12', 'Independent'];

/**
 * Ensure every Power 5 school has at least one bot.
 * Skips schools that already have a bot assigned.
 */
export async function seedPowerFiveBots(
  onProgress?: (msg: string) => void
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const supabase = createAdminClient();

  // Fetch all P5 schools
  const { data: p5Schools } = await supabase
    .from('schools')
    .select('id, name, abbreviation, mascot, conference, primary_color, secondary_color, slug, state')
    .in('conference', POWER_CONFERENCES)
    .eq('is_active', true)
    .order('conference')
    .order('name');

  if (!p5Schools?.length) return { created: 0, skipped: 0, errors: ['No P5 schools found'] };

  // Fetch all existing bot school assignments
  const { data: existingBots } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('is_bot', true);

  const coveredSchoolIds = new Set(
    (existingBots ?? []).map(b => b.school_id).filter(Boolean)
  );

  const uncovered = p5Schools.filter(s => !coveredSchoolIds.has(s.id));
  const skipped = p5Schools.length - uncovered.length;

  if (uncovered.length === 0) {
    return { created: 0, skipped, errors: [] };
  }

  onProgress?.(`Found ${uncovered.length} uncovered P5 schools (${skipped} already covered)`);

  let created = 0;
  const errors: string[] = [];

  // Rotate through personality types for variety
  const personalityRotation = ['homer', 'analyst', 'hot_take', 'old_school', 'recruiting_insider'];
  let pIdx = 0;

  type School = typeof p5Schools[number];

  for (const school of uncovered) {
    const personalityType = personalityRotation[pIdx % personalityRotation.length]!;
    pIdx++;

    const personality = BOT_PRESETS[personalityType] ?? BOT_PRESETS.homer!;
    const abbr = school.abbreviation.toLowerCase().replace(/[^a-z]/g, '');
    const username = `${abbr}_${personalityType.replace('_insider', '')}_1`;
    const email = `bot-${abbr}-${personalityType}-p5@cfbsocial.com`;

    const vars: Record<string, string> = {
      school: school.name,
      mascot: school.mascot,
      abbr: school.abbreviation,
      color: school.primary_color,
      conference: school.conference,
    };

    const nameTemplates = (NAME_TEMPLATES[personalityType] ?? NAME_TEMPLATES.homer)!;
    const displayName = fillTemplate(pickRandom(nameTemplates)!, vars);

    const bioTemplates = (BIO_TEMPLATES[personalityType] ?? BIO_TEMPLATES.homer)!;
    const bio = fillTemplate(pickRandom(bioTemplates)!, vars);

    const region = getRegion(school.state || '');
    let ageBracket = getAgeBracket();
    if (personalityType === 'old_school') {
      ageBracket = Math.random() < 0.6 ? 'gen_x' : 'boomer';
    }

    try {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      });

      if (authError) {
        errors.push(`${school.abbreviation}: ${authError.message}`);
        continue;
      }
      if (!authUser?.user) {
        errors.push(`${school.abbreviation}: No user returned`);
        continue;
      }

      const botId = authUser.user.id;
      await new Promise(r => setTimeout(r, 300));

      const profileData = {
        username,
        display_name: displayName,
        bio,
        is_bot: true,
        bot_active: true, // Activate immediately
        bot_personality: personality as unknown as Record<string, unknown>,
        school_id: school.id,
        banner_color: school.primary_color,
        role: 'USER' as const,
        status: 'ACTIVE' as const,
        bot_region: region,
        bot_age_bracket: ageBracket,
        bot_mood: 5,
        bot_post_count_today: 0,
        bot_topics_covered: JSON.stringify({
          recentTopics: [],
          recentOpeners: [],
          recentThemes: [],
          topicDeckIndex: 0,
        }),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', botId);

      if (updateError) {
        await supabase.from('profiles').upsert({ id: botId, ...profileData });
      }

      created++;
      onProgress?.(`Created bot for ${school.name} (${school.abbreviation}) [${personalityType}] - ${created}/${uncovered.length}`);
    } catch (err) {
      errors.push(`${school.abbreviation}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { created, skipped, errors };
}
