import React from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { listPackages } from "@/lib/data/packages";
import PackagesTable from "@/components/travel/packages-table";
import ToastMessage from "@/components/travel/toast-message";

export default async function PaketUmrahPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, error } = await listPackages(ctx);
  const isSuperAdmin = ctx.profile?.role === "super_admin";

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Paket
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Paket perjalanan yang tersedia di marketplace dan website travel.
            {isSuperAdmin
              ? " Mode super admin: semua travel tampil."
              : ` Yang tampil hanya paket ${ctx.travelName ?? "travel Anda"}.`}
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
        >
          <Link href="/travel/master-data/paket-umrah/baru">
            <Plus className="size-4" />
            <span>Paket Baru</span>
          </Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <Package className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      <PackagesTable rows={rows} showTravel={isSuperAdmin} />
    </div>
  );
}
