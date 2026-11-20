"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTravelContext } from "@/lib/auth/session";
import { parseRupiah } from "@/lib/data/dashboard";
import { UUID_RE } from "@/lib/data/payments";
import {
  CICILAN_LIST_PATH,
  PEMBAYARAN_LIST_PATH,
  canAccessKeuangan,
  countsAsMoneyIn,
  normalizePaymentMethodInput,
  normalizePaymentRowStatusInput,
} from "@/lib/data/payment-fields";

const PROOF_BUCKET = "payment-proofs";
const PROOF_MAX_BYTES = 5 * 1024 * 1024;
const PROOF_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Pembayaran yang dibuat dari portal ini berkode PAY- mengikuti pola web asli
// (PAY-261113LWEM). `payments.code` tidak diberi unique index, jadi bagian
// acaknya dibuat lebar (Risiko R-7).
function buatKodePembayaran() {
  const now = new Date();
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const acak = Array.from({ length: 6 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 33))
  ).join("");
  return `PAY-${ymd}${acak}`;
}

function pesanError(error) {
  return error?.message
    ? `Database menolak penyimpanan: ${error.message}`
    : "Terjadi kesalahan tak terduga.";
}

// OQ-7 (keputusan user 2026-11-16): hanya admin & finance yang boleh menulis
// keuangan. Guard ini ada di aksi, bukan hanya di halaman, supaya `/keuangan`
// yang dijaga UI tetap tidak bisa dilewati lewat form apa pun.
async function financeScope() {
  const ctx = await getTravelContext();
  if (!ctx?.profile) return { error: "Sesi tidak dikenali. Silakan masuk kembali." };
  const travelId = ctx.profile.travel_id ?? null;
  if (!travelId) {
    return {
      error: "Akun Anda belum ditautkan ke travel mana pun, jadi belum bisa mencatat keuangan.",
    };
  }
  if (!canAccessKeuangan(ctx.profile.role)) {
    return {
      error:
        "Hanya Administrator atau Keuangan travel yang boleh mencatat pembayaran dan cicilan.",
    };
  }
  return {
    supabase: await createClient(),
    travelId,
    travelName: ctx.travelName ?? null,
    userId: ctx.user?.id ?? null,
    isSuperAdmin: ctx.profile.role === "super_admin",
  };
}

function tanggalValid(nilai) {
  return /^\d{4}-\d{2}-\d{2}$/.test(nilai) ? nilai : null;
}

// Aksi keuangan bisa dipanggil dari halaman mana pun, jadi ia perlu tahu ke
// mana harus redirect setelah sukses. `lanjut` dikirim form dan karena itu
// disanitasi: hanya path internal portal yang dipercaya, sisanya jatuh ke
// halaman daftar.
function tujuanLanjut(lanjut, fallback) {
  const nilai = String(lanjut ?? "").trim();
  if (nilai === "cicilan") return CICILAN_LIST_PATH;
  return /^\/travel\/(pesanan|keuangan)\/[A-Za-z0-9\-_/]*$/.test(nilai) ? nilai : fallback;
}

function nomorRupiah(nilai) {
  // Field angka mengirim "32500000"; field teks bisa mengirim "Rp 32.500.000".
  const raw = String(nilai ?? "").trim();
  return /^\d+$/.test(raw.replace(/\D/g, "")) ? parseRupiah(raw) : 0;
}

// ---------------------------------------------------------------------------
// KONTRAK MODUL 6 — satu-satunya tempat angka uang order dihitung.
//
//   uang masuk  = SUM(payments.amount)
//                 WHERE sasaran sama AND deleted_at IS NULL
//                 AND status in (pending, paid, verified)
//   paid        = uang masuk
//   remaining   = GREATEST(total_amount - paid, 0)
//   status      = 0 -> unpaid · 0<paid<total -> partial · paid>=total -> paid
//
// Selalu dihitung ulang dari baris `payments`, TIDAK PERNAH inkremental: dua
// penulisan paralel jadi tetap konvergen dan angka yang sempat basi memulihkan
// dirinya sendiri (Risiko R-2 & R-8). Nominal dari `transactions` warisan
// tidak pernah ikut dijumlah — itu penyebab uang terhitung dua kali (R-1).
// `orders.status` tidak pernah disentuh dari sini (OQ-1: admin konfirmasi
// manual).
// ---------------------------------------------------------------------------
const HITUNG_MASUK = countsAsMoneyIn;

