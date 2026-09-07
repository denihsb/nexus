# Diagnosis `npm test -- --run`

## Kesimpulan

Output pengguna menunjukkan bahwa yang dijalankan bukan baseline P0/P1 terakhir secara utuh, melainkan versi yang masih mengandung sebagian perubahan Claude yang mengembalikan demo authentication dan logging Supabase project reference.

## Tiga masalah terpisah

| Gejala | Penyebab | Perbaikan |
|---|---|---|
| `file:///@vite-plugin-pwa/virtual:pwa-register/react` | Vitest/jsdom mencoba memuat virtual PWA module runtime. | Mock `virtual:pwa-register/react` pada `src/test/setup.ts`. |
| Test Auth gagal karena tombol tidak disabled dan teks demo tampil | `AuthScreen.tsx` di branch yang diuji masih versi demo mode Claude, bukan versi P0 netral. | Pulihkan AuthScreen P0: tanpa hardcoded demo credential, tombol disabled jika Supabase tidak terkonfigurasi, dan pesan netral. |
| `[nexus] Supabase project ref (dev only): ...` | `src/lib/supabase.ts` di branch yang diuji masih menghitung/mencetak project reference. | Hapus project-ref derivation dan `console.debug` tersebut. Jangan commit atau tampilkan identifier internal. |

## Fix yang sudah diterapkan pada workspace baseline

`src/test/setup.ts` sekarang mem-mock virtual PWA module. Setelah perubahan ini, baseline workspace lulus:

- 5 test files passed.
- 10 tests passed.
- Typecheck passed.

## Instruksi untuk branch lokal yang diuji

Pastikan `AuthScreen.tsx` dan `src/lib/supabase.ts` berasal dari baseline P0/P1 terakhir, bukan dari arsip Claude yang masih memuat `DEMO_EMAIL`, `DEMO_PASSWORD`, `supabaseProjectRef`, atau log `Supabase project ref`. Setelah itu jalankan:

```bash
npm ci
npm test -- --run
npm run lint
npm run build
```

Mock Vitest harus berada pada file setup yang dirujuk `vite.config.ts` melalui `test.setupFiles`, bukan hanya pada satu test file, supaya semua test yang merender `App` mendapat mock yang sama.
