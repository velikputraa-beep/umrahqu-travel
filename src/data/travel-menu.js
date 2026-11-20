import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Plane,
  Wallet,
  Database,
  Headphones,
  Settings,
} from "lucide-react";

export const travelMenu = [
  {
    title: "Dashboard",
    url: "/travel/dashboard",
    icon: LayoutDashboard,
    iconName: "LayoutDashboard",
  },
  {
    title: "Pesanan",
    icon: ShoppingBag,
    iconName: "ShoppingBag",
    submenu: [
      {
        title: "Dashboard",
        url: "/travel/pesanan/dashboard",
      },
      {
        title: "Pesanan",
        url: "/travel/pesanan",
      },
    ],
  },
  {
    title: "Jamaah",
    icon: Users,
    iconName: "Users",
    submenu: [
      {
        title: "Jamaah",
        url: "/travel/jamaah",
      },
      {
        title: "Dokumen Jamaah",
        url: "/travel/jamaah/dokumen",
      },
    ],
  },
  {
    title: "Keberangkatan",
    icon: Plane,
    iconName: "Plane",
    submenu: [
      {
        title: "Manasik",
        url: "/travel/keberangkatan/manasik",
      },
      {
        title: "Manifest & Rooming",
        url: "/travel/keberangkatan/manifest",
      },
      {
        title: "Perlengkapan",
        url: "/travel/keberangkatan/perlengkapan",
      },
    ],
  },
  {
    title: "Keuangan",
    icon: Wallet,
    iconName: "Wallet",
    submenu: [
      {
        title: "Pembayaran",
        url: "/travel/keuangan/pembayaran",
      },
      {
        title: "Cicilan",
        url: "/travel/keuangan/cicilan",
      },
      {
        title: "Komisi Agen",
        url: "/travel/keuangan/komisi-agen",
      },
      {
        title: "Deposit Travel",
        url: "/travel/keuangan/deposit-travel",
      },
    ],
  },
  {
    title: "Master Data",
    icon: Database,
    iconName: "Database",
    submenu: [
      {
        title: "Paket Umrah",
        url: "/travel/master-data/paket-umrah",
      },
      {
        title: "Hotel",
        url: "/travel/master-data/hotel",
      },
      {
        title: "Agen/Reseller",
        url: "/travel/master-data/agen-reseller",
      },
    ],
  },
  {
    title: "Bantuan",
    url: "/travel/bantuan",
    icon: Headphones,
    iconName: "Headphones",
  },
  {
    title: "Pengaturan",
    icon: Settings,
    iconName: "Settings",
    submenu: [
      {
        title: "Profil Travel",
        url: "/travel/pengaturan/profil",
      },
      {
        title: "Data Cabang",
        url: "/travel/pengaturan/data-cabang",
      },
      {
        title: "Rekap Cabang",
        url: "/travel/pengaturan/rekap-cabang",
      },
    ],
  },
];
