# UmrahQu — Web Travel

Dashboard untuk travel umrah (Next.js 16 App Router, JavaScript `.jsx`) dengan
database Supabase yang sama dipakai oleh Web Admin UmrahQu dan Marketplace.

## Menjalankan

```bash
npm install
npm run dev          # buka http://localhost:3000/travel
```

Buat `.env.local` di root project (file ini tidak ikut ter-commit):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Build produksi: `npm run build` lalu `npm start`.

> Variabel `NEXT_PUBLIC_*` ikut terkirim ke browser. Jangan pernah menaruh
> `service_role` key atau secret key apa pun di sisi frontend.

## Akun demo

| Email | Peran | Travel |
| --- | --- | --- |
| `siti.nur@annahil.co.id` | Travel Operational | An-Nahl |
| `ahmad.fauzi@batiktravel.id` | Travel Admin | Batik Travel |
| `dewi.lestari@persadaindonesia.id` | Travel Admin | Persada Indonesia |
| `admin@umrahqu.com` | Super Admin | — |

Password keempat akun demo: `Pwd123!@#`.

> Ganti password ini sebelum akun demo ikut ke lingkungan produksi. Keempatnya
> berada di database berbagi yang sama dengan Web Admin dan Marketplace.

## Fitur per peran

**Travel Admin** — seluruh modul: dashboard, pesanan, jamaah & dokumen,
keberangkatan (manasik, manifest/penempatan kamar-kursi, perlengkapan),
keuangan (pembayaran, cicilan), master data (paket umrah, hotel, agen/reseller),
pengaturan (profil travel, data cabang, rekap per cabang).

**Travel Operational** — sama seperti Admin, kecuali pencatatan/void pembayaran
dan cicilan serta perubahan profil travel. Untuk peran ini halaman profil
menampilkan data read-only dan form pembayaran menolak menyimpan.

**Super Admin** — melihat seluruh travel, dan satu-satunya peran yang bisa
menulis master platform (mis. hotel dengan `travel_id` kosong).

Semua penulisan memakai sesi user (cookie Supabase), jadi RLS yang membatasi
akses antar-travel — tidak ada jalur yang menyamar sebagai service role.

## Migrasi yang menunggu review

Dua file SQL berikut **sudah dibuat tetapi sengaja belum dijalankan**. Review
dulu, lalu jalankan lewat Supabase Dashboard ▸ SQL Editor. Keduanya berakhir
dengan `rollback;` sebagai dry-run — ganti menjadi `commit;` untuk memakai.

- `supabase/migrations/20261117_fix_payment_rls.sql` — menutup celah RLS pada
  `payments`/`installments` agar travel tidak bisa mencatat pembayaran untuk
  pesanan travel lain.
- `supabase/migrations/20261117_hotels_travel_write.sql` — mengizinkan travel
  menulis hotel miliknya sendiri. Tanpa migrasi ini, halaman Master Hotel tetap
  membaca dan menyaring data dengan benar, tetapi simpan/hapus ditolak dengan
  pesan yang menjelaskan penyebabnya.

## Struktur singkat

```
src/app/(travel)/...        halaman Web Travel (path publik: /travel/...)
src/components/travel/...   komponen UI bersama (record-table, record-form, dll.)
src/lib/data/...            baca-layer + server actions per modul
src/lib/supabase/...        client browser & client server (@supabase/ssr)
supabase/migrations/...     SQL yang menunggu dijalankan manual
```
