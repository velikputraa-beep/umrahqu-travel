import React from "react";
import AccessDenied from "@/components/travel/access-denied";
import InstallmentForm from "@/components/travel/installment-form";
import { getTravelContext } from "@/lib/auth/session";
import { listPaymentTargets } from "@/lib/data/payments";
import { saveInstallmentPlan } from "@/lib/data/payment-actions";
import {
  BARU_CICILAN_PATH,
  CICILAN_LIST_PATH,
  canAccessKeuangan,
} from "@/lib/data/payment-fields";

// Jadwal cicilan selalu dimulai bulan depan: membayar cicilan pertama pada hari
// jadwal dibuat bukan maksud fitur ini. Perhitungan bulannya sama dengan
// tambahBulan() di server action, supaya pratinjau = jadwal tersimpan.
function bulanDepan(now = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })
    .format(now)
    .split("-")
    .map(Number);
  const base = new Date(Date.UTC(y, m, 1));
  const hariTerakhir = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)
  ).getUTCDate();
  base.setUTCDate(Math.min(d, hariTerakhir));
  return base.toISOString().slice(0, 10);
}

// Dipakai dari dua arah: tombol "Buat Jadwal" di halaman cicilan (target dipilih
// di dalam form) dan "Jadwal cicilan" di detail pesanan (?target= sudah terisi).
export default async function BaruCicilanPage({ searchParams }) {
  const ctx = await getTravelContext();
  if (!canAccessKeuangan(ctx.profile?.role)) {
    return <AccessDenied title="Hanya Administrator & Keuangan travel yang boleh menyusun jadwal cicilan" />;
  }

  const params = await searchParams;
  const { targets, error } = await listPaymentTargets(ctx);

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
        <p className="text-xs font-semibold text-rose-800">{error}</p>
      </div>
    );
  }

  return (
    <InstallmentForm
      action={saveInstallmentPlan}
      targets={targets}
      selectedRef={params.target ?? null}
      backHref={CICILAN_LIST_PATH}
      defaultDate={bulanDepan()}
    />
  );
}

export { BARU_CICILAN_PATH };
