/**
 * Service Worker — Carnet de Badminton
 * ------------------------------------------------------------
 * Met en cache l'application elle-même (HTML, manifeste, icônes,
 * SDK Firebase) pour qu'elle continue de se lancer même sans
 * connexion, y compris après une fermeture complète du navigateur.
 *
 * Les DONNÉES (élèves, séances, résultats) ne sont pas gérées ici :
 * c'est Firestore qui s'occupe de leur mise en cache et de leur
 * synchronisation automatique (voir app.html).
 *
 * ⚠️ Changez CACHE_VERSION à chaque nouvelle mise en ligne de
 * l'application pour forcer les appareils à récupérer la
 * dernière version au prochain passage en ligne.
 */
const CACHE_VERSION = "badminton-v14";
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js"
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});
// Stratégie : "cache d'abord, réseau en secours" pour l'app elle-même.
// Cela garantit un chargement instantané et fiable hors-ligne.
// Les requêtes vers Firestore (firestore.googleapis.com) ne sont PAS
// interceptées ici : le SDK Firestore gère lui-même son propre cache
// et sa synchronisation hors-ligne.
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  if (url.includes("firestore.googleapis.com") || url.includes("google.com/apis")) {
    return; // laisser Firestore gérer ses propres requêtes
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // hors ligne : on retombe sur le cache
      return cached || networkFetch;
    })
  );
});
