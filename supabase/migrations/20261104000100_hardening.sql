-- Hardening from Supabase advisors:
-- 1. RLS helper functions move to a private schema (not exposed through the REST API).
-- 2. Trigger functions get a fixed search_path; handle_new_user is not callable via RPC.
-- 3. auth.uid() is wrapped in (select …) so it's evaluated once per query, not per row.
-- 4. Admin write policies no longer overlap reader SELECT policies.
-- 5. Indexes for foreign keys.
-- billing_events and email_log intentionally have RLS on with no policies: only the server (service role) touches them.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function private.owns_child(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.children where id = cid and parent_id = (select auth.uid()));
$$;

revoke execute on function private.is_admin() from public;
revoke execute on function private.owns_child(uuid) from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.owns_child(uuid) to authenticated, service_role;

-- ---- Policies: drop and recreate against the private helpers ----
drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "parent manages children" on public.children;
drop policy if exists "readers see published series" on public.series;
drop policy if exists "admin writes series" on public.series;
drop policy if exists "readers see volumes" on public.volumes;
drop policy if exists "admin writes volumes" on public.volumes;
drop policy if exists "readers see live chapters" on public.chapters;
drop policy if exists "admin writes chapters" on public.chapters;
drop policy if exists "admin pages" on public.pages;
drop policy if exists "parent hidden series" on public.child_hidden_series;
drop policy if exists "parent shelf" on public.shelf;
drop policy if exists "parent progress" on public.reading_progress;
drop policy if exists "parent reading days" on public.reading_days;
drop policy if exists "parent badges" on public.child_badges;
drop policy if exists "own subscriptions" on public.subscriptions;
drop policy if exists "admin uploads content" on storage.objects;
drop policy if exists "admin updates content" on storage.objects;
drop policy if exists "admin deletes content" on storage.objects;
drop policy if exists "admin reads content" on storage.objects;

create policy "own profile read" on public.profiles for select
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy "own profile update" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "parent manages children" on public.children for all
  using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));

create policy "readers see published series" on public.series for select
  using (status = 'published' or (select private.is_admin()));
create policy "admin inserts series" on public.series for insert with check ((select private.is_admin()));
create policy "admin updates series" on public.series for update using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin deletes series" on public.series for delete using ((select private.is_admin()));

create policy "readers see volumes" on public.volumes for select
  using ((select private.is_admin()) or exists (select 1 from public.series s where s.id = series_id and s.status = 'published'));
create policy "admin inserts volumes" on public.volumes for insert with check ((select private.is_admin()));
create policy "admin updates volumes" on public.volumes for update using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin deletes volumes" on public.volumes for delete using ((select private.is_admin()));

create policy "readers see live chapters" on public.chapters for select
  using (
    (select private.is_admin())
    or (status = 'approved' and publish_at <= now()
        and exists (select 1 from public.series s where s.id = series_id and s.status = 'published'))
  );
create policy "admin inserts chapters" on public.chapters for insert with check ((select private.is_admin()));
create policy "admin updates chapters" on public.chapters for update using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin deletes chapters" on public.chapters for delete using ((select private.is_admin()));

create policy "admin pages" on public.pages for all
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "parent hidden series" on public.child_hidden_series for all
  using (private.owns_child(child_id)) with check (private.owns_child(child_id));
create policy "parent shelf" on public.shelf for all
  using (private.owns_child(child_id)) with check (private.owns_child(child_id));
create policy "parent progress" on public.reading_progress for all
  using (private.owns_child(child_id)) with check (private.owns_child(child_id));
create policy "parent reading days" on public.reading_days for select using (private.owns_child(child_id));
create policy "parent badges" on public.child_badges for select using (private.owns_child(child_id));

create policy "own subscriptions" on public.subscriptions for select using (parent_id = (select auth.uid()));

create policy "admin uploads content" on storage.objects for insert to authenticated
  with check (bucket_id in ('covers', 'pages', 'originals') and (select private.is_admin()));
create policy "admin updates content" on storage.objects for update to authenticated
  using (bucket_id in ('covers', 'pages', 'originals') and (select private.is_admin()));
create policy "admin deletes content" on storage.objects for delete to authenticated
  using (bucket_id in ('covers', 'pages', 'originals') and (select private.is_admin()));
create policy "admin reads content" on storage.objects for select to authenticated
  using (bucket_id in ('pages', 'originals') and (select private.is_admin()));

drop function if exists public.is_admin();
drop function if exists public.owns_child(uuid);

-- ---- Functions ----
alter function public.protect_profile_columns() set search_path = public;
alter function public.limit_children() set search_path = public;
alter function public.check_chapter_approval() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---- Foreign-key indexes ----
create index if not exists chapters_reviewed_by_idx on public.chapters (reviewed_by);
create index if not exists chapters_volume_idx on public.chapters (volume_id);
create index if not exists child_hidden_series_series_idx on public.child_hidden_series (series_id);
create index if not exists reading_progress_series_idx on public.reading_progress (series_id);
create index if not exists shelf_series_idx on public.shelf (series_id);
