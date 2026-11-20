import React from "react";
import Link from "next/link";
import {
  CalendarRange,
  Plus,
  ShoppingCart,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { getOrderDashboard, PESANAN_LIST_PATH } from "@/lib/data/orders";
import { formatRupiah } from "@/lib/data/dashboard";
import { ORDER_STATUS_COLORS } from "@/lib/data/order-fields";

function StatCard({ title, value, caption, icon: Icon }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{title}</span>
        <Icon className="size-4 text-emerald-600" />
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-3">{value}</div>
      <p className="text-[11px] text-gray-500 mt-1">{caption}</p>
    </div>
  );
}

// Sumbu Y dibulatkan ke atas supaya batang tidak pernah menyentuh garis teratas.
function skalaMax(max) {
  if (max <= 4) return 4;
  if (max <= 10) return 10;
  return Math.ceil(max / 5) * 5;
}

function TrenPesanan({ series }) {
  const max = skalaMax(Math.max(...series.map((s) => s.orders), 1));
  const ticks = [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];

  return (
    <div className="h-64 w-full flex flex-col justify-between">
      <div className="relative h-52 w-full">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {ticks.map((t, i) => (
            <div
              key={`${t}-${i}`}
              className={`w-full flex items-center border-b ${
                i === ticks.length - 1 ? "border-gray-200" : "border-gray-100 border-dashed"
              }`}
            >
              <span className="pr-2 text-[10px] text-gray-400 -translate-y-1">{t}</span>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 left-6 flex items-end justify-between gap-2">
          {series.map((s) => (
            <div
              key={s.key}
              className="flex-1 h-full flex flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] font-semibold text-gray-600">
                {s.orders > 0 ? s.orders : ""}
              </span>
              <div
                className={`w-full max-w-10 rounded-t-md transition-all ${
                  s.orders > 0 ? "bg-emerald-600/85" : "bg-gray-100"
                }`}
                style={{ height: `${(s.orders / max) * 100}%` }}
                title={`${s.label}: ${s.orders} pesanan · ${formatRupiah(s.revenue)} masuk`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pl-6 gap-2 pt-2 text-[11px] text-gray-500">
        {series.map((s) => (
          <span key={s.key} className="flex-1 text-center truncate">
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DistribusiStatus({ items, total }) {
  const terbesar = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.value}>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-medium text-gray-700">{item.label}</span>
            <span className="text-gray-500">
              {item.count} · {Math.round((item.count / total) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-2 rounded-full border ${
                ORDER_STATUS_COLORS[item.value] ?? "bg-gray-200 border-gray-300"
              }`}
              style={{ width: `${(item.count / terbesar) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function PesananDashboardPage() {
  const ctx = await getTravelContext();
  const data = await getOrderDashboard(ctx);
  const { stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Dashboard Pesanan
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.travelName
              ? `Rekap pesanan ${data.travelName}`
              : "Rekap pesanan sesuai hak akses akun Anda"}
            {data.diLuarRentang > 0
              ? ` · ${data.diLuarRentang} pesanan di luar 6 bulan terakhir tidak masuk grafik`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 shadow-2xs">
            <CalendarRange className="size-3.5 text-gray-500" />
            <span>6 bulan terakhir</span>
          </div>
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

      {data.error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <TriangleAlert className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-rose-800">{data.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pesanan"
          value={String(stats.orderCount)}
          caption={`${stats.mandiri} dibuat di portal, ${stats.lama} entri lama`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Nilai Pesanan"
          value={formatRupiah(stats.nilai)}
          caption={`${formatRupiah(stats.terkumpul)} sudah masuk`}
          icon={CalendarRange}
        />
        <StatCard
          title="Sisa Tagihan"
          value={formatRupiah(stats.tertunda)}
          caption={`${stats.lunas} pesanan sudah lunas`}
          icon={Users}
        />
        <StatCard
          title="Perlu Tindakan"
          value={String(stats.perluTindakan)}
          caption={`${stats.dibatalkan} dibatalkan / direfund`}
          icon={TriangleAlert}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Tren Pesanan</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Jumlah pesanan per bulan (bookings + orders digabung)
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              {stats.orderCount} Pesanan
            </span>
          </div>
          {stats.orderCount === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-gray-400 border-b border-gray-200">
              Belum ada pesanan dalam 6 bulan terakhir.
            </div>
          ) : (
            <TrenPesanan series={data.series} />
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 mb-5">Status Pesanan</h2>
          {data.statusDist.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada pesanan.</p>
          ) : (
            <DistribusiStatus items={data.statusDist} total={stats.orderCount} />
          )}
          <p className="text-[11px] text-gray-400 mt-5 pt-4 border-t border-gray-100">
            Status entri lama dan pesanan portal dinormalisasi ke kode yang sama,
            jadi satu grafik bisa membandingkan keduanya.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Pesanan Terbaru</h2>
          <Link
            href={PESANAN_LIST_PATH}
            className="text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors"
          >
            Lihat semua
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-500">
            Belum ada pesanan tercatat.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.recent.map((row) => (
              <div
                key={`${row.asal}-${row.id}`}
                className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-gray-50/80 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-gray-900 truncate">
                    {row.kode}
                  </p>
                  <p className="text-gray-500 truncate">
                    {row.pemesan} · {row.paketNama}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-gray-900">{row.totalLabel}</p>
                  <p className="text-gray-500">{row.tanggalLabel}</p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${
                    ORDER_STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {row.statusLabel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
