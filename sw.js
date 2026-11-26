// Lưu sẵn giao diện để mở nhanh (dữ liệu luôn lấy mới từ máy chủ) + nhận thông báo đẩy
const CACHE = 'lichhoc-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
self.addEventListener('push', e => {
  let m = {}; try { m = e.data.json(); } catch { m = { title: 'Lịch Học', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(m.title || 'Lịch Học', {
    body: m.body || '', tag: m.tag, renotify: !!m.tag, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: m.url || './' }, lang: 'vi'
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const app = list.find(c => c.url.startsWith(self.registration.scope));
    if (app && url.startsWith(self.registration.scope)) { app.navigate(url).catch(() => {}); return app.focus(); }
    return self.clients.openWindow(url);
  }));
});
