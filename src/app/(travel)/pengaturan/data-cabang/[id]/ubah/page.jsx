import React from "react";
import RecordForm from "@/components/travel/record-form";
import RecordMissing from "@/components/travel/record-missing";
import { getTravelContext } from "@/lib/auth/session";
import { getEditableCabang } from "@/lib/data/pengaturan";
import { saveCabang } from "@/lib/data/pengaturan-actions";
import { CABANG_FIELDS, CABANG_LIST_PATH } from "@/lib/data/record-fields";

export default async function UbahCabangPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const cabang = await getEditableCabang(ctx, id);

  if (!cabang) {
    return (
      <RecordMissing
        id={id}
        label="Cabang"
        backHref={CABANG_LIST_PATH}
        backLabel="Kembali ke Data Cabang"
      />
    );
  }

  return (
    <RecordForm
      heading="Ubah Cabang"
      description={`Mengubah "${cabang.nama}". Pesanan dan jamaah yang sudah menunjuk cabang ini tidak ikut berpindah.`}
      action={saveCabang}
      fields={CABANG_FIELDS}
      hidden={[{ name: "idLama", value: cabang.id }]}
      initial={cabang}
      backHref={CABANG_LIST_PATH}
      backLabel="Kembali ke Data Cabang"
      submitLabel="Simpan Perubahan"
    />
  );
}
