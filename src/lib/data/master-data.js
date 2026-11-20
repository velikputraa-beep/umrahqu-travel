import { readScope, scoped } from "@/lib/data/record-scope";
import { formatRupiah } from "@/lib/data/dashboard";
import { TRIGGER_KOMISI, labelDari } from "@/lib/data/record-fields";

// Baca-layer MODUL 7 (master data). hotels punya baris "master platform"
// (travel_id NULL) yang boleh dibaca semua travel tapi tidak boleh diubah
// dari halaman ini, jadi kepemilikan ditandai per baris untuk UI.

const HOTEL_SELECT =
  "id, nama, kota, bintang, jarak, alamat, mitra, status, travel_id";

export async function listHotels(ctx) {
  const s = await readScope(ctx);
  const { data, error } = await s.supabase
    .from("hotels")
    .select(HOTEL_SELECT)
    .is("deleted_at", null)
    .order("kota", { ascending: true })
    .order("nama", { ascending: true });
  if (error) {
    console.error("listHotels gagal:", error.code, error.message);
    return { rows: [], error: "Daftar hotel gagal dimuat dari database." };
  }
  const rows = (data ?? []).map((h) => {
    const milikSendiri =
      s.isSuperAdmin || (h.travel_id && h.travel_id === s.travelId);
    return {
      key: h.id,
      id: h.id,
      nama: h.nama,
      kota: h.kota ?? "—",
      alamat: h.alamat ?? h.mitra ?? null,
      jarak: h.jarak ?? null,
      bintang: Number(h.bintang) || 0,
      status: h.status ?? "Aktif",
      badge: {
        label: h.status ?? "Aktif",
        tone: h.status === "Nonaktif" ? "gray" : "emerald",
      },
      shared: !h.travel_id,
      editHref: milikSendiri ? `/travel/master-data/hotel/${h.id}/ubah` : null,
      deleteId: milikSendiri ? h.id : null,
      lockNote: milikSendiri
        ? null
        : "Master platform: hanya super admin yang bisa mengubah.",
    };
  });
  return { rows, error: null, travelName: s.travelName };
}

export async function getEditableHotel(ctx, id) {
  const s = await readScope(ctx);
  // `hotels` punya baris master platform (travel_id NULL) yang terbaca oleh
  // semua travel; halaman ubah hanya untuk baris milik sendiri.
  let query = s.supabase
    .from("hotels")
    .select(HOTEL_SELECT)
    .eq("id", id)
    .not("travel_id", "is", null);
  if (!s.isSuperAdmin) {
    if (!s.travelId) return null;
    query = query.eq("travel_id", s.travelId);
  }
  const { data } = await query.maybeSingle();
  return data ?? null;
}

const AGENT_SELECT =
  "id, name, phone, referral_code, commission_amount, commission_trigger, is_active, notes";

export async function listAgents(ctx) {
  const s = await readScope(ctx);
  const { data, error } = await scoped(
    s.supabase
      .from("agents")
      .select(AGENT_SELECT)
      .is("deleted_at", null),
    s
  ).order("name", { ascending: true });
  if (error) {
    console.error("listAgents gagal:", error.code, error.message);
    return { rows: [], error: "Daftar agen gagal dimuat dari database." };
  }
  const rows = (data ?? []).map((a) => {
    const trigger = labelDari(
      TRIGGER_KOMISI,
      a.commission_trigger,
      a.commission_trigger ?? "—"
    );
    return {
      key: a.id,
      id: a.id,
      nama: a.name ?? "(tanpa nama)",
      referral: a.referral_code ?? null,
      kontak: a.phone ?? "—",
      komisi: `${formatRupiah(a.commission_amount ?? 0)} · ${trigger.toLowerCase()}`,
      catatan: a.notes ?? null,
      badge: {
        label: a.is_active === false ? "Nonaktif" : "Aktif",
        tone: a.is_active === false ? "gray" : "emerald",
      },
      editHref: `/travel/master-data/agen-reseller/${a.id}/ubah`,
      deleteId: a.id,
    };
  });
  return { rows, error: null, travelName: s.travelName };
}

export async function getEditableAgent(ctx, id) {
  const s = await readScope(ctx);
  let query = s.supabase.from("agents").select(AGENT_SELECT).eq("id", id);
  if (!s.isSuperAdmin) {
    if (!s.travelId) return null;
    query = query.eq("travel_id", s.travelId);
  }
  const { data } = await query.maybeSingle();
  if (!data) return null;
  // Nama kolom DB dipetakan ke nama field form (AGEN_FIELDS) supaya nilai
  // lama langsung terisi saat ubah.
  return {
    id: data.id,
    nama: data.name ?? "",
    kontak: data.phone ?? "",
    referral: data.referral_code ?? "",
    komisi: data.commission_amount == null ? "" : String(data.commission_amount),
    trigger: data.commission_trigger ?? "pelunasan",
    status: data.is_active === false ? "nonaktif" : "aktif",
    catatan: data.notes ?? "",
  };
}
