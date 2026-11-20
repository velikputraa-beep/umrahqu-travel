"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const PESAN = {
  baru: "Paket berhasil dibuat.",
  ubah: "Perubahan paket tersimpan.",
  hapus: "Paket dihapus (riwayat tetap tersimpan di database).",
  "jamaah-baru": "Jamaah berhasil ditambahkan.",
  "jamaah-ubah": "Perubahan jamaah tersimpan.",
  "jamaah-hapus": "Jamaah dihapus (riwayat tetap tersimpan di database).",
  "dokumen-unggah": "Dokumen berhasil diunggah.",
  "dokumen-hapus": "Dokumen dihapus.",
  "pesanan-baru": "Pesanan berhasil dibuat.",
  "pesanan-ubah": "Perubahan pesanan tersimpan.",
  "pesanan-hapus": "Pesanan dihapus (riwayat tetap tersimpan di database).",
  "pembayaran-baru": "Pembayaran tersimpan dan total pesanan dihitung ulang.",
  "pembayaran-batal": "Pembayaran dibatalkan; total pesanan ikut dihitung ulang.",
  "cicilan-jadwal": "Jadwal cicilan tersimpan.",
  "cicilan-lunas": "Cicilan ditandai lunas dan uangnya tercatat.",
  "cicilan-hapus": "Jadwal cicilan dihapus.",
  "hotel-baru": "Hotel berhasil ditambahkan.",
  "hotel-ubah": "Perubahan hotel tersimpan.",
  "hotel-hapus": "Hotel dihapus (riwayat paket tetap tersimpan).",
  "agen-baru": "Agen berhasil ditambahkan.",
  "agen-ubah": "Perubahan agen tersimpan.",
  "agen-hapus": "Agen dihapus.",
  "manasik-baru": "Jadwal manasik tersimpan.",
  "manasik-ubah": "Perubahan jadwal manasik tersimpan.",
  "manasik-hapus": "Jadwal manasik dihapus.",
  "manifest-ubah": "Penempatan kamar dan kursi jamaah tersimpan.",
  "perlengkapan-baru": "Perlengkapan berhasil dicatat.",
  "perlengkapan-ubah": "Status perlengkapan diperbarui.",
  "perlengkapan-hapus": "Catatan perlengkapan dihapus.",
  "profil-ubah": "Profil travel tersimpan.",
  "cabang-baru": "Cabang berhasil ditambahkan.",
  "cabang-ubah": "Perubahan cabang tersimpan.",
  "cabang-hapus": "Cabang dihapus.",
};

// Belum ada sonner/Toaster di project ini, jadi toast dibuat dari query param
// `?toast=` yang dikembalikan server action setelah redirect.
export default function ToastMessage({ toast }) {
  const [visible, setVisible] = useState(Boolean(PESAN[toast]));

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-2.5 max-w-sm px-4 py-3 bg-white border border-emerald-200 rounded-xl shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
      <p className="text-xs font-medium text-gray-800">{PESAN[toast]}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="ml-1 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Tutup notifikasi"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
