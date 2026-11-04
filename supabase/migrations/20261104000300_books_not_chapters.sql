-- One PDF = one book. A series is a run of volumes (Volume 1, Volume 2, …), and each volume is
-- a single uploaded PDF. The `chapters` table keeps its name internally and now stores volumes;
-- the old grouping table `volumes` and per-chapter flags are removed.
--
-- Access rule changes with it: no free-preview flag. Families without a trial or plan can read
-- the first few pages of every volume (enforced in the app); trial and paid families read all.
-- No scheduled releases: approving a volume publishes it immediately.

-- Test content is wiped (series cascades to chapters, pages and reading_progress).
delete from public.child_badges;
delete from public.reading_days;
delete from public.series;

drop index if exists public.chapters_volume_idx;
alter table public.chapters drop column if exists volume_id;
alter table public.chapters drop column if exists is_free_preview;
drop table if exists public.volumes;

alter table public.series drop column if exists release_day;

comment on table public.chapters is 'Volumes of a series. Each row is one uploaded PDF (one book).';
