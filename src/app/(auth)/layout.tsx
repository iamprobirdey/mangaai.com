import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="screentone flex flex-1 flex-col items-center px-4 py-10">
      <Logo />
      <main className="panel mt-8 w-full max-w-md p-6 sm:p-8">{children}</main>
    </div>
  );
}
