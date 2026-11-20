import { createClient } from "@/lib/supabase/server";
import {
  formatRupiah,
  lastSixMonths,
  monthKey,
  monthLabel,
  parseRupiah,
  parseTanggalRupiah,
} from "@/lib/data/dashboard";
import {
  PESANAN_LIST_PATH,
  PESANAN_DASHBOARD_PATH,
  channelLabel,
  normalizeChannel,
  normalizeOrderStatus,
  normalizePaymentStatus,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/data/order-fields";

export { PESANAN_LIST_PATH, PESANAN_DASHBOARD_PATH };

const ORDER_SELECT =
  "id, booking_code, travel_id, package_id, status, payment_status, channel, total_amount, paid_amount, remaining_amount, purchase_date, pilgrim_count, created_at";

const LEGACY_SELECT =
  "id, paket, travel, pemesan, telpon, biaya, dibayar, sisa, pembayaran, status, sumber, tglPesan";

const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// `purchase_date` bertipe date, jadi PostgREST mengembalikan "2026-11-16".
// Dipecah manual supaya tidak pernah bergeser sehari karena zona waktu browser.
function tanggalDari(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate ?? ""));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function labelTanggal(date) {
  if (!date) return "-";
  return `${date.getUTCDate()} ${BULAN_SINGKAT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export { labelTanggal, tanggalDari };

async function scope(ctx) {
  const supabase = await createClient();
  return {
    supabase,
    travelId: ctx?.profile?.travel_id ?? null,
    travelName: ctx?.travelName ?? null,
    isSuperAdmin: ctx?.profile?.role === "super_admin",
  };
}

// `bookings` adalah tabel warisan: policy SELECT-nya `using (true)` sehingga
// semua baris terbaca, dan tidak punya travel_id. Satu-satunya pengaman adalah
// filter eksplisit pada kolom `travel` (isi: NAMA travel). Kalau nama travel
// tidak diketahui, baris warisan tidak ditampilkan sama sekali.
function legacyQuery(s) {
  const builder = s.supabase.from("bookings").select(LEGACY_SELECT);
  if (s.isSuperAdmin) return { builder, active: true };
  if (!s.travelName) return { builder: null, active: false };
  return { builder: builder.eq("travel", s.travelName), active: true };
}

function ordersQuery(s) {
  const builder = s.supabase
    .from("orders")
    .select(ORDER_SELECT)
    .is("deleted_at", null);
  if (s.isSuperAdmin || !s.travelId) return builder;
  return builder.eq("travel_id", s.travelId);
}

function toRow(o, paketNama, pemesan, showTravel, travels) {
  const tanggal = tanggalDari(o.purchase_date) ?? new Date(o.created_at);
  const total = Number(o.total_amount) || 0;
  const dibayar = Number(o.paid_amount) || 0;
  const sisa = Number(o.remaining_amount) || Math.max(total - dibayar, 0);
  return {
    id: o.id,
    asal: "mandiri",
    kode: o.booking_code,
    paketNama: paketNama ?? "(paket dihapus)",
    packageId: o.package_id,
    pemesan: pemesan || "-",
    telp: null,
    status: normalizeOrderStatus(o.status),
    statusLabel: orderStatusLabel(normalizeOrderStatus(o.status)),
    pembayaran: normalizePaymentStatus(o.payment_status),
    pembayaranLabel: paymentStatusLabel(normalizePaymentStatus(o.payment_status)),
    sumber: channelLabel(normalizeChannel(o.channel)),
    tanggal,
    tanggalLabel: labelTanggal(tanggal),
    jamaah: o.pilgrim_count,
    total,
    dibayar,
    sisa,
    totalLabel: formatRupiah(total),
    dibayarLabel: formatRupiah(dibayar),
    sisaLabel: formatRupiah(sisa),
    travelNama: showTravel ? travels.get(o.travel_id) ?? "-" : null,
    canWrite: true,
  };
}

function toLegacyRow(b, showTravel) {
  const status = normalizeOrderStatus(b.status);
  const pembayaran = normalizePaymentStatus(b.pembayaran);
  const tanggal = parseTanggalRupiah(b.tglPesan);
  const total = parseRupiah(b.biaya);
  const dibayar = parseRupiah(b.dibayar);
  const sisa = parseRupiah(b.sisa);
  return {
    id: b.id,
    asal: "lama",
    kode: b.id,
    paketNama: b.paket,
    packageId: null,
    pemesan: b.pemesan,
    telp: b.telpon,
    status,
    statusLabel: orderStatusLabel(status),
    pembayaran,
    pembayaranLabel: paymentStatusLabel(pembayaran),
    sumber: channelLabel(normalizeChannel(b.sumber)),
    tanggal,
    tanggalLabel: b.tglPesan || labelTanggal(tanggal),
    jamaah: null,
    total,
    dibayar,
    sisa,
    totalLabel: formatRupiah(total),
    dibayarLabel: formatRupiah(dibayar),
    sisaLabel: formatRupiah(sisa),
    travelNama: showTravel ? b.travel : null,
    canWrite: false,
  };
}

// Nama jamaah per pesanan diambil dari pilgrims.order_id (kolom yang ditambahkan
// pada MODUL 4). Tanpa FK di database, jadi dipetakan di sisi aplikasi.
async function pilgrimNamesByOrder(s) {
  const builder = s.supabase
    .from("pilgrims")
    .select("order_id, full_name")
    .is("deleted_at", null)
    .not("order_id", "is", null);
  const query =
    s.isSuperAdmin || !s.travelId ? builder : builder.eq("travel_id", s.travelId);
  const { data } = await query;
  const map = new Map();
  for (const p of data ?? []) {
    if (!p.order_id) continue;
    const list = map.get(p.order_id) ?? [];
    list.push(p.full_name);
    map.set(p.order_id, list.join(", "));
  }
  return map;
}

async function packageNames(s) {
  const builder = s.supabase.from("packages").select("id, nama").is("deleted_at", null);
  const query = s.isSuperAdmin || !s.travelId ? builder : builder.eq("travel_id", s.travelId);
  const { data } = await query;
  return new Map((data ?? []).map((p) => [p.id, p.nama]));
}

async function travelNames(s) {
  const { data } = await s.supabase.from("travels").select("uid, nama");
  return new Map((data ?? []).map((t) => [t.uid, t.nama]));
}

function urutkan(rows) {
  return rows.sort(
    (a, b) =>
      (b.tanggal?.getTime() ?? 0) - (a.tanggal?.getTime() ?? 0) ||
      String(b.kode).localeCompare(String(a.kode))
  );
}

// Sumber data MODUL 5 ada dua dan keduanya wajib tampil:
//   1. `bookings`  = pesanan asli yang sudah ada (hanya-baca dari portal ini)
//   2. `orders`    = pesanan yang dibuat travel sendiri (CRUD penuh, RLS travel)
// `bookings` ditolak database untuk INSERT/UPDATE/DELETE oleh policy is_admin(),
// jadi tidak bisa dipakai sebagai target tulis — lihat laporan MODUL 5.
export async function listOrders(ctx) {
  const s = await scope(ctx);

  const legacy = legacyQuery(s);
  const [orderRes, legacyRes, paket, pemesan] = await Promise.all([
    ordersQuery(s).order("created_at", { ascending: false }),
    legacy.active ? legacy.builder : Promise.resolve({ data: [] }),
    packageNames(s),
    pilgrimNamesByOrder(s),
  ]);

  if (orderRes.error) {
    console.error("listOrders gagal:", orderRes.error.code, orderRes.error.message);
    return {
      rows: [],
      error: "Pesanan gagal dimuat dari database.",
      legacyDitampilkan: false,
      scoped: false,
      travelName: s.travelName,
    };
  }

  const travels = s.isSuperAdmin ? await travelNames(s) : null;

  const mandiri = (orderRes.data ?? []).map((o) =>
    toRow(o, paket.get(o.package_id), pemesan.get(o.id), s.isSuperAdmin, travels)
  );
  const lama = (legacyRes.data ?? []).map((b) => toLegacyRow(b, s.isSuperAdmin));

  return {
    rows: urutkan([...mandiri, ...lama]),
    error: null,
    legacyDitampilkan: legacy.active,
    scoped: true,
    travelName: s.travelName,
    counts: { mandiri: mandiri.length, lama: lama.length },
  };
}

// Hanya baris `orders` yang bisa diubah; baris `bookings` tidak punya jalur tulis.
export async function getEditableOrder(ctx, id) {
  const s = await scope(ctx);
  const { data, error } = await s.supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("getEditableOrder gagal:", error.code, error.message);
    return null;
  }
  if (!data) return null;
  if (!s.isSuperAdmin && (!s.travelId || data.travel_id !== s.travelId)) return null;
  return data;
}

export async function listOrderFormOptions(ctx) {
  const s = await scope(ctx);

  const paketBuilder = s.supabase
    .from("packages")
    .select("id, nama, biaya, status")
    .is("deleted_at", null);
  const jamaahBuilder = s.supabase
    .from("pilgrims")
    .select("id, full_name, passport_number, phone, order_id")
    .is("deleted_at", null);

  const [paketRes, jamaahRes] = await Promise.all([
    s.isSuperAdmin || !s.travelId ? paketBuilder : paketBuilder.eq("travel_id", s.travelId).order("nama"),
    s.isSuperAdmin || !s.travelId ? jamaahBuilder : jamaahBuilder.eq("travel_id", s.travelId).order("created_at", { ascending: false }),
  ]);

  if (paketRes.error || jamaahRes.error) {
    return { packages: [], pilgrims: [], error: "Opsi paket/jamaah gagal dimuat." };
  }

  return {
    packages: (paketRes.data ?? []).map((p) => ({
      id: p.id,
      nama: p.nama,
      status: p.status,
      harga: parseRupiah(p.biaya),
      hargaLabel: formatRupiah(parseRupiah(p.biaya)),
    })),
    // `order_id` ikut dikembalikan supaya form ubah bisa menandai jamaah yang
    // sudah tertaut ke pesanan ini sebagai nilai awal.
    pilgrims: (jamaahRes.data ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      passport_number: p.passport_number,
      phone: p.phone,
      order_id: p.order_id,
      sudahTertaut: Boolean(p.order_id),
    })),
    error: null,
  };
}

// Analitik dashboard pesanan: seluruh angka dihitung dari baris yang sama
// dengan tabel daftar, supaya keduanya tidak pernah berbeda cerita.
export async function getOrderDashboard(ctx) {
  const data = await listOrders(ctx);
  const rows = data.rows ?? [];

  const months = lastSixMonths();
  const byMonth = new Map(
    months.map((m) => [m, { key: m, label: monthLabel(m), orders: 0, revenue: 0, value: 0 }])
  );
  let diLuarRentang = 0;
  for (const r of rows) {
    const bucket = r.tanggal && byMonth.get(monthKey(r.tanggal));
    if (!bucket) {
      diLuarRentang += 1;
      continue;
    }
    bucket.orders += 1;
    bucket.revenue += r.dibayar;
    bucket.value += r.total;
  }

  const statusDist = new Map();
  for (const r of rows) {
    statusDist.set(r.status, (statusDist.get(r.status) ?? 0) + 1);
  }

  return {
    ...data,
    series: months.map((m) => byMonth.get(m)),
    diLuarRentang,
    stats: {
      orderCount: rows.length,
      nilai: rows.reduce((sum, r) => sum + r.total, 0),
      terkumpul: rows.reduce((sum, r) => sum + r.dibayar, 0),
      tertunda: rows.reduce((sum, r) => sum + r.sisa, 0),
      lunas: rows.filter((r) => r.pembayaran === "paid").length,
      perluTindakan: rows.filter((r) => r.status === "pending" || r.status === "processing").length,
      dibatalkan: rows.filter((r) => r.status === "cancelled" || r.status === "refunded").length,
      jamaah: rows.reduce((sum, r) => sum + (r.jamaah || 0), 0),
      ...data.counts,
    },
    statusDist: [...statusDist.entries()]
      .map(([value, count]) => ({ value, label: orderStatusLabel(value), count }))
      .sort((a, b) => b.count - a.count),
    recent: rows.slice(0, 5),
  };
}
