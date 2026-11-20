import React from "react";
import { getTravelContext } from "@/lib/auth/session";
import { listOrderFormOptions, PESANAN_LIST_PATH } from "@/lib/data/orders";
import { saveOrder } from "@/lib/data/order-actions";
import OrderForm from "@/components/travel/order-form";

// Tanggal ikut zona waktu Indonesia Barat supaya "hari ini" di form sama
// dengan "hari ini" yang dilihat travel.
const HARI_INI = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
}).format(new Date());

export default async function BaruPesananPage() {
  const ctx = await getTravelContext();
  const { packages, pilgrims, error } = await listOrderFormOptions(ctx);

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
        <p className="text-xs font-semibold text-rose-800">{error}</p>
      </div>
    );
  }

  return (
    <OrderForm
      action={saveOrder}
      backHref={PESANAN_LIST_PATH}
      packages={packages}
      pilgrims={pilgrims}
      defaultDate={HARI_INI}
    />
  );
}
