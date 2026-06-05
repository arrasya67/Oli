const CACHE_NAME = 'olitracker-v11';

// Daftar aset lengkap yang wajib dikunci di HP agar 100% fungsional saat offline
const assets = [
  './',
  './index.html',
  './app.js',          // Wajib ditambahkan karena logika aplikasi sudah pindah ke sini
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght=400;600;700;800&display=swap'
];

// Mengunduh dan mengunci aset saat instalasi pertama
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Membersihkan cache lama secara otomatis saat versi CACHE_NAME naik
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Mencegat request: Ambil dari cache lokal HP, jika tidak ada baru cari ke internet
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});