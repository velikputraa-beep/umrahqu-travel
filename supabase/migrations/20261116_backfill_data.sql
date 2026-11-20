-- =============================================================================
-- UmrahQu Travel — Backfill data demo agar RLS di 20261116_init_schema.sql
-- benar-benar bekerja.
-- File   : supabase/migrations/20261116_backfill_data.sql
-- Tanggal: 2026-11-16
-- Status : BELUM DIIJALANKAN. Read-only research saja.
--
-- URUTAN PAKAI
--   1. 20261116_init_schema.sql   (buat tabel + kolom travels.uid, packages.id,
--                                  pasang RLS)
--   2. file ini                   (isi travel_id / packages.id yang masih NULL)
--   3. cek query verifikasi di Bagian 9
--
-- URUTAN INI WAJIB. Alasannya: begitu init_schema jalan, 37 tabel punya RLS
-- dengan predicate `travel_id = auth_travel_id()`. Baris lama yang travel_id-nya
-- masih NULL otomatis jadi TIDAK KELIHATAN oleh user travel (hanya super admin).
-- Jadi init_schema tanpa backfill = dashboard travel mendadak kosong.
--
-- SEMUA PEMETAAN DIVERIFIKASI DULU (read-only, 2026-11-16) terhadap isi project
-- pheinjqzezmjucszzjvo — bukan asumsi:
--   travels    4 baris : trv-1 Persada Indonesia, trv-2 An-Nahl,
--                        trv-3 Batik Travel, trv-4 Cahaya Suci (Masa Tenggang)
--   packages   4 baris : kolom `travel` selalu = travels.nama (4/4 cocok)
--   deposits   3 baris : kolom `nama` = travels.nama (An-Nahl, Batik, Cahaya)
--   documents  3 baris : kolom `agensi` = travels.nama
--   hotels     5 baris : kolom `mitra` = travels.nama ATAU 'Semua Travel' (2 baris)
--   airlines   4 baris : kolom `mitra` = travels.nama ATAU 'Semua Travel' (1 baris)
--   banks      3 baris : `pemilik` = 'PT UmrahQu Travel Mandiri' / 'CV Berkah
--                        Wisata' → TIDAK cocok dengan travels mana pun → sengaja
--                        dibiarkan NULL (policy banks menerima travel_id is null)
--   categories 4 baris : memang referensi global → tetap NULL
--   transactions 3 baris & invoices 3 baris: tidak punya kolom travel; dirantai
--                        transactions.invoice → invoices.noFaktur →
--                        invoices.jamaah → bookings.pemesan → bookings.travel
--                        (3/3 berhasil dicocokkan)
--   users / bookings: TIDAK disentuh (tabel demo aplikasi tetangga, Keputusan A&E)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. packages.id — kolom uuid hasil init_schema, isinya masih NULL semua.
--    Tanpa langkah ini, packages tidak bisa dijadikan target FK (Bagian 9) dan
--    baris baru `orders.package_id` tidak akan pernah bisa diisi.
--    Catatan: PK lama tetap `slug` (text); kolom id uuid ini punya unique index
--    `packages_id_key` dari init_schema.
-- -----------------------------------------------------------------------------
update public.packages
   set id = gen_random_uuid()
 where id is null;

-- -----------------------------------------------------------------------------
-- 2. packages.travel_id ← nama travel yang tersimpan di kolom `travel`
-- -----------------------------------------------------------------------------
update public.packages p
   set travel_id = t.uid
  from public.travels t
 where p.travel = t.nama
   and p.travel_id is null;

-- -----------------------------------------------------------------------------
-- 3. deposits.travel_id ← deposits.nama
-- -----------------------------------------------------------------------------
update public.deposits d
   set travel_id = t.uid
  from public.travels t
 where d.nama = t.nama
   and d.travel_id is null;

-- -----------------------------------------------------------------------------
-- 4. documents.travel_id ← documents.agensi (dokumen legalitas SK PPIU, NPWP…)
-- -----------------------------------------------------------------------------
update public.documents doc
   set travel_id = t.uid
  from public.travels t
 where doc.agensi = t.nama
   and doc.travel_id is null;

-- -----------------------------------------------------------------------------
-- 5. hotels.travel_id ← hotels.mitra.
--    Nilai 'Semua Travel' SENGAJA dibiarkan NULL: itu hotel bersama, dan
--    hotels_select_shared membaca `travel_id is null` sebagai "untuk semua".
--    Predicate match di bawah hanya mengenai baris yang mitranya bernama travel.
-- -----------------------------------------------------------------------------
update public.hotels h
   set travel_id = t.uid
  from public.travels t
 where h.mitra = t.nama
   and h.travel_id is null;