async function recomputeOrderPayment(s, orderId) {
  if (!orderId) return { paid: 0, status: null };
  const { data: rows, error } = await s.supabase
    .from("payments")
    .select("amount, status")
    .eq("order_id", orderId)
    .is("deleted_at", null);
  if (error) return { error: pesanError(error) };

  const paid = (rows ?? [])
    .filter((p) => HITUNG_MASUK(p.status))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const { data: order } = await s.supabase
    .from("orders")
    .select("id, total_amount")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { paid };

  const total = Number(order.total_amount) || 0;
  const status = paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";
  const { error: updateError } = await s.supabase
    .from("orders")
    .update({
      paid_amount: paid,
      remaining_amount: Math.max(total - paid, 0),
      payment_status: status,
    })
    .eq("id", orderId);
  if (updateError) return { error: pesanError(updateError) };
  return { paid, status };
}

// Menemukan sasaran pembayaran: uuid → baris `orders`; selain itu → kode
// `bookings` lama. Kepemilikan selalu dicek di aplikasi, bukan hanya mengandalkan
// RLS, supaya pesannya jujur ("bukan milik travel Anda"), bukan kosong.
async function findTarget(s, ref) {
  const kode = String(ref ?? "").trim();
  if (!kode) return { error: "Pesanan tidak dikenali." };

  if (UUID_RE.test(kode)) {
    const { data, error } = await s.supabase
      .from("orders")
      .select("id, travel_id, booking_code, status, total_amount, paid_amount")
      .eq("id", kode)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return { error: pesanError(error) };
    if (!data || (!s.isSuperAdmin && data.travel_id !== s.travelId)) {
      return { error: "Pesanan tidak ditemukan atau bukan milik travel Anda." };
    }
    if (data.status === "cancelled" || data.status === "refunded") {
      return { error: "Pesanan dibatalkan — tidak bisa menerima pembayaran." };
    }
    return { target: { kind: "portal", ...data } };
  }

  const builder = s.supabase
    .from("bookings")
    .select("id, travel, pemesan, biaya, dibayar, sisa, status")
    .eq("id", kode)
    .maybeSingle();
  const { data, error } = await builder;
  if (error) return { error: pesanError(error) };
  if (!data) return { error: "Pesanan tidak ditemukan atau bukan milik travel Anda." };
  if (!s.isSuperAdmin && s.travelName && data.travel !== s.travelName) {
    return { error: "Pesanan ini bukan milik travel Anda." };
  }
  return { target: { kind: "lama", orderId: null, booking_code: data.id, ...data } };
}

// Uang yang sudah masuk untuk satu sasaran (portal: dari `payments` saja;
// lama: baseline `bookings.dibayar` + pembayaran portal di atasnya).
async function sisaTagihan(s, target) {
  if (target.kind === "portal") {
    const total = Number(target.total_amount) || 0;
    const { data } = await s.supabase
      .from("payments")
      .select("amount, status")
      .eq("order_id", target.id)
      .is("deleted_at", null);
    const masuk = (data ?? []).filter((p) => HITUNG_MASUK(p.status)).reduce((a, p) => a + (Number(p.amount) || 0), 0);
    return Math.max(total - masuk, 0);
  }
  const total = parseRupiah(target.biaya);
  const baseline = parseRupiah(target.dibayar);
  const { data } = await s.supabase
    .from("payments")
    .select("amount, status")
    .eq("booking_code", target.booking_code)
    .is("deleted_at", null);
  const portal = (data ?? []).filter((p) => HITUNG_MASUK(p.status)).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  return Math.max(total - baseline - portal, 0);
}

