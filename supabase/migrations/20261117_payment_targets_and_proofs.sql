-- =============================================================================
-- UmrahQu Travel — MODUL 6 (Pembayaran & Cicilan)
-- File   : supabase/migrations/20261117_payment_targets_and_proofs.sql
-- Tanggal: 2026-11-16
-- Sifat  : ADDITIVE. Tidak ada kolom, policy, trigger, atau baris lama yang
--          dihapus/diubah isinya. Tabel tetangga (users, bookings, websites,
--          domains, faqs, complaints, registrations, reviews, withdraws, logs,
--          notifications, booking_stats, finance_stats, analytics_*) TIDAK
--          disentuh sama sekali.
--
-- kenapa (keputusan user, 2026-11-16):
--   OQ-4 "Longgarin order_id (nullable), biar bisa catat pembayaran untuk
--         pesanan lama juga."
--   OQ-6 "Bikin bucket payment-proofs (polanya sama kayak pilgrim-docs)."
--
-- 1) `payments.order_id` dan `installments.order_id` aslinya `uuid NOT NULL`.
--    Pesanan lama hidup di `bookings` dengan PK text ("BRS-26111402") dan tidak
--    punya baris `orders`, jadi pembayaran untuk pesanan lama secara teknis
--    mustahil disimpan. Buktinya kolom `order_id` pada `invoices` dan
--    `transactions` data asli juga NULL (bukan hanya belum terisi).
--    → NOT NULL dilepas, dan ditambahkan `booking_code text` sebagai penaut ke
--      kode pesanan (belaku untuk `orders.booking_code` "OF-…" maupun
--      `bookings.id` "BRS-…"), supaya satu tabel pembayaran bisa dipakai kedua
--      dunia. Check baru menjaga agar setiap baris uang menunjuk ke SATU
--      sasaran yang jelas: order portal, kode pesanan lama, atau keduanya.
--
-- 2) Bucket bukti transfer. Kolom `payments.proof_path` sudah ada sejak
--    20261116_init_schema.sql tapi tidak ada bucketnya. Policy storage lama
--    terikat `bucket_id = 'pilgrim-docs'`, jadi tidak bisa dipakai ulang;
--    bucket baru + 4 policy per travel (pola identik dengan
--    20261116_pilgrims_docs_bucket.sql).
--
-- CARA MENJALANKAN (Dashboard ▸ SQL Editor), dua langkah:
--   a. dry-run  : jalankan seluruh isi file, biarkan berakhir `rollback;`
--                 → harus sukses tanpa error, tanpa perubahan apa pun.
--   b. pakai    : jalankan lagi isi yang sama dengan `commit;`
--                 → cek bagian VERIFIKASI di bawah.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. sasaran pembayaran boleh pesanan lama (order_id nullable) + penaut kode
-- -----------------------------------------------------------------------------
alter table public.payments     alter column order_id drop not null;
alter table public.installments alter column order_id drop not null;

alter table public.payments     add column if not exists booking_code text;
alter table public.installments add column if not exists booking_code text;

create index if not exists payments_booking_code_idx     on public.payments (booking_code);
create index if not exists installments_booking_code_idx on public.installments (booking_code);

-- Setiap baris uang/daftar cicilan harus menunjuk minimal satu sasaran.
-- `coalesce` wajib dipakai: CHECK yang bernilai NULL dianggap LULUS oleh
-- Postgres, jadi `booking_code is not null` sendirian tidak akan menahan
-- baris tanpa sasaran sama sekali.
-- Constraint lama (kalau pernah ada) diturunkan dulu supaya file idempotent.
alter table public.payments     drop constraint if exists payments_target_check;
alter table public.payments     add  constraint payments_target_check
  check (order_id is not null or coalesce(booking_code, '') <> '');
alter table public.installments drop constraint if exists installments_target_check;
alter table public.installments add  constraint installments_target_check
  check (order_id is not null or coalesce(booking_code, '') <> '');

-- -----------------------------------------------------------------------------
-- 2. bucket privat bukti transfer + policy per travel
--    Path berkas selalu `<travel_id>/<payment_uuid>-<ts>.<ext>`, sehingga
--    (storage.foldername(name))[1] = travel pemanggil.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs', 'payment-proofs', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_proofs_select" on storage.objects;
drop policy if exists "payment_proofs_insert" on storage.objects;
drop policy if exists "payment_proofs_update" on storage.objects;
drop policy if exists "payment_proofs_delete" on storage.objects;

create policy "payment_proofs_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  );

create policy "payment_proofs_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  );

-- UPDATE (menimpa berkas) wajib USING + WITH CHECK: tanpa WITH CHECK pemanggil
-- bisa memindahkan objek ke folder travel lain.
create policy "payment_proofs_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  )
  with check (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  );

create policy "payment_proofs_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  );

-- =============================================================================
-- dry-run: tidak ada perubahan yang tersimpan.
-- Untuk menerapkan, ganti kata berikut jadi `commit;`
rollback;

-- =============================================================================
-- VERIFIKASI setelah `commit;` (jalankan satu-satu di SQL Editor):
--
--   select table_name, column_name, is_nullable
--     from information_schema.columns
--    where table_schema='public'
--      and table_name in ('payments','installments')
--      and column_name in ('order_id','booking_code')
--    order by table_name, column_name;
--     → order_id harus YES (nullable) untuk keduanya, booking_code ada (text).
--
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid in ('public.payments'::regclass,'public.installments'::regclass)
--      and conname in ('payments_target_check','installments_target_check');
--     → 2 baris.
--
--   select id, public, file_size_limit from storage.buckets where id='payment-proofs';
--   select policyname, cmd from pg_policies where tablename='objects'
--    and policyname like 'payment_proofs_%';
--     → bucket privat + 4 policy (SELECT/INSERT/UPDATE/DELETE).
--
--   select count(*) from public.payments;      -- tetap 0
--   select count(*) from public.installments;  -- tetap 0
--   select id, travel, dibayar from public.bookings;  -- 4 baris asli, tak berubah
-- =============================================================================
