import React from "react";
import RecordForm from "@/components/travel/record-form";
import { getTravelContext } from "@/lib/auth/session";
import { listJamaahOptions } from "@/lib/data/keberangkatan";
import { savePerlengkapan } from "@/lib/data/keberangkatan-actions";
import { PERLENGKAPAN_LIST_PATH, perlengkapanFields } from "@/lib/data/record-fields";

export default async function PerlengkapanBaruPage() {
  const ctx = await getTravelContext();
  const jamaah = await listJamaahOptions(ctx);

  return (
    <RecordForm
      heading="Tambah Perlengkapan"
      description="Catat item yang akan diserahkan ke jamaah. Tautkan ke jamaah agar riwayatnya jelas."
      action={savePerlengkapan}
      fields={perlengkapanFields(jamaah)}
      initial={{ status: "not_delivered", jumlah: 1 }}
      backHref={PERLENGKAPAN_LIST_PATH}
      backLabel="Kembali ke Perlengkapan"
      submitLabel="Simpan Perlengkapan"
    />
  );
}
