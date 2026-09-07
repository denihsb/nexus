# Nexus Dark Mode Restoration

Regresi dark mode berasal dari stylesheet yang masih memakai warna terang hardcoded pada beberapa kontrol dan surface, terutama input form, placeholder, mobile navigation, empty state, setup message, priority badge, dan capture note. Perbaikannya menggunakan scoped `:root[data-theme="dark"]` overrides sehingga layout dan visual language tidak berubah.

Perubahan juga memastikan document background mengikuti `--canvas`, input memakai surface gelap dengan border `--line-strong`, placeholder memiliki kontras yang sesuai, dan status/error surfaces memakai `--amber-light`, `--coral-light`, atau `--teal-light` versi dark theme.

Validasi setelah perubahan:

- `npm test -- --run`: 5 test files, 10 tests lulus.
- `npx tsc -b`: lulus.
- `npm run lint`: 8 warning non-blocking, 0 error.
- `npm run build`: lulus; PWA menghasilkan manifest dan service worker.
