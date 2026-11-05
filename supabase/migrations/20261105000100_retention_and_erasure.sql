-- Data retention and erasure (DPDP Act s.8(7), COPPA 16 CFR 312.10: no indefinite retention).
-- The written retention schedule is published in the privacy policy (/privacy#retention); keep
-- the numbers here and there in step.

-- Erase stored Razorpay notification payloads for a family that deletes its account. They can hold
-- the parent's email and phone, and have no foreign key to the profile, so they don't cascade.
create or replace function public.forget_billing_events(p_subscription_ids text[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_subscription_ids is null or array_length(p_subscription_ids, 1) is null then return 0; end if;
  delete from public.billing_events e
  where exists (select 1 from unnest(p_subscription_ids) s where e.payload::text like '%' || s || '%');
  get diagnostics n = row_count;
  return n;
end $$;

-- Daily purge, called by /api/cron/daily-maintenance.
--   reading_days   (minutes/pages per child per day)   400 days
--   email_log      (which emails were sent / opened)     400 days
--   billing_events (raw Razorpay notifications)          400 days
--   subscriptions never paid for (created / cancelled before any charge)  30 days
create or replace function public.purge_expired_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare d int; e int; b int; s int;
begin
  delete from public.reading_days where day < (now() - interval '400 days')::date;
  get diagnostics d = row_count;
  delete from public.email_log where sent_at < now() - interval '400 days';
  get diagnostics e = row_count;
  delete from public.billing_events where created_at < now() - interval '400 days';
  get diagnostics b = row_count;
  delete from public.subscriptions
  where first_charged_at is null
    and status in ('created', 'cancelled', 'expired')
    and created_at < now() - interval '30 days';
  get diagnostics s = row_count;
  return jsonb_build_object('reading_days', d, 'email_log', e, 'billing_events', b, 'unpaid_subscriptions', s);
end $$;

revoke execute on function public.forget_billing_events(text[]) from public, anon, authenticated;
revoke execute on function public.purge_expired_data() from public, anon, authenticated;
grant execute on function public.forget_billing_events(text[]) to service_role;
grant execute on function public.purge_expired_data() to service_role;
