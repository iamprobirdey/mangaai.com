-- Each volume (book) has its own cover. The series cover stays optional; when it's missing the
-- app shows the first volume's cover.
alter table public.chapters add column if not exists cover_path text;

-- Cover uploads use upsert, which needs SELECT on the object as well as INSERT/UPDATE. The admin
-- read policy only listed the private buckets, so every cover upload failed with 400.
drop policy if exists "admin reads content" on storage.objects;
create policy "admin reads content" on storage.objects for select to authenticated
  using (bucket_id in ('covers', 'pages', 'originals') and (select private.is_admin()));
