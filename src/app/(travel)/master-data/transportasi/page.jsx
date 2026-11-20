import React from "react";
import { Bus } from "lucide-react";
import PlaceholderPage from "@/components/travel/placeholder-page";

export default function TransportasiPage() {
  return (
    <PlaceholderPage
      title="Transportasi"
      description="Armada darat untuk rute Jeddah–Makkah–Madinah."
      icon={Bus}
      sumber="vehicles, vehicle_assignments"
      rencana={[
        "Daftar armada: operator, jenis bus, dan kapasitas kursi.",
        "Penautan armada ke paket dan jadwal keberangkatan.",
        "Peta kursi per keberangkatan, tersambung ke kolom Kursi di Manifest.",
      ]}
      backHref="/travel/keberangkatan/manifest"
      backLabel="Buka Manifest & Penempatan"
    />
  );
}
