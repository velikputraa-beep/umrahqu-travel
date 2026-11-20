import React from "react";
import Link from "next/link";
import { ChartNoAxesColumn, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { rekapCabang } from "@/lib/data/pengaturan";
import { CABANG_LIST_PATH } from "@/lib/data/record-fields";
import RecordTable from "@/components/travel/record-table";

const COLUMNS = [
  { key: "nama", label: "Cabang", type: "title", subKey: "kota", glyph: "cabang" },
  { key: "pesanan", label: "Pesanan" },
  { key: "jamaah", label: "Jamaah" },
  { key: "omzet", label: "Omzet", type: "money", subKey: "rincian" },
  { key: "badge", label: "Status", type: "badge" },
];

export default async function RekapCabangPage() {
  const ctx = await getTravelContext();
  const { rows, stats, error } = await rekapCabang(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Rekap per Cabang
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Rangkuman cabang {ctx.travelName ? `· ${ctx.travelName}` : ""}. Pesanan
            dibatalkan atau di-refund tidak dihitung.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="text-xs font-semibold gap-1.5 px-3.5 h-9 border-gray-200 text-gray-700 hover:bg-gray-50 shadow-2xs"
        >
          <Link href={CABANG_LIST_PATH}>Kelola Cabang</Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <TriangleAlert className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "TRANSAKSI", value: String(stats.pesanan), tone: "text-gray-900" },
            { label: "JAMAAH", value: String(stats.jamaah), tone: "text-gray-900" },
            { label: "OMZET", value: stats.omzet, tone: "text-gray-900" },
            { label: "SISA TAGIHAN", value: stats.sisa, tone: "text-amber-600" },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs"
            >
              <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                {card.label}
              </div>
              <div className={`text-xl sm:text-2xl font-extrabold mt-2 ${card.tone}`}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <RecordTable
        rows={rows}
        columns={COLUMNS}
        searchKeys={["nama", "kota"]}
        searchPlaceholder="Cari cabang..."
        countLabel={`${rows.length} baris · ${stats?.cabang ?? 0} cabang terdaftar`}
        emptyTitle="Rekap belum tersedia"
        emptyDesc="Tambahkan cabang dan catat pesanan lewat Web Travel agar angkanya muncul di sini."
        emptyHint="Belum ada data per cabang — pesanan lama dari dashboard lama belum punya penaut cabang."
      />

      <div className="flex items-start gap-2 text-xs text-gray-500 pt-1">
        <span className="px-2 py-0.5 rounded border border-gray-200 text-[10px] font-semibold text-gray-700 bg-white shrink-0">
          Catatan
        </span>
        <span className="inline-flex items-start gap-1.5">
          <ChartNoAxesColumn className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
          Omzet memakai total pesanan (
          <span className="font-mono text-[11px]">orders.total_amount</span>) plus
          biaya pesanan warisan (<span className="font-mono text-[11px]">bookings</span>
          ) yang belum punya penaut cabang. Terbayar hanya menjumlah pembayaran yang
          dicatat di Web Travel (<span className="font-mono text-[11px]">payments</span>
          ), jadi kolom <span className="font-mono text-[11px]">dibayar</span> lama yang
          bisa basi tidak dipakai. Jamaah, pesanan, dan pembayaran tanpa cabang
          dikelompokkan ke baris &ldquo;(belum ditautkan ke cabang)&rdquo;.
        </span>
      </div>
    </div>
  );
}
