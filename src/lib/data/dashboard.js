import { createClient } from "@/lib/supabase/server";

const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_INDEX = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4,
  jun: 5, jul: 6, aug: 7, agu: 7, ags: 7,
  sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};

// `biaya`/`dibayar`/`sisa`/`jumlah` masih disimpan sebagai teks ("Rp 32.500.000")
// di tabel demo — kolom bigint `amount` baru terisi setelah Keputusan C dijalankan.
export function parseRupiah(value) {
  if (typeof value === "number") return value;
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

export function formatRupiah(value) {
  return "Rp " + Math.round(value || 0).toLocaleString("id-ID");
}

// "12 Nov 2026" → Date (UTC), null kalau tidak terbaca.
export function parseTanggalRupiah(value) {
  const m = String(value ?? "").match(/(\d{1,2})\s*([A-Za-z]{3,})\s*(\d{4})/);
  if (!m) return null;
  const month = MONTH_INDEX[m[2].slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  const d = new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_LABEL[Number(m) - 1]} ${y.slice(2)}`;
}

// Enam bulan kalender terakhir, berakhir di bulan berjalan.
export function lastSixMonths(now = new Date()) {
  const out = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(monthKey(d));
  }
  return out;
}

const SUMBER_COLORS = {
  Marketplace: "bg-emerald-500",
  Website: "bg-amber-400",
  Travel: "bg-indigo-500",
  Offline: "bg-indigo-500",
};
const FALLBACK_COLORS = ["bg-emerald-500", "bg-amber-400", "bg-indigo-500", "bg-sky-500", "bg-rose-500"];

const STATUS_BADGE = {
  Lunas: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DP: "bg-amber-50 text-amber-700 border-amber-200",
  "Belum Bayar": "bg-gray-100 text-gray-600 border-gray-200",
  Selesai: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Dikonfirmasi: "bg-blue-50 text-blue-700 border-blue-200",
  "Menunggu Konfirmasi": "bg-amber-50 text-amber-700 border-amber-200",
  Dibatalkan: "bg-rose-50 text-rose-700 border-rose-200",
};
export function statusBadge(value) {
  return STATUS_BADGE[value] || "bg-gray-100 text-gray-600 border-gray-200";
}

export function sumberColor(sumber, index) {
  return SUMBER_COLORS[sumber] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// Semua angka dashboard berasal dari baris yang boleh dibaca sesi ini.
// Filter eksplisit tetap diperlukan: `packages` sengaja publik (Marketplace)
// dan `bookings` belum ikut di-backfill ke RLS travel, jadi tanpa filter
// travel A akan melihat milik travel B.
export async function getDashboardData(ctx) {
  const travelId = ctx.profile?.travel_id ?? null;
  const travelName = ctx.travelName ?? null;
  const isSuperAdmin = ctx.profile?.role === "super_admin";

  if (!isSuperAdmin && (!travelId || !travelName)) {
    return { scoped: false, empty: true, ...emptyDataset() };
  }

  const supabase = await createClient();

  const packagesQuery = supabase
    .from("packages")
    .select("slug, nama, biaya, status, terisi, total, kategori");
  const pilgrimsQuery = supabase
    .from("pilgrims")
    .select("id", { count: "exact", head: true });
  const bookingsQuery = supabase
    .from("bookings")
    .select("id, paket, pemesan, biaya, dibayar, sisa, pembayaran, status, sumber, tglPesan, tglBerangkat")
    .order("id", { ascending: false });
  const invoicesQuery = supabase
    .from("invoices")
    .select("noFaktur, jamaah, jumlah, status, tanggal");

  if (!isSuperAdmin) {
    packagesQuery.eq("travel_id", travelId);
    pilgrimsQuery.eq("travel_id", travelId);
    bookingsQuery.eq("travel", travelName);
    invoicesQuery.eq("travel_id", travelId);
  }

  const [pkgRes, pilgrimRes, bookingsRes, invoicesRes] = await Promise.all([
    packagesQuery,
    pilgrimsQuery,
    bookingsQuery,
    invoicesQuery,
  ]);

  const packages = pkgRes.data ?? [];
  const bookings = (bookingsRes.data ?? [])
    .map((b) => ({ ...b, tanggal: parseTanggalRupiah(b.tglPesan) }))
    .sort((a, b) => (b.tanggal?.getTime() ?? 0) - (a.tanggal?.getTime() ?? 0) || b.id.localeCompare(a.id));
  const invoices = invoicesRes.data ?? [];

  const revenue = bookings.reduce((sum, b) => sum + parseRupiah(b.dibayar), 0);
  const outstanding = bookings.reduce((sum, b) => sum + parseRupiah(b.sisa), 0);

  const months = lastSixMonths();
  const byMonth = new Map(months.map((m) => [m, { key: m, label: monthLabel(m), orders: 0, revenue: 0, sumber: {} }]));
  for (const b of bookings) {
    const bucket = b.tanggal && byMonth.get(monthKey(b.tanggal));
    if (!bucket) continue;
    bucket.orders += 1;
    bucket.revenue += parseRupiah(b.dibayar);
    const s = b.sumber || "Lainnya";
    bucket.sumber[s] = (bucket.sumber[s] || 0) + 1;
  }
  const series = months.map((m) => byMonth.get(m));

  const sumberTotals = {};
  for (const b of bookings) {
    const s = b.sumber || "Lainnya";
    sumberTotals[s] = (sumberTotals[s] || 0) + 1;
  }
  const channels = Object.entries(sumberTotals)
    .map(([name, count], i) => ({ name, count, color: sumberColor(name, i) }))
    .sort((a, b) => b.count - a.count);

  const dates = bookings.map((b) => b.tanggal).filter(Boolean);
  const period =
    dates.length > 0
      ? `${formatDateShort(new Date(Math.min(...dates.map((d) => d.getTime()))))} – ${formatDateShort(new Date(Math.max(...dates.map((d) => d.getTime()))))}`
      : null;

  return {
    scoped: true,
    travelName,
    period,
    stats: {
      revenue,
      outstanding,
      packageCount: packages.length,
      activePackages: packages.filter((p) => p.status === "Aktif").length,
      seatsFilled: packages.reduce((s, p) => s + (p.terisi || 0), 0),
      orderCount: bookings.length,
      paidCount: bookings.filter((b) => b.pembayaran === "Lunas").length,
      pilgrimCount: pilgrimRes.count ?? 0,
      unpaidInvoices: invoices.filter((i) => i.status !== "Lunas").length,
    },
    series,
    channels,
    recent: bookings.slice(0, 5),
    invoices,
  };
}

function formatDateShort(d) {
  return `${d.getUTCDate()} ${MONTH_LABEL[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
}

function emptyDataset() {
  return {
    travelName: null,
    period: null,
    stats: {
      revenue: 0,
      outstanding: 0,
      packageCount: 0,
      activePackages: 0,
      seatsFilled: 0,
      orderCount: 0,
      paidCount: 0,
      pilgrimCount: 0,
      unpaidInvoices: 0,
    },
    series: lastSixMonths().map((m) => ({ key: m, label: monthLabel(m), orders: 0, revenue: 0, sumber: {} })),
    channels: [],
    recent: [],
    invoices: [],
  };
}
