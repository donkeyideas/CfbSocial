// Randomize all bot usernames and display names to look like real fans
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FIRST_NAMES = [
  'Jake','Mike','Tyler','Chris','Matt','Josh','Ryan','Nick','Brandon','Kyle',
  'Chad','Drew','Cole','Luke','Zach','Trey','Blake','Cody','Bryce','Hunter',
  'Chase','Brock','Austin','Dillon','Jared','Grant','Derek','Mason','Travis','Colt',
  'Wesley','Dustin','Marcus','Trevor','Shane','Garrett','Parker','Colton','Brady','Tucker',
  'Keith','Danny','Vince','Clay','Ray','Bo','Reggie','Earl','Hank','Rex',
  'Lisa','Amy','Sarah','Jen','Katie','Megan','Ashley','Brittany','Jessica','Heather',
  'Tammy','Stacy','Donna','Kim','Pam','Mary','Linda','Becky','Lori','Dana',
  'Big','Lil','Coach','Papa','Uncle',
];

const SUFFIXES = {
  homer: ['TilIDie','Nation','4Ever','Faithful','Diehard','Pride','ForLife','AllDay',
    'GameDay','TailgateKing','SznReady','OnSaturdays','BleedIt','LivesIt','IsLife',
    'Fanatic','Devoted','RollOn','AllIn','RideOrDie'],
  analyst: ['FilmGuy','TapeJunkie','StatNerd','XsAndOs','Analytics','FilmRoom',
    'ChalkTalk','SchemeGuru','BreakdownKing','Numbers'],
  old_school: ['OldSchool','ClassicFan','BackInMyDay','Traditions','OGFan',
    'RememberWhen','GoodOlDays','Legend','ThrowBack'],
  hot_take: ['HotTakes','NoFilter','BoldCalls','Unfiltered','ZeroChill',
    'NoCap','RealTalk','TruthBomb','Fearless'],
  recruiting_insider: ['Recruiting','PortalWatch','CrystalBall','Commits',
    'NextGen','FutureStar','RecruitTrail','NILWatch'],
};

const DISPLAY_TEMPLATES = {
  homer: [
    '{first} the {mascot} Fan', '{mascot} {first}', '{first} Loves {team}',
    '{team} {first}', '{mascot} Country {first}', 'Ride or Die {mascot}',
    '{team} Faithful', '{mascot} Diehard {first}', '{first} {mascot} Forever',
    '{team} Til I Die', '{first} Lives {team}', '{mascot} Madness',
    '{team} Tailgate {first}', '{mascot} Saturday {first}', '{first} on GameDay',
  ],
  analyst: [
    '{first} {team} Film', '{team} Film Room', '{mascot} Analytics',
    '{team} Stats {first}', '{mascot} Xs and Os', '{first} {team} Scout',
    '{first} Breaks It Down',
  ],
  old_school: [
    'Old School {first}', 'OG {mascot} Fan', '{team} Throwback',
    '{mascot} Traditions', 'Classic {team} {first}', '{first} Remembers',
    '{team} Heritage',
  ],
  hot_take: [
    '{first} Hot Takes', '{team} Unfiltered', '{mascot} No Filter',
    '{first} Bold Takes', '{team} Real Talk', '{first} Calls It',
    '{mascot} Zero Chill',
  ],
  recruiting_insider: [
    '{first} {team} Recruiting', '{mascot} Portal Watch', '{team} Commit Tracker',
    '{first} {team} Insider', '{mascot} Next Gen', '{team} Crystal Ball',
    '{first} NIL Watch',
  ],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randNum() { return Math.floor(Math.random() * 99) + 1; }

function fill(tpl, vars) {
  let r = tpl;
  for (const [k, v] of Object.entries(vars)) {
    r = r.replace(new RegExp('\\{' + k + '\\}', 'g'), v);
  }
  return r;
}

// Get a short team name (e.g. "Alabama" from "Alabama Crimson Tide")
function shortTeam(fullName) {
  const parts = fullName.split(' ');
  // If 2 words, first is the team name. If 3+, first 1-2 words.
  if (parts.length <= 2) return parts[0];
  // Check if second word looks like part of mascot (capitalized, common mascot words)
  const mascotWords = ['State','Tech','A&M','Ole','Miss','Southern','Northern','Eastern','Western','Central'];
  if (mascotWords.includes(parts[1])) return parts.slice(0, 2).join(' ');
  return parts[0];
}

(async () => {
  const { data: bots } = await sb.from('profiles')
    .select('id, username, display_name, bot_personality, school_id')
    .eq('is_bot', true);
  const { data: schools } = await sb.from('schools')
    .select('id, name, abbreviation, mascot, conference, primary_color');

  const schoolMap = {};
  for (const s of schools) schoolMap[s.id] = s;

  const usedUsernames = new Set();
  const usedDisplayNames = new Set();
  let updated = 0;

  for (const bot of bots) {
    const school = schoolMap[bot.school_id];
    if (!school) continue;

    const pType = (bot.bot_personality && bot.bot_personality.type) || 'homer';
    const suffixes = SUFFIXES[pType] || SUFFIXES.homer;
    const displays = DISPLAY_TEMPLATES[pType] || DISPLAY_TEMPLATES.homer;
    const mascotClean = school.mascot.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12);
    const abbrClean = school.abbreviation.toLowerCase().replace(/[^a-z]/g, '');
    const team = shortTeam(school.name);

    // Generate unique username
    let username;
    let attempts = 0;
    do {
      const first = pick(FIRST_NAMES).toLowerCase();
      const suffix = pick(suffixes);
      const num = randNum();
      const formats = [
        first + '_' + mascotClean + num,
        mascotClean + '_' + first + num,
        first + suffix + num,
        abbrClean + '_' + first + num,
        first + '_' + abbrClean + num,
        mascotClean + suffix.toLowerCase() + num,
        first + num + '_' + abbrClean,
      ];
      username = pick(formats).replace(/[^a-z0-9_]/g, '');
      attempts++;
    } while (usedUsernames.has(username) && attempts < 30);
    usedUsernames.add(username);

    // Generate display name
    const firstName = pick(FIRST_NAMES);
    const tpl = pick(displays);
    let displayName = fill(tpl, {
      first: firstName,
      team: team,
      mascot: school.mascot,
    });

    if (usedDisplayNames.has(displayName)) {
      displayName = displayName + ' ' + randNum();
    }
    usedDisplayNames.add(displayName);

    // Update profile
    const { error } = await sb.from('profiles').update({
      username,
      display_name: displayName,
    }).eq('id', bot.id);

    if (error) {
      console.error('FAIL', bot.id, error.message);
    } else {
      updated++;
    }

    // Update auth email to match
    const email = 'bot-' + username + '@cfbsocial.com';
    await sb.auth.admin.updateUserById(bot.id, { email });
  }

  console.log('Updated', updated, 'bots');

  // Show samples
  const { data: sample } = await sb.from('profiles')
    .select('username, display_name, bot_personality')
    .eq('is_bot', true).limit(20);
  console.log('\nSamples:');
  sample.forEach(b => console.log(' ', b.username, '|', b.display_name, '|', (b.bot_personality && b.bot_personality.type)));
})();
