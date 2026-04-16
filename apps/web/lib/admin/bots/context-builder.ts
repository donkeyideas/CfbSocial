// ============================================================
// Bot Context Builder
// Gathers real-time data (game state, portal, mood, local knowledge)
// and builds rich context for AI prompt injection
// ============================================================

import { createAdminClient } from '@/lib/admin/supabase/admin';
import { getScoreboard, type ESPNEvent as ProviderEvent } from '@/lib/providers/espn';
import { getTeamHighlights } from '@/lib/providers/cfbd';
import { getSubredditHot } from '@/lib/providers/reddit';
import { getCollegeFootballNews } from '@/lib/providers/newsapi';
import type { BotPersonality } from './personalities';

// ============================================================
// Types
// ============================================================

interface GameContext {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  clock: string;
  period: string;
  status: 'pre' | 'in' | 'post';
  isSchoolHome: boolean;
  isSchoolWinning: boolean;
}

interface PortalEvent {
  playerName: string;
  position: string;
  direction: 'incoming' | 'outgoing';
  otherSchool: string;
}

interface LocalFact {
  category: string;
  name: string;
  description: string | null;
}

export interface BotContext {
  liveGames: GameContext[];
  moodDescription: string;
  portalNews: PortalEvent[];
  localKnowledge: LocalFact[];
  timeOfDay: string;
  contextSummary: string;
  teamHighlights: string | null;
  redditChatter: string[];
  generalNews: string[];
}

interface SchoolInfo {
  name: string;
  abbreviation: string;
  mascot: string;
  conference: string;
}

// ============================================================
// ESPN Scoreboard fetcher (delegates to consolidated provider)
// ============================================================

type ESPNEvent = ProviderEvent;

async function fetchESPNScoreboard(): Promise<ESPNEvent[]> {
  return getScoreboard();
}

function findSchoolGame(events: ESPNEvent[], schoolAbbr: string): GameContext | null {
  for (const event of events) {
    const comp = event.competitions[0];
    if (!comp) continue;
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    if (!home || !away) continue;

    const homeMatch = home.team.abbreviation.toUpperCase() === schoolAbbr.toUpperCase();
    const awayMatch = away.team.abbreviation.toUpperCase() === schoolAbbr.toUpperCase();

    if (homeMatch || awayMatch) {
      const homeScore = parseInt(home.score, 10) || 0;
      const awayScore = parseInt(away.score, 10) || 0;
      const isSchoolHome = homeMatch;
      const schoolScore = isSchoolHome ? homeScore : awayScore;
      const opponentScore = isSchoolHome ? awayScore : homeScore;

      return {
        homeTeam: home.team.displayName,
        awayTeam: away.team.displayName,
        homeScore,
        awayScore,
        clock: comp.status.displayClock,
        period: `Q${comp.status.period}`,
        status: comp.status.type.state as 'pre' | 'in' | 'post',
        isSchoolHome,
        isSchoolWinning: schoolScore > opponentScore,
      };
    }
  }
  return null;
}

// ============================================================
// Portal news fetcher
// ============================================================

async function fetchPortalNews(schoolId: string, schoolName: string): Promise<PortalEvent[]> {
  try {
    const supabase = createAdminClient();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Outgoing players (left this school)
    const { data: outgoing } = await supabase
      .from('portal_players')
      .select('name, position, committed_school:schools!portal_players_committed_school_id_fkey(name)')
      .eq('previous_school_id', schoolId)
      .gte('entered_portal_at', twoDaysAgo)
      .limit(5);

    // Incoming commits (committed to this school)
    const { data: incoming } = await supabase
      .from('portal_players')
      .select('name, position, previous_school:schools!portal_players_previous_school_id_fkey(name)')
      .eq('committed_school_id', schoolId)
      .gte('entered_portal_at', twoDaysAgo)
      .limit(5);

    const events: PortalEvent[] = [];

    if (outgoing?.length) {
      for (const p of outgoing) {
        const committedSchool = Array.isArray(p.committed_school) ? p.committed_school[0] : p.committed_school;
        events.push({
          playerName: p.name as string,
          position: p.position as string,
          direction: 'outgoing',
          otherSchool: (committedSchool as Record<string, unknown>)?.name as string ?? 'unknown',
        });
      }
    }

    if (incoming?.length) {
      for (const p of incoming) {
        const prevSchool = Array.isArray(p.previous_school) ? p.previous_school[0] : p.previous_school;
        events.push({
          playerName: p.name as string,
          position: p.position as string,
          direction: 'incoming',
          otherSchool: (prevSchool as Record<string, unknown>)?.name as string ?? 'unknown',
        });
      }
    }

    return events;
  } catch {
    return [];
  }
}

// ============================================================
// Local knowledge fetcher
// ============================================================

async function fetchLocalKnowledge(schoolId: string): Promise<LocalFact[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('school_local_knowledge')
      .select('category, name, description')
      .eq('school_id', schoolId);

    if (!data?.length) return [];

    // Pick 2-3 random facts
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3) as LocalFact[];
  } catch {
    return [];
  }
}

