import React from "react";
import Link from "next/link";
import { Plus, Repeat, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PaymentsTable from "@/components/travel/payments-table";
import InstallmentTable from "@/components/travel/installment-table";
import {
  BARU_CICILAN_PATH,
  BAYAR_PESANAN_PATH,
  CICILAN_LIST_PATH,
} from "@/lib/data/payment-fields";

function Stat({ label, value, tone = "gray", hint }) {
  const warna = {
    gray: "text-gray-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  }[tone];
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`text-lg font-bold mt-1 ${warna}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

/**
 * Kartu keuangan pada halaman detail pesanan. Angka-angkanya diambil dari
 * `getPaymentDetailView`, jadi total / masuk / sisa di sini selalu sama dengan
 * yang tampil di tabel daftar pesanan.
 *
 * `canWrite` = role boleh mengelola keuangan (OQ-7). Role lain tetap melihat
 * ringkasan uangnya, hanya tanpa tombol aksi.
 */
export default function OrderPayments({ detail, ref_, detailHref, canWrite }) {
  const { target, money, payments, installments, jumlahPortal } = detail;
  const adaLama = payments.some((p) => p.asal === "lama");

  return (
    <Card className="border-gray-200/80 shadow-xs">
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Pembayaran</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {target.kind === "lama"
                ? "Pesanan lama: uang yang tercatat sebelum portal ini dipakai jadi titik awal, pembayaran baru dihitung di atasnya."
                : "Uang masuk dihitung dari riwayat pembayaran, bukan diketik manual."}
            </p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                className="text-xs font-semibold h-9 gap-1.5 border-gray-200 text-gray-700 hover:text-emerald-800"
              >
                <Link href={`${BARU_CICILAN_PATH}?target=${encodeURIComponent(ref_)}`}>
                  <Repeat className="size-4" />
                  Jadwal cicilan
                </Link>
              </Button>
              <Button
                asChild
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9 gap-1.5 shadow-2xs"
              >
                <Link href={BAYAR_PESANAN_PATH(ref_)}>
                  <Plus className="size-4" />
                  Catat Pembayaran
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <Stat label="Total tagihan" value={money.totalLabel} />
          <Stat
            label="Sudah dibayar"
            value={money.dibayarLabel}
            tone="emerald"
            hint={
              target.kind === "lama"
                ? `${money.portalLabel} dicatat dari portal ini`
                : `${jumlahPortal} pembayaran tercatat`
            }          />
          <Stat
            label="Sisa tagihan"
            value={money.sisaLabel}
            tone={money.sisa > 0 ? "amber" : "emerald"}
            hint={money.lebih > 0 ? `Kelebihan bayar ${money.lebihLabel}` : undefined}
          />
        </div>

        <div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${money.persen}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {money.persen}% terbayar
            {money.persen >= 100 ? " — lunas." : "."}
          </p>
        </div>

        {adaLama && (
          <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <Info className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-600">
              Baris bertanda <span className="font-semibold">entri lama</span>{" "}
              dibaca dari tabel <code>transactions</code> dan sengaja tidak
              dijumlahkan — nominalnya sudah termasuk di kolom dibayar pesanan
              lama, jadi menghitungnya lagi membuat uang terhitung dua kali.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900">Riwayat pembayaran</h3>
            <span className="text-[11px] text-gray-400">
              terbaru lebih dulu
            </span>
          </div>
          {detail.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-xs font-semibold text-rose-800">{detail.error}</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Angka di atas hanya memuat pembayaran yang berhasil dibaca, jadi
                perbaiki koneksi database sebelum mencatat pembayaran baru.
              </p>
            </div>
          )}
          <PaymentsTable rows={payments} lanjut={detailHref} />
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-900">Jadwal cicilan</h3>
            {installments.length > 0 && (
              <Link
                href={CICILAN_LIST_PATH}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Semua jadwal
              </Link>
            )}
          </div>
          {installments.length === 0 ? (
            <p className="text-xs text-gray-500 py-3">
              Belum ada jadwal cicilan untuk pesanan ini.
            </p>
          ) : (
            <InstallmentTable
              rows={installments}
              targetRef={ref_}
              lanjut={detailHref}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
