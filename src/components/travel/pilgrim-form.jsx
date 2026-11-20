"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PILGRIM_STATUS,
  pilgrimStatusLabel,
} from "@/lib/data/pilgrim-fields";

const NO_PACKAGE = "__tanpa_paket__";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
const fieldCls =
  "h-9 rounded-lg border-gray-200 bg-white shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30";

function SubmitButton({ isEdit }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-4 h-9 shadow-2xs"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Jamaah"}
    </Button>
  );
}

export default function PilgrimForm({
  initial = null,
  action,
  backHref,
  packageOptions = [],
}) {
  const isEdit = Boolean(initial?.id);
  const [status, setStatus] = useState(initial?.status ?? "pending");
  const [packageId, setPackageId] = useState(initial?.package_id ?? NO_PACKAGE);

  // Status lama di luar daftar (mis. hasil backfill) tetap bisa disimpan lagi.
  const statusOptions = PILGRIM_STATUS.some((s) => s.value === status)
    ? PILGRIM_STATUS
    : [{ value: status, label: pilgrimStatusLabel(status) }, ...PILGRIM_STATUS];

  const paketTerpilih = packageOptions.find((p) => p.id === packageId);
  const paketKedaluwarsa =
    initial?.package_id && !paketTerpilih
      ? `${initial.package_id.slice(0, 8)}… (paket sudah dihapus)`
      : null;

  const [error, setError] = useState(null);

  async function kirim(formData) {
    const result = await action(formData);
    // Sukses = server action redirect; kalau kembali ke sini berarti ada error.
    if (result?.error) setError(result.error);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar jamaah
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          {isEdit ? "Ubah Jamaah" : "Jamaah Baru"}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isEdit
            ? `Mengubah data ${initial.full_name}. Jamaah tetap tercatat atas nama travel Anda.`
            : "Jamaah baru langsung tercatat atas nama travel Anda dan hanya travel Anda yang bisa melihatnya."}
        </p>
      </div>

      <form action={kirim}>
        {isEdit && <input type="hidden" name="idLama" value={initial.id} />}
        <input type="hidden" name="package_id" value={packageId === NO_PACKAGE ? "" : packageId} />
        <input type="hidden" name="status" value={status} />

        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-xs font-semibold text-rose-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="full_name" className={labelCls}>
                  Nama Jamaah <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  maxLength={160}
                  defaultValue={initial?.full_name ?? ""}
                  placeholder="H. Ahmad Fauzi"
                  className={fieldCls}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelCls}>
                  No. HP
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength={32}
                  defaultValue={initial?.phone ?? ""}
                  placeholder="0812-3456-7890"
                  className={fieldCls}
                />
              </div>

              <div>
                <label htmlFor="passport_number" className={labelCls}>
                  No. Paspor
                </label>
                <Input
                  id="passport_number"
                  name="passport_number"
                  maxLength={32}
                  defaultValue={initial?.passport_number ?? ""}
                  placeholder="C1234567"
                  className={`${fieldCls} uppercase`}
                />
              </div>

              <div>
                <span className={labelCls}>Paket</span>
                <Select value={packageId} onValueChange={setPackageId}>
                  <SelectTrigger
                    id="package_select"
                    className="w-full h-9 text-sm bg-white border-gray-200"
                  >
                    <SelectValue placeholder="Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PACKAGE} className="text-sm">
                      Tanpa paket
                    </SelectItem>
                    {packageOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">
                        {p.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(paketTerpilih || paketKedaluwarsa) && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {paketKedaluwarsa ?? paketTerpilih.nama}
                  </p>
                )}
                {packageOptions.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    Travel Anda belum punya paket. Buat paket dulu di Master
                    Data &rsaquo; Paket Umrah agar jamaah bisa ditautkan.
                  </p>
                )}
              </div>

              <div>
                <span className={labelCls}>Status</span>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger
                    id="status_select"
                    className="w-full h-9 text-sm bg-white border-gray-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-sm">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Status pesanan jamaah; tersimpan sebagai kode{" "}
                  <span className="font-mono">{status}</span> di database.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <SubmitButton isEdit={isEdit} />
              <Button
                asChild
                variant="ghost"
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 h-9"
              >
                <Link href={backHref}>Batal</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
