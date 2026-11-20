"use client";

import React, { useState } from "react";
import { X, Loader2, Lock } from "lucide-react";
import { voidPayment, viewPaymentProof } from "@/lib/data/payment-actions";
import {
  PAYMENT_ROW_STATUS_COLORS,
  tampilkanRupiah,
} from "@/lib/data/payment-fields";

export function PaymentStatusBadge({ status, label }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${
        PAYMENT_ROW_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {label}
    </span>
  );
}

// Baris `transactions` warisan: kolomnya text bebas dan portal ini tidak punya
// jalur tulis ke tabel itu, jadi tidak ada aksi yang dipasang.
export function LegacyPaymentBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-200"
      title="Pembayaran lama dari tabel transactions. Portal travel hanya bisa membacanya."
    >
      <Lock className="size-3.5" />
      Hanya-baca
    </span>
  );
}

// Dua langkah inline, pola yang sama dengan DeleteOrderButton / DeletePilgrimButton.
export function VoidPaymentButton({ id, lanjut }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handle = async (formData) => {
    setPending(true);
    const result = await voidPayment(formData);
    setPending(false);
    setConfirming(false);
    // Sukses = server action redirect, komponen ikut ter-unmount.
    if (result?.error) setError(result.error);
  };

  if (error) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-[11px] font-medium text-rose-700">{error}</span>
        <button
          type="button"
          onClick={() => setError(null)}
          className="p-1 rounded-md text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          title="Tutup pesan"
        >
          <X className="size-3.5" />
        </button>
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
        title="Batalkan pembayaran (soft delete)"
      >
        Batalkan
      </button>
    );
  }

  return (
    <form action={handle} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {lanjut && <input type="hidden" name="lanjut" value={lanjut} />}
      <span className="text-[11px] font-medium text-rose-700 whitespace-nowrap">
        Batalkan pembayaran ini?
      </span>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold disabled:opacity-60 transition-colors"
      >
        {pending && <Loader2 className="size-3 animate-spin" />}
        {pending ? "Membatalkan..." : "Ya, batalkan"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Tidak jadi"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}

// Bucket bukti transfer privat, jadi URL-nya harus ditandatangani server tiap
// kali dibuka — sama seperti dokumen jamaah di MODUL 4.
export function BuktiLink({ id, kode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const open = async () => {
    setBusy(true);
    const form = new FormData();
    form.set("id", id);
    const result = await viewPaymentProof(form);
    setBusy(false);
    if (result?.error) return setError(result.error);
    if (!result?.url) return;
    // Signed URL baru ada setelah round-trip, jadi window.open tidak bisa
    // dipakai sinkron; kalau diblokir popup, pindahkan tab ini.
    const win = window.open(result.url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = result.url;
  };

  if (error) {
    return <span className="text-[11px] font-medium text-rose-700">{error}</span>;
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-60 whitespace-nowrap inline-flex items-center gap-1"
      title={`Lihat bukti transfer ${kode ?? ""}`}
    >
      {busy && <Loader2 className="size-3 animate-spin" />}
      Bukti
    </button>
  );
}

export function Nominal({ value }) {
  return <span className="font-semibold text-gray-900">{tampilkanRupiah(value)}</span>;
}
