import { createClient } from "@/lib/supabase/server";
import { formatRupiah, parseRupiah, parseTanggalRupiah } from "@/lib/data/dashboard";
import { labelTanggal, tanggalDari } from "@/lib/data/orders";
import {
  countsAsMoneyIn,
  installmentStatusLabel,
  paymentMethodLabel,
  paymentRowStatusLabel,
} from "@/lib/data/payment-fields";
import { normalizeOrderStatus } from "@/lib/data/order-fields";

const PAYMENT_SELECT =
  "id, code, travel_id, order_id, booking_code, amount, method, channel, status, is_installment, proof_path, notes, paid_at, created_at";

const TRANSACTION_FIELDS = "id, invoice, deskripsi, channel, nominal, tanggal, status";

const INSTALLMENT_SELECT =
  "id, order_id, booking_code, sequence, due_date, amount, paid_amount, status, notes";

const ORDER_MONEY_SELECT =
  "id, booking_code, travel_id, package_id, status, payment_status, total_amount, paid_amount, remaining_amount, payment_scheme, down_payment_amount, remaining_due_date, purchase_date, created_at";

// id pesanan portal berupa uuid; id pesanan lama berupa kode text ("BRS-...").
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function scope(ctx) {
  const supabase = await createClient();
  return {
    supabase,
    travelId: ctx?.profile?.travel_id ?? null,
    travelName: ctx?.travelName ?? null,
    role: ctx?.profile?.role ?? null,
    isSuperAdmin: ctx?.profile?.role === "super_admin",
  };
}

function scoped(builder, s, column) {
  return s.isSuperAdmin || !s.travelId ? builder : builder.eq(column, s.travelId);
}

// Tautan detail pesanan: uuid untuk pesanan portal, kode "BRS-..." untuk
// pesanan lama. Rutenya menerima keduanya.
function detailRef(ref) {
  return ref ? `/travel/pesanan/${ref}` : null;
}

function tanggalBayar(row) {
  return (
    (row.paid_at && new Date(row.paid_at)) ||
    tanggalDari(String(row.paid_at ?? "").slice(0, 10)) ||
    new Date(row.created_at)
  );
}

function toPaymentRow(p) {
  const tanggal = tanggalBayar(p);
  return {
    id: p.id,
    asal: "portal",
    kode: p.code || "(tanpa kode)",
    targetId: p.order_id,
    bookingCode: p.booking_code,
    nominal: Number(p.amount) || 0,
    nominalLabel: formatRupiah(p.amount),
    metode: paymentMethodLabel(p.method),
    rekening: p.channel || null,
    status: p.status,
    statusLabel: paymentRowStatusLabel(p.status),
    dihitung: countsAsMoneyIn(p.status),
    cicilan: Boolean(p.is_installment),
    bukti: p.proof_path || null,
    catatan: p.notes || null,
    tanggal,
    tanggalLabel: labelTanggal(tanggal),
    canWrite: true,
  };
}

// `transactions` adalah buku pembayaran warisan. Nominalnya text
// ("Rp 5.000.000") dan kolomnya bebas (channel text, status label Indonesia),
// jadi dipetakan apa adanya dan selamanya hanya-baca dari portal ini.
function toLegacyRow(t) {
  const tanggal = parseTanggalRupiah(t.tanggal);
  const nominal = parseRupiah(t.nominal);
  const statusLama = String(t.status ?? "").trim();
  const lower = statusLama.toLowerCase();
  return {
    id: t.id,
    asal: "lama",
    kode: t.id,
    targetId: null,
    // Kode pesanan tidak tersimpan di `transactions`; pengisian `bookingCode`
    // dan `pemesan` dilakukan pemanggil lewat rantai faktur (lihat
    // legacyTransactions), karena `invoice` = `invoices.noFaktur`.
    bookingCode: null,
    faktur: t.invoice || null,
    nominal,
    nominalLabel: formatRupiah(nominal),
    metode: t.channel || "Transaksi lama",
    rekening: null,
    status: lower === "berhasil" ? "paid" : lower === "gagal" ? "rejected" : "pending",
    statusLabel: statusLama || "Tanpa Status",
    // Baris lama tidak pernah ikut dihitung: angka "sudah dibayar" pesanan lama
    // sudah termasuk di kolom `bookings.dibayar`, menjumlahkan keduanya bikin
    // uang terhitung dua kali (Risiko R-1).
    dihitung: false,
    cicilan: /cicilan/i.test(t.deskripsi ?? ""),
    bukti: null,
    catatan: t.deskripsi || null,
    tanggal,
    tanggalLabel: t.tanggal || labelTanggal(tanggal),
    canWrite: false,
  };
}

