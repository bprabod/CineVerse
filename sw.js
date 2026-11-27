/* CineVerse offline + repeat-visit cache. Bump CACHE_VERSION when changing cache rules. */
const CACHE_VERSION = "cineverse-v11";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;
const CORE_URLS = [
  "/CineVerse/",
  "/CineVerse/index.html",
  "/CineVerse/style.css",
  "/CineVerse/script.js",
  "/CineVerse/hero-cache.js",
  "/CineVerse/favicon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then(cache => cache.addAll(CORE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keep = new Set([CORE_CACHE, PAGE_CACHE, DATA_CACHE, IMAGE_CACHE, FONT_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("cineverse-") && !keep.has(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "https:" && url.origin !== self.location.origin) return;

  // Never cache account/auth or user-specific Supabase data.
  if (url.hostname.endsWith("supabase.co")) {
    if (url.pathname.includes("/auth/") || url.pathname.includes("/storage/")) return;
    if (url.pathname.includes("/functions/v1/tmdb-proxy") || url.pathname.includes("/rest/v1/homepage_")) {
      event.respondWith(networkFirst(request, DATA_CACHE));
    }
    return;
  }

  if (url.hostname === "image.tmdb.org") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE).catch(() => caches.match("/CineVerse/")));
    return;
  }

  if (/\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, CORE_CACHE));
  }
});
