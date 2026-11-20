import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getTravelContext } from "@/lib/auth/session";
import { listPilgrims, JAMAAH_LIST_PATH } from "@/lib/data/pilgrims";
import PilgrimDocuments from "@/components/travel/pilgrim-documents";
import ToastMessage from "@/components/travel/toast-message";

export default async function DokumenJamaahPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, error } = await listPilgrims(ctx);
  const isSuperAdmin = ctx.profile?.role === "super_admin";

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Dokumen Jamaah
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            KTP, KK, Paspor, dan Sertifikat Vaksin per jamaah. Berkas
            disimpan di bucket privat dan hanya travel pemilik jamaah yang bisa
            membukanya.
            {isSuperAdmin ? " Mode super admin: semua travel tampil." : ""}
          </p>
        </div>
        <Link
          href={JAMAAH_LIST_PATH}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline whitespace-nowrap"
        >
          <FileText className="size-4" />
          Daftar jamaah
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <FileText className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      <PilgrimDocuments rows={rows} />
    </div>
  );
}
