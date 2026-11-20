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
  MANASIK_LIST_PATH,
  MANIFEST_LIST_PATH,
  PERLENGKAPAN_LIST_PATH,
} from "@/lib/data/record-fields";

const MANASIK_STATUS_VALUES = ["scheduled", "ongoing", "done", "cancelled"];
const PERLENGKAPAN_STATUS_VALUES = ["not_delivered", "delivered", "returned"];

function bacaManasik(formData) {
  const status = teks(formData, "status", 20);
  return {
    idLama: teks(formData, "idLama", 40),
    judul: teks(formData, "judul", 160),
    tanggal: teks(formData, "tanggal", 10),
    jamMulai: /^\d{2}:\d{2}$/.test(teks(formData, "jamMulai", 8))
      ? teks(formData, "jamMulai", 8)
      : null,
    lokasi: teks(formData, "lokasi", MAX_PANJANG),
    paket: teks(formData, "paket", 40),
    deskripsi: teks(formData, "deskripsi", 1000),
    status: MANASIK_STATUS_VALUES.includes(status) ? status : "scheduled",
  };
}

export async function saveManasik(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const f = bacaManasik(formData);
  if (!f.judul) return { error: "Judul kegiatan manasik wajib diisi." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.tanggal)) {
    return { error: "Tanggal manasik wajib diisi (format yyyy-mm-dd)." };
  }

  const payload = {
    title: f.judul,
    event_date: f.tanggal,
    start_time: f.jamMulai,
    location: f.lokasi || null,
    package_id: f.paket || null,
    description: f.deskripsi || null,
    status: f.status,
    updated_at: new Date().toISOString(),
  };

  if (f.idLama) {
    const { data: milik } = await s.supabase
      .from("manasik_schedules")
      .select("id, travel_id")
      .eq("id", f.idLama)
      .maybeSingle();
    if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
      return { error: "Jadwal tidak ditemukan atau bukan milik travel Anda." };
    }
    const { error } = await s.supabase
      .from("manasik_schedules")
      .update(payload)
      .eq("id", f.idLama);
    if (error) return { error: pesanError(error) };
    toast(MANASIK_LIST_PATH, "manasik-ubah");
  }

  const { error } = await s.supabase
    .from("manasik_schedules")
    .insert({ ...payload, travel_id: s.travelId });
  if (error) return { error: pesanError(error) };
  toast(MANASIK_LIST_PATH, "manasik-baru");
}

export async function deleteManasik(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const id = teks(formData, "idLama", 40);
  if (!id) return { error: "Jadwal tidak dikenali." };

  const { data: milik } = await s.supabase
    .from("manasik_schedules")
    .select("id, travel_id")
    .eq("id", id)
    .maybeSingle();
  if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
    return { error: "Jadwal tidak ditemukan atau bukan milik travel Anda." };
  }

  // `manasik_schedules` tidak punya deleted_at, jadi hapus langsung.
  const { error } = await s.supabase
    .from("manasik_schedules")
    .delete()
    .eq("id", id);
  if (error) return { error: pesanError(error) };
  toast(MANASIK_LIST_PATH, "manasik-hapus");
}

/**
 * MODUL 8: kamar = rooms + room_assignments, kursi = pilgrims.seat_preference.
 * Keduanya kolom/tabel yang sudah ada, jadi tidak perlu migrasi baru.
 */
export async function assignManifest(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };

  const jamaahId = teks(formData, "jamaahId", 40);
  const packageId = teks(formData, "packageId", 40);
  const kamar = teks(formData, "kamar", 20);
  const tempatTidur = teks(formData, "tempatTidur", 10);
  const kursi = teks(formData, "kursi", 10);

  if (!jamaahId) return { error: "Jamaah tidak dikenali." };
  if (!packageId) {
    return {
      error: "Jamaah ini belum ditautkan ke paket mana pun, jadi kamar tidak bisa dialokasikan.",
    };
  }

  const { data: milik } = await s.supabase
    .from("pilgrims")
    .select("id, travel_id, full_name")
    .eq("id", jamaahId)
    .maybeSingle();
  if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
    return { error: "Jamaah tidak ditemukan atau bukan milik travel Anda." };
  }

  let roomId = null;
  if (kamar) {
    const { data: ada } = await s.supabase
      .from("rooms")
      .select("id")
      .eq("package_id", packageId)
      .eq("room_number", kamar)
      .maybeSingle();
    if (ada) {
      roomId = ada.id;
    } else {
      const { data: baru } = await s.supabase
        .from("rooms")
        .insert({ travel_id: s.travelId, package_id: packageId, room_number: kamar })
        .select("id")
        .maybeSingle();
      if (!baru) {
        return { error: "Nomor kamar gagal disiapkan. Periksa apakah nomornya unik untuk paket ini." };
      }
      roomId = baru.id;
    }
  }

  // Satu jamaah hanya boleh menempati satu kamar: assignment lama dilepas dulu.
  const { error: lepas } = await s.supabase
    .from("room_assignments")
    .delete()
    .eq("pilgrim_id", jamaahId);
  if (lepas) return { error: pesanError(lepas) };

  if (roomId) {
    const { error: pasang } = await s.supabase.from("room_assignments").insert({
      travel_id: s.travelId,
      room_id: roomId,
      pilgrim_id: jamaahId,
      bed_label: tempatTidur || null,
    });
    if (pasang) return { error: pesanError(pasang) };
  }

  const { error: ubahKursi } = await s.supabase
    .from("pilgrims")
    .update({ seat_preference: kursi || null })
    .eq("id", jamaahId);
  if (ubahKursi) return { error: pesanError(ubahKursi) };

  toast(`${MANIFEST_LIST_PATH}?paket=${encodeURIComponent(packageId)}`, "manifest-ubah");
}

