import React from "react";
import Link from "next/link";
import { Plus, ShoppingCart, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { listOrders, PESANAN_LIST_PATH, PESANAN_DASHBOARD_PATH } from "@/lib/data/orders";
import OrdersTable from "@/components/travel/orders-table";
import ToastMessage from "@/components/travel/toast-message";

export default async function PesananPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, error, counts, legacyDitampilkan, travelName } = await listOrders(ctx);
  const isSuperAdmin = ctx.profile?.role === "super_admin";
  const jumlah = counts ?? { mandiri: 0, lama: 0 };

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Pesanan</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isSuperAdmin
              ? "Mode super admin: pesanan semua travel tampil."
              : `Yang tampil hanya pesanan ${travelName ?? "travel Anda"}.`}{" "}
            {jumlah.lama} entri lama dari tabel bookings, {jumlah.mandiri} pesanan
            dibuat dari portal ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="text-xs font-semibold gap-1.5 px-3 h-9 border-gray-200 text-gray-700 hover:text-emerald-800 hover:border-emerald-200"
          >
            <Link href={PESANAN_DASHBOARD_PATH}>
              <ShoppingCart className="size-4" />
              Dashboard Pesanan
            </Link>
          </Button>
          <Button
            asChild
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
          >
            <Link href={`${PESANAN_LIST_PATH}/baru`}>
              <Plus className="size-4" />
              <span>Buat Pesanan</span>
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <ShoppingCart className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      {!legacyDitampilkan && !error && (
        <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">
            Entri lama di tabel <code className="bg-amber-100 px-1 rounded">bookings</code>{" "}
            tidak ikut ditampilkan karena nama travel pada akun ini belum cocok
            dengan kolom <code className="bg-amber-100 px-1 rounded">travel</code>.
            Yang tampil sekarang hanya pesanan yang dibuat dari portal ini.
          </p>
        </div>
      )}

      <OrdersTable rows={rows} showTravel={isSuperAdmin} />
    </div>
  );
}