// ---------------------------------------------------------------------------
// Sasaran uang: satu fungsi yang mengerti dunia portal (`orders`) dan dunia
// lama (`bookings`), supaya seluruh halaman keuangan cukup bicara ke hasilnya.
// ---------------------------------------------------------------------------

async function orderTarget(s, ref) {
  const { data, error } = await s.supabase
    .from("orders")
    .select(ORDER_MONEY_SELECT)
    .eq("id", ref)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("orderTarget gagal:", error.code, error.message);
    return { error: "Pesanan gagal dimuat dari database." };
  }
  if (!data || (!s.isSuperAdmin && data.travel_id !== s.travelId)) {
    return { error: "Pesanan tidak ditemukan atau bukan milik travel Anda." };
  }
  const paket = data.package_id
    ? await s.supabase.from("packages").select("id, nama").eq("id", data.package_id).maybeSingle()
    : { data: null };
  const jamaah = await s.supabase
    .from("pilgrims")
    .select("full_name")
    .eq("order_id", data.id)
    .is("deleted_at", null);

  return {
    target: {
      kind: "portal",
      id: data.id,
      orderId: data.id,
      bookingCode: data.booking_code,
      kode: data.booking_code,
      paketNama: paket?.data?.nama ?? "(paket dihapus)",
      pemesan: (jamaah.data ?? []).map((p) => p.full_name).join(", ") || "-",
      orderStatus: data.status,
      paymentStatus: data.payment_status,
      total: Number(data.total_amount) || 0,
      // Baseline nol: untuk pesanan portal `orders.paid_amount` sendiri hasil
      // hitung ulang dari `payments`, jadi memasukkannya lagi berarti uang
      // terhitung dua kali. Angka dibayar datang dari riwayat di bawah.
      dibayarLama: 0,
      totalLabel: formatRupiah(data.total_amount),
      tanggal: tanggalDari(data.purchase_date) ?? new Date(data.created_at),
      tanggalLabel: labelTanggal(tanggalDari(data.purchase_date) ?? new Date(data.created_at)),
      paymentScheme: data.payment_scheme,
      dueDate: data.remaining_due_date,
      canRecord: true,
    },
  };
}

async function legacyTarget(s, kode) {
  const builder = s.supabase
    .from("bookings")
    .select("id, paket, travel, pemesan, biaya, dibayar, sisa, pembayaran, status, tglPesan")
    .eq("id", kode)
    .maybeSingle();
  const { data, error } = await builder;
  if (error) {
    console.error("legacyTarget gagal:", error.code, error.message);
    return { error: "Pesanan lama gagal dimuat." };
  }
  if (!data) return { error: "Pesanan tidak ditemukan atau bukan milik travel Anda." };
  if (!s.isSuperAdmin && s.travelName && data.travel !== s.travelName) {
    return { error: "Pesanan ini bukan milik travel Anda." };
  }
  const total = parseRupiah(data.biaya);
  const dibayarLama = parseRupiah(data.dibayar);
  return {
    target: {
      kind: "lama",
      id: data.id,
      orderId: null,
      bookingCode: data.id,
      kode: data.id,
      paketNama: data.paket ?? "-",
      pemesan: data.pemesan ?? "-",
      orderStatus: data.status,
      paymentStatus: data.pembayaran,
      total,
      // Kolom `dibayar` pada bookings adalah angka historis yang tidak bisa
      // diperbarui portal ini (database menolaknya), jadi ia jadi titik awal
      // dan pembayaran baru dihitung di atasnya.
      dibayarLama,
      totalLabel: formatRupiah(total),
      tanggal: parseTanggalRupiah(data.tglPesan),
      tanggalLabel: data.tglPesan || labelTanggal(parseTanggalRupiah(data.tglPesan)),
      paymentScheme: null,
      dueDate: null,
      canRecord: true,
    },
  };
}