function bacaPerlengkapan(formData) {
  const status = teks(formData, "status", 20);
  const jumlah = angka(formData, "jumlah");
  return {
    idLama: teks(formData, "idLama", 40),
    jamaah: teks(formData, "jamaah", 40),
    item: teks(formData, "item", 120),
    ukuran: teks(formData, "ukuran", 10),
    jumlah: Number.isFinite(jumlah) && jumlah >= 1 ? Math.min(Math.round(jumlah), 20) : 1,
    status: PERLENGKAPAN_STATUS_VALUES.includes(status) ? status : "not_delivered",
    tanggal: teks(formData, "tanggal", 10),
    catatan: teks(formData, "catatan", MAX_PANJANG),
  };
}

export async function savePerlengkapan(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const f = bacaPerlengkapan(formData);
  if (!f.item) return { error: "Nama item perlengkapan wajib diisi." };

  let packageId = null;
  if (f.jamaah) {
    const { data: jamaah } = await s.supabase
      .from("pilgrims")
      .select("id, package_id, travel_id")
      .eq("id", f.jamaah)
      .maybeSingle();
    if (!jamaah || (!s.isSuperAdmin && jamaah.travel_id !== s.travelId)) {
      return { error: "Jamaah tidak ditemukan atau bukan milik travel Anda." };
    }
    packageId = jamaah.package_id ?? null;
  }

  const payload = {
    item_name: f.item,
    size: f.ukuran || null,
    quantity: f.jumlah,
    status: f.status,
    pilgrim_id: f.jamaah || null,
    package_id: packageId,
    notes: f.catatan || null,
    // `delivered_at` hanya terisi kalau statusnya memang sudah diserahkan.
    delivered_at:
      f.status === "delivered" && /^\d{4}-\d{2}-\d{2}$/.test(f.tanggal)
        ? `${f.tanggal}T12:00:00.000Z`
        : f.status === "delivered"
          ? new Date().toISOString()
          : null,
  };

  if (f.idLama) {
    const { data: milik } = await s.supabase
      .from("equipment_assignments")
      .select("id, travel_id")
      .eq("id", f.idLama)
      .maybeSingle();
    if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
      return { error: "Perlengkapan tidak ditemukan atau bukan milik travel Anda." };
    }
    const { error } = await s.supabase
      .from("equipment_assignments")
      .update(payload)
      .eq("id", f.idLama);
    if (error) return { error: pesanError(error) };
    toast(PERLENGKAPAN_LIST_PATH, "perlengkapan-ubah");
  }

  const { error } = await s.supabase
    .from("equipment_assignments")
    .insert({ ...payload, travel_id: s.travelId });
  if (error) return { error: pesanError(error) };
  toast(PERLENGKAPAN_LIST_PATH, "perlengkapan-baru");
}

export async function deletePerlengkapan(formData) {
  const s = await recordScope();
  if (s.error) return { error: s.error };
  const id = teks(formData, "idLama", 40);
  if (!id) return { error: "Perlengkapan tidak dikenali." };

  const { data: milik } = await s.supabase
    .from("equipment_assignments")
    .select("id, travel_id")
    .eq("id", id)
    .maybeSingle();
  if (!milik || (!s.isSuperAdmin && milik.travel_id !== s.travelId)) {
    return { error: "Perlengkapan tidak ditemukan atau bukan milik travel Anda." };
  }

  const { error } = await s.supabase
    .from("equipment_assignments")
    .delete()
    .eq("id", id);
  if (error) return { error: pesanError(error) };
  toast(PERLENGKAPAN_LIST_PATH, "perlengkapan-hapus");
}
