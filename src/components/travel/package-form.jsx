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
import { PACKAGE_STATUS, slugify } from "@/lib/data/package-fields";

const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
const fieldCls = "h-9 rounded-lg border-gray-200 bg-white shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30";

function SubmitButton({ isEdit }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-4 h-9 shadow-2xs"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Paket"}
    </Button>
  );
}

export default function PackageForm({ initial = null, action, backHref }) {
  const isEdit = Boolean(initial?.slug);
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [status, setStatus] = useState(initial?.status || PACKAGE_STATUS[0]);
  // Baris lama bisa punya status di luar daftar baku; tetap tampilkan agar
  // pengguna tidak tanpa sadar mengubah status ketika menyimpan field lain.
  const statusOptions = PACKAGE_STATUS.includes(status)
    ? PACKAGE_STATUS
    : [status, ...PACKAGE_STATUS];

  const shownSlug = isEdit ? initial.slug : slugify(nama);

  // Server action me-redirect saat sukses; kalau ia kembali dengan objek
  // {error}, tidak ada apa pun yang berubah di layar tanpa banner ini.
  const [error, setError] = useState(null);
  async function kirim(formData) {
    const result = await action(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar paket
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          {isEdit ? "Ubah Paket" : "Paket Baru"}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isEdit
            ? `Mengubah paket ${initial.nama} (${initial.slug}). Slug tidak bisa diubah.`
            : "Paket baru langsung tercatat atas nama travel Anda dan hanya travel Anda yang bisa mengubahnya."}
        </p>
      </div>

      <form action={kirim}>
        {isEdit && <input type="hidden" name="slugLama" value={initial.slug} />}

        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-xs font-semibold text-rose-800">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="nama" className={labelCls}>
                  Nama Paket <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="nama"
                  name="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="Umrah Reguler 9 Hari"
                  className={fieldCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="slug" className={labelCls}>
                  Slug <span className="font-normal text-gray-400">(otomatis dari nama paket)</span>
                </label>
                <Input
                  id="slug"
                  value={shownSlug}
                  readOnly
                  placeholder="ketik nama paket dulu"
                  className={`${fieldCls} font-mono text-gray-500 bg-gray-50 cursor-default`}
                />
              </div>

              <div>
                <label htmlFor="biaya" className={labelCls}>
                  Harga <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="biaya"
                  name="biaya"
                  type="number"
                  required
                  min="0"
                  step="50000"
                  defaultValue={initial?.angkaHarga ?? ""}
                  placeholder="32500000"
                  className={fieldCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Disimpan sebagai teks Rupiah, contoh &ldquo;Rp 32.500.000&rdquo;.
                </p>
              </div>

              <div>
                <label htmlFor="durasi" className={labelCls}>
                  Durasi (malam)
                </label>
                <Input
                  id="durasi"
                  name="durasi"
                  type="number"
                  min="1"
                  max="60"
                  defaultValue={initial?.duration_nights ?? ""}
                  placeholder="9"
                  className={fieldCls}
                />
              </div>

              <div>
                <label htmlFor="hotel" className={labelCls}>
                  Hotel
                </label>
                <Input
                  id="hotel"
                  name="hotel"
                  defaultValue={initial?.hotel ?? ""}
                  maxLength={120}
                  placeholder="Anmutarafaj Elaf"
                  className={fieldCls}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Nama hotel, tersimpan di relasi package_hotels.
                </p>
              </div>

              <div>
                <label htmlFor="maskapai" className={labelCls}>
                  Maskapai
                </label>
                <Input
                  id="maskapai"
                  name="maskapai"
                  defaultValue={initial?.maskapai ?? ""}
                  maxLength={120}
                  placeholder="Saudia Airlines"
                  className={fieldCls}
                />
              </div>

              <div>
                <span className={labelCls}>Status</span>
                <input type="hidden" name="status" value={status} />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="w-full h-9 text-sm bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s} className="text-sm">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className={labelCls}>
                  Deskripsi
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={initial?.description ?? ""}
                  placeholder="Berangkat dari Surabaya, hotel dekat Masjidil Haram..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs resize-y"
                />
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
