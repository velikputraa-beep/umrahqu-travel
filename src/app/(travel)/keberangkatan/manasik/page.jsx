import React from "react";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { listManasik } from "@/lib/data/keberangkatan";
import { deleteManasik } from "@/lib/data/keberangkatan-actions";
import { MANASIK_LIST_PATH } from "@/lib/data/record-fields";
import RecordTable from "@/components/travel/record-table";
import ToastMessage from "@/components/travel/toast-message";

const COLUMNS = [
  { key: "tanggal", label: "Tanggal", type: "title", subKey: "judul", glyph: "manasik" },
  { key: "paket", label: "Paket", type: "muted" },
  { key: "lokasi", label: "Lokasi", type: "muted" },
  { key: "badge", label: "Status", type: "badge" },
];

export default async function ManasikPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, stats, error } = await listManasik(ctx);

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Jadwal Manasik
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pembekalan jamaah sebelum keberangkatan
            {ctx.travelName ? ` · ${ctx.travelName}` : ""}.
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
        >
          <Link href={`${MANASIK_LIST_PATH}/baru`}>
            <Plus className="size-4" />
            <span>Tambah Jadwal</span>
          </Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <CalendarDays className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "TOTAL JADWAL", value: stats.jumlah, tone: "text-gray-900" },
          { label: "AKAN DATANG", value: stats.akanDatang, tone: "text-emerald-700" },
          { label: "SELESAI", value: stats.selesai, tone: "text-gray-900" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs"
          >
            <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
              {card.label}
            </div>
            <div className={`text-xl font-extrabold mt-2 ${card.tone}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <RecordTable
        rows={rows}
        columns={COLUMNS}
        searchKeys={["judul", "lokasi", "paket"]}
        searchPlaceholder="Cari judul, lokasi, atau paket..."
        countLabel={`${rows.length} jadwal manasik`}
        emptyTitle="Belum ada jadwal manasik"
        emptyDesc="Buat jadwal pertama agar jamaah punya pembekalan sebelum berangkat."
        deleteAction={deleteManasik}
        confirmLabel="Hapus jadwal ini?"
      />
    </div>
  );
}
