import { readScope, scoped } from "@/lib/data/record-scope";
import { formatRupiah, parseRupiah } from "@/lib/data/dashboard";
import { normalizeOrderStatus } from "@/lib/data/order-fields";
import { countsAsMoneyIn } from "@/lib/data/payment-fields";

// Baca-layer MODUL 9 (pengaturan). Profil membaca/mengubah baris `travels`
// milik sendiri, cabang memakai `branches`, dan rekap menggabungkan branches +
// orders + pilgrims + payments. Relasi cabang di-resolve di JS karena project
// ini tidak memasang foreign key, jadi PostgREST tidak bisa menautkannya.

const TRAVEL_SELECT =
  "uid, nama, contact_email, contact_phone, alamatDetail, alamatKota, logo_url, legalitas, status, totalPaket, initial, color";

export const PROFIL_BISA_DIUBAH = ["travel_admin", "super_admin"];

export async function getProfilTravel(ctx) {
  const s = await readScope(ctx);
  if (!s.travelId) return { travel: null, error: null };
  const { data, error } = await s.supabase
    .from("travels")
    .select(TRAVEL_SELECT)
    .eq("uid", s.travelId)
    .maybeSingle();
  if (error) {
    console.error("getProfilTravel gagal:", error.code, error.message);
    return { travel: null, error: "Profil travel gagal dimuat dari database." };
  }
  if (!data) {
    return {
      travel: null,
      error:
        "Data travel Anda belum tercatat di tabel travels, jadi profil belum bisa ditampilkan.",
    };
  }
  return { travel: data, error: null };
}

const CABANG_SELECT = "id, name, city, address, phone, is_primary, is_active";

function badgeCabang(row) {
  return row.is_active === false
    ? { label: "Nonaktif", tone: "gray" }
    : { label: "Aktif", tone: "emerald" };
}

export async function listCabang(ctx) {
  const s = await readScope(ctx);
  const { data, error } = await scoped(
    s.supabase.from("branches").select(CABANG_SELECT).is("deleted_at", null),
    s
  )
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });
  if (error) {
    console.error("listCabang gagal:", error.code, error.message);
    return {
      rows: [],
      stats: { jumlah: 0, aktif: 0 },
      error: "Daftar cabang gagal dimuat dari database.",
    };
  }
  const rows = (data ?? []).map((b) => ({
    key: b.id,
    id: b.id,
    nama: b.is_primary ? `${b.name} ★` : b.name,
    kota: b.city ?? "—",
    telepon: b.phone ?? null,
    alamat: b.address ?? null,
    badge: badgeCabang(b),
    utama: Boolean(b.is_primary),
    editHref: `/travel/pengaturan/data-cabang/${b.id}/ubah`,
    deleteId: b.id,
  }));
  return {
    rows,
    stats: {
      jumlah: rows.length,
      aktif: (data ?? []).filter((b) => b.is_active !== false).length,
      utama: (data ?? []).filter((b) => b.is_primary).length,
    },
    error: null,
  };
}

export async function getEditableCabang(ctx, id) {
  const s = await readScope(ctx);
  let query = s.supabase
    .from("branches")
    .select(`${CABANG_SELECT}, travel_id`)
    .eq("id", id)
    .is("deleted_at", null);
  if (!s.isSuperAdmin) {
    if (!s.travelId) return null;
    query = query.eq("travel_id", s.travelId);
  }
  const { data } = await query.maybeSingle();
  if (!data) return null;
  // Kolom DB dipetakan ke nama field form (CABANG_FIELDS).
  return {
    id: data.id,
    nama: data.name ?? "",
    kota: data.city ?? "",
    telepon: data.phone ?? "",
    alamat: data.address ?? "",
    status: data.is_active === false ? "nonaktif" : "aktif",
    utama: data.is_primary ? "ya" : "tidak",
  };
}

const TANPA_CABANG = "(belum ditautkan ke cabang)";

/**
 * Rekap performa cabang: pesanan, jamaah, omzet, dan uang masuk per
 * `branches.id`. Data yang `branch_id`-nya NULL dikelompokkan ke baris
 * "(belum ditautkan ke cabang)" supaya totalnya tetap sama dengan angka travel.
 * Pesanan dibatalkan/di-refund tidak dihitung (sama seperti halaman rekap lama).
 */
