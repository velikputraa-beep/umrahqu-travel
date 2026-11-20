import React from "react";
import RecordForm from "@/components/travel/record-form";
import { saveCabang } from "@/lib/data/pengaturan-actions";
import { CABANG_FIELDS, CABANG_LIST_PATH } from "@/lib/data/record-fields";

export default function CabangBaruPage() {
  return (
    <RecordForm
      heading="Tambah Cabang"
      description="Cabang baru tercatat atas nama travel Anda dan langsung bisa dipakai menautkan jamaah serta pesanan."
      action={saveCabang}
      fields={CABANG_FIELDS}
      initial={{ status: "aktif", utama: "tidak" }}
      backHref={CABANG_LIST_PATH}
      backLabel="Kembali ke Data Cabang"
      submitLabel="Simpan Cabang"
    />
  );
}
