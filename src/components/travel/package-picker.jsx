"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

/**
 * Pemilih paket untuk halaman yang datanya dipecah per paket (manifest).
 * Nilai dikirim lewat query string supaya Server Component yang membaca, jadi
 * tidak ada state duplikat antara URL dan komponen.
 */
export default function PackagePicker({ basePath, packages, value, label }) {
  const router = useRouter();

  function ganti(id) {
    router.push(id ? `${basePath}?paket=${encodeURIComponent(id)}` : basePath);
  }

  if (packages.length === 0) return null;

  return (
    <div className="relative">
      {label && (
        <label htmlFor="paket-pilih" className="block text-[11px] text-gray-500 mb-1">
          {label}
        </label>
      )}
      <select
        id="paket-pilih"
        value={value ?? ""}
        onChange={(e) => ganti(e.target.value)}
        className="w-full sm:w-80 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 bg-white shadow-2xs focus:outline-none focus:border-emerald-600 appearance-none pr-8 cursor-pointer transition-colors"
      >
        {packages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nama}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 bottom-2.5 size-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}
