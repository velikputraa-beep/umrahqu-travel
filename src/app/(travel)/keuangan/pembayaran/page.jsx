import React from "react";
import Link from "next/link";
import { Plus, Wallet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PaymentsTable from "@/components/travel/payments-table";
import AccessDenied from "@/components/travel/access-denied";
import ToastMessage from "@/components/travel/toast-message";
import { getTravelContext } from "@/lib/auth/session";
import { listPayments } from "@/lib/data/payments";
import { formatRupiah } from "@/lib/data/dashboard";
import {
  BARU_PEMBAYARAN_PATH,
  CICILAN_LIST_PATH,
  PEMBAYARAN_LIST_PATH,
  canAccessKeuangan,
} from "@/lib/data/payment-fields";

export default async function PembayaranPage({ searchParams }) {
  const ctx = await getTravelContext();
  if (!canAccessKeuangan(ctx.profile?.role)) {
    return (
      <AccessDenied title="Halaman Keuangan khusus Administrator & Keuangan travel" />
    );
  }

  const params = await searchParams;
  const { rows, error, counts, stats, travelName } = await listPayments(ctx);

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Pembayaran</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Uang masuk {travelName ?? "travel Anda"}. Angka di bawah dihitung dari
            tabel pembayaran milik travel ini; baris bertanda entri lama dibaca
            dari buku transaksi lama dan hanya-baca.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="text-xs font-semibold gap-1.5 px-3 h-9 border-gray-200 text-gray-700 hover:text-emerald-800 hover:border-emerald-200"
          >
            <Link href={CICILAN_LIST_PATH}>
              <Wallet className="size-4" />
              Cicilan
            </Link>
          </Button>
          <Button
            asChild
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
          >
            <Link href={BARU_PEMBAYARAN_PATH}>
              <Plus className="size-4" />
              Catat Pembayaran
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <Wallet className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Uang masuk (portal)
            </p>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {formatRupiah(stats?.masuk ?? 0)}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Termasuk status menunggu verifikasi
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Menunggu verifikasi
            </p>
            <p className="text-lg font-bold text-amber-700 mt-1">
              {stats?.menunggu ?? 0}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              pembayaran berstatus pending
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Sumber baris
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {counts?.portal ?? 0} + {counts?.lama ?? 0}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              pembayaran portal + transaksi lama
            </p>
          </CardContent>
        </Card>
      </div>

      {rows.length > 0 && (counts?.lama ?? 0) > 0 && (
        <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">
            Nominal transaksi lama tidak dijumlahkan ke angka &ldquo;uang
            masuk&rdquo; karena sudah tercatat di kolom dibayar pesanannya.
            Membatalkan pembayaran portal akan langsung menurunkan angka pesanan
            yang bersangkutan.
          </p>
        </div>
      )}

      <PaymentsTable rows={rows} showTarget lanjut={PEMBAYARAN_LIST_PATH} />
    </div>
  );
}
