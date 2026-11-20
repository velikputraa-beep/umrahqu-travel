import React from "react";
import RecordForm from "@/components/travel/record-form";
import RecordMissing from "@/components/travel/record-missing";
import { getTravelContext } from "@/lib/auth/session";
import { getManifestPilgrim } from "@/lib/data/keberangkatan";
import { assignManifest } from "@/lib/data/keberangkatan-actions";
import { MANIFEST_FIELDS, MANIFEST_LIST_PATH } from "@/lib/data/record-fields";

export default async function ManifestPenempatanPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const jamaah = await getManifestPilgrim(ctx, id);

  if (!jamaah) {
    return (
      <RecordMissing
        id={id}
        label="Jamaah"
        backHref={MANIFEST_LIST_PATH}
        backLabel="Kembali ke Manifest"
      />
    );
  }

  const backHref = jamaah.packageId
    ? `${MANIFEST_LIST_PATH}?paket=${encodeURIComponent(jamaah.packageId)}`
    : MANIFEST_LIST_PATH;

  return (
    <RecordForm
      heading="Penempatan Jamaah"
      description={`${jamaah.full_name} · paket ${jamaah.paketNama}. Kamar dan kursi ini dipakai saat keberangkatan.`}
      action={assignManifest}
      fields={MANIFEST_FIELDS}
      hidden={[
        { name: "jamaahId", value: jamaah.id },
        { name: "packageId", value: jamaah.packageId ?? "" },
      ]}
      initial={{
        kamar: jamaah.kamarLama,
        tempatTidur: jamaah.bedLama,
        kursi: jamaah.seat_preference ?? "",
      }}
      backHref={backHref}
      backLabel="Kembali ke Manifest"
      submitLabel="Simpan Penempatan"
    />
  );
}
