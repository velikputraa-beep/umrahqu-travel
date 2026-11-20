// Dipakai komponen client (form) dan server (action), jadi modul ini sengaja
// TIDAK mengimpor apa pun dari @/lib/supabase/server.
export const PACKAGE_LIST_PATH = "/travel/master-data/paket-umrah";

// Nilai yang benar-benar hidup di kolom packages.status.
export const PACKAGE_STATUS = ["Aktif", "Nonaktif", "Menunggu"];

export function slugify(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