// ============================================================
// Time context
// ============================================================

/**
 * Determine the current CFB season phase based on month.
 */
function getSeasonPhase(month: number): { phase: string; description: string } {
  // month is 0-indexed: 0=Jan, 11=Dec
  if (month === 0) return { phase: 'postseason', description: 'The CFB Playoff and bowl season just ended. Coaching carousel and early portal moves dominating the news.' };
  if (month === 1) return { phase: 'early_offseason', description: 'National Signing Day. Recruiting classes finalized. Transfer portal is wide open. Coaches assembling rosters for next season.' };
  if (month >= 2 && month <= 3) return { phase: 'spring_practice', description: 'Spring practice and spring games. QB competitions, position battles, new transfers getting acclimated. Portal window active.' };
  if (month >= 4 && month <= 5) return { phase: 'dead_period', description: 'Summer dead period. Players in voluntary workouts. Recruiting visits happening. Preseason magazines and predictions starting.' };
  if (month === 6) return { phase: 'fall_camp', description: 'Fall camp is starting. Depth charts being set. Preseason polls released. Hype is building for week 1.' };
  if (month === 7) return { phase: 'fall_camp', description: 'Fall camp in full swing. Season opener is days away. Final depth charts, injury reports, and week 1 predictions.' };
  if (month >= 8 && month <= 10) return { phase: 'regular_season', description: 'College football regular season is live. Games every Saturday.' };
  return { phase: 'postseason', description: 'Conference championship games and CFB Playoff selection. Bowl season approaching.' };
}

function getTimeContext(): string {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[now.getDay()]!;
  const hour = now.getHours();
  const month = now.getMonth();
  const { phase } = getSeasonPhase(month);
  const isGameday = phase === 'regular_season' || phase === 'postseason';

  if (day === 'Saturday' && isGameday) {
    if (hour >= 10 && hour < 14) return 'Saturday morning, early games are kicking off';
    if (hour >= 14 && hour < 18) return 'Saturday afternoon, games are in full swing';
    if (hour >= 18 && hour < 23) return 'Saturday night, prime time college football';
    if (hour >= 23 || hour < 3) return 'Late Saturday night, processing the day of football';
    return 'Early Saturday morning, game day';
  }
  if (day === 'Sunday' && isGameday) {
    if (hour < 12) return 'Sunday morning, reflecting on yesterday\'s games';
    return 'Sunday, analyzing the weekend results';
  }
  if (hour >= 0 && hour < 6) return `Late ${day} night`;
  if (hour >= 6 && hour < 12) return `${day} morning`;
  if (hour >= 12 && hour < 17) return `${day} afternoon`;
  return `${day} evening`;
}

// ============================================================
// Mood description builder
// ============================================================

function buildMoodDescription(mood: number, game: GameContext | null, personality: BotPersonality): string {
  if (game) {
    if (game.status === 'in') {
      const diff = game.isSchoolWinning ? 'winning' : 'losing';
      const margin = Math.abs(game.homeScore - game.awayScore);
      if (margin > 20 && !game.isSchoolWinning) {
        return `Your team is getting blown out. Down ${margin} points. You are furious.`;
      }
      if (margin > 20 && game.isSchoolWinning) {
        return `Your team is dominating. Up ${margin} points. You are euphoric.`;
      }
      return `Your team is currently ${diff} by ${margin} (${game.clock} in ${game.period}). React to the live game.`;
    }
    if (game.status === 'post') {
      if (game.isSchoolWinning) {
        return 'Your team just won. You are fired up and talking trash.';
      } else {
        return 'Your team just lost. You are processing the loss.';
      }
    }
  }

  return personality.moodResponseCurve[mood] || '';
}

// ============================================================
// Main context builder
// ============================================================

