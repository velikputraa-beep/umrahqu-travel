import React from "react";
import PilgrimForm from "@/components/travel/pilgrim-form";
import { savePilgrim } from "@/lib/data/pilgrim-actions";
import { getTravelContext } from "@/lib/auth/session";
import { listPackageOptions, JAMAAH_LIST_PATH } from "@/lib/data/pilgrims";

export default async function BaruJamaahPage() {
  const ctx = await getTravelContext();
  const { options } = await listPackageOptions(ctx);

  return (
    <PilgrimForm
      action={savePilgrim}
      backHref={JAMAAH_LIST_PATH}
      packageOptions={options}
    />
  );
}
