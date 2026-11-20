import React from "react";
import RecordForm from "@/components/travel/record-form";
import RecordMissing from "@/components/travel/record-missing";
import { getTravelContext } from "@/lib/auth/session";
import { getEditableAgent } from "@/lib/data/master-data";
import { saveAgent } from "@/lib/data/master-actions";
import { AGEN_FIELDS, AGEN_LIST_PATH } from "@/lib/data/record-fields";

export default async function UbahAgenPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const agen = await getEditableAgent(ctx, id);

  if (!agen) {
    return (
      <RecordMissing
        id={id}
        label="Agen"
        backHref={AGEN_LIST_PATH}
        backLabel="Kembali ke Agen & Reseller"
      />
    );
  }

  return (
    <RecordForm
      heading="Ubah Agen"
      description={`Mengubah data ${agen.nama}. Komisi yang sudah terlanjur tercatat tidak berubah.`}
      action={saveAgent}
      fields={AGEN_FIELDS}
      hidden={[{ name: "idLama", value: agen.id }]}
      initial={agen}
      backHref={AGEN_LIST_PATH}
      backLabel="Kembali ke Agen & Reseller"
      submitLabel="Simpan Perubahan"
    />
  );
}
