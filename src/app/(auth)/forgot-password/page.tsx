import { ForgotPasswordForm } from "../forms";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl">Reset your password</h1>
      <p className="mb-6 mt-1">We&apos;ll email you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </>
  );
}
