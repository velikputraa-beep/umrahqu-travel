"use server";

import {
  MAX_PANJANG,
  booleanYa,
  pesanError,
  recordScope,
  teks,
  toast,
} from "@/lib/data/record-scope";
import {
  CABANG_LIST_PATH,
  PROFIL_PATH,
} from "@/lib/data/record-fields";
import { PROFIL_BISA_DIUBAH } from "@/lib/data/pengaturan";

/**
 * Profil travel menulis baris `travels` milik sendiri (kunci `uid`).
 * Policy `travels_update_own` hanya mengizinkan travel_admin/super_admin, jadi
 * guard role di sini menjaga pesan error tetap manusiawi alih-alih 42501.
 */
export async function saveProfil(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  if (!PROFIL_BISA_DIUBAH.includes(String(s.role ?? ""))) {
    return {
      error:
        "Hanya Admin Travel yang bisa mengubah profil travel. Minta perubahan ke admin Anda.",
    };
  }

  const nama = teks(formData, "nama", 120);
  if (!nama) return { error: "Nama travel wajib diisi." };

  const { error } = await s.supabase
    .from("travels")
    .update({
      nama,
      contact_email: teks(formData, "email", 120) || null,
      contact_phone: teks(formData, "telepon", 40) || null,
      alamatDetail: teks(formData, "alamat", MAX_PANJANG) || null,
      alamatKota: teks(formData, "kota", MAX_PANJANG) || null,
      logo_url: teks(formData, "logo", 500) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("uid", s.travelId);
  if (error) return { error: pesanError(error) };
  toast(PROFIL_PATH, "profil-ubah");
}

function bacaCabang(formData) {
  return {
    idLama: teks(formData, "idLama", 40),
    nama: teks(formData, "nama", 120),
    kota: teks(formData, "kota", 60),
    telepon: teks(formData, "telepon", 40),
    alamat: teks(formData, "alamat", MAX_PANJANG),
    aktif: teks(formData, "status", 20) !== "nonaktif",
    utama: booleanYa(formData, "utama"),
  };
}

export async function saveCabang(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const f = bacaCabang(formData);
  if (!f.nama) return { error: "Nama cabang wajib diisi." };

  const now = new Date().toISOString();
  const payload = {
    name: f.nama,
    city: f.kota || null,
    phone: f.telepon || null,
    address: f.alamat || null,
    is_active: f.aktif,
    is_primary: f.utama,
    updated_at: now,
  };

  if (f.idLama) {
    const { data: milik } = await s.supabase
      .from("branches")
      .select("id, travel_id")
      .eq("id", f.idLama)
      .maybeSingle();
    if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
      return { error: "Cabang tidak ditemukan atau bukan milik travel Anda." };
    }
    const { error } = await s.supabase
      .from("branches")
      .update(payload)
      .eq("id", f.idLama);
    if (error) return { error: pesanError(error) };
    toast(CABANG_LIST_PATH, "cabang-ubah");
  }

  const { error } = await s.supabase
    .from("branches")
    .insert({ ...payload, travel_id: s.travelId });
  if (error) return { error: pesanError(error) };
  toast(CABANG_LIST_PATH, "cabang-baru");
}

export async function deleteCabang(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const id = teks(formData, "idLama", 40);
  if (!id) return { error: "Cabang tidak dikenali." };

  // UPDATE/DELETE yang barisnya tersaring RLS mengembalikan 200 tanpa error,
  // jadi kepemilikan dicek dulu supaya toast tidak bohong.
  const { data: milik } = await s.supabase
    .from("branches")
    .select("id, travel_id")
    .eq("id", id)
    .maybeSingle();
  if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
    return { error: "Cabang tidak ditemukan atau bukan milik travel Anda." };
  }

  // Soft delete: riwayat pesanan/jamaah yang menunjuk cabang ini tetap terbaca.
  const { error } = await s.supabase
    .from("branches")
    .update({ deleted_at: new Date().toISOString(), is_active: false, is_primary: false })
    .eq("id", id);
  if (error) return { error: pesanError(error) };
  toast(CABANG_LIST_PATH, "cabang-hapus");
}
