"use client";

import React, { useState } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Mail,
  HelpCircle,
} from "lucide-react";

export default function BantuanPage() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const workflowSteps = [
    {
      num: 1,
      title: "Booking (Pesanan)",
      desc: "Pilih paket umrah, lengkapi data jamaah di Pesanan.",
    },
    {
      num: 2,
      title: "Pembayaran",
      desc: "Terima cash, debit, transfer, catat invoice dan cicilan.",
    },
    {
      num: 3,
      title: "Jamaah",
      desc: "Nama, paspor, data kependudukan, anggota keluarga.",
    },
    {
      num: 4,
      title: "Jadwal & Manasik",
      desc: "Buat sesi, atur lokasi, tambah peserta.",
    },
    {
      num: 5,
      title: "Presensi",
      desc: "Tandai kehadiran jamaah per sesi manasik.",
    },
    {
      num: 6,
      title: "Dokumen",
      desc: "Upload, pantau status passport, pas foto, visa.",
    },
  ];

  const faqCategories = [
    {
      category: "Booking",
      questions: [
        {
          q: "Bagaimana membuat pesanan baru?",
          a: "Anda dapat membuat pesanan baru melalui menu Pesanan > Pesanan lalu klik tombol '+ Buat Pesanan' di pojok kanan atas.",
        },
        {
          q: "Ada berapa status pesanan?",
          a: "Terdapat status: Menunggu Pembayaran, Diproses, Dikonfirmasi, Selesai, dan Dibatalkan.",
        },
        {
          q: "Bisa terima pembayaran secara cicilan?",
          a: "Ya, sistem mendukung pembayaran cicilan baik secara tunai/transfer offline maupun melalui gateway pembayaran online.",
        },
      ],
    },
    {
      category: "Jamaah & Dokumen",
      questions: [
        {
          q: "Bagaimana cara menambah kuota ke pesanan?",
          a: "Buka detail pesanan terkait lalu pilih opsi tambah peserta/jamaah sesuai sisa kuota yang tersedia.",
        },
        {
          q: "Bagaimana cara upload dokumen jamaah?",
          a: "Masuk ke menu Jamaah > Dokumen Jamaah, pilih jamaah terkait lalu klik tombol unggah pada KTP, KK, Paspor, atau Sertifikat Vaksin.",
        },
      ],
    },
    {
      category: "Manasik & Presensi",
      questions: [
        {
          q: "Bagaimana cara membuat jadwal manasik?",
          a: "Buka menu Keberangkatan > Manasik, lalu klik '+ Buat Jadwal' untuk mengatur tanggal, waktu, dan lokasi manasik.",
        },
        {
          q: "Bagaimana cara mencatat kehadiran?",
          a: "Pada sesi manasik yang aktif, buka daftar hadir jamaah dan centang presensi jamaah yang hadir.",
        },
      ],
    },
    {
      category: "Akun & Lainnya",
      questions: [
        {
          q: "Bagaimana cara mengubah password?",
          a: "Masuk ke menu Pengaturan > Profil Travel > tab Password untuk memperbarui kata sandi akun Anda.",
        },
        {
          q: "Siapa yang harus dihubungi jika ada masalah?",
          a: "Anda dapat menghubungi tim support teknis UmrahQu melalui tombol 'Email support' di bagian bawah halaman ini.",
        },
      ],
    },
  ];

  const toggleFaq = (key) => {
    setOpenFaq(openFaq === key ? null : key);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          Bantuan & Panduan
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Panduan sistem UmrahQu. Cari jawaban di bawah atau ikuti alur kerja.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari bantuan, misalnya cicilan atau jadwal"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all shadow-2xs"
        />
      </div>

      {/* Cara Kerja Sistem */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-900">Cara kerja sistem</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Enam langkah utama dari booking sampai selesai.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs divide-y divide-gray-100 overflow-hidden">
          {workflowSteps.map((step) => (
            <div
              key={step.num}
              className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="size-7 rounded-md bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Pertanyaan yang umum muncul */}
      <div>
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-900">
            Pertanyaan yang umum muncul
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Jawaban dari hal yang paling sering ditanyakan di tingkat travel.
          </p>
        </div>

        <div className="space-y-6">
          {faqCategories.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-2">
              <h3 className="text-xs font-bold text-gray-700">{cat.category}</h3>
              <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs divide-y divide-gray-100 overflow-hidden">
                {cat.questions.map((faq, qIdx) => {
                  const itemKey = `${catIdx}-${qIdx}`;
                  const isOpen = openFaq === itemKey;
                  return (
                    <div key={qIdx}>
                      <button
                        type="button"
                        onClick={() => toggleFaq(itemKey)}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50/60 transition-colors"
                      >
                        <span className="text-xs font-semibold text-gray-800">
                          {faq.q}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="size-4 text-gray-400 transition-transform" />
                        ) : (
                          <ChevronDown className="size-4 text-gray-400 -rotate-90 transition-transform" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-gray-600 bg-gray-50/40 border-t border-gray-50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Belum menemukan jawaban? */}
      <div className="pt-4 border-t border-gray-200">
        <h2 className="text-sm font-bold text-gray-900">
          Belum menemukan jawaban?
        </h2>
        <p className="text-xs text-gray-500 mt-0.5 mb-4">
          Buka daftar lengkap FAQ encyclopedia, atau hubungi administrator travel
          Anda.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Search className="size-3.5" />
            <span>Lihat keseluruhan FAQ</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Mail className="size-3.5 text-gray-500" />
            <span>Email support</span>
          </button>
        </div>
      </div>
    </div>
  );
}
