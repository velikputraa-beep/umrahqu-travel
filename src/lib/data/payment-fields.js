// File ini di-import komponen "use client", jadi tidak boleh menyentuh
// @/lib/supabase/server (aturan yang sama dengan order-fields.js).

export const PEMBAYARAN_LIST_PATH = "/travel/keuangan/pembayaran";
export const CICILAN_LIST_PATH = "/travel/keuangan/cicilan";
export const BARU_PEMBAYARAN_PATH = `${PEMBAYARAN_LIST_PATH}/baru`;
export const BARU_CICILAN_PATH = `${CICILAN_LIST_PATH}/baru`;
export const DETAIL_PESANAN_PATH = (id) => `/travel/pesanan/${id}`;
export const BAYAR_PESANAN_PATH = (id) => `/travel/pesanan/${id}/pembayaran`;

// payments.method dibatasi CHECK constraint payments_method_check.
// "midtrans" sengaja tidak masuk pilihan form: kanal gateway belum dipakai
// (di luar scope MODUL 6), tapi nilainya tetap dikenali kalau data produksi
// memuatnya.
export const PAYMENT_METHODS = [
  { value: "transfer", label: "Transfer Bank" },
  { value: "tunai", label: "Tunai" },
  { value: "edc", label: "EDC / Kartu" },
  { value: "virtual_account", label: "Virtual Account" },
  { value: "qris", label: "QRIS" },
];
export const PAYMENT_METHOD_LABEL = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);
PAYMENT_METHOD_LABEL.midtrans = "Midtrans";

// payments.status = CHECK constraint payments_status_check.
// "Menunggu Verifikasi" dipakai untuk pembayaran yang belum dicek bendahara;
// uangnya sudah dihitung masuk (keputusan OQ-2), verifikasi hanya label.
export const PAYMENT_ROW_STATUS = [
  { value: "pending", label: "Menunggu Verifikasi" },
  { value: "paid", label: "Terbayar" },
  { value: "verified", label: "Terverifikasi" },
  { value: "rejected", label: "Ditolak" },
  { value: "refunded", label: "Dikembalikan" },
];
export const PAYMENT_ROW_STATUS_LABEL = Object.fromEntries(
  PAYMENT_ROW_STATUS.map((s) => [s.value, s.label])
);
export const PAYMENT_ROW_STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  verified: "bg-blue-50 text-blue-700 border-blue-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

export function paymentMethodLabel(value) {
  return PAYMENT_METHOD_LABEL[value] ?? (value || "Metode lain");
}

export function paymentRowStatusLabel(value) {
  return PAYMENT_ROW_STATUS_LABEL[value] ?? (value || "Tanpa Status");
}

export function normalizePaymentMethodInput(value) {
  return PAYMENT_METHODS.some((m) => m.value === value) ? value : "transfer";
}

export function normalizePaymentRowStatusInput(value) {
  // "refunded" dan "rejected" tidak bisa dipilih dari form catat pembayaran;
  // refunded dipakai jalur pembatalan dan rejected hanya untuk data lama.
  return value === "verified" || value === "paid" ? value : "pending";
}

// Status yang dihitung sebagai uang masuk.
// OQ-2 (keputusan user 2026-11-16): `pending` ikut dihitung, karena uangnya
// sudah diterima travel dan tinggal diverifikasi bendahara.
export const STATUS_UANG_MASUK = ["pending", "paid", "verified"];

export function countsAsMoneyIn(status) {
  return STATUS_UANG_MASUK.includes(status);
}

// installments.status = CHECK constraint installments_status_check.
// "overdue" TIDAK pernah ditulis ke database (keputusan OQ-8): status itu
// diturunkan di aplikasi dari due_date, sama seperti document_status di MODUL 4.
export const INSTALLMENT_STATUS_LABEL = {
  unpaid: "Belum Bayar",
  partial: "Sebagian",
  paid: "Lunas",
  overdue: "Terlambat",
};

export const INSTALLMENT_STATUS_COLORS = {
  unpaid: "bg-gray-100 text-gray-600 border-gray-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};

export function installmentStatusLabel(value) {
  return INSTALLMENT_STATUS_LABEL[value] ?? (value || "Tanpa Status");
}

// OQ-7 (keputusan user 2026-11-16): hanya admin & finance yang boleh mengelola
// keuangan. `travel_operational` dan `travel_staff` tetap boleh MELIHAT ringkasan
// uang di detail pesanan, tapi tidak mendapat halaman keuangan maupun aksi tulis.
export const KEUANGAN_ROLES = ["super_admin", "admin", "travel_admin", "travel_finance"];

export function canAccessKeuangan(role) {
  return KEUANGAN_ROLES.includes(String(role ?? ""));
}

// Salinan formatRupiah yang aman untuk komponen "use client".
export function tampilkanRupiah(value) {
  return "Rp " + Math.round(Number(value) || 0).toLocaleString("id-ID");
}
