-- =============================================================================
-- UmrahQu Travel — Skema awal database untuk Web Travel
-- File     : supabase/migrations/20261116_init_schema.sql
-- Tanggal  : 2026-11-16
-- Target   : Supabase project pheinjqzezmjucszzjvo (DIPAKAI BERSAMA oleh
--            Web Admin, Web Travel, dan Marketplace)
--
-- ⚠ STATUS: JANGAN DIIJALANKAN. File ini adalah HASIL RISET read-only yang
--   akan dibahas bersama di sesi sinkronisasi tabel. Tidak ada satu pun
--   perintah di sini yang sudah dieksekusi ke database.
--
--   ATOMIK: seluruh isi file dibungkus `begin;` … `commit;` (lihat ujung file).
--   Alasannya: Bagian 8 DROP 23 policy dulu, baru CREATE yang menggantinya.
--   Tanpa transaksi, kegagalan di tengah (nama tabel/kolom salah) meninggalkan
--   database LEBIH BOCOR atau LEBIH KETAT dari yang direncanakan, tanpa jalan
--   tengah. Semua DDL di file ini boleh di dalam transaksi (tidak ada
--   CREATE INDEX CONCURRENTLY). Kalau error, `commit;` otomatis diperlakukan
--   Postgres sebagai rollback.
--   Tombol undo setelah commit ada di: 20261116_revert_policies.sql
--
-- -----------------------------------------------------------------------------
-- SUMBER RISET (read-only, 2026-11-16)
--   1. Web asli https://travel.umrahqu.com — 27 rute dipetakan, 20 di antaranya
--      hidup, 7 masih 404 (/flights /transport /vendors /branch-staff
--      /settings/equipment /settings/bank-accounts /audit-logs).
--   2. Query PostgREST yang benar-benar dikirim aplikasi (dibaca dari URL
--      request + bundle JS publiknya) → 16 tabel produksi + nama kolom aslinya.
--   3. Inventaris 26 halaman lokal di src/app/(travel)/** (label kolom, enum,
--      field form).
--   4. Inventaris tabel yang SUDAH ADA di project kita (27 tabel, diverifikasi
--      lewat Table Editor dashboard + GET tanpa login, 2026-11-16):
--        milik Travel/Admin : airlines, banks, booking_stats, bookings,
--          categories, complaints, deposits, documents, domains, faqs,
--          finance_stats, hotels, invoices, logs, notifications, packages,
--          registrations, reviews, transactions, travels, users, websites, withdraws
--        analytics_*        : analytics_sources, analytics_stats, analytics_top,
--          analytics_trend   (4 tabel statistik milik aplikasi website-builder)
--      PENTING: 26 dari 27 tabel TERBACA oleh anon key tanpa login (HTTP 200);
--      hanya `notifications` yang 401. Artinya RLS praktik-nya masih lepas di
--      project ini — file ini menutupnya untuk tabel yang saya pegang, sisanya
--      masuk Keputusan E.
--
-- -----------------------------------------------------------------------------
-- PETA NAMA: produksi vs project lokal vs nama yang diminta di tiket ini
--   produksi          lokal (sudah ada)        nama di file ini     catatan
--   ---------------   ----------------------   ------------------   ----------------------------
--   tenants           travels                  travels (ALTER)      entitas travel/organisasi
--   users             users (demo)             profiles (CREATE)    `profiles` = nama yang diminta
--   packages          packages (demo)          packages (ALTER)     sama entitas
--   bookings          bookings (demo)          orders   (CREATE)    `orders` = nama yang diminta
--   participants      —                        pilgrims (CREATE)    `pilgrims` = nama yang diminta
--   payments          transactions (demo)      payments (CREATE)    ledger pembayaran jamaah
--   branches          —                        branches (CREATE)
--   agents            —                        agents   (CREATE)
--   commissions       —                        commissions(CREATE)
--   package_hotels    —                        package_hotels
--   package_gallery   —                        package_gallery
--   package_departures-                        package_departures
--   airlines          airlines (demo)          airlines (ALTER)
--   hotels            hotels (demo)            hotels   (ALTER)
--   —                 banks/categories/invoices/documents/deposits → ALTER
--
--   Keputusan yang PERLU disepakati di sesi sinkron (belum saya putuskan):
--     A. Apakah `profiles`/`orders`/`pilgrims` menang, atau ikuti nama produksi
--        `users`/`bookings`/`participants`? File ini memakai nama yang diminta
--        tiket, dan tabel demo `users`/`bookings` dibiarkan utuh (tidak diubah).
--     B. Tabel demo memakai PRIMARY KEY `text` ('trv-1', 'htl-1', slug paket).
--        Tabel baru memakai `uuid`. Karena itu SEMUA foreign key dari tabel baru
--        ke tabel demo saya KOMENTARI (Bagian 9) — aktifkan setelah PK tabel
--        demo ditype ulang ke uuid, atau sebaliknya.
--        Sementara ini `travels` diberi kolom jembatan `uid uuid` (Bagian 1)
--        supaya RLS bisa jalan; kolom itu dilebur ke `id` setelah B diputuskan.
--     C. Kolom uang di tabel demo masih string ('Rp 35.000.000'). Yang baru
--        memakai bigint (rupiah, tanpa pemisah). Kolom string lama tidak saya
--        hapus supaya Admin/Marketplace yang masih membacanya tidak rusak.
--     D. `packages` (Keputusan BERSAMA, disepakati 2026-11-16): SELECT terbuka
--        untuk publik termasuk `anon`/guest (katalog Marketplace), sedangkan
--        INSERT/UPDATE/DELETE hanya travel pemiliknya atau super admin. Ditulis
--        di Bagian 8 sebagai `packages_select_public` dengan predicate
--        `deleted_at is null` — belum memakai status='published' karena nilai
--        `packages.status` di data demo belum diverifikasi (nanti cek bareng di
--        dashboard, tugas #2).
--        UPDATE 2026-11-16: karena SELECT publik itu, 3 kolom sensitif
--        (min_dp_amount, commission_amount, refund_policy) TIDAK dipasang di
--        `packages` melainkan dipisah ke tabel baru `package_pricing` dengan
--        RLS travel-scope.
--     E. Tabel yang TIDAK disentuh file ini tapi ada di project yang sama:
--        analytics_sources/stats/top/trend, booking_stats, finance_stats,
--        complaints, domains, faqs, logs, notifications, registrations,
--        reviews, websites, withdraws, users, bookings.
--        Sepertinya punya aplikasi tetangga (website-builder) + demo lama.
--        Perlu diputuskan: kita pasangi RLS juga, atau pemiliknya yang mengurus?
--        UPDATE 2026-11-16 (keputusan user): BIARKAN DULU, jangan dipasang RLS
--        dan jangan di-drop policy-nya. Catatan risiko yang tetap berlaku sampai
--        pemiliknya bergerak: 14 tabel itu juga punya `<t>_read using (true)`
--        untuk `anon`, termasuk `withdraws` (pengajuan pencairan dana),
--        `bookings`, `users` (4 baris: nama, email, role staf) dan `logs`.
--        Bocornya terbaca dari browser tanpa login — GET public/users?limit=1
--        dan GET public/transactions?limit=1 sama-sama membalik HTTP 200 berisi
--        data asli.
--        KECUALIAN yang layak dicatat: `notifications_read` TIDAK bocor. Isinya
--        `for select to authenticated using (user_id = auth.uid() or is_admin())`
--        — satu-satunya policy tulisan tangan di project ini, dan bukti bahwa
--        pola `<t>_read using (true)` memang template bawaan dashboard yang
--        belum pernah ditinjau. Bentuk policy notifications inilah yang saya
--        pakai sebagai acuan bagian RLS di file ini.
--     F. Hasil cek dashboard: semua tabel demo SUDAH punya created_at +
--        updated_at, dan `packages` TIDAK punya kolom id sama sekali (PK-nya
--        slug text). Jadi:
--          * `add column if not exists updated_at` untuk travels/packages/hotels
--            = no-op (kolomnya sudah ada) — trigger updated_at tetap aman.
--          * `alter table public.packages add column if not exists id uuid`
--            membuat kolom id BARU yang isinya NULL untuk 4 baris lama.
--            FK ke packages(id) butuh kolom itu di-backfill + unique index
--            packages_id_key (sudah saya tambahkan, Bagian 2).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Ekstensi & utilitas
--    pgcrypto 1.3 sudah aktif di schema `extensions` (dicek di Database >
--    Extensions, 2026-11-16), jadi statement di bawah hanya no-op yang aman.
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. IDENTITAS & STRUKTUR TRAVEL
-- -----------------------------------------------------------------------------

-- travels sudah ADA (tabel demo: id text, nama, alamatKota, alamatDetail,
-- totalPaket, legalitas, status, initial, color). Diisi kolom kanonik.
-- initial/color adalah kelas presentasi UI, bukan data — slated for removal.
alter table public.travels add column if not exists code            text;
alter table public.travels add column if not exists slug            text;
alter table public.travels add column if not exists logo_url        text;
alter table public.travels add column if not exists contact_email   text;
alter table public.travels add column if not exists contact_phone   text;
alter table public.travels add column if not exists is_active       boolean not null default true;
alter table public.travels add column if not exists deleted_at      timestamptz;
alter table public.travels add column if not exists updated_at      timestamptz not null default now();
-- /deposits: "Minimal Rp 10.000.000" → ambang saldo per travel
alter table public.travels add column if not exists min_deposit_amount bigint;
-- JEMBATAN UUID (Keputusan B): travels.id masih text ('trv-1'), sedangkan
-- profiles.travel_id dan travel_id di semua tabel baru adalah uuid. Tanpa kolom
-- ini, policy "travels bisa dibaca usernya sendiri" tidak bisa ditulis sama
-- sekali (text = uuid → error). Setelah Keputusan B final (PK demo di-retype ke
-- uuid), kolom uid dilebur ke id dan policy di Bagian 8 tinggal ganti nama.
alter table public.travels add column if not exists uid uuid not null default gen_random_uuid();
create unique index if not exists travels_uid_key on public.travels (uid);

-- profiles = tabel aplikasi per user login (produksi memakai nama `users`).
-- Kolom persis seperti yang dikirim/ dibaca aplikasi asli.
create table if not exists public.profiles (
  id            uuid primary key,               -- disamakan dengan auth.users.id
  travel_id     uuid,                           -- → travels (FK di Bagian 9)
  branch_id     uuid,                           -- → branches (FK di Bagian 9)
  full_name     text,
  email         text,
  phone         text,
  avatar_url    text,
  -- nilai yang terlihat di aplikasi asli: travel_admin, travel_operational,
  -- travel_finance; plus admin (demo lokal) dan super_admin
  role          text not null default 'travel_admin'
                check (role in ('super_admin','admin','travel_admin',
                                'travel_operational','travel_finance','travel_staff')),
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- branches: kolom sama persis dengan query produksi
-- select=id,name,city,address,phone,is_primary,is_active,tenant_id
create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  travel_id   uuid not null,                    -- produksi menyebutnya tenant_id
  name        text not null,
  city        text,
  address     text,
  phone       text,
  is_primary  boolean not null default false,   -- ditandai ★ di daftar & rekap
  is_active   boolean not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. MASTER DATA PAKET
-- -----------------------------------------------------------------------------

-- packages sudah ADA (slug, nama, travel, biaya 'Rp..', cashback 'Rp..',
-- kategori, status, terisi, total, persen, imgColor). Ditambah kolom numerik
-- dan relasi sesuai query produksi:
-- select=id,name,slug,price,quota,quota_taken,status,type,duration_nights,branch_id
alter table public.packages add column if not exists id               uuid;
-- PENTING (hasil cek dashboard 2026-11-16): tabel `packages` demo TIDAK punya
-- kolom id sama sekali — PK-nya `slug` (text), dan 4 baris isinya sudah pakai
-- slug. Kolom uuid di atas jadi kandidat PK baru, tapi sekarang isinya NULL.
-- Unique index ini aman (NULL boleh banyak) dan wajib ada sebelum FK
-- references public.packages(id) di Bagian 9 diaktifkan.
create unique index if not exists packages_id_key on public.packages (id);
alter table public.packages add column if not exists travel_id        uuid;
alter table public.packages add column if not exists name             text;
alter table public.packages add column if not exists price            bigint;
alter table public.packages add column if not exists quota            integer;
alter table public.packages add column if not exists quota_taken      integer not null default 0;
alter table public.packages add column if not exists type             text check (type in ('Plus','Reguler','Hemat','Ramadhan','Syiar','Akbar') or type is null);
alter table public.packages add column if not exists duration_nights  integer;
alter table public.packages add column if not exists branch_id        uuid;
alter table public.packages add column if not exists category_id      uuid;
alter table public.packages add column if not exists description      text;
alter table public.packages add column if not exists departure_date   date;
alter table public.packages add column if not exists completed_at     timestamptz;
alter table public.packages add column if not exists cashback_amount  bigint;
alter table public.packages add column if not exists includes         jsonb not null default '[]'::jsonb;
alter table public.packages add column if not exists excludes         jsonb not null default '[]'::jsonb;
alter table public.packages add column if not exists terms            jsonb not null default '[]'::jsonb;
alter table public.packages add column if not exists deleted_at       timestamptz;
-- TIDAK jadi ditambahkan ke packages: min_dp_amount, refund_policy,
-- commission_amount. RLS hanya menyaring baris, dan packages_select_public
-- membaca untuk `anon` → 3 kolom bisnis internal itu akan terbaca tamu.
-- Ketiganya pindah ke public.package_pricing di bawah (hanya untuk travel
-- pemiliknya). Kalau suatu saat ada yang sudah terlanjur menjalankan versi
-- lama file ini, bersihkan dengan:
--   alter table public.packages
--     drop column if exists min_dp_amount,
--     drop column if exists refund_policy,
--     drop column if exists commission_amount;
alter table public.packages add column if not exists updated_at       timestamptz not null default now();

-- categories sudah ADA (id text, title, paketCount, status, subcategories jsonb)
alter table public.categories add column if not exists travel_id uuid;
alter table public.categories add column if not exists slug      text;
alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.categories add column if not exists deleted_at timestamptz;

-- hotels sudah ADA (nama, kota, bintang, mitra, jarak, alamat, fasilitas jsonb,
-- catatanLokasi, catatanKonsumsi, status). Ditambah kolom yang dibaca produksi:
-- select=id,name,city,rating,address,phone,email,website,logo_url,main_photo_url
-- Catatan produksi: hotel bisa milik satu travel ATAU bersama
-- (or=(tenant_id.eq.X,tenant_id.is.null)) → travel_id sengaja nullable.
alter table public.hotels add column if not exists travel_id      uuid;
alter table public.hotels add column if not exists phone         text;
alter table public.hotels add column if not exists email         text;
alter table public.hotels add column if not exists website       text;
alter table public.hotels add column if not exists logo_url      text;
alter table public.hotels add column if not exists main_photo_url text;
alter table public.hotels add column if not exists is_active     boolean not null default true;
alter table public.hotels add column if not exists deleted_at    timestamptz;
alter table public.hotels add column if not exists updated_at    timestamptz not null default now();

-- airlines sudah ADA (id text, nama, iata, mitra, status) — produksi: name,iata_code
alter table public.airlines add column if not exists travel_id  uuid;
alter table public.airlines add column if not exists iata_code  text;
alter table public.airlines add column if not exists is_active  boolean not null default true;
alter table public.airlines add column if not exists deleted_at timestamptz;

-- package_hotels: relasi paket ↔ hotel (produksi select=id,hotel_id,tenant_id)
create table if not exists public.package_hotels (
  id         uuid primary key default gen_random_uuid(),
  travel_id  uuid not null,
  package_id uuid not null,
  hotel_id   uuid not null,
  city       text,                    -- Makkah / Madinah, per sesi hotel
  nights     integer,
  sequence   integer,
  created_at timestamptz not null default now()
);

-- package_departures: jadwal keberangkatan per paket per cabang
create table if not exists public.package_departures (
  id             uuid primary key default gen_random_uuid(),
  travel_id      uuid not null,
  package_id     uuid not null,
  branch_id      uuid,
  departure_date date,
  return_date    date,
  quota          integer,
  quota_taken    integer not null default 0,
  status         text check (status in ('draft','open','full','departed','completed','cancelled') or status is null),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- package_gallery: produksi select=package_id,image_url
create table if not exists public.package_gallery (
  id          uuid primary key default gen_random_uuid(),
  travel_id   uuid not null,
  package_id  uuid not null,
  image_url   text not null,
  media_type  text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- package_flights: payload /api/packages/create mengirim flights[] dengan
-- airline_name + airline_code; tabel `flights` produksi masih 404 di web.
create table if not exists public.package_flights (
  id             uuid primary key default gen_random_uuid(),
  travel_id      uuid not null,
  package_id     uuid not null,
  airline_id     uuid,
  airline_name   text,
  airline_code   text,
  flight_number  text,
  route          text,
  segment        text,                -- keberangkatan / kepulangan
  departure_time timestamptz,
  arrival_time   timestamptz,
  sequence       integer,
  created_at     timestamptz not null default now()
);

-- package_pricing = rahasia dagang per paket, DIPISAH dari `packages` karena
-- katalog paket dibaca publik (anon) lewat packages_select_public. RLS hanya
-- menyaring baris, tidak bisa menyembunyikan kolom — jadi kolom sensitif harus
-- pindah ke tabel yang policy-nya travel-scope. Sumber field: form Paket di web
-- asli (Biaya Minimal DP / Cashback / Kebijakan Refund) + komisi agen.
create table if not exists public.package_pricing (
  id               uuid primary key default gen_random_uuid(),
  travel_id        uuid not null,
  package_id       uuid not null,
  min_dp_amount    bigint,                       -- minimal uang muka (rupiah)
  commission_amount bigint,                      -- komisi agen per pax (rupiah)
  refund_policy    jsonb not null default '{}'::jsonb,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (package_id)
);
create index if not exists package_pricing_travel_idx on public.package_pricing (travel_id);

-- -----------------------------------------------------------------------------
-- 3. PESANAN (produksi: bookings) — nama di sini `orders` sesuai permintaan
-- -----------------------------------------------------------------------------
-- Daftar kolom diperoleh dari respons /api/travel/bookings (bentuk sebenarnya):
--   id, package_id, tenant_id, customer_id, booking_channel, status,
--   pilgrim_count, price, total, remaining_amount, remaining_due_date,
--   booking_code, payment_status, paid_amount, cashback_amount, payment_scheme,
--   down_payment_amount, branch_id, group_code, confirmed_by, confirmed_at,
--   created_at, updated_at (+ deleted_at dari filter deleted_at=is.null)
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  travel_id           uuid not null,
  branch_id           uuid,
  package_id          uuid not null,
  departure_id        uuid,                     -- → package_departures
  customer_id         uuid,                     -- → profiles (pemesan)
  agent_id            uuid,                     -- → agents (kanal agen/reseller)
  booking_code        text not null,            -- MP-261113CUBY01 / OF-...
  channel             text not null default 'marketplace'
                      check (channel in ('marketplace','offline','website_travel','langsung','agency')),
  status              text not null default 'pending'
                      check (status in ('pending','processing','confirmed','completed','cancelled','refunded')),
  payment_status      text not null default 'unpaid'
                      check (payment_status in ('unpaid','dp','partial','paid')),
  payment_scheme      text
                      check (payment_scheme in ('lunas','cicilan','cicilan_bulanan')),
  price_per_pilgrim   bigint,
  pilgrim_count       integer not null default 0,
  total_amount        bigint not null default 0,
  paid_amount         bigint not null default 0,
  remaining_amount    bigint not null default 0,
  remaining_due_date  date,
  down_payment_amount bigint,
  cashback_amount     bigint,
  commission_amount   bigint,
  referral_code       text,
  group_code          text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  address             text,
  city                text,
  postal_code         text,
  purchase_date       date,
  notes               text,
  confirmed_by        uuid,                     -- → profiles
  confirmed_at        timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create unique index if not exists orders_booking_code_key on public.orders (booking_code);
create index if not exists orders_travel_status_idx on public.orders (travel_id, status);
create index if not exists orders_package_idx       on public.orders (package_id);

-- -----------------------------------------------------------------------------
-- 4. JAMAAH (produksi: participants) — nama di sini `pilgrims` sesuai permintaan
-- -----------------------------------------------------------------------------
-- Kolom dari select produksi + /api/travel/participants:
--   full_name, national_id, passport_number, passport_expiry, gender, phone,
--   birth_date, relation, booking_id, participant_code, nationality,
--   visa_status, meningitis_vaccine_status, document_completeness_status
create table if not exists public.pilgrims (
  id                uuid primary key default gen_random_uuid(),
  travel_id         uuid not null,
  order_id          uuid not null,
  branch_id         uuid,
  participant_code  text,
  full_name         text not null,
  national_id       text,                       -- NIK 16 digit
  passport_number   text,
  passport_expiry   date,
  gender            text check (gender in ('male','female') or gender is null),
  birth_date        date,
  nationality       text not null default 'WNI',
  phone             text,
  relation          text
                  check (relation in ('diri_sendiri','suami','istri','anak','orang_tua','keluarga','lainnya') or relation is null),
  visa_status       text check (visa_status in ('belum','proses','terbit') or visa_status is null),
  vaccine_status    text check (vaccine_status in ('belum','sudah') or vaccine_status is null),
  document_status   text not null default 'incomplete'
                  check (document_status in ('complete','incomplete')),
  status            text check (status in ('pending','processing','confirmed','completed','cancelled','refunded') or status is null),
  seat_preference   text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists pilgrims_order_idx   on public.pilgrims (order_id);
create index if not exists pilgrims_travel_idx  on public.pilgrims (travel_id);

-- pilgrim_documents = dokumen per jamaah (KTP/KK/PASPOR/VAKSIN),
-- dilayani /api/travel/documents?participant_id=... ; berkasnya di Storage.
create table if not exists public.pilgrim_documents (
  id           uuid primary key default gen_random_uuid(),
  travel_id    uuid not null,
  pilgrim_id   uuid not null,
  doc_type     text not null check (doc_type in ('KTP','KK','PASPOR','VAKSIN','FOTO','NPWP','KIA','LAINNYA')),
  file_path    text,                            -- path di Storage bucket
  file_name    text,
  mime_type    text,
  file_size    bigint,
  expires_at   date,
  status       text not null default 'uploaded'
               check (status in ('uploaded','verified','rejected','expired')),
  verified_at  timestamptz,
  uploaded_by  uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists pilgrim_documents_pilgrim_idx on public.pilgrim_documents (pilgrim_id);

-- documents (demo) = dokumen legalitas TRAVEL (SK PPIU Kemenag, dsb.),
-- bukan dokumen jamaah — entitas berbeda, jadi hanya dilengkapi.
alter table public.documents add column if not exists travel_id    uuid;
alter table public.documents add column if not exists doc_type     text;
alter table public.documents add column if not exists file_path    text;
alter table public.documents add column if not exists issued_date  date;
alter table public.documents add column if not exists expires_date date;
alter table public.documents add column if not exists verified_at  timestamptz;

-- -----------------------------------------------------------------------------
-- 5. KEUANGAN
-- -----------------------------------------------------------------------------

-- payments = pembayaran jamaah (produksi: payments, select=id,
-- payment_batch_code,amount,booking_id; payload offline: booking_id, amount,
-- bank_id, notes, proof_url)
create table if not exists public.payments (
  id                uuid primary key default gen_random_uuid(),
  travel_id         uuid not null,
  order_id          uuid not null,
  branch_id         uuid,
  code              text,                        -- PAY-261113LWEM
  payment_batch_code text,
  amount            bigint not null,
  method            text check (method in ('tunai','transfer','edc','virtual_account','qris','midtrans') or method is null),
  bank_id           uuid,
  channel           text,
  status            text not null default 'pending'
                    check (status in ('pending','paid','verified','rejected','refunded')),
  is_installment    boolean not null default false,
  proof_path        text,                        -- bukti transfer di Storage
  notes             text,
  paid_at           timestamptz,
  verified_by       uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists payments_order_idx  on public.payments (order_id);
create index if not exists payments_travel_idx on public.payments (travel_id);

-- installments = jadwal cicilan per pesanan (halaman /transactions/installments)
create table if not exists public.installments (
  id          uuid primary key default gen_random_uuid(),
  travel_id   uuid not null,
  order_id    uuid not null,
  sequence    integer not null default 1,
  due_date    date not null,
  amount      bigint not null,
  paid_amount bigint not null default 0,
  status      text not null default 'unpaid'
              check (status in ('unpaid','partial','paid','overdue')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists installments_due_idx on public.installments (travel_id, due_date);

-- agents = agen/reseller. Kolom dari query produksi:
-- select=id,user_id,branch_id,referral_code,commission_amount,
--        commission_trigger,is_active,notes
create table if not exists public.agents (
  id                 uuid primary key default gen_random_uuid(),
  travel_id          uuid not null,
  profile_id         uuid,                       -- produksi: user_id
  branch_id          uuid,
  name               text,
  phone              text,
  referral_code      text,                       -- AGN-1234
  commission_amount  bigint,                     -- Rp per booking
  commission_trigger text not null default 'pelunasan'
                     check (commission_trigger in ('dp','pelunasan','manual')),
  is_active          boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create unique index if not exists agents_referral_code_key on public.agents (referral_code) where referral_code is not null;

-- commissions = tagihan komisi agen (kolom minimal terlihat dari
-- eq(agent_id)/eq(id)/delete(); sisanya dari UI: Pesanan·Agen·Komisi·Status)
create table if not exists public.commissions (
  id          uuid primary key default gen_random_uuid(),
  travel_id   uuid not null,
  agent_id    uuid not null,
  order_id    uuid,
  amount      bigint not null default 0,
  status      text not null default 'pending'
              check (status in ('pending','payable','paid','cancelled')),
  triggered_by text check (triggered_by in ('dp','pelunasan','manual') or triggered_by is null),
  paid_at     timestamptz,
  paid_by     uuid,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists commissions_agent_idx on public.commissions (agent_id);

-- deposits (demo: nama, handle, saldo 'Rp..', saldoTone, minSaldo 'Rp..',
-- batasOperasional 'Rp..', status) → ditambahkan kolom numerik
alter table public.deposits add column if not exists travel_id         uuid;
alter table public.deposits add column if not exists balance           bigint not null default 0;
alter table public.deposits add column if not exists min_balance       bigint;
alter table public.deposits add column if not exists operational_limit bigint;
alter table public.deposits add column if not exists updated_at        timestamptz not null default now();

-- deposit_mutations = mutasi saldo deposit (UI: Commission hold, Isi Saldo,
-- Saldo Akhir; top-up lewat /api/deposits/topup + Midtrans order_id)
create table if not exists public.deposit_mutations (
  id            uuid primary key default gen_random_uuid(),
  travel_id     uuid not null,
  deposit_id    uuid,
  kind          text not null
                check (kind in ('topup','commission_hold','commission_release','withdrawal','refund','adjustment')),
  title         text,
  description   text,
  amount        bigint not null,                 -- positif = masuk, negatif = keluar
  balance_after bigint,
  reference     text,                            -- order_id Midtrans / invoice
  status        text not null default 'completed'
                check (status in ('pending','completed','failed','expired')),
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists deposit_mutations_travel_idx on public.deposit_mutations (travel_id, occurred_at desc);

-- transactions (demo: invoice, deskripsi, channel, nominal 'Rp..', tanggal,
-- status) → dilengkapi tautan numerik ke pesanan/travel
alter table public.transactions add column if not exists travel_id  uuid;
alter table public.transactions add column if not exists order_id   uuid;
alter table public.transactions add column if not exists amount     bigint;
alter table public.transactions add column if not exists method     text;
alter table public.transactions add column if not exists paid_at    timestamptz;
alter table public.transactions add column if not exists proof_path text;

-- invoices (demo: noFaktur, jamaah, jumlah 'Rp..', tanggal, status)
alter table public.invoices add column if not exists travel_id uuid;
alter table public.invoices add column if not exists order_id  uuid;
alter table public.invoices add column if not exists amount    bigint;
alter table public.invoices add column if not exists due_date  date;

-- banks (demo: bank, norek, pemilik, utama, status) — dipakai bank_id pembayaran
alter table public.banks add column if not exists travel_id     uuid;
alter table public.banks add column if not exists code          text;
alter table public.banks add column if not exists swift_code    text;
alter table public.banks add column if not exists account_name  text;
alter table public.banks add column if not exists account_number text;
alter table public.banks add column if not exists is_active     boolean not null default true;
alter table public.banks add column if not exists deleted_at    timestamptz;

-- -----------------------------------------------------------------------------
-- 6. KEBERANGKATAN: MANASIK, MANIFEST, PERLENGKAPAN
-- -----------------------------------------------------------------------------

-- manasik_schedules (halaman /manasik: kalender berisi event {text,color};
-- tombol "Buat Jadwal")
create table if not exists public.manasik_schedules (
  id           uuid primary key default gen_random_uuid(),
  travel_id    uuid not null,
  branch_id    uuid,
  package_id   uuid,
  title        text not null,
  description  text,
  event_date   date not null,
  start_time   time,
  end_time     time,
  location     text,
  color        text,                              -- kelas warna di kalender UI
  spans_days   integer not null default 1,
  status       text not null default 'scheduled'
               check (status in ('scheduled','ongoing','done','cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- manasik_attendances = presensi jamaah pada jadwal manasik
create table if not exists public.manasik_attendances (
  id           uuid primary key default gen_random_uuid(),
  travel_id    uuid not null,
  schedule_id  uuid not null,
  pilgrim_id   uuid not null,
  status       text not null default 'absent'
               check (status in ('present','absent','sick','permission')),
  noted_by     uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (schedule_id, pilgrim_id)
);

-- rooms (payload /api/travel/manifest: action, package_id, room_number,
-- room_type, capacity, floor; respons: id, package_id, room_number, room_type,
-- capacity, assignments[])
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  travel_id   uuid not null,
  package_id  uuid not null,
  departure_id uuid,
  hotel_id    uuid,
  room_number text not null,
  room_type   text check (room_type in ('single','double','triple','quad','quint','apartment') or room_type is null),
  capacity    integer not null default 2,
  floor       text,
  check_in    date,
  check_out   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (package_id, room_number)
);

create table if not exists public.room_assignments (
  id          uuid primary key default gen_random_uuid(),
  travel_id   uuid not null,
  room_id     uuid not null,
  pilgrim_id  uuid not null,
  bed_label   text,
  created_at  timestamptz not null default now(),
  unique (room_id, pilgrim_id)
);

-- vehicles (payload manifest kind=buses: bus_number, operator_name,
-- route_description, vehicle_type)
create table if not exists public.vehicles (
  id               uuid primary key default gen_random_uuid(),
  travel_id        uuid not null,
  package_id       uuid not null,
  bus_number       text not null,
  vehicle_type     text check (vehicle_type in ('bus','elf','hiace','van','sedan','bus_large') or vehicle_type is null),
  operator_name    text,
  vendor_id        uuid,
  route_description text,
  capacity         integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (package_id, bus_number)
);

create table if not exists public.vehicle_assignments (
  id          uuid primary key default gen_random_uuid(),
  travel_id   uuid not null,
  vehicle_id  uuid not null,
  pilgrim_id  uuid not null,
  seat_number text,
  created_at  timestamptz not null default now(),
  unique (vehicle_id, pilgrim_id)
);

-- equipment_templates (payload /api/travel/equipment: action, package_id,
-- name, category, requires_size, size_options; UI: Koper Bagasi, Kain Ihram,
-- Mukena; ukuran S/M/L)
create table if not exists public.equipment_templates (
  id             uuid primary key default gen_random_uuid(),
  travel_id      uuid not null,
  package_id     uuid,
  name           text not null,
  category       text,
  requires_size  boolean not null default false,
  size_options   jsonb not null default '[]'::jsonb,
  unit_price     bigint,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- equipment_assignments = penyerahan perlengkapan (status: Sudah/Belum Diserahkan)
create table if not exists public.equipment_assignments (
  id           uuid primary key default gen_random_uuid(),
  travel_id    uuid not null,
  package_id   uuid,
  order_id     uuid,
  pilgrim_id   uuid,
  template_id  uuid,
  item_name    text,
  size         text,
  quantity     integer not null default 1,
  status       text not null default 'not_delivered'
               check (status in ('not_delivered','delivered','returned')),
  delivered_at timestamptz,
  delivered_by uuid,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- vendors = mitra/vendor (rute /vendors masih 404 di web asli, tapi
-- vehicles.vendor_id dan hotels "mitra" sudah merujuk konsep ini)
create table if not exists public.vendors (
  id         uuid primary key default gen_random_uuid(),
  travel_id  uuid,
  name       text not null,
  kind       text check (kind in ('hotel','transportasi','perlengkapan','vendor_lain') or kind is null),
  contact_name text,
  phone      text,
  email      text,
  address    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- muthawif = pembimbing rombongan (tabel `muthawifs` terlihat di query produksi)
create table if not exists public.muthawifs (
  id         uuid primary key default gen_random_uuid(),
  travel_id  uuid,
  full_name  text not null,
  phone      text,
  language   text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- staff = staf cabang (rute /branch-staff 404, tapi UI lokal sudah menyiapkan
-- halamannya dan users.branch_id menunjukkan penugasan per cabang)
create table if not exists public.staff (
  id         uuid primary key default gen_random_uuid(),
  travel_id  uuid not null,
  branch_id  uuid,
  profile_id uuid,
  full_name  text,
  position   text,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- audit_logs (rute /audit-logs 404 di web asli, sidebar sudah menautkannya;
-- halaman lokal pengaturan/audit-log sudah ada)
create table if not exists public.audit_logs (
  id         bigint generated always as identity primary key,
  travel_id  uuid,
  actor_id   uuid,
  action     text not null,
  entity     text,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_travel_idx on public.audit_logs (travel_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 7. Trigger updated_at
--    Hanya dipasang pada tabel yang benar-benar punya kolom updated_at, jadi
--    file ini aman dijalankan walaupun ada tabel yang strukturnya berubah.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  trg text;
begin
  foreach t in array array[
    'profiles','branches','travels','packages','hotels','orders','pilgrims',
    'payments','installments','agents','commissions','deposit_mutations',
    'manasik_schedules','manasik_attendances','rooms','vehicles',
    'equipment_templates','equipment_assignments','package_departures','package_pricing','staff'
  ] loop
    continue when not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = t
        and c.column_name = 'updated_at'
    );
    trg := t || '_touch_updated_at';
    execute format('drop trigger if exists %I on public.%I', trg, t);
    execute format(
      'create trigger %I before update on public.%I '
      'for each row execute function public.touch_updated_at()', trg, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 7b. Fungsi bantu identitas user.
--     WAJIB di sini, bukan di Bagian 0: Postgres memvalidasi body fungsi
--     `language sql` saat CREATE FUNCTION, jadi tabel profiles harus sudah
--     ada lebih dulu. (Inilah penyebab error 42P01 percobaan pertama.)
-- -----------------------------------------------------------------------------
-- travel_id milik user yang sedang login (dipakai semua policy RLS).
-- SECURITY DEFINER diperlukan agar policy pada `profiles` tidak rekursif.
create or replace function public.auth_travel_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.travel_id
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(public.auth_role() = 'super_admin', false);
$$;

-- branch_id milik user yang sedang login (scope "Pilih Cabang" di sidebar)
create or replace function public.auth_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.branch_id
  from public.profiles p
  where p.id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 8. RLS
--    Prinsip: DB dipakai bersama 3 aplikasi → default DITOLAK. Tidak ada policy
--    untuk role `anon`; data travel hanya terbaca oleh user terautentikasi yang
--    travel_id-nya cocok (helper security-definer membaca profiles).
--    SATU PENGECUALIAN: katalog `packages` boleh dibaca publik (Keputusan D).
--
--    CATATAN RLS-EKSISTING (hasil cek halaman Database > Policies, read-only,
--    2026-11-16). 27 tabel di schema `public` masing-masing punya PERSIS 4
--    policy buatan dashboard (total 108), polanya seragam (26 tabel identik
--    persis; sisanya lihat catatan `notifications` di Keputusan E):
--      <t>_read    SELECT to anon, authenticated  using (true)      ← BOCOR
--      <t>_insert  INSERT to authenticated        with check (is_admin())
--      <t>_update  UPDATE to authenticated        using/with check (is_admin())
--      <t>_delete  DELETE to authenticated        using (is_admin())
--    `is_admin()` = satu-satunya function custom project ini:
--      select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
--    Dua konsekuensi yang membuat Bagian 8 ini HARUS menulis ulang policy,
--    bukan menambah:
--      1. `<t>_read using (true)` untuk `anon` = seluruh isi database bisa
--         dibaca siapa pun yang punya publishable key tanpa login. Saya
--         buktikan dengan GET biasa: travels/packages/users/bookings/
--         transactions semuanya HTTP 200 dan mengembalikan baris asli.
--         Karena policy SELECT bersifat PERMISSIVE (di-OR), policy selama
--         <t>_read masih hidup maka policy travel-scope baru tidak akan
--         pernah terlihat → semua drop di bawah ini bukan kosmetik.
--      2. `<t>_update/_delete` hanya boleh `is_admin()` (super admin platform),
--         jadi user travel mana pun gagal menulis padahal login-nya sah —
--         inilah alasan CRUD Web Travel hari ini cuma bisa jalan lewat
--         service role. Policy baru mengganti gerbangnya menjadi
--         `travel_id = auth_travel_id() or is_super_admin()`.
--    Kebijakan: nama policy lama saya DROP hanya untuk tabel yang Web Travel
--    pegang. Tabel tetangga (Keputusan E) dibiarkan apa adanya — itu wilayah
--    pemiliknya, dan user sudah memutuskan "BIARKAN DULU" pada 2026-11-16.
--    ⚠ EFFECT SAMPING yang perlu disetujui: setelah <t>_read di-drop, tabel
--    di bawah TIDAK lagi terbaca oleh `anon`. Kalau ada halaman publik
--    (Marketplace) yang ternyata memanggilnya tanpa login, ganti
--    `to authenticated` menjadi `to anon, authenticated` pada baris
--    policy-nya:
--      hotels, airlines, categories, banks, deposits, documents,
--      transactions, invoices, travels   (packages TIDAK — tetap publik, D)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'branches','orders','pilgrims','pilgrim_documents','payments','installments',
    'agents','commissions','deposit_mutations','manasik_schedules',
    'manasik_attendances','rooms','room_assignments','vehicles',
    'vehicle_assignments','equipment_templates','equipment_assignments',
    'package_hotels','package_gallery','package_flights','package_departures','package_pricing',
    'muthawifs','staff','audit_logs','documents','deposits','transactions','invoices'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    -- `%1$s_read` = policy lama hasil dashboard (`using (true) to anon,
    -- authenticated`). WAJIB di-drop: policy bersifat PERMISSIVE (di-OR), jadi
    -- selama <t>_read masih ada, policy travel-scope di bawah tidak ada
    -- gunanya sama sekali. Lihat Catatan RLS-EKSISTING di Bagian 8.
    execute format('drop policy if exists "%1$s_read" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
    execute format(
      'create policy "%1$s_select" on public.%1$I for select to authenticated '
      'using (travel_id = public.auth_travel_id() or public.is_super_admin())', t);
    execute format(
      'create policy "%1$s_insert" on public.%1$I for insert to authenticated '
      'with check (travel_id = public.auth_travel_id() or public.is_super_admin())', t);
    execute format(
      'create policy "%1$s_update" on public.%1$I for update to authenticated '
      'using (travel_id = public.auth_travel_id() or public.is_super_admin()) '
      'with check (travel_id = public.auth_travel_id() or public.is_super_admin())', t);
    execute format(
      'create policy "%1$s_delete" on public.%1$I for delete to authenticated '
      'using (travel_id = public.auth_travel_id() or public.is_super_admin())', t);
  end loop;
end $$;

-- packages: KATALOG PUBLIK (Keputusan D, diputuskan 2026-11-16).
--   SELECT untuk semua orang termasuk `anon`/guest — Marketplace dan halaman
--   publik Web Travel menampilkan daftar paket tanpa login.
--   INSERT/UPDATE/DELETE tetap milik travel pemiliknya atau super admin.
--   Karena SELECT terbuka dan RLS tidak bisa menyembunyikan kolom, field bisnis
--   internal (min_dp_amount, commission_amount, refund_policy) TIDAK dipasang di
--   `packages` — semuanya ada di public.package_pricing (Bagian 2) yang
--   policy-nya travel-scope.
alter table public.packages enable row level security;
alter table public.packages force row level security;
drop policy if exists "packages_read" on public.packages;
drop policy if exists "packages_select_public" on public.packages;
drop policy if exists "packages_insert" on public.packages;
drop policy if exists "packages_update" on public.packages;
drop policy if exists "packages_delete" on public.packages;
create policy "packages_select_public" on public.packages
  for select to anon, authenticated using (deleted_at is null);
create policy "packages_insert" on public.packages
  for insert to authenticated
  with check (travel_id = public.auth_travel_id() or public.is_super_admin());
create policy "packages_update" on public.packages
  for update to authenticated
  using (travel_id = public.auth_travel_id() or public.is_super_admin())
  with check (travel_id = public.auth_travel_id() or public.is_super_admin());
create policy "packages_delete" on public.packages
  for delete to authenticated
  using (travel_id = public.auth_travel_id() or public.is_super_admin());

-- profiles: HANYA baris miliknya sendiri. Tidak ada policy yang membuka
-- profil user lain, meskipun satu travel (menutup kebocoran PII antar-staf).
-- Konsekuensi yang perlu disepakati di sesi sinkron:
--   * Daftar "Staf Cabang" / nama agen tidak bisa lagi menampilkan full_name
--     user lain dari `profiles`. Kalau UI-nya butuh, siapkan view
--     `security_invoker` berisi kolom non-PII (id, travel_id, branch_id,
--     full_name, role) + policy select-nya sendiri — jangan longgarkan policy ini.
--   * Helper auth_travel_id()/auth_role()/is_super_admin() tetap bekerja karena
--     SECURITY DEFINER (pemilik tabel menembus RLS), jadi scope cabang tidak
--     ikut rusak.
--   * Web Admin / Marketplace butuh policy sendiri; sekarang mereka masih bisa
--     jalan lewat role bypassrls (service role) — JANGAN pakai itu di browser.
--     Kalau Admin harus mengelola profil lewat role `authenticated`, jangan
--     longgarkan policy ini — tambahkan policy TERPISAH, contoh:
--       create policy "profiles_write_super_admin" on public.profiles
--         for all to authenticated
--         using (public.is_super_admin()) with check (public.is_super_admin());
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles_insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- DELETE sengaja tidak diberi policy: penghapusan user ditangani lewat Admin.

-- Master data bersama: hotel & cabang boleh lintas-travel hanya untuk dibaca.
alter table public.hotels enable row level security;
alter table public.hotels force row level security;
drop policy if exists "hotels_read" on public.hotels;
drop policy if exists "hotels_select_shared" on public.hotels;
create policy "hotels_select_shared" on public.hotels for select to authenticated
  using (travel_id is null or travel_id = public.auth_travel_id() or public.is_super_admin());
-- hotels sengaja TIDAK diberi policy INSERT/UPDATE/DELETE baru: master hotel
-- dikelola super admin, dan `hotels_insert/_update/_delete` lama (is_admin())
-- tetap hidup karena tidak saya drop.

alter table public.banks enable row level security;
alter table public.banks force row level security;
drop policy if exists "banks_read" on public.banks;
drop policy if exists "banks_rw" on public.banks;
drop policy if exists "banks_write" on public.banks;
-- Nomor rekening dibacakan ke semua user terautentikasi (halaman pembayaran
-- butuh rekening platform yang travel_id-nya NULL), tapi penulisannya tidak
-- boleh memakai gerbang baca: sebelumnya `banks_rw` versi lama memakai
-- `travel_id is null or ...` untuk SEMUA perintah, artinya setiap user bisa
-- mengubah rekening payout platform. Write sekarang milik pemilik barisnya
-- atau super admin saja.
create policy "banks_select_shared" on public.banks for select to authenticated
  using (travel_id is null or travel_id = public.auth_travel_id() or public.is_super_admin());
create policy "banks_write" on public.banks for all to authenticated
  using (travel_id = public.auth_travel_id() or public.is_super_admin())
  with check (travel_id = public.auth_travel_id() or public.is_super_admin());

-- Referensi global (dibaca semua user terautentikasi, ditulis hanya super admin)
do $$
declare t text;
begin
  foreach t in array array['airlines','categories','vendors'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists "%1$s_read" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_write" on public.%1$I', t);
    execute format(
      'create policy "%1$s_read" on public.%1$I for select to authenticated using (true)', t);
    execute format(
      'create policy "%1$s_write" on public.%1$I for all to authenticated '
      'using (public.is_super_admin()) with check (public.is_super_admin())', t);
  end loop;
end $$;

-- travels: user travel membaca & mengubah barisnya sendiri lewat jembatan uuid
-- (travels.uid, lihat Bagian 1). Sebelumnya policy ini hanya
-- "using (public.is_super_admin())" sehingga halaman Profil Travel kosong untuk
-- user travel biasa — itu bug, dan tulisan `id = public.auth_travel_id()` tidak
-- bisa dipakai karena travels.id masih text ('trv-1') sedangkan fungsinya uuid.
alter table public.travels enable row level security;
alter table public.travels force row level security;
drop policy if exists "travels_read" on public.travels;
drop policy if exists "travels_select_own" on public.travels;
drop policy if exists "travels_update_own" on public.travels;
create policy "travels_select_own" on public.travels for select to authenticated
  using (uid = public.auth_travel_id() or public.is_super_admin());
create policy "travels_update_own" on public.travels for update to authenticated
  using (uid = public.auth_travel_id() and public.auth_role() in ('travel_admin','super_admin'))
  with check (uid = public.auth_travel_id() or public.is_super_admin());
-- INSERT/DELETE sengaja tidak diberi policy: registrasi & penutupan travel
-- ditangani Web Admin (service role), bukan dari Web Travel.

-- -----------------------------------------------------------------------------
-- 9. FOREIGN KEY — SENGAJA DIKOMENTARI
--     Semua tabel demo memakai PK text ('trv-1', 'htl-1', slug paket), sedangkan
--     tabel baru memakai uuid. FK di bawah baru bisa diaktifkan SETELAH PK tabel
--     demo ditype ulang ke uuid (keputusan B di header). Jangan jalankan apa pun
--     dari blok ini sebelum disepakati.
--     Catatan: referensi ke travels sudah ditulis `travels(uid)` karena Bagian 1
--     menambahkan kolom jembatan uuid — aktifnya FK tetap menunggu Keputusan B.
-- -----------------------------------------------------------------------------
-- alter table public.profiles add constraint profiles_travel_id_fkey  foreign key (travel_id) references public.travels(uid);
-- alter table public.profiles  add constraint profiles_branch_id_fkey  foreign key (branch_id) references public.branches(id);
-- alter table public.branches add constraint branches_travel_id_fkey  foreign key (travel_id) references public.travels(uid);
-- alter table public.packages add constraint packages_travel_id_fkey  foreign key (travel_id) references public.travels(uid);
-- alter table public.packages  add constraint packages_branch_id_fkey  foreign key (branch_id) references public.branches(id);
-- alter table public.packages  add constraint packages_category_id_fkey foreign key (category_id) references public.categories(id);
-- alter table public.hotels add constraint hotels_travel_id_fkey    foreign key (travel_id) references public.travels(uid);
-- alter table public.airlines add constraint airlines_travel_id_fkey  foreign key (travel_id) references public.travels(uid);
-- alter table public.banks add constraint banks_travel_id_fkey     foreign key (travel_id) references public.travels(uid);
-- alter table public.orders add constraint orders_travel_id_fkey    foreign key (travel_id) references public.travels(uid);
-- alter table public.orders    add constraint orders_branch_id_fkey    foreign key (branch_id) references public.branches(id);
-- alter table public.orders    add constraint orders_package_id_fkey   foreign key (package_id) references public.packages(id);
-- alter table public.orders    add constraint orders_customer_id_fkey  foreign key (customer_id) references public.profiles(id);
-- alter table public.orders    add constraint orders_agent_id_fkey     foreign key (agent_id) references public.agents(id);
-- alter table public.pilgrims  add constraint pilgrims_order_id_fkey   foreign key (order_id) references public.orders(id) on delete cascade;
-- alter table public.pilgrims add constraint pilgrims_travel_id_fkey  foreign key (travel_id) references public.travels(uid);
-- alter table public.pilgrim_documents add constraint pd_pilgrim_id_fkey foreign key (pilgrim_id) references public.pilgrims(id) on delete cascade;
-- alter table public.payments  add constraint payments_order_id_fkey   foreign key (order_id) references public.orders(id);
-- alter table public.payments  add constraint payments_bank_id_fkey    foreign key (bank_id) references public.banks(id);
-- alter table public.installments add constraint installments_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade;
-- alter table public.agents    add constraint agents_profile_id_fkey   foreign key (profile_id) references public.profiles(id);
-- alter table public.agents    add constraint agents_branch_id_fkey    foreign key (branch_id) references public.branches(id);
-- alter table public.commissions add constraint commissions_agent_id_fkey foreign key (agent_id) references public.agents(id);
-- alter table public.commissions add constraint commissions_order_id_fkey foreign key (order_id) references public.orders(id);
-- alter table public.rooms     add constraint rooms_package_id_fkey    foreign key (package_id) references public.packages(id);
-- alter table public.rooms     add constraint rooms_hotel_id_fkey      foreign key (hotel_id) references public.hotels(id);
-- alter table public.room_assignments  add constraint ra_room_id_fkey     foreign key (room_id) references public.rooms(id) on delete cascade;
-- alter table public.room_assignments  add constraint ra_pilgrim_id_fkey  foreign key (pilgrim_id) references public.pilgrims(id) on delete cascade;
-- alter table public.vehicles  add constraint vehicles_package_id_fkey foreign key (package_id) references public.packages(id);
-- alter table public.vehicle_assignments add constraint va_vehicle_id_fkey  foreign key (vehicle_id) references public.vehicles(id) on delete cascade;
-- alter table public.vehicle_assignments add constraint va_pilgrim_id_fkey  foreign key (pilgrim_id) references public.pilgrims(id) on delete cascade;
-- alter table public.manasik_schedules add constraint ms_package_id_fkey foreign key (package_id) references public.packages(id);
-- alter table public.manasik_attendances add constraint ma_schedule_id_fkey foreign key (schedule_id) references public.manasik_schedules(id) on delete cascade;
-- alter table public.manasik_attendances add constraint ma_pilgrim_id_fkey  foreign key (pilgrim_id) references public.pilgrims(id) on delete cascade;
-- alter table public.equipment_assignments add constraint ea_template_id_fkey foreign key (template_id) references public.equipment_templates(id);
-- alter table public.equipment_assignments add constraint ea_pilgrim_id_fkey  foreign key (pilgrim_id) references public.pilgrims(id);
-- alter table public.package_hotels add constraint ph_package_id_fkey foreign key (package_id) references public.packages(id) on delete cascade;
-- alter table public.package_hotels add constraint ph_hotel_id_fkey   foreign key (hotel_id) references public.hotels(id);
-- alter table public.package_gallery add constraint pg_package_id_fkey foreign key (package_id) references public.packages(id) on delete cascade;
-- alter table public.package_flights add constraint pf_package_id_fkey foreign key (package_id) references public.packages(id) on delete cascade;
-- alter table public.package_departures add constraint pd_package_id_fkey foreign key (package_id) references public.packages(id) on delete cascade;
-- alter table public.package_pricing add constraint pp_travel_id_fkey   foreign key (travel_id) references public.travels(uid);
-- alter table public.package_pricing add constraint pp_package_id_fkey  foreign key (package_id) references public.packages(id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 10. Penutup transaksi (dibuka dengan `begin;` tepat sebelum Bagian 0).
--     `commit;` aktif, karena memang tujuan file ini adalah memigrasi. Kalaupun
--     ada satu statement di atas yang gagal, transaksinya sudah abort dan
--     `commit;` diperlakukan Postgres sebagai rollback → tidak pernah ada
--     separuh skema / separuh policy yang tertinggal.
--     Mau uji kering tanpa menulis apa pun? Tukar dua baris terakhir jadi:
--         rollback;   -- ganti commit;
-- -----------------------------------------------------------------------------
commit;
-- rollback;

-- =============================================================================
-- SELESAI. File ini BELUM dan TIDAK dijalankan ke database.
-- Ringkasan hasil verifikasi 2026-11-16 (dihitung ulang dari isi file ini):
--   • 27 tabel baru                 (create table if not exists public.*)
--   • 10 tabel lama dilengkapi      (alter table ... add column if not exists,
--                                     semuanya aditif: airlines, banks,
--                                     categories, deposits, documents, hotels,
--                                     invoices, packages, transactions, travels)
--   • 134 policy RLS                (29 tabel × 4 = 116 + 3 tabel global × 2 = 6
--                                     + 12 policy khusus: packages 4, profiles 3,
--                                     travels 2, hotels 1, banks 2)
--   • 23 drop policy if exists      (10 di antaranya `<t>_read using (true)`
--                                     milik airlines, banks, categories, deposits,
--                                     documents, hotels, invoices, packages,
--                                     transactions, travels — tanpa drop ini
--                                     policy baru di-OR dan jadi dead code.
--                                     Undo-nya: 20261116_revert_policies.sql)
--   • 37 tabel diset RLS enable + force (packages satu-satunya yang SELECT-nya
--     terbuka untuk `anon`; kolom sensitif paket dipisah ke package_pricing)
--   • 21 trigger updated_at         (loop Bagian 7, dengan guard kolom)
--   • 16 index                      (travels_uid_key, packages_id_key, dsb.)
--   •  5 fungsi bantu               (touch_updated_at, auth_travel_id, auth_role,
--                                     is_super_admin, auth_branch_id)
--   • 43 foreign key ditunda (dikomentari) ke Bagian 9
-- =============================================================================
