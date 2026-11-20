-- =============================================================================
-- UmrahQu Travel — MODUL 7 (Master Data Hotel): travel boleh menulis hotelnya sendiri
-- File   : supabase/migrations/20261117_hotels_travel_write.sql
-- Tanggal: 2026-11-16
-- Status : BELUM DIJALANKAN. Ditulis untuk direview lebih dulu.
--
-- Sifat  : MENAMBAH policy (aditif). Tidak ada tabel, kolom, trigger, index,
--          bucket, atau baris yang diubah/dihapus. Tidak ada policy lama yang
--          di-drop. Tabel tetangga (users, bookings, websites, domains, faqs,
--          complaints, registrations, reviews, withdraws, logs, notifications,
--          booking_stats, finance_stats, analytics_*) TIDAK disentuh.
--
-- MASALAHNYA (dibuktikan 2026-11-16 lewat probe REST):
--   `hotels` adalah master data BERSAMA yang dibagi semua travel. 20261116_init_schema.sql
--   Bagian 8 sengaja hanya memasang policy baca:
--       hotels_select_shared  for select  using (travel_id is null
--                                                or travel_id = auth_travel_id()
--                                                or is_super_admin())
--   dan menulis tetap tunduk pada policy jaman dashboard lama (`is_admin()`),
--   sedang loop Bagian 8 TIDAK meng-include hotels. Probe sebagai Ahmad
--   (travel_admin Batik, JWT asli):
--       POST /rest/v1/hotels {nama: <hotel baru>, travel_id: <Batik>}
--         → HTTP 403, SQLSTATE 42501
--   Jadi halaman /master-data/hotel yang sudah jadi (Tambah / Ubah / Hapus)
--   akan selalu gagal simpan untuk akun travel. Super admin tidak terkena
--   (is_admin() / is_super_admin() sudah diloloskan).
--
-- PERBAIKANNYA:
--   Dua policy baru yang hanya berlaku untuk baris MILIK SENDIRI:
--     * INSERT  → wajib travel_id = auth_travel_id() (tidak bisa menitip baris
--                 ke travel lain, dan tidak bisa membuat "master platform"
--                 baru karena travel_id tidak boleh NULL).
--     * UPDATE  → USING + WITH CHECK travel_id = auth_travel_id(): baris
--                 master platform (travel_id NULL) dan baris travel lain tetap
--                 tidak tersentuh, termasuk tidak bisa "dipindahtangankan".
--   DELETE sengaja TIDAK ditambah: aplikasi hanya soft-delete (kolom
--   `deleted_at`), jadi hak hapus total cukup milik super admin.
--
--   Nama policy baru (`_insert_own` / `_update_own`) sengaja beda dari policy
--   lama. Policy untuk command yang sama bersifat permisif dan digabung dengan
--   OR, jadi `hotels_insert` / `hotels_update` lama (is_admin()) tetap hidup dan
--   super admin tidak kehilangan akses apa pun.
--
-- KONSEKUENSI YANG PERLU DISADARI:
--   1) Semua role yang punya `travel_id` di profiles (travel_admin,
--      travel_finance, travel_operational, travel_staff) bisa menulis hotelnya
--      sendiri. Ini disengaja dan sama dengan modul lain (paket, jamaah,
--      pesanan, manasik) yang tidak memfilter per role. Pembatasan role tetap
--      ada di aplikasi untuk halaman keuangan.
--   2) Baris hasil INSERT dari Web Travel selalu punya `travel_id` terisi, jadi
--      tidak akan pernah terlihat sebagai master platform.
--   3) Hotel milik travel A tidak terbaca oleh travel B (policy SELECT lama
--      tetap menyaring), jadi kolom "Kota / Hotel" di form paket tidak berubah
--      isinya.
--
-- CARA MENJALANKAN (Dashboard ▸ SQL Editor), dua langkah:
--   a. dry-run  : jalankan seluruh isi file, biarkan berakhir `rollback;`
--                 → harus sukses tanpa error, tanpa perubahan apa pun.
--   b. pakai    : jalankan isi yang sama dengan `commit;` lalu cek VERIFIKASI
--                 dan PROBES di bawah.
--
-- CATATAN SEBELUM EKSEKUSI: jalankan dulu blok "PRA-CEK" di bawah. Aplikasi hanya
--   mengisi kolom: nama, kota, bintang, jarak, alamat, mitra, status, is_active,
--   travel_id, updated_at. Kalau PRA-CEK menampilkan kolom NOT NULL tanpa DEFAULT
--   di luar daftar itu, INSERT dari Web Travel akan ditolak constraint dan kolom
--   tersebut perlu dibuat nullable / diberi default lebih dulu.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PRA-CEK (read-only, aman dijalankan kapan saja, tidak termasuk migrasi)
-- -----------------------------------------------------------------------------
-- Kolom NOT NULL tanpa default pada hotels:
--   select column_name, data_type
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'hotels'
--      and is_nullable = 'NO' and column_default is null
--    order by ordinal_position;
--
-- Hak tulis role authenticated pada hotels (harus ada huruf w dan u):
--   select relname, relacl from pg_class
--    where relname = 'hotels' and relkind = 'r';
--
-- Policy hotels sebelum migrasi (harus terlihat hotels_read / _select_shared /
-- hotels_insert / _update / _delete milik dashboard lama):
--   select policyname, cmd, qual, with_check
--     from pg_policies
--    where schemaname = 'public' and tablename = 'hotels'
--    order by policyname;

