import React from "react";
import RecordForm from "@/components/travel/record-form";
import RecordMissing from "@/components/travel/record-missing";
import { getTravelContext } from "@/lib/auth/session";
import { listPackageOptions } from "@/lib/data/pilgrims";
import { getEditableManasik } from "@/lib/data/keberangkatan";
import { saveManasik } from "@/lib/data/keberangkatan-actions";
import { MANASIK_LIST_PATH, manasikFields } from "@/lib/data/record-fields";

export default async function UbahManasikPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const [jadwal, paket] = await Promise.all([
    getEditableManasik(ctx, id),
    listPackageOptions(ctx),
  ]);

  if (!jadwal) {
    return (
      <RecordMissing
        id={id}
        label="Jadwal manasik"
        backHref={MANASIK_LIST_PATH}
        backLabel="Kembali ke Jadwal Manasik"
      />
    );
  }

  return (
    <RecordForm
      heading="Ubah Jadwal Manasik"
      description={`Mengubah "${jadwal.judul}". Jamaah yang sudah hadir tidak berubah catatannya.`}
      action={saveManasik}
      fields={manasikFields(paket.options)}
      hidden={[{ name: "idLama", value: jadwal.id }]}
      initial={jadwal}
      backHref={MANASIK_LIST_PATH}
      backLabel="Kembali ke Jadwal Manasik"
      submitLabel="Simpan Perubahan"
    />
  );
}
