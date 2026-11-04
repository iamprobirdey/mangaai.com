function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const serverEnv = {
  supabaseSecret: () =>
    required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
  appSecret: () => required("APP_SECRET", process.env.APP_SECRET),
  timezone: () => process.env.APP_TIMEZONE ?? "Asia/Kolkata",
  razorpayKeyId: () => required("RAZORPAY_KEY_ID", process.env.RAZORPAY_KEY_ID),
  razorpayKeySecret: () => required("RAZORPAY_KEY_SECRET", process.env.RAZORPAY_KEY_SECRET),
  razorpayWebhookSecret: () => required("RAZORPAY_WEBHOOK_SECRET", process.env.RAZORPAY_WEBHOOK_SECRET),
  trialDays: () => Number(process.env.TRIAL_DAYS ?? 7),
  graceDays: () => Number(process.env.GRACE_DAYS ?? 3),
  resendKey: () => process.env.RESEND_API_KEY,
  emailFrom: () => process.env.EMAIL_FROM ?? "MangaAI <hello@mangaai.com>",
  cronSecret: () => required("CRON_SECRET", process.env.CRON_SECRET),
};
