# Nexus — P1 UX & Accessibility Change Report

## Ringkasan

Arsip `nexus-audit-fixes.zip` digunakan sebagai referensi baseline P1. Karena arsip tersebut tidak menyertakan seluruh source/configuration repository dan mengandung sebagian perubahan yang akan mengembalikan demo authentication dari P0, integrasinya dilakukan secara selektif. Perbaikan UX dan accessibility digabungkan ke repository P0 tanpa mengembalikan credential demo, project identifier Supabase, atau akses workspace berbasis localStorage.

## Perubahan yang diterapkan

| Area | Implementasi | Status |
|---|---|---|
| Modal keyboard accessibility | Quick capture, Course modal, dan Task modal memakai focus management: focus masuk ke dialog saat dibuka, Tab terperangkap di dalam dialog, Escape menutup, dan focus dikembalikan ke trigger. | Selesai |
| Dialog semantics | Dialog diberi `tabIndex={-1}`, label dialog dipertahankan, dan tombol close menggunakan label bahasa Indonesia yang bermakna. | Selesai |
| Offline UX | Status jaringan dipantau melalui `useOnlineStatus`; header menampilkan status offline dan quick capture menolak submit ke Supabase ketika koneksi terputus dengan pesan yang dapat ditindaklanjuti. | Selesai |
| Navigation accessibility | Navigasi desktop/mobile memakai `aria-current` untuk view aktif. Menu “Lainnya” memakai `aria-expanded` dan `aria-controls`. | Selesai |
| PWA reliability | Service worker diubah dari silent auto-update menjadi prompt. Pengguna dapat memilih “Muat ulang” atau “Nanti”; status offline-ready juga diumumkan melalui live region. | Selesai |
| Error recovery | Tasks mempertahankan retry saat pemuatan gagal; helper form error/hint digunakan untuk quick capture. | Selesai |
| Responsive/theme UX | Style status offline, PWA toast, form error/hint, dan reduced-motion fallback ditambahkan tanpa mengganti visual language. | Selesai |
| Regression protection | Test helper modal accessibility dari arsip terbaru ikut dipertahankan. | Selesai |

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npm test -- --run` | Lulus — 5 test files, 10 tests |
| `npx tsc -b` | Lulus |
| `npm run lint` | Lulus dengan 8 warning non-blocking dan 0 error |
| `npm run build` | Lulus — 18 precached entries, manifest dan service worker dibuat |
| P0 leak search | Tidak ditemukan project identifier, demo credential, service-role key, access token, atau refresh token pada source/public/migration |

## File utama yang berubah

- `src/App.tsx`
- `src/App.css`
- `src/vite-env.d.ts`
- `src/lib/useModalA11y.ts`
- `src/lib/useModalA11y.test.tsx`
- `src/lib/useOnlineStatus.ts`
- `src/components/PwaUpdateNotice.tsx`
- `src/features/courses/CoursesPage.tsx`
- `src/features/tasks/TasksPage.tsx`
- `vite.config.ts`
- `public/_headers`

## Asumsi dan batasan

Arsip pengguna tidak memuat `package.json`, migration, seluruh feature directory, atau source P0 secara lengkap. Oleh karena itu arsip diperlakukan sebagai sumber perubahan P1, bukan sebagai pengganti penuh repository. Source yang berpotensi mengembalikan demo login dan membocorkan konfigurasi internal sengaja tidak disalin.

Validasi browser manual untuk keyboard trap, VoiceOver/NVDA, installability, update prompt, dan perilaku offline pada device nyata masih perlu dilakukan setelah deployment. Automated tests memvalidasi helper modal dan regression suite, sedangkan dukungan assistive technology perlu diverifikasi pada browser target.

Lint tetap melaporkan delapan warning React `set-state-in-effect` yang tidak diperkenalkan oleh perubahan P1 dan tidak memblokir build. Warning tersebut dicatat sebagai pekerjaan lanjutan, bukan disembunyikan atau dinonaktifkan.
