"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, ShoppingCart } from "lucide-react";
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
import DeleteOrderButton, {
  EditOrderLink,
  OrderStatusBadge,
  PaymentStatusBadge,
  ReadOnlyBadge,
} from "@/components/travel/order-row-actions";
import {
  BARU_PESANAN_PATH,
  UBAH_PESANAN_PATH,
} from "@/lib/data/order-fields";

export default function OrdersTable({ rows, showTravel = false }) {
  const [search, setSearch] = useState("");

  const keyword = search.trim().toLowerCase();
  const filtered = keyword
    ? rows.filter(
        (r) =>
          String(r.kode ?? "").toLowerCase().includes(keyword) ||
          String(r.paketNama ?? "").toLowerCase().includes(keyword) ||
          String(r.pemesan ?? "").toLowerCase().includes(keyword)
      )
    : rows;

  const totalKolom = 9 + (showTravel ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xs text-gray-500">
          {rows.length} pesanan {rows.length === 1 ? "ditemukan" : "ditemukan"}
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode pesanan, paket, atau pemesan..."
            className="h-9 pl-9 text-xs bg-white border-gray-200 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <ShoppingCart className="size-8 text-gray-300" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Belum ada pesanan</p>
            <p className="text-xs text-gray-500 mt-1">
              Buat pesanan pertama travel Anda. Pesanan yang dibuat di sini
              langsung tertaut ke paket dan jamaah yang dipilih.
            </p>
          </div>
          <Button
            asChild
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
          >
            <Link href={BARU_PESANAN_PATH}>
              <ShoppingCart className="size-4" />
              Buat Pesanan
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-transparent">
                <TableHead className="text-gray-600 font-semibold">Kode</TableHead>
                <TableHead className="text-gray-600 font-semibold">Paket &amp; Pemesan</TableHead>
                {showTravel && (
                  <TableHead className="text-gray-600 font-semibold">Travel</TableHead>
                )}
                <TableHead className="text-gray-600 font-semibold">Biaya &amp; Sisa</TableHead>
                <TableHead className="text-gray-600 font-semibold">Pembayaran</TableHead>
                <TableHead className="text-gray-600 font-semibold">Status</TableHead>
                <TableHead className="text-gray-600 font-semibold">Sumber</TableHead>
                <TableHead className="text-gray-600 font-semibold">Tgl. Pesan</TableHead>
                <TableHead className="text-gray-600 font-semibold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <TableRow
                  key={`${row.asal}-${row.id}`}
                  className="hover:bg-gray-50/80"
                >
                  <TableCell className="py-3.5">
                    <Link
                      href={`/travel/pesanan/${row.id}`}
                      className="font-mono font-medium text-gray-900 hover:text-emerald-700 hover:underline transition-colors"
                      title="Buka detail & pembayaran"
                    >
                      {row.kode}
                    </Link>
                    {row.asal === "lama" && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        entri lama
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="font-medium text-gray-900">{row.paketNama}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {row.pemesan}
                      {row.telp ? ` · ${row.telp}` : ""}
                    </div>
                  </TableCell>
                  {showTravel && (
                    <TableCell className="py-3.5 text-gray-600">
                      {row.travelNama ?? "-"}
                    </TableCell>
                  )}
                  <TableCell className="py-3.5">
                    <div className="font-semibold text-gray-900">{row.totalLabel}</div>
                    {row.sisa > 0 && (
                      <div className="text-[11px] text-rose-600 font-medium">
                        - {row.sisaLabel}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <PaymentStatusBadge
                      status={row.pembayaran}
                      label={row.pembayaranLabel}
                    />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <OrderStatusBadge status={row.status} label={row.statusLabel} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium whitespace-nowrap">
                      {row.sumber}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 text-gray-600 whitespace-nowrap">
                    {row.tanggalLabel}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.canWrite ? (
                        <>
                          <EditOrderLink href={UBAH_PESANAN_PATH(row.id)} />
                          <DeleteOrderButton id={row.id} />
                        </>
                      ) : (
                        <ReadOnlyBadge />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={totalKolom}
                    className="py-10 text-center text-gray-500"
                  >
                    Tidak ada pesanan yang cocok dengan{" "}
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
