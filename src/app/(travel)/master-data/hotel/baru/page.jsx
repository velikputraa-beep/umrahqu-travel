import React from "react";
import RecordForm from "@/components/travel/record-form";
import { saveHotel } from "@/lib/data/master-actions";
import { HOTEL_FIELDS, HOTEL_LIST_PATH } from "@/lib/data/record-fields";

export default function HotelBaruPage() {
  return (
    <RecordForm
      heading="Tambah Hotel"
      description="Hotel baru tercatat atas nama travel Anda, jadi hanya travel Anda yang bisa mengubahnya."
      action={saveHotel}
      fields={HOTEL_FIELDS}
      initial={{ status: "Aktif" }}
      backHref={HOTEL_LIST_PATH}
      backLabel="Kembali ke Master Hotel"
      submitLabel="Simpan Hotel"
    />
  );
}
