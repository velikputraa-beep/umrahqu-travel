-- =============================================================================
-- UmrahQu Travel — MODUL 6, perbaikan CACAT #3 (isolasi lintas-travel)
-- File   : supabase/migrations/20261117_fix_payment_rls.sql
-- Tanggal: 2026-11-16
-- Status : BELUM DIJALANKAN. Ditulis untuk direview lebih dulu.
--
-- Sifat  : MENGETAT policy yang sudah ada (INSERT + UPDATE pada payments dan
--          installments). Tidak ada kolom, tabel, trigger, bucket, atau baris
--          lama yang dihapus/diubah. Tabel tetangga (users, bookings, websites,
--          domains, faqs, complaints, registrations, reviews, withdraws, logs,
--          notifications, booking_stats, finance_stats, analytics_*) TIDAK
--          disentuh. SELECT dan DELETE dibiarkan apa adanya (alasan di bawah).
--
-- MASALAHNYA (dibuktikan saat uji SC-4, 2026-11-16):
--   Policy hasil loop 20261116_init_schema.sql Bagian 8 hanya memeriksa kolom
--   `travel_id` pada BARIS yang ditulis:
--       create policy "payments_insert" ... with check
--         (travel_id = public.auth_travel_id() or public.is_super_admin());
--   Jadi travel A boleh menulis pembayaran yang menaut `order_id` milik travel
--   B, selama `travel_id` di baris itu punya travel A sendiri. Probe nyata dengan
--   JWT Ahmad (Batik) ke REST:
--       POST /rest/v1/payments      {travel_id: Batik, order_id: <punya Persada>}  → 201
--       POST /rest/v1/installments  {travel_id: Batik, order_id: <punya Persada>}  → 201
--   (baris buktinya sudah dihapus lagi; agregat korban tidak berubah karena
--   recompute selalu difilter per travel.)
--   Dampak: uang "milik" travel A bisa menempel ke pesanan travel B dan muncul
--   di laporan B begitu query dibaca lintas-sasaran (booking_code/OR), serta
--   menodai jejak audit.
--
-- PERBAIKANNYA:
--   Satu sasaran pembayaran wajib dimiliki oleh travel yang menulis barisnya.
--   Aturan penautan mengikuti aplikasi (payment-actions.js `recordPayment` dan
--   `saveInstallmentPlan`):
--     * pesanan portal → `order_id` = orders.id  DAN `booking_code` = orders.booking_code
--     * pesanan lama   → `order_id` NULL         DAN `booking_code` = bookings.id ("BRS-…")
--   Untuk pesanan lama, `bookings` tidak punya `travel_id` uuid; pengikatnya
--   nama travel (`bookings.travel` = `travels.nama`, `travels.uid` = auth_travel_id()),
--   sama seperti yang dipakai src/lib/auth/session.js untuk mengambil travelName.
--
--   Kenapa SELECT tidak diubah: policy SELECT payments/installments sudah
--   `travel_id = auth_travel_id()`, jadi baris milik travel lain memang tidak
--   pernah terbaca. Lubang SC-4 murni jalur TULIS. Menambah EXISTS ke SELECT akan
--   membayari satu subquery per baris hasil, tanpa menutup risiko apa pun.
--   Kenapa DELETE tidak diubah: menghapus hanya bisa mengenai baris yang sudah
--   lolos SELECT (travel_id sendiri), dan membiarkan DELETE longgar dari cek
--   sasaran justru membuat baris yatim bisa dibereskan.
--
-- KONSEKUENSI YANG PERLU DISADARI (sengaja dipilih, bukan kejutan):
--   1) Setelah policy ini, INSERT/UPDATE dengan `order_id` milik pesanan yang
--      DIHAPUS TOTAL (hard delete) akan ditolak, karena subquery orders tidak
--      menemukan barisnya. Order yang hanya soft-delete (`deleted_at` terisi)
--      TETAP bisa dipakai — cek sengaja tidak menyaring `deleted_at`, supaya
--      pembayaran order yang sudah ditutup masih bisa dibatalkan/void.
--   2) Web Admin / Marketplace yang menulis via service_role tidak terkena:
--      service_role punya BYPASSRLS, dan `is_super_admin()` tetap diloloskan.
--   3) Jika suatu saat aplikasi menaut pembayaran dengan hanya `booking_code`
--      "OF-…" (kode portal) tanpa `order_id`, policy akan menolaknya — itu
--      memang diinginkan, karena uang portal harus punya `order_id`.
--
-- CARA MENJALANKAN (Dashboard ▸ SQL Editor), dua langkah:
--   a. dry-run  : jalankan seluruh isi file, biarkan berakhir `rollback;`
--                 → harus sukses tanpa error, tanpa perubahan apa pun.
--   b. pakai    : jalankan isi yang sama dengan `commit;` lalu cek bagian
--                 VERIFIKASI + PROBES di bawah.
--
-- CARA MENGEMBALIKAN: lihat blok REVERT paling bawah (policy lama persis seperti
--   yang dibuat loop Bagian 8 init_schema).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Helper penautan sasaran.
--    SECURITY INVOKER (default): subquery di dalamnya tetap tunduk RLS, jadi
--    fungsi ini tidak membuka jalan pintas. Hanya boleh dipanggil dari policy
--    (role authenticated), bukan dari publik.
-- -----------------------------------------------------------------------------
create or replace function public.travel_owns_payment_target(
  p_travel_id    uuid,
  p_order_id     uuid,
  p_booking_code text
) returns boolean
language sql
stable
set search_path = public
as $$
  select case
    -- Tanpa travel_id tidak ada pemiliknya: selalu salah.
    when p_travel_id is null then false

    -- Dunia portal: order harus nyata dan milik travel yang sama.
    -- `booking_code` boleh kosong, tapi kalau terisi wajib sama dengan kode
    -- order-nya, supaya jalur baca `order_id` dan `booking_code` tidak pernah
    -- menunjuk dua sasaran berbeda.
    when p_order_id is not null then exists (
      select 1
        from orders o
       where o.id = p_order_id
         and o.travel_id = p_travel_id
         and coalesce(p_booking_code, '') in ('', o.booking_code)
    )

    -- Dunia lama (bookings.id text): penautnya nama travel.
    when coalesce(p_booking_code, '') <> '' then exists (
      select 1
        from bookings b
       where b.id = p_booking_code
         and b.travel = (select t.nama from travels t where t.uid = p_travel_id)
    )

    -- Tidak ada sasaran sama sekali.
    else false
  end;
