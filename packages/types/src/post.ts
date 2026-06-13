// ============================================================
// Post Types - Matches posts, reactions, reposts, bookmarks tables
// ============================================================

import { z } from 'zod';
import type { PostType, PostStatus, ReactionType } from './enums';

export interface Post {
  id: string;
  authorId: string;
  content: string;
  postType: PostType;
  mediaUrls: string[];
  schoolId: string | null;

  // Engagement (denormalized)
  touchdownCount: number;
  fumbleCount: number;
  replyCount: number;
  repostCount: number;
  bookmarkCount: number;
  viewCount: number;

  // Threading
  parentId: string | null;
  rootId: string | null;

  // Receipt-specific
  receiptPrediction: string | null;
  receiptDeadline: string | null;
  receiptVerified: boolean | null;
  receiptVerifiedAt: string | null;

  // Sideline-specific
  sidelineGame: string | null;
  sidelineQuarter: string | null;
  sidelineTime: string | null;
  sidelineVerified: boolean;

  // Moderation
  status: PostStatus;
  moderationScore: number | null;
  moderationLabels: Record<string, number> | null;
  moderationReason: string | null;
  flaggedAt: string | null;
  removedAt: string | null;

  // Metadata
  isPinned: boolean;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Row shape as returned from Supabase (snake_case) */
export interface PostRow {
  id: string;
  author_id: string;
  content: string;
  post_type: string;
  media_urls: string[];
  school_id: string | null;
  touchdown_count: number;
  fumble_count: number;
  reply_count: number;
  repost_count: number;
  bookmark_count: number;
  view_count: number;
  parent_id: string | null;
  root_id: string | null;
  receipt_prediction: string | null;
  receipt_deadline: string | null;
  receipt_verified: boolean | null;
  receipt_verified_at: string | null;
  sideline_game: string | null;
  sideline_quarter: string | null;
  sideline_time: string | null;
  sideline_verified: boolean;
  status: string;
  moderation_score: number | null;
  moderation_labels: Record<string, number> | null;
  moderation_reason: string | null;
  flagged_at: string | null;
  removed_at: string | null;
  is_pinned: boolean;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reaction {
  id: string;
  userId: string;
  postId: string;
  reactionType: ReactionType;
  createdAt: string;
}

export interface ReactionRow {
  id: string;
  user_id: string;
  post_id: string;
  reaction_type: string;
  created_at: string;
}

export interface Repost {
  id: string;
  userId: string;
  postId: string;
  quote: string | null;
  createdAt: string;
}

export interface RepostRow {
  id: string;
  user_id: string;
  post_id: string;
  quote: string | null;
  created_at: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface BookmarkRow {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

// ---- Zod Validation Schemas ----

export const CreatePostInputSchema = z.object({
  content: z
    .string()
    .min(1, 'Post content is required')
    .max(500, 'Post content must be 500 characters or fewer'),
  postType: z.enum([
    'STANDARD',
    'RECEIPT',
    'SIDELINE',
    'PREDICTION',
    'AGING_TAKE',
    'CHALLENGE_RESULT',
    'MOMENT',
  ]).default('STANDARD'),
  mediaUrls: z.array(z.string().url()).max(4).optional().default([]),
  schoolId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),

  // Receipt-specific fields
  receiptPrediction: z.string().max(500).optional().nullable(),
  receiptDeadline: z.string().datetime().optional().nullable(),

  // Sideline-specific fields
  sidelineGame: z.string().max(200).optional().nullable(),
  sidelineQuarter: z.string().max(10).optional().nullable(),
  sidelineTime: z.string().max(20).optional().nullable(),
});

export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export interface FeedFilters {
  schoolId?: string;
  type?: PostType;
  cursor?: string;
  limit?: number;
}

/** Convert a Supabase post row to a Post interface */
export function toPost(row: PostRow): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    content: row.content,
    postType: row.post_type as PostType,
    mediaUrls: row.media_urls,
    schoolId: row.school_id,
    touchdownCount: row.touchdown_count,
    fumbleCount: row.fumble_count,
    replyCount: row.reply_count,
    repostCount: row.repost_count,
    bookmarkCount: row.bookmark_count,
    viewCount: row.view_count,
    parentId: row.parent_id,
    rootId: row.root_id,
    receiptPrediction: row.receipt_prediction,
    receiptDeadline: row.receipt_deadline,
    receiptVerified: row.receipt_verified,
    receiptVerifiedAt: row.receipt_verified_at,
    sidelineGame: row.sideline_game,
    sidelineQuarter: row.sideline_quarter,
    sidelineTime: row.sideline_time,
    sidelineVerified: row.sideline_verified,
    status: row.status as PostStatus,
    moderationScore: row.moderation_score,
    moderationLabels: row.moderation_labels,
    moderationReason: row.moderation_reason,
    flaggedAt: row.flagged_at,
    removedAt: row.removed_at,
    isPinned: row.is_pinned,
    isEdited: row.is_edited,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
