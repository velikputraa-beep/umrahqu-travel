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
  ORDER_STATUS,
  PILGRIM_BARU,
  orderStatusLabel,
  tampilkanRupiah,
} from "@/lib/data/order-fields";

const TANPA_JAMAAH = "__tanpa_jamaah__";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
const fieldCls =
  "h-9 rounded-lg border-gray-200 bg-white shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30";

function SubmitButton({ isEdit, disabled }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-4 h-9 shadow-2xs"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Pesanan"}
    </Button>
  );
}

export default function OrderForm({
  initial = null,
  action,
  backHref,
  packages = [],
  pilgrims = [],
  initialPilgrimId = null,
  defaultDate,
}) {
  const isEdit = Boolean(initial?.id);

  const [packageId, setPackageId] = useState(
    initial?.package_id ?? packages[0]?.id ?? ""
  );
  const [pilgrimId, setPilgrimId] = useState(initialPilgrimId ?? TANPA_JAMAAH);
  const [tanggal, setTanggal] = useState(
    String(initial?.purchase_date ?? defaultDate ?? "").slice(0, 10)
  );
  const [total, setTotal] = useState(
    initial?.total_amount != null
      ? String(initial.total_amount)
      : packages[0]?.harga
        ? String(packages[0].harga)
        : ""
  );
  const [status, setStatus] = useState(initial?.status ?? "pending");
  // Total ikut terisi dari harga paket selama pengguna belum mengetik angka
  // sendiri, supaya nomor tidak perlu diketik ulang.
  const [totalManual, setTotalManual] = useState(initial?.total_amount != null);

  const paketTerpilih = packages.find((p) => p.id === packageId);

  function pilihPaket(value) {
    setPackageId(value);
    const paket = packages.find((p) => p.id === value);
    if (paket && !totalManual) setTotal(paket.harga ? String(paket.harga) : "");
  }

  const [error, setError] = useState(null);

  async function kirim(formData) {
    const result = await action(formData);
    // Sukses = server action redirect; kalau kembali ke sini berarti ada error.
    if (result?.error) setError(result.error);
  }

  const statusOptions = ORDER_STATUS.some((s) => s.value === status)
    ? ORDER_STATUS
    : [{ value: status, label: orderStatusLabel(status) }, ...ORDER_STATUS];

  const angkaTotal = Number(String(total).replace(/[^0-9]/g, "")) || 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar pesanan
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          {isEdit ? "Ubah Pesanan" : "Buat Pesanan"}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isEdit
            ? `Mengubah pesanan ${initial.booking_code}. Perubahan tidak menyentuh jumlah uang yang sudah masuk.`
            : "Pesanan baru tersimpan atas nama travel Anda dan hanya travel Anda yang bisa melihatnya."}
        </p>
      </div>

      <form action={kirim}>
        {isEdit && <input type="hidden" name="idLama" value={initial.id} />}
        <input type="hidden" name="package_id" value={packageId} />
        <input
          type="hidden"
          name="pilgrim_id"
          value={pilgrimId === TANPA_JAMAAH ? "" : pilgrimId}
        />
        <input type="hidden" name="status" value={status} />

        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-xs font-semibold text-rose-800">{error}</p>
              </div>
            )}

            {packages.length === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-800">
                  Travel Anda belum punya paket.
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Paket wajib dipilih, jadi buat paketnya dulu di Master Data
                  &rsaquo; Paket Umrah.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <span className={labelCls}>
                  Paket <span className="text-rose-600">*</span>
                </span>
                <Select value={packageId} onValueChange={pilihPaket}>
                  <SelectTrigger
                    id="package_select"
                    className="w-full h-9 text-sm bg-white border-gray-200"
                  >
                    <SelectValue placeholder="Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">
                        {p.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {paketTerpilih && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Harga paket {paketTerpilih.hargaLabel}
                    {paketTerpilih.status && paketTerpilih.status !== "Aktif"
                      ? ` · status paket ${paketTerpilih.status}`
                      : ""}
                  </p>
                )}
              </div>

              <div>
                <span className={labelCls}>Jamaah</span>
                <Select value={pilgrimId} onValueChange={setPilgrimId}>
                  <SelectTrigger
                    id="pilgrim_select"
                    className="w-full h-9 text-sm bg-white border-gray-200"
                  >
                    <SelectValue placeholder="Pilih jamaah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TANPA_JAMAAH} className="text-sm">
                      Tanpa jamaah
                    </SelectItem>
                    <SelectItem value={PILGRIM_BARU} className="text-sm">
                      + Buat jamaah baru
                    </SelectItem>
                    {pilgrims.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {pilgrimId === TANPA_JAMAAH
                    ? "Boleh dikosongkan; jamaah bisa ditambahkan nanti."
                    : `${pilgrims.length} jamaah travel Anda tersedia di daftar ini.`}
                </p>
              </div>

              {pilgrimId === PILGRIM_BARU && (
                <div>
                  <label htmlFor="pilgrim_baru" className={labelCls}>
                    Nama Jamaah Baru <span className="text-rose-600">*</span>
                  </label>
                  <Input
                    id="pilgrim_baru"
                    name="pilgrim_baru"
                    maxLength={160}
                    placeholder="Hj. Siti Aminah"
                    className={fieldCls}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Jamaah tersimpan di daftar Jamaah travel Anda dan langsung
                    tertaut ke pesanan ini.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="purchase_date" className={labelCls}>
                  Tanggal Pesan
                </label>
                <Input
                  id="purchase_date"
                  name="purchase_date"
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={fieldCls}
                />
              </div>

              <div>
                <label htmlFor="total_amount" className={labelCls}>
                  Total Harga <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={total}
                  onChange={(e) => {
                    setTotal(e.target.value);
                    setTotalManual(true);
                  }}
                  placeholder="32500000"
                  className={fieldCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {angkaTotal > 0
                    ? tampilkanRupiah(angkaTotal)
                    : "Isi dengan angka rupiah."}
                </p>
              </div>

              <div>
                <span className={labelCls}>Status Pesanan</span>
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
                  Tersimpan sebagai kode <span className="font-mono">{status}</span>{" "}
                  di database.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <SubmitButton isEdit={isEdit} disabled={packages.length === 0} />
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
