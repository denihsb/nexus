# Nexus — P0 Security Audit Change Report

## Ringkasan

Perbaikan teknis diterapkan pada repository Nexus tanpa mengganti stack, dependency utama, arsitektur data, product brief, positioning, atau visual language. Fokus perubahan adalah menghilangkan kebocoran informasi internal dari UI, menutup jalur autentikasi demo yang hardcoded, memperkuat session guard pada root application, dan menambahkan validasi ownership lintas relasi database.

## Perubahan yang diterapkan

| Area | Perubahan | Status |
|---|---|---|
| UI production security | Menghapus project identifier Supabase dan label status internal dari layar login. | Selesai |
| Authentication | Menghapus email/password demo hardcoded dan localStorage flag sebagai dasar akses workspace. | Selesai |
| Session lifecycle | Menggunakan `getSession` dan `onAuthStateChange` dengan cleanup subscription serta reset user state saat session hilang/logout. | Selesai |
| Error handling | Pesan auth yang terlihat pengguna dibuat netral; logging internal hanya mencatat kategori/status error, bukan token atau detail sensitif. | Selesai |
| Database ownership | Menambahkan migration `004_task_relation_ownership.sql` untuk memastikan `tasks.course_id` dan `tasks.inbox_item_id` hanya merujuk resource milik `tasks.user_id`. | Selesai |
| PWA | Build menghasilkan manifest dan service worker. Konfigurasi yang ada hanya melakukan precache asset statis; tidak ditambahkan cache runtime untuk API/private data. | Terverifikasi |
| Tests | Test auth diperbarui untuk menegaskan bahwa aplikasi tidak melakukan demo login ketika Supabase tidak tersedia. | Selesai |

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npm test -- --run` | Lulus — 4 test files, 7 tests |
| `npx tsc -b` | Lulus |
| `npm run lint` | Lulus dengan 8 warning yang sudah ada/bersifat non-blocking, 0 error |
| `npm run build` | Lulus — Vite/PWA menghasilkan `manifest.webmanifest`, `sw.js`, dan asset precache |
| Pencarian project ID, demo credential, service-role key, access/refresh token di source | Tidak menemukan referensi terlarang |

## Asumsi dan batasan verifikasi

Audit repository ini tidak memiliki kredensial atau koneksi langsung ke project Supabase produksi, sehingga status aktual RLS dan policy yang telah diterapkan di remote database tidak dapat dibuktikan dari source saja. Migration `004_task_relation_ownership.sql` harus diterapkan melalui workflow migration resmi pada environment target.

Source menunjukkan bahwa route private saat ini dirender melalui satu root application, bukan router dengan route URL terpisah. Guard autentikasi berada di level `App`; akses workspace hanya dirender ketika session Supabase terdeteksi. Verifikasi langsung terhadap deep link, expiry token, dan logout pada browser produksi tetap perlu dilakukan setelah deploy.

Anon key Supabase tetap digunakan melalui `VITE_SUPABASE_ANON_KEY`, sebagaimana pola client Supabase. Nilai tersebut bukan service-role credential; service-role key dan credential server tidak boleh dimasukkan ke environment `VITE_*` atau client bundle.

Mode tanpa konfigurasi Supabase sekarang tidak memberikan akses demo. Pengguna melihat status layanan yang netral dan tombol auth dinonaktifkan, sehingga aplikasi tidak lagi memberikan hardcoded success state atau private workspace berbasis localStorage.

## File utama yang berubah

- `src/lib/supabase.ts`
- `src/features/auth/AuthScreen.tsx`
- `src/features/auth/AuthScreen.test.tsx`
- `src/App.tsx`
- `supabase/migrations/004_task_relation_ownership.sql`
- `SECURITY_AUDIT_CHANGE_REPORT.md`
