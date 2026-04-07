export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          requirement_type: string
          requirement_value: number | null
          slug: string
          xp_reward: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requirement_type: string
          requirement_value?: number | null
          slug: string
          xp_reward?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requirement_type?: string
          requirement_value?: number | null
          slug?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      admin_activity_feed: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          is_read: boolean | null
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          severity: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      aging_takes: {
        Row: {
          aged_poorly_votes: number | null
          aged_well_votes: number | null
          community_verdict: string | null
          created_at: string | null
          id: string
          is_surfaced: boolean | null
          post_id: string
          revisit_date: string
          surfaced_at: string | null
          user_id: string
        }
        Insert: {
          aged_poorly_votes?: number | null
          aged_well_votes?: number | null
          community_verdict?: string | null
          created_at?: string | null
          id?: string
          is_surfaced?: boolean | null
          post_id: string
          revisit_date: string
          surfaced_at?: string | null
          user_id: string
        }
        Update: {
          aged_poorly_votes?: number | null
          aged_well_votes?: number | null
          community_verdict?: string | null
          created_at?: string | null
          id?: string
          is_surfaced?: boolean | null
          post_id?: string
          revisit_date?: string
          surfaced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aging_takes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aging_takes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_interactions: {
        Row: {
          completion_tokens: number | null
          cost: number | null
          created_at: string | null
          error_message: string | null
          feature: string
          id: string
          metadata: Json | null
          model: string | null
          prompt_text: string | null
          prompt_tokens: number | null
          provider: string
          response_text: string | null
          response_time_ms: number | null
          sub_type: string | null
          success: boolean | null
          tokens_used: number | null
        }
        Insert: {
          completion_tokens?: number | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          feature: string
          id?: string
          metadata?: Json | null
          model?: string | null
          prompt_text?: string | null
          prompt_tokens?: number | null
          provider: string
          response_text?: string | null
          response_time_ms?: number | null
          sub_type?: string | null
          success?: boolean | null
          tokens_used?: number | null
        }
        Update: {
          completion_tokens?: number | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          feature?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          prompt_text?: string | null
          prompt_tokens?: number | null
          provider?: string
          response_text?: string | null
          response_time_ms?: number | null
          sub_type?: string | null
          success?: boolean | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      ai_moderation_log: {
        Row: {
          action_taken: string | null
          category_scores: Json | null
          cost: number | null
          created_at: string | null
          error_message: string | null
          id: string
          moderation_score: number | null
          post_id: string | null
          prompt_text: string | null
          provider: string
          response_text: string | null
          response_time_ms: number | null
          success: boolean | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          category_scores?: Json | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          moderation_score?: number | null
          post_id?: string | null
          prompt_text?: string | null
          provider?: string
          response_text?: string | null
          response_time_ms?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          category_scores?: Json | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          moderation_score?: number | null
          post_id?: string | null
          prompt_text?: string | null
          provider?: string
          response_text?: string | null
          response_time_ms?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_moderation_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_moderation_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_call_log: {
        Row: {
          cost: number | null
          created_at: string | null
          endpoint: string | null
          error_message: string | null
          id: string
          method: string | null
          provider: string
          request_metadata: Json | null
          response_time_ms: number | null
          status_code: number | null
          success: boolean | null
          tokens_used: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          method?: string | null
          provider: string
          request_metadata?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          success?: boolean | null
          tokens_used?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          method?: string | null
          provider?: string
          request_metadata?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          success?: boolean | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      api_performance_log: {
        Row: {
          created_at: string | null
          endpoint: string
          error: string | null
          id: string
          method: string
          response_time_ms: number
          status_code: number
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error?: string | null
          id?: string
          method: string
          response_time_ms: number
          status_code: number
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error?: string | null
          id?: string
          method?: string
          response_time_ms?: number
          status_code?: number
        }
        Relationships: []
      }
      appeals: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          post_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          post_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          post_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_activity_log: {
        Row: {
          action_type: string
          bot_id: string
          content_preview: string | null
          created_at: string | null
          created_post_id: string | null
          delay_ms: number | null
          error_message: string | null
          event_id: string | null
          id: string
          success: boolean | null
          target_post_id: string | null
          tokens_used: number | null
          trigger_type: string | null
        }
        Insert: {
          action_type: string
          bot_id: string
          content_preview?: string | null
          created_at?: string | null
          created_post_id?: string | null
          delay_ms?: number | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          success?: boolean | null
          target_post_id?: string | null
          tokens_used?: number | null
          trigger_type?: string | null
        }
        Update: {
          action_type?: string
          bot_id?: string
          content_preview?: string | null
          created_at?: string | null
          created_post_id?: string | null
          delay_ms?: number | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          success?: boolean | null
          target_post_id?: string | null
          tokens_used?: number | null
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_activity_log_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_activity_log_created_post_id_fkey"
            columns: ["created_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "bot_event_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_activity_log_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_event_queue: {
        Row: {
          consumed_by: Json | null
          created_at: string | null
          event_type: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_delay_seconds: number | null
          min_delay_seconds: number | null
          payload: Json
          priority: number | null
          scheduled_at: string | null
          school_id: string | null
        }
        Insert: {
          consumed_by?: Json | null
          created_at?: string | null
          event_type: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_delay_seconds?: number | null
          min_delay_seconds?: number | null
          payload?: Json
          priority?: number | null
          scheduled_at?: string | null
          school_id?: string | null
        }
        Update: {
          consumed_by?: Json | null
          created_at?: string | null
          event_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_delay_seconds?: number | null
          min_delay_seconds?: number | null
          payload?: Json
          priority?: number | null
          scheduled_at?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_event_queue_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          challenge_id: string
          created_at: string | null
          id: string
          user_id: string
          voted_for: string
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          id?: string
          user_id: string
          voted_for: string
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          voted_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_voted_for_fkey"
            columns: ["voted_for"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenged_argument: string | null
          challenged_id: string
          challenged_votes: number | null
          challenger_argument: string | null
          challenger_id: string
          challenger_votes: number | null
          created_at: string | null
          id: string
          post_id: string | null
          status: string | null
          topic: string
          updated_at: string | null
          voting_ends_at: string | null
          winner_id: string | null
          xp_awarded: number | null
        }
        Insert: {
          challenged_argument?: string | null
          challenged_id: string
          challenged_votes?: number | null
          challenger_argument?: string | null
          challenger_id: string
          challenger_votes?: number | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          status?: string | null
          topic: string
          updated_at?: string | null
          voting_ends_at?: string | null
          winner_id?: string | null
          xp_awarded?: number | null
        }
        Update: {
          challenged_argument?: string | null
          challenged_id?: string
          challenged_votes?: number | null
          challenger_argument?: string | null
          challenger_id?: string
          challenger_votes?: number | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          status?: string | null
          topic?: string
          updated_at?: string | null
          voting_ends_at?: string | null
          winner_id?: string | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_challenged_id_fkey"
            columns: ["challenged_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          replied_by: string | null
          school_id: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          school_id?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          school_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_stats: {
        Row: {
          avg_session_duration_seconds: number | null
          created_at: string | null
          date: string
          dau: number | null
          id: string
          mau: number | null
          moderation_auto_removes: number | null
          moderation_flags: number | null
          new_users: number | null
          total_challenges: number | null
          total_posts: number | null
          total_reactions: number | null
          total_rivalries: number | null
        }
        Insert: {
          avg_session_duration_seconds?: number | null
          created_at?: string | null
          date: string
          dau?: number | null
          id?: string
          mau?: number | null
          moderation_auto_removes?: number | null
          moderation_flags?: number | null
          new_users?: number | null
          total_challenges?: number | null
          total_posts?: number | null
          total_reactions?: number | null
          total_rivalries?: number | null
        }
        Update: {
          avg_session_duration_seconds?: number | null
          created_at?: string | null
          date?: string
          dau?: number | null
          id?: string
          mau?: number | null
          moderation_auto_removes?: number | null
          moderation_flags?: number | null
          new_users?: number | null
          total_challenges?: number | null
          total_posts?: number | null
          total_reactions?: number | null
          total_rivalries?: number | null
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          subject: string
          trigger_description: string | null
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          subject: string
          trigger_description?: string | null
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          subject?: string
          trigger_description?: string | null
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      fact_checks: {
        Row: {
          ai_analysis: Json | null
          claim: string
          created_at: string | null
          evidence: string | null
          id: string
          post_id: string
          requester_id: string
          updated_at: string | null
          verdict: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          claim: string
          created_at?: string | null
          evidence?: string | null
          id?: string
          post_id: string
          requester_id: string
          updated_at?: string | null
          verdict?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          claim?: string
          created_at?: string | null
          evidence?: string | null
          id?: string
          post_id?: string
          requester_id?: string
          updated_at?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_checks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_checks_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_thread_messages: {
        Row: {
          content: string
          created_at: string | null
          game_thread_id: string
          id: string
          message_type: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          game_thread_id: string
          id?: string
          message_type?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          game_thread_id?: string
          id?: string
          message_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_thread_messages_game_thread_id_fkey"
            columns: ["game_thread_id"]
            isOneToOne: false
            referencedRelation: "game_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_thread_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_threads: {
        Row: {
          away_score: number | null
          away_team: string
          created_at: string | null
          espn_game_id: string
          game_date: string | null
          home_score: number | null
          home_team: string
          id: string
          message_count: number | null
          status: string | null
          status_detail: string | null
          title: string
          updated_at: string | null
          viewer_count: number | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          created_at?: string | null
          espn_game_id: string
          game_date?: string | null
          home_score?: number | null
          home_team: string
          id?: string
          message_count?: number | null
          status?: string | null
          status_detail?: string | null
          title: string
          updated_at?: string | null
          viewer_count?: number | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          created_at?: string | null
          espn_game_id?: string
          game_date?: string | null
          home_score?: number | null
          home_team?: string
          id?: string
          message_count?: number | null
          status?: string | null
          status_detail?: string | null
          title?: string
          updated_at?: string | null
          viewer_count?: number | null
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number | null
          payload: Json | null
          priority: number | null
          result: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number | null
          payload?: Json | null
          priority?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number | null
          payload?: Json | null
          priority?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string | null
          id: string
          level: number
          period: string
          rank: number
          school_id: string | null
          snapshot_date: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: number
          period: string
          rank: number
          school_id?: string | null
          snapshot_date: string
          user_id: string
          xp: number
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number
          period?: string
          rank?: number
          school_id?: string | null
          snapshot_date?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mascot_brackets: {
        Row: {
          champion_school_id: string | null
          created_at: string | null
          current_round: number
          id: string
          name: string
          season_year: number
          status: string
          total_rounds: number
          updated_at: string | null
          voting_hours: number
        }
        Insert: {
          champion_school_id?: string | null
          created_at?: string | null
          current_round?: number
          id?: string
          name: string
          season_year: number
          status?: string
          total_rounds?: number
          updated_at?: string | null
          voting_hours?: number
        }
        Update: {
          champion_school_id?: string | null
          created_at?: string | null
          current_round?: number
          id?: string
          name?: string
          season_year?: number
          status?: string
          total_rounds?: number
          updated_at?: string | null
          voting_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "mascot_brackets_champion_school_id_fkey"
            columns: ["champion_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      mascot_matchups: {
        Row: {
          bracket_id: string
          created_at: string | null
          id: string
          position: number
          round: number
          school_1_id: string | null
          school_1_votes: number
          school_2_id: string | null
          school_2_votes: number
          status: string
          updated_at: string | null
          voting_ends_at: string | null
          voting_starts_at: string | null
          winner_id: string | null
        }
        Insert: {
          bracket_id: string
          created_at?: string | null
          id?: string
          position: number
          round: number
          school_1_id?: string | null
          school_1_votes?: number
          school_2_id?: string | null
          school_2_votes?: number
          status?: string
          updated_at?: string | null
          voting_ends_at?: string | null
          voting_starts_at?: string | null
          winner_id?: string | null
        }
        Update: {
          bracket_id?: string
          created_at?: string | null
          id?: string
          position?: number
          round?: number
          school_1_id?: string | null
          school_1_votes?: number
          school_2_id?: string | null
          school_2_votes?: number
          status?: string
          updated_at?: string | null
          voting_ends_at?: string | null
          voting_starts_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mascot_matchups_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "mascot_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mascot_matchups_school_1_id_fkey"
            columns: ["school_1_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mascot_matchups_school_2_id_fkey"
            columns: ["school_2_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mascot_matchups_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      mascot_votes: {
        Row: {
          created_at: string | null
          id: string
          matchup_id: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          matchup_id: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          matchup_id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mascot_votes_matchup_id_fkey"
            columns: ["matchup_id"]
            isOneToOne: false
            referencedRelation: "mascot_matchups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mascot_votes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mascot_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_events: {
        Row: {
          action_taken: string | null
          ai_labels: Json | null
          ai_reason: string | null
          ai_score: number | null
          created_at: string | null
          event_type: string
          id: string
          moderator_id: string | null
          moderator_notes: string | null
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          ai_labels?: Json | null
          ai_reason?: string | null
          ai_score?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          ai_labels?: Json | null
          ai_reason?: string | null
          ai_score?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_events_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          challenge_notifications: boolean | null
          created_at: string | null
          email_enabled: boolean | null
          follow_notifications: boolean | null
          id: string
          marketing_notifications: boolean | null
          moderation_notifications: boolean | null
          push_enabled: boolean | null
          reaction_notifications: boolean | null
          reply_notifications: boolean | null
          rivalry_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenge_notifications?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          follow_notifications?: boolean | null
          id?: string
          marketing_notifications?: boolean | null
          moderation_notifications?: boolean | null
          push_enabled?: boolean | null
          reaction_notifications?: boolean | null
          reply_notifications?: boolean | null
          rivalry_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenge_notifications?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          follow_notifications?: boolean | null
          id?: string
          marketing_notifications?: boolean | null
          moderation_notifications?: boolean | null
          push_enabled?: boolean | null
          reaction_notifications?: boolean | null
          reply_notifications?: boolean | null
          rivalry_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          challenge_id: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          post_id: string | null
          recipient_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          challenge_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          post_id?: string | null
          recipient_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          challenge_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          post_id?: string | null
          recipient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_api_configs: {
        Row: {
          api_key_encrypted: string | null
          base_url: string | null
          config: Json | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          last_test_success: boolean | null
          last_tested_at: string | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          base_url?: string | null
          config?: Json | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          last_test_success?: boolean | null
          last_tested_at?: string | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          base_url?: string | null
          config?: Json | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          last_test_success?: boolean | null
          last_tested_at?: string | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_insights: {
        Row: {
          category: string
          confidence: number | null
          created_at: string | null
          data: Json | null
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          recommendations: Json | null
          severity: string
          title: string
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string | null
          data?: Json | null
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          recommendations?: Json | null
          severity?: string
          title: string
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          recommendations?: Json | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      portal_players: {
        Row: {
          class_year: string | null
          committed_at: string | null
          committed_school_id: string | null
          created_at: string | null
          entered_portal_at: string | null
          height: string | null
          id: string
          is_featured: boolean | null
          name: string
          portal_window: string | null
          position: string
          previous_school_id: string | null
          previous_school_name: string | null
          season_year: number | null
          star_rating: number | null
          stats: Json | null
          status: string | null
          total_claims: number | null
          updated_at: string | null
          weight: string | null
        }
        Insert: {
          class_year?: string | null
          committed_at?: string | null
          committed_school_id?: string | null
          created_at?: string | null
          entered_portal_at?: string | null
          height?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          portal_window?: string | null
          position: string
          previous_school_id?: string | null
          previous_school_name?: string | null
          season_year?: number | null
          star_rating?: number | null
          stats?: Json | null
          status?: string | null
          total_claims?: number | null
          updated_at?: string | null
          weight?: string | null
        }
        Update: {
          class_year?: string | null
          committed_at?: string | null
          committed_school_id?: string | null
          created_at?: string | null
          entered_portal_at?: string | null
          height?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          portal_window?: string | null
          position?: string
          previous_school_id?: string | null
          previous_school_name?: string | null
          season_year?: number | null
          star_rating?: number | null
          stats?: Json | null
          status?: string | null
          total_claims?: number | null
          updated_at?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_players_committed_school_id_fkey"
            columns: ["committed_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_players_previous_school_id_fkey"
            columns: ["previous_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          bookmark_count: number | null
          content: string
          created_at: string | null
          edited_at: string | null
          flagged_at: string | null
          fumble_count: number | null
          id: string
          is_edited: boolean | null
          is_pinned: boolean | null
          media_urls: string[] | null
          moderation_labels: Json | null
          moderation_reason: string | null
          moderation_score: number | null
          parent_id: string | null
          post_type: string
          receipt_deadline: string | null
          receipt_prediction: string | null
          receipt_verified: boolean | null
          receipt_verified_at: string | null
          removed_at: string | null
          reply_count: number | null
          repost_count: number | null
          root_id: string | null
          school_id: string | null
          sideline_game: string | null
          sideline_quarter: string | null
          sideline_time: string | null
          sideline_verified: boolean | null
          status: string
          touchdown_count: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          bookmark_count?: number | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          flagged_at?: string | null
          fumble_count?: number | null
          id?: string
          is_edited?: boolean | null
          is_pinned?: boolean | null
          media_urls?: string[] | null
          moderation_labels?: Json | null
          moderation_reason?: string | null
          moderation_score?: number | null
          parent_id?: string | null
          post_type?: string
          receipt_deadline?: string | null
          receipt_prediction?: string | null
          receipt_verified?: boolean | null
          receipt_verified_at?: string | null
          removed_at?: string | null
          reply_count?: number | null
          repost_count?: number | null
          root_id?: string | null
          school_id?: string | null
          sideline_game?: string | null
          sideline_quarter?: string | null
          sideline_time?: string | null
          sideline_verified?: boolean | null
          status?: string
          touchdown_count?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          bookmark_count?: number | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          flagged_at?: string | null
          fumble_count?: number | null
          id?: string
          is_edited?: boolean | null
          is_pinned?: boolean | null
          media_urls?: string[] | null
          moderation_labels?: Json | null
          moderation_reason?: string | null
          moderation_score?: number | null
          parent_id?: string | null
          post_type?: string
          receipt_deadline?: string | null
          receipt_prediction?: string | null
          receipt_verified?: boolean | null
          receipt_verified_at?: string | null
          removed_at?: string | null
          reply_count?: number | null
          repost_count?: number | null
          root_id?: string | null
          school_id?: string | null
          sideline_game?: string | null
          sideline_quarter?: string | null
          sideline_time?: string | null
          sideline_verified?: boolean | null
          status?: string
          touchdown_count?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          post_id: string | null
          prediction_text: string
          result: string | null
          target_date: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
          xp_awarded: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          prediction_text: string
          result?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          xp_awarded?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          prediction_text?: string
          result?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_by: string | null
          banned_until: string | null
          banner_color: string | null
          banner_url: string | null
          bio: string | null
          bot_active: boolean | null
          bot_age_bracket: string | null
          bot_last_post_at: string | null
          bot_mood: number | null
          bot_mood_expires_at: string | null
          bot_personality: Json | null
          bot_post_count_today: number | null
          bot_region: string | null
          bot_topics_covered: Json | null
          challenge_losses: number | null
          challenge_wins: number | null
          correct_predictions: number | null
          created_at: string | null
          display_name: string | null
          dynasty_tier: string | null
          follower_count: number | null
          following_count: number | null
          fumble_count: number | null
          id: string
          is_bot: boolean | null
          last_active_at: string | null
          level: number | null
          owner_id: string
          post_count: number | null
          prediction_count: number | null
          push_token: string | null
          role: string
          school_id: string | null
          status: string
          terms_accepted_at: string | null
          touchdown_count: number | null
          updated_at: string | null
          username: string
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_by?: string | null
          banned_until?: string | null
          banner_color?: string | null
          banner_url?: string | null
          bio?: string | null
          bot_active?: boolean | null
          bot_age_bracket?: string | null
          bot_last_post_at?: string | null
          bot_mood?: number | null
          bot_mood_expires_at?: string | null
          bot_personality?: Json | null
          bot_post_count_today?: number | null
          bot_region?: string | null
          bot_topics_covered?: Json | null
          challenge_losses?: number | null
          challenge_wins?: number | null
          correct_predictions?: number | null
          created_at?: string | null
          display_name?: string | null
          dynasty_tier?: string | null
          follower_count?: number | null
          following_count?: number | null
          fumble_count?: number | null
          id: string
          is_bot?: boolean | null
          last_active_at?: string | null
          level?: number | null
          owner_id: string
          post_count?: number | null
          prediction_count?: number | null
          push_token?: string | null
          role?: string
          school_id?: string | null
          status?: string
          terms_accepted_at?: string | null
          touchdown_count?: number | null
          updated_at?: string | null
          username: string
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_by?: string | null
          banned_until?: string | null
          banner_color?: string | null
          banner_url?: string | null
          bio?: string | null
          bot_active?: boolean | null
          bot_age_bracket?: string | null
          bot_last_post_at?: string | null
          bot_mood?: number | null
          bot_mood_expires_at?: string | null
          bot_personality?: Json | null
          bot_post_count_today?: number | null
          bot_region?: string | null
          bot_topics_covered?: Json | null
          challenge_losses?: number | null
          challenge_wins?: number | null
          correct_predictions?: number | null
          created_at?: string | null
          display_name?: string | null
          dynasty_tier?: string | null
          follower_count?: number | null
          following_count?: number | null
          fumble_count?: number | null
          id?: string
          is_bot?: boolean | null
          last_active_at?: string | null
          level?: number | null
          owner_id?: string
          post_count?: number | null
          prediction_count?: number | null
          push_token?: string | null
          role?: string
          school_id?: string | null
          status?: string
          terms_accepted_at?: string | null
          touchdown_count?: number | null
          updated_at?: string | null
          username?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_log: {
        Row: {
          created_at: string
          device_token: string
          error_message: string | null
          id: string
          notification_id: string | null
          platform: string
          sent_at: string | null
          status: string
          system_notification_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          platform: string
          sent_at?: string | null
          status?: string
          system_notification_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          platform?: string
          sent_at?: string | null
          status?: string
          system_notification_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_log_system_notif_fk"
            columns: ["system_notification_id"]
            isOneToOne: false
            referencedRelation: "system_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: string
          post_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reposts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          quote: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          quote?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          quote?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rivalries: {
        Row: {
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_featured: boolean | null
          name: string
          school_1_id: string
          school_1_vote_count: number | null
          school_2_id: string
          school_2_vote_count: number | null
          season_year: number | null
          starts_at: string | null
          status: string | null
          subtitle: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          school_1_id: string
          school_1_vote_count?: number | null
          school_2_id: string
          school_2_vote_count?: number | null
          season_year?: number | null
          starts_at?: string | null
          status?: string | null
          subtitle?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          school_1_id?: string
          school_1_vote_count?: number | null
          school_2_id?: string
          school_2_vote_count?: number | null
          season_year?: number | null
          starts_at?: string | null
          status?: string | null
          subtitle?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rivalries_school_1_id_fkey"
            columns: ["school_1_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivalries_school_2_id_fkey"
            columns: ["school_2_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      rivalry_takes: {
        Row: {
          content: string
          created_at: string | null
          downvotes: number | null
          id: string
          rivalry_id: string
          school_id: string | null
          upvotes: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          rivalry_id: string
          school_id?: string | null
          upvotes?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          rivalry_id?: string
          school_id?: string | null
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rivalry_takes_rivalry_id_fkey"
            columns: ["rivalry_id"]
            isOneToOne: false
            referencedRelation: "rivalries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivalry_takes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivalry_takes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rivalry_votes: {
        Row: {
          created_at: string | null
          id: string
          rivalry_id: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rivalry_id: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rivalry_id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rivalry_votes_rivalry_id_fkey"
            columns: ["rivalry_id"]
            isOneToOne: false
            referencedRelation: "rivalries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivalry_votes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivalry_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_claims: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          player_id: string
          reasoning: string | null
          school_id: string
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          player_id: string
          reasoning?: string | null
          school_id: string
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          player_id?: string
          reasoning?: string | null
          school_id?: string
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_claims_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "portal_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_claims_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          frequency: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          recipients: string[] | null
          report_type: string
        }
        Insert: {
          created_at?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          recipients?: string[] | null
          report_type: string
        }
        Update: {
          created_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          recipients?: string[] | null
          report_type?: string
        }
        Relationships: []
      }
      school_local_knowledge: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_local_knowledge_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          abbreviation: string
          city: string | null
          classification: string
          conference: string
          created_at: string | null
          division: string | null
          id: string
          is_active: boolean | null
          is_fbs: boolean | null
          logo_url: string | null
          mascot: string
          name: string
          primary_color: string
          secondary_color: string
          short_name: string
          slug: string
          stadium: string | null
          state: string | null
          tertiary_color: string | null
          updated_at: string | null
        }
        Insert: {
          abbreviation: string
          city?: string | null
          classification?: string
          conference: string
          created_at?: string | null
          division?: string | null
          id?: string
          is_active?: boolean | null
          is_fbs?: boolean | null
          logo_url?: string | null
          mascot: string
          name: string
          primary_color: string
          secondary_color: string
          short_name: string
          slug: string
          stadium?: string | null
          state?: string | null
          tertiary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string
          city?: string | null
          classification?: string
          conference?: string
          created_at?: string | null
          division?: string | null
          id?: string
          is_active?: boolean | null
          is_fbs?: boolean | null
          logo_url?: string | null
          mascot?: string
          name?: string
          primary_color?: string
          secondary_color?: string
          short_name?: string
          slug?: string
          stadium?: string | null
          state?: string | null
          tertiary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_media_credentials: {
        Row: {
          created_at: string | null
          credentials_encrypted: Json
          id: string
          is_connected: boolean | null
          last_test_success: boolean | null
          last_tested_at: string | null
          platform: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials_encrypted: Json
          id?: string
          is_connected?: boolean | null
          last_test_success?: boolean | null
          last_tested_at?: string | null
          platform: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials_encrypted?: Json
          id?: string
          is_connected?: boolean | null
          last_test_success?: boolean | null
          last_tested_at?: string | null
          platform?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      social_media_posts: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          external_post_id: string | null
          external_post_url: string | null
          id: string
          media_urls: string[] | null
          metadata: Json | null
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          id?: string
          media_urls?: string[] | null
          metadata?: Json | null
          platform: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          external_post_id?: string | null
          external_post_url?: string | null
          id?: string
          media_urls?: string[] | null
          metadata?: Json | null
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string
          failed_count: number
          id: string
          read_count: number
          sent_at: string | null
          sent_count: number
          status: string
          target_audience: string
          target_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          failed_count?: number
          id?: string
          read_count?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          target_audience?: string
          target_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          failed_count?: number
          id?: string
          read_count?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          target_audience?: string
          target_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_log: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_source: string
          p_user_id: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_profile_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

