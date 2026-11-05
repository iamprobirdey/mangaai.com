import { getProfile, getUser } from "@/lib/dal";
import { SignOutButton } from "@/components/service-worker";
import { DeleteAccountForm, PinForm, SettingsForm } from "./settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [profile, user] = await Promise.all([getProfile(), getUser()]);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Settings</h1>
      <section className="panel p-5">
        <h2 className="text-xl">Account</h2>
        <p className="mt-1">Signed in as <strong>{user?.email}</strong></p>
        <SettingsForm displayName={profile.display_name ?? ""} weeklyDigest={profile.weekly_digest} />
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="text-xl">Grown-ups PIN</h2>
        <PinForm />
      </section>
      <section className="panel p-5">
        <h2 className="text-xl">Your data</h2>
        <p className="mt-1">
          Download everything MangaAI keeps about your family (your account, each reader profile and their reading history) as a
          file. See the <a className="underline" href="/privacy">privacy policy</a> for what we keep and for how long.
        </p>
        <a href="/parent/export" className="btn mt-4" download>Download my data</a>
      </section>
      <section className="panel-flat border-alert p-5">
        <h2 className="text-xl">Delete account</h2>
        <p className="mt-1">
          This cancels your subscription and permanently deletes your account, every reader profile and all reading history.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
