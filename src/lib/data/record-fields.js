// Konstanta & label MODUL 7-9 (master data, keberangkatan, pengaturan).
// File ini boleh di-import komponen klien; isinya data murni.

export const HOTEL_LIST_PATH = "/travel/master-data/hotel";
export const AGEN_LIST_PATH = "/travel/master-data/agen-reseller";
export const MANASIK_LIST_PATH = "/travel/keberangkatan/manasik";
export const MANIFEST_LIST_PATH = "/travel/keberangkatan/manifest";
export const PERLENGKAPAN_LIST_PATH = "/travel/keberangkatan/perlengkapan";
export const PROFIL_PATH = "/travel/pengaturan/profil";
export const CABANG_LIST_PATH = "/travel/pengaturan/data-cabang";
export const REKAP_CABANG_PATH = "/travel/pengaturan/rekap-cabang";

export const KOTA_PILIHAN = ["Makkah", "Madinah", "Jeddah", "Thaif", "Riyadh"];

export const HOTEL_STATUS = [
  { value: "Aktif", label: "Aktif" },
  { value: "Nonaktif", label: "Nonaktif" },
];

export const BINTANG_PILIHAN = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: `${n} Bintang`,
}));

export const TRIGGER_KOMISI = [
  { value: "dp", label: "Saat DP" },
  { value: "pelunasan", label: "Saat Pelunasan" },
  { value: "manual", label: "Manual" },
];

export const AGEN_STATUS = [
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
];

