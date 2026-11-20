"use client";

import React, { useState } from "react";
import {
  RotateCw,
  Plus,
  Search,
  SlidersHorizontal,
  Download,
  History,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export default function DepositTravelPage() {
  const [search, setSearch] = useState("");

  const stats = [
    {
      title: "Saldo Deposit",
      value: "Rp 50.000.000",
      subtitle: "Minimal Rp 10.000.000",
      color: "text-gray-900",
    },
    {
      title: "Status",
      value: "Aktif",
      subtitle: "An-Nahl",
      color: "text-gray-900",
    },
    {
      title: "Total Mutasi",
      value: "9",
      subtitle: "9 masuk • 0 keluar",
      color: "text-gray-900",
    },
    {
      title: "Mutasi Bulan Ini",
      value: "9",
      subtitle: "Catatan 30 hari terakhir",
      color: "text-gray-900",
    },
  ];

  const mutations = [
    {
      date: "2 hari lalu",
      title: "Commission hold",
      desc: "Penahanan (Hold) komisi marketplace u...",
      amount: "+Rp 0",
      isLarge: false,
      balance: "Rp 50 jt",
    },
    {
      date: "3 hari lalu",
      title: "Commission hold",
      desc: "Penahanan (Hold) komisi marketplace u...",
      amount: "+Rp 0",
      isLarge: false,
      balance: "Rp 50 jt",
    },
    {
      date: "3 hari lalu",
      title: "Commission hold",
      desc: "Penahanan (Hold) komisi marketplace u...",
      amount: "+Rp 0",
      isLarge: false,
      balance: "Rp 50 jt",
    },
    {
      date: "4 hari lalu",
      title: "Commission hold",
      desc: "Penahanan (Hold) komisi marketplace u...",
      amount: "+Rp 0",
      isLarge: false,
      balance: "Rp 50 jt",
    },
    {
      date: "5 hari lalu",
      title: "Commission hold",
      desc: "Penahanan (Hold) komisi marketplace u...",
      amount: "+Rp 0",
      isLarge: false,
      balance: "Rp 50 jt",
    },
    {
      date: "10 hari lalu",
      title: "Commission hold",
      desc: "Penahanan (Hold) komisi marketplace u...",
      amount: "+Rp 0",
      isLarge: false,
      balance: "Rp 50 jt",
    },
    {
      date: "11 hari lalu",
      title: "Commission hold",
      desc: "Penahanan (Hold) komisi marketplace u...",
      amount: "+Rp 0",
      isLarge: false,
      balance: "Rp 50 jt",
    },
    {
      date: "12 hari lalu",
      title: "Commission hold",
      desc: "Penahanan (Hold) komisi marketplace u...",
      amount: "+Rp 0",
      isLarge: false,
      balance: "Rp 50 jt",
    },
    {
      date: "12 hari lalu",
      title: "Isi Saldo",
      desc: "Top-up Saldo Deposit via Midtrans (Ord...",
      amount: "+Rp 50.000.000",
      isLarge: true,
      balance: "Rp 50 jt",
    },
  ];

  const filtered = mutations.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          Deposit Travel
        </h1>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="p-2 border border-gray-200 rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
            title="Refresh"
          >
            <RotateCw className="size-4" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Plus className="size-4" />
            <span>Isi Saldo Deposit</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between"
          >
            <span className="text-xs font-medium text-gray-500">{s.title}</span>
            <div className={`text-xl font-bold mt-2 ${s.color}`}>{s.value}</div>
            <p className="text-[11px] text-gray-400 mt-1">{s.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Deposit & Mutasi Travel
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">9 mutasi ditemukan</p>
          </div>
          <div className="text-gray-400">
            <History className="size-4" />
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari keterangan mutasi..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <SlidersHorizontal className="size-3.5 text-gray-500" />
              <span>Filter</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <Download className="size-3.5" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-600 font-semibold">
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Tanggal <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Keterangan</th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Jumlah <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Saldo Akhir <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3 text-gray-500">{item.date}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-gray-900">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-gray-500">{item.desc}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-emerald-700">
                    {item.amount}
                  </td>
                  <td className="py-3 px-3 font-medium text-gray-900">
                    {item.balance}
                  </td>
                </tr>
              ))}
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