async function simpanBukti(s, file, paymentId) {
  if (!file || typeof file.size !== "number" || file.size === 0) return { path: null };
  if (file.size > PROOF_MAX_BYTES) {
    return { error: `Berkas bukti terlalu besar (maks ${PROOF_MAX_BYTES / 1024 / 1024} MB).` };
  }
  if (!PROOF_MIME.includes(file.type)) {
    return { error: "Bukti transfer harus berformat JPG, PNG, WEBP, atau PDF." };
  }
  const ext =
    String(file.name ?? "").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const filePath = `${s.travelId}/${paymentId}-${Date.now()}.${ext}`;
  const { error } = await s.supabase.storage
    .from(PROOF_BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("simpanBukti Storage gagal:", error.code, error.message);
    return {
      error: `Bukti transfer gagal diunggah: ${error.message}`,
    };
  }
  return { path: filePath };
}

function bacaPembayaran(formData) {
  const teks = (name) => String(formData.get(name) ?? "").trim();
  return {
    ref: teks("target"),
    nominal: nomorRupiah(teks("amount")),
    metode: normalizePaymentMethodInput(teks("method")),
    status: normalizePaymentRowStatusInput(teks("status")),
    tanggal: tanggalValid(teks("paid_at")) ?? new Date().toISOString().slice(0, 10),
    rekening: teks("bank_label"),
    catatan: teks("notes").slice(0, 500),
    idCicilan: teks("installment_id"),
    lanjut: teks("lanjut"),
  };
}

/**
 * US-2/US-4: catat satu pembayaran, lalu hitung ulang agregat sasarannya.
 * Untuk pesanan portal, satu aksi menulis dua tabel (payments + orders);
 * recompute selalu jadi langkah TERAKHIR dan selalu dari SUM, jadi kalau
 * langkah sebelumnya gagal angka tetap bisa dipulihkan (R-2).
 */
export async function recordPayment(formData) {
  const s = await financeScope();
  if (s.error) return { error: s.error };

  const f = bacaPembayaran(formData);
  if (f.nominal <= 0) return { error: "Nominal pembayaran harus lebih besar dari nol." };

  const found = await findTarget(s, f.ref);
  if (found.error) return { error: found.error };
  const target = found.target;

  const sisa = await sisaTagihan(s, target);
  const bolehLebih = String(formData.get("izinkan_lebih") ?? "") === "ya";
  // Tanpa klausa `sisa > 0`: order yang sudah lunas (sisa 0) juga wajib
  // persetujuan, kalau tidak kelebihan bayar masuk diam-diam sebagai titipan.
  if (f.nominal > sisa && !bolehLebih) {
    return {
      error: `Nominal melebihi sisa tagihan. Sisa saat ini ${new Intl.NumberFormat("id-ID").format(sisa)}.`,
    };
  }

  const paymentId = crypto.randomUUID();
  const bukti = await simpanBukti(s, formData.get("proof"), paymentId);
  if (bukti.error) return { error: bukti.error };

  const now = new Date().toISOString();
  const baris = {
    id: paymentId,
    travel_id: s.travelId,
    order_id: target.kind === "portal" ? target.id : null,
    booking_code: target.booking_code,
    code: buatKodePembayaran(),
    amount: f.nominal,
    method: f.metode,
    // Rekening tujuan disimpan sebagai label text: `payments.bank_id` uuid
    // sementara `banks.id` text, jadi tidak bisa dijadikan penaut (R-6).
    channel: f.rekening || null,
    status: f.status,
    is_installment: Boolean(f.idCicilan),
    proof_path: bukti.path,
    notes: [f.catatan, f.idCicilan ? `Cicilan ${f.idCicilan}` : null]
      .filter(Boolean)
      .join(" · ") || null,
    paid_at: `${f.tanggal}T12:00:00.000Z`,
    verified_by: f.status === "verified" ? s.userId : null,
    created_at: now,
  };

  const { error: insertError } = await s.supabase.from("payments").insert(baris);
  if (insertError) {
    if (bukti.path) await s.supabase.storage.from(PROOF_BUCKET).remove([bukti.path]);
    return { error: pesanError(insertError) };
  }

  if (f.idCicilan) {
    const { error: instError } = await s.supabase
      .from("installments")
      .update({ paid_amount: f.nominal, status: "paid" })
      .eq("id", f.idCicilan);
    if (instError) return { error: `${pesanError(instError)} Pembayaran sudah tercatat, tapi status cicilan belum berubah — muat ulang halaman cicilan.` };
  }

  if (target.kind === "portal") {
    const hasil = await recomputeOrderPayment(s, target.id);
    if (hasil.error) {
      return {
        error: `${hasil.error} Pembayaran sudah tersimpan; buka ulang pesanan ini agar totalnya terhitung ulang.`,
      };
    }
  }

  // Pembayaran biasa dan pelunasan cicilan memakai redirect yang sama; toast
  // dibedakan supaya travel tahu aksi mana yang barusan ia klik.
  const pesan = f.idCicilan ? "cicilan-lunas" : "pembayaran-baru";
  redirect(
    `${tujuanLanjut(f.lanjut, PEMBAYARAN_LIST_PATH)}?toast=${pesan}&t=${Date.now()}`
  );
}

