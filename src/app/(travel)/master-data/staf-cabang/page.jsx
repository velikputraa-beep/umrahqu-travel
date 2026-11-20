import React from "react";
import { UserCog } from "lucide-react";
import PlaceholderPage from "@/components/travel/placeholder-page";

export default function StafCabangPage() {
  return (
    <PlaceholderPage
      title="Staf Cabang"
      description="Daftar staf travel beserta cabang tempat mereka bertugas."
      icon={UserCog}
      sumber="staff, profiles, branches"
      rencana={[
        "Daftar staf per cabang: nama, peran, dan status akun login.",
        "Pembatasan hak akses per peran (operational, keuangan, staf).",
        "Penugasan staf ke keberangkatan sebagai pembimbing kelompok.",
      ]}
      backHref="/travel/pengaturan/data-cabang"
      backLabel="Buka Data Cabang"
    />
  );
}
