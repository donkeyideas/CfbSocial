-- ============================================================
-- Blog posts (AI-generated matchup previews + editorial content)
-- Paste into the Supabase SQL editor to apply.
-- ============================================================

create table if not exists public.blog_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  excerpt          text,
  content          text not null,              -- sanitized HTML body
  meta_title       text,
  meta_description text,
  keywords         text,
  cover_image_url  text,
  status           text not null default 'DRAFT'
                     check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  post_type        text not null default 'MATCHUP'
                     check (post_type in ('MATCHUP', 'GENERAL')),
  home_school_id   uuid references public.schools(id) on delete set null,
  away_school_id   uuid references public.schools(id) on delete set null,
  matchup_slug     text,
  tags             text[] not null default '{}',
  faqs             jsonb not null default '[]'::jsonb,
  author_id        uuid references public.profiles(id) on delete set null,
  views            integer not null default 0,
  featured         boolean not null default false,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists blog_posts_status_idx        on public.blog_posts (status);
create index if not exists blog_posts_published_at_idx   on public.blog_posts (published_at desc);
create index if not exists blog_posts_matchup_slug_idx   on public.blog_posts (matchup_slug);
create index if not exists blog_posts_featured_idx        on public.blog_posts (featured);

-- keep updated_at fresh
create or replace function public.blog_posts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.blog_posts_set_updated_at();

-- Atomic view counter (called from the public post page).
create or replace function public.increment_blog_views(p_id uuid)
returns void language sql security definer as $$
  update public.blog_posts set views = views + 1 where id = p_id and status = 'PUBLISHED';
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.blog_posts enable row level security;

-- Anyone (anon included) can read PUBLISHED posts.
drop policy if exists "blog_public_read_published" on public.blog_posts;
create policy "blog_public_read_published"
  on public.blog_posts for select
  using (status = 'PUBLISHED');

-- Admins can read/write everything (drafts included).
drop policy if exists "blog_admin_all" on public.blog_posts;
create policy "blog_admin_all"
  on public.blog_posts for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'));
