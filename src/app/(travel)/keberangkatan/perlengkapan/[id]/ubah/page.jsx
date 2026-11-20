import React from "react";
import RecordForm from "@/components/travel/record-form";
import RecordMissing from "@/components/travel/record-missing";
import { getTravelContext } from "@/lib/auth/session";
import { getEditablePerlengkapan, listJamaahOptions } from "@/lib/data/keberangkatan";
import { savePerlengkapan } from "@/lib/data/keberangkatan-actions";
import { PERLENGKAPAN_LIST_PATH, perlengkapanFields } from "@/lib/data/record-fields";

export default async function UbahPerlengkapanPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const [barang, jamaah] = await Promise.all([
    getEditablePerlengkapan(ctx, id),
    listJamaahOptions(ctx),
  ]);

  if (!barang) {
    return (
      <RecordMissing
        id={id}
        label="Catatan perlengkapan"
        backHref={PERLENGKAPAN_LIST_PATH}
        backLabel="Kembali ke Perlengkapan"
      />
    );
  }

  return (
    <RecordForm
      heading="Ubah Perlengkapan"
      description={`Mengubah "${barang.item}" untuk ${jamaah.find((p) => p.id === barang.jamaah)?.full_name ?? "jamaah yang belum ditautkan"}.`}
      action={savePerlengkapan}
      fields={perlengkapanFields(jamaah)}
      hidden={[{ name: "idLama", value: barang.id }]}
      initial={barang}
      backHref={PERLENGKAPAN_LIST_PATH}
      backLabel="Kembali ke Perlengkapan"
      submitLabel="Simpan Perubahan"
    />
  );
}