export const MANASIK_STATUS = [
  { value: "scheduled", label: "Terjadwal" },
  { value: "ongoing", label: "Berlangsung" },
  { value: "done", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

export const MANASIK_LOKASI = [
  "Asrama Haji",
  "Kantor Pusat",
  "Hotel Keberangkatan",
  "Masjid Jami'",
];

export const PERLENGKAPAN_STATUS = [
  { value: "not_delivered", label: "Belum Diserahkan" },
  { value: "delivered", label: "Sudah Diserahkan" },
  { value: "returned", label: "Dikembalikan" },
];

export const UKURAN_PILIHAN = ["S", "M", "L", "XL"];

export const CABANG_STATUS = [
  { value: "aktif", label: "Aktif" },
  { value: "nonaktif", label: "Nonaktif" },
];

export const HOTEL_TONE = { Aktif: "emerald", Nonaktif: "gray" };

export const AGEN_TONE = { Aktif: "emerald", Nonaktif: "gray" };

export const MANASIK_TONE = {
  scheduled: "sky",
  ongoing: "amber",
  done: "emerald",
  cancelled: "gray",
};

export const PERLENGKAPAN_TONE = {
  not_delivered: "amber",
  delivered: "emerald",
  returned: "sky",
};

export const CABANG_TONE = { Aktif: "emerald", Nonaktif: "gray" };

export const labelDari = (options, value, fallback = null) =>
  options.find((o) => o.value === value)?.label ?? fallback ?? value ?? "—";

export function bintangLabel(n) {
  const angka = Number(n);
  return Number.isFinite(angka) && angka > 0 ? `${angka} Bintang` : "—";
}

// Spesifikasi form untuk RecordForm (data murni supaya bisa dikirim dari
// Server Component). `name` = nama field FormData, sama dengan kolom database.
export const HOTEL_FIELDS = [
  { name: "nama", label: "Nama Hotel", required: true, span: 2, placeholder: "Anwar Al Madinah Mövenpick" },
  {
    name: "kota",
    label: "Kota",
    type: "select",
    options: KOTA_PILIHAN.map((k) => ({ value: k, label: k })),
    emptyValue: "",
    emptyLabel: "Pilih kota",
  },
  {
    name: "bintang",
    label: "Bintang",
    type: "select",
    options: BINTANG_PILIHAN,
    emptyValue: "",
    emptyLabel: "Belum diketahui",
  },
  { name: "jarak", label: "Jarak ke Masjid", span: 2, placeholder: "1,2 km dari Masjidil Haram" },
  { name: "alamat", label: "Alamat", span: 2, placeholder: "Ajyad, Makkah" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: HOTEL_STATUS,
    hint: "Hotel nonaktif tidak ditawarkan lagi di form paket.",
  },
];

export const AGEN_FIELDS = [
  { name: "nama", label: "Nama Agen", required: true, span: 2, placeholder: "H. Sulaiman" },
  { name: "kontak", label: "Kontak", required: true, type: "tel", placeholder: "0812-3456-7890" },
  {
    name: "komisi",
    label: "Komisi per Jamaah",
    type: "text",
    inputMode: "numeric",
    placeholder: "500000",
    hint: "Angka penuh rupiah tanpa titik, mis. 500000.",
  },
  {
    name: "trigger",
    label: "Komisi Dibayar Saat",
    type: "select",
    options: TRIGGER_KOMISI,
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: AGEN_STATUS,
  },
  { name: "referral", label: "Kode Referral", placeholder: "AGN-001", uppercase: true },
  { name: "catatan", label: "Catatan", type: "textarea", rows: 2 },
];

// Field builder (bukan konstanta) karena pilihannya datang dari database:
// paket untuk manasik, jamaah untuk perlengkapan.
export function manasikFields(paketOptions = []) {
  return [
    { name: "judul", label: "Judul Kegiatan", required: true, span: 2, placeholder: "Manasik Akbar Gelombang 1" },
    { name: "tanggal", label: "Tanggal", type: "date", required: true },
    { name: "jamMulai", label: "Jam Mulai", type: "time" },
    {
      name: "paket",
      label: "Paket",
      type: "select",
      options: paketOptions.map((p) => ({ value: p.id, label: p.nama })),
      emptyValue: "",
      emptyLabel: "Untuk semua jamaah",
    },
    {
      name: "lokasi",
      label: "Lokasi",
      span: 2,
      placeholder: "Asrama Haji Donohudan",
      hint: `Contohnya: ${MANASIK_LOKASI.slice(0, 2).join(", ")}.`,
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: MANASIK_STATUS,
    },
    { name: "deskripsi", label: "Catatan Penyelenggaraan", type: "textarea", rows: 2 },
  ];
}

export function perlengkapanFields(jamaahOptions = []) {
  return [
    {
      name: "jamaah",
      label: "Nama Jamaah",
      type: "select",
      options: jamaahOptions.map((p) => ({ value: p.id, label: p.full_name })),
      emptyValue: "",
      emptyLabel: "Belum ditautkan",
    },
    { name: "item", label: "Item", required: true, placeholder: "Koper Bagasi" },
    {
      name: "ukuran",
      label: "Ukuran",
      type: "select",
      options: UKURAN_PILIHAN.map((u) => ({ value: u, label: u })),
      emptyValue: "",
      emptyLabel: "Tanpa ukuran",
    },
    { name: "jumlah", label: "Jumlah", type: "number", min: 1, max: 20, inputMode: "numeric" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: PERLENGKAPAN_STATUS,
    },
    { name: "tanggal", label: "Tanggal Serah Terima", type: "date" },
    { name: "catatan", label: "Catatan", type: "textarea", rows: 2 },
  ];
}

export const MANIFEST_FIELDS = [
  {
    name: "kamar",
    label: "Nomor Kamar",
    placeholder: "101",
    hint: "Kosongkan untuk melepas penempatan kamar jamaah ini.",
  },
  { name: "tempatTidur", label: "Tempat Tidur", placeholder: "A / B / 1", hint: "Label kasur di kamar tersebut." },
  { name: "kursi", label: "Nomor Kursi Bus", placeholder: "12A", hint: "Kosongkan untuk melepas kursi." },
];

export const CABANG_FIELDS = [
  { name: "nama", label: "Nama Cabang", required: true, span: 2, placeholder: "Cabang Surabaya" },
  { name: "kota", label: "Kota", placeholder: "Surabaya" },
  { name: "telepon", label: "Telepon", type: "tel", placeholder: "031-555-1234" },
  { name: "alamat", label: "Alamat", span: 2, placeholder: "Jl. Basuki Rahmat No. 12" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: CABANG_STATUS,
  },
  {
    name: "utama",
    label: "Jadikan Cabang Utama",
    type: "select",
    options: [
      { value: "ya", label: "Ya" },
      { value: "tidak", label: "Tidak" },
    ],
    hint: "Cabang utama ditandai bintang di daftar dan rekap.",
  },
];

// Kolom profil menulis baris `travels` (kolom aslinya camelCase: alamatDetail,
// alamatKota, logo_url), jadi nama field di sini memakai label UI-nya saja.
export const PROFIL_FIELDS = [
  {
    name: "nama",
    label: "Nama Travel",
    required: true,
    span: 2,
    placeholder: "PT An-Nahl Wisata Barokah",
  },
  { name: "email", label: "Email Resmi", type: "email", placeholder: "halo@annahil.co.id" },
  { name: "telepon", label: "No. Telepon", type: "tel", placeholder: "0341-555-0190" },
  {
    name: "alamat",
    label: "Alamat Kantor",
    span: 2,
    placeholder: "Jl. Letjend S. Parman No. 43A-D",
  },
  {
    name: "kota",
    label: "Kota / Provinsi",
    span: 2,
    placeholder: "Kota Malang, Jawa Timur",
  },
  {
    name: "logo",
    label: "URL Logo",
    span: 2,
    placeholder: "https://.../logo-annahil.png",
    hint: "Tempel tautan gambar logo. Kalau kosong, inisial nama travel yang dipakai.",
  },
];
