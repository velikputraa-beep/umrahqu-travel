import React from "react";
import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { listAgents } from "@/lib/data/master-data";
import { deleteAgent } from "@/lib/data/master-actions";
import { AGEN_LIST_PATH } from "@/lib/data/record-fields";
import RecordTable from "@/components/travel/record-table";
import ToastMessage from "@/components/travel/toast-message";

const COLUMNS = [
  { key: "nama", label: "Nama Agen", type: "title", subKey: "referral", glyph: "agen" },
  { key: "kontak", label: "Kontak" },
  { key: "komisi", label: "Komisi", type: "muted" },
  { key: "badge", label: "Status", type: "badge" },
];

export default async function AgenResellerPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, error } = await listAgents(ctx);

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Agen &amp; Reseller
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Daftar perorangan yang mendatangkan jamaah untuk{" "}
            {ctx.travelName ?? "travel Anda"} beserta besaran komisinya.
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
        >
          <Link href={`${AGEN_LIST_PATH}/baru`}>
            <Plus className="size-4" />
            <span>Tambah Agen</span>
          </Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <UserRound className="size-4 text-rose-600 shrink-0 mt-0.5" />
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
        searchKeys={["nama", "kontak", "referral"]}
        searchPlaceholder="Cari nama, kontak, atau kode referral..."
        countLabel={`${rows.length} agen aktif/nonaktif`}
        emptyTitle="Belum ada agen"
        emptyDesc="Tambahkan agen agar komisi jamaah binaan mereka bisa dihitung."
        deleteAction={deleteAgent}
        confirmLabel="Hapus agen ini?"
      />
    </div>
  );
}
