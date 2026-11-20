-- =============================================================================
-- UmrahQu Travel — TOMBOL UNDO untuk Bagian 8 (RLS) di 20261116_init_schema.sql
-- File   : supabase/migrations/20261116_revert_policies.sql
-- Tanggal: 2026-11-16
-- Status : BELUM DIIJALANKAN.
--
-- KAPAN FILE INI DIPAKAI
--   Hanya kalau sesudah migrasi ada aplikasi (Web Admin / Marketplace / Web
--   Travel) yang hasilnya KOSONG dan kamu ingin cepat kembali ke kondisi tadi.
--   Runya bukan error, tapi `[]`: policy SELECT lama persis satu-satunya jalan
--   yang membuat aplikasi-aplikasi itu membaca baris.
--
-- MENGAPA FILE INI HARUS ADA
--   Project pheinjqzezmjucszzjvo ada di Free Plan, dan halaman Database >
--   Backups menyatakan: "Free Plan does not include project backups." Tidak ada
--   restore point, tidak ada PITR. Satu-satunya undo yang realistis untuk 23
--   `drop policy` di init_schema adalah recreate, dan bentuk persisnya sudah
--   saya catat dari dashboard (lihat VERIFIKASI di bawah).
--
-- VERIFIKASI (read-only, Dashboard > Database > Policies, 2026-11-16)
--   Sepuluh policy `_read` di bawah saya BUKA satu-satu drawer-nya, bukan
--   disimpulkan dari pola. Semuanya: `for select to anon, authenticated`
--   dengan `using (true)`:
--     airlines_read, banks_read, categories_read, deposits_read,
--     documents_read, hotels_read, invoices_read, packages_read,
--     transactions_read, travels_read
--   (Bukti jalan: GET /rest/v1/<tabel>?limit=1 dengan publishable key saja
--   membalik HTTP 200 berisi baris asli untuk travels/packages/users/bookings/
--   transactions.)
--   Lima belas policy write juga drawer-nya sudah saya cek dan isinya template
--   yang sama: `_insert` = with check (is_admin()); `_update` =
--   using (is_admin()) with check (is_admin()); `_delete` = using (is_admin());
--   semuanya `to authenticated`. Tabel yang policy-write-nya DIGANTI oleh
--   init_schema: packages, documents, deposits, transactions, invoices.
--   `is_admin()` = function bawaan project ini:
--     select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
--
-- ⚠ FILE INI KEMBALIKAN KEBOCORAN. `using (true)` untuk `anon` artinya siapa pun
--   yang punya publishable key bisa membaca seluruh isi 10 tabel itu lagi,
--   termasuk `banks` (nomor rekening) dan `transactions`/`invoices` (nominal
--   jamaah). Itu memang harga dari "aplikasi jalan lagi sekarang". Jangan
--   dipakai sebagai kondisi final; pakai sebagai jembatan sambil policy publik
--   yang benar (khusus SELECT, to anon, authenticated) ditulis per tabel.
--
-- CATATAN TEKNIS
--   1. Postgres TIDAK mengenal `create policy if not exists` (saya cek ke
--      grammar-nya: syntax error). Karena itu semua statement di bawah
--      `drop policy if exists` dulu, baru `create` → file ini idempoten, boleh
--      dijalankan berkali-kali.
--   2. Bagian 1 memakai NAMA lama (`<t>_read`). Untuk airlines dan categories
--      namanya tabrakan dengan policy baru init_schema, jadi policy barunya yang
--      hilang — konsekuensinya wajar: `_read using (true)` sudah mencakup semua
--      yang policy baru boleh baca.
--   3. Bagian 2 sengaja memakai nama `*_legacy`, BUKAN nama lama, supaya tidak
--      menimpa policy travel-scope bikinan init_schema. Policy RLS itu
--      PERMISSIVE (di-OR): menambah `*_legacy` membuat Web Admin bisa menulis
--      lagi tanpa membuat user travel kehilangan aksesnya. Ini penting karena
--      `is_admin()` membaca JWT app_metadata sedangkan `is_super_admin()` baru
--      membaca `profiles.role` — akun Web Admin tidak punya baris profiles, jadi
--      tanpa Bagian 2 mereka kehilangan hak tulis di 5 tabel itu.
--   4. Yang TIDAK di-undo: kolom baru (74 `add column`), 27 tabel baru, trigger,
--      index, helper function. Semuanya additive — tidak ada data lama yang
--      berubah bentuk, jadi tidak ada gunanya di-undo.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. DARURAT: kembalikan akses BACA publik ke 10 tabel yang kita pegang.
--    Ini bagian yang paling mungkin kamu butuhkan; isinya persis seperti
--    buatan dashboard sebelum migrasi.
-- -----------------------------------------------------------------------------
drop policy if exists "airlines_read"   on public.airlines;
create policy "airlines_read" on public.airlines
  for select to anon, authenticated using (true);

