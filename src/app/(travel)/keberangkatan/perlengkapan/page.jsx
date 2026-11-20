import React from "react";
import Link from "next/link";
import { Plus, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { listPerlengkapan } from "@/lib/data/keberangkatan";
import { deletePerlengkapan } from "@/lib/data/keberangkatan-actions";
import { PERLENGKAPAN_LIST_PATH } from "@/lib/data/record-fields";
import RecordTable from "@/components/travel/record-table";
import ToastMessage from "@/components/travel/toast-message";

const COLUMNS = [
  { key: "jamaah", label: "Nama Jamaah", type: "title", subKey: "catatan", glyph: "perlengkapan" },
  { key: "item", label: "Item", type: "muted" },
  { key: "badge", label: "Status", type: "badge" },
  { key: "tanggal", label: "Tanggal", type: "muted" },
];

export default async function PerlengkapanPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, stats, error } = await listPerlengkapan(ctx);

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Perlengkapan Jamaah
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pencatatan pembagian koper, kain ihram, dan atribut keberangkatan
            {ctx.travelName ? ` · ${ctx.travelName}` : ""}.
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
        >
          <Link href={`${PERLENGKAPAN_LIST_PATH}/baru`}>
            <Plus className="size-4" />
            <span>Tambah Perlengkapan</span>
          </Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <Boxes className="size-4 text-rose-600 shrink-0 mt-0.5" />
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
          { label: "TOTAL PENCATATAN", value: stats.jumlah, tone: "text-gray-900" },
          { label: "BELUM DISERAHKAN", value: stats.belum, tone: "text-amber-600" },
          { label: "SUDAH DISERAHKAN", value: stats.sudah, tone: "text-emerald-700" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs"
          >
            <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
              {card.label}
            </div>
            <div className={`text-xl font-extrabold mt-2 ${card.tone}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <RecordTable
        rows={rows}
        columns={COLUMNS}
        searchKeys={["jamaah", "item"]}
        searchPlaceholder="Cari jamaah atau item..."
        countLabel={`${rows.length} catatan perlengkapan`}
        emptyTitle="Belum ada perlengkapan tercatat"
        emptyDesc="Catat pembagian koper, ihram, dan name tag agar tidak ada jamaah yang terlewat."
        deleteAction={deletePerlengkapan}
        confirmLabel="Hapus catatan ini?"
      />
    </div>
  );
}
