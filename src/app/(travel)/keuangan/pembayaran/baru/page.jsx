import React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PaymentForm from "@/components/travel/payment-form";
import AccessDenied from "@/components/travel/access-denied";
import { getTravelContext } from "@/lib/auth/session";
import { getPaymentDetailView, listPaymentTargets } from "@/lib/data/payments";
import { recordPayment } from "@/lib/data/payment-actions";
import {
  BARU_PEMBAYARAN_PATH,
  PEMBAYARAN_LIST_PATH,
  canAccessKeuangan,
} from "@/lib/data/payment-fields";

const HARI_INI = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
}).format(new Date());

// Langkah 1 = pilih pesanan (daftar dari server, tanpa state klien),
// langkah 2 = form yang sama dengan yang ada di halaman detail pesanan.
export default async function BaruPembayaranPage({ searchParams }) {
  const ctx = await getTravelContext();
  if (!canAccessKeuangan(ctx.profile?.role)) {
    return (
      <AccessDenied
        title="Hanya Administrator & Keuangan travel yang boleh mencatat pembayaran"
        backHref={PEMBAYARAN_LIST_PATH}
        backLabel="Kembali ke daftar pembayaran"
      />
    );
  }

  const params = await searchParams;
  const { targets, banks, error } = await listPaymentTargets(ctx);
  const ref = String(params.target ?? "").trim();

  if (ref) {
    const detail = await getPaymentDetailView(ctx, ref);
    const chosen = targets.find((t) => t.ref === ref);
    if (!detail.target) {
      return (
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-800">
              Pesanan tidak ditemukan
            </p>
            <p className="text-xs text-gray-500">{detail.error}</p>
            <Button
              asChild
              variant="outline"
              className="text-xs font-semibold h-9 border-gray-200 text-gray-700"
            >
              <Link href={BARU_PEMBAYARAN_PATH}>Pilih pesanan lain</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <PaymentForm
        action={recordPayment}
        banks={banks}
        defaultDate={HARI_INI}
        backHref={BARU_PEMBAYARAN_PATH}
        target={{
          ref,
          kode: detail.target.kode,
          pemesan: detail.target.pemesan,
          jenis: detail.target.kind,
          total: detail.money.total,
          totalLabel: detail.money.totalLabel,
          // Daftar penarget sudah menyaring pesanan ber_sisa_, jadi angkanya
          // dipakai apa adanya; pesanan lunas datang dari tautan detail.
          sisa: chosen ? chosen.sisa : detail.money.sisa,
          sisaLabel: chosen ? chosen.sisaLabel : detail.money.sisaLabel,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={PEMBAYARAN_LIST_PATH}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar pembayaran
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          Catat Pembayaran
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Pilih pesanan yang masih punya sisa tagihan. Pesanan lama (kode
          booking) juga bisa dipilih sejak modul ini menerima pembayaran untuk
          keduanya.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-xs font-semibold text-rose-800">{error}</p>
        </div>
      )}

      {targets.length === 0 && !error && (
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-10 text-center space-y-2">
            <Wallet className="size-8 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-800">
              Tidak ada pesanan bertunggakan
            </p>
            <p className="text-xs text-gray-500">
              Semua pesanan travel ini sudah lunas, jadi tidak ada yang bisa
              dicatat pembayarannya sekarang.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200/80 shadow-xs">
        <CardContent className="divide-y divide-gray-100 p-0">
          {targets.map((t) => (
            <Link
              key={t.ref}
              href={`${BARU_PEMBAYARAN_PATH}?target=${encodeURIComponent(t.ref)}`}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {t.pemesan}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  <span className="font-mono">{t.kode}</span>
                  {t.jenis === "lama" && (
                    <span className="ml-2 text-[10px] font-semibold uppercase text-amber-700">
                      pesanan lama
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-xs font-bold text-amber-700">{t.sisaLabel}</p>
                  <p className="text-[10px] text-gray-400">sisa tagihan</p>
                </div>
                <ChevronRight className="size-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
