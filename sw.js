// ---------- service worker : l'app s'ouvre même sans réseau ----------
// Les fichiers du site sont gardés en cache. Stratégie « cache d'abord, mise à jour en arrière-plan » :
// l'app démarre instantanément, et une nouvelle version mise en ligne s'affiche à l'ouverture suivante.
// Après une grosse modification, changer VERSION force le renouvellement complet du cache.
const VERSION = "cf-v1";
const FILES = [
  "./", "manifest.webmanifest", "css/style.css",
  "js/app.js", "js/auth.js", "js/config.js", "js/data.js", "js/storage.js", "js/vendor/supabase.js",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // polices Google : gardées en cache pour l'affichage hors ligne
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  // tout le reste hors du site (Supabase notamment) passe directement par le réseau
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    // toute ouverture de page (y compris un lien de connexion avec ?… ou #…) sert la page d'accueil
    const key = req.mode === "navigate" ? "./" : req;
    const cached = await cache.match(key, { ignoreSearch: req.mode === "navigate" });
    const fresh = fetch(req).then(res => {
      // une réponse redirigée ne peut pas servir à ouvrir une page : on ne la garde pas
      if (res.ok && !res.redirected) cache.put(key, res.clone());
      return res;
    }).catch(() => cached);
    if (cached) { e.waitUntil(fresh); return cached; }
    return fresh;
  }));
});
