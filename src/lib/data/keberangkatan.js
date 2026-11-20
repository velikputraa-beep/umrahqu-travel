import { readScope, scoped } from "@/lib/data/record-scope";
import { labelTanggal, tanggalDari } from "@/lib/data/orders";
import { listPackageOptions } from "@/lib/data/pilgrims";
import {
  MANASIK_STATUS,
  MANASIK_TONE,
  PERLENGKAPAN_STATUS,
  PERLENGKAPAN_TONE,
  labelDari,
} from "@/lib/data/record-fields";

// Baca-layer MODUL 8 (keberangkatan). rooms/room_assignments dipakai untuk
// penempatan kamar, sementara kursi jamaah memakai pilgrims.seat_preference —
// dua-duanya kolom yang sudah ada, jadi modul ini tidak butuh migrasi baru.

const MANASIK_SELECT =
  "id, title, description, event_date, start_time, end_time, location, status, package_id";

export async function listManasik(ctx) {
  const s = await readScope(ctx);
  const [{ options: paket }, jadwal] = await Promise.all([
    listPackageOptions(ctx),
    scoped(
      s.supabase
        .from("manasik_schedules")
        .select(MANASIK_SELECT)
        .order("event_date", { ascending: true }),
      s
    ),
  ]);
  if (jadwal.error) {
    console.error("listManasik gagal:", jadwal.error.code, jadwal.error.message);
    return {
      rows: [],
      paketNama: new Map(),
      stats: { jumlah: 0, akanDatang: 0, selesai: 0 },
      error: "Jadwal manasik gagal dimuat dari database.",
    };
  }

  const namaPaket = new Map((paket ?? []).map((p) => [p.id, p.nama]));
  const hariIni = new Date().toISOString().slice(0, 10);
  const rows = (jadwal.data ?? []).map((m) => ({
    key: m.id,
    id: m.id,
    tanggal: m.event_date ? labelTanggal(tanggalDari(m.event_date)) : "—",
    tanggalIso: m.event_date ?? "",
    jam: m.start_time ? String(m.start_time).slice(0, 5) : null,
    judul: m.title,
    deskripsi: m.description ?? null,
    paket: m.package_id ? namaPaket.get(m.package_id) ?? "(paket dihapus)" : "Umum",
    lokasi: m.location ?? "—",
    status: m.status ?? "scheduled",
    badge: {
      label: labelDari(MANASIK_STATUS, m.status, m.status ?? "Terjadwal"),
      tone: MANASIK_TONE[m.status] ?? "gray",
    },
    editHref: `/travel/keberangkatan/manasik/${m.id}/ubah`,
    deleteId: m.id,
  }));

  return {
    rows,
    paketNama: namaPaket,
    stats: {
      jumlah: rows.length,
      akanDatang: (jadwal.data ?? []).filter((m) => m.event_date >= hariIni).length,
      selesai: (jadwal.data ?? []).filter((m) => m.status === "done").length,
    },
    error: null,
  };
}

export async function getEditableManasik(ctx, id) {
  const s = await readScope(ctx);
  let query = s.supabase
    .from("manasik_schedules")
    .select(MANASIK_SELECT)
    .eq("id", id);
  if (!s.isSuperAdmin) {
    if (!s.travelId) return null;
    query = query.eq("travel_id", s.travelId);
  }
  const { data } = await query.maybeSingle();
  if (!data) return null;
  // Kolom DB dipetakan ke nama field form (manasikFields).
  return {
    id: data.id,
    judul: data.title ?? "",
    tanggal: data.event_date ?? "",
    jamMulai: data.start_time ? String(data.start_time).slice(0, 5) : "",
    lokasi: data.location ?? "",
    paket: data.package_id ?? "",
    deskripsi: data.description ?? "",
    status: data.status ?? "scheduled",
  };
}

const MANIFEST_PILGRIM_SELECT =
  "id, full_name, gender, status, package_id, order_id, seat_preference";

/**
 * Manifest per paket: jamaah + penempatan kamar (rooms/room_assignments) dan
 * kursi (pilgrims.seat_preference). Paket dipilih lewat query param `?paket=`.
 */