$$;

revoke execute on function public.travel_owns_payment_target(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.travel_owns_payment_target(uuid, uuid, text)
  to authenticated, service_role;

comment on function public.travel_owns_payment_target(uuid, uuid, text) is
  'RLS helper: apakah sasaran pembayaran (order portal atau kode pesanan lama) '
  'dimiliki travel_id ini. Dipakai policy payments_*/installments_*.';

-- -----------------------------------------------------------------------------
-- 2) payments: INSERT + UPDATE wajib menunjuk sasaran milik sendiri.
--    `travel_id = auth_travel_id()` tetap dijaga (WITH CHECK juga), supaya
--    baris tidak bisa direassign ke travel lain maupun dititipkan ke travel B
--    dengan order milik sendiri.
-- -----------------------------------------------------------------------------
drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments for insert to authenticated
  with check (
    (travel_id = public.auth_travel_id() or public.is_super_admin())
    and public.travel_owns_payment_target(travel_id, order_id, booking_code)
  );

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments for update to authenticated
  using (
    (travel_id = public.auth_travel_id() or public.is_super_admin())
    and public.travel_owns_payment_target(travel_id, order_id, booking_code)
  )
  with check (
    (travel_id = public.auth_travel_id() or public.is_super_admin())
    and public.travel_owns_payment_target(travel_id, order_id, booking_code)
  );

