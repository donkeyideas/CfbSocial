// Shared types for the mobile Game Room (mirrors web GameRoomClient shapes).

export interface MomentPost {
  id: string;
  content: string;
  media_urls: string[];
  touchdown_count: number;
  status?: string;
  author: { username: string; display_name: string | null } | null;
  school: { name: string; abbreviation: string; primary_color: string | null } | null;
}

export interface MomentItem {
  id: string;
  title: string | null;
  opponent: string | null;
  our_score: number | null;
  opp_score: number | null;
  week: string | null;
  result: string | null;
  game_state: string | null;
  is_team_builder: boolean;
  post: MomentPost | null;
}

export interface IssueItem {
  id: string;
  post_id: string;
  position: number;
  page_label: string | null;
  post:
    | (MomentPost & {
        game_moment: Array<Record<string, unknown>> | Record<string, unknown> | null;
      })
    | null;
}

export interface IssueRow {
  id: string;
  issue_number: number;
  title: string | null;
  cover_headline: string | null;
  cover_subtitle: string | null;
  cover_post_id: string | null;
  feed_post_id: string | null;
}

export interface IssueEntry {
  issue: IssueRow;
  items: IssueItem[];
}

export interface LeagueItem {
  id: string;
  name: string;
  platform: string;
  max_users: number;
  filled_count: number;
  sim_schedule: string | null;
  style: string;
  open_schools: string | null;
  status: string;
  join_code: string | null;
  join_password: string | null;
  is_private: boolean;
  cross_play: boolean;
  rules: string | null;
}

export interface RequestItem {
  id: string;
  league_id: string;
  league_name: string;
  preferred_school: string | null;
  platform: string | null;
  message: string | null;
  applicant: { username: string; display_name: string | null; dynasty_tier: string | null } | null;
}

export const issueHasPages = (e: IssueEntry) =>
  e.items.some((it) => it.post && (it.post.media_urls?.length ?? 0) > 0);

export function momentOf(post: IssueItem['post']): Record<string, unknown> | null {
  if (!post?.game_moment) return null;
  return Array.isArray(post.game_moment) ? (post.game_moment[0] ?? null) : post.game_moment;
}
