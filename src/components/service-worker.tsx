"use client";
import { useEffect } from "react";

/** Registers the offline-reading service worker in production. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* offline reading just won't be available */
    });
  }, []);
  return null;
}

/** Wipes offline chapters (call before signing out or deleting the account). */
export async function clearOfflineData() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    reg?.active?.postMessage({ type: "clear" });
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("mg-chapters") || k.startsWith("mg-images")).map((k) => caches.delete(k)));
  } catch {
    /* nothing cached */
  }
}

export function SignOutButton({ className = "btn" }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post" onSubmit={() => void clearOfflineData()}>
      <button className={className} type="submit">Sign out</button>
    </form>
  );
}

/** Offline chapters belong to one reader: clear them when a different reader is chosen on this device. */
export function rememberReader(childId: string) {
  try {
    if (window.localStorage.getItem("mg_last_reader") !== childId) {
      void clearOfflineData();
      window.localStorage.setItem("mg_last_reader", childId);
    }
  } catch {
    void clearOfflineData();
  }
}
