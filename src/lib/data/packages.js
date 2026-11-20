import { createClient } from "@/lib/supabase/server";
import { PACKAGE_LIST_PATH, PACKAGE_STATUS, slugify } from "@/lib/data/package-fields";

export { PACKAGE_LIST_PATH, PACKAGE_STATUS, slugify };

async function scope(ctx) {
  const supabase = await createClient();
  const travelId = ctx.profile?.travel_id ?? null;
  const isSuperAdmin = ctx.profile?.role === "super_admin";
  return { supabase, travelId, isSuperAdmin, query: supabase.from("packages") };
}

// packages TIDAK di-scope RLS-nya (katalog publik untuk Marketplace, Keputusan D),
// jadi pembatas travel harus eksplisit di sisi aplikasi.
function applyScope(builder, { travelId, isSuperAdmin }) {
  if (isSuperAdmin || !travelId) return builder;
  return builder.eq("travel_id", travelId);
}

export async function listPackages(ctx) {
  const s = await scope(ctx);
  let query = applyScope(
    s.query
      .select(
        "slug, nama, travel, biaya, status, kategori, terisi, total, persen, imgColor, duration_nights, description, includes, created_at"
      )
      .is("deleted_at", null),
    s
  );
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("listPackages gagal:", error.message);
    return { rows: [], error: "Paket gagal dimuat dari database." };
  }
  return { rows: data ?? [], error: null };
}

// Dipakai halaman edit. SELECT packages boleh dibaca siapa saja (katalog publik),
// jadi kepemilikan travel dicek di sini sebelum form edit ditampilkan.
export async function getEditablePackage(ctx, slug) {
  const s = await scope(ctx);
  const { data, error } = await s.query
    .select(
      "slug, id, nama, travel, travel_id, biaya, status, kategori, terisi, total, duration_nights, description, includes"
    )
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("getEditablePackage gagal:", error.message);
    return null;
  }
  if (!data) return null;
  if (!s.isSuperAdmin && (!s.travelId || data.travel_id !== s.travelId)) return null;

  const hotel = await s.supabase
    .from("package_hotels")
    .select("hotel_name")
    .eq("package_id", data.id)
    .order("sequence", { ascending: true })
    .limit(1)
    .maybeSingle();
  const flight = await s.supabase
    .from("package_flights")
    .select("airline_name")
    .eq("package_id", data.id)
    .order("sequence", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    ...data,
    hotel: hotel?.data?.hotel_name ?? null,
    maskapai: flight?.data?.airline_name ?? null,
  };
}
