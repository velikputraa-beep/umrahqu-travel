import React from "react";
import { Plane } from "lucide-react";
import PlaceholderPage from "@/components/travel/placeholder-page";

export default function PenerbanganPage() {
  return (
    <PlaceholderPage
      title="Penerbangan"
      description="Jadwal dan maskapai penerbangan paket umrah."
      icon={Plane}
      sumber="airlines, package_flights"
      rencana={[
        "Daftar maskapai yang bekerja sama dengan travel Anda.",
        "Jadwal keberangkatan & kepulangan per paket (tanggal, jam, rute).",
        "Info bagasi dan transit yang ikut tampil di halaman detail paket.",
      ]}
      backHref="/travel/master-data/paket-umrah"
      backLabel="Buka Daftar Paket"
    />
  );
}
