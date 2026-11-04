/*
  MangaAI service worker.
  - Chapters a reader opens stay readable offline for 7 days (handy for car trips), then expire.
  - Page images are cached by their storage path, ignoring the short-lived signature in the URL.
  - Everything is cleared on sign-out (the app posts {type: "clear"}).
  Online, the network always wins for pages and subscriptions, so cancelled plans and new limits apply immediately.
*/
const VERSION = "v2";
const STATIC = `mg-static-${VERSION}`;
const CHAPTERS = `mg-chapters-${VERSION}`;
const IMAGES = `mg-images-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_IMAGES = 800;
const MAX_CHAPTERS = 40;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, CHAPTERS, IMAGES]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await expire(CHAPTERS, MAX_CHAPTERS);
      await expire(IMAGES, MAX_IMAGES);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear") {
    event.waitUntil(Promise.all([caches.delete(CHAPTERS), caches.delete(IMAGES)]));
  }
});

function stamp(response) {
  const headers = new Headers(response.headers);
  headers.set("x-mg-cached-at", String(Date.now()));
  return response.blob().then((body) => new Response(body, { status: response.status, statusText: response.statusText, headers }));
}

function fresh(response) {
  const at = Number(response.headers.get("x-mg-cached-at") || 0);
  return Date.now() - at < MAX_AGE_MS;
}

async function expire(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const entries = await Promise.all(keys.map(async (k) => [k, await cache.match(k)]));
  const live = [];
  for (const [k, res] of entries) {
    if (!res || !fresh(res)) await cache.delete(k);
    else live.push([k, Number(res.headers.get("x-mg-cached-at"))]);
  }
  live.sort((a, b) => a[1] - b[1]);
  for (const [k] of live.slice(0, Math.max(0, live.length - max))) await cache.delete(k);
}

/** Saves the JS/CSS a chapter page needs so it can start without a network. */
async function cacheAssetsFrom(html) {
  const urls = new Set();
  const re = /(?:src|href)="(\/_next\/static\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) urls.add(m[1]);
  const cache = await caches.open(STATIC);
  await Promise.all(
    [...urls].map(async (u) => {
      if (await cache.match(u)) return;
      try {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      } catch {
        /* best effort */
      }
    }),
  );
}

/** Signed storage URL → stable cache key without the token. */
function imageKey(url) {
  return `${url.origin}${url.pathname}`;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Page images from Supabase Storage (private bucket, signed URLs).
  if (url.pathname.includes("/storage/v1/object/sign/pages/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGES);
        const key = imageKey(url);
        const hit = await cache.match(key);
        if (hit && fresh(hit)) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(key, await stamp(res.clone()));
          return res;
        } catch (e) {
          if (hit) return hit;
          throw e;
        }
      })(),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Built JS/CSS/fonts are content-hashed: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode !== "navigate") return;

  // Chapter pages: network first, keep a copy for offline reading.
  if (url.pathname.startsWith("/read/volume/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CHAPTERS);
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            event.waitUntil(
              (async () => {
                const stamped = await stamp(copy);
                await cache.put(url.pathname, stamped.clone());
                await cacheAssetsFrom(await stamped.text());
              })(),
            );
          }
          return res;
        } catch {
          const hit = await cache.match(url.pathname);
          if (hit && fresh(hit)) return hit;
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Any other page: network, with the offline page as a fallback.
  event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
});
