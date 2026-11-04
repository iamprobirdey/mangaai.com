"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { isParentFacingPath } from "@/lib/site";

/*
  Google Analytics 4, set up for a children's service:
  - Loads only on parent-facing pages (landing, sign-up/in, guides, legal pages, grown-ups area), never on
    children's screens (/profiles, /read, series pages) or the admin studio.
  - Loads only after the visitor accepts the banner (no cookies before consent).
  - Google Signals and ad personalisation are off; ad storage is always denied.
  - When the browser navigates to a non-allowed page, GA is disabled with Google's opt-out flag.
  - Query strings are dropped from page URLs.
*/

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CONSENT_KEY = "mg_analytics_consent";
const OPEN_EVENT = "mg-consent-open";
type Consent = "granted" | "denied" | null;

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
    [key: `ga-disable-${string}`]: boolean | undefined;
    __mgLastPageView?: string;
  }
}

function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function writeConsent(v: "granted" | "denied") {
  try {
    window.localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* private mode: banner will ask again next visit */
  }
  listeners.forEach((l) => l());
}

function deleteGaCookies() {
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      const domain = location.hostname.replace(/^www\./, "");
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

/** Send a GA event, only if GA is loaded, consented and allowed on the current page. */
export function track(event: string, params: Record<string, string | number | boolean> = {}) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag || window[`ga-disable-${GA_ID}`]) return;
  window.gtag("event", event, params);
}

/** A footer link that reopens the consent choice. */
export function CookieSettingsButton() {
  if (!GA_ID) return null;
  return (
    <button type="button" className="text-left underline" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Cookie settings
    </button>
  );
}

export function Analytics() {
  const path = usePathname() ?? "/";
  const allowed = isParentFacingPath(path);
  const consent = useSyncExternalStore<Consent>(subscribe, readConsent, () => "denied");
  const [reopened, setReopened] = useState(false);
  const active = Boolean(GA_ID) && allowed && consent === "granted";

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  // Turn GA off on pages where it must not run, and send a page view on allowed pages.
  useEffect(() => {
    if (!GA_ID) return;
    window[`ga-disable-${GA_ID}`] = !active;
    // The init script already counted the page it loaded on; skip that one.
    if (active && window.gtag && window.__mgLastPageView !== path) {
      window.__mgLastPageView = path;
      window.gtag("event", "page_view", {
        page_location: `${location.origin}${path}`,
        page_path: path,
        page_title: document.title,
      });
    }
  }, [active, path]);

  if (!GA_ID) return null;
  // First-time ask only on pages where GA can run; "Cookie settings" reopens it anywhere.
  const showBanner = (allowed && consent === null) || reopened;

  return (
    <>
      {active ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
gtag('js', new Date());
gtag('config', '${GA_ID}', {
  send_page_view: false,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  page_location: location.origin + location.pathname
});
gtag('event', 'page_view', { page_location: location.origin + location.pathname, page_path: location.pathname, page_title: document.title });
window.__mgLastPageView = location.pathname;`}
          </Script>
        </>
      ) : null}

      {showBanner ? (
        <div role="dialog" aria-label="Cookie choice" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
          <div className="panel mx-auto flex max-w-3xl flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <p className="text-sm sm:flex-1">
              We&apos;d like to use Google Analytics cookies on pages for grown-ups, to see how families find MangaAI. We never
              use them on children&apos;s screens and never for ads.{" "}
              <a href="/privacy#analytics" className="underline">Learn more</a>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  writeConsent("denied");
                  if (GA_ID) window[`ga-disable-${GA_ID}`] = true;
                  deleteGaCookies();
                  setReopened(false);
                }}
              >
                No thanks
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  writeConsent("granted");
                  setReopened(false);
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