export async function listManifest(ctx, packageId) {
  const s = await readScope(ctx);
  const { options: paket, error: paketError } = await listPackageOptions(ctx);
  if (paketError) return { error: paketError, rows: [], paket: [], stats: null };

  const selected = paket.find((p) => p.id === packageId) ?? paket[0] ?? null;
  const base = { rows: [], paket, selected, error: null, stats: null };
  if (!selected) {
    return { ...base, error: "Travel Anda belum punya paket, jadi manifest belum bisa disusun." };
  }

  const [pilgrimRes, orderRes, roomRes, assignRes] = await Promise.all([
    scoped(
      s.supabase.from("pilgrims").select(MANIFEST_PILGRIM_SELECT).is("deleted_at", null),
      s
    ),
    scoped(s.supabase.from("orders").select("id, package_id"), s).is(
      "deleted_at",
      null
    ),
    scoped(
      s.supabase.from("rooms").select("id, room_number, capacity").eq("package_id", selected.id),
      s
    ),
    s.supabase
      .from("room_assignments")
      .select("id, room_id, pilgrim_id, bed_label"),
  ]);

  if (pilgrimRes.error || roomRes.error || assignRes.error) {
    console.error("listManifest gagal:", (pilgrimRes.error ?? roomRes.error ?? assignRes.error).message);
    return { ...base, error: "Manifest gagal dimuat dari database." };
  }

  const paketJamaah = new Map((orderRes.data ?? []).map((o) => [o.id, o.package_id]));
  const nomorKamar = new Map((roomRes.data ?? []).map((r) => [r.id, r.room_number]));
  const kamarByJamaah = new Map();
  for (const a of assignRes.data ?? []) {
    if (!nomorKamar.has(a.room_id)) continue;
    kamarByJamaah.set(a.pilgrim_id, {
      kamar: nomorKamar.get(a.room_id),
      bed: a.bed_label ?? null,
      assignmentId: a.id,
    });
  }

  const rows = (pilgrimRes.data ?? [])
    .filter((p) => (p.package_id ?? paketJamaah.get(p.order_id)) === selected.id)
    .map((p) => {
      const kamar = kamarByJamaah.get(p.id);
      return {
        key: p.id,
        id: p.id,
        nama: p.full_name ?? "(tanpa nama)",
        paket: selected.nama,
        kamar: kamar ? `${kamar.kamar}${kamar.bed ? ` · ${kamar.bed}` : ""}` : "Belum dibagi",
        kursi: p.seat_preference || "Belum dibagi",
        badge: {
          label: kamar && p.seat_preference ? "Siap berangkat" : "Perlu penempatan",
          tone: kamar && p.seat_preference ? "emerald" : "amber",
        },
        kamarLama: kamar?.kamar ?? "",
        kursiLama: p.seat_preference ?? "",
        editHref: `/travel/keberangkatan/manifest/${p.id}`,
        deleteId: null,
        lockNote: "Penempatan diubah lewat menu Ubah",
      };
    });

  const sudahKamar = rows.filter((r) => !r.kamar.startsWith("Belum")).length;
  const sudahKursi = rows.filter((r) => !r.kursi.startsWith("Belum")).length;
  const total = rows.length;

  return {
    rows,
    paket,
    selected,
    error: null,
    stats: {
      total,
      sudahKamar,
      belumKamar: total - sudahKamar,
      sudahKursi,
      belumKursi: total - sudahKursi,
      persenKamar: total ? Math.round((sudahKamar / total) * 100) : 0,
      persenKursi: total ? Math.round((sudahKursi / total) * 100) : 0,
    },
  };
}

export async function getManifestPilgrim(ctx, id) {
  const s = await readScope(ctx);
  let query = s.supabase
    .from("pilgrims")
    .select("id, full_name, package_id, order_id, seat_preference")
    .eq("id", id)
    .is("deleted_at", null);
  if (!s.isSuperAdmin) {
    if (!s.travelId) return null;
    query = query.eq("travel_id", s.travelId);
  }
  const { data } = await query.maybeSingle();
  if (!data) return null;

  // `orders.package_id` dibaca terpisah (bukan embedded select) karena project
  // ini tidak memasang foreign key, jadi PostgREST tidak bisa menaut paket.
  let packageId = data.package_id ?? null;
  if (!packageId && data.order_id) {
    const { data: order } = await s.supabase
      .from("orders")
      .select("package_id")
      .eq("id", data.order_id)
      .maybeSingle();
    packageId = order?.package_id ?? null;
  }
  const paketRes = packageId
    ? await s.supabase.from("packages").select("nama").eq("id", packageId).maybeSingle()
    : { data: null };

  const { data: assign } = await s.supabase
    .from("room_assignments")
    .select("id, room_id, bed_label")
    .eq("pilgrim_id", data.id)
    .maybeSingle();
  const roomRes = assign?.room_id
    ? await s.supabase.from("rooms").select("room_number").eq("id", assign.room_id).maybeSingle()
    : { data: null };

  return {
    ...data,
    paketNama: paketRes.data?.nama ?? "(paket belum dipilih)",
    packageId,
    kamarLama: roomRes.data?.room_number ?? "",
    bedLama: assign?.bed_label ?? "",
    assignmentId: assign?.id ?? null,
  };
}

