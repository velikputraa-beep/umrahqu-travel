import React from "react";
import { getTravelContext } from "@/lib/auth/session";
import { getPaymentDetailView, listPaymentTargets } from "@/lib/data/payments";
import { recordPayment } from "@/lib/data/payment-actions";
import { canAccessKeuangan } from "@/lib/data/payment-fields";
import PaymentForm from "@/components/travel/payment-form";
import AccessDenied from "@/components/travel/access-denied";
import { CircleSlash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const HARI_INI = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
}).format(new Date());

// Catat pembayaran untuk satu pesanan. `id` boleh uuid pesanan portal atau
// kode pesanan lama — sasaran dikirim apa adanya ke server action.
export default async function BayarPesananPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;

  if (!canAccessKeuangan(ctx.profile?.role)) {
    return (
      <AccessDenied
        title="Hanya Administrator & Keuangan travel yang boleh mencatat pembayaran"
        backHref={`/travel/pesanan/${id}`}
        backLabel="Kembali ke detail pesanan"
      />
    );
  }

  const detail = await getPaymentDetailView(ctx, id);
  if (!detail.target) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center gap-3 text-center">
        <CircleSlash className="size-8 text-gray-300" />
        <p className="text-sm font-semibold text-gray-800">
          Pesanan tidak ditemukan
        </p>
        <p className="text-xs text-gray-500">{detail.error}</p>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9 shadow-2xs"
        >
          <Link href="/travel/pesanan">Kembali ke daftar pesanan</Link>
        </Button>
      </div>
    );
  }

  const { target, money } = detail;
  const { banks } = await listPaymentTargets(ctx);

  return (
    <PaymentForm
      action={recordPayment}
      backHref={`/travel/pesanan/${id}`}
      defaultDate={HARI_INI}
      lanjut={`/travel/pesanan/${id}`}
      banks={banks}
      target={{
        ref: id,
        kode: target.kode,
        pemesan: target.pemesan,
        jenis: target.kind,
        total: money.total,
        totalLabel: money.totalLabel,
        sisa: money.sisa,
        sisaLabel: money.sisaLabel,
      }}
    />
  );
}
