import React from "react";
import Link from "next/link";
import { CircleSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderForm from "@/components/travel/order-form";
import { saveOrder } from "@/lib/data/order-actions";
import { getEditableOrder, listOrderFormOptions, PESANAN_LIST_PATH } from "@/lib/data/orders";
import { getTravelContext } from "@/lib/auth/session";

export default async function UbahPesananPage({ params }) {
  const ctx = await getTravelContext();
  const { id } = await params;
  const order = await getEditableOrder(ctx, id);
  const { packages, pilgrims } = await listOrderFormOptions(ctx);

  // uuid memang dipotong di sini: kode URL panjang tidak berguna di layar.
  const bukanPesananBaru = !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

  if (!order) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center gap-3 text-center">
        <CircleSlash className="size-8 text-gray-300" />
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Pesanan tidak ditemukan
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {bukanPesananBaru ? (
              <>
                Pesanan dengan kode{" "}
                <span className="font-mono text-gray-700">{id}</span> adalah
                entri lama dari tabel <code>bookings</code>. Entri tersebut
                hanya-baca dari portal travel karena database menulakkannya
                untuk role login travel.
              </>
            ) : (
              <>
                Pesanan dengan kode{" "}
                <span className="font-mono text-gray-700">{id.slice(0, 8)}…</span>{" "}
                tidak ada, sudah dihapus, atau bukan milik travel Anda.
              </>
            )}
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9 shadow-2xs"
        >
          <Link href={PESANAN_LIST_PATH}>Kembali ke daftar pesanan</Link>
        </Button>
      </div>
    );
  }

  const tertaut = pilgrims.find((p) => p.order_id === id);

  return (
    <OrderForm
      action={saveOrder}
      backHref={PESANAN_LIST_PATH}
      packages={packages}
      pilgrims={pilgrims}
      initialPilgrimId={tertaut?.id ?? null}
      initial={order}
    />
  );
}
