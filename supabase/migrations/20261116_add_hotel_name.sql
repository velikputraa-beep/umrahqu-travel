-- MODUL 3 (CRUD Paket Umrah): field "hotel" pada form paket.
--
-- `package_hotels.hotel_id` bertipe uuid dan merujuk ke `hotels.id` yang di data
-- demo bertipe text, sehingga hotel tidak bisa ditautkan tanpa normalisasi master
-- data. Sementara itu Web Travel harus bisa menyimpan hotel paket, jadi nama
-- hotel disimpan sebagai teks.
--
-- ADDITIVE saja: tidak ada tabel/kolom yang dibuang, tidak ada policy yang
-- diubah. RLS `package_hotels` tetap travel-scope (Bagian 8 init_schema).

alter table public.package_hotels add column if not exists hotel_name text;

-- Wajib: tanpa ini insert yang hanya mengisi hotel_name gagal constraint NOT NULL.
alter table public.package_hotels alter column hotel_id drop not null;

create index if not exists package_hotels_package_id_idx
  on public.package_hotels (package_id);