const PERLENGKAPAN_SELECT =
  "id, item_name, size, quantity, status, notes, pilgrim_id, package_id, delivered_at, created_at";

/** Pilihan jamaah untuk form perlengkapan (query ringan, tanpa data perlengkapan). */
export async function listJamaahOptions(ctx) {
  const s = await readScope(ctx);
  const { data } = await scoped(
    s.supabase
      .from("pilgrims")
      .select("id, full_name")
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),
    s
  );
  return (data ?? []).map((p) => ({ id: p.id, full_name: p.full_name }));
}

export async function listPerlengkapan(ctx) {
  const s = await readScope(ctx);
  const [barangRes, jamaahRes] = await Promise.all([
    scoped(
      s.supabase.from("equipment_assignments").select(PERLENGKAPAN_SELECT),
      s
    ).order("created_at", { ascending: false }),
    scoped(
      s.supabase
        .from("pilgrims")
        .select("id, full_name, package_id")
        .is("deleted_at", null),
      s
    ),
  ]);
  if (barangRes.error) {
    console.error("listPerlengkapan gagal:", barangRes.error.code, barangRes.error.message);
    return { rows: [], jamaah: [], error: "Perlengkapan gagal dimuat dari database." };
  }

  const namaJamaah = new Map((jamaahRes.data ?? []).map((p) => [p.id, p.full_name]));
  const rows = (barangRes.data ?? []).map((e) => {
    const tanggal = e.delivered_at ?? e.created_at;
    const d = tanggalDari(String(tanggal ?? "").slice(0, 10));
    return {
      key: e.id,
      id: e.id,
      jamaah: (e.pilgrim_id && namaJamaah.get(e.pilgrim_id)) || "Belum ditautkan",
      item: `${e.item_name ?? "(tanpa nama)"}${e.size ? ` · ${e.size}` : ""}${
        Number(e.quantity) > 1 ? ` × ${e.quantity}` : ""
      }`,
      tanggal: labelTanggal(d),
      status: e.status ?? "not_delivered",
      badge: {
        label: labelDari(PERLENGKAPAN_STATUS, e.status, e.status ?? "Belum Diserahkan"),
        tone: PERLENGKAPAN_TONE[e.status] ?? "gray",
      },
      catatan: e.notes ?? null,
      editHref: `/travel/keberangkatan/perlengkapan/${e.id}/ubah`,
      deleteId: e.id,
    };
  });

  const belum = rows.filter((r) => r.status === "not_delivered").length;
  return {
    rows,
    jamaah: (jamaahRes.data ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      package_id: p.package_id,
    })),
    stats: { jumlah: rows.length, belum: belum, sudah: rows.length - belum },
    error: null,
  };
}

export async function getEditablePerlengkapan(ctx, id) {
  const s = await readScope(ctx);
  let query = s.supabase.from("equipment_assignments").select(PERLENGKAPAN_SELECT).eq("id", id);
  if (!s.isSuperAdmin) {
    if (!s.travelId) return null;
    query = query.eq("travel_id", s.travelId);
  }
  const { data } = await query.maybeSingle();
  if (!data) return null;
  // Kolom DB dipetakan ke nama field form (perlengkapanFields).
  return {
    id: data.id,
    jamaah: data.pilgrim_id ?? "",
    item: data.item_name ?? "",
    ukuran: data.size ?? "",
    jumlah: String(data.quantity ?? 1),
    status: data.status ?? "not_delivered",
    tanggal: String((data.delivered_at ?? data.created_at) ?? "").slice(0, 10),
    catatan: data.notes ?? "",
  };
}
