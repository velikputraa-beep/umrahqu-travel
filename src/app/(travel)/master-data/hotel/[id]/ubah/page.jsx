import React from "react";
import RecordForm from "@/components/travel/record-form";
import RecordMissing from "@/components/travel/record-missing";
import { getTravelContext } from "@/lib/auth/session";
import { getEditableHotel } from "@/lib/data/master-data";
import { saveHotel } from "@/lib/data/master-actions";
import { HOTEL_FIELDS, HOTEL_LIST_PATH } from "@/lib/data/record-fields";

export default async function UbahHotelPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const hotel = await getEditableHotel(ctx, id);

  if (!hotel) {
    return (
      <RecordMissing
        id={id}
        label="Hotel"
        backHref={HOTEL_LIST_PATH}
        backLabel="Kembali ke Master Hotel"
      />
    );
  }

  return (
    <RecordForm
      heading="Ubah Hotel"
      description={`Mengubah ${hotel.nama}. Perubahan hanya berlaku untuk hotel milik travel Anda.`}
      action={saveHotel}
      fields={HOTEL_FIELDS}
      hidden={[{ name: "idLama", value: hotel.id }]}
      initial={hotel}
      backHref={HOTEL_LIST_PATH}
      backLabel="Kembali ke Master Hotel"
      submitLabel="Simpan Perubahan"
    />
  );
}
