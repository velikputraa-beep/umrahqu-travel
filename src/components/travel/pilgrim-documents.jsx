"use client";

import React, { useState } from "react";
import {
  Search,
  Upload,
  Eye,
  Trash2,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DOC_TYPES,
  DOC_ACCEPT,
  DOC_MAX_BYTES,
  DOC_STATUS_LABEL,
} from "@/lib/data/pilgrim-fields";
import {
  uploadPilgrimDocument,
  deletePilgrimDocument,
  viewPilgrimDocument,
} from "@/lib/data/pilgrim-actions";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SlotError({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg">
      <AlertCircle className="size-3.5 text-rose-600 shrink-0 mt-0.5" />
      <p className="text-[11px] font-medium text-rose-800 leading-snug">
        {message}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto text-[10px] font-semibold text-rose-600 hover:text-rose-800"
      >
        tutup
      </button>
    </div>
  );
}

// Satu slot = satu jenis dokumen untuk satu jamaah. Setiap slot punya <form>
// sendiri supaya unggah/hapus tidak saling mengganggu.
function DocSlot({ pilgrimId, type, doc }) {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function unggah(formData) {
    const file = formData.get("file");
    // Ditolak sebelum upload: kolom file di browser tidak bisa diisi ulang
    // secara andal, jadi pengguna cukup memilih berkas lain yang ukurannya pas.
    if (file && file.size > DOC_MAX_BYTES) {
      setError(`Berkas terlalu besar (maks ${DOC_MAX_BYTES / 1024 / 1024} MB).`);
      return;
    }
    setPending(true);
    const result = await uploadPilgrimDocument(formData);
    // Sukses = server action redirect dan komponen ini ter-unmount,
    // jadi kalau kita kembali ke sini berarti ada error yang harus tampil.
    if (result?.error) {
      setPending(false);
      setError(result.error);
    }
  }

  async function hapus(formData) {
    setPending(true);
    const result = await deletePilgrimDocument(formData);
    if (result?.error) {
      setPending(false);
      setError(result.error);
    }
  }

  async function lihat(formData) {
    setPending(true);
    const result = await viewPilgrimDocument(formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (!result?.url) return;
    // Signed URL baru tersedia setelah round-trip server action, jadi window.open
    // bisa kena pemblokir popup — kalau diblokir, buka di tab ini saja.
    const win = window.open(result.url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = result.url;
  }

  const adaBerkas = Boolean(doc);
  const accent = adaBerkas
    ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
    : "border-amber-200 bg-amber-50/40 hover:bg-amber-50";

  return (
    <div className="sm:min-w-[15rem] sm:flex-1 space-y-1.5">
      <div
        className={`rounded-lg border p-3 transition-colors ${accent} ${
          pending ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800">
            {adaBerkas ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Upload className="size-3.5 text-amber-600" />
            )}
            {type.label}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
              adaBerkas
                ? "bg-white text-emerald-700 border-emerald-200"
                : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            {adaBerkas ? DOC_STATUS_LABEL[doc.status] ?? "Terkirim" : "Belum ada"}
          </span>
        </div>

        {adaBerkas && (
          <div className="mt-2 flex items-center gap-1.5 min-w-0">
            <FileText className="size-3.5 text-gray-400 shrink-0" />
            <span
              className="text-[11px] font-mono text-gray-600 truncate"
              title={doc.file_name ?? doc.file_path}
            >
              {doc.file_name ?? "(tanpa nama berkas)"}
            </span>
            <span className="text-[10px] text-gray-400 shrink-0">
              {formatBytes(doc.file_size)}
            </span>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Unggah / timpa: file input asli disembunyikan di balik label. */}
          <form action={unggah} className="inline-flex items-center">
            <input type="hidden" name="pilgrim_id" value={pilgrimId} />
            <input type="hidden" name="doc_type" value={type.value} />
            <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-800 cursor-pointer transition-colors shadow-2xs">
              <Upload className="size-3" />
              {adaBerkas ? "Ganti berkas" : "Unggah"}
              <input
                name="file"
                type="file"
                accept={DOC_ACCEPT}
                onChange={(e) => {
                  if (e.target.files?.length) e.target.form?.requestSubmit();
                }}
                className="sr-only"
              />
            </label>
          </form>

          {adaBerkas && (
            <>
              <form action={lihat} className="inline-flex items-center">
                <input type="hidden" name="doc_id" value={doc.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] font-semibold text-gray-700 hover:border-emerald-300 hover:text-emerald-800 transition-colors shadow-2xs"
                >
                  <Eye className="size-3" />
                  Lihat
                </button>
              </form>
              <form action={hapus} className="inline-flex items-center">
                <input type="hidden" name="doc_id" value={doc.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[11px] font-semibold text-gray-600 hover:border-rose-300 hover:text-rose-700 transition-colors shadow-2xs"
                >
                  {pending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  Hapus
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <SlotError message={error} onClose={() => setError(null)} />
    </div>
  );
}

export default function PilgrimDocuments({ rows }) {
  const [search, setSearch] = useState("");
  const [hanyaBelumLengkap, setHanyaBelumLengkap] = useState(false);

  const keyword = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const cocok =
      !keyword ||
      String(row.full_name ?? "").toLowerCase().includes(keyword) ||
      String(row.passport_number ?? "").toLowerCase().includes(keyword);
    return cocok && (!hanyaBelumLengkap || row.docCount < row.docTotal);
  });

  const lengkap = rows.filter((r) => r.docCount === r.docTotal).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{lengkap}</span> dari{" "}
          {rows.length} jamaah dokumennya sudah lengkap.
        </p>
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Saring nama atau paspor..."
              className="h-9 pl-9 text-xs bg-white border-gray-200 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30"
            />
          </div>
          <button
            type="button"
            onClick={() => setHanyaBelumLengkap((v) => !v)}
            className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shadow-2xs ${
              hanyaBelumLengkap
                ? "bg-amber-500 text-white border-amber-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Belum Lengkap
          </button>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-10 text-center">
          <FileText className="size-8 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-700 mt-3">
            Belum ada jamaah
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tambahkan jamaah dulu di halaman Jamaah, lalu unggah dokumennya di
            sini.
          </p>
        </div>
      )}

      {rows.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-8 text-center text-xs text-gray-500">
          Tidak ada jamaah yang cocok dengan penyaringan ini.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((row) => {
          const docLengkap = row.docCount === row.docTotal;
          return (
            <div
              key={row.id}
              className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900">
                    {row.full_name || "(tanpa nama)"}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {row.passport_number || "tanpa paspor"}
                    {" • "}
                    {row.packageNama ?? "Tanpa paket"}
                    {" • "}
                    {row.statusLabel}
                  </p>
                </div>
                {docLengkap ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 self-start sm:self-auto shrink-0">
                    <CheckCircle2 className="size-3.5" />
                    Lengkap
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 self-start sm:self-auto shrink-0">
                    <AlertCircle className="size-3.5" />
                    Belum lengkap ({row.docTotal - row.docCount})
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                {DOC_TYPES.map((type) => (
                  <DocSlot
                    key={`${row.id}-${type.value}`}
                    pilgrimId={row.id}
                    type={type}
                    doc={row.docs.find((d) => d.doc_type === type.value)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
