import React from "react";
import RecordForm from "@/components/travel/record-form";
import { getTravelContext } from "@/lib/auth/session";
import { listPackageOptions } from "@/lib/data/pilgrims";
import { saveManasik } from "@/lib/data/keberangkatan-actions";
import { MANASIK_LIST_PATH, manasikFields } from "@/lib/data/record-fields";

export default async function ManasikBaruPage() {
  const ctx = await getTravelContext();
  const { options } = await listPackageOptions(ctx);

  return (
    <RecordForm
      heading="Tambah Jadwal Manasik"
      description="Jadwal baru hanya tampil untuk travel Anda. Paket yang dipilih membatasi jamaah yang diundang."
      action={saveManasik}
      fields={manasikFields(options)}
      initial={{ status: "scheduled" }}
      backHref={MANASIK_LIST_PATH}
      backLabel="Kembali ke Jadwal Manasik"
      submitLabel="Simpan Jadwal"
    />
  );
}
