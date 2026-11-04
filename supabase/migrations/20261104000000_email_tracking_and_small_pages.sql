-- Email delivery/open tracking (Resend webhooks) and a phone-sized rendition for each page.

alter table public.email_log
  add column if not exists provider_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists ref_id text; -- e.g. the subscription a trial reminder was about

create unique index if not exists email_log_provider_idx on public.email_log (provider_id) where provider_id is not null;
create index if not exists email_log_kind_ref_idx on public.email_log (kind, ref_id);

alter table public.pages
  add column if not exists image_path_sm text,
  add column if not exists width_sm int,
  add column if not exists height_sm int;
