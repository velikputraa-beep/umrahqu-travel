-- MODUL 3 (CRUD Paket Umrah): soft delete paket.
--
-- MASALAH (dibuktikan dengan uji PATCH langsung sebagai role `authenticated`):
-- `packages` punya policy katalog `packages_select_public using (deleted_at is null)`.
-- Di Postgres, UPDATE yang membuat barisnya TIDAK LAGI lolos policy SELECT ikut
-- ditolak dengan `42501 new row violates row-level security policy` — jadi
-- `update packages set deleted_at = now()` tidak mungkin dijalankan travel
-- pemiliknya sendiri, padahal itu justru satu-satunya cara soft delete.
--
-- KEPUTUSAN: policy TIDAK diubah sama sekali (aturan proyek: RLS tidak dilonggarkan,
-- katalog paket harus tetap tertutup untuk anon setelah dihapus). Sebagai gantinya
-- satu fungsi penjaga yang cek kepemilikan travel sendiri di dalam body-nya.
--
-- AMAN:
--  * `security definer` memang dibutuhkan untuk melewati cek SELECT di atas,
--    karena itu body-nya wajib menyaring sendiri: `auth.uid()`, travel pemilik,
--    dan super admin.
--  * EXECUTE dicabut dari `public`/`anon` dan hanya diberikan ke `authenticated`,
--    jadi fungsi ini bukan endpoint publik.
--  * Hanya bisa mengubah baris dengan slug yang belum terhapus DAN travel_id =
--    travel pemanggil (atau super admin).

create or replace function public.soft_delete_package(p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_travel uuid;
begin
  if auth.uid() is null then
    return 'auth';
  end if;

  select travel_id
    into v_travel
    from public.packages
   where slug = p_slug
     and deleted_at is null;

  if not found then
    return 'not_found';
  end if;

  if v_travel is distinct from public.auth_travel_id()
     and not public.is_super_admin() then
    return 'forbidden';
  end if;

  update public.packages
     set deleted_at = now(),
         updated_at = now()
   where slug = p_slug;

  return 'ok';
end $$;

revoke execute on function public.soft_delete_package(text) from public, anon;
grant execute on function public.soft_delete_package(text) to authenticated;

comment on function public.soft_delete_package(text) is
  'Soft delete paket milik travel pemanggil (deleted_at = now()). Diganti dari '
  'UPDATE polos karena policy katalog packages_select_public menolak baris yang '
  'deleted_at-nya terisi.';
