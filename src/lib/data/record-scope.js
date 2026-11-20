import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTravelContext } from "@/lib/auth/session";

// Helper bersama modul master data / keberangkatan / pengaturan. Sengaja
// berada di file biasa (bukan "use server") karena file "use server" hanya
// boleh mengekspor fungsi async.

export function pesanError(error) {
  if (error?.code === "23505") {
    return "Data dengan nama/kode itu sudah ada. Gunakan nama lain.";
  }
  if (error?.code === "23503") {
    return "Data terkait sudah tidak ada di database (mungkin baru dihapus). Muat ulang halaman lalu coba lagi.";
  }
  if (error?.code === "42501") {
    return "Database menolak perubahan ini karena aturan hak akses (RLS). Baris tersebut bukan milik travel Anda.";
  }
  if (error?.code === "22P02") {
    return "Format salah satu isian tidak diterima database. Periksa angka dan tanggalnya.";
  }
  return error?.message
    ? `Database menolak penyimpanan: ${error.message}`
    : "Terjadi kesalahan tak terduga.";
}

// Semua tulis memakai sesi user (cookie), supaya RLS yang membatasi travel —
// tanpa itu travel A bisa menulis data travel B.
export async function recordScope() {
  const ctx = await getTravelContext();
  if (!ctx?.profile) return { error: "Sesi tidak dikenali. Silakan masuk kembali." };
  const travelId = ctx.profile.travel_id ?? null;
  if (!travelId) {
    return {
      error:
        "Akun Anda belum ditautkan ke travel mana pun, jadi belum bisa menyimpan data.",
    };
  }
  return {
    supabase: await createClient(),
    travelId,
    travelName: ctx.travelName ?? null,
    role: ctx.profile.role ?? null,
    isSuperAdmin: ctx.profile.role === "super_admin",
  };
}

// Cakupan baca untuk Server Component: sama seperti recordScope, tapi tanpa
// error keras (halaman daftar menampilkan empty state).
export async function readScope(ctx) {
  const supabase = await createClient();
  const travelId = ctx?.profile?.travel_id ?? null;
  return {
    supabase,
    travelId,
    travelName: ctx?.travelName ?? null,
    isSuperAdmin: ctx?.profile?.role === "super_admin",
  };
}

export function scoped(builder, s, column = "travel_id") {
  return s.isSuperAdmin || !s.travelId ? builder : builder.eq(column, s.travelId);
}

export function toast(path, kind) {
  // `t` membuat URL redirect selalu unik agar halaman daftar men-remount
  // ToastMessage; tanpa itu redirect kedua ke toast yang sama tidak
  // menampilkan apa pun. Halaman manifest memakai `?paket=` untuk pilihan
  // paket, jadi pemisahnya harus `&` kalau path sudah punya query string.
  const pemisah = path.includes("?") ? "&" : "?";
  redirect(`${path}${pemisah}toast=${kind}&t=${Date.now()}`);
}

export const MAX_PANJANG = 160;

export function teks(formData, name, max = MAX_PANJANG) {
  const nilai = String(formData.get(name) ?? "").trim();
  return nilai.length > max ? nilai.slice(0, max) : nilai;
}

export function angka(formData, name) {
  const mentah = String(formData.get(name) ?? "").replace(/[^0-9.-]/g, "");
  const nilai = Number(mentah);
  return Number.isFinite(nilai) ? nilai : null;
}

export function tanggal(formData, name) {
  const mentah = teks(formData, name, 10);
  // Hanya terima yyyy-mm-dd; isian lain dianggap kosong supaya CHECK/date
  // column tidak menolak seluruh baris.
  return /^\d{4}-\d{2}-\d{2}$/.test(mentah) ? mentah : null;
}

export function booleanYa(formData, name) {
  return String(formData.get(name) ?? "") === "ya";
}
