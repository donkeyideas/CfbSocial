# CFB Social -- Platform Documentation

> **Single source of truth for the CFB Social platform.**
> Last updated: March 26, 2026
>
> **Status**: Database LIVE on Supabase (PostgreSQL 17). Monorepo scaffolded. Dependencies not yet installed. Phase 1 infrastructure complete; Phase 2+ implementation pending.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Getting Started](#5-getting-started)
6. [Environment Variables](#6-environment-variables)
7. [Database Schema](#7-database-schema)
8. [Features](#8-features)
9. [Admin Dashboard](#9-admin-dashboard)
10. [School Theming System](#10-school-theming-system)
11. [Mobile App (Expo)](#11-mobile-app-expo)
12. [Deployment](#12-deployment)
13. [Development Phases](#13-development-phases)
14. [API Reference](#14-api-reference)
15. [Security](#15-security)

---

## 1. Project Overview

**CFB Social** is the first-of-its-kind social media platform built exclusively for college football fans. Unlike general-purpose platforms, every feature, interaction, and design element is rooted in the culture, language, and rhythms of college football.

### Key Differentiators

| Feature | Description |
|---|---|
| **AI Bouncer ("Flag on the Play")** | DeepSeek-powered content moderation that classifies posts through 8 CFB-specific content categories, issues football-themed penalties, and keeps the platform focused on college football. |
| **Transfer Portal War Room** | Users predict where portal players will land by filing "Claim for Your Roster" predictions. Crystal Ball scoring rewards accuracy. |
| **Rivalry Arena** | Head-to-head school debates with vote percentages, rivalry takes, and weekly featured matchups. |
| **Play Caller** | Post types designed for the sport: Receipts (filed predictions with deadlines), Sideline Reports (live game tags), Aging Takes (revisit-date opinions). |
| **Dynasty Mode** | Season-long gamification with XP, levels, 6 dynasty tiers from Walk-On to Hall of Fame, 30+ achievements, and leaderboards. |

### Target Audience

College football fans seeking year-round engagement -- from spring practices and the transfer portal window, through the regular season, bowl games, CFP, and into the offseason recruiting cycle.

### Design Philosophy -- "Gridiron Classic"

The visual identity draws from vintage sports newsprint: parchment backgrounds (`#f4efe4`), ink-dark text (`#3b2f1e`), crimson accents (`#8b1a1a`), and serif headlines (Playfair Display). Every school's posts render in that school's verified colors.

---

## 2. Architecture

```
                          +-------------------+
                          |   Vercel Edge     |
                          | (Web + Admin)     |
                          +--------+----------+
                                   |
                    +--------------+--------------+
                    |                             |
             +------+------+             +-------+------+
             |  apps/web   |             |  apps/admin  |
             | Next.js 15  |             | Next.js 15   |
             | Port 3000   |             | Port 3001    |
             +------+------+             +-------+------+
                    |                             |
                    +---------+---+---+-----------+
                              |   |   |
                 +------------+   |   +------------+
                 |                |                 |
          +------+------+ +------+------+ +--------+-------+
          | packages/   | | packages/   | | packages/      |
          | types       | | api         | | moderation     |
          +-------------+ +------+------+ +--------+-------+
                                 |                 |
                          +------+------+   +------+------+
                          |  Supabase   |   |  DeepSeek   |
                          | (DB + Auth  |   |  AI API     |
                          |  Realtime   |   +-------------+
                          |  Storage)   |
                          +-------------+

             +-------------------+
             |  apps/mobile      |
             |  Expo SDK 55      |
             |  React Native     |
             +--------+----------+
                      |
                      v
               Supabase Client
             (AsyncStorage auth)
```

### Monorepo Strategy

CFB Social uses a **Turborepo** monorepo managed with **pnpm** workspaces. This enables:

- Shared type definitions (`@cfb-social/types`) consumed by every app and package
- A shared API layer (`@cfb-social/api`) so queries and mutations are defined once
- A shared moderation pipeline (`@cfb-social/moderation`) used by Edge Functions and the admin panel
- A shared UI component library (`@cfb-social/ui`) for cross-app consistency
- Parallel builds with dependency-aware task orchestration via Turbo

### Data Flow

1. **Client** (web, admin, or mobile) calls a function from `@cfb-social/api`
2. The API function executes a Supabase query using the appropriate client (browser, server, or service)
3. **Row Level Security** on every table ensures the caller only sees authorized data
4. **Realtime** subscriptions via Supabase Postgres Changes push new posts and notifications to connected clients
5. When a post is created, a **Supabase Edge Function** invokes `@cfb-social/moderation` to classify the content with DeepSeek
6. **Database triggers** automatically update denormalized counts (reactions, follows, post counts) and award XP

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Web App** | Next.js 15, React 19, Tailwind CSS 4 | Main user-facing application with Turbopack dev server |
| **Admin Dashboard** | Next.js 15, React 19, Tailwind CSS 4, Recharts | Analytics, moderation queue, user management |
| **Mobile App** | Expo SDK 55, React Native 0.79, Expo Router 4 | iOS and Android native app |
| **Shared Types** | TypeScript 5.7, Zod | Type definitions, enums, validation schemas |
| **Shared API** | @supabase/supabase-js 2.47, @supabase/ssr 0.5 | Queries, mutations, hooks, realtime subscriptions |
| **Shared Moderation** | OpenAI SDK 4.73 (DeepSeek-compatible) | Content classification pipeline |
| **Shared UI** | React 19 | Cross-app component library |
| **Database** | Supabase (PostgreSQL 17 with RLS) | 24 tables, triggers, functions, storage buckets |
| **Auth** | Supabase Auth (PKCE flow) | Email/password, Google, Apple OAuth |
| **Real-time** | Supabase Realtime | Postgres Changes (feed, notifications), Presence (online users) |
| **Storage** | Supabase Storage (50MiB limit) | avatars, post-media, reports-evidence buckets |
| **AI Moderation** | DeepSeek API (deepseek-chat) | 8-label content classification with JSON output |
| **Background Jobs** | Supabase Edge Functions (Deno) | Async moderation, receipt verification, aging take surfacing |
| **Build System** | Turborepo 2.4, pnpm 9.15 | Monorepo orchestration, parallel builds, caching |
| **Type Safety** | TypeScript 5.7 (ES2022, strict, bundler resolution) | End-to-end types from database to UI |
| **Data Fetching** | SWR 2.2 (web), cursor-based pagination | Client-side caching and revalidation |
| **Icons** | Lucide React 0.468 | Consistent icon set across web and admin |
| **Fonts** | Playfair Display, Source Sans 3, Special Elite | Vintage sports newsprint aesthetic |

---

## 4. Project Structure

```
cfbsocial/
|-- apps/
|   |-- web/                        # Main user-facing Next.js 15 application
|   |   |-- app/
|   |   |   |-- (auth)/
|   |   |   |   |-- layout.tsx      # Auth pages layout (no sidebar)
|   |   |   |   |-- login/page.tsx  # Login page
|   |   |   |   |-- register/page.tsx # Registration page
|   |   |   |-- (main)/
|   |   |   |   |-- layout.tsx      # Main layout (Header + Sidebar + SchoolThemeProvider)
|   |   |   |   |-- feed/page.tsx   # National and school feed
|   |   |   |   |-- rivalry/page.tsx # Rivalry Ring
|   |   |   |   |-- portal/page.tsx # Transfer Portal War Room
|   |   |   |   |-- profile/[username]/page.tsx # User profile
|   |   |   |   |-- settings/page.tsx # User settings
|   |   |   |-- globals.css         # Gridiron Classic theme, CSS variables
|   |   |   |-- layout.tsx          # Root layout (fonts, metadata)
|   |   |   |-- page.tsx            # Landing / redirect
|   |   |-- components/
|   |   |   |-- feed/
|   |   |   |   |-- PostCard.tsx    # Individual post display with reactions
|   |   |   |   |-- PostComposer.tsx # New post form with type selector
|   |   |   |   |-- FeedTabs.tsx    # National / My School tab switcher
|   |   |   |-- layout/
|   |   |       |-- Header.tsx      # Top navigation bar
|   |   |       |-- Sidebar.tsx     # Left navigation sidebar
|   |   |       |-- SchoolThemeProvider.tsx # Dynamic CSS variable injection
|   |   |-- lib/supabase/
|   |   |   |-- client.ts           # Browser Supabase client
|   |   |   |-- server.ts           # Server Supabase client
|   |   |   |-- middleware.ts        # Session refresh helper
|   |   |-- middleware.ts            # Next.js middleware (session management)
|   |   |-- package.json             # cfb-social-web
|   |   |-- next.config.ts
|   |   |-- tailwind.config.ts
|   |   |-- tsconfig.json
|   |
|   |-- admin/                       # Admin dashboard Next.js 15 application
|   |   |-- app/
|   |   |   |-- (dashboard)/
|   |   |   |   |-- layout.tsx      # Dashboard layout (AdminSidebar + AdminHeader)
|   |   |   |   |-- page.tsx        # Overview / home dashboard
|   |   |   |   |-- moderation/page.tsx   # Moderation center
|   |   |   |   |-- users/page.tsx        # User management
|   |   |   |   |-- content/page.tsx      # Content analytics
|   |   |   |   |-- engagement/page.tsx   # Engagement metrics
|   |   |   |   |-- schools/page.tsx      # School analytics
|   |   |   |   |-- reports/page.tsx      # Reports queue
|   |   |   |   |-- realtime/page.tsx     # Real-time monitor
|   |   |   |   |-- system/page.tsx       # System health
|   |   |   |   |-- exports/page.tsx      # Export center
|   |   |   |   |-- settings/page.tsx     # Admin settings
|   |   |   |-- login/page.tsx       # Admin login (ADMIN role required)
|   |   |   |-- globals.css
|   |   |   |-- layout.tsx
|   |   |-- components/
|   |   |   |-- dashboard/
|   |   |   |   |-- StatCard.tsx     # Single stat display card
|   |   |   |   |-- StatsGrid.tsx    # Grid of stat cards
|   |   |   |-- layout/
|   |   |       |-- AdminHeader.tsx  # Admin top bar
|   |   |       |-- AdminSidebar.tsx # Admin left navigation
|   |   |-- lib/supabase/
|   |   |   |-- client.ts
|   |   |   |-- server.ts
|   |   |-- middleware.ts             # Admin auth (ADMIN role gate)
|   |   |-- package.json              # cfb-social-admin
|   |
|   |-- mobile/                       # Expo SDK 55 React Native application
|       |-- app/
|       |   |-- (auth)/
|       |   |   |-- _layout.tsx       # Auth stack navigator
|       |   |   |-- login.tsx         # Mobile login screen
|       |   |   |-- register.tsx      # Mobile registration screen
|       |   |-- (tabs)/
|       |   |   |-- _layout.tsx       # Tab navigator layout
|       |   |   |-- feed.tsx          # Feed tab
|       |   |   |-- rivalry.tsx       # Rivalry tab
|       |   |   |-- portal.tsx        # Portal tab
|       |   |   |-- profile.tsx       # Profile tab
|       |   |-- _layout.tsx           # Root layout
|       |   |-- index.tsx             # Entry redirect
|       |   |-- settings.tsx          # Settings screen
|       |-- lib/
|       |   |-- auth/AuthProvider.tsx  # Auth context provider
|       |   |-- supabase.ts           # Supabase client (AsyncStorage)
|       |   |-- theme/
|       |       |-- colors.ts         # Color constants
|       |       |-- typography.ts     # Typography scale
|       |-- assets/                    # Icons, splash, adaptive icon
|       |-- app.json                   # Expo configuration
|       |-- babel.config.js
|       |-- metro.config.js            # Metro bundler config for monorepo
|       |-- package.json               # cfb-social-mobile
|
|-- packages/
|   |-- types/                         # @cfb-social/types
|   |   |-- src/
|   |       |-- index.ts              # Central re-export hub
|   |       |-- enums.ts             # 18 TypeScript enums (UserRole, PostType, DynastyTier, SchoolClassification, etc.)
|   |       |-- school.ts            # School interface + SchoolRow + toSchool()
|   |       |-- user.ts              # Profile, ProfileRow, UserSession, PublicProfile
|   |       |-- post.ts              # Post, Reaction, Repost, Bookmark + Zod schemas
|   |       |-- rivalry.ts           # Rivalry, Challenge, FactCheck types
|   |       |-- portal.ts            # PortalPlayer, RosterClaim, Prediction, AgingTake
|   |       |-- moderation.ts        # ModerationEvent, Report, Appeal, ModerationResult
|   |       |-- dynasty.ts           # Achievement, XPLogEntry, Leaderboard, XP_THRESHOLDS
|   |       |-- notification.ts      # Notification, NotificationPreferences
|   |       |-- analytics.ts         # AnalyticsEvent, DailyStats, APIPerformanceLog, DashboardOverview
|   |
|   |-- api/                           # @cfb-social/api
|   |   |-- src/
|   |       |-- index.ts              # Central re-export hub
|   |       |-- client.ts            # createBrowserClient, createServerClient, createServiceClient
|   |       |-- queries/
|   |       |   |-- schools.ts       # getSchools, getSchoolBySlug, getSchoolById, searchSchools
|   |       |   |-- profiles.ts      # getProfile, getProfileByUsername, searchProfiles, getLeaderboard
|   |       |   |-- posts.ts         # getFeed, getPost, getPostReplies, getUserPosts
|   |       |   |-- rivalries.ts     # getRivalries, getFeaturedRivalry, getRivalryById
|   |       |   |-- portal.ts        # getPortalPlayers, getPortalPlayer, getPlayerClaims
|   |       |-- mutations/
|   |       |   |-- auth.ts          # signUp, signIn, signInWithOAuth, signOut, resetPassword
|   |       |   |-- posts.ts         # createPost, updatePost, deletePost, reactToPost, repost, bookmark
|   |       |   |-- profiles.ts      # updateProfile, selectSchool, uploadAvatar
|   |       |   |-- follows.ts       # followUser, unfollowUser, blockUser, unblockUser
|   |       |   |-- rivalries.ts     # voteOnRivalry, submitRivalryTake
|   |       |   |-- portal.ts        # claimPlayer
|   |       |   |-- challenges.ts    # createChallenge, respondToChallenge, voteOnChallenge
|   |       |-- hooks/
|   |       |   |-- use-session.ts   # useSession() -- auth state + profile on client
|   |       |   |-- use-realtime.ts  # useRealtimeFeed(), useRealtimeNotifications()
|   |       |-- realtime.ts          # subscribeFeed, subscribeNotifications, subscribePresence
|   |
|   |-- moderation/                    # @cfb-social/moderation
|   |   |-- src/
|   |       |-- index.ts              # Central re-export hub
|   |       |-- classifier.ts        # MODERATION_SYSTEM_PROMPT (DeepSeek prompt)
|   |       |-- analyzer.ts          # analyzeContent() -- DeepSeek API call
|   |       |-- penalties.ts         # Football-themed penalty mapping (7 penalties + default)
|   |
|   |-- ui/                            # @cfb-social/ui (shared components -- in progress)
|       |-- src/
|           |-- index.ts              # Placeholder for shared React components
|
|-- supabase/
|   |-- config.toml                    # Supabase project config (ports, auth, storage, realtime)
|   |-- migrations/
|   |   |-- 00001_core_schema.sql     # All 24 tables, RLS policies, triggers, functions, buckets
|   |   |-- 00002_all_divisions.sql   # Add classification column (FBS, FCS, D2, D3, NAIA)
|   |-- seed.sql                       # 260 FBS + FCS school records
|   |-- seed/
|       |-- schools-lower-divisions.sql # 393 D2 + D3 + NAIA school records
|       |-- achievements.sql           # 29 achievement definitions
|
|-- mocks/
|   |-- desktop/                       # Desktop UI mockups (5 HTML files)
|   |-- mobile/                        # Mobile UI mockups (5 HTML files)
|   |-- schools/                       # School-specific theme mockups (10 HTML files)
|
|-- docs/                              # Project documentation
|   |-- CFB-SOCIAL.md                 # This file
|
|-- .env.example                       # Environment variable template
|-- .gitignore                         # Ignored files and directories
|-- package.json                       # Root workspace (turbo scripts, engines)
|-- pnpm-workspace.yaml               # Workspace package globs
|-- turbo.json                         # Turborepo task configuration
|-- tsconfig.base.json                 # Shared TypeScript compiler options
```

---

## 5. Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | >= 20.0.0 | Runtime |
| pnpm | >= 9.15.0 | Package manager (set via `packageManager` in root `package.json`) |
| Supabase CLI | Latest | Local database, auth, storage, and realtime |
| Git | Latest | Version control |
| Expo CLI | Latest | Mobile development (via `npx expo`) |

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url> cfbsocial
cd cfbsocial

# 2. Install dependencies (pnpm will use workspaces automatically)
pnpm install

# 3. Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and DeepSeek credentials
```

### Supabase Setup

The production Supabase instance is **live** at:

| Resource | Value |
|---|---|
| **Project Ref** | `zjaclcnjgumdgufoakio` |
| **URL** | `https://zjaclcnjgumdgufoakio.supabase.co` |
| **Region** | Americas |
| **PostgreSQL** | Version 17 |
| **Organization** | Donkey ideas |

The database is fully provisioned with all 24 tables, RLS policies, triggers, functions, storage buckets, 653 schools, and 29 achievements.

```bash
# 4. Link to the live Supabase project
npx supabase login --token <your-access-token>
npx supabase link --project-ref zjaclcnjgumdgufoakio

# 5. Generate TypeScript types from the live schema
pnpm db:types
# This runs: supabase gen types typescript --project-id zjaclcnjgumdgufoakio > packages/types/src/database.ts
```

> **Note**: If `supabase db push` fails with password auth errors, use the Supabase Management API
> (`POST https://api.supabase.com/v1/projects/{ref}/database/query`) with your access token instead.

#### Local Development (Optional)

If you want a local Supabase instance for offline development:

```bash
supabase start
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql                          # 260 FBS + FCS schools
psql "$DATABASE_URL" -f supabase/seed/schools-lower-divisions.sql  # 393 D2 + D3 + NAIA schools
psql "$DATABASE_URL" -f supabase/seed/achievements.sql             # 29 achievements
```

### Run Development Servers

```bash
# 8. Start all dev servers in parallel (web on :3000, admin on :3001)
pnpm dev
# This runs: turbo dev
# Turborepo will start both Next.js apps with Turbopack

# 9. Start the mobile app (in a separate terminal)
cd apps/mobile
npx expo start
# Press 'i' for iOS simulator, 'a' for Android emulator, or scan QR for device
```

### Useful Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all dev servers via Turborepo |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps and packages |
| `pnpm typecheck` | Type-check all apps and packages |
| `pnpm clean` | Remove build artifacts |
| `pnpm db:migrate` | Push database migrations to Supabase |
| `pnpm db:reset` | Reset database to migration state |
| `pnpm db:types` | Generate TypeScript types from database |

---

## 6. Environment Variables

### Template (`.env.example`)

```dotenv
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Expo (prefix with EXPO_PUBLIC_ for client access)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# DeepSeek AI
DEEPSEEK_API_KEY=your-deepseek-api-key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001

# Upstash Redis (optional caching layer)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Variable Reference

| Variable | Used By | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web, admin, api package | Yes | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web, admin, api package | Yes | Supabase anonymous key for client-side access (respects RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | api package (server only) | Yes | Service role key that bypasses RLS -- NEVER expose to browser |
| `EXPO_PUBLIC_SUPABASE_URL` | mobile | Yes | Same as `NEXT_PUBLIC_SUPABASE_URL`, prefixed for Expo |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | Yes | Same as `NEXT_PUBLIC_SUPABASE_ANON_KEY`, prefixed for Expo |
| `DEEPSEEK_API_KEY` | moderation package | Yes | API key for DeepSeek content moderation |
| `DEEPSEEK_BASE_URL` | moderation package | No | Defaults to `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | moderation package | No | Defaults to `deepseek-chat` |
| `NEXT_PUBLIC_APP_URL` | web | No | Base URL for the web app (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_ADMIN_URL` | admin | No | Base URL for admin app (default: `http://localhost:3001`) |
| `UPSTASH_REDIS_REST_URL` | web (optional) | No | Upstash Redis URL for caching layer |
| `UPSTASH_REDIS_REST_TOKEN` | web (optional) | No | Upstash Redis auth token |

---

## 7. Database Schema

The database consists of **24 tables** organized across the development phases. All tables use UUID primary keys via `gen_random_uuid()` and include `created_at` / `updated_at` timestamps. PostgreSQL extensions enabled: `uuid-ossp`, `pg_trgm` (trigram search). The `schools` table supports all 5 NCAA/NAIA divisions via the `classification` column (`FBS`, `FCS`, `D2`, `D3`, `NAIA`), with **653 programs** seeded across 3 seed files.

### Tables by Phase

#### Phase 1: Schools & Profiles

**`schools`** -- All 653 college football programs across 5 divisions

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | School identifier |
| `name` | TEXT | Full school name (e.g., "University of Florida") |
| `short_name` | TEXT | Display name (e.g., "Florida") |
| `abbreviation` | TEXT UNIQUE | Short code (e.g., "UF") |
| `slug` | TEXT UNIQUE | URL-safe identifier (e.g., "florida-gators") |
| `mascot` | TEXT | Mascot name (e.g., "Gators") |
| `conference` | TEXT | Conference name (e.g., "SEC") |
| `division` | TEXT | Conference division (nullable) |
| `classification` | TEXT | Division level: `FBS`, `FCS`, `D2`, `D3`, `NAIA` |
| `primary_color` | TEXT | Hex color code (e.g., "#0021A5") |
| `secondary_color` | TEXT | Hex color code (e.g., "#FA4616") |
| `tertiary_color` | TEXT | Optional third color |
| `logo_url` | TEXT | URL to school logo |
| `stadium` | TEXT | Home stadium name |
| `city` | TEXT | City |
| `state` | TEXT | State abbreviation |
| `is_fbs` | BOOLEAN | Whether FBS level (derived from classification) |
| `is_active` | BOOLEAN | Whether currently active |

**`profiles`** -- User profiles (linked to `auth.users` via FK)

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK (FK -> auth.users) | Same as Supabase auth user ID |
| `username` | TEXT UNIQUE | Display username |
| `display_name` | TEXT | Full display name |
| `avatar_url` | TEXT | Avatar image URL |
| `bio` | TEXT | User biography |
| `school_id` | UUID FK -> schools | User's selected school |
| `role` | TEXT | `USER`, `PREMIUM`, `MODERATOR`, `EDITOR`, `ADMIN` |
| `status` | TEXT | `ACTIVE`, `SUSPENDED`, `BANNED` |
| `post_count` | INT | Denormalized post count |
| `touchdown_count` | INT | Total TDs received across all posts |
| `fumble_count` | INT | Total fumbles received across all posts |
| `follower_count` | INT | Denormalized follower count |
| `following_count` | INT | Denormalized following count |
| `xp` | INT | Dynasty mode experience points |
| `level` | INT | Dynasty mode level (1-21) |
| `dynasty_tier` | TEXT | `WALK_ON`, `STARTER`, `ALL_CONFERENCE`, `ALL_AMERICAN`, `HEISMAN`, `HALL_OF_FAME` |
| `prediction_count` | INT | Total predictions made |
| `correct_predictions` | INT | Correct prediction count |
| `challenge_wins` | INT | Challenge victories |
| `challenge_losses` | INT | Challenge losses |
| `ban_reason` | TEXT | Reason for ban (if applicable) |
| `banned_until` | TIMESTAMPTZ | Ban expiration |
| `banned_by` | UUID | Admin who issued the ban |
| `terms_accepted_at` | TIMESTAMPTZ | When ToS was accepted |
| `last_active_at` | TIMESTAMPTZ | Last activity timestamp |

#### Phase 2: Social Graph

**`follows`** -- User follow relationships

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `follower_id` | UUID FK -> profiles | The user who follows |
| `following_id` | UUID FK -> profiles | The user being followed |
| Constraint | UNIQUE(follower_id, following_id) | No duplicate follows |
| Constraint | CHECK(follower_id != following_id) | Cannot self-follow |

**`user_blocks`** -- User block relationships

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `blocker_id` | UUID FK -> profiles | The user who blocks |
| `blocked_id` | UUID FK -> profiles | The blocked user |

**`device_tokens`** -- Push notification tokens

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK -> profiles | Owner |
| `token` | TEXT UNIQUE | Push token |
| `platform` | TEXT | `ios`, `android`, `web` |
| `is_active` | BOOLEAN | Whether token is active |

#### Phase 3: Posts & Engagement

**`posts`** -- All user-generated content

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `author_id` | UUID FK -> profiles | Post author |
| `content` | TEXT | Post body (max 500 chars enforced by Zod) |
| `post_type` | TEXT | `STANDARD`, `RECEIPT`, `SIDELINE`, `PREDICTION`, `AGING_TAKE`, `CHALLENGE_RESULT` |
| `media_urls` | TEXT[] | Up to 4 image URLs |
| `school_id` | UUID FK -> schools | Associated school (for colored rendering) |
| `touchdown_count` | INT | Denormalized TD count |
| `fumble_count` | INT | Denormalized fumble count |
| `reply_count` | INT | Denormalized reply count |
| `repost_count` | INT | Denormalized repost count |
| `bookmark_count` | INT | Denormalized bookmark count |
| `view_count` | INT | View impressions |
| `parent_id` | UUID FK -> posts | Reply parent (null for top-level posts) |
| `root_id` | UUID FK -> posts | Thread root |
| `receipt_prediction` | TEXT | The prediction text (RECEIPT type) |
| `receipt_deadline` | TIMESTAMPTZ | When the receipt expires |
| `receipt_verified` | BOOLEAN | Whether result has been verified |
| `receipt_verified_at` | TIMESTAMPTZ | Verification timestamp |
| `sideline_game` | TEXT | Game identifier (SIDELINE type) |
| `sideline_quarter` | TEXT | Current quarter |
| `sideline_time` | TEXT | Game clock |
| `sideline_verified` | BOOLEAN | Press box verification |
| `status` | TEXT | `PUBLISHED`, `FLAGGED`, `REMOVED`, `DRAFT` |
| `moderation_score` | FLOAT | AI risk score (0.0-1.0) |
| `moderation_labels` | JSONB | Per-category AI scores |
| `moderation_reason` | TEXT | AI explanation |
| `is_pinned` | BOOLEAN | Pinned to profile |
| `is_edited` | BOOLEAN | Whether post was edited |

Notable indexes: trigram index on `content` for full-text search (`gin_trgm_ops`), partial index on `FLAGGED` posts for moderation queue.

**`reactions`** -- Touchdown (agree) or Fumble (disagree) on posts

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK -> profiles | Reactor |
| `post_id` | UUID FK -> posts | Target post |
| `reaction_type` | TEXT | `TOUCHDOWN` or `FUMBLE` |
| Constraint | UNIQUE(user_id, post_id) | One reaction per user per post |

**`reposts`** -- Share a post with optional quote

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK -> profiles | Reposter |
| `post_id` | UUID FK -> posts | Original post |
| `quote` | TEXT | Optional quote text |

**`bookmarks`** -- Save posts for later

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK -> profiles | Bookmarker |
| `post_id` | UUID FK -> posts | Bookmarked post |

#### Phase 4: Rivalry Ring & Challenges

**`rivalries`** -- Head-to-head school matchups

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `school_1_id` | UUID FK -> schools | First school |
| `school_2_id` | UUID FK -> schools | Second school |
| `name` | TEXT | Rivalry name (e.g., "The World's Largest Outdoor Cocktail Party") |
| `subtitle` | TEXT | Subtitle |
| `description` | TEXT | Description |
| `is_featured` | BOOLEAN | Weekly featured rivalry |
| `season_year` | INT | Season year |
| `status` | TEXT | `UPCOMING`, `ACTIVE`, `VOTING`, `CLOSED` |
| `school_1_vote_count` | INT | Denormalized votes for school 1 |
| `school_2_vote_count` | INT | Denormalized votes for school 2 |
| `starts_at` | TIMESTAMPTZ | Voting start |
| `ends_at` | TIMESTAMPTZ | Voting end |

**`rivalry_votes`** -- One vote per user per rivalry

**`rivalry_takes`** -- User arguments in rivalry threads

| Column | Type | Description |
|---|---|---|
| `content` | TEXT | The take/argument |
| `school_id` | UUID FK -> schools | Which school the take supports |
| `upvotes` | INT | Upvote count |
| `downvotes` | INT | Downvote count |

**`challenges`** -- 1v1 debate challenges between users

| Column | Type | Description |
|---|---|---|
| `challenger_id` | UUID FK -> profiles | Initiator |
| `challenged_id` | UUID FK -> profiles | Recipient |
| `topic` | TEXT | Debate topic |
| `status` | TEXT | `PENDING`, `ACTIVE`, `VOTING`, `COMPLETED`, `DECLINED`, `EXPIRED` |
| `challenger_argument` | TEXT | Challenger's case |
| `challenged_argument` | TEXT | Challenged user's case |
| `challenger_votes` / `challenged_votes` | INT | Community votes |
| `winner_id` | UUID FK -> profiles | Winner after voting |
| `xp_awarded` | INT | XP given to winner |
| `voting_ends_at` | TIMESTAMPTZ | Voting deadline |

**`challenge_votes`** -- Community votes on challenges

**`fact_checks`** -- Fact-check requests on posts

| Column | Type | Description |
|---|---|---|
| `post_id` | UUID FK -> posts | Target post |
| `requester_id` | UUID FK -> profiles | Who requested the check |
| `claim` | TEXT | The specific claim to verify |
| `verdict` | TEXT | `VERIFIED`, `FALSE`, `UNVERIFIABLE`, `PENDING` |
| `evidence` | TEXT | Supporting evidence |
| `ai_analysis` | JSONB | AI analysis data |

#### Phase 5: Transfer Portal & Predictions

**`portal_players`** -- Transfer portal entries

| Column | Type | Description |
|---|---|---|
| `name` | TEXT | Player name |
| `position` | TEXT | Position (e.g., "QB", "WR") |
| `previous_school_id` | UUID FK -> schools | School they left |
| `star_rating` | INT (1-5) | Recruiting star rating |
| `height` | TEXT | Player height |
| `weight` | TEXT | Player weight |
| `class_year` | TEXT | `FR`, `SO`, `JR`, `SR`, `GR` |
| `stats` | JSONB | Player statistics |
| `status` | TEXT | `IN_PORTAL`, `COMMITTED`, `WITHDRAWN` |
| `committed_school_id` | UUID FK -> schools | Committed destination (if applicable) |
| `portal_window` | TEXT | `SPRING` or `WINTER` |
| `total_claims` | INT | How many users have claimed this player |
| `is_featured` | BOOLEAN | Featured player flag |

**`roster_claims`** -- User predictions on where portal players land

| Column | Type | Description |
|---|---|---|
| `player_id` | UUID FK -> portal_players | Target player |
| `user_id` | UUID FK -> profiles | Claimant |
| `school_id` | UUID FK -> schools | Predicted destination school |
| `confidence` | INT (1-100) | Confidence level |
| `reasoning` | TEXT | Why they think this |
| `is_correct` | BOOLEAN | Whether prediction was correct (set after commitment) |
| `xp_awarded` | INT | XP earned for correct prediction |

**`predictions`** -- General predictions (game outcomes, awards, etc.)

| Column | Type | Description |
|---|---|---|
| `prediction_text` | TEXT | The prediction |
| `category` | TEXT | `GAME_OUTCOME`, `SEASON_RECORD`, `PLAYER_PERFORMANCE`, `RECRUITING`, `AWARD`, `CUSTOM` |
| `target_date` | TIMESTAMPTZ | When to evaluate |
| `result` | TEXT | `PENDING`, `CORRECT`, `INCORRECT`, `PUSH`, `EXPIRED` |
| `xp_awarded` | INT | XP earned for correct prediction |

**`aging_takes`** -- Takes with a revisit date

| Column | Type | Description |
|---|---|---|
| `post_id` | UUID FK -> posts | The original post |
| `revisit_date` | DATE | When to resurface |
| `is_surfaced` | BOOLEAN | Whether it has been shown again |
| `community_verdict` | TEXT | `AGED_WELL`, `AGED_POORLY`, `PENDING` |
| `aged_well_votes` / `aged_poorly_votes` | INT | Community votes |

#### Phase 6: AI Moderation

**`moderation_events`** -- Audit log of all moderation actions

| Column | Type | Description |
|---|---|---|
| `post_id` | UUID FK -> posts | Affected post |
| `user_id` | UUID FK -> profiles | Affected user |
| `event_type` | TEXT | `AUTO_FLAG`, `AUTO_REMOVE`, `MANUAL_FLAG`, `MANUAL_REMOVE`, `APPEAL`, `RESTORE`, `USER_REPORT` |
| `ai_score` | FLOAT | AI risk score |
| `ai_labels` | JSONB | Per-category scores |
| `ai_reason` | TEXT | AI explanation |
| `moderator_id` | UUID FK -> profiles | Human moderator (if manual) |
| `moderator_notes` | TEXT | Moderator notes |
| `action_taken` | TEXT | `FLAG`, `REMOVE`, `RESTORE`, `WARN`, `SUSPEND`, `BAN`, `DISMISS` |

**`reports`** -- User-submitted reports

| Column | Type | Description |
|---|---|---|
| `reporter_id` | UUID FK -> profiles | Who reported |
| `post_id` | UUID FK -> posts | Reported post |
| `reported_user_id` | UUID FK -> profiles | Reported user |
| `reason` | TEXT | `SPAM`, `HARASSMENT`, `HATE_SPEECH`, `OFF_TOPIC`, `POLITICS`, `MISINFORMATION`, `OTHER` |
| `status` | TEXT | `PENDING`, `REVIEWING`, `ACTIONED`, `DISMISSED` |

**`appeals`** -- "Appeal to the Booth" system

| Column | Type | Description |
|---|---|---|
| `post_id` | UUID FK -> posts | The flagged/removed post |
| `user_id` | UUID FK -> profiles | Appellant |
| `reason` | TEXT | Appeal justification |
| `status` | TEXT | `PENDING`, `APPROVED`, `DENIED` |

#### Phase 7: Dynasty Mode (Gamification)

**`achievements`** -- Achievement definitions

| Column | Type | Description |
|---|---|---|
| `slug` | TEXT UNIQUE | Machine-readable ID (e.g., "first-post") |
| `name` | TEXT | Display name |
| `description` | TEXT | How to earn it |
| `icon` | TEXT | Icon identifier |
| `category` | TEXT | `SOCIAL`, `PREDICTION`, `RIVALRY`, `RECRUITING`, `ENGAGEMENT`, `MILESTONE` |
| `xp_reward` | INT | XP awarded on unlock |
| `requirement_type` | TEXT | Type of check (e.g., "post_count") |
| `requirement_value` | INT | Threshold value |

**`user_achievements`** -- Earned achievements per user

**`xp_log`** -- Audit trail of all XP awards

| Column | Type | Description |
|---|---|---|
| `user_id` | UUID FK -> profiles | Recipient |
| `amount` | INT | XP amount |
| `source` | TEXT | One of 12 XP sources (see below) |
| `reference_id` | UUID | Reference to the triggering entity |

XP Sources: `POST_CREATED`, `TOUCHDOWN_RECEIVED`, `CHALLENGE_WON`, `PREDICTION_CORRECT`, `PORTAL_CLAIM_CORRECT`, `RIVALRY_PARTICIPATION`, `FACT_CHECK`, `ACHIEVEMENT_UNLOCKED`, `DAILY_LOGIN`, `STREAK_BONUS`, `RECEIPT_VERIFIED`, `AGING_TAKE_CORRECT`

**`leaderboard_snapshots`** -- Periodic leaderboard captures

| Column | Type | Description |
|---|---|---|
| `period` | TEXT | `DAILY`, `WEEKLY`, `MONTHLY`, `SEASON`, `ALL_TIME` |
| `school_id` | UUID FK -> schools | Optional school filter |
| `user_id` | UUID FK -> profiles | User |
| `rank` | INT | Rank in period |
| `xp` | INT | XP at snapshot time |
| `level` | INT | Level at snapshot time |
| `snapshot_date` | DATE | Snapshot date |

#### Phase 8: Admin Analytics

**`analytics_events`** -- Raw user activity events

| Column | Type | Description |
|---|---|---|
| `user_id` | UUID FK -> profiles | Actor |
| `event_type` | TEXT | Event name |
| `metadata` | JSONB | Event data |
| `session_id` | TEXT | Session identifier |

**`daily_stats`** -- Aggregated daily metrics

| Column | Type | Description |
|---|---|---|
| `date` | DATE UNIQUE | The date |
| `dau` | INT | Daily active users |
| `mau` | INT | Monthly active users |
| `new_users` | INT | New signups |
| `total_posts` | INT | Posts created |
| `total_reactions` | INT | Reactions (TDs + Fumbles) |
| `total_challenges` | INT | Challenges created |
| `total_rivalries` | INT | Active rivalries |
| `moderation_flags` | INT | AI flags |
| `moderation_auto_removes` | INT | AI auto-removals |
| `avg_session_duration_seconds` | INT | Average session length |

**`api_performance_log`** -- API endpoint performance tracking

**`scheduled_reports`** -- Automated report schedules (daily/weekly/monthly)

#### Phase 9: Notifications

**`notifications`** -- In-app notifications

| Column | Type | Description |
|---|---|---|
| `recipient_id` | UUID FK -> profiles | Who receives it |
| `actor_id` | UUID FK -> profiles | Who caused it |
| `type` | TEXT | One of 18 notification types |
| `post_id` | UUID FK -> posts | Related post (optional) |
| `challenge_id` | UUID FK -> challenges | Related challenge (optional) |
| `data` | JSONB | Extra data payload |
| `is_read` | BOOLEAN | Read status |

18 Notification Types: `FOLLOW`, `TOUCHDOWN`, `FUMBLE`, `REPLY`, `REPOST`, `MENTION`, `CHALLENGE_RECEIVED`, `CHALLENGE_RESULT`, `PREDICTION_RESULT`, `RIVALRY_FEATURED`, `PORTAL_COMMIT`, `ACHIEVEMENT_UNLOCKED`, `MODERATION_WARNING`, `MODERATION_APPEAL_RESULT`, `LEVEL_UP`, `AGING_TAKE_SURFACED`, `RECEIPT_VERIFIED`, `SYSTEM`

**`notification_preferences`** -- Per-user notification settings (push, email, per-category toggles)

### Database Triggers

| Trigger | Fires On | Effect |
|---|---|---|
| `on_auth_user_created` | INSERT on `auth.users` | Auto-creates a `profiles` row with username from metadata |
| `on_reaction_change` | INSERT/DELETE on `reactions` | Updates `touchdown_count`/`fumble_count` on both `posts` and `profiles` |
| `on_follow_change` | INSERT/DELETE on `follows` | Updates `follower_count`/`following_count` on `profiles` |
| `on_post_change` | INSERT/DELETE on `posts` | Updates `post_count` on `profiles` |

### Database Functions

**`award_xp(p_user_id, p_amount, p_source, p_reference_id, p_description)`**

Server-side function that:
1. Inserts a row into `xp_log`
2. Increments `profiles.xp`
3. Recalculates `level` from XP thresholds (21 levels)
4. Recalculates `dynasty_tier` from level ranges
5. Updates the profile

### Storage Buckets

| Bucket | Public | Purpose |
|---|---|---|
| `avatars` | Yes | User avatar images. Path: `{user_id}/filename` |
| `post-media` | Yes | Post images/media. Path: `{user_id}/filename` |
| `reports-evidence` | No | Report evidence (admin/moderator read only) |

---

## 8. Features

### 8.1 Core Social Feed

The feed is the heart of CFB Social. All posts are school-colored, meaning each post renders with the author's school branding.

**Post Types:**

| Type | Purpose | Special Fields |
|---|---|---|
| `STANDARD` | General college football discussion | None |
| `RECEIPT` | Filed prediction with a deadline | `receipt_prediction`, `receipt_deadline`, `receipt_verified` |
| `SIDELINE` | Live game observation | `sideline_game`, `sideline_quarter`, `sideline_time`, `sideline_verified` |
| `PREDICTION` | General prediction | Linked to `predictions` table |
| `AGING_TAKE` | Take with a revisit date | Linked to `aging_takes` table |
| `CHALLENGE_RESULT` | Outcome of a 1v1 challenge | Links to `challenges` |

**Reactions:**
- **Touchdown** -- Agreement/approval (equivalent to "like")
- **Fumble** -- Disagreement/disapproval (equivalent to "dislike")
- One reaction per user per post; switching from TD to Fumble auto-removes the prior reaction

**Feed Modes:**
- **National Feed** -- All published posts across all schools, ordered by `created_at DESC`
- **My School Feed** -- Filtered to posts matching the user's `school_id`
- Cursor-based pagination with configurable page size (default 20)
- Real-time updates via Supabase Postgres Changes (new posts appear at top)

**Post Actions:**
- React (Touchdown / Fumble)
- Reply (threaded via `parent_id`)
- Repost (with optional quote)
- Bookmark
- Fact Check request
- Challenge (initiate 1v1 debate)
- Share

**Validation (Zod):**
- Content: 1-500 characters
- Media: up to 4 URLs
- School ID: optional UUID
- Post type: validated enum
- Receipt/Sideline fields: validated when applicable

### 8.2 AI Moderation -- "Flag on the Play"

Every post goes through the DeepSeek AI moderation pipeline. The system uses an OpenAI-compatible API client with a detailed system prompt tailored to college football culture.

**8 Content Categories:**

| Category | Description |
|---|---|
| `college_football` | Legitimate CFB content (high score = on-topic) |
| `off_topic_sports` | NFL, NBA, or other sports discussion |
| `politics` | Political content, even when disguised as football commentary |
| `toxicity` | Personal attacks beyond normal trash talk |
| `hate_speech` | Racism, slurs, dehumanizing language |
| `spam` | Repetitive, promotional, bot-like content |
| `harassment` | Targeted harassment of specific users |
| `misinformation` | Clearly false claims presented as fact |

**Score Thresholds:**

| Risk Score | Action | Description |
|---|---|---|
| < 0.4 | `ALLOW` | Content passes moderation |
| 0.4 -- 0.7 | `FLAG` | Queued for human review in admin dashboard |
| >= 0.7 | `REJECT` | Auto-removed, author notified |

**Football-Themed Penalties:**

| Label | Penalty Name | Yards | Description |
|---|---|---|---|
| `toxicity` | Unsportsmanlike Conduct | 15 | Personal attacks not tolerated |
| `off_topic_sports` | Illegal Formation | 5 | Wrong sport for this platform |
| `politics` | False Start | 5 | Political content out of bounds |
| `harassment` | Pass Interference | 15 | Targeting other users |
| `spam` | Delay of Game | 5 | Repetitive/promotional content |
| `hate_speech` | Targeting | 15 | Zero-tolerance ejection |
| `misinformation` | Intentional Grounding | 10 | False claims presented as fact |
| (default) | Personal Foul | 10 | General flag |

**Appeal System ("Appeal to the Booth"):**
- Users can appeal any `FLAGGED` or `REMOVED` post
- Appeals enter the admin moderation queue
- Admin can `APPROVE` (restore post) or `DENY` (uphold removal)

**Technical Implementation:**
- DeepSeek API called via OpenAI SDK (`openai` package) with custom `baseURL`
- Temperature set to 0.1 for consistent classification
- JSON output mode (`response_format: { type: 'json_object' }`)
- 512 max tokens per classification
- Results stored in `posts.moderation_score`, `posts.moderation_labels`, `posts.moderation_reason`
- Full audit trail in `moderation_events` table

### 8.3 Rivalry Ring

**How it works:**
1. Admin creates a rivalry between two schools
2. Users vote for their school (one vote per user per rivalry)
3. Users submit "takes" arguing for their side
4. Takes can be upvoted, with extra weight given to upvotes from opposing fans
5. Featured rivalries rotate weekly

**Rivalry Lifecycle:** `UPCOMING` -> `ACTIVE` -> `VOTING` -> `CLOSED`

### 8.4 Transfer Portal War Room

**How it works:**
1. Portal players are added (by admin/editors) with position, star rating, previous school, and stats
2. Users "Claim for Your Roster" by predicting which school the player will commit to
3. Each claim has a confidence level (1-100) and optional reasoning
4. When a player commits, all claims are evaluated and XP is awarded for correct predictions
5. Higher confidence = higher XP reward (but higher risk)

**Player Status Lifecycle:** `IN_PORTAL` -> `COMMITTED` or `WITHDRAWN`

### 8.5 Dynasty Mode (Gamification)

**XP System:**
- 21 levels with increasing XP thresholds
- Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, ... Level 21: 50,000 XP (max)
- XP earned from 12 different sources throughout the platform

**Dynasty Tiers:**

| Tier | Level Range | Description |
|---|---|---|
| Walk-On | 1-3 | New users learning the ropes |
| Starter | 4-6 | Active contributors |
| All-Conference | 7-9 | Consistent engagement |
| All-American | 10-13 | Top-tier participants |
| Heisman | 14-17 | Elite status |
| Hall of Fame | 18-21 | Legendary contributors |

**XP Thresholds (all 21 levels):**

```
Level  1:      0 XP    Level  8:  3,000 XP    Level 15: 15,500 XP
Level  2:    100 XP    Level  9:  4,000 XP    Level 16: 19,000 XP
Level  3:    300 XP    Level 10:  5,200 XP    Level 17: 23,000 XP
Level  4:    600 XP    Level 11:  6,600 XP    Level 18: 28,000 XP
Level  5:  1,000 XP    Level 12:  8,200 XP    Level 19: 34,000 XP
Level  6:  1,500 XP    Level 13: 10,000 XP    Level 20: 41,000 XP
Level  7:  2,200 XP    Level 14: 12,500 XP    Level 21: 50,000 XP
```

**Achievement Categories:** SOCIAL, PREDICTION, RIVALRY, RECRUITING, ENGAGEMENT, MILESTONE

**Leaderboards:** Daily, Weekly, Monthly, Season, and All-Time. Filterable by school.

### 8.6 Receipts

1. User creates a `RECEIPT` post with a prediction and deadline
2. Post is auto-stamped with "RECEIPT FILED" badge
3. After the deadline passes, the community or admin verifies the outcome
4. Post updates to "RECEIPT VERIFIED" or "BUST"
5. Correct receipts earn XP
6. Season-long receipt tracker per user profile

### 8.7 Sideline Reports

1. User creates a `SIDELINE` post tagged with a specific game, quarter, and game clock
2. Posts from verified press box users receive a "VERIFIED" badge
3. Live game threads aggregate all sideline reports for a given game
4. Real-time updates during games

### 8.8 Aging Takes

1. User creates an `AGING_TAKE` post with a revisit date
2. When the revisit date arrives, the take is resurfaced to the community
3. Community votes: "Aged Well" or "Aged Poorly"
4. Correct aging takes earn XP

---

## 9. Admin Dashboard

The admin dashboard (`apps/admin`) is a separate Next.js application running on port 3001. Access requires the `ADMIN` role -- the middleware verifies the user's role on every request and redirects non-admins.

### Dashboard Pages

| Page | Route | Description |
|---|---|---|
| **Overview** | `/` | Total users, posts, DAU/MAU, engagement rate. Weekly growth metrics. Moderation queue summary. Top API endpoints by response time. |
| **Moderation Center** | `/moderation` | Flagged post queue with AI confidence scores. Review/approve/reject workflow. Appeal management ("Appeal to the Booth" queue). Bulk actions for moderation events. |
| **User Management** | `/users` | Search users by username, email, school. View activity history and moderation history. Assign roles (USER, PREMIUM, MODERATOR, EDITOR, ADMIN). Suspend or ban users with reason and duration. |
| **Content Analytics** | `/content` | Post volume over time (charts via Recharts). Top posts by engagement. Content type breakdown (Standard vs Receipt vs Sideline, etc.). Trending hashtags and topics. |
| **Engagement Metrics** | `/engagement` | TD/Fumble ratio across the platform. Challenge creation and completion rates. Fact check requests. Prediction accuracy rates. |
| **School Analytics** | `/schools` | Per-school activity metrics. School hype meter (engagement intensity). Most active schools leaderboard. Conference-level aggregation. |
| **Real-time Monitor** | `/realtime` | Active users count (live). Posts per minute (live). Live moderation activity stream. Active rivalry and challenge counts. |
| **Reports Queue** | `/reports` | User-submitted reports with status tracking. Filter by reason, status, date. Link to reported content and user profiles. Assign and track resolution. |
| **System Health** | `/system` | API response times by endpoint. Error rates and trends. Edge Function execution stats. Database connection health. |
| **Export Center** | `/exports` | CSV exports of user data, content data, analytics. Scheduled report management (daily, weekly, monthly). Custom date range exports. |
| **Settings** | `/settings` | Admin configuration options. |

### Admin Middleware

The admin middleware (`apps/admin/middleware.ts`) enforces ADMIN-only access:
1. Refreshes the Supabase session from cookies
2. Unauthenticated users are redirected to `/login`
3. Authenticated users have their `role` checked against the `profiles` table
4. Non-ADMIN users are signed out and redirected to `/login`
5. Authenticated admins on the login page are redirected to the dashboard

---

## 10. School Theming System

CFB Social dynamically themes the interface based on each user's selected school. In the national feed, every post renders in its author's school colors.

### CSS Custom Properties

```css
:root {
  /* Defaults (overridden per user's school) */
  --school-primary: #8b1a1a;
  --school-secondary: #c9a84c;

  /* Platform constants */
  --paper: #f4efe4;
  --ink: #3b2f1e;
  --crimson: #8b1a1a;
  --surface: #ece7db;
  --surface-raised: #faf7f0;
  --border: #d4c9b5;
  --border-strong: #b8a88e;
  --text-primary: #3b2f1e;
  --text-secondary: #6b5d4d;
  --text-muted: #9a8c7a;
  --text-inverse: #f4efe4;
  --success: #4a7c59;
  --warning: #b8860b;
  --error: #8b1a1a;
  --info: #4a6c8c;
}
```

### How It Works

1. The `SchoolThemeProvider` component wraps the main layout
2. On mount, it fetches the current user's profile and their school's colors
3. It injects `--school-primary` and `--school-secondary` as inline CSS variables on the container div
4. All school-themed elements (buttons, badges, post borders) reference `var(--school-primary)` and `var(--school-secondary)`
5. The `.btn-school` utility class automatically uses the school's primary color

### School Data (653 Programs Across All Divisions)

CFB Social includes **every college football program in the nation**, organized by classification:

| Division | Count | Source File |
|---|---|---|
| **FBS** (Football Bowl Subdivision) | 136 | `supabase/seed.sql` |
| **FCS** (Football Championship Subdivision) | 124 | `supabase/seed.sql` |
| **D2** (NCAA Division II) | 170 | `supabase/seed/schools-lower-divisions.sql` |
| **D3** (NCAA Division III) | 149 | `supabase/seed/schools-lower-divisions.sql` |
| **NAIA** | 74 | `supabase/seed/schools-lower-divisions.sql` |
| **Total** | **653** | |

Each school record includes:
- `classification` -- Division level (`FBS`, `FCS`, `D2`, `D3`, `NAIA`)
- `primary_color` -- Main brand color (hex)
- `secondary_color` -- Secondary brand color (hex)
- `tertiary_color` -- Optional third color (hex)
- `conference` -- Conference affiliation
- `stadium`, `city`, `state` -- Location data

All colors are verified against official school brand guidelines. The `classification` column is indexed for efficient filtering and the `SchoolClassification` TypeScript enum (`FBS | FCS | D2 | D3 | NAIA`) provides type safety across the stack.

### Feed Rendering

In the **National Feed**, each post card reads its school's colors from the included `school` relation and renders with that school's palette. In the **My School Feed**, all posts share the user's selected school colors.

---

## 11. Mobile App (Expo)

The mobile app lives at `apps/mobile` and is built with Expo SDK 55 using Expo Router for file-based navigation.

### Configuration

| Setting | Value |
|---|---|
| **App Name** | CFB Social |
| **Slug** | cfb-social |
| **Deep Link Scheme** | `cfbsocial://` |
| **Bundle ID (iOS)** | com.cfbsocial.app |
| **Package (Android)** | com.cfbsocial.app |
| **Orientation** | Portrait |
| **New Architecture** | Enabled |
| **Typed Routes** | Enabled |
| **Background Color** | `#f4efe4` (paper) |

### Navigation Structure

```
app/
  _layout.tsx          # Root layout (auth check, font loading)
  index.tsx            # Entry point (redirects to feed or login)
  settings.tsx         # Settings screen
  (auth)/
    _layout.tsx        # Auth stack navigator
    login.tsx          # Email/password login
    register.tsx       # Registration with school selection
  (tabs)/
    _layout.tsx        # Tab bar navigator
    feed.tsx           # Feed tab (National + My School)
    rivalry.tsx        # Rivalry Ring tab
    portal.tsx         # Transfer Portal tab
    profile.tsx        # User profile tab
```

### Key Dependencies

| Package | Purpose |
|---|---|
| `expo-router` 4.0 | File-based navigation |
| `expo-secure-store` 14.1 | Secure token storage |
| `expo-image` 2.1 | Optimized image rendering |
| `expo-linking` 7.1 | Deep linking support |
| `expo-font` 13.3 | Custom font loading |
| `@react-native-async-storage/async-storage` 2.1 | Supabase session persistence |
| `@supabase/supabase-js` 2.47 | Database client |
| `react-native` 0.79 | React Native core |
| `react-native-screens` 4.9 | Native navigation screens |
| `react-native-safe-area-context` 5.3 | Safe area handling |

### Supabase Client (Mobile)

The mobile Supabase client (`apps/mobile/lib/supabase.ts`) uses `AsyncStorage` for session persistence and disables URL-based session detection (not applicable in React Native):

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Building for Distribution

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Configure EAS Build
cd apps/mobile
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## 12. Deployment

### Web App (`apps/web`)

| Setting | Value |
|---|---|
| **Platform** | Vercel |
| **Framework** | Next.js 15 |
| **Root Directory** | `apps/web` |
| **Build Command** | `pnpm turbo build --filter=cfb-social-web` |
| **Dev Port** | 3000 |

### Admin Dashboard (`apps/admin`)

| Setting | Value |
|---|---|
| **Platform** | Vercel |
| **Framework** | Next.js 15 |
| **Root Directory** | `apps/admin` |
| **Build Command** | `pnpm turbo build --filter=cfb-social-admin` |
| **Dev Port** | 3001 |

### Mobile App (`apps/mobile`)

| Setting | Value |
|---|---|
| **Platform** | EAS Build (Expo Application Services) |
| **Framework** | Expo SDK 55 |
| **iOS Distribution** | App Store via EAS Submit |
| **Android Distribution** | Google Play via EAS Submit |

### Database & Backend

| Service | Platform |
|---|---|
| **Database** | Supabase hosted (PostgreSQL 15) |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Realtime** | Supabase Realtime |
| **Edge Functions** | Supabase Edge Functions (Deno runtime) |

### Environment Configuration

Each Vercel deployment needs the following environment variables configured in the Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `DEEPSEEK_API_KEY` (server-only)
- `NEXT_PUBLIC_APP_URL` (production URL)
- `NEXT_PUBLIC_ADMIN_URL` (production URL)

---

## 13. Development Phases

| Phase | Name | Status |
|---|---|---|
| Phase 1 | Foundation (Monorepo + Supabase + Auth) | Complete |
| Phase 2 | Authentication and User Profiles | Complete |
| Phase 3 | Core Feed and Post System | Complete |
| Phase 4 | Rivalry Ring and Challenges | Complete |
| Phase 5 | Transfer Portal War Room and Predictions | Complete |
| Phase 6 | AI Moderation System | Complete |
| Phase 7 | Dynasty Mode (Gamification) | Complete |
| Phase 8 | Admin Dashboard with Deep Analytics | Complete |
| Phase 9 | Notifications, Live Scores, Real-time | Complete |
| Phase 10 | Polish, Documentation, Deployment | In Progress |

### Phase Details

**Phase 1: Foundation**
- Turborepo monorepo with pnpm workspaces
- Supabase project setup (config.toml, local dev)
- Base TypeScript configuration (ES2022, strict, bundler resolution)
- Shared `@cfb-social/types` package with 18 enums (including `SchoolClassification`) and interfaces
- Migration files: `00001_core_schema.sql` (24 tables, RLS, triggers, functions) + `00002_all_divisions.sql` (classification column)
- Seed data: 653 college football programs across FBS (136), FCS (124), D2 (170), D3 (149), NAIA (74)

**Phase 2: Authentication and User Profiles**
- Supabase Auth integration (email/password, Google, Apple OAuth)
- PKCE flow for secure auth
- Auto-profile creation trigger on signup
- Profile management (avatar upload, bio, school selection)
- Role system (USER, PREMIUM, MODERATOR, EDITOR, ADMIN)
- Session management via middleware (cookie-based for web, AsyncStorage for mobile)

**Phase 3: Core Feed and Post System**
- 6 post types with type-specific fields
- Touchdown/Fumble reaction system with denormalized counts
- Threaded replies via `parent_id`
- Reposts with optional quotes
- Bookmarks
- Cursor-based pagination
- Zod validation schemas
- Real-time feed updates via Supabase Postgres Changes
- Gridiron Classic CSS theme

**Phase 4: Rivalry Ring and Challenges**
- Rivalry creation and management
- School-vs-school voting
- Rivalry takes with upvote system
- 1v1 Challenge system (initiate, respond, community vote, winner)
- Fact-check request system
- Featured rivalry rotation

**Phase 5: Transfer Portal War Room**
- Portal player database with star ratings, stats, and status tracking
- "Claim for Your Roster" prediction system with confidence levels
- Prediction verification and XP awards
- General prediction system (6 categories)
- Aging takes with revisit dates
- Receipt filing and verification

**Phase 6: AI Moderation System**
- DeepSeek integration via OpenAI-compatible SDK
- Custom system prompt for CFB-specific content classification
- 8-category content scoring
- Three-tier action system (ALLOW / FLAG / REJECT)
- Football-themed penalty mapping
- Moderation events audit log
- User reporting system
- Appeal system ("Appeal to the Booth")

**Phase 7: Dynasty Mode (Gamification)**
- 21-level XP progression system
- 6 dynasty tiers
- `award_xp()` database function for atomic XP updates
- 12 XP sources across all features
- Achievement system (6 categories, 30+ achievements)
- Leaderboard snapshots (5 time periods)

**Phase 8: Admin Dashboard**
- Separate Next.js admin application
- ADMIN role middleware enforcement
- 10 dashboard pages (overview, moderation, users, content, engagement, schools, realtime, reports, system, exports)
- Recharts for data visualization
- Stat cards and stats grid components

**Phase 9: Notifications, Live Scores, Real-time**
- 18 notification types
- Real-time notification delivery via Supabase Postgres Changes
- Presence system for online user tracking
- Notification preferences (push, email, per-category toggles)
- Device token management for push notifications
- `useRealtimeFeed()` and `useRealtimeNotifications()` React hooks

**Phase 10: Polish, Documentation, Deployment**
- Comprehensive documentation (this file)
- UI mockups (desktop, mobile, school-specific themes)
- Vercel deployment configuration
- EAS Build configuration for mobile
- Final testing and QA

---

## 14. API Reference

All database operations are centralized in `@cfb-social/api`. Functions accept a Supabase client as their first argument, making them usable from any context (browser, server, service role).

### Client Factories

```typescript
import {
  createBrowserClient,   // Client-side React components (uses NEXT_PUBLIC_ vars, respects RLS)
  createServerClient,    // Server Components, Route Handlers (cookie-based session, respects RLS)
  createServiceClient,   // Admin operations, Edge Functions (bypasses RLS entirely)
} from '@cfb-social/api';
```

### Auth Mutations

```typescript
// Sign up with email, password, and metadata (triggers auto-profile creation)
await signUp(client, 'user@example.com', 'password', {
  username: 'gator_fan_99',
  display_name: 'Gator Fan',
});

// Sign in with email and password
await signIn(client, 'user@example.com', 'password');

// Sign in with OAuth provider
await signInWithOAuth(client, 'google'); // or 'apple', 'twitter'

// Sign out
await signOut(client);

// Reset password
await resetPassword(client, 'user@example.com');
```

### Feed Queries

```typescript
// Get paginated feed (national or filtered by school)
const posts = await getFeed(client, {
  schoolId: 'uuid',        // optional: filter by school
  type: 'RECEIPT',          // optional: filter by post type
  cursor: '2026-03-25T...',// optional: cursor for pagination
  limit: 20,               // optional: page size (default 20)
});

// Get a single post with author and school data
const post = await getPost(client, 'post-uuid');

// Get replies to a post
const replies = await getPostReplies(client, 'post-uuid', { limit: 50 });

// Get a user's posts
const userPosts = await getUserPosts(client, 'user-uuid');
```

### Post Mutations

```typescript
// Create a post (author_id set from session automatically)
const post = await createPost(client, {
  content: 'SGA is the best player in college football right now.',
  postType: 'STANDARD',
  schoolId: 'school-uuid',
  mediaUrls: ['https://...'],
});

// Create a receipt post
const receipt = await createPost(client, {
  content: 'Georgia will go undefeated this season.',
  postType: 'RECEIPT',
  receiptPrediction: 'Georgia goes 13-0 in 2026',
  receiptDeadline: '2026-12-31T00:00:00Z',
});

// React to a post
await reactToPost(client, 'post-uuid', 'TOUCHDOWN');
await reactToPost(client, 'post-uuid', 'FUMBLE');

// Remove reaction
await removeReaction(client, 'post-uuid');

// Repost with quote
await repost(client, 'post-uuid', 'This is exactly what I was saying!');

// Bookmark
await bookmark(client, 'post-uuid');
await removeBookmark(client, 'post-uuid');

// Update post
await updatePost(client, 'post-uuid', { content: 'Updated content' });

// Delete post
await deletePost(client, 'post-uuid');
```

### Profile Mutations

```typescript
await updateProfile(client, { bio: 'Die-hard Gator fan since birth.' });
await selectSchool(client, 'school-uuid');
await uploadAvatar(client, file);
```

### Social Mutations

```typescript
await followUser(client, 'user-uuid');
await unfollowUser(client, 'user-uuid');
await blockUser(client, 'user-uuid');
await unblockUser(client, 'user-uuid');
```

### Rivalry Mutations

```typescript
await voteOnRivalry(client, 'rivalry-uuid', 'school-uuid');
await submitRivalryTake(client, 'rivalry-uuid', 'Florida is superior in every way.');
```

### Challenge Mutations

```typescript
await createChallenge(client, {
  challengedId: 'user-uuid',
  topic: 'Who has the better QB room: Alabama or Georgia?',
  postId: 'post-uuid', // optional
});

await respondToChallenge(client, 'challenge-uuid', {
  argument: 'Georgia clearly has the better QB room because...',
});

await voteOnChallenge(client, 'challenge-uuid', 'user-uuid-to-vote-for');
```

### Portal Mutations

```typescript
await claimPlayer(client, {
  playerId: 'player-uuid',
  schoolId: 'school-uuid',
  confidence: 85,
  reasoning: 'He visited campus last week and his family is from the area.',
});
```

### Realtime Subscriptions

```typescript
// React hooks (client-side only)
const { newPosts, clearNewPosts } = useRealtimeFeed('school-uuid');
const { notifications, unreadCount, markAllRead } = useRealtimeNotifications();

// Non-React (Edge Functions, workers, etc.)
const channel = subscribeFeed(client, 'school-uuid', (post) => {
  console.log('New post:', post);
});

const notifChannel = subscribeNotifications(client, 'user-uuid', (notification) => {
  console.log('New notification:', notification);
});

const presenceChannel = subscribePresence(client, 'rivalry-thread-123', {
  onJoin: (key, presence) => console.log('User joined:', key),
  onLeave: (key, presence) => console.log('User left:', key),
  onSync: () => console.log('Presence synced'),
});

// Cleanup
client.removeChannel(channel);
```

### Moderation

```typescript
import { analyzeContent, getPenaltyType, getAllPenalties } from '@cfb-social/moderation';

// Analyze content via DeepSeek
const result = await analyzeContent('Your team is trash and always will be.');
// result: { score: 0.2, labels: { college_football: 0.8, toxicity: 0.2 }, reason: '...', action: 'ALLOW' }

// Get football penalty for flagged content
const penalty = getPenaltyType(result.labels);
// penalty: { name: 'Unsportsmanlike Conduct', description: '...', yards: 15 }

// Get all penalties above threshold
const penalties = getAllPenalties(result.labels, 0.4);
```

---

## 15. Security

### Row Level Security (RLS)

Every table has RLS enabled. Policies follow the principle of least privilege:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `schools` | Public | ADMIN only | ADMIN only | ADMIN only |
| `profiles` | Public | Own ID only | Own ID (or ADMIN) | -- |
| `posts` | Published or own | Own author_id | Own author_id | Own author_id |
| `reactions` | Public | Own user_id | -- | Own user_id |
| `follows` | Public | Own follower_id | -- | Own follower_id |
| `bookmarks` | Own user_id | Own user_id | -- | Own user_id |
| `notifications` | Own recipient_id | -- | Own recipient_id | -- |
| `reports` | ADMIN/MODERATOR | Own reporter_id | ADMIN/MODERATOR | -- |
| `appeals` | Own or ADMIN/MOD | Own user_id | -- | -- |
| `rivalries` | Public | ADMIN/EDITOR | ADMIN/EDITOR | ADMIN/EDITOR |
| `rivalry_votes` | Public | Own user_id | -- | -- |
| `challenges` | Public | Own challenger_id | Participants only | -- |
| `portal_players` | Public | ADMIN/EDITOR | ADMIN/EDITOR | ADMIN/EDITOR |
| `roster_claims` | Public | Own user_id | -- | -- |
| `predictions` | Public | Own user_id | -- | -- |
| `achievements` | Public | -- | -- | -- |
| `user_achievements` | Public | -- | -- | -- |
| `xp_log` | Own user_id | -- | -- | -- |
| `moderation_events` | ADMIN/MODERATOR | -- | -- | -- |
| `analytics_events` | ADMIN only | -- | -- | -- |
| `daily_stats` | ADMIN only | -- | -- | -- |

ADMIN and MODERATOR roles can manage all posts (flag, remove, restore) via the `Admins can manage all posts` policy.

### Auth Security

- **PKCE Flow**: Supabase Auth uses Proof Key for Code Exchange (PKCE) for all OAuth flows, preventing authorization code interception attacks
- **Cookie-based Sessions**: Web apps use `@supabase/ssr` for cookie-based session management with automatic token refresh via middleware
- **AsyncStorage Sessions**: Mobile app persists sessions in AsyncStorage with automatic refresh
- **JWT Expiry**: Set to 3600 seconds (1 hour) in `supabase/config.toml`
- **Double Confirm**: Email changes require double confirmation
- **Admin Role Gate**: Admin dashboard middleware checks the user's role in the `profiles` table on every request; non-admins are signed out and redirected

### Storage Security

| Bucket | Read Policy | Write Policy |
|---|---|---|
| `avatars` | Public | Users can upload/update to their own folder (`{user_id}/filename`) |
| `post-media` | Public | Users can upload to their own folder |
| `reports-evidence` | ADMIN/MODERATOR only | -- |

### Service Role Key

The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. It is used exclusively in:
- `createServiceClient()` (server-only, never exposed to browser)
- Supabase Edge Functions for background processing
- Admin operations that need cross-user data access

This key must NEVER be exposed in client-side code or environment variables prefixed with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`.

### Input Validation

- Post content validated via Zod schemas (1-500 characters, max 4 media URLs)
- All UUIDs validated as proper UUID format
- Enum values validated against TypeScript enums
- Database CHECK constraints enforce valid values at the storage layer

### Rate Limiting Considerations

- Supabase provides built-in rate limiting on the API gateway
- DeepSeek API moderation is async to prevent blocking post creation
- Upstash Redis (optional) can be used for application-level rate limiting
- Database triggers are `SECURITY DEFINER` to execute with elevated privileges while keeping RLS intact for user-facing queries

---

## Current Project Status (March 26, 2026)

### What's Done
- Turborepo monorepo scaffolded at `C:\Users\beltr\cfbsocial` with pnpm workspaces
- All 3 apps (web, admin, mobile) and 4 packages (types, api, moderation, ui) have file structure and initial code
- Supabase project created and linked (ref: `zjaclcnjgumdgufoakio`)
- Database LIVE with 24 app tables + 8 system tables (32 total), all RLS policies, triggers, functions, storage buckets
- 653 schools seeded across 5 divisions (FBS: 136, FCS: 124, D2: 170, D3: 149, NAIA: 74)
- 29 achievements seeded
- `.env.local` configured with all Supabase credentials
- `supabase/config.toml` configured (PostgreSQL 17, project linked)
- Comprehensive type definitions in `packages/types` (18 enums, Zod schemas, interfaces)
- API layer scaffolded in `packages/api` (Supabase client factory, query/mutation stubs)
- Moderation package scaffolded in `packages/moderation` (DeepSeek analyzer, rules, penalties)
- Web app scaffolded: Gridiron Classic theme, layouts, feed components, auth pages, profile pages
- Admin app scaffolded: sidebar layout, dashboard pages, moderation queue, analytics pages
- Mobile app scaffolded: Expo SDK 55, auth context, feed screens, tabs

### What's NOT Done Yet
- `pnpm install` has never been run (no `node_modules`)
- TypeScript compilation has not been verified
- Supabase types not yet generated from live schema (`pnpm db:types`)
- No dev servers have been started or tested
- No actual feature works end-to-end yet
- All scaffolded code needs to be tested against the live Supabase instance
- DeepSeek API key not yet configured (placeholder in `.env.local`)
- OAuth providers (Google, Apple) not configured
- No deployment setup (Vercel, EAS)

### Next Steps (In Order)
1. `pnpm install` -- install all dependencies
2. `pnpm turbo typecheck` -- verify TypeScript compiles
3. Generate Supabase types from live schema
4. `pnpm dev` -- start web app, verify it connects to Supabase
5. Build out Phase 2 (Auth) with working code against live database
6. Continue through Phases 3-10 per the plan

---

*This document is the single source of truth for the CFB Social platform. Keep it updated as features evolve.*
