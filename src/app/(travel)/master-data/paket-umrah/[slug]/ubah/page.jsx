import React from "react";
import Link from "next/link";
import { PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import PackageForm from "@/components/travel/package-form";
import { savePackage } from "@/lib/data/package-actions";
import { getEditablePackage, PACKAGE_LIST_PATH } from "@/lib/data/packages";
import { getTravelContext } from "@/lib/auth/session";
import { parseRupiah } from "@/lib/data/dashboard";

export default async function UbahPaketPage({ params }) {
  const ctx = await getTravelContext();
  const { slug } = await params;
  const pkg = await getEditablePackage(ctx, decodeURIComponent(slug));

  if (!pkg) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 flex flex-col items-center gap-3 text-center">
        <PackageX className="size-8 text-gray-300" />
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Paket tidak ditemukan
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Paket dengan slug{" "}
            <span className="font-mono text-gray-700">{slug}</span> tidak ada
            atau bukan milik travel Anda.
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-9 shadow-2xs"
        >
          <Link href={PACKAGE_LIST_PATH}>Kembali ke daftar paket</Link>
        </Button>
      </div>
    );
  }

  return (
    <PackageForm
      action={savePackage}
      backHref={PACKAGE_LIST_PATH}
      initial={{
        slug: pkg.slug,
        nama: pkg.nama,
        // biaya disimpan sebagai teks, jadi form butuh angkanya dulu.
        angkaHarga: parseRupiah(pkg.biaya) || "",
        duration_nights: pkg.duration_nights,
        description: pkg.description,
        status: pkg.status,
        hotel: pkg.hotel ?? (Array.isArray(pkg.includes) ? pkg.includes[0] : ""),
        maskapai: pkg.maskapai,
      }}
    />
  );
}
