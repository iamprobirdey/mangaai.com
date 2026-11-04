-- Country-based pricing: remember what each subscription was sold at,
-- so revenue analytics and emails don't depend on current environment settings.
alter table public.subscriptions
  add column if not exists amount int,       -- smallest currency unit (paise / cents)
  add column if not exists currency text;    -- ISO code, e.g. INR or USD
