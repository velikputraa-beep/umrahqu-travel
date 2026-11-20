// File ini di-import komponen "use client", jadi tidak boleh menyentuh
// @/lib/supabase/server (pelajaran dari modul Paket: bocor ke browser bundle).

export const JAMAAH_LIST_PATH = "/travel/jamaah";
export const JAMAAH_DOKUMEN_PATH = "/travel/jamaah/dokumen";

// Nilai yang dikirim ke database harus salah satu CHECK constraint
// pilgrims_status_check; label Indonesia hanya untuk UI.
export const PILGRIM_STATUS = [
  { value: "pending", label: "Menunggu" },
  { value: "processing", label: "Diproses" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Batal" },
  { value: "refunded", label: "Refund" },
];

export const PILGRIM_STATUS_LABEL = Object.fromEntries(
  PILGRIM_STATUS.map((s) => [s.value, s.label])
);

export const PILGRIM_STATUS_COLORS = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

// Status di luar daftar (mis. hasil backfill produksi) tetap ditampilkan,
// pakai nilainya apa adanya, supaya tidak pernah ada jamaah yang "hilang".
export function pilgrimStatusLabel(value) {
  return PILGRIM_STATUS_LABEL[value] ?? (value || "Tanpa Status");
}

export function normalizePilgrimStatus(value) {
  return PILGRIM_STATUS.some((s) => s.value === value) ? value : "pending";
}

// doc_type dibatasi CHECK constraint pilgrim_documents; empat jenis ini yang
// diminta web asli dan yang menentukan pilgrims.document_status.
export const DOC_TYPES = [
  { value: "KTP", label: "KTP" },
  { value: "KK", label: "KK" },
  { value: "PASPOR", label: "Paspor" },
  { value: "VAKSIN", label: "Sertifikat Vaksin" },
];

export const DOC_TYPE_VALUES = DOC_TYPES.map((d) => d.value);

export const DOC_STATUS_LABEL = {
  uploaded: "Ter-upload",
  verified: "Terverifikasi",
  rejected: "Perlu diperbaiki",
  expired: "Kedaluwarsa",
};

export const DOC_BUCKET = "pilgrim-docs";
export const DOC_MAX_BYTES = 5 * 1024 * 1024;
export const DOC_MIME_ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const DOC_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";
