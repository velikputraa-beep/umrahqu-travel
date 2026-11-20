"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, UserRoundPlus } from "lucide-react";
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
import DeletePilgrimButton, {
  EditPilgrimLink,
  PilgrimStatusBadge,
} from "@/components/travel/pilgrim-row-actions";
import { JAMAAH_LIST_PATH } from "@/lib/data/pilgrim-fields";

const NEW_PILGRIM_PATH = `${JAMAAH_LIST_PATH}/baru`;

export default function PilgrimsTable({ rows, showTravel = false }) {
  const [search, setSearch] = useState("");

  const keyword = search.trim().toLowerCase();
  const filtered = keyword
    ? rows.filter(
        (r) =>
          String(r.full_name ?? "").toLowerCase().includes(keyword) ||
          String(r.passport_number ?? "").toLowerCase().includes(keyword) ||
          String(r.national_id ?? "").toLowerCase().includes(keyword) ||
          String(r.phone ?? "").toLowerCase().includes(keyword)
      )
    : rows;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xs text-gray-500">
          {rows.length} jamaah {rows.length === 1 ? "ditemukan" : "ditemukan"}
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIK, paspor, atau HP..."
            className="h-9 pl-9 text-xs bg-white border-gray-200 shadow-2xs focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <UserRoundPlus className="size-8 text-gray-300" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Belum ada jamaah</p>
            <p className="text-xs text-gray-500 mt-1">
              Tambahkan jamaah pertama agar dokumen dan statusnya bisa
              dikelola dari halaman ini.
            </p>
          </div>
          <Button
            asChild
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-1.5 px-3.5 h-9 shadow-2xs"
          >
            <Link href={NEW_PILGRIM_PATH}>
              <UserRoundPlus className="size-4" />
              Jamaah Baru
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-transparent">
                <TableHead className="text-gray-600 font-semibold">Jamaah</TableHead>
                {showTravel && (
                  <TableHead className="text-gray-600 font-semibold">Travel</TableHead>
                )}
                <TableHead className="text-gray-600 font-semibold">Dokumen</TableHead>
                <TableHead className="text-gray-600 font-semibold">Paket</TableHead>
                <TableHead className="text-gray-600 font-semibold">Status</TableHead>
                <TableHead className="text-gray-600 font-semibold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <TableRow key={row.id} className="hover:bg-gray-50/80">
                  <TableCell className="py-3.5">
                    <div className="font-bold text-gray-900 leading-tight">
                      {row.full_name || "(tanpa nama)"}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {row.phone || row.passport_number || row.national_id || "-"}
                    </div>
                  </TableCell>
                  {showTravel && (
                    <TableCell className="py-3.5 text-gray-600">
                      {row.travelNama ?? "-"}
                    </TableCell>
                  )}
                  <TableCell className="py-3.5">
                    <div className="w-32">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 mb-1">
                        <span>
                          {row.docCount} / {row.docTotal}
                        </span>
                        <span className="text-gray-400 font-normal">
                          {row.document_status === "complete" ? "lengkap" : "belum"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            row.document_status === "complete"
                              ? "bg-emerald-600"
                              : "bg-amber-500"
                          }`}
                          style={{
                            width: `${Math.round(
                              (row.docCount / row.docTotal) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-gray-700">
                    {row.packageNama ?? (
                      <span className="text-gray-400">Tanpa paket</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <PilgrimStatusBadge status={row.status} label={row.statusLabel} />
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditPilgrimLink href={`${JAMAAH_LIST_PATH}/${row.id}/ubah`} />
                      <DeletePilgrimButton id={row.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showTravel ? 6 : 5}
                    className="py-10 text-center text-gray-500"
                  >
                    Tidak ada jamaah yang cocok dengan{" "}
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
