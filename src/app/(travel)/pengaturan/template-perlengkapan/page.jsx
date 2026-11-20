import React from "react";
import { Boxes } from "lucide-react";
import PlaceholderPage from "@/components/travel/placeholder-page";

export default function TemplatePerlengkapanPage() {
  return (
    <PlaceholderPage
      title="Template Perlengkapan"
      description="Paket item standar yang otomatis diusulkan saat menyerahkan perlengkapan."
      icon={Boxes}
      sumber="equipment_templates"
      rencana={[
        "Template item: koper, kain ihram/mukena, name tag, buku doa.",
        "Ukuran default dan jumlah per jamaah untuk tiap template.",
        "Sekali klik menerapkan template ke seluruh jamaah satu paket.",
      ]}
      backHref="/travel/keberangkatan/perlengkapan"
      backLabel="Buka Perlengkapan Jamaah"
    />
  );
}