-- -----------------------------------------------------------------------------
-- 6. airlines.travel_id ← airlines.mitra (pola sama dengan hotels).
--    Tidak wajib (airlines dapat policy baca-global), tapi diisi supaya data
--    pemiliknya tercatat sejak awal.
-- -----------------------------------------------------------------------------
update public.airlines a
   set travel_id = t.uid
  from public.travels t
 where a.mitra = t.nama
   and a.travel_id is null;

-- -----------------------------------------------------------------------------
-- 7. invoices.travel_id ← pemilik booking sang pemesan
--    (invoices.jamaah = bookings.pemesan = nama orang, bukan nama travel)
-- -----------------------------------------------------------------------------
update public.invoices i
   set travel_id = t.uid
  from public.bookings b
  join public.travels t on t.nama = b.travel
 where i.jamaah = b.pemesan
   and i.travel_id is null;

-- -----------------------------------------------------------------------------
-- 8. transactions.travel_id ← rantai invoice → bookings
--    (nominal string 'Rp 32.500.000' SENGAJA tidak dikonversi ke kolom amount
--     bigint — itu bagian dari Keputusan C, bukan tugas backfill ini)
-- -----------------------------------------------------------------------------
update public.transactions x
   set travel_id = t.uid
  from public.invoices i
  join public.bookings b on b.pemesan = i.jamaah
  join public.travels t  on t.nama = b.travel
 -- `noFaktur` dibuat dengan kutip oleh aplikasi demo, jadi identifier-nya WAJIB
 -- ditulis berkutip; tanpa kutip Postgres melipatnya ke nofaktur (42703).
 where x.invoice = i."noFaktur"
   and x.travel_id is null;

-- -----------------------------------------------------------------------------
-- 9. VERIFIKASI — jalankan blok ini sebelum `commit;` dan perbaiki kalau ada
--    baris yang tidak terpetakan. Semua harus 0 kecuali yang diberi catatan.
-- -----------------------------------------------------------------------------
-- select 'packages'      t, count(*) null_travel from public.packages where travel_id is null
-- union all select 'deposits',      count(*) from public.deposits     where travel_id is null
-- union all select 'documents',     count(*) from public.documents    where travel_id is null
-- union all select 'invoices',      count(*) from public.invoices     where travel_id is null
-- union all select 'transactions',  count(*) from public.transactions where travel_id is null
-- union all select 'hotels (wajar >0: hotel bersama)', count(*) from public.hotels      where travel_id is null
-- union all select 'airlines (wajar >0: maskapai bersama)', count(*) from public.airlines where travel_id is null
-- union all select 'banks (wajar >0: bank platform)',  count(*) from public.banks        where travel_id is null
-- union all select 'categories (wajar >0: global)',    count(*) from public.categories   where travel_id is null
-- order by 1;
--
-- select id, slug, nama, id is not null as punya_uuid, travel_id is not null as terpetakan
--   from public.packages order by slug;

-- -----------------------------------------------------------------------------
-- 10. Selesai. Ganti `rollback;` jadi `commit;` setelah hasil Bagian 9 rapi.
--     (Sengaja default-nya rollback supaya file ini tidak bisa menulis data
--     secara tidak sengaja saat dicoba-coba.)
-- -----------------------------------------------------------------------------
rollback;
-- commit;

-- =============================================================================
-- LANGKAH LANJUTAN YANG SENGAJA TIDAK ADA DI FILE INI
--   a. Seed `profiles`. Setelah init_schema, SELUH akses travel bergantung pada
--      profiles.travel_id (lewat auth_travel_id()). Kalau tidak ada satu pun
--      baris profiles yang cocok dengan auth.users, semua halaman travel akan
--      kosong walau backfill di atas sudah jalan. Perlu decision: email demo
--      (usr-1..usr-4) harus sudah terdaftar di Auth dulu, baru
--        insert into public.profiles (id, travel_id, full_name, email, role)
--        select u.id, t.uid, u.nama, u.email,
--               case when u.role = 'admin' then 'super_admin' else u.role end
--          from public.users d
--          join auth.users u on u.email = d.email
--          left join public.travels t on t.nama = d.travel
--         where not exists (select 1 from public.profiles p where p.id = u.id);
--   b. Konversi kolom uang string → bigint untuk bookings/deposits/invoices
--      (Keputusan C). Tabel baru saya yang sudah bigint; tabel demo belum.
--   c. Menyeragamkan PK text → uuid (Keputusan B) supaya FK Bagian 9 aktif.
-- =============================================================================
