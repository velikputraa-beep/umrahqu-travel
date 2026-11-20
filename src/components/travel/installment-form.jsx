"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Loader2, Repeat } from "lucide-react";
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
import { PAYMENT_METHODS, tampilkanRupiah } from "@/lib/data/payment-fields";

const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
const fieldCls =
  "h-9 rounded-lg border-gray-200 bg-white shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30";

function SubmitButton({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-4 h-9 shadow-2xs"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Repeat className="size-4" />}
      {pending ? "Menyusun..." : "Simpan Jadwal Cicilan"}
    </Button>
  );
}

// Bulan berikutnya dari "YYYY-MM-DD", meniru tambahBulan() di server action
// supaya pratinjau di layar sama dengan jadwal yang benar-benar disimpan.
function bulanBerikut(iso, n) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + n, 1));
  const hariTerakhir = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)
  ).getUTCDate();
  base.setUTCDate(Math.min(d, hariTerakhir));
  return base.toISOString().slice(0, 10);
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function label(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

/**
 * Form "buat jadwal cicilan" (US-6). Pokok cicilan selalu sisa tagihan dikurangi
 * uang muka, lalu dibagi rata ke N baris `installments`; pratinjau di bawah
 * form memakai pembulatan yang sama dengan server action supaya jumlahnya tidak
 * berbeda cerita.
 */
export default function InstallmentForm({
  action,
  targets = [],
  selectedRef,
  backHref,
  defaultDate,
}) {
  const [ref, setRef] = useState(selectedRef ?? targets[0]?.ref ?? "");
  const [jumlah, setJumlah] = useState("3");
  const [mulai, setMulai] = useState(defaultDate ?? "");
  const [dp, setDp] = useState("");
  const [method, setMethod] = useState("transfer");
  const [error, setError] = useState(null);

  const dipilih = targets.find((t) => t.ref === ref);
  const sisa = Number(dipilih?.sisa) || 0;
  const angkaDp = Number(String(dp).replace(/[^0-9]/g, "")) || 0;
  const n = Number(jumlah) || 0;
  const pokok = Math.max(sisa - angkaDp, 0);
  const perCicilan = n >= 2 ? Math.floor(pokok / n / 1000) * 1000 : 0;

  async function kirim(formData) {
    const result = await action(formData);
    if (result?.error) setError(result.error);
  }

  const bolehKirim = Boolean(ref) && n >= 2 && n <= 12 && Boolean(mulai) && pokok > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke cicilan
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          Jadwal Cicilan
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Sisa tagihan dibagi rata per bulan. Setiap cicilan yang dilunasi
          otomatis tercatat sebagai pembayaran.
        </p>
      </div>

      <form action={kirim} className="space-y-5">
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-xs font-semibold text-rose-800">{error}</p>
              </div>
            )}

            <div>
              <span className={labelCls}>
                Pilih pesanan <span className="text-rose-600">*</span>
              </span>
              <Select value={ref} onValueChange={setRef}>
                <SelectTrigger
                  id="target_select"
                  className="w-full h-9 text-sm bg-white border-gray-200"
                >
                  <SelectValue placeholder="Pilih pesanan bertunggakan" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((t) => (
                    <SelectItem key={t.ref} value={t.ref} className="text-sm">
                      {t.pemesan} — {t.kode} · sisa {t.sisaLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="target" value={ref} />
              {targets.length === 0 && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Tidak ada pesanan dengan sisa tagihan, jadi belum ada yang
                  bisa dicicil.
                </p>
              )}
            </div>

            {dipilih && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Pesanan
                </p>
                <p className="text-sm font-bold text-gray-900 mt-1.5">
                  {dipilih.pemesan}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{dipilih.kode}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs">
                  <span className="text-gray-500">
                    Total{" "}
                    <span className="font-semibold text-gray-800">{dipilih.totalLabel}</span>
                  </span>
                  <span className="text-gray-500">
                    Sisa tagihan
                    <span className="font-semibold text-amber-700 ml-1">
                      {dipilih.sisaLabel}
                    </span>
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="jumlah" className={labelCls}>
                  Jumlah cicilan <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="jumlah"
                  name="jumlah"
                  type="number"
                  min={2}
                  max={12}
                  required
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                  className={fieldCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  2 sampai 12 kali, berjarak satu bulan.
                </p>
              </div>

              <div>
                <label htmlFor="mulai" className={labelCls}>
                  Jatuh tempo pertama <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="mulai"
                  name="mulai"
                  type="date"
                  required
                  value={mulai}
                  onChange={(e) => setMulai(e.target.value)}
                  className={fieldCls}
                />
              </div>

              <div>
                <label htmlFor="down_payment" className={labelCls}>
                  Uang muka
                </label>
                <Input
                  id="down_payment"
                  name="down_payment"
                  type="number"
                  min={0}
                  step={1000}
                  value={dp}
                  onChange={(e) => setDp(e.target.value)}
                  placeholder="0"
                  className={fieldCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {angkaDp > 0
                    ? `${tampilkanRupiah(angkaDp)} tercatat sebagai pembayaran berstatus menunggu verifikasi.`
                    : "Kosongkan bila tanpa uang muka."}
                </p>
              </div>

              <div>
                <span className={labelCls}>Metode pembayaran cicilan</span>
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
            </div>

            {perCicilan > 0 && mulai && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50/60 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900">Pratinjau jadwal</h3>
                  <p className="text-[11px] text-gray-500">
                    pokok {tampilkanRupiah(pokok)}
                  </p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {Array.from({ length: n }, (_, i) => {
                    const terakhir = i === n - 1;
                    const nominal = terakhir ? pokok - perCicilan * (n - 1) : perCicilan;
                    return (
                      <li
                        key={i}
                        className="px-4 py-2.5 flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-600">
                          <span className="font-mono text-gray-400 mr-2">{i + 1}</span>
                          {label(bulanBerikut(mulai, i))}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {tampilkanRupiah(nominal)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="px-4 py-2.5 text-[11px] text-gray-400 bg-gray-50/60 border-t border-gray-100">
                  Cicilan terakhir menanggung sisa pembulatan, jadi jumlahnya
                  selalu persis sama dengan pokok.
                </p>
              </div>
            )}

            {dipilih && pokok <= 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-800">
                  Uang muka menutup seluruh sisa tagihan — tidak ada yang bisa
                  dicicil.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <SubmitButton disabled={!bolehKirim} />
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
