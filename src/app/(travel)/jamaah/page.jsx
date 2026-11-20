import React from "react";
import Link from "next/link";
import { Plus, Users, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTravelContext } from "@/lib/auth/session";
import { listPilgrims, JAMAAH_LIST_PATH } from "@/lib/data/pilgrims";
import PilgrimsTable from "@/components/travel/pilgrims-table";
import ToastMessage from "@/components/travel/toast-message";

function StatCard({ title, value, hint, badge }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500">{title}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
          {badge}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-3">{value}</div>
      <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

const persen = (n, total) => (total ? Math.round((n / total) * 100) : 0);

export default async function JamaahPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { rows, error } = await listPilgrims(ctx);
  const isSuperAdmin = ctx.profile?.role === "super_admin";

  const total = rows.length;
  const lengkap = rows.filter((r) => r.docCount === r.docTotal).length;
  const dikonfirmasi = rows.filter((r) => r.status === "confirmed").length;
  const menunggu = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Jamaah
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Data jamaah dan kelengkapan dokumennya.
            {isSuperAdmin
              ? " Mode super admin: semua travel tampil."
              : ` Yang tampil hanya jamaah ${ctx.travelName ?? "travel Anda"}.`}
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
        >
          <Link href={`${JAMAAH_LIST_PATH}/baru`}>
            <Plus className="size-4" />
            <span>Jamaah Baru</span>
          </Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <UserRoundX className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, cek koneksi Supabase.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Jamaah terdaftar"
          value={total}
          badge="aktif"
          hint={`${lengkap} dokumen lengkap (${persen(lengkap, total)}%)`}
        />
        <StatCard
          title="Dikonfirmasi"
          value={dikonfirmasi}
          badge={`${persen(dikonfirmasi, total)}%`}
          hint="Status jamaah sudah dikonfirmasi"
        />
        <StatCard
          title="Menunggu"
          value={menunggu}
          badge={`${persen(menunggu, total)}%`}
          hint="Belum diproses oleh travel"
        />
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <Users className="size-3.5 text-gray-400" />
        Kelengkapan dokumen dihitung dari 4 jenis: KTP, KK, Paspor, dan
        Sertifikat Vaksin.
        <Link
          href={`${JAMAAH_LIST_PATH}/dokumen`}
          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          Kelola dokumen
        </Link>
      </div>

      <PilgrimsTable rows={rows} showTravel={isSuperAdmin} />
    </div>
  );
}
