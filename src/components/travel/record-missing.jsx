import React from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tampilan seragam untuk halaman ubah yang barisnya tidak ditemukan / bukan
// milik travel ini (RLS sudah menyaringnya di sisi database).
export default function RecordMissing({ id, label = "Data", backHref, backLabel }) {
  const kode = String(id ?? "").slice(0, 12);
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center gap-3 text-center">
      <FileQuestion className="size-8 text-gray-300" />
      <div>
        <p className="text-sm font-semibold text-gray-800">{label} tidak ditemukan</p>
        <p className="text-xs text-gray-500 mt-1">
          Kode{" "}
          <span className="font-mono text-gray-700">
            {kode}
            {String(id ?? "").length > 12 ? "…" : ""}
          </span>{" "}
          tidak ada, sudah dihapus, atau bukan milik travel Anda.
        </p>
      </div>
      <Button
        asChild
        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9 shadow-2xs"
      >
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}
