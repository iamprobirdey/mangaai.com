import { requireUser } from "@/lib/dal";
import { ResetPasswordForm } from "../forms";

export default async function ResetPasswordPage() {
  await requireUser();
  return (
    <>
      <h1 className="text-2xl">Choose a new password</h1>
      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </>
  );
}
