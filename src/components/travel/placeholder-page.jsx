import React from "react";
import Link from "next/link";
import { Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Halaman yang strukturnya sudah diputuskan tapi belum dibangun: menampilkan
 * apa yang direncanakan + ke mana datanya akan dibaca, supaya tidak ada
 * tombol atau tabel palsu di demo.
 */
export default function PlaceholderPage({
  title,
  description,
  icon: Icon = Hammer,
  sumber,
  rencana = [],
  backHref,
  backLabel,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center gap-4 text-center">
        <div className="size-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
          <Icon className="size-5 text-gray-400" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-800">
            Halaman ini belum terhubung ke database
          </p>
          <p className="text-xs text-gray-500 max-w-md">
            Semua data travel Anda (paket, jamaah, pesanan, pembayaran, keberangkatan,
            cabang) sudah berjalan penuh. Fitur ini menyusul, dan sengaja ditampilkan
            kosong supaya tidak ada angka palsu di layar.
          </p>
        </div>

        {rencana.length > 0 && (
          <ul className="w-full max-w-md text-left space-y-1.5 pt-1">
            {rencana.map((r) => (
              <li key={r} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="size-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        )}

        {sumber && (
          <p className="text-[11px] text-gray-400">
            Rencana sumber data:{" "}
            <span className="font-mono text-gray-600">{sumber}</span>
          </p>
        )}

        {backHref && (
          <Button
            asChild
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9 shadow-2xs"
          >
            <Link href={backHref}>{backLabel ?? "Kembali"}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
