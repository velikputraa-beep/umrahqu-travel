"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTravelContext } from "@/lib/auth/session";
import { formatRupiah, parseRupiah } from "@/lib/data/dashboard";
import { PACKAGE_LIST_PATH, slugify } from "@/lib/data/package-fields";

function pesanError(error) {
  if (error?.code === "23505") return "Slug paket sudah dipakai, silakan simpan lagi.";
  return error?.message ? `Database menolak penyimpanan: ${error.message}` : "Terjadi kesalahan tak terduga.";
}

// `t` membuat URL redirect selalu unik agar halaman daftar men-remount
// ToastMessage; tanpa itu redirect kedua ke toast yang sama tidak menampilkan
// apa pun karena state toast sudah kedaluwarsa.
function redirectToast(kind) {
  redirect(`${PACKAGE_LIST_PATH}?toast=${kind}&t=${Date.now()}`);
}

// Semua tulis lewat sesi pengguna (cookie), jadi RLS packages_insert/update/delete
// yang membatasi travel — tanpa itu travel A bisa menulis travel B.
async function writeScope() {
  const ctx = await getTravelContext();
  if (!ctx?.profile) return { error: "Sesi tidak dikenali. Silakan masuk kembali." };
  const travelId = ctx.profile.travel_id ?? null;
  if (!travelId) {
    return { error: "Akun Anda belum ditautkan ke travel mana pun, jadi belum bisa menyimpan paket." };
  }
  return {
    supabase: await createClient(),
    travelId,
    travelName: ctx.travelName ?? null,
  };
}

// Nama hotel disimpan di package_hotels.hotel_name + packages.includes (jsonb),
// karena hotels.id bertipe text sedangkan package_hotels.hotel_id bertipe uuid.
async function syncChildren(supabase, { packageId, travelId, hotel, maskapai }) {
  if (!packageId) return;
  await supabase.from("package_hotels").delete().eq("package_id", packageId);
  if (hotel) {
    await supabase
      .from("package_hotels")
      .insert({ travel_id: travelId, package_id: packageId, hotel_name: hotel, sequence: 1 });
  }
  await supabase.from("package_flights").delete().eq("package_id", packageId);
  if (maskapai) {
    await supabase
      .from("package_flights")
      .insert({
        travel_id: travelId,
        package_id: packageId,
        airline_name: maskapai,
        segment: "keberangkatan",
        sequence: 1,
      });
  }
}

function bacaField(formData) {
  const teks = (name) => String(formData.get(name) ?? "").trim();
  const durasi = Number.parseInt(teks("durasi"), 10);
  return {
    nama: teks("nama"),
    slugLama: teks("slugLama"),
    status: teks("status") || "Menunggu",
    hotel: teks("hotel"),
    maskapai: teks("maskapai"),
    deskripsi: teks("description"),
    durasi: Number.isFinite(durasi) ? durasi : null,
    harga: parseRupiah(teks("biaya")),
  };
}

export async function savePackage(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };
  const { supabase, travelId, travelName } = s;
  const f = bacaField(formData);

  if (!f.nama) return { error: "Nama paket wajib diisi." };
  if (!f.harga) return { error: "Harga paket wajib diisi dengan angka." };

  const now = new Date().toISOString();

  if (f.slugLama) {
    const { data: existing, error: findError } = await supabase
      .from("packages")
      .select("id, travel_id")
      .eq("slug", f.slugLama)
      .is("deleted_at", null)
      .maybeSingle();
    if (findError) return { error: pesanError(findError) };
    if (!existing || existing.travel_id !== travelId) {
      return { error: "Paket tidak ditemukan atau bukan milik travel Anda." };
    }

    const payload = {
      nama: f.nama,
      biaya: formatRupiah(f.harga),
      status: f.status,
      duration_nights: f.durasi,
      description: f.deskripsi || null,
      includes: f.hotel ? [f.hotel] : [],
      updated_at: now,
    };
    // Baris lama tanpa id uuid tidak bisa ditautkan ke package_hotels/flights.
    if (!existing.id) payload.id = crypto.randomUUID();

    const { error } = await supabase.from("packages").update(payload).eq("slug", f.slugLama);
    if (error) return { error: pesanError(error) };

    const packageId = existing.id ?? payload.id;
    await syncChildren(supabase, {
      packageId,
      travelId,
      hotel: f.hotel,
      maskapai: f.maskapai,
    });
    redirectToast("ubah");
  }

  const packageId = crypto.randomUUID();
  const baseSlug = slugify(f.nama) || "paket";
  const payload = {
    id: packageId,
    slug: baseSlug,
    nama: f.nama,
    travel: travelName,
    travel_id: travelId,
    biaya: formatRupiah(f.harga),
    status: f.status,
    duration_nights: f.durasi,
    description: f.deskripsi || null,
    includes: f.hotel ? [f.hotel] : [],
    created_at: now,
    updated_at: now,
  };

  let result = await supabase.from("packages").insert(payload);
  if (result.error?.code === "23505") {
    // Slug paket yang sudah di-soft-delete tidak terlihat oleh RLS SELECT,
    // jadi tabrakannya baru diketahui saat insert: ulangi sekali dengan penanda unik.
    payload.slug = `${baseSlug}-${Date.now().toString(36)}`;
    result = await supabase.from("packages").insert(payload);
  }
  if (result.error) return { error: pesanError(result.error) };

  await syncChildren(supabase, {
    packageId,
    travelId,
    hotel: f.hotel,
    maskapai: f.maskapai,
  });
  redirectToast("baru");
}

const PESAN_RPC = {
  forbidden: "Anda hanya bisa menghapus paket travel Anda sendiri.",
  not_found: "Paket tidak ditemukan (mungkin sudah dihapus).",
  auth: "Sesi tidak dikenali. Silakan masuk kembali.",
};

// Soft delete lewat RPC karena policy packages_select_public menyaring
// `deleted_at is null`: UPDATE biasa ditolak RLS (42501) saat baris hasil
// update tidak lagi lolos SELECT policy. RPC-nya sendiri memeriksa travel_id
// pemanggil, jadi RLS tetap tidak dilonggarkan.
export async function deletePackage(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };
  const { supabase } = s;
  const slug = String(formData.get("slugLama") ?? "").trim();
  if (!slug) return { error: "Paket tidak dikenali." };

  const { data: existing } = await supabase.from("packages").select("id").eq("slug", slug).maybeSingle();

  const { data: hasil, error } = await supabase.rpc("soft_delete_package", { p_slug: slug });
  if (error) return { error: pesanError(error) };
  if (hasil !== "ok") return { error: PESAN_RPC[hasil] ?? "Paket gagal dihapus." };

  if (existing?.id) {
    await supabase.from("package_hotels").delete().eq("package_id", existing.id);
    await supabase.from("package_flights").delete().eq("package_id", existing.id);
  }
  redirectToast("hapus");
}
