// Trigger one AI-generated post per bot
// Usage: node scripts/trigger-all-bots.js
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'missing',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

const PERSONALITIES = {
  homer: {
    tone: 'passionate and biased',
    topics: 'team performance, rivalry trash talk, traditions, game day hype',
  },
  analyst: {
    tone: 'informed and data-driven',
    topics: "X's and O's, recruiting rankings, playoff projections, advanced stats",
  },
  old_school: {
    tone: 'nostalgic and gruff',
    topics: 'classic games, legendary players, NIL complaints, conference realignment gripes',
  },
  hot_take: {
    tone: 'bold and provocative',
    topics: 'controversial rankings, coaching hot seat, bold predictions, overrated/underrated',
  },
  recruiting_insider: {
    tone: 'excited and forward-looking',
    topics: 'transfer portal, commitments, NIL deals, class rankings, recruiting battles',
  },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getLength() {
  const roll = Math.random();
  if (roll < 0.3) return { hint: 'Write 1-2 sentences (under 280 characters)', max: 280, tokens: 200 };
  if (roll < 0.65) return { hint: 'Write 3-5 sentences (300-480 characters)', max: 500, tokens: 400 };
  return { hint: 'Write 5-8 sentences (400-500 characters)', max: 500, tokens: 600 };
}

function cleanContent(raw, maxLen) {
  let text = raw || '';
  // Strip markdown
  text = text.replace(/[*_#`~>]/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip common openers
  text = text.replace(/^(Alright|Look,?|Listen,?|Here's the thing|Let me tell you|Okay so|So basically)[,.]?\s*/i, '');
  // Strip emojis
  text = text.replace(/[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '');
  // Strip hashtags
  text = text.replace(/#\w+/g, '');
  // Trim quotes
  text = text.replace(/^["']|["']$/g, '');
  text = text.trim();
  if (text.length > maxLen) text = text.slice(0, maxLen).replace(/\s\S*$/, '');
  return text;
}

async function generatePost(school, personalityType) {
  const p = PERSONALITIES[personalityType] || PERSONALITIES.homer;
  const length = getLength();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const shouldFocusSchool = Math.random() < 0.9;
  const schoolDirective = shouldFocusSchool
    ? `This take MUST be about ${school.name} and their current season, roster, recent games, playoff chances, coaching decisions, rivalries, or recruiting.`
    : `Talk about the broader college football landscape or other ${school.conference} teams. You can mention ${school.name} in passing.`;

  const prompt = `You are a ${p.tone} college football fan of ${school.name} ${school.mascot}. You are in the ${school.conference} conference.
Your typical topics: ${p.topics}.
${schoolDirective}
Today is ${today}. We are in the 2026 OFFSEASON -- spring practices are underway. The 2026 college football season has NOT started yet.

IMPORTANT CONTEXT FOR 2026:
- It is currently SPRING 2026. The 2025 season is OVER. The 2026 season starts in September 2026.
- The 12-team College Football Playoff is now in its second year after debuting in the 2024-25 season
- The transfer portal window just closed. Spring practices and spring games are happening NOW.
- NIL collectives are bigger than ever. Conference realignment fallout continues (Pac-12 rebuilt, ACC lawsuits)
- Texas and Oklahoma are in their 2nd year in the SEC. Oregon, Washington, USC, UCLA are in their 2nd year in the Big Ten.
- Talk about: spring practice observations, portal additions, 2026 roster projections, recruiting class rankings, coaching changes, schedule previews, playoff predictions for 2026, spring game hype
- DO NOT reference any specific 2024 or 2025 game results (you don't know exact scores)
- You CAN reference general narratives: coaching hires, big portal moves, spring depth charts, position battles

RULES:
- ${length.hint}
- Sound natural and human - like a real fan posting on social media
- NO markdown formatting (no bold, italics, headers, backticks, bullet points)
- NO hashtags, NO emojis
- Be opinionated and engaging
- NEVER start with "Alright", "Look,", "Listen,", "Let me tell you", "Here's the thing"
- Your take must be UNIQUE and ORIGINAL

Write a college football take now:`;

  try {
    const response = await ai.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85 + Math.random() * 0.15,
      max_tokens: length.tokens,
    });
    const raw = response.choices[0]?.message?.content?.trim() || '';
    return cleanContent(raw, length.max);
  } catch (err) {
    console.error('  AI error:', err.message);
    return null;
  }
}

// Fallback takes in case AI fails
const FALLBACKS = [
  'Spring practice is looking incredible. The 2026 roster might be the deepest we have had in years.',
  'The portal additions this offseason are going to change everything for us in 2026. Cannot wait for September.',
  'Just got back from the spring game and I am telling you right now, this 2026 team is different.',
  'The 2026 recruiting class is absolutely stacked. NIL is working exactly how it should for us.',
  'Conference realignment has completely destroyed what made college football great. Miss the old days.',
  'September cannot get here fast enough. The 2026 schedule is brutal but this roster can handle it.',
  'The offensive line rebuild this spring is the key to 2026. If those portal guys gel, watch out.',
  'Defense is going to carry us in 2026. The spring scrimmage showed we have legit playoff-caliber talent.',
  'The QB battle in spring camp is going to define our 2026 season. Both guys are making a real case.',
  'Mark my words, we are making the 12-team playoff in 2026. This roster is built for a championship run.',
];

(async () => {
  // Fetch all bots with their school info
  const { data: bots } = await sb.from('profiles')
    .select('id, username, display_name, bot_personality, school_id')
    .eq('is_bot', true);

  const { data: schools } = await sb.from('schools')
    .select('id, name, abbreviation, mascot, conference, primary_color');
  const schoolMap = {};
  for (const s of schools) schoolMap[s.id] = s;

  console.log(`Generating posts for ${bots.length} bots...\n`);

  // First, activate all bots
  await sb.from('profiles').update({ bot_active: true }).eq('is_bot', true);
  await sb.from('admin_settings').update({ value: 'true' }).eq('key', 'bots_global_active');
  console.log('Activated all bots.\n');

  let posted = 0;
  let failed = 0;

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < bots.length; i += 5) {
    const batch = bots.slice(i, i + 5);
    const promises = batch.map(async (bot) => {
      const school = schoolMap[bot.school_id];
      if (!school) { console.log(`  Skip ${bot.username} (no school)`); failed++; return; }

      const pType = (bot.bot_personality && bot.bot_personality.type) || 'homer';
      let content = await generatePost(school, pType);

      // Fallback if AI failed
      if (!content || content.length < 10) {
        content = pick(FALLBACKS);
      }

      // Insert post
      const { data: post, error } = await sb.from('posts').insert({
        author_id: bot.id,
        content,
        school_id: bot.school_id,
        post_type: 'STANDARD',
        status: 'PUBLISHED',
      }).select('id').single();

      if (error) {
        console.log(`  FAIL ${bot.username}: ${error.message}`);
        failed++;
      } else {
        posted++;
        console.log(`  [${posted}] @${bot.username} (${school.abbreviation}/${pType}): ${content.slice(0, 80)}...`);
      }
    });

    await Promise.all(promises);

    // Small delay between batches
    if (i + 5 < bots.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\nDone! Posted: ${posted}, Failed: ${failed}`);
})();
