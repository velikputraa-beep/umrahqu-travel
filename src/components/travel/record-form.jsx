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

const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
const fieldCls =
  "h-9 rounded-lg border-gray-200 bg-white shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30";
const TANPA_PILIHAN = "__tanpa_pilihan__";

function SubmitButton({ label }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-4 h-9 shadow-2xs"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {pending ? "Menyimpan..." : label}
    </Button>
  );
}

/**
 * Form tambah/ubah untuk modul master data, keberangkatan, dan pengaturan.
 * Semua halaman modul ini bentuknya sama (segelintir kolom teks + satu status),
 * jadi kolomnya digambarkan lewat `fields` supaya satu komponen ini dipakai
 * banyak halaman. `fields` dan `action` adalah data murni / server action,
 * sehingga aman dikirim dari Server Component.
 */
export default function RecordForm({
  heading,
  description,
  action,
  backHref,
  backLabel = "Kembali",
  submitLabel = "Simpan",
  initial = null,
  fields = [],
  hidden = [],
}) {
  const selectFields = fields.filter((f) => f.type === "select");
  const [values, setValues] = useState(() => {
    const start = {};
    for (const f of selectFields) {
      const raw = initial?.[f.name];
      const kosong = raw === null || raw === undefined || raw === "";
      start[f.name] = kosong ? (f.emptyValue ?? TANPA_PILIHAN) : String(raw);
    }
    return start;
  });
  const [error, setError] = useState(null);
  const [percobaan, setPercobaan] = useState(0);
  const [isianGagal, setIsianGagal] = useState(null);

  async function kirim(formData) {
    const isian = Object.fromEntries(
      [...formData.entries()].filter(([name]) => name !== "idLama")
    );
    const result = await action(formData);
    // Sukses = server action redirect; kalau kembali ke sini berarti ada error.
    if (result?.error) {
      setError(result.error);
      // React mengosongkan form setiap action selesai, jadi isian user disimpan
      // dulu lalu dipasang kembali sebagai defaultValue (baris `key` di bawah
      // memaksa input di-remount dengan nilai itu).
      setIsianGagal(isian);
      setPercobaan((n) => n + 1);
    }
  }

  function nilai(field) {
    const current = values[field.name];
    // Nilai lama di luar daftar pilihan (mis. hasil backfill) tetap bisa
    // disimpan lagi tanpa diam-diam berubah.
    const options = field.options ?? [];
    return options.some((o) => o.value === current)
      ? options
      : [{ value: current, label: field.unknownLabel ?? current }, ...options];
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{heading}</h1>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>

      <form action={kirim}>
        {hidden.map((h) => (
          <input key={h.name} type="hidden" name={h.name} value={h.value ?? ""} />
        ))}

        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-xs font-semibold text-rose-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => {
                const span = f.span === 2 ? "sm:col-span-2" : "";
                if (f.type === "select") {
                  const opts = nilai(f);
                  return (
                    <div key={`${f.name}:${percobaan}`} className={span}>
                      <span className={labelCls}>
                        {f.label}
                        {f.required && <span className="text-rose-600"> *</span>}
                      </span>
                      <Select
                        value={values[f.name]}
                        onValueChange={(v) =>
                          setValues((prev) => ({ ...prev, [f.name]: v }))
                        }
                      >
                        <SelectTrigger
                          id={f.name}
                          className="w-full h-9 text-xs bg-white border-gray-200"
                        >
                          <SelectValue placeholder={f.placeholder ?? "Pilih"} />
                        </SelectTrigger>
                        <SelectContent>
                          {f.emptyValue !== undefined && (
                            <SelectItem value={f.emptyValue} className="text-xs">
                              {f.emptyLabel ?? "Tanpa"}
                            </SelectItem>
                          )}
                          {opts
                            .filter((o) => o.value !== f.emptyValue)
                            .map((o) => (
                              <SelectItem
                                key={o.value}
                                value={o.value}
                                className="text-xs"
                              >
                                {o.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {/* Select Radix tidak mengirim <select> native, jadi nilai
                        akhirnya lewat hidden input. */}
                      <input
                        type="hidden"
                        name={f.name}
                        value={
                          values[f.name] === TANPA_PILIHAN ? "" : values[f.name]
                        }
                      />
                      {f.hint && (
                        <p className="text-[11px] text-gray-400 mt-1">{f.hint}</p>
                      )}
                    </div>
                  );
                }

                if (f.type === "textarea") {
                  return (
                    <div key={`${f.name}:${percobaan}`} className={`sm:col-span-2 ${span}`}>
                      <label htmlFor={f.name} className={labelCls}>
                        {f.label}
                        {f.required && <span className="text-rose-600"> *</span>}
                      </label>
                      <textarea
                        id={f.name}
                        name={f.name}
                        rows={f.rows ?? 3}
                        required={f.required}
                        maxLength={f.max ?? 500}
                        defaultValue={
                          isianGagal?.[f.name] ?? initial?.[f.name] ?? ""
                        }
                        placeholder={f.placeholder}
                        className={`w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 shadow-2xs focus:outline-none focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30 transition-colors ${f.uppercase ? "uppercase" : ""}`}
                      />
                      {f.hint && (
                        <p className="text-[11px] text-gray-400 mt-1">{f.hint}</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={`${f.name}:${percobaan}`} className={span}>
                    <label htmlFor={f.name} className={labelCls}>
                      {f.label}
                      {f.required && <span className="text-rose-600"> *</span>}
                    </label>
                    <Input
                      id={f.name}
                      name={f.name}
                      type={f.type ?? "text"}
                      inputMode={f.inputMode}
                      required={f.required}
                      min={f.min}
                      max={f.maxValue}
                      step={f.step}
                      maxLength={f.max}
                      defaultValue={
                        isianGagal?.[f.name] ?? initial?.[f.name] ?? ""
                      }
                      placeholder={f.placeholder}
                      className={`${fieldCls} ${f.uppercase ? "uppercase" : ""}`}
                    />
                    {f.hint && (
                      <p className="text-[11px] text-gray-400 mt-1">{f.hint}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <SubmitButton label={submitLabel} />
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
