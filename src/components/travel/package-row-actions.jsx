"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, Pencil, X, Loader2 } from "lucide-react";
import { deletePackage } from "@/lib/data/package-actions";

const STATUS_BADGE = {
  Aktif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Nonaktif: "bg-gray-100 text-gray-600 border-gray-200",
  Menunggu: "bg-amber-50 text-amber-700 border-amber-200",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${
        STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {status ?? "Tanpa Status"}
    </span>
  );
}

// Dialog shadcn belum terpasang di project ini, dan `window.confirm` tidak bisa
// dibatalkan secara aksesibel — jadi hapus pakai konfirmasi dua langkah inline.
export default function DeletePackageButton({ slug }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (formData) => {
    setPending(true);
    const result = await deletePackage(formData);
    setPending(false);
    setConfirming(false);
    // Sukses = server action redirect, jadi komponen ini ter-unmount.
    // Kalau kita masih sampai di sini, berarti ada error yang harus ditampilkan.
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
        title="Hapus paket"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }

  return (
    <form action={handleDelete} className="inline-flex items-center gap-2">
      <input type="hidden" name="slugLama" value={slug} />
      <span className="text-[11px] font-medium text-rose-700 whitespace-nowrap">
        Hapus paket ini?
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

export function EditPackageLink({ href }) {
  return (
    <Link
      href={href}
      className="p-1.5 rounded-md text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors inline-flex"
      title="Ubah paket"
    >
      <Pencil className="size-4" />
    </Link>
  );
}
