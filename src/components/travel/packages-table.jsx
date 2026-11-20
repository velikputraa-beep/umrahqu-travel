"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
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
import DeletePackageButton, {
  EditPackageLink,
  StatusBadge,
} from "@/components/travel/package-row-actions";
import { PACKAGE_LIST_PATH } from "@/lib/data/package-fields";

const NEW_PACKAGE_PATH = `${PACKAGE_LIST_PATH}/baru`;

export default function PackagesTable({ rows, showTravel = false }) {
  const [search, setSearch] = useState("");

  const keyword = search.trim().toLowerCase();
  const filtered = keyword
    ? rows.filter(
        (r) =>
          String(r.nama ?? "").toLowerCase().includes(keyword) ||
          String(r.slug ?? "").toLowerCase().includes(keyword) ||
          String(r.travel ?? "").toLowerCase().includes(keyword)
      )
    : rows;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xs text-gray-500">
          {rows.length} paket {rows.length === 1 ? "ditemukan" : "ditemukan"}
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, slug, atau travel..."
            className="h-9 pl-9 text-xs bg-white border-gray-200 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <Package className="size-8 text-gray-300" />
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Belum ada paket
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Buat paket pertama agar muncul di marketplace dan website travel
              Anda.
            </p>
          </div>
          <Button
            asChild
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
          >
            <Link href={NEW_PACKAGE_PATH}>
              <Plus className="size-4" />
              Paket Baru
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-transparent">
                <TableHead className="text-gray-600 font-semibold">
                  Paket
                </TableHead>
                {showTravel && (
                  <TableHead className="text-gray-600 font-semibold">
                    Travel
                  </TableHead>
                )}
                <TableHead className="text-gray-600 font-semibold">
                  Harga
                </TableHead>
                <TableHead className="text-gray-600 font-semibold">
                  Durasi
                </TableHead>
                <TableHead className="text-gray-600 font-semibold">
                  Status
                </TableHead>
                <TableHead className="text-gray-600 font-semibold">
                  Kuota
                </TableHead>
                <TableHead className="text-gray-600 font-semibold text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <TableRow key={row.slug} className="hover:bg-gray-50/80">
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-16 h-10 rounded-md bg-gradient-to-r ${
                          row.imgColor ?? "from-emerald-600 to-teal-800"
                        } flex items-center justify-center text-white/80 shrink-0 border border-gray-100 shadow-2xs`}
                      >
                        <Package className="size-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 leading-tight">
                          {row.nama ?? "(tanpa nama)"}
                        </div>
                        <div className="font-mono text-[11px] text-gray-400 mt-0.5">
                          {row.slug}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  {showTravel && (
                    <TableCell className="py-3.5 text-gray-600">
                      {row.travel ?? "-"}
                    </TableCell>
                  )}
                  <TableCell className="py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                    {row.biaya ?? "-"}
                  </TableCell>
                  <TableCell className="py-3.5 text-gray-600">
                    {row.duration_nights ? `${row.duration_nights} malam` : "-"}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    {row.total ? (
                      <div className="w-36">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 mb-1">
                          <span>
                            {row.terisi ?? 0} / {row.total}
                          </span>
                          <span className="text-gray-400 font-normal">
                            {row.persen ?? 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full"
                            style={{ width: `${row.persen ?? 0}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditPackageLink
                        href={`/travel/master-data/paket-umrah/${row.slug}/ubah`}
                      />
                      <DeletePackageButton slug={row.slug} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showTravel ? 7 : 6}
                    className="py-10 text-center text-gray-500"
                  >
                    Tidak ada paket yang cocok dengan{" "}
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