begin;

-- -----------------------------------------------------------------------------
-- 1) INSERT: hanya baris atas nama travel sendiri.
-- -----------------------------------------------------------------------------
drop policy if exists "hotels_insert_own" on public.hotels;
create policy "hotels_insert_own" on public.hotels
  for insert to authenticated
  with check (travel_id = public.auth_travel_id());

-- -----------------------------------------------------------------------------
-- 2) UPDATE: hanya baris milik sendiri, dan tidak boleh memindahkan kepemilikan.
--    USING dibutuhkan supaya UPDATE bisa memilih barisnya (tanpa policy SELECT
--    yang cocok, UPDATE diam-diam mengubah 0 baris).
-- -----------------------------------------------------------------------------
drop policy if exists "hotels_update_own" on public.hotels;
create policy "hotels_update_own" on public.hotels
  for update to authenticated
  using (travel_id = public.auth_travel_id())
  with check (travel_id = public.auth_travel_id());

rollback;
-- ^ Default file ini dry-run. Untuk memakainya: jalankan ulang isi yang sama
--   dengan baris terakhir diganti `commit;`, lalu jalankan VERIFIKASI + PROBES.

-- -----------------------------------------------------------------------------
-- 3) VERIFIKASI (jalankan setelah commit)
-- -----------------------------------------------------------------------------
-- Policy hotels sekarang, dan keduanya SECURITY INVOKER (prosecdef = false):
--   select p.policyname, p.cmd, p.qual, p.with_check
--     from pg_policies p
--    where p.tablename = 'hotels'
--    order by p.policyname;
--   select p.proname, p.prosecdef from pg_proc p
--    join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname in ('auth_travel_id','is_admin','is_super_admin');
--
-- Jumlah policy per command pada hotels (insert/update harus >= 1 milik sendiri):
--   select cmd, count(*) from pg_policies
--    where tablename = 'hotels' group by cmd order by cmd;

-- -----------------------------------------------------------------------------
-- 4) PROBES (setelah commit, dari Web Travel — lihat catatan QA: buat baris
--    berawalan "UJI QT" lalu hapus lagi)
-- -----------------------------------------------------------------------------
--   P-1  Ahmad (travel_admin Batik) → /master-data/hotel → Tambah Hotel tersimpan,
--        toast "Hotel baru tersimpan", baris muncul di daftar dengan badge Aktif.
--   P-2  Ahmad mengubah hotel miliknya sendiri → tersimpan.
--   P-3  Ahmad mencoba mengubah hotel master platform (travel_id NULL, mis.
--        baris 'Semua Travel' hasil backfill) → aplikasi menolak dengan pesan
--        "Hotel ini adalah master platform…", BUKAN error database.
--   P-4  Dewi (travel_admin Persada) tidak melihat hotel buatan Ahmad
--        (policy SELECT lama tetap menyaring) → isolasi terjaga.
--   P-5  Super admin (admin@umrahqu.com) masih bisa menulis hotel mana pun,
--        termasuk master platform → policy lama `hotels_update` masih berfungsi.
--   P-6  Hapus hotel milik sendiri → soft delete, baris hilang dari daftar
--        (`deleted_at` terisi) tapi riwayat paket yang menyebut namanya utuh.

-- =============================================================================
-- REVERT (kembali persis ke kondisi sebelum file ini)
-- =============================================================================
-- begin;
-- drop policy if exists "hotels_insert_own" on public.hotels;
-- drop policy if exists "hotels_update_own" on public.hotels;
-- commit;
