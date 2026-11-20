"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTravelContext } from "@/lib/auth/session";
import { parseRupiah } from "@/lib/data/dashboard";
import {
  PESANAN_LIST_PATH,
  PILGRIM_BARU,
  normalizeOrderStatusInput,
} from "@/lib/data/order-fields";

function pesanError(error) {
  return error?.message
    ? `Database menolak penyimpanan: ${error.message}`
    : "Terjadi kesalahan tak terduga.";
}

function redirectToast(kind) {
  redirect(`${PESANAN_LIST_PATH}?toast=${kind}&t=${Date.now()}`);
}

async function writeScope() {
  const ctx = await getTravelContext();
  if (!ctx?.profile) return { error: "Sesi tidak dikenali. Silakan masuk kembali." };
  const travelId = ctx.profile.travel_id ?? null;
  if (!travelId) {
    return {
      error: "Akun Anda belum ditautkan ke travel mana pun, jadi belum bisa menyimpan pesanan.",
    };
  }
  return {
    supabase: await createClient(),
    travelId,
    userId: ctx.user?.id ?? null,
    isSuperAdmin: ctx.profile.role === "super_admin",
  };
}

// Kode pesanan mengikuti pola web asli: OF-261104D8KS01. `booking_code` punya
// unique index, jadi bagian acaknya dibuat cukup lebar.
function buatKodePesanan() {
  const now = new Date();
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const acak = Array.from({ length: 4 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 33))
  ).join("");
  return `OF-${ymd}${acak}${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
}

function bacaField(formData) {
  const teks = (name) => String(formData.get(name) ?? "").trim();
  return {
    idLama: teks("idLama"),
    packageId: teks("package_id"),
    jamaahId: teks("pilgrim_id"),
    jamaahBaru: teks("pilgrim_baru"),
    tanggal: teks("purchase_date"),
    total: parseRupiah(teks("total_amount")),
    status: normalizeOrderStatusInput(teks("status")),
  };
}

// Kolom bertipe date menerima "YYYY-MM-DD" saja; input type=date sudah
// menghasilkan format itu, tapi nilai dari URL/otomasi tidak selalu valid.
function tanggalValid(nilai) {
  return /^\d{4}-\d{2}-\d{2}$/.test(nilai) ? nilai : null;
}

async function ownedOrder(s, id) {
  if (!id) return { error: "Pesanan tidak dikenali." };
  const { data, error } = await s.supabase
    .from("orders")
    .select("id, travel_id, package_id, paid_amount, pilgrim_count")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { error: pesanError(error) };
  if (!data || (!s.isSuperAdmin && data.travel_id !== s.travelId)) {
    return { error: "Pesanan tidak ditemukan, bukan milik travel Anda, atau merupakan entri lama yang hanya-baca." };
  }
  return { order: data };
}

async function ownedPackage(s, packageId) {
  const { data, error } = await s.supabase
    .from("packages")
    .select("id, travel_id, nama")
    .eq("id", packageId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { error: pesanError(error) };
  // SELECT katalog memang publik (Keputusan D), jadi kepemilikan dicek di sini.
  if (!data || (!s.isSuperAdmin && data.travel_id !== s.travelId)) {
    return { error: "Paket dipilih tidak ditemukan atau bukan paket travel Anda." };
  }
  return { paket: data };
}

// "pilih jamaah (atau bikin jamaah baru)": jamaah baru langsung masuk ke
// `pilgrims` milik travel, meniru savePilgrim di MODUL 4.
async function pastikanJamaah(s, f, orderId, packageId, now) {
  if (f.jamaahId && f.jamaahId !== PILGRIM_BARU) {
    const { data, error } = await s.supabase
      .from("pilgrims")
      .select("id, travel_id")
      .eq("id", f.jamaahId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return { error: pesanError(error) };
    if (!data || (!s.isSuperAdmin && data.travel_id !== s.travelId)) {
      return { error: "Jamaah dipilih tidak ditemukan atau bukan jamaah travel Anda." };
    }
    const { error: linkError } = await s.supabase
      .from("pilgrims")
      .update({ order_id: orderId, updated_at: now })
      .eq("id", f.jamaahId);
    if (linkError) return { error: pesanError(linkError) };
    return { jamaahId: f.jamaahId };
  }

  if (!f.jamaahBaru) return { jamaahId: null };

  const baruId = crypto.randomUUID();
  const { error } = await s.supabase.from("pilgrims").insert({
    id: baruId,
    travel_id: s.travelId,
    order_id: orderId,
    package_id: packageId || null,
    full_name: f.jamaahBaru,
    status: "pending",
    document_status: "incomplete",
    nationality: "WNI",
    created_at: now,
    updated_at: now,
  });
  if (error) return { error: pesanError(error) };
  return { jamaahId: baruId };
}

export async function saveOrder(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };

  const f = bacaField(formData);
  if (!f.packageId) return { error: "Paket wajib dipilih." };
  if (f.total <= 0) return { error: "Total harga harus lebih besar dari nol." };

  const paket = await ownedPackage(s, f.packageId);
  if (paket.error) return { error: paket.error };

  const now = new Date().toISOString();
  const tanggal = tanggalValid(f.tanggal) ?? now.slice(0, 10);
  const adaJamaah =
    Boolean(f.jamaahBaru) || Boolean(f.jamaahId && f.jamaahId !== PILGRIM_BARU);
  const bayar = {
    package_id: f.packageId,
    purchase_date: tanggal,
    total_amount: f.total,
    price_per_pilgrim: f.total,
    // Satu pesanan di portal ini dibuat dari satu jamaah, jadi jumlah jamaah
    // bisa dipastikan dari isian form tanpa query tambahan.
    pilgrim_count: adaJamaah ? 1 : 0,
    status: f.status,
    updated_at: now,
  };

  if (f.idLama) {
    const owned = await ownedOrder(s, f.idLama);
    if (owned.error) return { error: owned.error };
    // Sisa dihitung ulang dari uang yang sudah masuk; pembayaran dikelola modul
    // keuangan, jadi kolom paid_amount tidak pernah ditimpa dari form ini.
    const paid = Number(owned.order.paid_amount) || 0;
    const { error } = await s.supabase
      .from("orders")
      .update({ ...bayar, remaining_amount: Math.max(f.total - paid, 0) })
      .eq("id", f.idLama);
    if (error) return { error: pesanError(error) };

    const jamaah = await pastikanJamaah(s, f, f.idLama, f.packageId, now);
    if (jamaah.error) return { error: jamaah.error };
    redirectToast("pesanan-ubah");
  }

  const orderId = crypto.randomUUID();
  const { error } = await s.supabase.from("orders").insert({
    ...bayar,
    id: orderId,
    travel_id: s.travelId,
    booking_code: buatKodePesanan(),
    channel: "langsung",
    payment_status: "unpaid",
    paid_amount: 0,
    remaining_amount: f.total,
    created_at: now,
  });
  if (error) return { error: pesanError(error) };

  const jamaah = await pastikanJamaah(s, f, orderId, f.packageId, now);
  if (jamaah.error) return { error: jamaah.error };

  redirectToast("pesanan-baru");
}

// Soft delete memakai orders.deleted_at. Entri lama (`bookings`) tidak punya
// kolom deleted_at dan database menolak DELETE untuk role authenticated, jadi
// baris tersebut memang tidak bisa dihapus dari portal ini.
export async function deleteOrder(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };
  const id = String(formData.get("idLama") ?? "").trim();
  const owned = await ownedOrder(s, id);
  if (owned.error) return { error: owned.error };

  const now = new Date().toISOString();
  const { error } = await s.supabase
    .from("orders")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", id);
  if (error) return { error: pesanError(error) };
  redirectToast("pesanan-hapus");
}
