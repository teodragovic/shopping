// ─── Service worker: offline app shell + CDN caching ──────────────────────────
// Firestore handles its own offline data/sync via IndexedDB persistence, so this
// worker only needs to make the app *shell* (HTML/CSS/JS + CDN deps) available
// offline. Bump CACHE_VERSION whenever the shell files change to force an update.

const CACHE_VERSION = 'v2';
const CACHE_NAME = `sharedlist-${CACHE_VERSION}`;

// Local app shell — must be cached for the app to boot offline.
const LOCAL_SHELL = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './firebase-config.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

// Cross-origin deps loaded from CDNs. Best-effort precache (network/CORS may
// fail); they are also cached at runtime by the fetch handler below.
const CDN_SHELL = [
    'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js',
    'https://esm.sh/htm/preact/standalone',
];

// Hosts that must NEVER be intercepted — live Firebase/Google auth + data
// traffic. Firestore's own persistence layer manages these offline.
const BYPASS_HOSTS = [
    'firestore.googleapis.com',
    'firebaseinstallations.googleapis.com',
    'firebaseremoteconfig.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'www.googleapis.com',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(LOCAL_SHELL);
            // CDN deps: cache individually so one failure doesn't abort install.
            await Promise.all(
                CDN_SHELL.map((url) =>
                    cache.add(new Request(url, { mode: 'cors' })).catch(() => {})
                )
            );
            await self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            );
            await self.clients.claim();
        })()
    );
});

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
        })
        .catch(() => null);
    return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Let live Firebase/Google auth + Firestore traffic pass straight through.
    if (BYPASS_HOSTS.includes(url.hostname)) return;

    // Navigations: network-first (fresh shell when online), fall back to the
    // cached index so the app still boots offline.
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const res = await fetch(request);
                    const cache = await caches.open(CACHE_NAME);
                    cache.put('./index.html', res.clone());
                    return res;
                } catch {
                    const cache = await caches.open(CACHE_NAME);
                    return (
                        (await cache.match(request)) ||
                        (await cache.match('./index.html')) ||
                        (await cache.match('./')) ||
                        Response.error()
                    );
                }
            })()
        );
        return;
    }

    // Everything else (local static assets + CDN deps): stale-while-revalidate.
    event.respondWith(staleWhileRevalidate(request));
});
