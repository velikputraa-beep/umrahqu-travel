import Link from "next/link";
import {
  Calendar,
  TrendingUp,
  Package,
  CreditCard,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { getTravelContext } from "@/lib/auth/session";
import {
  formatRupiah,
  getDashboardData,
  parseRupiah,
  statusBadge,
} from "@/lib/data/dashboard";

const CHART_HEIGHT = 144;

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

function TrendChart({ series }) {
  const max = Math.max(...series.map((s) => s.revenue), 0);
  const step = 500 / (series.length - 1 || 1);
  const points = series.map((s, i) => ({
    x: i * step,
    y: max > 0 ? 150 - (s.revenue / max) * 130 : 150,
    ...s,
  }));
  const path = points.map((p) => `${p.x} ${p.y}`).join(" L ");

  return (
    <div className="h-56 w-full pt-4 flex flex-col justify-end">
      <div className="relative h-40 w-full">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          <div className="border-b border-gray-100 border-dashed w-full" />
          <div className="border-b border-gray-100 border-dashed w-full" />
          <div className="border-b border-gray-100 border-dashed w-full" />
          <div className="border-b border-gray-200 w-full" />
        </div>

        <svg
          viewBox="0 0 500 160"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <path d={`M ${path}`} fill="none" stroke="#10b981" strokeWidth="2.5" />
          {points.map((p) => (
            <circle key={p.key} cx={p.x} cy={p.y} r="4" fill="#10b981">
              <title>{`${p.label}: ${formatRupiah(p.revenue)} dari ${p.orders} pesanan`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="flex justify-between px-2 pt-2 text-[11px] text-gray-500">
        {series.map((s) => (
          <span key={s.key}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

function ChannelChart({ series, channels }) {
  const max = Math.max(...series.map((s) => s.orders), 0);

  return (
    <div className="h-56 w-full pt-4 flex flex-col justify-end">
      <div
        className="border-b border-gray-200 flex items-end justify-between px-4 sm:px-8"
        style={{ height: CHART_HEIGHT }}
      >
        {series.map((bucket) => {
          const height = max > 0 ? (bucket.orders / max) * 100 : 0;
          return (
            <div key={bucket.key} className="flex flex-col items-center gap-2 h-full justify-end">
              <div className="flex flex-col-reverse w-6" style={{ height: `${height}%` }}>
                {channels.map((ch) => {
                  const count = bucket.sumber[ch.name] || 0;
                  if (!count) return null;
                  return (
                    <div
                      key={ch.name}
                      className={`w-full first:rounded-t-sm ${ch.color}`}
                      style={{ height: `${(count / bucket.orders) * 100}%` }}
                      title={`${bucket.label} — ${ch.name}: ${count}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between px-2 sm:px-6 pt-2 text-[11px] text-gray-500">
        {series.map((s) => (
          <span key={s.key}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getTravelContext();
  const data = await getDashboardData(ctx);
  const { stats } = data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.scoped
              ? `Data ${data.travelName || "seluruh travel"} sesuai hak akses akun Anda`
              : "Akun ini belum ditautkan ke travel mana pun"}
          </p>
        </div>
        {data.period && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 shadow-xs">
            <Calendar className="size-3.5 text-gray-500" />
            <span>{data.period}</span>
          </div>
        )}
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pendapatan"
          value={formatRupiah(stats.revenue)}
          caption={
            stats.outstanding > 0
              ? `Sisa tagihan ${formatRupiah(stats.outstanding)}`
              : "Tidak ada sisa tagihan"
          }
          icon={TrendingUp}
        />
        <StatCard
          title="Paket"
          value={String(stats.packageCount)}
          caption={`${stats.activePackages} paket aktif`}
          icon={Package}
        />
        <StatCard
          title="Pesanan"
          value={String(stats.orderCount)}
          caption={`${stats.paidCount} sudah lunas`}
          icon={CreditCard}
        />
        <StatCard
          title="Jamaah"
          value={String(stats.pilgrimCount)}
          caption={`${stats.seatsFilled} kursi paket terisi`}
          icon={Users}
        />
      </div>

      {!data.scoped && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          Belum ada data untuk ditampilkan karena akun Anda belum memiliki{" "}
          <code className="text-xs bg-amber-100 px-1 rounded">travel_id</code> di{" "}
          <code className="text-xs bg-amber-100 px-1 rounded">profiles</code>. Hubungi
          administrator untuk menautkan akun ke travel Anda.
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Kanal Penjualan</h2>
              <p className="text-xs text-gray-400 mt-0.5">6 bulan terakhir</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              {stats.orderCount} Pesanan
            </span>
          </div>

          {stats.orderCount === 0 ? (
            <EmptyChart height={CHART_HEIGHT} label="Belum ada pesanan pada 6 bulan terakhir" />
          ) : (
            <>
              <ChannelChart series={data.series} channels={data.channels} />
              <div className="flex items-center flex-wrap gap-x-5 gap-y-2 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
                {data.channels.map((ch) => (
                  <div key={ch.name} className="flex items-center gap-1.5">
                    <span className={`size-2.5 rounded-full ${ch.color}`} />
                    <span>
                      {ch.name} ({ch.count})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Tren Pendapatan</h2>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                {formatRupiah(stats.revenue)}
              </p>
            </div>
            <span className="text-xs text-gray-500">terkumpul per bulan</span>
          </div>

          {stats.revenue === 0 ? (
            <EmptyChart height={160} label="Belum ada pembayaran tercatat" />
          ) : (
            <TrendChart series={data.series} />
          )}
        </div>
      </div>

      {/* Pesanan Terbaru Card */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Pesanan Terbaru</h2>
          <Link
            href="/travel/pesanan"
            className="text-xs font-medium text-gray-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
          >
            Selengkapnya <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {data.recent.length === 0 ? (
          <p className="p-8 text-center text-xs text-gray-500">
            Belum ada pesanan untuk travel ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-600 font-semibold">
                  <th className="py-3 px-4">ID Pesanan</th>
                  <th className="py-3 px-4">Paket & Jamaah</th>
                  <th className="py-3 px-4">Biaya & Sisa</th>
                  <th className="py-3 px-4">Pembayaran</th>
                  <th className="py-3 px-4">Status Pesanan</th>
                  <th className="py-3 px-4">Sumber</th>
                  <th className="py-3 px-4">Tgl. Pesan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {data.recent.map((order) => {
                  const sisa = parseRupiah(order.sisa);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                        {order.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900">{order.paket}</div>
                        <div className="text-[11px] text-gray-500">{order.pemesan}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">
                          {formatRupiah(parseRupiah(order.biaya))}
                        </div>
                        {sisa > 0 && (
                          <div className="text-[11px] text-rose-600 font-medium">
                            - {formatRupiah(sisa)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${statusBadge(order.pembayaran)}`}
                        >
                          {order.pembayaran}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${statusBadge(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">
                          {order.sumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{order.tglPesan}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ height, label }) {
  return (
    <div
      className="w-full flex items-center justify-center border-b border-gray-200 text-xs text-gray-400"
      style={{ height }}
    >
      {label}
    </div>
  );
}