export async function buildBotContext(
  botId: string,
  schoolId: string | null,
  school: SchoolInfo | null,
  personality: BotPersonality,
  mood: number
): Promise<BotContext> {
  const liveGames: GameContext[] = [];
  let moodDescription = personality.moodResponseCurve[mood] || '';
  const portalNews: PortalEvent[] = [];
  const localKnowledge: LocalFact[] = [];
  let teamHighlights: string | null = null;
  let redditChatter: string[] = [];
  let generalNews: string[] = [];

  if (school && schoolId) {
    // Fetch in parallel — external providers return []/null when keys missing
    const [espnEvents, portal, local, highlights, redditHot, news] = await Promise.all([
      fetchESPNScoreboard(),
      fetchPortalNews(schoolId, school.name),
      fetchLocalKnowledge(schoolId),
      getTeamHighlights(school.name).catch(() => null),
      getSubredditHot('CFB', 5).catch(() => []),
      getCollegeFootballNews('college football', 5).catch(() => []),
    ]);

    // Find school's game
    const game = findSchoolGame(espnEvents, school.abbreviation);
    if (game) {
      liveGames.push(game);
      moodDescription = buildMoodDescription(mood, game, personality);
    }

    portalNews.push(...portal);
    localKnowledge.push(...local);
    teamHighlights = highlights;
    redditChatter = redditHot.map((r) => r.title);
    generalNews = news.map((n) => n.title);
  }

  const timeOfDay = getTimeContext();
  const seasonInfo = getSeasonPhase(new Date().getMonth());

  // Build a context summary string for injection into the prompt
  let contextSummary = `SEASON PHASE: ${seasonInfo.description} `;

  if (liveGames.length > 0) {
    const g = liveGames[0]!;
    if (g.status === 'in') {
      contextSummary += `LIVE GAME: ${g.awayTeam} ${g.awayScore} @ ${g.homeTeam} ${g.homeScore} (${g.clock}, ${g.period}). `;
    } else if (g.status === 'post') {
      contextSummary += `GAME FINAL: ${g.awayTeam} ${g.awayScore} @ ${g.homeTeam} ${g.homeScore}. `;
    } else {
      contextSummary += `UPCOMING: ${g.awayTeam} @ ${g.homeTeam}. `;
    }
  }

  if (portalNews.length > 0) {
    const incoming = portalNews.filter(p => p.direction === 'incoming');
    const outgoing = portalNews.filter(p => p.direction === 'outgoing');
    if (incoming.length) {
      contextSummary += `Portal incoming: ${incoming.map(p => `${p.playerName} (${p.position}) from ${p.otherSchool}`).join(', ')}. `;
    }
    if (outgoing.length) {
      contextSummary += `Portal outgoing: ${outgoing.map(p => `${p.playerName} (${p.position}) to ${p.otherSchool}`).join(', ')}. `;
    }
  }

  if (teamHighlights) {
    contextSummary += `Team stats: ${teamHighlights}. `;
  }

  if (redditChatter.length > 0) {
    contextSummary += `r/CFB is buzzing about: ${redditChatter.slice(0, 3).join(' | ')}. `;
  }

  if (generalNews.length > 0) {
    contextSummary += `News headlines: ${generalNews.slice(0, 3).join(' | ')}. `;
  }

  contextSummary += `Time: ${timeOfDay}.`;

  return {
    liveGames,
    moodDescription,
    portalNews,
    localKnowledge,
    timeOfDay,
    contextSummary,
    teamHighlights,
    redditChatter,
    generalNews,
  };
}

// ============================================================
// Mood auto-updater
// ============================================================

export async function updateBotMoods(): Promise<{ updated: number }> {
  const supabase = createAdminClient();

  // Reset expired moods
  const now = new Date().toISOString();
  await supabase
    .from('profiles')
    .update({ bot_mood: 5, bot_mood_expires_at: null })
    .eq('is_bot', true)
    .lt('bot_mood_expires_at', now)
    .not('bot_mood_expires_at', 'is', null);

  // Fetch ESPN results and set moods based on game outcomes
  const events = await fetchESPNScoreboard();
  if (!events.length) return { updated: 0 };

  // Get all active bot schools
  const { data: botSchools } = await supabase
    .from('profiles')
    .select('id, school_id, bot_personality, school:schools!profiles_school_id_fkey(abbreviation)')
    .eq('is_bot', true)
    .eq('bot_active', true)
    .eq('status', 'ACTIVE');

  if (!botSchools?.length) return { updated: 0 };

  let updated = 0;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  for (const bot of botSchools) {
    const school = Array.isArray(bot.school) ? bot.school[0] : bot.school;
    if (!school) continue;
    const abbr = (school as Record<string, unknown>).abbreviation as string;

    const game = findSchoolGame(events, abbr);
    if (!game || game.status !== 'post') continue;

    const personality = bot.bot_personality && typeof bot.bot_personality === 'object' && 'type' in bot.bot_personality
      ? (bot.bot_personality as Record<string, unknown>).type as string
      : 'homer';

    let newMood = 5;
    const margin = Math.abs(game.homeScore - game.awayScore);

    if (game.isSchoolWinning) {
      newMood = margin > 20 ? 9 : margin > 10 ? 8 : 7;
    } else {
      if (personality === 'homer') {
        newMood = margin > 20 ? 1 : margin > 10 ? 2 : 3;
      } else if (personality === 'analyst') {
        newMood = margin > 20 ? 3 : 4;
      } else {
        newMood = margin > 20 ? 2 : 3;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ bot_mood: newMood, bot_mood_expires_at: expiresAt })
      .eq('id', bot.id);

    if (!error) updated++;
  }

  return { updated };
}

// ============================================================
// Daily reset
// ============================================================

export async function resetDailyCounters(): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('profiles')
    .update({ bot_post_count_today: 0 })
    .eq('is_bot', true);

  // Expire old events
  await supabase
    .from('bot_event_queue')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true);
}
