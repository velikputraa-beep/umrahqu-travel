"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, Pencil, X, Loader2, Lock } from "lucide-react";
import { deleteOrder } from "@/lib/data/order-actions";
import {
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/data/order-fields";

export function OrderStatusBadge({ status, label }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${
        ORDER_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {label}
    </span>
  );
}

export function PaymentStatusBadge({ status, label }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${
        PAYMENT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {label}
    </span>
  );
}

export function EditOrderLink({ href }) {
  return (
    <Link
      href={href}
      className="p-1.5 rounded-md text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors inline-flex"
      title="Ubah pesanan"
    >
      <Pencil className="size-4" />
    </Link>
  );
}

// Baris `bookings` tidak punya kolom deleted_at dan database menolak tulis
// travel di tabel itu, jadi tombolnya memang tidak dipasang.
export function ReadOnlyBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-200"
      title="Entri lama dari tabel bookings. Portal travel hanya bisa membacanya; pengubahan dilakukan lewat Web Admin."
    >
      <Lock className="size-3.5" />
      Hanya-baca
    </span>
  );
}

export default function DeleteOrderButton({ id }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (formData) => {
    setPending(true);
    const result = await deleteOrder(formData);
    setPending(false);
    setConfirming(false);
    // Sukses = server action redirect, komponen ini ikut ter-unmount.
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
        className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
        title="Hapus pesanan"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }

  return (
    <form action={handleDelete} className="inline-flex items-center gap-2">
      <input type="hidden" name="idLama" value={id} />
      <span className="text-[11px] font-medium text-rose-700 whitespace-nowrap">
        Hapus pesanan ini?
      </span>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold disabled:opacity-60 transition-colors"
      >
        {pending && <Loader2 className="size-3 animate-spin" />}
        {pending ? "Menghapus..." : "Ya, hapus"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Batal"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}
