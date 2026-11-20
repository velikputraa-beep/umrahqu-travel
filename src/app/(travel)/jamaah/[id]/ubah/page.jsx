import React from "react";
import Link from "next/link";
import { UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import PilgrimForm from "@/components/travel/pilgrim-form";
import { savePilgrim } from "@/lib/data/pilgrim-actions";
import {
  getEditablePilgrim,
  listPackageOptions,
  JAMAAH_LIST_PATH,
} from "@/lib/data/pilgrims";
import { getTravelContext } from "@/lib/auth/session";

export default async function UbahJamaahPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const pilgrim = await getEditablePilgrim(ctx, id);
  const { options } = await listPackageOptions(ctx);

  if (!pilgrim) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center gap-3 text-center">
        <UserRoundX className="size-8 text-gray-300" />
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Jamaah tidak ditemukan
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Jamaah dengan kode{" "}
            <span className="font-mono text-gray-700">{id.slice(0, 8)}…</span>{" "}
            tidak ada, sudah dihapus, atau bukan milik travel Anda.
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9 shadow-2xs"
        >
          <Link href={JAMAAH_LIST_PATH}>Kembali ke daftar jamaah</Link>
        </Button>
      </div>
    );
  }

  return (
    <PilgrimForm
      action={savePilgrim}
      backHref={JAMAAH_LIST_PATH}
      packageOptions={options}
      initial={pilgrim}
    />
  );
}
