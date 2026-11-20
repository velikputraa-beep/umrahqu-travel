-- =============================================================================
-- 20261116_pilgrims_docs_bucket.sql — MODUL 4 (Kelola Jamaah)
--
-- Dijalankan manual lewat Dashboard ▸ SQL Editor (project ini tidak punya
-- supabase CLI maupun service role key). Sifatnya ADDITIVE: tidak ada policy
-- atau kolom lama yang dihapus, jadi Web Admin / Marketplace tetap utuh.
--
-- 1) `pilgrims.order_id` aslinya NOT NULL dan itu satu-satunya jalan menuju
--    paket, padahal `orders` masih 0 baris (data pesanan asli ada di `bookings`)
--    dan baru akan terisi di modul Pesanan. Supaya jamaah bisa dikelola sekarang,
--    order_id jadi nullable dan jamaah menunjuk paket lewat `package_id` langsung.
--    FK sengaja TIDAK dibuat — sama seperti package_hotels/package_flights,
--    relasinya di-resolve di sisi aplikasi (src/lib/data/pilgrims.js).
--
-- 2) Bucket berkas dokumen jamaah. Sebelum migrasi ini project punya NOL bucket
--    (verifikasi: select id from storage.buckets → kosong), jadi nama
--    'pilgrim-docs' tidak menabrak apa pun. Batas antar-travel ditegakkan lewat
--    nama objek: path selalu `<travel_id>/<pilgrim_id>/<DOC_TYPE>-...`, sehingga
--    `(storage.foldername(name))[1]` = travel pemanggil. Policy storage dibuat
--    PERMISSIVE seperti policy tabel lain dan hanya untuk role `authenticated`
--    (anon tidak boleh membaca berkas KTP/paspor siapa pun).
-- =============================================================================

-- Seluruh bagian di bawah idempotent, jadi aman dijalankan ulang.

-- -----------------------------------------------------------------------------
-- 1. kolom jamaah
-- -----------------------------------------------------------------------------
alter table public.pilgrims alter column order_id drop not null;
alter table public.pilgrims add column if not exists package_id uuid;
create index if not exists pilgrims_package_idx on public.pilgrims (package_id);

-- -----------------------------------------------------------------------------
-- 2. bucket privat + policy per travel
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pilgrim-docs', 'pilgrim-docs', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pilgrim_docs_select" on storage.objects;
drop policy if exists "pilgrim_docs_insert" on storage.objects;
drop policy if exists "pilgrim_docs_update" on storage.objects;
drop policy if exists "pilgrim_docs_delete" on storage.objects;

create policy "pilgrim_docs_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'pilgrim-docs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  );

create policy "pilgrim_docs_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pilgrim-docs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  );

-- UPDATE (menimpa berkas) wajib punya USING + WITH CHECK: tanpa WITH CHECK,
-- pemanggil bisa memindahkan objek ke folder travel lain.
create policy "pilgrim_docs_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'pilgrim-docs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  )
  with check (
    bucket_id = 'pilgrim-docs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  );

create policy "pilgrim_docs_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'pilgrim-docs'
    and (
      (storage.foldername(name))[1] = public.auth_travel_id()::text
      or public.is_super_admin()
    )
  );

-- -----------------------------------------------------------------------------
-- 3. verifikasi setelah dijalankan (hasil nyata di Dashboard SQL Editor):
--      order_id_nullable = YES
--      package_id_ada    = ya:uuid
--      bucket            = pilgrim-docs(public=false, limit=5242880)
--      policy_objects    = pilgrim_docs_select[SELECT], _insert[INSERT],
--                          _update[UPDATE], _delete[DELETE]
--      rls_objects       = true/false  (RLS aktif; FORCE tidak perlu karena
--                          pemanggil kita berperan `authenticated`, bukan owner)
--     Dijalankan dua kali: dulu dengan `begin; ... rollback;` untuk menguji
--     sintaks/izin tanpa efek, lalu `begin; ... commit;` untuk menerapkan.
-- -----------------------------------------------------------------------------
