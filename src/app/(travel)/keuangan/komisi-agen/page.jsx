"use client";

import React from "react";
import {
  Wallet,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export default function KomisiAgenPage() {
  const stats = [
    { title: "Pending", value: "Rp 0", isGreen: false },
    { title: "Sudah Dibayar", value: "Rp 0", isGreen: true },
    { title: "Komisi", value: "Rp 0", isGreen: false },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          Komisi Agen
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Komisi otomatis saat pembayaran lunas.
        </p>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs"
          >
            <span className="text-xs font-medium text-gray-500">{s.title}</span>
            <div
              className={`text-2xl font-bold mt-2 ${
                s.isGreen ? "text-emerald-700" : "text-gray-900"
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daftar Komisi Card */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Daftar Komisi</h2>
            <p className="text-xs text-gray-400 mt-0.5">0 komisi</p>
          </div>
          <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-400">
            <Wallet className="size-4" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-36">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-600 font-semibold">
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Pesanan <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Agen <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Komisi <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Status <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-xs text-gray-400"
                >
                  Tidak ada data.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 mt-4">
          <div className="flex items-center gap-1.5">
            <span>Per halaman</span>
            <select className="border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-700 text-xs">
              <option>10</option>
              <option>25</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span>Page 1/1</span>
            <div className="inline-flex items-center gap-0.5">
              <button
                type="button"
                className="p-1 border border-gray-200 rounded text-gray-400"
              >
                <ChevronsLeft className="size-3" />
              </button>
              <button
                type="button"
                className="p-1 border border-gray-200 rounded text-gray-400"
              >
                <ChevronLeft className="size-3" />
              </button>
              <button
                type="button"
                className="p-1 border border-gray-200 rounded text-gray-400"
              >
                <ChevronRight className="size-3" />
              </button>
              <button
                type="button"
                className="p-1 border border-gray-200 rounded text-gray-400"
              >
                <ChevronsRight className="size-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
