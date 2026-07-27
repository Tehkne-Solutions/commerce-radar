const CACHE = 'commerce-radar-v24';
const ASSETS = ['./', './index.html', './styles.css', './v021.css', './cloud.css', './cloud-diagnostics.css', './cloud-history.css', './import.css', './marketplace-adapters.css', './financial-audit.css', './financial-reconciliation.css', './financial-close.css', './financial-planning.css', './trend-radar.css', './trend-queue.css', './trend-calendar.css', './trend-operations.css', './trend-sla.css', './recommendations.css', './recommendation-calibration.css', './recommendation-segments.css', './recommendation-profile-control.css', './recommendation-drift.css', './data.js', './app.js', './v021.js', './module-loader.js', './cloud-config.js', './cloud.js', './cloud-bootstrap.js', './cloud-diagnostics.js', './cloud-history.js', './marketplace-adapters.js', './import.js', './financial-audit.js', './financial-reconciliation.js', './financial-close.js', './financial-planning.js', './trend-radar.js', './trend-queue.js', './trend-calendar.js', './trend-operations.js', './trend-sla.js', './recommendations.js', './recommendation-calibration.js', './recommendation-segments.js', './recommendation-profile-control.js', './recommendation-drift.js', './manifest.webmanifest'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});