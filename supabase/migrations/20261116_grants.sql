-- =============================================================================
-- UmrahQu Travel — GRANT privilege untuk 27 tabel baru.
-- File   : supabase/migrations/20261116_grants.sql
-- Tanggal: 2026-11-16
-- Status : BELUM DIIJALANKAN.
--
-- MENGAPA FILE INI PERLU
--   Setelah 20261116_init_schema.sql dijalankan (2026-11-16), inventaris ACL
--   (has_table_privilege, dibaca read-only dari SQL Editor) menunjukkan:
--       auth_tiada_select = 27   anon_tiada_select = 28
--   Artinya SELUH 27 tabel yang baru dibuat TIDAK punya hak SELECT untuk role
--   `authenticated`. Tabel eksisting (travels, packages, hotels, airlines,
--   banks, categories, deposits, documents, transactions, invoices) aman
--   karena ACL-nya `authenticated=arwdDxtm`; tabel baru hanya `Dxtm`
--   (TRUNCATE/REFERENCES/MAINTAIN) — tidak ada `r`.
--
--   Dampaknya: user login Web Travel apa pun memanggil
--       supabase.from('orders').select('*')
--   mendapat HTTP 401 / 42501 "Grant the required privileges to the current
--   role". RLS belum sempat dinilai —PostgREST berhenti di privilege tabel.
--   Jadi tanpa file ini, dashboard travel tetap kosong walaupun seed profiles
--   sudah benar.
--
--   Penyebab: project ini memakai "custom Data API permissions" (badge
--   API DISABLED di Table Editor), sehingga tabel hasil SQL tidak otomatis
--   di-expose ke role anon/authenticated.
--
-- APA YANG DIBERIKAN
--   authenticated : SELECT, INSERT, UPDATE, DELETE pada 27 tabel baru.
--                   Barisnya TETAP disaring RLS policy dari init_schema
--                   (`travel_id = auth_travel_id() or is_super_admin()`),
--                   jadi ini membuka akses tabel, bukan membuka semua baris.
--   anon          : SENGAJA tidak dapat apa-apa. Katalog publik hanya
--                   `packages` (tabel lama, sudah `anon=r` + policy
--                   packages_select_public). Kebijakan "tabel yang dibutuhkan
--                   publik dapat policy SELECT khusus" ditunda sampai Web
--                   Travel beres, sesuai keputusan 2026-11-16.
--
-- TIDAK menyentuh: 17 tabel aplikasi tetangga, grants `service_role`,
--   grants `postgres`, RLS policy, struktur tabel, dan data.
--
-- CARA PAKAI: sama seperti file backfill/seed — jalankan versi `rollback;`
--   dulu, baca hasil verifikasi di Bagian 3, baru ganti ke `commit;`.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Grant CRUD untuk `authenticated` pada 27 tabel milik Web Travel.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  n integer := 0;
begin
  foreach t in array array[
    'profiles','branches','staff','agents','commissions','vendors',
    'orders','pilgrims','pilgrim_documents','room_assignments','rooms',
    'vehicle_assignments','vehicles','muthawifs',
    'payments','installments','deposit_mutations','package_pricing',
    'package_gallery','package_flights','package_hotels','package_departures',
    'manasik_schedules','manasik_attendances',
    'equipment_templates','equipment_assignments','audit_logs'
  ] loop
    if not exists (
      select 1 from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
        and c.relname = t
    ) then
      raise notice 'LEWAT % — tabel tidak ada', t;
      continue;
    end if;
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    n := n + 1;
  end loop;
  raise notice 'GRANT authenticated diberikan pada % tabel', n;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Yang SENGAJA tidak dilakukan
--    a. Tidak memberi grant ke `anon`. Kalau nanti Marketplace butuh membaca
--       galeri/jadwal keberangkatan publik, yang perlu ditambahkan HANYA:
--         grant select on public.package_gallery to anon;   (+ policy SELECT)
--       policy-nya wajib ada; grant tanpa policy = hasil kosong, bukan bocor.
--    b. Tidak mengubah default privileges. Kalau masih ada tabel baru lagi
--       dibuat lewat SQL, file ini perlu dijalankan ulang untuk nama itu.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3. VERIFIKASI — jalankan sebelum `commit;`
--    auth_tiada_select harus jadi 0 dan daftarnya kosong.
-- -----------------------------------------------------------------------------
-- with x as (
--   select c.relname, has_table_privilege('authenticated', c.oid, 'select') as ar
--     from pg_class c
--    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
-- )
-- select 'auth_tiada_select='||count(*) filter (where not ar)
--        ||' / total_tabel_public='||count(*)
--        ||' >>> '||coalesce(string_agg(relname, ', ' order by relname)
--        filter (where not ar), '(kosong)') as hasil from x;

rollback;
-- commit;