-- -----------------------------------------------------------------------------
-- 3) installments: sama persis (jadwal cicilan menempel sasaran yang sama).
-- -----------------------------------------------------------------------------
drop policy if exists "installments_insert" on public.installments;
create policy "installments_insert" on public.installments for insert to authenticated
  with check (
    (travel_id = public.auth_travel_id() or public.is_super_admin())
    and public.travel_owns_payment_target(travel_id, order_id, booking_code)
  );

drop policy if exists "installments_update" on public.installments;
create policy "installments_update" on public.installments for update to authenticated
  using (
    (travel_id = public.auth_travel_id() or public.is_super_admin())
    and public.travel_owns_payment_target(travel_id, order_id, booking_code)
  )
  with check (
    (travel_id = public.auth_travel_id() or public.is_super_admin())
    and public.travel_owns_payment_target(travel_id, order_id, booking_code)
  );

-- dry-run: tidak ada perubahan yang tersimpan.
-- Untuk menerapkan, ganti kata berikut jadi `commit;`
rollback;

-- =============================================================================
-- VERIFIKASI setelah `commit;` (jalankan di SQL Editor):
--
--   select tablename, policyname, cmd, qual, with_check
--     from pg_policies
--    where schemaname = 'public'
--      and tablename in ('payments','installments')
--    order by tablename, cmd;
--     → 4 baris (select/insert/update/delete) per tabel; insert+update memuat
--       travel_owns_payment_target.
--
--   select proname, prosecdef, pg_get_function_result(oid) from pg_proc
--    where proname = 'travel_owns_payment_target';
--     → prosecdef = false (SECURITY INVOKER, bukan jalan pintas RLS).
--
--   select count(*) from public.payments;      -- tetap 0 (data hasil uji sudah dibersihkan)
--   select count(*) from public.installments;  -- tetap 0
--   select id, travel, dibayar from public.bookings;  -- 4 baris asli, tak berubah
--
-- PROBES (ulangi bentuk uji SC-4; pakai JWT travel A, REST + publishable key):
--   1) A menulis pembayaran untuk order milik B
--      → HARUS 403 / "new row violates row-level security policy" (sebelumnya 201)
--   2) A menulis pembayaran untuk ordernya sendiri (order_id + booking_code benar)
--      → 201
--   3) A menulis pembayaran pesanan lama: order_id null, booking_code = bookings.id
--      milik travel B → 403;  milik travel A sendiri → 201
--   4) Halaman /travel/keuangan/pembayaran → catat pembayaran → masih sukses,
--      agregat orders(paid_amount/remaining_amount/payment_status) berubah benar
--   5) Batalkan (void) pembayaran itu → UPDATE lolos, agregat turun lagi
--   6) Jadwal cicilan 3× + lunasi 1 → insert & update installments lolos
--
-- JANGAN LUPA hapus baris uji dari probes setelah selesai.
-- =============================================================================

-- =============================================================================
-- REVERT (kembali ke policy loop Bagian 8 init_schema):
--
-- drop policy if exists "payments_insert"     on public.payments;
-- drop policy if exists "payments_update"     on public.payments;
-- drop policy if exists "installments_insert" on public.installments;
-- drop policy if exists "installments_update" on public.installments;
-- create policy "payments_insert" on public.payments for insert to authenticated
--   with check (travel_id = public.auth_travel_id() or public.is_super_admin());
-- create policy "payments_update" on public.payments for update to authenticated
--   using      (travel_id = public.auth_travel_id() or public.is_super_admin())
--   with check (travel_id = public.auth_travel_id() or public.is_super_admin());
-- create policy "installments_insert" on public.installments for insert to authenticated
--   with check (travel_id = public.auth_travel_id() or public.is_super_admin());
-- create policy "installments_update" on public.installments for update to authenticated
--   using      (travel_id = public.auth_travel_id() or public.is_super_admin())
--   with check (travel_id = public.auth_travel_id() or public.is_super_admin());
-- drop function if exists public.travel_owns_payment_target(uuid, uuid, text);
-- =============================================================================
