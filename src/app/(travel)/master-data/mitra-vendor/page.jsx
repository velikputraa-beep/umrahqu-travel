import React from "react";
import { Handshake } from "lucide-react";
import PlaceholderPage from "@/components/travel/placeholder-page";

export default function MitraVendorPage() {
  return (
    <PlaceholderPage
      title="Mitra / Vendor"
      description="Vendor hotel, katering, dan layanan pendukung jamaah."
      icon={Handshake}
      sumber="vendors, muthawifs"
      rencana={[
        "Daftar vendor beserta kontak, kategori layanan, dan status kerja sama.",
        "Riwayat pemakaian vendor per paket beserta nilai kontraknya.",
        "Tautan ke muthawwif yang mendampingi tiap kelompok jamaah.",
      ]}
      backHref="/travel/master-data/hotel"
      backLabel="Buka Master Hotel"
    />
  );
}
