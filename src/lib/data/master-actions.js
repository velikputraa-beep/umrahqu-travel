"use server";

import {
  MAX_PANJANG,
  angka,
  pesanError,
  recordScope,
  teks,
  toast,
} from "@/lib/data/record-scope";
import {
  AGEN_LIST_PATH,
  HOTEL_LIST_PATH,
} from "@/lib/data/record-fields";

function bacaHotel(formData) {
  const bintang = Number(teks(formData, "bintang", 2));
  const status = teks(formData, "status", 20);
  return {
    idLama: teks(formData, "idLama", 40),
    nama: teks(formData, "nama", 120),
    kota: teks(formData, "kota", 60),
    bintang: Number.isFinite(bintang) && bintang >= 1 && bintang <= 5 ? bintang : null,
    jarak: teks(formData, "jarak", 120),
    alamat: teks(formData, "alamat", MAX_PANJANG),
    mitra: teks(formData, "mitra", 60),
    status: status === "Nonaktif" ? "Nonaktif" : "Aktif",
  };
}

function pesanHotelRls(error) {
  // Policy tulis `hotels` di database lama masih `is_admin()` (khusus dashboard
  // super admin), jadi travel mendapat 42501 walaupun barisnya miliknya.
  if (error?.code === "42501") {
    return "Tabel hotel masih dikunci aturan RLS lama: hanya super admin yang boleh menulis di sana. Jalankan migrasi supabase/migrations/20261117_hotels_travel_write.sql lewat SQL Editor supaya travel bisa menambah dan mengubah hotel sendiri.";
  }
  return pesanError(error);
}

/**
 * Tambah/ubah hotel. Baris baru selalu tercatat atas nama travel penulis,
 * karena master hotel platform (travel_id NULL) hanya boleh diubah super admin.
 */
export async function saveHotel(formData) {  const s = await recordScope();
  if (s.error) return { error: s.error };
  const f = bacaHotel(formData);
  if (!f.nama) return { error: "Nama hotel wajib diisi." };

  const now = new Date().toISOString();
  const payload = {
    nama: f.nama,
    kota: f.kota || null,
    bintang: f.bintang,
    jarak: f.jarak || null,
    alamat: f.alamat || null,
    mitra: f.mitra || null,
    status: f.status,
    // `is_active` dipakai query lain (mis. pilihan hotel paket); dijaga tetap
    // sinkron dengan label status yang dipilih di form.
    is_active: f.status !== "Nonaktif",
    updated_at: now,
  };

  if (f.idLama) {
    const { data: milik } = await s.supabase
      .from("hotels")
      .select("id, travel_id")
      .eq("id", f.idLama)
      .maybeSingle();
    if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
      return {
        error:
          "Hotel ini adalah master platform atau milik travel lain — tidak bisa diubah dari halaman ini.",
      };
    }
    const { error } = await s.supabase
      .from("hotels")
      .update(payload)
      .eq("id", f.idLama);
    if (error) return { error: pesanHotelRls(error) };
    toast(HOTEL_LIST_PATH, "hotel-ubah");
  }

  const { error } = await s.supabase
    .from("hotels")
    // Kolom `id` pada `hotels` tidak punya default gen_random_uuid(), jadi
    // uuid-nya dibangkitkan di sini seperti pada packages/pilgrims/orders.
    .insert({ ...payload, id: crypto.randomUUID(), travel_id: s.travelId });
  if (error) return { error: pesanHotelRls(error) };
  toast(HOTEL_LIST_PATH, "hotel-baru");
}

export async function deleteHotel(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const id = teks(formData, "idLama", 40);
  if (!id) return { error: "Hotel tidak dikenali." };

  const { data: milik } = await s.supabase
    .from("hotels")
    .select("id, travel_id")
    .eq("id", id)
    .maybeSingle();
  if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
    return {
      error:
        milik?.travel_id === null
          ? "Master platform tidak bisa dihapus dari halaman travel."
          : "Hotel tidak ditemukan atau bukan milik travel Anda.",
    };
  }

  // Soft delete: riwayat paket yang memakai hotel ini tetap bisa dibaca.
  const { error } = await s.supabase
    .from("hotels")
    .update({ deleted_at: new Date().toISOString(), status: "Nonaktif" })
    .eq("id", id);
  if (error) return { error: pesanError(error) };
  toast(HOTEL_LIST_PATH, "hotel-hapus");
}

function bacaAgen(formData) {
  const komisi = angka(formData, "komisi");
  const status = teks(formData, "status", 20);
  const trigger = teks(formData, "trigger", 20);
  return {
    idLama: teks(formData, "idLama", 40),
    nama: teks(formData, "nama", 120),
    kontak: teks(formData, "kontak", 40),
    referral: teks(formData, "referral", 40),
    komisi: komisi === null || komisi < 0 ? 0 : Math.round(komisi),
    trigger: ["dp", "pelunasan", "manual"].includes(trigger) ? trigger : "pelunasan",
    aktif: status !== "nonaktif",
    catatan: teks(formData, "catatan", MAX_PANJANG),
  };
}

export async function saveAgent(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const f = bacaAgen(formData);
  if (!f.nama) return { error: "Nama agen wajib diisi." };
  if (!f.kontak) return { error: "Kontak agen (no. HP/email) wajib diisi." };

  const now = new Date().toISOString();
  const payload = {
    name: f.nama,
    phone: f.kontak,
    referral_code: f.referral ? f.referral.toUpperCase() : null,
    commission_amount: f.komisi,
    commission_trigger: f.trigger,
    is_active: f.aktif,
    notes: f.catatan || null,
    updated_at: now,
  };

  if (f.idLama) {
    const { data: milik } = await s.supabase
      .from("agents")
      .select("id, travel_id")
      .eq("id", f.idLama)
      .maybeSingle();
    if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
      return { error: "Agen tidak ditemukan atau bukan milik travel Anda." };
    }
    const { error } = await s.supabase
      .from("agents")
      .update(payload)
      .eq("id", f.idLama);
    if (error) return { error: pesanError(error) };
    toast(AGEN_LIST_PATH, "agen-ubah");
  }

  const { error } = await s.supabase
    .from("agents")
    .insert({ ...payload, travel_id: s.travelId });
  if (error) return { error: pesanError(error) };
  toast(AGEN_LIST_PATH, "agen-baru");
}

export async function deleteAgent(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const id = teks(formData, "idLama", 40);
  if (!id) return { error: "Agen tidak dikenali." };

  // UPDATE yang tidak menemukan baris (karena RLS menyaringnya) mengembalikan
  // 200 tanpa error, jadi kepemilikan dicek dulu supaya toast tidak bohong.
  const { data: milik } = await s.supabase
    .from("agents")
    .select("id, travel_id")
    .eq("id", id)
    .maybeSingle();
  if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
    return { error: "Agen tidak ditemukan atau bukan milik travel Anda." };
  }

  const { error } = await s.supabase
    .from("agents")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) return { error: pesanError(error) };
  toast(AGEN_LIST_PATH, "agen-hapus");
}
