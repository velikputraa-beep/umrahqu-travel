import { redirect } from "next/navigation";
import SidebarTravel from "@/components/layout/SidebarTravel";
import {
  getTravelContext,
  initialsOf,
  ROLE_LABEL,
} from "@/lib/auth/session";
import { canAccessKeuangan } from "@/lib/data/payment-fields";
import { Search, Globe, Bell, Sun, ChevronDown, PanelLeft } from "lucide-react";

export default async function TravelLayout({ children }) {
  const ctx = await getTravelContext();

  // proxy.js sudah menjaga redirect; ini penjaga kedua supaya layout tidak
  // pernah dirender tanpa identitas sesi.
  if (!ctx) redirect("/login");

  const { profile, travelName } = ctx;
  const travel = travelName || "UmrahQu Pusat";

  const session = {
    travel,
    travelInitials: initialsOf(travel),
    fullName: profile?.full_name || ctx.user.email,
    roleLabel: ROLE_LABEL[profile?.role] || "Anggota Travel",
    userInitials: initialsOf(profile?.full_name || ctx.user.email),
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      {/* Sidebar (Fixed on the left) */}
      <SidebarTravel session={session} canKeuangan={canAccessKeuangan(profile?.role)} />

      {/* Main Content Area (Offset by ml-64) */}
      <div className="ml-64 min-h-screen flex flex-col">
        {/* Topbar Header */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
          {/* Left: Sidebar toggle + Search Bar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Toggle Sidebar"
            >
              <PanelLeft className="size-5" />
            </button>

            <div className="relative w-72 md:w-84">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari jamaah, paket, pesanan..."
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* English Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Globe className="size-3.5 text-gray-500" />
              <span>English</span>
              <ChevronDown className="size-3 text-gray-400" />
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Notifikasi"
            >
              <Bell className="size-4.5" />
              <span className="absolute top-1 right-1 size-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                9
              </span>
            </button>

            {/* Sun / Theme Switcher */}
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Tema"
            >
              <Sun className="size-4.5" />
            </button>

            {/* User Avatar */}
            <div className="flex items-center ml-1" title={session.fullName}>
              <div className="size-8 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-serif font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer">
                {session.travelInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