/**
 * US-3: batalkan pembayaran. Soft delete (`payments.deleted_at`) — baris tetap
 * ada di database untuk audit, sama seperti pola hapus paket/jamaah/pesanan.
 */
export async function voidPayment(formData) {
  const s = await financeScope();
  if (s.error) return { error: s.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Pembayaran tidak dikenali." };

  const { data, error } = await s.supabase
    .from("payments")
    .select("id, travel_id, order_id, booking_code, is_installment, notes, proof_path")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { error: pesanError(error) };
  if (!data || (!s.isSuperAdmin && data.travel_id !== s.travelId)) {
    return { error: "Pembayaran tidak ditemukan, bukan milik travel Anda, atau entri lama yang hanya-baca." };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await s.supabase
    .from("payments")
    .update({ deleted_at: now, notes: `${data.notes ?? ""} · dibatalkan portal`.trim() })
    .eq("id", id);
  if (updateError) return { error: pesanError(updateError) };

  // R-3: pembayaran cicilan yang dibatalkan wajib mengembalikan status jadwal,
  // kalau tidak jadwal tetap berbunyi "Lunas" padahal uangnya sudah ditarik.
  const cicilanId = /Cicilan ([0-9a-f-]{36})/.exec(data.notes ?? "")?.[1];
  if (data.is_installment && cicilanId) {
    await s.supabase
      .from("installments")
      .update({ paid_amount: 0, status: "unpaid" })
      .eq("id", cicilanId);
  }

  if (data.order_id) {
    const hasil = await recomputeOrderPayment(s, data.order_id);
    if (hasil.error) return { error: hasil.error };
  }

  const lanjut = String(formData.get("lanjut") ?? "").trim();
  redirect(
    `${tujuanLanjut(lanjut, PEMBAYARAN_LIST_PATH)}?toast=pembayaran-batal&t=${Date.now()}`
  );
}

/**
 * US-6: bikin/ganti jadwal cicilan. DP dihitung sebagai `payments` biasa
 * (kalau nominalnya > 0), sisanya dibagi rata; sisa pembulatan masuk ke
 * cicilan terakhir supaya totalnya pas (SC-5).
 */
export async function saveInstallmentPlan(formData) {
  const s = await financeScope();
  if (s.error) return { error: s.error };

  const teks = (name) => String(formData.get(name) ?? "").trim();
  const found = await findTarget(s, teks("target"));
  if (found.error) return { error: found.error };
  const target = found.target;

  const jumlah = Number.parseInt(teks("jumlah"), 10);
  if (!(jumlah >= 2 && jumlah <= 12)) {
    return { error: "Jumlah cicilan harus antara 2 dan 12." };
  }
  const mulai = tanggalValid(teks("mulai"));
  if (!mulai) return { error: "Tanggal cicilan pertama tidak valid." };

  const dp = nomorRupiah(teks("down_payment"));
  // sisaTagihan() sudah menghitung total dikurangi uang masuk, jadi ia adalah
  // besarnya tagihan yang boleh dibagi jadi cicilan.
  const tagihan = await sisaTagihan(s, target);
  const pokok = tagihan - dp;
  if (pokok <= 0) {
    return { error: "Uang muka menutup seluruh sisa tagihan — tidak ada yang dicicil." };
  }

  const perCicilan = Math.floor(pokok / jumlah / 1000) * 1000;
  if (perCicilan <= 0) return { error: "Nominal per cicilan terlalu kecil." };

  const rows = [];
  let tersisa = pokok;
  for (let i = 0; i < jumlah; i += 1) {
    const nominal = i === jumlah - 1 ? tersisa : perCicilan;
    tersisa -= nominal;
    rows.push({
      id: crypto.randomUUID(),
      travel_id: s.travelId,
      order_id: target.kind === "portal" ? target.id : null,
      booking_code: target.booking_code,
      sequence: i + 1,
      due_date: tambahBulan(mulai, i),
      amount: nominal,
      paid_amount: 0,
      status: "unpaid",
    });
  }

  // Jadwal lama dihapus lebih dulu supaya tidak ada dua sequence 1..N bertumpuk.
  const penaut = target.kind === "portal"
    ? { column: "order_id", value: target.id }
    : { column: "booking_code", value: target.booking_code };
  const { error: hapusLama } = await s.supabase
    .from("installments")
    .delete()
    .eq(penaut.column, penaut.value)
    .eq("status", "unpaid");
  if (hapusLama) return { error: pesanError(hapusLama) };

  const { error: insertError } = await s.supabase.from("installments").insert(rows);
  if (insertError) return { error: pesanError(insertError) };

  const now = new Date().toISOString();
  const ubahOrder = {
    payment_scheme: "cicilan_bulanan",
    down_payment_amount: dp,
    remaining_due_date: rows[rows.length - 1].due_date,
  };
  if (target.kind === "portal") {
    const { error } = await s.supabase.from("orders").update(ubahOrder).eq("id", target.id);
    if (error) return { error: pesanError(error) };
  }

  if (dp > 0) {
    const buktiDp = crypto.randomUUID();
    const { error: dpError } = await s.supabase.from("payments").insert({
      id: buktiDp,
      travel_id: s.travelId,
      order_id: target.kind === "portal" ? target.id : null,
      booking_code: target.booking_code,
      code: buatKodePembayaran(),
      amount: dp,
      method: normalizePaymentMethodInput(teks("method")),
      status: "pending",
      is_installment: false,
      notes: "Uang muka jadwal cicilan",
      paid_at: `${now.slice(0, 10)}T12:00:00.000Z`,
      created_at: now,
    });
    if (dpError) return { error: pesanError(dpError) };
    if (target.kind === "portal") {
      await recomputeOrderPayment(s, target.id);
    }
  }

  redirect(`${CICILAN_LIST_PATH}?toast=cicilan-jadwal&t=${Date.now()}`);
}

/** US-7: satu cicilan lunas → catat uangnya lewat jalur pembayaran yang sama. */
export async function markInstallmentPaid(formData) {
  const s = await financeScope();
  if (s.error) return { error: s.error };

  const id = String(formData.get("id") ?? "").trim();
  const metode = normalizePaymentMethodInput(String(formData.get("method") ?? ""));
  const lanjut = String(formData.get("lanjut") ?? "").trim() || "cicilan";
  if (!id) return { error: "Cicilan tidak dikenali." };

  const { data: row, error } = await s.supabase
    .from("installments")
    .select("id, travel_id, order_id, booking_code, sequence, amount, status")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: pesanError(error) };
  if (!row || (!s.isSuperAdmin && row.travel_id !== s.travelId)) {
    return { error: "Cicilan tidak ditemukan atau bukan milik travel Anda." };
  }
  if (row.status === "paid") {
    return { error: "Cicilan ini sudah lunas — tidak dicatat dua kali." };
  }

  const target = row.order_id ?? row.booking_code;
  const found = await findTarget(s, target);
  if (found.error) return { error: found.error };

  const now = new Date().toISOString();
  const form = new FormData();
  form.set("target", String(target));
  form.set("amount", String(row.amount));
  form.set("method", metode);
  form.set("status", "paid");
  form.set("paid_at", now.slice(0, 10));
  form.set("notes", `Cicilan ke-${row.sequence}`);
  form.set("installment_id", row.id);
  form.set("izinkan_lebih", "ya");
  form.set("lanjut", lanjut);
  return recordPayment(form);
}

/** Menghapus jadwal yang belum terbayar (installments tidak punya deleted_at). */
export async function deleteInstallmentPlan(formData) {
  const s = await financeScope();
  if (s.error) return { error: s.error };

  const ref = String(formData.get("target") ?? "").trim();
  const found = await findTarget(s, ref);
  if (found.error) return { error: found.error };
  const target = found.target;

  const column = target.kind === "portal" ? "order_id" : "booking_code";
  const value = target.kind === "portal" ? target.id : target.booking_code;
  const { data: terbayar } = await s.supabase
    .from("installments")
    .select("id")
    .eq(column, value)
    .eq("status", "paid");
  if (terbayar?.length) {
    return {
      error: "Jadwal punya cicilan yang sudah lunas — batalkan pembayarannya lebih dulu.",
    };
  }

  const { error } = await s.supabase.from("installments").delete().eq(column, value);
  if (error) return { error: pesanError(error) };
  redirect(`${CICILAN_LIST_PATH}?toast=cicilan-hapus&t=${Date.now()}`);
}

/**
 * Bukti transfer dibuka lewat signed URL berumur 60 detik, bukan URL publik:
 * bucket `payment-proofs` privat dan policy-nya per travel. Pola yang sama
 * dengan viewPilgrimDocument (MODUL 4).
 */
export async function viewPaymentProof(formData) {
  const ctx = await getTravelContext();
  if (!ctx?.profile) return { error: "Sesi tidak dikenali. Silakan masuk kembali." }
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Pembayaran tidak dikenali." };

  const { data, error } = await supabase
    .from("payments")
    .select("id, travel_id, code, proof_path")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: pesanError(error) };
  const travelId = ctx.profile.travel_id ?? null;
  if (!data || (ctx.profile.role !== "super_admin" && data.travel_id !== travelId)) {
    return { error: "Pembayaran tidak ditemukan atau bukan milik travel Anda." };
  }
  if (!data.proof_path) return { error: "Pembayaran ini tidak punya berkas bukti." };

  const { data: signed, error: signError } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(data.proof_path, 60);
  if (signError) return { error: `Berkas tidak bisa dibuka: ${signError.message}` };
  return { url: signed.signedUrl, kode: data.code };
}

// "YYYY-MM-DD" + n bulan, dipertahankan agar tanggal utamanya tidak melenceng
// (31 → 31, dan bulan yang lebih pendek jatuh ke hari terakhirnya).
function tambahBulan(isoDate, n) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + n, 1));
  const hariTerakhir = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(d, hariTerakhir));
  return base.toISOString().slice(0, 10);
}
