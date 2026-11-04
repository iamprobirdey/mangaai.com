import type { Metadata, Viewport } from "next";
import "@fontsource/mochiy-pop-one/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { Analytics } from "@/components/analytics";
import { isIndexable, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "MangaAI — safe manga books for kids", template: "%s · MangaAI" },
  description:
    "Age-right manga books for kids aged 4 to 13+. No ads, no chat. Parents pay and stay in charge with a PIN, reading limits and a weekly email.",
  applicationName: "MangaAI",
  openGraph: { type: "website", siteName: "MangaAI", locale: "en_IN", url: "/" },
  twitter: { card: "summary_large_image" },
  robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: "MangaAI", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#1c1f4a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <ServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