export async function rekapCabang(ctx) {
  const s = await readScope(ctx);
  // `bookings` warisan tidak punya kolom cabang sama sekali, jadi semua
  // pesananya masuk baris "(belum ditautkan ke cabang)". Tabel ini dibaca
  // memakai filter eksplisit pada kolom `travel` yang isi namanya.
  let legacy = null;
  if (s.isSuperAdmin || s.travelName) {
    legacy = s.supabase.from("bookings").select("id, biaya, status");
    if (!s.isSuperAdmin) legacy = legacy.eq("travel", s.travelName);
  }
  const [cabangRes, orderRes, pilgrimRes, paymentRes, legacyRes] =
    await Promise.all([
      scoped(
        s.supabase.from("branches").select(CABANG_SELECT).is("deleted_at", null),
        s
      ).order("name", { ascending: true }),
      scoped(
        s.supabase.from("orders").select("id, branch_id, total_amount, status"),
        s
      ).is("deleted_at", null),
      scoped(
        s.supabase.from("pilgrims").select("id, branch_id, order_id"),
        s
      ).is("deleted_at", null),
      scoped(
        s.supabase.from("payments").select("amount, status, branch_id, order_id"),
        s
      ).is("deleted_at", null),
      legacy,
    ]);

  if (cabangRes.error || orderRes.error || pilgrimRes.error || paymentRes.error) {
    const err =
      cabangRes.error ?? orderRes.error ?? pilgrimRes.error ?? paymentRes.error;
    console.error("rekapCabang gagal:", err.code, err.message);
    return { rows: [], stats: null, error: "Rekap cabang gagal dimuat dari database." };
  }

  const hidup = (orderRes.data ?? []).filter(
    (o) => !["cancelled", "refunded"].includes(normalizeOrderStatus(o.status))
  );
  const legacyHidup = (legacyRes?.data ?? []).filter(
    (b) => !["cancelled", "refunded"].includes(normalizeOrderStatus(b.status))
  );
  const branchOfOrder = new Map(hidup.map((o) => [o.id, o.branch_id ?? null]));
  const buckets = new Map();
  const bucket = (id, seed) => {
    if (!buckets.has(id)) {
      buckets.set(id, { jamaah: 0, pesanan: 0, omzet: 0, terbayar: 0, ...seed });
    }
    return buckets.get(id);
  };
  for (const b of cabangRes.data ?? []) {
    bucket(b.id, { nama: b.name, kota: b.city ?? "—", utama: Boolean(b.is_primary) });
  }

  // Cabang eksplisit menang; kalau kosong, ikut cabang pesanan induknya.
  const cabangDari = (langsung, orderId) =>
    langsung ?? (orderId ? branchOfOrder.get(orderId) : null) ?? null;
  const tanpa = { nama: TANPA_CABANG, kota: "—", utama: false };

  for (const o of hidup) {
    const b = bucket(cabangDari(o.branch_id, null) ?? "__tanpa__", tanpa);
    b.pesanan += 1;
    b.omzet += Number(o.total_amount) || 0;
  }
  for (const b of legacyHidup) {
    // Hanya omzet + jumlah pesanan. Kolom `dibayar`/`sisa` warisan sengaja tidak
    // dipakai karena bisa basi; uang masuk selalu dihitung dari `payments`.
    const row = bucket("__tanpa__", tanpa);
    row.pesanan += 1;
    row.omzet += parseRupiah(b.biaya);
  }
  for (const p of pilgrimRes.data ?? []) {
    bucket(cabangDari(p.branch_id, p.order_id) ?? "__tanpa__", tanpa).jamaah += 1;
  }
  for (const pay of paymentRes.data ?? []) {
    // Kontrak uang masuk sama dengan modul keuangan (OQ-2): pending dihitung.
    if (!countsAsMoneyIn(pay.status)) continue;
    bucket(cabangDari(pay.branch_id, pay.order_id) ?? "__tanpa__", tanpa).terbayar +=
      Number(pay.amount) || 0;
  }

  const totalPesanan = hidup.length + legacyHidup.length;

  const isi = [...buckets.entries()];
  const totalOmzet = isi.reduce((a, [, b]) => a + b.omzet, 0);
  const totalTerbayar = isi.reduce((a, [, b]) => a + b.terbayar, 0);

  const rows = isi
    .sort((a, b) => {
      if (a[0] === "__tanpa__") return 1;
      if (b[0] === "__tanpa__") return -1;
      return b[1].omzet - a[1].omzet || a[1].nama.localeCompare(b[1].nama);
    })
    .map(([id, b]) => ({
      key: id,
      nama: b.utama ? `${b.nama} ★` : b.nama,
      kota: b.kota,
      pesanan: String(b.pesanan),
      jamaah: String(b.jamaah),
      omzet: formatRupiah(b.omzet),
      rincian: `Terbayar ${formatRupiah(b.terbayar)} · Sisa ${formatRupiah(
        Math.max(b.omzet - b.terbayar, 0)
      )}`,
      badge:
        id === "__tanpa__"
          ? { label: "Perlu cabang", tone: "amber" }
          : { label: b.utama ? "Kantor utama" : "Cabang", tone: "sky" },
    }));

  return {
    rows,
    stats: {
      cabang: (cabangRes.data ?? []).length,
      pesanan: totalPesanan,
      jamaah: (pilgrimRes.data ?? []).length,
      omzet: formatRupiah(totalOmzet),
      terbayar: formatRupiah(totalTerbayar),
      sisa: formatRupiah(Math.max(totalOmzet - totalTerbayar, 0)),
    },
    error: null,
  };
}
