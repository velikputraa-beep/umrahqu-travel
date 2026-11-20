import React from "react";
import { ScrollText } from "lucide-react";
import PlaceholderPage from "@/components/travel/placeholder-page";

export default function AuditLogPage() {
  return (
    <PlaceholderPage
      title="Audit Log"
      description="Jejak perubahan data penting di akun travel Anda."
      icon={ScrollText}
      sumber="audit_logs"
      rencana={[
        "Siapa mengubah/menghapus apa, beserta tanggal dan jamnya.",
        "Filter per modul (pesanan, pembayaran, jamaah, keberangkatan).",
        "Tautan langsung ke baris yang berubah untuk memeriksa nilainya.",
      ]}
      backHref="/travel/pesanan/dashboard"
      backLabel="Buka Dashboard Pesanan"
    />
  );
}
