import { createClient } from "@/lib/supabase/server";
import {
  JAMAAH_LIST_PATH,
  JAMAAH_DOKUMEN_PATH,
  DOC_TYPE_VALUES,
  pilgrimStatusLabel,
} from "@/lib/data/pilgrim-fields";

export { JAMAAH_LIST_PATH, JAMAAH_DOKUMEN_PATH };

const PILGRIM_SELECT =
  "id, travel_id, order_id, package_id, full_name, phone, national_id, passport_number, passport_expiry, status, document_status, notes, created_at";

const DOC_SELECT =
  "id, pilgrim_id, doc_type, status, file_path, file_name, mime_type, file_size, expires_at, created_at";

async function scope(ctx) {
  const supabase = await createClient();
  return {
    supabase,
    travelId: ctx?.profile?.travel_id ?? null,
    isSuperAdmin: ctx?.profile?.role === "super_admin",
  };
}

// RLS pilgrims/pilgrim_documents sudah membatasi per travel, tapi filter
// eksplisit tetap dipasang supaya (a) super admin memang melihat semua travel
// dan (b) kebocoran policy katalog tidak pernah membuat jamaah travel lain
// ikut tampil.
function applyScope(builder, s) {
  if (s.isSuperAdmin || !s.travelId) return builder;
  return builder.eq("travel_id", s.travelId);
}

async function packageMap(s) {
  const { data } = await applyScope(
    s.supabase.from("packages").select("id, nama").is("deleted_at", null),
    s
  );
  return new Map((data ?? []).map((p) => [p.id, p.nama]));
}

async function travelMap(s) {
  const { data } = await s.supabase.from("travels").select("uid, nama");
  return new Map((data ?? []).map((t) => [t.uid, t.nama]));
}

// Satu query untuk semua dokumen (bukan `.in(pilgrim_id, ...)`): daftar jamaah
// bisa panjang dan id list masuk ke URL.
async function documentsByPilgrim(s) {
  const query = applyScope(
    s.supabase.from("pilgrim_documents").select(DOC_SELECT),
    s
  ).order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) return { map: null, error: "Dokumen jamaah gagal dimuat dari database." };

  const map = new Map();
  for (const doc of data ?? []) {
    if (!map.has(doc.pilgrim_id)) map.set(doc.pilgrim_id, []);
    map.get(doc.pilgrim_id).push(doc);
  }
  return { map, error: null };
}

function slotDokumen(docs) {
  const lengkap = DOC_TYPE_VALUES.filter((type) => docs.some((d) => d.doc_type === type));
  return { docs, docCount: lengkap.length, docTotal: DOC_TYPE_VALUES.length };
}

export async function listPilgrims(ctx) {
  const s = await scope(ctx);
  const { data: rows, error } = await applyScope(
    s.supabase.from("pilgrims").select(PILGRIM_SELECT).is("deleted_at", null),
    s
  ).order("created_at", { ascending: false });

  if (error) {
    console.error("listPilgrims gagal:", error.code, error.message);
    return { rows: [], error: "Jamaah gagal dimuat dari database." };
  }

  const dokumen = await documentsByPilgrim(s);
  if (dokumen.error) return { rows: [], error: dokumen.error };

  const paket = await packageMap(s);
  const travels = s.isSuperAdmin ? await travelMap(s) : null;

  return {
    rows: (rows ?? []).map((row) => ({
      ...row,
      ...slotDokumen(dokumen.map.get(row.id) ?? []),
      statusLabel: pilgrimStatusLabel(row.status),
      packageNama: row.package_id ? paket.get(row.package_id) ?? "(paket dihapus)" : null,
      travelNama: travels ? travels.get(row.travel_id) ?? "-" : null,
    })),
    error: null,
  };
}

// Dipakai halaman ubah. kepemilikan dicek eksplisit: SELECT pilgrims hanya
// mengembalikan baris travel pemanggil, jadi baris lintas-travel muncul sebagai
// null dan halaman menampilkan kartu "tidak ditemukan".
export async function getEditablePilgrim(ctx, id) {
  const s = await scope(ctx);
  const { data, error } = await s.supabase
    .from("pilgrims")
    .select(PILGRIM_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("getEditablePilgrim gagal:", error.code, error.message);
    return null;
  }
  if (!data) return null;
  if (!s.isSuperAdmin && (!s.travelId || data.travel_id !== s.travelId)) return null;
  return data;
}

export async function listPackageOptions(ctx) {
  const s = await scope(ctx);
  const { data, error } = await applyScope(
    s.supabase.from("packages").select("id, nama, slug").is("deleted_at", null),
    s
  ).order("nama", { ascending: true });
  if (error) {
    console.error("listPackageOptions gagal:", error.code, error.message);
    return { options: [], error: "Daftar paket gagal dimuat." };
  }
  return { options: data ?? [], error: null };
}