// Pembayaran yang menempel pada satu sasaran. Orders portal ditaut lewat
// `order_id`; pesanan lama hanya punya kode, jadi lewat `booking_code`.
async function paymentsForTarget(s, target) {
  const or = target.orderId
    ? `order_id.eq.${target.orderId},booking_code.eq.${target.bookingCode}`
    : `booking_code.eq.${target.bookingCode}`;
  const { data, error } = await scoped(
    s.supabase.from("payments").select(PAYMENT_SELECT).is("deleted_at", null),
    s,
    "travel_id"
  ).or(or);
  if (error) {
    console.error("paymentsForTarget gagal:", error.code, error.message);
    return { rows: [], error: "Riwayat pembayaran gagal dimuat." };
  }
  return { rows: (data ?? []).map(toPaymentRow), error: null };
}

async function installmentsForTarget(s, target) {
  const or = target.orderId
    ? `order_id.eq.${target.orderId},booking_code.eq.${target.bookingCode}`
    : `booking_code.eq.${target.bookingCode}`;
  const { data, error } = await scoped(
    s.supabase.from("installments").select(INSTALLMENT_SELECT),
    s,
    "travel_id"
  ).or(or);
  if (error) return [];
  return (data ?? []).map(toInstallmentRow).sort((a, b) => a.sequence - b.sequence);
}

// "overdue" diturunkan di aplikasi, bukan ditulis ke database (OQ-8):
// status tersimpan tetap `unpaid`, jadi tidak butuh job/trigger harian.
export function toInstallmentRow(i, today = HARI_INI()) {
  const stored = i.status ?? "unpaid";
  const overdue = stored === "unpaid" && String(i.due_date ?? "") < today;
  const tampilan = overdue ? "overdue" : stored;
  const amount = Number(i.amount) || 0;
  const dibayar = Number(i.paid_amount) || 0;
  return {
    id: i.id,
    order_id: i.order_id,
    booking_code: i.booking_code,
    sequence: i.sequence,
    due_date: i.due_date,
    dueLabel: labelTanggal(tanggalDari(i.due_date)),
    amount,
    amountLabel: formatRupiah(amount),
    dibayar,
    dibayarLabel: formatRupiah(dibayar),
    status: stored,
    tampilan,
    statusLabel: installmentStatusLabel(tampilan),
    lunas: stored === "paid",
    sisa: Math.max(amount - dibayar, 0),
    catatan: i.notes || null,
  };
}

