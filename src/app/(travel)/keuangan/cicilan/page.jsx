import React from "react";
import Link from "next/link";
import { Repeat, Plus, CalendarClock, AlertTriangle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InstallmentTable from "@/components/travel/installment-table";
import AccessDenied from "@/components/travel/access-denied";
import ToastMessage from "@/components/travel/toast-message";
import { formatRupiah } from "@/lib/data/dashboard";
import { getTravelContext } from "@/lib/auth/session";
import { listInstallments } from "@/lib/data/payments";
import {
  BARU_CICILAN_PATH,
  CICILAN_LIST_PATH,
  PEMBAYARAN_LIST_PATH,
  canAccessKeuangan,
} from "@/lib/data/payment-fields";

function Stat({ label, value, hint, tone = "gray", icon: Icon }) {
  const warna = {
    gray: "text-gray-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  }[tone];
  return (
    <Card className="border-gray-200/80 shadow-xs">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-3.5 text-gray-400" />}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
        </div>
        <p className={`text-lg font-bold mt-1 ${warna}`}>{value}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// Jadwal dikelompokkan per pesanan: satu kartu = satu sasaran, lengkap dengan
// tombol hapus jadwalnya. `installments` tidak punya deleted_at, jadi hapus di
// sini benar-benar menghapus baris — dan ditolak kalau sudah ada yang lunas.
export default async function CicilanPage({ searchParams }) {
  const ctx = await getTravelContext();
  if (!canAccessKeuangan(ctx.profile?.role)) {
    return <AccessDenied title="Halaman Keuangan khusus Administrator & Keuangan travel" />;
  }

  const params = await searchParams;
  const { rows, stats, error } = await listInstallments(ctx);

  const groups = new Map();
  for (const row of rows) {
    const key = row.targetRef ?? row.kode ?? "-";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Cicilan Pembayaran
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Jatuh tempo dihitung dari tanggal tiap baris jadwal. Status
            Terlambat muncul sendiri begitu tanggalnya lewat — tidak perlu
            diubah manual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="text-xs font-semibold gap-1.5 px-3 h-9 border-gray-200 text-gray-700 hover:text-emerald-800 hover:border-emerald-200"
          >
            <Link href={PEMBAYARAN_LIST_PATH}>
              <Wallet className="size-4" />
              Pembayaran
            </Link>
          </Button>
          <Button
            asChild
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
          >
            <Link href={BARU_CICILAN_PATH}>
              <Plus className="size-4" />
              Buat Jadwal
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-xs font-semibold text-rose-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Sisa tagihan cicilan"
          value={formatRupiah(stats?.tagihan ?? 0)}
          tone="amber"
          icon={Repeat}
        />
        <Stat
          label="Jatuh tempo 30 hari"
          value={stats?.dalam30 ?? 0}
          hint="cicilan belum lunas"
          icon={CalendarClock}
        />
        <Stat
          label="Terlambat"
          value={stats?.telat ?? 0}
          hint="lewat tanggal jatuh tempo"
          tone={stats?.telat ? "rose" : "gray"}
          icon={AlertTriangle}
        />
        <Stat label="Sudah lunas" value={stats?.lunas ?? 0} tone="emerald" />
      </div>

      {groups.size === 0 && !error && (
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <Repeat className="size-8 text-gray-300" />
            <p className="text-sm font-semibold text-gray-800">
              Belum ada jadwal cicilan
            </p>
            <p className="text-xs text-gray-500 max-w-md">
              Buat jadwal dari tombol di atas, atau buka detail pesanan dan pilih
              &ldquo;Jadwal cicilan&rdquo;. Setiap cicilan yang dilunasi otomatis
              menjadi pembayaran.
            </p>
          </CardContent>
        </Card>
      )}

      {[...groups.entries()].map(([key, group]) => (
        <Card key={key} className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900">{group[0].pemesan}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {group[0].detailHref ? (
                    <Link
                      href={group[0].detailHref}
                      className="font-mono text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      {group[0].kode ?? key}
                    </Link>
                  ) : (
                    <span className="font-mono">{group[0].kode ?? key}</span>
                  )}
                  <span className="ml-2 text-gray-400">
                    {group.length} cicilan ·{" "}
                    {formatRupiah(group.reduce((sum, r) => sum + r.sisa, 0))} belum
                    terbayar
                  </span>
                </p>
              </div>
            </div>
            <InstallmentTable rows={group} targetRef={key} lanjut={CICILAN_LIST_PATH} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
