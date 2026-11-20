import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PESANAN_LIST_PATH } from "@/lib/data/order-fields";

/**
 * Layar penolak OQ-7: hanya administrator & keuangan travel yang boleh membuka
 * halaman keuangan. Ditampil dari halaman, bukan dari middleware, karena
 * aturannya dibaca dari profil role di database.
 */
export default function AccessDenied({
  title = "Halaman Keuangan khusus Administrator & Keuangan travel",
  backHref = `${PESANAN_LIST_PATH}`,
  backLabel = "Kembali ke daftar pesanan",
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center gap-3 text-center max-w-xl mx-auto">
      <ShieldAlert className="size-8 text-amber-500" />
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-1">
          Akun Anda punya role operasional, jadi halaman ini tidak dibuka untuk
          Anda. Ringkasan uang tetap terlihat di halaman detail pesanan, dan
          bisa diubah oleh Administrator atau Keuangan travel.
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
