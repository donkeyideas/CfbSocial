// Quick standalone script to seed 100 bots
// Run: npx tsx scripts/seed-bots.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zjaclcnjgumdgufoakio.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ---- Personalities (inline) ----
const BOT_PRESETS: Record<string, object> = {
  homer: { type: 'homer', tone: 'passionate', temperature: 0.9 },
  analyst: { type: 'analyst', tone: 'analytical', temperature: 0.7 },
  old_school: { type: 'old_school', tone: 'nostalgic', temperature: 0.8 },
  hot_take: { type: 'hot_take', tone: 'provocative', temperature: 1.0 },
  recruiting_insider: { type: 'recruiting_insider', tone: 'excited', temperature: 0.85 },
};

const PERSONALITY_TYPES = Object.keys(BOT_PRESETS);

const TOP_25_ABBREVIATIONS = [
  'ALA', 'UGA', 'OHIO', 'MICH', 'TEX', 'ORE', 'LSU', 'USC', 'CLEM', 'PSU',
  'FSU', 'OKLA', 'TENN', 'ND', 'OLE', 'WISC', 'IOWA', 'MIST', 'AUB', 'FLA',
  'NCST', 'OKST', 'MIZZ', 'TAMU', 'WASH',
];

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

async function seedBots() {
  // Check if already seeded
  const { count: existingBots } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_bot', true);

  if ((existingBots ?? 0) >= 50) {
    console.log(`Already have ${existingBots} bots, skipping.`);
    return;
  }

  // Fetch all FBS schools
  const { data: allSchools } = await supabase
    .from('schools')
    .select('id, name, abbreviation, mascot, conference, primary_color, secondary_color, slug')
    .eq('is_active', true)
    .order('name');

  if (!allSchools?.length) {
    console.error('No schools found');
    return;
  }

  console.log(`Found ${allSchools.length} schools`);

  const top25 = allSchools.filter((s: any) => TOP_25_ABBREVIATIONS.includes(s.abbreviation));
  const remaining = allSchools.filter((s: any) => !TOP_25_ABBREVIATIONS.includes(s.abbreviation));
  const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5).slice(0, 50);

  console.log(`Top 25 schools matched: ${top25.length}`);
  console.log(`Remaining schools selected: ${shuffledRemaining.length}`);

  let created = 0;
  let errors = 0;
  let personalityIdx = 0;

  async function createOneBot(school: any, personalityType: string, suffix: number) {
    const personality = BOT_PRESETS[personalityType] || BOT_PRESETS.homer;
    const abbr = school.abbreviation.toLowerCase().replace(/[^a-z]/g, '');
    const username = `${abbr}_${personalityType}_${suffix}`;
    const email = `bot-${username}@cfbsocial.com`;

    const vars: Record<string, string> = {
      school: school.name,
      mascot: school.mascot,
      abbr: school.abbreviation,
      color: school.primary_color,
      conference: school.conference,
    };

    const nameTemplates = NAME_TEMPLATES[personalityType] ?? NAME_TEMPLATES.homer!;
    const displayName = fillTemplate(pickRandom(nameTemplates), vars);

    const bioTemplates = BIO_TEMPLATES[personalityType] ?? BIO_TEMPLATES.homer!;
    const bio = fillTemplate(pickRandom(bioTemplates), vars);

    try {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      });

      if (authError) {
        console.error(`  FAIL ${username}: ${authError.message}`);
        errors++;
        return;
      }
      if (!authUser?.user) {
        console.error(`  FAIL ${username}: No user returned`);
        errors++;
        return;
      }

      const botId = authUser.user.id;

      // Wait for handle_new_user trigger
      await new Promise((r) => setTimeout(r, 400));

      // Update profile with bot fields
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName,
          bio,
          is_bot: true,
          bot_active: false,
          bot_personality: personality,
          school_id: school.id,
          banner_color: school.primary_color,
          role: 'USER',
          status: 'ACTIVE',
        })
        .eq('id', botId);

      if (updateError) {
        // Profile might not exist yet; try upsert
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: botId,
          username,
          display_name: displayName,
          bio,
          is_bot: true,
          bot_active: false,
          bot_personality: personality,
          school_id: school.id,
          banner_color: school.primary_color,
          role: 'USER',
          status: 'ACTIVE',
        });
        if (upsertError) {
          console.error(`  FAIL ${username}: ${upsertError.message}`);
          errors++;
          return;
        }
      }

      created++;
      if (created % 10 === 0) {
        console.log(`  Created ${created} bots...`);
      }
    } catch (err: any) {
      console.error(`  FAIL ${username}: ${err.message || err}`);
      errors++;
    }
  }

  // Create 2 bots per top 25 school (homer + rotating personality)
  console.log('\nSeeding top 25 schools (2 bots each)...');
  for (const school of top25) {
    await createOneBot(school, 'homer', 1);
    const otherType = PERSONALITY_TYPES.filter((t) => t !== 'homer')[personalityIdx % (PERSONALITY_TYPES.length - 1)]!;
    await createOneBot(school, otherType, 1);
    personalityIdx++;
  }

  // Create 1 bot per remaining 50 schools (homer)
  console.log('\nSeeding remaining 50 schools (1 bot each)...');
  for (const school of shuffledRemaining) {
    await createOneBot(school, 'homer', 1);
  }

  console.log(`\nDone! Created: ${created}, Errors: ${errors}`);
}

seedBots().catch(console.error);
