-- MangaAI: kids' manga subscription platform — initial schema
-- Parent accounts pay; child profiles read. Collect as little about children as possible.


-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('parent', 'admin');
create type public.age_band as enum ('4-6', '7-9', '10-12', '13+');
create type public.series_status as enum ('draft', 'published', 'archived');
create type public.chapter_status as enum ('draft', 'in_review', 'approved');
create type public.reading_direction as enum ('rtl', 'ltr', 'vertical');

-- ---------------------------------------------------------------------------
-- Parent profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'parent',
  display_name text check (char_length(display_name) <= 60),
  pin_hash text,
  pin_failed_attempts int not null default 0,
  pin_locked_until timestamptz,
  weekly_digest boolean not null default true,
  trial_used boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, consent_at)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own profile but never their role or trial flag.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and current_user not in ('postgres', 'service_role') then
    new.role := old.role;
    new.trial_used := old.trial_used;
    new.pin_failed_attempts := old.pin_failed_attempts;
    new.pin_locked_until := old.pin_locked_until;
  end if;
  return new;
end $$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Child profiles: nickname + preset avatar + age band only. No names, birthdays, emails or photos.
-- ---------------------------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  avatar text not null default 'cat',
  age_band public.age_band not null,
  daily_limit_minutes int check (daily_limit_minutes is null or daily_limit_minutes between 5 and 600),
  created_at timestamptz not null default now()
);
create index children_parent_idx on public.children (parent_id);

create or replace function public.limit_children()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.children where parent_id = new.parent_id) >= 5 then
    raise exception 'A family can have at most 5 reader profiles';
  end if;
  return new;
end $$;

create trigger children_limit before insert on public.children
  for each row execute function public.limit_children();

create or replace function public.owns_child(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.children where id = cid and parent_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Content: series -> volumes -> chapters -> pages
-- ---------------------------------------------------------------------------
create table public.series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  synopsis text not null default '',
  cover_path text,
  age_band public.age_band not null,
  genres text[] not null default '{}',
  reading_direction public.reading_direction not null default 'rtl',
  status public.series_status not null default 'draft',
  is_ai_generated boolean not null default true,
  release_day smallint check (release_day between 0 and 6), -- 0 = Sunday, shown as "New chapters every …"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.volumes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series (id) on delete cascade,
  number int not null check (number > 0),
  title text,
  unique (series_id, number)
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series (id) on delete cascade,
  volume_id uuid references public.volumes (id) on delete set null,
  number numeric(6, 1) not null check (number > 0),
  title text,
  is_free_preview boolean not null default false,
  status public.chapter_status not null default 'draft',
  publish_at timestamptz,
  page_count int not null default 0,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (series_id, number)
);
create index chapters_series_idx on public.chapters (series_id, number);
create index chapters_publish_idx on public.chapters (publish_at) where status = 'approved';

-- A chapter cannot be approved until a person has reviewed every page.
create or replace function public.check_chapter_approval()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and (new.reviewed_at is null or new.page_count = 0) then
    raise exception 'Chapter must have pages and be reviewed before approval';
  end if;
  return new;
end $$;

create trigger chapters_check_approval before insert or update on public.chapters
  for each row execute function public.check_chapter_approval();

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  page_number int not null check (page_number > 0),
  image_path text not null,
  width int not null,
  height int not null,
  unique (chapter_id, page_number)
);

-- ---------------------------------------------------------------------------
-- Reading activity (per child)
-- ---------------------------------------------------------------------------
create table public.child_hidden_series (
  child_id uuid not null references public.children (id) on delete cascade,
  series_id uuid not null references public.series (id) on delete cascade,
  primary key (child_id, series_id)
);