drop policy if exists "banks_read"   on public.banks;
create policy "banks_read" on public.banks
  for select to anon, authenticated using (true);

drop policy if exists "categories_read"   on public.categories;
create policy "categories_read" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "deposits_read"   on public.deposits;
create policy "deposits_read" on public.deposits
  for select to anon, authenticated using (true);

drop policy if exists "documents_read"   on public.documents;
create policy "documents_read" on public.documents
  for select to anon, authenticated using (true);

drop policy if exists "hotels_read"   on public.hotels;
create policy "hotels_read" on public.hotels
  for select to anon, authenticated using (true);

drop policy if exists "invoices_read"   on public.invoices;
create policy "invoices_read" on public.invoices
  for select to anon, authenticated using (true);

drop policy if exists "packages_read"   on public.packages;
create policy "packages_read" on public.packages
  for select to anon, authenticated using (true);

drop policy if exists "transactions_read"   on public.transactions;
create policy "transactions_read" on public.transactions
  for select to anon, authenticated using (true);

drop policy if exists "travels_read"   on public.travels;
create policy "travels_read" on public.travels
  for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- 2. HAK TULIS Web Admin (is_admin()) untuk 5 tabel yang policy-write-nya
--    diganti init_schema. Nama `*_legacy` supaya policy travel-scope yang baru
--    tetap hidup (di-OR, bukan ditimpa).
--    packages:
drop policy if exists "packages_insert_legacy" on public.packages;
create policy "packages_insert_legacy" on public.packages
  for insert to authenticated with check (public.is_admin());
drop policy if exists "packages_update_legacy" on public.packages;
create policy "packages_update_legacy" on public.packages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "packages_delete_legacy" on public.packages;
create policy "packages_delete_legacy" on public.packages
  for delete to authenticated using (public.is_admin());

--    documents:
drop policy if exists "documents_insert_legacy" on public.documents;
create policy "documents_insert_legacy" on public.documents
  for insert to authenticated with check (public.is_admin());
drop policy if exists "documents_update_legacy" on public.documents;
create policy "documents_update_legacy" on public.documents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "documents_delete_legacy" on public.documents;
create policy "documents_delete_legacy" on public.documents
  for delete to authenticated using (public.is_admin());

--    deposits:
drop policy if exists "deposits_insert_legacy" on public.deposits;
create policy "deposits_insert_legacy" on public.deposits
  for insert to authenticated with check (public.is_admin());
drop policy if exists "deposits_update_legacy" on public.deposits;
create policy "deposits_update_legacy" on public.deposits
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "deposits_delete_legacy" on public.deposits;
create policy "deposits_delete_legacy" on public.deposits
  for delete to authenticated using (public.is_admin());

--    transactions:
drop policy if exists "transactions_insert_legacy" on public.transactions;
create policy "transactions_insert_legacy" on public.transactions
  for insert to authenticated with check (public.is_admin());
drop policy if exists "transactions_update_legacy" on public.transactions;
create policy "transactions_update_legacy" on public.transactions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "transactions_delete_legacy" on public.transactions;
create policy "transactions_delete_legacy" on public.transactions
  for delete to authenticated using (public.is_admin());

--    invoices:
drop policy if exists "invoices_insert_legacy" on public.invoices;
create policy "invoices_insert_legacy" on public.invoices
  for insert to authenticated with check (public.is_admin());
drop policy if exists "invoices_update_legacy" on public.invoices;
create policy "invoices_update_legacy" on public.invoices
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "invoices_delete_legacy" on public.invoices;
create policy "invoices_delete_legacy" on public.invoices
  for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. VERIFIKASI — jalankan setelahnya (lewat SQL Editor, role postgres punya
--    BYPASSRLS jadi hasilnya selalu "boleh"; yang membuktikan policy adalah tes
--    REST tanpa login di bawah ini, bukan SELECT sebagai postgres).
-- -----------------------------------------------------------------------------
-- select tablename, policyname, cmd, roles, qual
--   from pg_policies
--  where schemaname = 'public'
--    and (policyname like '%\_read' or policyname like '%\_legacy')
--  order by tablename, policyname;
-- -- harus 10 baris cmd=SELECT dengan roles={anon,authenticated} dan qual=true
-- -- harus 15 baris *_legacy
--
--   curl -H "apikey: <publishable key>" \
--        "https://pheinjqzezmjucszzjvo.supabase.co/rest/v1/packages?select=slug&limit=1"
-- -- sebelum revert: [] ; sesudah revert: baris pertama balik lagi.
--
-- -----------------------------------------------------------------------------
-- 4. Selesai.
--    Default file ini = commit, karena dia dipakai saat darurat: tombol undo yang
--    diam-diam di-rollback justru membikin panik. Ganti ke `rollback;` hanya kalau
--    kamu sedang mengujinya tanpa maksud menerapkan.
-- -----------------------------------------------------------------------------
commit;
-- rollback;
