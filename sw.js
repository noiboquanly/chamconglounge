/* Service worker – app Chấm công nội bộ
   - index.html: ƯU TIÊN MẠNG -> mọi máy tự lấy bản mới nhất khi có mạng.
   - Offline: dùng bản đã lưu để vẫn mở được.
   - KHÔNG cache dữ liệu Firebase (luôn lấy mới). */
const CACHE = 'chamcong-v10';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();                 // kích hoạt bản mới ngay
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request, url = req.url;
  if (req.method !== 'GET') return;
  // Dữ liệu Firebase -> để mạng lo, không đụng cache
  if (url.includes('firebaseio.com') || url.includes('firebasedatabase.app') || url.includes('identitytoolkit')) return;

  // Mở app (điều hướng): ưu tiên MẠNG, offline mới dùng cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const c = res.clone();
        caches.open(CACHE).then(ch => ch.put('./index.html', c));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Tài nguyên khác (icon, font, SDK): dùng cache cho nhanh, cập nhật ngầm
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const c = res.clone();
          caches.open(CACHE).then(ch => ch.put(req, c));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
