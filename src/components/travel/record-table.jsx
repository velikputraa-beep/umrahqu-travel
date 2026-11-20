"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Boxes,
  Loader2,
  MapPin,
  Pencil,
  Search,
  Star,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Ikon sampul baris, dipilih per kolom lewat `glyph` (data murni supaya boleh
// dikirim dari Server Component).
const GLYPHS = {
  hotel: Building2,
  agen: UserRound,
  manasik: CalendarDays,
  perlengkapan: Boxes,
  cabang: MapPin,
  jamaah: Users,
};

const TONE = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
};

function RowActions({ row, deleteAction, confirmLabel }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function hapus(formData) {
    setPending(true);
    const result = await deleteAction(formData);
    setPending(false);
    setConfirming(false);
    // Sukses = server action redirect; komponen ini ikut ter-unmount.
    if (result?.error) setError(result.error);
  }

  if (error) {
    return (
      <span className="inline-flex items-center gap-2 justify-end">
        <span className="text-[11px] font-medium text-rose-700">{error}</span>
        <button
          type="button"
          onClick={() => setError(null)}
          className="p-1 rounded-md text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          title="Tutup pesan"
        >
          <X className="size-3.5" />
        </button>
      </span>
    );
  }

  if (confirming) {
    return (
      <form action={hapus} className="inline-flex items-center gap-2 justify-end">
        <input type="hidden" name="idLama" value={row.deleteId} />
        <span className="text-[11px] font-medium text-rose-700 whitespace-nowrap">
          {confirmLabel}
        </span>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold disabled:opacity-60 transition-colors"
        >
          {pending && <Loader2 className="size-3 animate-spin" />}
          {pending ? "Menghapus..." : "Ya, hapus"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Batal"
        >
          <X className="size-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {row.editHref && (
        <Link
          href={row.editHref}
          className="p-1.5 rounded-md text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors inline-flex"
          title="Ubah"
        >
          <Pencil className="size-4" />
        </Link>
      )}
      {row.deleteId && deleteAction ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors inline-flex"
          title="Hapus"
        >
          <Trash2 className="size-4" />
        </button>
      ) : (
        <span
          className="text-[11px] text-gray-400 whitespace-nowrap"
          title={row.lockNote ?? "Tidak bisa diubah dari halaman ini"}
        >
          {row.lockNote ?? "—"}
        </span>
      )}
    </div>
  );
}

function Cell({ col, row }) {
  const Glyph = GLYPHS[col.glyph];

  if (col.type === "title") {
    return (
      <TableCell className="py-3.5">
        <div className="flex items-center gap-3">
          {Glyph && (
            <div className="size-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
              <Glyph className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-gray-900 leading-tight">
              {row[col.key] ?? "(tanpa nama)"}
            </div>
            {col.subKey && (
              <div className="text-[11px] text-gray-400 mt-0.5">
                {row[col.subKey] || "—"}
              </div>
            )}
          </div>
        </div>
      </TableCell>
    );
  }

  if (col.type === "stars") {
    const n = Number(row[col.key]) || 0;
    return (
      <TableCell className="py-3.5">
        <div className="flex items-center gap-1">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="text-[11px] font-semibold text-gray-700">
            {n ? `${n} Bintang` : "—"}
          </span>
        </div>
      </TableCell>
    );
  }

  if (col.type === "badge") {
    const badge = row.badge;
    if (!badge) {
      return (
        <TableCell className="py-3.5">
          <span className="text-gray-400">—</span>
        </TableCell>
      );
    }
    return (
      <TableCell className="py-3.5">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${
            TONE[badge.tone] ?? TONE.gray
          }`}
        >
          {badge.label}
        </span>
      </TableCell>
    );
  }

  if (col.type === "money") {
    return (
      <TableCell className="py-3.5 whitespace-nowrap">
        <div className="font-bold text-gray-900">{row[col.key] || "—"}</div>
        {col.subKey && (
          <div className="text-[11px] text-gray-500 mt-0.5">{row[col.subKey]}</div>
        )}
      </TableCell>
    );
  }

  if (col.type === "muted") {
    return (
      <TableCell className="py-3.5 text-gray-600">
        {row[col.key] || <span className="text-gray-400">—</span>}
      </TableCell>
    );
  }

  return (
    <TableCell
      className={`py-3.5 font-semibold text-gray-900 whitespace-nowrap ${
        col.align === "right" ? "text-right" : ""
      }`}
    >
      {row[col.key] || <span className="text-gray-400 font-normal">—</span>}
    </TableCell>
  );
}

/**
 * Tabel daftar untuk modul master data / keberangkatan / pengaturan.
 * Kolom digambarkan lewat `columns` (data murni) dan setiap baris sudah
 * disiapkan sisi server: `editHref`, `deleteId`, `badge`, dst.
 */
export default function RecordTable({
  rows,
  columns,
  searchKeys = [],
  searchPlaceholder = "Cari...",
  emptyTitle = "Belum ada data",
  emptyDesc,
  emptyHint,
  deleteAction,
  showActions = false,
  confirmLabel = "Hapus baris ini?",
  countLabel,
}) {
  const [search, setSearch] = useState("");
  const IkonKosong = GLYPHS[columns[0]?.glyph] ?? MapPin;
  const keyword = search.trim().toLowerCase();
  const filtered =
    keyword && searchKeys.length
      ? rows.filter((r) =>
          searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(keyword))
        )
      : rows;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xs text-gray-500">{countLabel ?? `${rows.length} data`}</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {searchKeys.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-9 text-xs bg-white border-gray-200 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30"
              />
            </div>
          )}
        </div>
      </div>

      {emptyHint && rows.length === 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {emptyHint}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <IkonKosong className="size-8 text-gray-300" />
          <div>
            <p className="text-sm font-semibold text-gray-700">{emptyTitle}</p>
            {emptyDesc && (
              <p className="text-xs text-gray-500 mt-1">{emptyDesc}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`text-gray-600 font-semibold ${
                      col.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {col.label}
                  </TableHead>
                ))}
                {deleteAction || showActions ? (
                  <TableHead className="text-gray-600 font-semibold text-right">
                    Aksi
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <TableRow key={row.key} className="hover:bg-gray-50/80 transition-colors">
                  {columns.map((col) => (
                    <Cell key={col.key} col={col} row={row} />
                  ))}
                  {deleteAction || showActions ? (
                    <TableCell className="py-3.5">
                      <RowActions
                        row={row}
                        deleteAction={deleteAction}
                        confirmLabel={confirmLabel}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (deleteAction || showActions ? 1 : 0)}
                    className="py-10 text-center text-gray-500"
                  >
                    Tidak ada yang cocok dengan{" "}
                    <span className="font-medium text-gray-700">
                      &ldquo;{search}&rdquo;
                    </span>
                    .
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
