import type { Metadata, Viewport } from "next";
import "@fontsource/mochiy-pop-one/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MangaAI — manga for kids", template: "%s · MangaAI" },
  description: "Safe, ad-free manga for kids, with new chapters every week. Parents pay, kids read.",
};

export const viewport: Viewport = { themeColor: "#1c1f4a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
