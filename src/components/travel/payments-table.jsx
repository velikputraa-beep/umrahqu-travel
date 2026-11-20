"use client";

import React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BuktiLink,
  LegacyPaymentBadge,
  PaymentStatusBadge,
  VoidPaymentButton,
} from "@/components/travel/payment-row-actions";

/**
 * Satu tabel untuk dua layar: daftar keuangan (showTarget) dan kartu pembayaran
 * di detail pesanan (showTarget=false). Baris `asal === "lama"` tidak pernah
 * mendapat aksi — kolom aksinya menampilkan badge Hanya-baca.
 */
export default function PaymentsTable({ rows, showTarget = false, lanjut }) {
  const totalKolom = showTarget ? 8 : 6;

  return (
    <div className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="border-gray-200 hover:bg-transparent">
            <TableHead className="text-gray-600 font-semibold">Kode</TableHead>
            {showTarget && (
              <TableHead className="text-gray-600 font-semibold">Pesanan</TableHead>
            )}
            <TableHead className="text-gray-600 font-semibold">Nominal</TableHead>
            <TableHead className="text-gray-600 font-semibold">Metode</TableHead>
            <TableHead className="text-gray-600 font-semibold">Status</TableHead>
            <TableHead className="text-gray-600 font-semibold">Tanggal</TableHead>
            <TableHead className="text-gray-600 font-semibold">Bukti</TableHead>
            <TableHead className="text-gray-600 font-semibold text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-gray-50/80">
              <TableCell className="py-3.5">
                <div className="font-mono font-medium text-gray-900">{row.kode}</div>
                {row.asal === "lama" && (
                  <div className="text-[10px] text-gray-400 mt-0.5">entri lama</div>
                )}
                {row.cicilan && (
                  <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                    cicilan
                  </div>
                )}
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
                    {row.bookingCode ?? "-"}
                  </div>
                </TableCell>
              )}
              <TableCell className="py-3.5">
                <span className="font-semibold text-gray-900">{row.nominalLabel}</span>
                {!row.dihitung && row.asal === "portal" && (
                  <div className="text-[10px] text-gray-400 mt-0.5">tidak dihitung</div>
                )}
              </TableCell>
              <TableCell className="py-3.5 text-gray-700">
                {row.metode}
                {row.rekening && (
                  <div className="text-[10px] text-gray-400 mt-0.5">{row.rekening}</div>
                )}
              </TableCell>
              <TableCell className="py-3.5">
                <PaymentStatusBadge status={row.status} label={row.statusLabel} />
              </TableCell>
              <TableCell className="py-3.5 text-gray-600">{row.tanggalLabel}</TableCell>
              <TableCell className="py-3.5">
                {row.asal === "portal" && row.bukti ? (
                  <BuktiLink id={row.id} kode={row.kode} />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </TableCell>
              <TableCell className="py-3.5">
                <div className="flex items-center justify-end">
                  {row.asal === "portal" && row.canWrite ? (
                    <VoidPaymentButton id={row.id} lanjut={lanjut} />
                  ) : (
                    <LegacyPaymentBadge />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={totalKolom}
                className="py-10 text-center text-gray-500"
              >
                Belum ada pembayaran tercatat.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
