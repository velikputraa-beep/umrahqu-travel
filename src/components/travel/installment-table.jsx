"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteInstallmentPlan, markInstallmentPaid } from "@/lib/data/payment-actions";
import {
  PAYMENT_METHODS,
  INSTALLMENT_STATUS_COLORS,
} from "@/lib/data/payment-fields";

function StatusBadge({ row }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${
        INSTALLMENT_STATUS_COLORS[row.tampilan] ?? "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {row.statusLabel}
    </span>
  );
}

// "Tandai lunas" tidak menulis status cicilan saja: ia mencatat uangnya lewat
// aksi pembayaran yang sama, jadi agregat order ikut turun-naik (SC-5 & SC-7).
function MarkLunasButton({ row, lanjut }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("transfer");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handle = async (formData) => {
    setPending(true);
    const result = await markInstallmentPaid(formData);
    setPending(false);
    if (result?.error) return setError(result.error);
    setOpen(false);
  };

  if (error) {
    return (
      <span className="inline-flex items-center gap-2">
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
        title="Catat pembayaran cicilan ini"
      >
        <CheckCircle2 className="size-3.5" />
        Tandai lunas
      </button>
    );
  }

  return (
    <form action={handle} className="inline-flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="method" value={method} />
      {lanjut && <input type="hidden" name="lanjut" value={lanjut} />}
      <Select value={method} onValueChange={setMethod}>
        <SelectTrigger className="h-7 w-36 text-[11px] bg-white border-gray-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_METHODS.map((m) => (
            <SelectItem key={m.value} value={m.value} className="text-xs">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold disabled:opacity-60 transition-colors"
      >
        {pending && <Loader2 className="size-3 animate-spin" />}
        {pending ? "Menyimpan..." : `Lunas ${row.amountLabel}`}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Tidak jadi"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}

export function DeletePlanButton({ target }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handle = async (formData) => {
    setPending(true);
    const result = await deleteInstallmentPlan(formData);
    setPending(false);
    if (result?.error) return setError(result.error);
    setOpen(false);
  };

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-rose-700">{error}</span>
        <button
          type="button"
          onClick={() => setError(null)}
          className="p-1 rounded-md text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
      >
        <Trash2 className="size-3.5" />
        Hapus jadwal
      </button>
    );
  }

  return (
    <form action={handle} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="target" value={target} />
      <span className="text-[11px] font-medium text-rose-700">
        Hapus seluruh jadwal yang belum terbayar?
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
        onClick={() => setOpen(false)}
        className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Tidak jadi"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}

/**
 * Tabel jadwal cicilan. `showTarget` dipakai halaman /keuangan/cicilan; di
 * detail pesanan kolom pesanan tidak ada karena konteksnya sudah jelas.
 */
export default function InstallmentTable({ rows, showTarget = false, targetRef, lanjut = "cicilan" }) {
  const totalKolom = showTarget ? 7 : targetRef ? 6 : 5;

  return (
    <div className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="border-gray-200 hover:bg-transparent">
            <TableHead className="text-gray-600 font-semibold w-14">#</TableHead>
            {showTarget && (
              <TableHead className="text-gray-600 font-semibold">Pesanan</TableHead>
            )}
            <TableHead className="text-gray-600 font-semibold">Jatuh tempo</TableHead>
            <TableHead className="text-gray-600 font-semibold">Nominal</TableHead>
            <TableHead className="text-gray-600 font-semibold">Terbayar</TableHead>
            <TableHead className="text-gray-600 font-semibold">Status</TableHead>
            <TableHead className="text-gray-600 font-semibold text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={`hover:bg-gray-50/80 ${
                row.tampilan === "overdue" ? "bg-rose-50/40" : ""
              }`}
            >
              <TableCell className="py-3.5 font-mono text-gray-500">
                {row.sequence}
              </TableCell>
              {showTarget && (
                <TableCell className="py-3.5">
                  {row.detailHref ? (
                    <Link
                      href={row.detailHref}
                      className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      {row.pemesan}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-800">{row.pemesan}</span>
                  )}
                  <div className="font-mono text-[10px] text-gray-400 mt-0.5">
                    {row.kode ?? "-"}
                  </div>
                </TableCell>
              )}
              <TableCell className="py-3.5">
                <span
                  className={
                    row.tampilan === "overdue"
                      ? "font-semibold text-rose-700"
                      : "text-gray-700"
                  }
                >
                  {row.dueLabel}
                </span>
              </TableCell>
              <TableCell className="py-3.5 font-semibold text-gray-900">
                {row.amountLabel}
              </TableCell>
              <TableCell className="py-3.5 text-gray-600">
                {row.dibayar > 0 ? row.dibayarLabel : "-"}
              </TableCell>
              <TableCell className="py-3.5">
                <StatusBadge row={row} />
              </TableCell>
              <TableCell className="py-3.5">
                <div className="flex items-center justify-end">
                  {row.lunas ? (
                    <span className="text-[11px] text-gray-400">Selesai</span>
                  ) : (
                    <MarkLunasButton row={row} lanjut={lanjut} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={totalKolom} className="py-10 text-center text-gray-500">
                Belum ada jadwal cicilan.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {targetRef && rows.length > 0 && (
        <div className="flex justify-end pt-3">
          <DeletePlanButton target={targetRef} />
        </div>
      )}
    </div>
  );
}
