import React from "react";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { listHotels } from "@/lib/data/master-data";
import { deleteHotel } from "@/lib/data/master-actions";
import { HOTEL_LIST_PATH } from "@/lib/data/record-fields";
import RecordTable from "@/components/travel/record-table";
import ToastMessage from "@/components/travel/toast-message";

const COLUMNS = [
  { key: "nama", label: "Nama Hotel", type: "title", subKey: "alamat", glyph: "hotel" },
  { key: "kota", label: "Kota" },
  { key: "bintang", label: "Bintang", type: "stars" },
  { key: "jarak", label: "Jarak", type: "muted" },
];

export default async function MasterHotelPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, error } = await listHotels(ctx);
  const milikSendiri = rows.filter((r) => !r.shared).length;

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Master Hotel
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Hotel yang dipakai di paket umrah {ctx.travelName ?? "travel Anda"}.
            Baris master platform ikut tampil tapi hanya bisa diubah super admin.
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
        >
          <Link href={`${HOTEL_LIST_PATH}/baru`}>
            <Plus className="size-4" />
            <span>Tambah Hotel</span>
          </Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <Building2 className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      <RecordTable
        rows={rows}
        columns={COLUMNS}
        searchKeys={["nama", "kota", "jarak"]}
        searchPlaceholder="Cari nama hotel atau kota..."
        countLabel={`${rows.length} hotel · ${milikSendiri} milik travel Anda`}
        emptyTitle="Belum ada hotel"
        emptyDesc="Tambahkan hotel agar bisa dipilih saat menyusun paket umrah."
        deleteAction={deleteHotel}
        confirmLabel="Hapus hotel ini?"
        emptyHint={
          rows.length > 0
            ? undefined
            : "Belum ada hotel yang tersimpan di database."
        }
      />
    </div>
  );
}
