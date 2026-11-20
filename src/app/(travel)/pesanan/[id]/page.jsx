import React from "react";
import Link from "next/link";
import { ArrowLeft, CircleSlash, Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import OrderPayments from "@/components/travel/order-payments";
import ToastMessage from "@/components/travel/toast-message";
import { getTravelContext } from "@/lib/auth/session";
import { getPaymentDetailView } from "@/lib/data/payments";
import { canAccessKeuangan } from "@/lib/data/payment-fields";
import {
  PESANAN_LIST_PATH,
  UBAH_PESANAN_PATH,
  normalizeOrderStatus,
  normalizePaymentStatus,
  orderStatusLabel,
  paymentStatusLabel,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
} from "@/lib/data/order-fields";

function Chip({ value, label, colors }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${
        colors[value] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {label}
    </span>
  );
}

/**
 * Detail satu pesanan. `id` bisa berupa uuid pesanan portal atau kode pesanan
 * lama ("BRS-..."), jadi kedua dunia dibuka lewat satu rute — dan pembayaran
 * bisa dicatat untuk keduanya (keputusan OQ-4).
 */
export default async function DetailPesananPage({ params, searchParams }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const query = await searchParams;
  const detail = await getPaymentDetailView(ctx, id);

  const canWrite = canAccessKeuangan(ctx.profile?.role);
  const detailHref = `/travel/pesanan/${id}`;

  if (!detail.target) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center gap-3 text-center">
        <CircleSlash className="size-8 text-gray-300" />
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Pesanan tidak ditemukan
          </p>
          <p className="text-xs text-gray-500 mt-1">{detail.error}</p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9 shadow-2xs"
        >
          <Link href={PESANAN_LIST_PATH}>Kembali ke daftar pesanan</Link>
        </Button>
      </div>
    );
  }

  const { target } = detail;
  const status = normalizeOrderStatus(target.orderStatus);
  const pembayaran = normalizePaymentStatus(target.paymentStatus);

  return (
    <div className="space-y-6">
      <ToastMessage key={`${query.toast}:${query.t ?? ""}`} toast={query.toast} />

      <div>
        <Link
          href={PESANAN_LIST_PATH}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Daftar pesanan
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {target.pemesan}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Pesanan <span className="font-mono text-gray-700">{target.kode}</span>{" "}
            · {target.paketNama} · dipesan {target.tanggalLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip value={status} label={orderStatusLabel(status)} colors={ORDER_STATUS_COLORS} />
          <Chip
            value={pembayaran}
            label={paymentStatusLabel(pembayaran)}
            colors={PAYMENT_STATUS_COLORS}
          />
          {target.kind === "portal" && (
            <Button
              asChild
              variant="outline"
              className="text-xs font-semibold h-8 gap-1.5 px-3 border-gray-200 text-gray-700 hover:text-emerald-800"
            >
              <Link href={UBAH_PESANAN_PATH(target.id)}>
                <Pencil className="size-3.5" />
                Ubah
              </Link>
            </Button>
          )}
        </div>
      </div>

      {target.kind === "lama" && (
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-4 flex items-start gap-2.5">
            <Wallet className="size-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-600">
              Ini pesanan lama dari tabel <code>bookings</code>. Data lamanya
              sendiri hanya-baca dari portal ini, tapi pembayaran baru tetap
              bisa dicatat dan langsung menghitung ulang sisa tagihannya.
            </p>
          </CardContent>
        </Card>
      )}

      <OrderPayments
        detail={detail}
        ref_={id}
        detailHref={detailHref}
        canWrite={canWrite}
      />
    </div>
  );
}