// Tanggal lokal dalam zona Jakarta, memakai pola yang sama dengan halaman
// buat pesanan: format en-CA memberi "YYYY-MM-DD" tanpa pergeseran zona waktu.
export function HARI_INI(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

/**
 * Ringkasan uang satu pesanan (portal maupun lama) + riwayatnya.
 * Ini satu-satunya tempat angka "sudah dibayar" dihitung, supaya detail
 * pesanan, daftar keuangan, dan dashboard tidak pernah berbeda cerita.
 */
export async function getPaymentDetailView(ctx, ref) {
  const s = await scope(ctx);
  const lookup = UUID_RE.test(String(ref))
    ? await orderTarget(s, ref)
    : await legacyTarget(s, String(ref));
  if (lookup.error) return { error: lookup.error, target: null };

  const target = lookup.target;
  const [{ rows: payments, error: payError }, rowsLama, jadwal] = await Promise.all([
    paymentsForTarget(s, target),
    target.kind === "lama" ? legacyTransactions(s, target) : Promise.resolve([]),
    installmentsForTarget(s, target),
  ]);

  const portal = payments.reduce((sum, p) => (p.dihitung ? sum + p.nominal : sum), 0);
  const dibayar = target.dibayarLama + portal;
  const sisa = Math.max(target.total - dibayar, 0);
  const lebih = Math.max(dibayar - target.total, 0);

  const riwayat = [...payments, ...rowsLama].sort(
    (a, b) => (b.tanggal?.getTime() ?? 0) - (a.tanggal?.getTime() ?? 0)
  );

  return {
    error: payError,
    target,
    payments: riwayat,
    jumlahPortal: payments.length,
    jumlahLama: rowsLama.length,
    installments: jadwal,
    money: {
      total: target.total,
      dibayar,
      sisa,
      lebih,
      portal,
      portalLabel: formatRupiah(portal),
      totalLabel: formatRupiah(target.total),
      dibayarLabel: formatRupiah(dibayar),
      sisaLabel: formatRupiah(sisa),
      lebihLabel: formatRupiah(lebih),
      persen: target.total > 0 ? Math.min(100, Math.round((dibayar / target.total) * 100)) : 0,
    },
  };
}

// Rantai taut pesanan lama → faktur → transaksi. `transactions` tidak punya
// kolom id pesanan sama sekali: penautnya `invoice` = `invoices.noFaktur`, dan
// faktur lama menaut ke pemesan lewat kolom text `jamaah` (isi NAMA orang,
// bukan nama travel dan bukan uuid). Rantai ini persis yang dipakai backfill
// 20261116_backfill_data.sql untuk mengisi travel_id keduanya.
async function legacyInvoiceMap(s) {
  const { data } = await scoped(
    s.supabase.from("invoices").select("noFaktur, jamaah"),
    s,
    "travel_id"
  );
  return data ?? [];
}

async function legacyTransactions(s, target, faktur) {
  const nomor = (faktur ?? await legacyInvoiceMap(s))
    .filter((f) => f.jamaah && f.jamaah === target.pemesan)
    .map((f) => f.noFaktur)
    .filter(Boolean);
  if (!nomor.length) return [];
  const { data } = await scoped(
    s.supabase.from("transactions").select(TRANSACTION_FIELDS),
    s,
    "travel_id"
  ).in("invoice", nomor);
  const byNo = new Map((faktur ?? []).map((f) => [f.noFaktur, f.jamaah]));
  return (data ?? []).map((t) => ({
    ...toLegacyRow(t),
    pemesan: byNo.get(t.invoice) ?? target.pemesan,
    bookingCode: target.bookingCode,
  }));
}

/** Semua pembayaran travel — gabungan `payments` portal dan `transactions` lama. */
export async function listPayments(ctx) {
  const s = await scope(ctx);

  const [payRes, trxRes, ordersRes, bookingsRes, faktur] = await Promise.all([
    scoped(
      s.supabase.from("payments").select(PAYMENT_SELECT).is("deleted_at", null),
      s,
      "travel_id"
    ).order("created_at", { ascending: false }),
    scoped(
      s.supabase.from("transactions").select(TRANSACTION_FIELDS),
      s,
      "travel_id"
    ),
    s.supabase.from("orders").select("id, booking_code"),
    s.travelName
      ? s.supabase
          .from("bookings")
          .select("id, travel, pemesan")
          .eq("travel", s.travelName)
      : Promise.resolve({ data: [] }),
    legacyInvoiceMap(s),
  ]);

  if (payRes.error) {
    console.error("listPayments gagal:", payRes.error.code, payRes.error.message);
    return {
      rows: [],
      error: "Pembayaran gagal dimuat dari database.",
      counts: { portal: 0, lama: 0 },
      travelName: s.travelName,
    };
  }

  const kodeOrder = new Map((ordersRes.data ?? []).map((o) => [o.id, o.booking_code]));
  const pemesanLama = new Map(
    (bookingsRes.data ?? []).map((b) => [b.id, { pemesan: b.pemesan, kode: b.id }])
  );
  const jamaahByOrder = await namesByOrder(s);

  const portal = (payRes.data ?? []).map((p) => {
    const row = toPaymentRow(p);
    const kode = row.bookingCode || kodeOrder.get(p.order_id) || null;
    return {
      ...row,
      bookingCode: kode,
      detailHref: detailRef(p.order_id || kode),
      pemesan:
        jamaahByOrder.get(p.order_id) ||
        (kode ? (pemesanLama.get(kode)?.pemesan ?? "-") : "-"),
    };
  });

  // Rantai baris warisan: `transactions.invoice` → `invoices.jamaah` (nama
  // pemesan) → `bookings.pemesan` → kode pesanan. `transactions` dan `invoices`
  // sudah travel-scope oleh RLS (travel_id terisi), jadi tidak perlu filter
  // nama seperti yang dibutuhkan `bookings`.
  const jamaahFaktur = new Map(faktur.map((f) => [f.noFaktur, f.jamaah]));
  const kodeByJamaah = new Map((bookingsRes.data ?? []).map((b) => [b.pemesan, b.id]));
  const lama = (trxRes.data ?? []).map((t) => {
    const row = toLegacyRow(t);
    const nama = jamaahFaktur.get(t.invoice) ?? null;
    const kode = nama ? (kodeByJamaah.get(nama) ?? null) : null;
    return {
      ...row,
      pemesan: nama ?? "-",
      bookingCode: kode,
      detailHref: detailRef(kode),
    };
  });

  const rows = [...portal, ...lama].sort(
    (a, b) => (b.tanggal?.getTime() ?? 0) - (a.tanggal?.getTime() ?? 0)
  );

  const masuk = portal.filter((p) => p.dihitung).reduce((sum, p) => sum + p.nominal, 0);
  const menunggu = portal.filter((p) => p.status === "pending").length;

  return {
    rows,
    error: null,
    scoped: true,
    travelName: s.travelName,
    counts: { portal: portal.length, lama: lama.length },
    stats: { masuk, menunggu, jumlah: rows.length },
  };
}

async function namesByOrder(s) {
  const { data } = await scoped(
    s.supabase.from("pilgrims").select("order_id, full_name").is("deleted_at", null),
    s,
    "travel_id"
  );
  const map = new Map();
  for (const p of data ?? []) {
    if (!p.order_id) continue;
    map.set(p.order_id, [...(map.get(p.order_id) ?? []), p.full_name].join(", "));
  }
  return map;
}

/** Jadwal cicilan travel, dengan status terlambat yang diturunkan di aplikasi. */
export async function listInstallments(ctx) {
  const s = await scope(ctx);
  const [res, ordersRes, bookingsRes] = await Promise.all([
    scoped(
      s.supabase.from("installments").select(INSTALLMENT_SELECT),
      s,
      "travel_id"
    ).order("due_date", { ascending: true }),
    s.supabase.from("orders").select("id, booking_code, payment_status"),
    s.travelName
      ? s.supabase.from("bookings").select("id, pemesan, status").eq("travel", s.travelName)
      : Promise.resolve({ data: [] }),
  ]);
  const jamaah = await namesByOrder(s);

  const kodeOrder = new Map((ordersRes.data ?? []).map((o) => [o.id, o.booking_code]));
  const pemesanLama = new Map((bookingsRes.data ?? []).map((b) => [b.id, b.pemesan]));

  const rows = (res.data ?? []).map((i) => {
    const kode = i.booking_code || kodeOrder.get(i.order_id) || null;
    return {
      ...toInstallmentRow(i),
      kode,
      targetRef: i.order_id || kode || null,
      pemesan: jamaah.get(i.order_id) || (kode ? (pemesanLama.get(kode) ?? "-") : "-"),
      detailHref: detailRef(i.order_id || kode),
    };
  });

  const today = HARI_INI();
  const dalam30 = rows.filter(
    (r) => !r.lunas && r.due_date > today && r.due_date <= tambahHari(today, 30)
  );
  const telat = rows.filter((r) => r.tampilan === "overdue");
  const tunggak = rows.filter((r) => !r.lunas);

  return {
    rows,
    error: res.error ? "Jadwal cicilan gagal dimuat dari database." : null,
    stats: {
      tagihan: tunggak.reduce((sum, r) => sum + r.sisa, 0),
      dalam30: dalam30.length,
      telat: telat.length,
      lunas: rows.filter((r) => r.lunas).length,
      jumlah: rows.length,
    },
    travelName: s.travelName,
  };
}

function tambahHari(isoDate, n) {
  const d = tanggalDari(isoDate);
  if (!d) return isoDate;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Pilihan order untuk form "catat pembayaran" dari halaman keuangan, dan
 * rekening tujuan. Hanya order yang masih punya sisa tagihan yang ditawarkan.
 */
export async function listPaymentTargets(ctx) {
  const s = await scope(ctx);
  const [ordersRes, bookingsRes, banksRes] = await Promise.all([
    scoped(
      s.supabase
        .from("orders")
        .select("id, booking_code, total_amount, paid_amount, remaining_amount, status")
        .is("deleted_at", null),
      s,
      "travel_id"
    ).order("created_at", { ascending: false }),
    s.travelName
      ? s.supabase
          .from("bookings")
          .select("id, travel, pemesan, paket, biaya, dibayar, sisa, status")
          .eq("travel", s.travelName)
      : Promise.resolve({ data: [] }),
    s.supabase
      .from("banks")
      .select("id, bank, norek, utama, status")
      .eq("status", "Aktif")
      .order("utama", { ascending: false }),
  ]);

  const jamaah = await namesByOrder(s);
  // Pesanan dibatalkan/di-refund tidak ditawarkan: server action menolaknya,
  // jadi lebih baik tidak muncul di pilihan sama sekali.
  const bolehDibayar = (status) => {
    const kode = normalizeOrderStatus(status);
    return kode !== "cancelled" && kode !== "refunded";
  };
  const ordersLama = (bookingsRes.data ?? []).filter((b) => bolehDibayar(b.status));
  const portal = (ordersRes.data ?? [])
    .filter((o) => bolehDibayar(o.status))
    .map((o) => ({
      ref: o.id,
      kode: o.booking_code,
      jenis: "portal",
      pemesan: jamaah.get(o.id) || "-",
      total: Number(o.total_amount) || 0,
      sisa: Math.max((Number(o.total_amount) || 0) - (Number(o.paid_amount) || 0), 0),
      status: o.status,
    }))
    .filter((o) => o.sisa > 0);
  // Uang yang sudah dicatat portal di atas pesanan lama harus mengurangi sisa
  // tagihan, kalau tidak picker menawarkan nominal basi dan server action
  // menolaknya (`sisaTagihan` di payment-actions.js memakai kontrak yang sama).
  const kodeLama = ordersLama.map((b) => b.id);
  const masukLama = new Map();
  if (kodeLama.length > 0) {
    const { data } = await scoped(
      s.supabase
        .from("payments")
        .select("booking_code, amount, status")
        .in("booking_code", kodeLama)
        .is("deleted_at", null),
      s,
      "travel_id"
    );
    for (const p of data ?? []) {
      if (!countsAsMoneyIn(p.status)) continue;
      masukLama.set(p.booking_code, (masukLama.get(p.booking_code) || 0) + (Number(p.amount) || 0));
    }
  }
  const lama = ordersLama
    .map((b) => {
      const total = parseRupiah(b.biaya);
      const baseline = parseRupiah(b.dibayar);
      return {
        ref: b.id,
        kode: b.id,
        jenis: "lama",
        pemesan: b.pemesan ?? "-",
        total,
        sisa: Math.max(total - baseline - (masukLama.get(b.id) || 0), 0),
        status: b.status,
      };
    })
    .filter((o) => o.sisa > 0);

  return {
    targets: [...portal, ...lama].map((t) => ({
      ...t,
      totalLabel: formatRupiah(t.total),
      sisaLabel: formatRupiah(t.sisa),
    })),
    // `banks.id` text ("bnk-1") sementara `payments.bank_id` uuid — tipe tidak
    // cocok dan tidak ada FK, jadi rekening disimpan sebagai label text (R-6).
    banks: (banksRes.data ?? []).map((b) => ({
      id: b.id,
      label: `${b.bank} · ${b.norek}`,
    })),
    error: ordersRes.error || bookingsRes.error ? "Daftar pesanan gagal dimuat." : null,
  };
}
