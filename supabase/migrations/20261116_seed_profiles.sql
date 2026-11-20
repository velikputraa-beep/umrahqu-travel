-- =============================================================================
-- UmrahQu Travel — Seed `public.profiles` untuk akun demo Web Travel.
-- File   : supabase/migrations/20261116_seed_profiles.sql
-- Tanggal: 2026-11-16
-- Status : BELUM DIIJALANKAN. Ditulis sebagai hasil riset read-only, untuk
--          sesi sinkronisasi tabel. Tidak ada perintah di sini yang sudah
--          dijalankan ke project pheinjqzezmjucszzjvo.
--
-- URUTAN PAKAI (sudah disetujui 2026-11-16)
--   1. 20261116_init_schema.sql   buat tabel + kolom + RLS
--   2. 20261116_backfill_data.sql isi travel_id / packages.id yang masih NULL
--   3. file ini                   baru setelah itu login bisa dipetakan ke travel
--
-- MENGAPA FILE INI WAJIB ADA
--   Semua policy Web Travel membaca `public.auth_travel_id()`, yaitu
--   `select travel_id from profiles where id = auth.uid()`. Kalau baris
--   `profiles` tidak ada, auth_travel_id() mengembalikan NULL dan
--   is_super_admin() FALSE → user login apa pun melihat dashboard KOSONG,
--   termasuk super admin. Jadi init_schema tanpa seed ini = aplikasi mati.
--
-- FAKTA HASIL CEK READ-ONLY (2026-11-16), bukan asumsi
--   public.users (tabel demo, 4 baris — dibaca tanpa login lewat GET):
--     usr-1 Super Admin      admin@umrahqu.com               travel 'UmrahQu Pusat'     role 'admin'
--     usr-2 Siti Nurhaliza   siti.nur@annahil.co.id          travel 'An-Nahl'           role 'operational'
--     usr-3 Ahmad Fauzi      ahmad.fauzi@batiktravel.id      travel 'Batik Travel'      role 'travel_admin'
--     usr-4 Dewi Lestari     dewi.lestari@persadaindonesia.id travel 'Persada Indonesia' role 'travel_admin'
--   public.travels (4 baris): trv-1 Persada Indonesia, trv-2 An-Nahl,
--     trv-3 Batik Travel, trv-4 Cahaya Suci. 'UmrahQu Pusat' TIDAK ada di
--     travels → profil super admin memang sebaiknya travel_id NULL.
--   profiles.role (check constraint dari init_schema) hanya menerima:
--     super_admin, admin, travel_admin, travel_operational, travel_finance,
--     travel_staff. Role demo 'operational' TIDAK termasuk → dipetakan ke
--     'travel_operational' di bawah, bukan disisipkan apa adanya (kalau
--     dipaksa, INSERT gagal dengan check violation dan seluruh transaksi di
--     file ini rollback).
--   Email `admin@demo.com` / `travel@demo.com` yang disebut di permintaan TIDAK
--   ada di public.users. Karena itu file ini menempuh DUA jalur terpisah:
--     Bagian 1  = email yang sudah ada di database demo (jalan tanpa syarat)
--     Bagian 2  = daftar email `@demo.com`, hanya dipakai kalau akunnya sudah
--                 dibuat di Auth. File ini TIDAK pernah menulis ke schema
--                 `auth.*`: membuat user harus lewat Dashboard > Authentication
--                 atau Admin API, bukan lewat SQL.
--
-- ⚠ BATAS WEWENANG: file ini hanya menyentuh public.profiles. Tidak ada DROP,
--   tidak ada ALTER TABLE, tidak ada GRANT, dan `users`/`bookings` (Keputusan
--   A&E) hanya dibaca.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Profil dari data demo yang sudah ada (public.users → profiles)
--    id profiles SELALU id auth.users; kalau emailnya belum terdaftar di Auth,
--    barisnya dilewati (JOIN, bukan LEFT JOIN) supaya tidak lahir profil yatim
--    yang tidak bisa dipakai login.
-- -----------------------------------------------------------------------------
insert into public.profiles (id, travel_id, full_name, email, role)
select u.id,
       t.uid,
       d.nama,
       d.email,
       case d.role
         when 'admin'        then 'super_admin'
         when 'travel_admin' then 'travel_admin'
         when 'operational'  then 'travel_operational'
         when 'finance'      then 'travel_finance'
         when 'staff'        then 'travel_staff'
         else 'travel_staff'
       end
  from public.users d
  join auth.users u on lower(u.email) = lower(d.email)
  left join public.travels t on t.nama = d.travel
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Akun demo tambahan (permintaan: admin@demo.com, travel@demo.com, dst).
--    Dijalankan apa pun isi Auth-nya: kalau email belum ada, hanya muncul
--    NOTICE "LEWAT" dan seeding tetap sukses. `travel_name` dicocokkan ke
--    travels.nama; 'UmrahQu Pusat' sengaja dipakai super admin supaya
--    travel_id-nya NULL (tidak ada baris travels dengan nama itu).
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
  v_uid    uuid;
  v_travel uuid;
  v_ok     integer := 0;
  v_skip   integer := 0;
