import React from "react";
import { Bed, Bus, ClipboardList } from "lucide-react";
import { getTravelContext } from "@/lib/auth/session";
import { listManifest } from "@/lib/data/keberangkatan";
import { MANIFEST_LIST_PATH } from "@/lib/data/record-fields";
import RecordTable from "@/components/travel/record-table";
import PackagePicker from "@/components/travel/package-picker";
import ToastMessage from "@/components/travel/toast-message";

const COLUMNS = [
  { key: "nama", label: "Nama Jamaah", type: "title", subKey: "paket", glyph: "jamaah" },
  { key: "kamar", label: "Kamar", type: "muted" },
  { key: "kursi", label: "Kursi", type: "muted" },
  { key: "badge", label: "Status", type: "badge" },
];

function ProgressCard({ label, percent, icon: Icon }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
      <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase flex items-center gap-1">
        <Icon className="size-3 text-gray-400" />
        {label}
      </div>
      <div className="text-xl font-extrabold mt-2 text-gray-900">{percent}%</div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
        <div
          className="bg-emerald-600 h-1.5 rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default async function ManifestPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, paket, selected, stats, error } = await listManifest(ctx, params.paket);

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          Manifest &amp; Penempatan
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Atur nomor kamar dan kursi jamaah per paket keberangkatan
          {ctx.travelName ? ` · ${ctx.travelName}` : ""}.
        </p>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
        <h2 className="text-xs font-semibold text-gray-700 mb-3">Sumber Paket</h2>
        <PackagePicker
          basePath={MANIFEST_LIST_PATH}
          packages={paket}
          value={selected?.id}
          label="Paket keberangkatan"
        />
        {paket.length === 0 && (
          <p className="text-[11px] text-amber-700 mt-2">
            Travel Anda belum punya paket. Buat paket dulu di Master Data &rsaquo; Paket
            Umrah agar manifest bisa disusun.
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <ClipboardList className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "TOTAL JAMAAH", value: stats.total, tone: "text-gray-900" },
            { label: "BELUM DAPAT KAMAR", value: stats.belumKamar, tone: "text-amber-600" },
            { label: "BELUM DAPAT KURSI", value: stats.belumKursi, tone: "text-amber-600" },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs"
            >
              <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                {card.label}
              </div>
              <div className={`text-xl font-extrabold mt-2 ${card.tone}`}>{card.value}</div>
            </div>
          ))}
          <ProgressCard label="PENEMPATAN KAMAR" percent={stats.persenKamar} icon={Bed} />
          <ProgressCard label="PENEMPATAN KURSI" percent={stats.persenKursi} icon={Bus} />
        </div>
      )}

      <RecordTable
        rows={rows}
        columns={COLUMNS}
        searchKeys={["nama", "kamar", "kursi"]}
        searchPlaceholder="Cari nama jamaah..."
        countLabel={`${rows.length} jamaah${selected ? ` · ${selected.nama}` : ""}`}
        emptyTitle={selected ? "Belum ada jamaah di paket ini" : "Manifest belum tersedia"}
        emptyDesc="Tautkan jamaah ke paket ini lewat menu Jamaah agar mereka muncul di manifest."
        showActions
      />
    </div>
  );
}
