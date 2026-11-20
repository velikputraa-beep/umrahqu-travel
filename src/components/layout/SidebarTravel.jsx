"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { travelMenu } from "@/data/travel-menu";
import { logout } from "@/lib/auth/actions";
import {
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";

// Helper to normalize path with or without /travel prefix
function normalizePath(p) {
  if (!p) return "";
  const cleaned = p.replace(/^\/travel/, "");
  return cleaned === "" ? "/" : cleaned;
}

function isUrlMatch(target, current) {
  if (!target || !current) return false;
  if (target === current) return true;
  return normalizePath(target) === normalizePath(current);
}

function isUrlPrefixMatch(target, current) {
  if (!target || !current) return false;
  if (current.startsWith(target + "/")) return true;
  const normTarget = normalizePath(target);
  const normCurrent = normalizePath(current);
  if (normTarget === "/") return false;
  return normCurrent.startsWith(normTarget + "/");
}

function MenuItem({ item, pathname }) {
  const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;

  // Check if current item or any of its descendants is active
  const isDirectActive = item.url && isUrlMatch(item.url, pathname);
  const isSubActive =
    hasSubmenu &&
    item.submenu.some(
      (sub) =>
        isUrlMatch(sub.url, pathname) || isUrlPrefixMatch(sub.url, pathname)
    );

  // null = accordion mengikuti rute aktif; begitu diklik, pilihan pengguna menang.
  const [manual, setManual] = useState(null);
  const isOpen = manual ?? isSubActive;

  const IconComponent = item.icon;

  if (!hasSubmenu) {
    return (
      <div className="mb-1">
        <Link
          href={item.url || "#"}
          className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isDirectActive
              ? "text-emerald-700 bg-emerald-50"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          {IconComponent && (
            <IconComponent
              className={`size-4.5 shrink-0 ${
                isDirectActive ? "text-emerald-600" : "text-gray-500"
              }`}
            />
          )}
          <span>{item.title}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setManual(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isSubActive
            ? "text-emerald-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-3">
          {IconComponent && (
            <IconComponent
              className={`size-4.5 shrink-0 ${
                isSubActive ? "text-emerald-600" : "text-gray-500"
              }`}
            />
          )}
          <span>{item.title}</span>
        </div>
        {isOpen ? (
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${
              isSubActive ? "text-emerald-600" : "text-gray-400"
            }`}
          />
        ) : (
          <ChevronRight
            className={`size-4 transition-transform duration-200 ${
              isSubActive ? "text-emerald-600" : "text-gray-400"
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div className="ml-5.5 pl-3 border-l border-gray-200 mt-1 space-y-1">
          {item.submenu.map((sub, index) => {
            const isSubItemActive = isUrlMatch(sub.url, pathname);
            return (
              <div key={sub.url || index}>
                <Link
                  href={sub.url || "#"}
                  className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                    isSubItemActive
                      ? "text-emerald-700 bg-emerald-50 font-medium"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {sub.title}
                </Link>
                {/* Recursive support if submenu contains further submenus */}
                {Array.isArray(sub.submenu) && sub.submenu.length > 0 && (
                  <div className="ml-3 pl-3 border-l border-gray-200 mt-1 space-y-1">
                    {sub.submenu.map((deepSub, deepIdx) => (
                      <MenuItem
                        key={deepSub.url || deepIdx}
                        item={deepSub}
                        pathname={pathname}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SidebarTravel({ session, canKeuangan = true }) {
  const pathname = usePathname();
  const {
    travel = "UmrahQu",
    travelInitials = "UQ",
    fullName = "-",
    roleLabel = "Anggota Travel",
    userInitials = "?",
  } = session || {};

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 fixed top-0 left-0 z-30 flex flex-col justify-between">
      {/* Top Header / Logo */}
      <div>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 shrink-0 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 text-xs font-serif font-bold shadow-xs">
              {travelInitials}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 leading-tight truncate">
                {travel}
              </h2>
              <p className="text-xs text-gray-500">Semua Cabang</p>
            </div>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
            title="Pilih Cabang"
          >
            <ChevronsUpDown className="size-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 overflow-y-auto max-h-[calc(100vh-140px)]">
          {/* OQ-7: grup Keuangan disembunyikan untuk role operasional/staf.
              Halamanya juga dijaga server-side, jadi ini hanya kenyamanan UI. */}
          {(canKeuangan
            ? travelMenu
            : travelMenu.filter((item) => item.title !== "Keuangan")
          ).map((item, idx) => (
            <MenuItem key={item.title || idx} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>

      {/* User Profile Card at Bottom */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 shrink-0 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs border border-emerald-200">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-900 leading-tight truncate">
                {fullName}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {roleLabel}
              </span>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Keluar"
              className="text-gray-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
