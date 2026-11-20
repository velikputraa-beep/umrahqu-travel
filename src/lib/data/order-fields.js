// File ini di-import komponen "use client", jadi tidak boleh menyentuh
// @/lib/supabase/server (aturan yang sama dengan pilgrim-fields.js).

export const PESANAN_LIST_PATH = "/travel/pesanan";
export const PESANAN_DASHBOARD_PATH = "/travel/pesanan/dashboard";

// orders.status dibatasi CHECK constraint dengan kode bahasa Inggris, sedangkan
// bookings.status (data lama) sudah berisi label Indonesia. Keduanya
// di-normalize ke kode di bawah supaya satu tabel pakai label yang konsisten.
export const ORDER_STATUS = [
  { value: "pending", label: "Menunggu Konfirmasi" },
  { value: "processing", label: "Diproses" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "refunded", label: "Refund" },
];

const STATUS_LABEL = Object.fromEntries(ORDER_STATUS.map((s) => [s.value, s.label]));

// Kunci balik: label lama `bookings` → kode `orders`.
const STATUS_DARI_LABEL = Object.fromEntries(
  ORDER_STATUS.map((s) => [s.label.toLowerCase(), s.value])
);
// Variasi tulisan lain yang masih mungkin muncul di bookings.
const STATUS_SINONIM = {
  menunggu: "pending",
  batal: "cancelled",
  refund: "refunded",
};

export const ORDER_STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

export function normalizeOrderStatus(value) {
  const raw = String(value ?? "").trim();
  if (STATUS_LABEL[raw]) return raw;
  const key = raw.toLowerCase();
  return STATUS_DARI_LABEL[key] ?? STATUS_SINONIM[key] ?? "pending";
}

export function orderStatusLabel(value) {
  return STATUS_LABEL[value] ?? (value || "Tanpa Status");
}

export function normalizeOrderStatusInput(value) {
  return ORDER_STATUS.some((s) => s.value === value) ? value : "pending";
}

// orders.payment_status vs bookings.pembayaran — pola yang sama.
export const PAYMENT_STATUS = [
  { value: "unpaid", label: "Belum Bayar" },
  { value: "dp", label: "DP" },
  { value: "partial", label: "Cicilan" },
  { value: "paid", label: "Lunas" },
];

const PAYMENT_LABEL = Object.fromEntries(PAYMENT_STATUS.map((s) => [s.value, s.label]));
const PAYMENT_DARI_LABEL = Object.fromEntries(
  PAYMENT_STATUS.map((s) => [s.label.toLowerCase(), s.value])
);
// Variasi tulisan pembayaran yang ada di bookings tapi bukan label kanonik.
const PAYMENT_SINONIM = {
  "belum lunas": "dp",
  "dp + cicilan": "dp",
};

export const PAYMENT_STATUS_COLORS = {
  unpaid: "bg-gray-100 text-gray-600 border-gray-200",
  dp: "bg-amber-50 text-amber-700 border-amber-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function normalizePaymentStatus(value) {
  const raw = String(value ?? "").trim();
  if (PAYMENT_LABEL[raw]) return raw;
  const key = raw.toLowerCase();
  return PAYMENT_DARI_LABEL[key] ?? PAYMENT_SINONIM[key] ?? "unpaid";
}

export function paymentStatusLabel(value) {
  return PAYMENT_LABEL[value] ?? (value || "Belum Bayar");
}

// orders.channel (kode) vs bookings.sumber (label Indonesia yang sudah tampil
// di web asli). "langsung" = pesanan yang dibuat travel sendiri dari portal ini.
export const CHANNEL_LABEL = {
  marketplace: "Marketplace",
  offline: "Offline",
  website_travel: "Website",
  langsung: "Travel",
  agency: "Agen",
};

const CHANNEL_DARI_LABEL = Object.fromEntries(
  Object.entries(CHANNEL_LABEL).map(([code, label]) => [label.toLowerCase(), code])
);

export function normalizeChannel(value) {
  const raw = String(value ?? "").trim();
  if (CHANNEL_LABEL[raw]) return raw;
  return CHANNEL_DARI_LABEL[raw.toLowerCase()] ?? "offline";
}

export function channelLabel(value) {
  return CHANNEL_LABEL[value] ?? (value || "Lainnya");
}

export const BARU_PESANAN_PATH = `${PESANAN_LIST_PATH}/baru`;
export const UBAH_PESANAN_PATH = (id) => `${PESANAN_LIST_PATH}/${id}/ubah`;

// Nilai khusus pada select jamaah: pengisian cepat jamaah baru dari form
// pesanan (poin 2 spesifikasi MODUL 5).
export const PILGRIM_BARU = "__jamaah_baru__";

// Salinan formatRupiah yang aman untuk komponen "use client": dashboard.js
// meng-import @/lib/supabase/server sehingga tidak boleh ikut masuk bundle.
export function tampilkanRupiah(value) {
  return "Rp " + Math.round(Number(value) || 0).toLocaleString("id-ID");
}
