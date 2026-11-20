import React from "react";
import RecordForm from "@/components/travel/record-form";
import { saveAgent } from "@/lib/data/master-actions";
import { AGEN_FIELDS, AGEN_LIST_PATH } from "@/lib/data/record-fields";

export default function AgenBaruPage() {
  return (
    <RecordForm
      heading="Tambah Agen"
      description="Agen baru tercatat atas nama travel Anda dan hanya muncul di daftar travel ini."
      action={saveAgent}
      fields={AGEN_FIELDS}
      initial={{ status: "aktif", trigger: "pelunasan" }}
      backHref={AGEN_LIST_PATH}
      backLabel="Kembali ke Agen & Reseller"
      submitLabel="Simpan Agen"
    />
  );
}
