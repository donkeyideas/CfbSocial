// ============================================================
// Game Room Types — Moments, Dynasty Saves, Online Leagues
// Matches migration 00008_game_room.sql
// ============================================================

import { z } from 'zod';

// ---- Game Moment (companion to a MOMENT post) ----
export interface GameMomentRow {
  id: string;
  post_id: string;
  save_id: string | null;
  school_id: string | null;
  title: string | null;
  opponent: string | null;
  our_score: number | null;
  opp_score: number | null;
  week: string | null;
  season_label: string | null;
  result: string | null;
  game_state: string | null;
  is_team_builder: boolean;
  moment_tags: string[];
  game_version: string;
  created_at: string;
}

// ---- Dynasty Save ----
export interface DynastySaveRow {
  id: string;
  owner_id: string;
  school_id: string | null;
  name: string;
  is_team_builder: boolean;
  team_builder_name: string | null;
  current_year: number;
  current_season_label: string | null;
  record: string | null;
  national_titles: number;
  follower_count: number;
  moment_count: number;
  game_version: string;
  created_at: string;
  updated_at: string;
}

// ---- Online League ----
export interface OnlineLeagueRow {
  id: string;
  commissioner_id: string;
  name: string;
  platform: string;
  max_users: number;
  filled_count: number;
  sim_schedule: string | null;
  style: string;
  rules: string | null;
  tags: string[];
  open_schools: string | null;
  status: 'RECRUITING' | 'FULL' | 'ACTIVE' | 'CLOSED';
  game_version: string;
  created_at: string;
  updated_at: string;
}

export interface LeagueMemberRow {
  id: string;
  league_id: string;
  user_id: string;
  school_id: string | null;
  role: 'COMMISSIONER' | 'COACH';
  joined_at: string;
}

export interface LeagueRequestRow {
  id: string;
  league_id: string;
  user_id: string;
  school_id: string | null;
  preferred_school: string | null;
  platform: string | null;
  message: string | null;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  created_at: string;
  resolved_at: string | null;
}

// ---- Zod input schemas ----
export const CreateMomentInputSchema = z.object({
  content: z.string().max(2000).optional().default(''),
  imageUrls: z.array(z.string().url()).min(1, 'Add at least one screenshot').max(4),
  authorId: z.string().uuid().optional(),   // active profile id (web multi-profile); falls back to auth uid
  schoolId: z.string().uuid().optional().nullable(),
  saveId: z.string().uuid().optional().nullable(),
  title: z.string().max(120).optional().nullable(),
  opponent: z.string().max(80).optional().nullable(),
  ourScore: z.number().int().optional().nullable(),
  oppScore: z.number().int().optional().nullable(),
  week: z.string().max(20).optional().nullable(),
  seasonLabel: z.string().max(40).optional().nullable(),
  result: z.string().max(40).optional().nullable(),
  gameState: z.string().max(20).optional().nullable(),
  isTeamBuilder: z.boolean().optional().default(false),
  momentTags: z.array(z.string()).max(6).optional().default([]),
  gameVersion: z.string().max(20).optional().default('CFB 27'),
});
export type CreateMomentInput = z.infer<typeof CreateMomentInputSchema>;

export const CreateLeagueInputSchema = z.object({
  name: z.string().min(2).max(80),
  platform: z.string().max(20).default('PS5'),
  maxUsers: z.number().int().min(2).max(64).default(32),
  simSchedule: z.string().max(80).optional().nullable(),
  style: z.string().max(20).default('COMPETITIVE'),
  rules: z.string().max(500).optional().nullable(),
  tags: z.array(z.string()).max(8).optional().default([]),
  openSchools: z.string().max(200).optional().nullable(),
  joinCode: z.string().max(40).optional().nullable(),
  joinPassword: z.string().max(60).optional().nullable(),
  isPrivate: z.boolean().optional().default(false),
  crossPlay: z.boolean().optional().default(true),
});
export type CreateLeagueInput = z.infer<typeof CreateLeagueInputSchema>;

export const RequestSlotInputSchema = z.object({
  leagueId: z.string().uuid(),
  preferredSchool: z.string().max(80).optional().nullable(),
  schoolId: z.string().uuid().optional().nullable(),
  platform: z.string().max(20).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
});
export type RequestSlotInput = z.infer<typeof RequestSlotInputSchema>;