create table public.shelf (
  child_id uuid not null references public.children (id) on delete cascade,
  series_id uuid not null references public.series (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (child_id, series_id)
);

create table public.reading_progress (
  child_id uuid not null references public.children (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  series_id uuid not null references public.series (id) on delete cascade,
  last_page int not null default 1,
  max_page int not null default 1,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, chapter_id)
);
create index reading_progress_recent_idx on public.reading_progress (child_id, updated_at desc);
create index reading_progress_chapter_idx on public.reading_progress (chapter_id);

create table public.reading_days (
  child_id uuid not null references public.children (id) on delete cascade,
  day date not null,
  seconds int not null default 0,
  pages_read int not null default 0,
  primary key (child_id, day)
);

create table public.child_badges (
  child_id uuid not null references public.children (id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  primary key (child_id, badge_key)
);

-- ---------------------------------------------------------------------------
-- Billing (Razorpay). Written only by the server with the service role.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  razorpay_subscription_id text not null unique,
  razorpay_plan_id text not null,
  plan text not null check (plan in ('monthly', 'annual')),
  status text not null default 'created',
  trial_end timestamptz,
  current_start timestamptz,
  current_end timestamptz,
  first_charged_at timestamptz,
  cancel_at_cycle_end boolean not null default false,
  short_url text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_parent_idx on public.subscriptions (parent_id, created_at desc);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now()
);
create index email_log_parent_idx on public.email_log (parent_id, kind, sent_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.series enable row level security;
alter table public.volumes enable row level security;
alter table public.chapters enable row level security;
alter table public.pages enable row level security;
alter table public.child_hidden_series enable row level security;
alter table public.shelf enable row level security;
alter table public.reading_progress enable row level security;
alter table public.reading_days enable row level security;
alter table public.child_badges enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.email_log enable row level security;

create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "parent manages children" on public.children for all
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());

create policy "readers see published series" on public.series for select
  using (status = 'published' or public.is_admin());
create policy "admin writes series" on public.series for all using (public.is_admin()) with check (public.is_admin());

create policy "readers see volumes" on public.volumes for select
  using (public.is_admin() or exists (select 1 from public.series s where s.id = series_id and s.status = 'published'));
create policy "admin writes volumes" on public.volumes for all using (public.is_admin()) with check (public.is_admin());

create policy "readers see live chapters" on public.chapters for select
  using (
    public.is_admin()
    or (status = 'approved' and publish_at <= now()
        and exists (select 1 from public.series s where s.id = series_id and s.status = 'published'))
  );
create policy "admin writes chapters" on public.chapters for all using (public.is_admin()) with check (public.is_admin());

-- Page rows (image paths) are admin-only; readers get short-lived signed URLs from the server after an entitlement check.
create policy "admin pages" on public.pages for all using (public.is_admin()) with check (public.is_admin());

create policy "parent hidden series" on public.child_hidden_series for all
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy "parent shelf" on public.shelf for all
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy "parent progress" on public.reading_progress for all
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy "parent reading days" on public.reading_days for select using (public.owns_child(child_id));
create policy "parent badges" on public.child_badges for select using (public.owns_child(child_id));

create policy "own subscriptions" on public.subscriptions for select using (parent_id = auth.uid());
-- billing_events and email_log: no policies (service role only).

-- ---------------------------------------------------------------------------
-- Server-side helpers (service role only)
-- ---------------------------------------------------------------------------
create or replace function public.add_reading_time(p_child uuid, p_day date, p_seconds int, p_pages int)
returns int language plpgsql security definer set search_path = public as $$
declare total int;
begin
  insert into public.reading_days (child_id, day, seconds, pages_read)
  values (p_child, p_day, greatest(p_seconds, 0), greatest(p_pages, 0))
  on conflict (child_id, day) do update
    set seconds = public.reading_days.seconds + greatest(excluded.seconds, 0),
        pages_read = public.reading_days.pages_read + greatest(excluded.pages_read, 0)
  returning seconds into total;
  return total;
end $$;

create or replace function public.admin_chapter_stats(p_limit int default 50)
returns table (
  chapter_id uuid, series_title text, chapter_number numeric, chapter_title text,
  page_count int, readers bigint, completed bigint, top_dropoff_page int, dropoff_count bigint
) language sql stable security definer set search_path = public as $$
  with agg as (
    select rp.chapter_id, count(*) as readers, count(rp.completed_at) as completed
    from public.reading_progress rp group by rp.chapter_id
  ), drops as (
    select distinct on (rp.chapter_id) rp.chapter_id, rp.max_page, count(*) as n
    from public.reading_progress rp
    where rp.completed_at is null
    group by rp.chapter_id, rp.max_page
    order by rp.chapter_id, count(*) desc, rp.max_page
  )
  select c.id, s.title, c.number, c.title, c.page_count,
         coalesce(a.readers, 0), coalesce(a.completed, 0), d.max_page, coalesce(d.n, 0)
  from public.chapters c
  join public.series s on s.id = c.series_id
  left join agg a on a.chapter_id = c.id
  left join drops d on d.chapter_id = c.id
  where c.status = 'approved'
  order by coalesce(a.readers, 0) desc, s.title, c.number
  limit p_limit;
$$;

create or replace function public.admin_top_series(p_days int default 30)
returns table (series_id uuid, title text, readers bigint, chapters_completed bigint)
language sql stable security definer set search_path = public as $$
  select s.id, s.title, count(distinct rp.child_id), count(rp.completed_at)
  from public.reading_progress rp
  join public.series s on s.id = rp.series_id
  where rp.updated_at >= now() - make_interval(days => p_days)
  group by s.id, s.title
  order by 3 desc
  limit 10;
$$;

revoke execute on function public.add_reading_time(uuid, date, int, int) from public, anon, authenticated;
revoke execute on function public.admin_chapter_stats(int) from public, anon, authenticated;
revoke execute on function public.admin_top_series(int) from public, anon, authenticated;
grant execute on function public.add_reading_time(uuid, date, int, int) to service_role;
grant execute on function public.admin_chapter_stats(int) to service_role;
grant execute on function public.admin_top_series(int) to service_role;

-- ---------------------------------------------------------------------------
-- Storage: public covers, private page images and original PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('covers', 'covers', true),
  ('pages', 'pages', false),
  ('originals', 'originals', false)
on conflict (id) do nothing;

create policy "admin uploads content" on storage.objects for insert to authenticated
  with check (bucket_id in ('covers', 'pages', 'originals') and public.is_admin());
create policy "admin updates content" on storage.objects for update to authenticated
  using (bucket_id in ('covers', 'pages', 'originals') and public.is_admin());
create policy "admin deletes content" on storage.objects for delete to authenticated
  using (bucket_id in ('covers', 'pages', 'originals') and public.is_admin());
create policy "admin reads content" on storage.objects for select to authenticated
  using (bucket_id in ('pages', 'originals') and public.is_admin());
