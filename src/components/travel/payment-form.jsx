"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";
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
  PAYMENT_METHODS,
  PAYMENT_ROW_STATUS,
  tampilkanRupiah,
} from "@/lib/data/payment-fields";

const TANPA_REKENING = "__tanpa_rekening__";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
const fieldCls =
  "h-9 rounded-lg border-gray-200 bg-white shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30";

// Status yang boleh dipilih dari form. "rejected" dan "refunded" sengaja tidak
// ada di daftar — keduanya hasil proses verifikasi/pembatalan, bukan isian kasir.
const STATUS_PIILIHAN = PAYMENT_ROW_STATUS.filter((s) =>
  ["pending", "paid", "verified"].includes(s.value)
);

function SubmitButton({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-4 h-9 shadow-2xs"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
      {pending ? "Menyimpan..." : "Simpan Pembayaran"}
    </Button>
  );
}

/**
 * Satu form untuk dua jalan masuk: dari halaman keuangan (target dipilih lewat
 * daftar pesanan) dan dari detail pesanan (target sudah pasti). Yang dikirim
 * ke server action cuma nama field-nya, jadi kedua halaman bisa memakai
 * komponen ini tanpa varian apa pun.
 */
export default function PaymentForm({
  action,
  target,
  banks = [],
  lanjut,
  backHref,
  defaultDate,
  heading = "Catat Pembayaran",
}) {
  const [method, setMethod] = useState("transfer");
  const [status, setStatus] = useState("paid");
  const [rekening, setRekening] = useState(TANPA_REKENING);
  const [tanggal, setTanggal] = useState(defaultDate ?? "");
  const [nominal, setNominal] = useState(target?.sisa ? String(target.sisa) : "");
  const [izinkanLebih, setIzinkanLebih] = useState(false);
  const [error, setError] = useState(null);

  const angka = Number(String(nominal).replace(/[^0-9]/g, "")) || 0;
  const sisa = Number(target?.sisa) || 0;
  // `sisa = 0` tetap dihitung lebih-bayar: pesanan yang sudah lunas tidak boleh
  // menerima uang tambahan tanpa persetujuan eksplisit.
  const melebihi = angka > sisa;

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
          Kembali
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{heading}</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Uang yang tersimpan di sini langsung menghitung ulang total, sisa, dan
          status pembayaran pesanannya.
        </p>
      </div>

      <form action={kirim} className="space-y-5">
        <input type="hidden" name="target" value={target?.ref ?? ""} />
        {lanjut && <input type="hidden" name="lanjut" value={lanjut} />}

        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-xs font-semibold text-rose-800">{error}</p>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Penerima pembayaran
              </p>
              <p className="text-sm font-bold text-gray-900 mt-1.5">
                {target?.pemesan ?? "-"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-mono">{target?.kode ?? "-"}</span>
                {target?.jenis === "lama" && (
                  <span className="ml-2 text-[10px] font-semibold text-amber-700 uppercase">
                    pesanan lama
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs">
                <span className="text-gray-500">
                  Total <span className="font-semibold text-gray-800">{target?.totalLabel ?? "-"}</span>
                </span>
                <span className="text-gray-500">
                  Sisa tagihan
                  <span className="font-semibold text-amber-700 ml-1">
                    {target?.sisaLabel ?? "-"}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className={labelCls}>
                  Nominal <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  placeholder="17500000"
                  className={fieldCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {angka > 0 ? tampilkanRupiah(angka) : "Isi dengan angka rupiah."}
                </p>
              </div>

              <div>
                <label htmlFor="paid_at" className={labelCls}>
                  Tanggal Pembayaran
                </label>
                <Input
                  id="paid_at"
                  name="paid_at"
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={fieldCls}
                />
              </div>

              <div>
                <span className={labelCls}>Metode</span>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger
                    id="method_select"
                    className="w-full h-9 text-sm bg-white border-gray-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-sm">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="method" value={method} />
              </div>

              <div>
                <span className={labelCls}>Status Verifikasi</span>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger
                    id="status_select"
                    className="w-full h-9 text-sm bg-white border-gray-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_PIILIHAN.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-sm">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="status" value={status} />
                <p className="text-[11px] text-gray-400 mt-1">
                  Semua status di atas tetap dihitung sebagai uang masuk.
                </p>
              </div>

              {banks.length > 0 && (
                <div>
                  <span className={labelCls}>Rekening Tujuan</span>
                  <Select value={rekening} onValueChange={setRekening}>
                    <SelectTrigger
                      id="bank_select"
                      className="w-full h-9 text-sm bg-white border-gray-200"
                    >
                      <SelectValue placeholder="Tidak dipilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TANPA_REKENING} className="text-sm">
                        Tanpa rekening
                      </SelectItem>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.label} className="text-sm">
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* bank_id uuid tidak bisa menaut banks.id text, jadi label
                      rekening yang disimpan (R-6). */}
                  <input
                    type="hidden"
                    name="bank_label"
                    value={rekening === TANPA_REKENING ? "" : rekening}
                  />
                </div>
              )}

              <div>
                <label htmlFor="proof" className={labelCls}>
                  Bukti Transfer
                </label>
                <Input
                  id="proof"
                  name="proof"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="h-9 rounded-lg border-gray-200 bg-white text-xs file:mr-3"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  JPG, PNG, WEBP atau PDF, maksimal 5 MB. Tersimpan di bucket
                  privat travel Anda.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className={labelCls}>
                  Catatan
                </label>
                <Input
                  id="notes"
                  name="notes"
                  maxLength={500}
                  placeholder="Transfer BCA via teller, an. Budi…"
                  className={fieldCls}
                />
              </div>
            </div>

            {melebihi && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-amber-800">
                  Nominal {tampilkanRupiah(angka)} lebih besar dari sisa tagihan{" "}
                  {target.sisaLabel}.
                </p>
                <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    name="izinkan_lebih"
                    value="ya"
                    checked={izinkanLebih}
                    onChange={(e) => setIzinkanLebih(e.target.checked)}
                    className="mt-0.5 size-3.5 rounded border-amber-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>
                    Tetap simpan — kelebihan bayar dicatat sebagai titipan. Sisa
                    tagihan ditampilkan Rp 0, tidak pernah negatif.
                  </span>
                </label>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <SubmitButton disabled={!target?.ref || (melebihi && !izinkanLebih)} />
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
