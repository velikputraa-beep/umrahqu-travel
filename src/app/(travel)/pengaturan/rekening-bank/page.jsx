import React from "react";
import { Landmark } from "lucide-react";
import PlaceholderPage from "@/components/travel/placeholder-page";

export default function RekeningBankPage() {
  return (
    <PlaceholderPage
      title="Rekening Bank"
      description="Rekening penampungan pembayaran yang ditampilkan ke jamaah."
      icon={Landmark}
      sumber="banks, deposit_mutations"
      rencana={[
        "Daftar rekening travel: bank, nomor rekening, atas nama.",
        "Rekening mana yang dipakai pada instruksi pembayaran di invoice.",
        "Mutasi & rekonsiliasi setoran dengan pembayaran yang tercatat.",
      ]}
      backHref="/travel/keuangan/pembayaran"
      backLabel="Buka Daftar Pembayaran"
    />
  );
}