begin
  for r in
    select * from (values
      ('admin@demo.com'::text,       'Administrator Demo'::text, 'super_admin',        null::text),
      ('travel@demo.com',            'Pemilik Travel Demo',      'travel_admin',       'Batik Travel'),
      ('operasional@demo.com',       'Staf Operasional Demo',    'travel_operational', 'An-Nahl'),
      ('finance@demo.com',           'Staf Keuangan Demo',       'travel_finance',     'Persada Indonesia'),
      ('cabang@demo.com',            'Staf Cabang Demo',         'travel_staff',       'Batik Travel')
    ) as e(email, full_name, role_name, travel_name)
  loop
    select u.id into v_uid
      from auth.users u
     where lower(u.email) = lower(r.email)
     limit 1;

    if v_uid is null then
      raise notice 'LEWAT % — belum ada di Auth (buat lewat Dashboard > Authentication > Add user atau Admin API, lalu jalankan ulang file ini)', r.email;
      v_skip := v_skip + 1;
      continue;
    end if;

    select t.uid into v_travel
      from public.travels t
     where t.nama = r.travel_name;

    insert into public.profiles (id, travel_id, full_name, email, role)
    values (v_uid, v_travel, r.full_name, r.email, r.role_name)
    on conflict (id) do nothing;

    v_ok := v_ok + 1;
  end loop;

  raise notice 'Seed profiles @demo.com: % dibuat/dipertahankan, % dilewati', v_ok, v_skip;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Yang SENGAJA tidak dilakukan file ini
--    a. Tidak menulis password / tidak membuat baris auth.users (lihat atas).
--    b. Tidak mengisi profiles.branch_id. Tabel `branches` masih kosong dan
--       cabang mana yang jadi milik setiap user belum diputuskan — isi lewat UI
--       "Cabang" setelah Keputusan A (nama tabel) final, bukan lewat seed.
--    c. Tidak mengubah klaim JWT. Perlu dicatat supaya tidak bingung nanti:
--       fungsi lama `is_admin()` milik project ini membaca
--         auth.jwt() -> 'app_metadata' ->> 'role'  = 'admin'
--       sedangkan helper baru kita (is_super_admin) membaca profiles.role.
--       Dua sumber kebenaran yang berbeda. Kalau Web Travel juga harus bisa
--       menembus policy buatan Admin (`<t>_insert/_update/_delete` lama yang
--       masih hidup di tabel yang TIDAK saya pegang), user-nya butuh
--       app_metadata.role = 'admin' di JWT — itu di-set lewat Admin API
--       (updateUserById, option app_metadata), BUKAN lewat SQL di bawah ini.
--     contoh bentuknya, sengaja dikomentari:
--       -- update auth.users
--       --    set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
--       --  where email = 'admin@umrahqu.com';
--
-- -----------------------------------------------------------------------------
-- 4. VERIFIKASI — jalankan sebelum `commit;`
-- -----------------------------------------------------------------------------
-- select p.email, p.role, t.nama as travel, p.branch_id,
--        (p.travel_id is not null) as punya_travel
--   from public.profiles p
--   left join public.travels t on t.uid = p.travel_id
--  order by p.role, p.email;
--
-- -- harus 0: profil yang id-nya tidak ada di Auth
-- select count(*) yatim from public.profiles p
--  where not exists (select 1 from auth.users u where u.id = p.id);
--
-- -- harus 0: role di luar check constraint
-- select count(*) role_salah from public.profiles p
--  where p.role not in ('super_admin','admin','travel_admin',
--                       'travel_operational','travel_finance','travel_staff');
--
-- -- uji login: samakan dengan uid user yang sedang dicoba
-- -- select public.auth_travel_id(), public.is_super_admin();  -- jalankan AS user itu, bukan sebagai postgres
--
-- Kalau `profiles` masih kosong melompong, artinya belum ada satu pun email
-- demo yang terdaftar di Auth. Cek: Dashboard > Authentication > Users.
--
-- -----------------------------------------------------------------------------
-- 5. Selesai. Ganti `rollback;` jadi `commit;` setelah Bagian 4 rapi.
--    Default-nya rollback supaya file ini tidak bisa menulis secara tidak
--    sengaja saat dicoba-coba (sama seperti file backfill).
-- -----------------------------------------------------------------------------
rollback;
-- commit;
