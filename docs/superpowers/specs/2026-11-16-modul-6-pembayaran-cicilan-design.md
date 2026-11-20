# MODUL 6 — Pembayaran & Cicilan (Web Travel)

Tanggal: 2026-11-16 · Status: **DRAFT untuk review — belum ada implementasi**
Scope: `src/app/(travel)/keuangan/*`, `src/app/(travel)/pesanan/*`, `src/lib/data/*`
Basis skema: `supabase/migrations/20261116_init_schema.sql` (sudah dijalankan) + probe read-only
terhadap project `pheinjqzezmjucszzjvo` tanggal 2026-11-16.

---

## 1. Tujuan

Memberi travel satu tempat untuk menjawab tiga pertanyaan keuangan tanpa keluar portal:

1. **Uang berapa yang sudah masuk untuk pesanan ini, dan sisa tagihannya?**
2. **Bagaimana riwayat pembayarannya** (DP, cicilan, pelunasan) dan siapa yang mencatat?
3. **Kapan jatuh tempo berikutnya**, dan mana yang sudah menunggak?

Secara teknis modul ini adalah **modul rekonsiliasi**: ia menulis baris uang (`payments`),
lalu memastikan angka agregat di `orders` (`paid_amount`, `remaining_amount`, `payment_status`)
selalu hasil hitung ulang dari baris uang itu — bukan angka yang diketik bebas. Aturan ini adalah
kontrak utama modul, dan semua yang lain mengikutinya.

### Success criteria (terukur)

| # | Kriteria | Cara verifikasi |
|---|---|---|
| SC-1 | Setelah mencatat pembayaran, `orders.paid_amount = SUM(payments.amount)` untuk order yang sama | Query REST `payments?order_id=eq.X&deleted_at=is.null&select=amount` vs `orders?select=paid_amount` |
| SC-2 | `remaining_amount` tidak pernah negatif dan `= GREATEST(total - paid, 0)` | Query yang sama + uji lebih-bayar |
| SC-3 | `payment_status` berubah sendiri: 0 → `unpaid`, 0<paid<total → `partial`, paid≥total → `paid` | UI flow 3x pembayaran sampai lunas |
| SC-4 | Travel A tidak bisa membuat/membatalkan pembayaran milik pesanan travel B | Guard app (pesan jujur) **dan** probe JWT travel lain (`[]` / 42501) |
| SC-5 | Jadwal cicilan: `SUM(installments.amount) + DP = total_amount` | Uji buat jadwal 3x & 5x untuk satu order |
| SC-6 | Cicilan `unpaid` dengan `due_date < hari ini` tampil **Terlambat** | Uji dengan due_date di masa lalu |
| SC-7 | Pembayaran yang dibatalkan hilang dari daftar **dan** angka order ikut turun | Uji batal-then-cek di list pesanan |
| SC-8 | `npm run build` exit 0, tanpa `warn/error` di log | Log build |

---

## 2. In-scope vs Out-of-scope

### In-scope

- **Halaman detail pesanan** `/pesanan/[id]` (belum ada sama sekali hari ini) dengan kartu
  "Pembayaran": ringkasan total / masuk / sisa, riwayat pembayaran, dan aksi "Catat Pembayaran".
- **Form catat pembayaran** `/pesanan/[id]/pembayaran`: metode, nominal, tanggal, status, catatan.
- **Pembatalan (void) pembayaran** — memakai `payments.deleted_at` yang memang sudah ada di skema.
- **Halaman daftar pembayaran** `/travel/keuangan/pembayaran` — rewrite dari mock, sumber
  `payments` (milik travel) + `transactions` (warisan, hanya-baca).
- **Halaman cicilan** `/travel/keuangan/cicilan` — rewrite dari mock: daftar jatuh tempo,
  buat jadwal, tandai lunas, hapus jadwal.
- **Mesin hitung ulang agregat order** (`recomputeOrderPayment`) yang dipakai semua aksi tulis.
- Batas keamanan: kepemilikan order, travel scope, tolak pembayaran untuk order dibatalkan,
  cegah double-submit.

### Out-of-scope (sengaja, dengan alasan)

| Item | Alasan |
|---|---|
| Deposit travel & komisi agen (`/keuangan/deposit-travel`, `/keuangan/komisi-agen`) | Submodul sendiri. Kedua halaman itu **tetap mock** — lihat Risiko R-9. |
| Payment gateway / Midtrans / VA otomatis | Butuh kredensial & webhook; kolom `channel`/`method` sudah disiapkan tapi tidak diisi otomatis. |
| Rekonsiliasi mutasi bank (cocokkan pembayaran dengan rekening Koran) | Modul terpisah. |
| Backfill `payments` dari `transactions` lama | Melanggar keputusan user "Nggak perlu backfill sekarang"; juga terblokir R-4. |
| Cetak kwitansi / PDF invoice | Tidak ada permintaan. |
| Multi-cabang (`branch_id`) | Kolom ada, scope cabang belum dipakai di modul 3–5. |
| Pagination, sort, filter server-side, export CSV | Ditunda user di Modul 3, 4, dan 5; konsisten ditunda lagi. |
| Ganti tipe kolom uang text → bigint di tabel warisan | Masih jadi unknowns (Bagian 6) dan butuh SQL eksplisit. |
| Upload bukti transfer ke Storage | Butuh migrasi bucket (lihat R-5) — direkomendasikan jadi fase terpisah. |
| Uji login super admin lintas-travel | User: "Nanti saya test manual pas production." |

---

## 3. User stories + acceptance criteria

> Format: **Sebagai** … **saya bisa** … **supaya** … · AC =Given/When/Then.

### US-1 — Lihat status keuangan satu pesanan
Sebagai admin travel, saya ingin membuka satu pesanan dan langsung melihat total, uang masuk,
sisa, dan status pembayarannya, supaya saya tahu siapa yang harus ditagih.

- AC: Dari tabel `/pesanan`, baris pesanan punya tautan ke `/pesanan/[id]`.
- AC: Tiga angka (total / masuk / sisa) **identik** dengan kolom di tabel list.
- AC: Riwayat pembayaran tampil terbaru-duluan dengan kode, tanggal, metode, nominal, status.
- AC: Order tanpa pembayaran menampilkan empty state "Belum ada pembayaran tercatat", bukan tabel kosong.

### US-2 — Catat pembayaran (DP, sebagian, pelunasan)
Sebagai admin travel, saya ingin mencatat uang yang masuk dari jamaah, supaya sisa tagihan
selalu benar tanpa saya hitung manual.

- AC: Form hanya memilih **metode, nominal, tanggal, status, catatan** — order sudah ditetapkan
  dari konteks URL, dan **nominal tidak boleh lebih dari sisa** secara default (boleh lebih hanya
  dengan centang eksplisit "pembayaran berlebihan", lihat US-4).
- AC: Setelah simpan → toast "Pembayaran tercatat", dan halaman detail menampilkan baris baru
  dengan nominal yang persis sama.
- AC: `paid_amount`, `remaining_amount`, `payment_status` order berubah sesuai SC-1..SC-3.
- AC: Dua klik "Simpan" berturut-turut tidak menghasilkan dua baris (tombol disabled + guard).
- AC: Tidak bisa mencatat pembayaran untuk order berstatus `cancelled` / `refunded`
  (pesan: "Pesanan dibatalkan — tidak bisa menerima pembayaran").

### US-3 — Batalkan pembayaran yang salah catat
Sebagai admin travel, saya ingin membatalkan pembayaran yang salah input, supaya buku tetap jujur.

- AC: Aksi "Batalkan" dua langkah (pola `DeletePilgrimButton` / `DeleteOrderButton` yang sudah ada).
- AC: Yang terjadi adalah **soft delete** (`deleted_at` terisi); baris tidak pernah hilang dari DB.
- AC: Setelah batal, agregat order dihitung ulang (SC-7) dan daftar tidak lagi menampilkan barisnya.
- AC: Batal pembayaran pada pesanan `completed`/`confirmed` **tidak** mengubah `orders.status`.
- AC: Batalkan pembayaran warisan (`transactions`) tidak tersedia — badge Hanya-baca.

### US-4 — Tangani kelebihan bayar & pengembalian
Sebagai admin travel, saya ingin tetap bisa mencatat transfer yang kelebihannya salah ketik,
dan mencatat pengembalian, supaya tidak ada uang tak terlacak.

- AC: Kelebihan bayar tetap tercatat, `remaining_amount` menampilkan **0** dan ada penanda
  "Kelebihan Rp X" — tidak pernah angka negatif mentah.
- AC: Status refund **bukan** pembayaran biasa. Dua opsi (open question OQ-3):
  (a) satu baris `payments` `status='refunded'` dengan nominal yang **mengurangi** uang masuk;
  (b) v1 cukup tandai pembayaran awal sebagai `refunded` tanpa baris baru.
  Rekomendasi: **(b)** untuk v1 — tidak mengubah rumus rollup, dan refund riil masuk modul
  tersendiri.
- AC: Tidak ada mode input "uang negatif" di form.

### US-5 — Lihat semua pembayaran travel dalam satu daftar
Sebagai admin travel, saya ingin daftar semua pembayaran milik travel saya, supaya bisa
merekap tanpa membuka order satu per satu.

- AC: `/travel/keuangan/pembayaran` menampilkan `payments` milik travel + `transactions` warisan,
  dengan **caption "entri lama"** yang sama persis polanya dengan `/pesanan`.
- AC: Kolom baris warisan tidak bisa diklik untuk ubah; ada badge Hanya-baca (`ReadOnlyBadge`).
- AC: Pencarian client-side pada kode / nama jamaah / kode pesanan.
- AC: Jumlah baris yang terlihat = jumlah baris milik travel itu saja (probe SC-4).

### US-6 — Buat jadwal cicilan untuk sebuah pesanan
Sebagai admin travel, saya ingin membagi sisa tagihan menjadi N cicilan dengan tanggal jatuh
tempo, supaya penagihan terukur.

- AC: Form: jumlah cicilan (2–12), tanggal pertama, siklus (bulanan default), dan opsional DP.
- AC: Hasil: `installments` sequence 1..N dengan nominal terbagi rata; **sisa pembulatan masuk ke
  cicilan terakhir** sehingga jumlahnya pas (SC-5).
- AC: Membuat jadwal untuk order yang sudah punya jadwal → konfirmasi ganti, dan jadwal lama
  dihapus sebelum yang baru ditulis (tidak ada duplikat sequence).
- AC: DP yang dijanjikan tercatat sebagai `down_payment_amount` di order, bukan sebagai cicilan.
- AC: `payment_scheme` order ikut terisi (`cicilan` / `cicilan_bulanan`) sesuai pilihan.
- AC: `remaining_due_date` order = `due_date` cicilan terakhir.

### US-7 — Tandai cicilan lunas
Sebagai admin travel, saya ingin menandai satu cicilan sebagai terbayar dan uang masuk
tercatat sekali saja.

- AC: Aksi menulis `installments.paid_amount` + `status='paid'` **dan** memanggil
  `recordPayment` dengan nominal cicilan — satu aksi, dua tabel.
- AC: Jika salah satu langkah gagal, aksi mengembalikan error yang menjelaskan angka belum
  tersinkron, bukan success palsu (lihat Risiko R-2).
- AC: Setelah lunas, uang masuk order bertambah persis sebesar cicilan itu (SC-1).
- AC: Tandai lunas dua kali pada cicilan yang sama ditolak.

### US-8 — Lihat jatuh tempo & yang menunggak
Sebagai admin travel, saya ingin tahu cicilan mana yang lewat jatuh tempo, supaya bisa menagih.

- AC: `/travel/keuangan/cicilan` menampilkan kartu "Jatuh tempo 30 hari", "Terlambat",
  "Total outstanding".
- AC: Status **Terlambat** diturunkan di aplikasi: `status='unpaid' AND due_date < hari ini`
  (Asia/Jakarta). Nilai `overdue` tidak ditulis ke DB di v1 — konsisten dengan keputusan user
  soal `document_status`: "Gapapa dihitung dari aplikasi."
- AC: Urutan default: terdekat dulu; yang menunggak dapat warna aksen amber/rose.
- AC: Hanya cicilan milik order travel sendiri yang tampil (DB sudah memfilter via
  `travel_id`, tidak perlu filter nama seperti `bookings`).

---

## 4. Pendekatan teknis

### 4.1 Sumber data: dua, seperti Modul 5 — tapi dengan pembagian yang berbeda

| Sumber | Peran | Baca | Tulis dari portal | Isolasi travel |
|---|---|---|---|---|
| `payments` | riwayat pembayaran portal (sumber kebenaran uang) | ✅ | **INSERT / UPDATE / soft-DELETE ✅** | DB (`payments_select/insert/update/delete`) |
| `installments` | jadwal cicilan portal | ✅ | ✅ penuh | DB |
| `orders` | agregat uang per pesanan | ✅ | UPDATE (oleh mesin rollup saja) | DB + guard app |
| `transactions` | pembayaran warisan | ✅ | boleh secara RLS, **tapi sengaja tidak dipakai** | DB (`travel_id` sudah terisi) |
| `invoices` | faktur/tagihan warisan | ✅ | tidak | DB |
| `bookings` | uang warisan per pesanan (dibayar/sisa text) | ✅ (via list Modul 5) | ❌ ditolak DB | **filter nama di app**, bukan DB |

Bukti probe (login `siti.nur@annahil.co.id`, 2026-11-16, read-only + probe no-op):

```
payments      HTTP 200 []                 (0 baris terlihat)
installments  HTTP 200 []                 (0 baris terlihat)
invoices      HTTP 200 1 baris  inv-1     jumlah "Rp 8.500.000", travel_id terisi
transactions  HTTP 200 1 baris  trx-2     nominal "Rp 5.000.000", travel_id terisi
banks         HTTP 200 3 baris  bnk-1..3  travel_id NULL (referensi bersama)
PATCH invoices/inv-1 (nilai sama)  -> HTTP 200, baris dikembalikan  => WRITABLE
POST payments {order_id:null}      -> HTTP 400 code 23502 not-null   => RLS INSERT LOLOS
POST installments{due_date:null}   -> HTTP 400 code 23502 not-null   => RLS INSERT LOLOS
anon: payments/installments        -> 42501 permission denied        => grant tertutup
```

Perbedaan penting dengan Modul 5: **`payments` dan `installments` bisa ditulis travel**, jadi
tidak ada alasan menulis ke tabel warisan. Tabel warisan (`transactions`, `invoices`) cukup
dibaca dan ditandai Hanya-baca.

### 4.2 Kontrak rollup — aturan tunggal modul ini

```
uangMasuk(orderId) = SUM(payments.amount)
                     WHERE order_id = orderId AND deleted_at IS NULL AND status <> 'refunded'

orders.paid_amount     = uangMasuk
orders.remaining_amount= GREATEST(total_amount - paid_amount, 0)
orders.payment_status  = paid = 0     -> 'unpaid'
                         0<paid<total -> 'partial'
                         paid >= total-> 'paid'
```

- **Selalu hitung ulang dari nol**, tidak pernah inkremental (`paid += nominal`). Ini membuat
  dua penulisan paralel tetap konvergen ke angka yang benar dan memulihkan diri sendiri.
- `status='pending'` **ikut dihitung** sebagai uang masuk. Alasan: di portal ini "pending" berarti
  "transfer jamaah sudah diterima tapi belum diverifikasi finance" — uangnya sudah masuk. Kalau
  user ingin model "uang masuk hanya saat diverifikasi", itu OQ-2.
- `payment_status='dp'` tidak pernah ditulis portal (kolom CHECK tetap ada untuk baris
  Marketplace/produksi). Konsekuensi: label "DP" pada data warisan tetap tampil, tapi pembayaran
  portal menghasilkan `partial`. Didokumentasikan, bukan bug.
- **Tidak pernah** menyentuh `orders.status` dari aksi pembayaran di v1 (OQ-1 untuk yang
  sebaliknya), dan **tidak pernah** menyentuh `orders.total_amount`.
- Guard anti double count: mesin ini hanya membaca `payments`. Nominal uang dari `transactions`
  warisan **tidak pernah** dijumlahkan ke `orders.paid_amount`. Kedua dunia tidak dicampur di
  satu rumus — ini penyebab Risiko R-1.

### 4.3 Kenapa pembayaran untuk pesanan warisan tidak dibuat (R-4)

`payments.order_id` dan `installments.order_id` bertipe `uuid NOT NULL`. Order warisan
(`bookings`) bertipe **text** (`BRS-26111401`) dan **tidak punya baris `orders`**. Buktinya:
`invoices.order_id` dan `transactions.order_id` keduanya `NULL` di data asli, dan backfill
sengaja tidak membuatnya (kolom `amount` pun `NULL`). Jadi "catat pembayaran untuk pesanan lama"
membutuhkan salah satu dari: (a) membuat baris `orders` untuk tiap booking lama, (b) migrasi
mengendurkan NOT NULL, atau (c) tetap tulis ke `transactions` (nominal text, tanpa link order).
v1 memilih **tidak ketiganya** dan menampilkan baris lama sebagai Hanya-baca. (b) adalah jalur
paling murah kalau nanti dibutuhkan — open question OQ-4.

### 4.4 Lapisan file (mengikuti konvensi modul 3–5)

```
src/lib/data/payment-fields.js   NEW  konstanta + normalizer BERSIH (client-safe, tanpa
                                      import @/lib/supabase/server)
src/lib/data/payments.js         NEW  baca: listPayments, getOrderPaymentView,
                                      listInstallments, options metode/rekening
src/lib/data/payment-actions.js  NEW  tulis: recordPayment, voidPayment,
                                      saveInstallmentPlan, markInstallmentPaid,
                                      deleteInstallmentPlan, recomputeOrderPayment (private)
src/lib/data/orders.js           EDIT + export helper orderFromContext() untuk guard kepemilikan
src/lib/data/dashboard.js        EDIT (kemungkinan kecil) — reuse parseRupiah/labelTanggal
src/app/(travel)/pesanan/[id]/page.jsx                     NEW  detail pesanan + kartu pembayaran
src/app/(travel)/pesanan/[id]/pembayaran/page.jsx          NEW  form catat pembayaran
src/app/(travel)/keuangan/pembayaran/page.jsx              REWRITE (mock → Server Component)
src/app/(travel)/keuangan/pembayaran/baru/page.jsx         NEW  catat pembayaran lintas pesanan
src/app/(travel)/keuangan/cicilan/page.jsx                 REWRITE (mock → Server Component)
src/app/(travel)/keuangan/cicilan/baru/page.jsx            NEW  buat/ganti jadwal cicilan
src/components/travel/payment-form.jsx                     NEW
src/components/travel/payments-table.jsx                   NEW
src/components/travel/order-payments.jsx                   NEW  (dipakai di detail pesanan)
src/components/travel/installment-table.jsx                NEW
src/components/travel/installment-form.jsx                 NEW
src/components/travel/payment-row-actions.jsx              NEW  batalkan + ReadOnlyBadge
src/components/travel/toast-message.jsx                    EDIT +4 pesan (pembayaran-baru,
                                      pembayaran-batal, cicilan-jadwal, cicilan-lunas)
```

Konvensi yang dipertahankan: Server Component untuk halaman data, Server Action `"use server"`
dengan `redirect(\`path?toast=...\&t=Date.now()\`)`, `writeScope()` penolak sesi tanpa travel,
guard kepemilikan di aplikasi **selain** RLS (bukan ganti), `tampilkanRupiah` versi client-safe
untuk komponen `"use client"`, dan ikon lucide yang nama export-nya sudah diverifikasi
`node_modules/lucide-react/dist/lucide-react.d.ts` (Modul 5 gagal build karena `ShoppingCartX`).

### 4.5 Aturan tumpang tindih (overlap rules)

- **Pembayaran ↔ pesanan**: pembayaran selalu punya induk (`order_id`). Tidak ada pembayaran
  mengambang. Aksi pembayaran memvalidasi order lebih dulu (`ownedOrder`), termasuk
  `deleted_at IS NULL` — order yang di-soft-delete Modul 5 menolak pembayaran baru.
- **Pembayaran ↔ cicilan**: satu cicilan lunas = satu baris `payments` dengan
  `is_installment = true` dan `notes` `"Cicilan k/N"`. Uang tetap dihitung **sekali**, dari
  `payments`. `installments.paid_amount` adalah cermin status, bukan sumber uang kedua.
  Tidak ada kolom `payments.installment_id` di skema saat ini, jadi tidak ada FK; link eksplisit
  adalah OQ-5 (butuh migrasi additive).
- **Pembatalan pembayaran yang menaut cicilan**: membatalkan pembayaran cicilan harus
  mengembalikan `installments.status` ke `unpaid` pada transaksi yang sama; kalau tidak,
  jadwal menunjukkan "lunas" padahal uang hilang (R-3).
- **Pembayaran vs penghapusan pesanan**: `deleteOrder` (Modul 5) melewat `deleted_at` order tapi
  meninggalkan `payments`. Aturan baca: daftar pembayaran hanya menampilkan pembayaran untuk
  order yang `deleted_at IS NULL`; pembayaran yatim tetap di DB untuk audit.
- **`orders.remaining_due_date`** ditulis hanya dari jalur cicilan (= due_date cicilan terakhir),
  tidak pernah dari form pembayaran, supaya tidak ada dua penulis.
- **Perhitungan vs tampilan**: daftar pembayaran = `payments` + `transactions` diurutkan tanggal;
  uang masuk order = hanya `payments`. Kalau user bertanya "kok total di order tidak sama dengan
  jumlah di daftar", jawabannya adalah baris warisan — maka daftar harus punya subtotal terpisah
  "dari portal" dan "entri lama", tidak boleh satu subtotal gabungan.
- **Precedence rute**: menambah `/pesanan/[id]/page.jsx` tidak memecahkan apa pun — `baru` dan
  `dashboard` tetap menang karena Next.js memberi prioritas ke segmen statis di atas dinamis
  (preseden sudah terbukti di repo: `jamaah/baru`, `jamaah/dokumen`, `jamaah/[id]/ubah` hidup
  bersebelahan). Yang harus dijaga: `/pesanan/[id]` wajib memperlakukan id tak dikenal sebagai
  "tidak ditemukan", bukan sebagai entri lama.

### 4.6 Data warisan di layar

- `transactions.nominal` text "Rp 5.000.000" → `parseRupiah` (sudah ada di `dashboard.js`).
- `transactions.status` "Berhasil" → dipetakan ke label pembayaran portal lewat sinonim, pola
  `normalizePaymentStatus` di `order-fields.js`.
- `transactions.channel` "Virtual Account Mandiri" text bebas → ditampilkan apa adanya,
  tidak dipaksa ke enum `payments.method`.
- Baris warisan ditandai `asal: "lama"`, `canWrite: false` — persis pola Modul 5.

---

## 5. Dependencies

**Sudah siap (tidak ada tugas pendahuluan)**
- Skema `payments` + `installments` lengkap dengan CHECK enum, `deleted_at` (payments),
  index `payments_order_idx` / `payments_travel_idx` / `installments_due_idx`, dan trigger
  `touch_updated_at` → **jangan set `updated_at` manual**.
- RLS + grant travel-scope untuk `payments`, `installments`, `transactions`, `invoices`,
  `package_pricing` sudah dieksekusi 2026-11-16.
- `orders` kolom uang + status sudah ada dan sudah ditulis Modul 5.
- Helper `getTravelContext`, `parseRupiah`, `formatRupiah`, `lastSixMonths`, pola toast,
  `ReadOnlyBadge`, tombol dua langkah.
- Konvensi kode & stack dari `AGENTS.md` (JSX only, light mode, emerald-700/800, shadcn/ui,
  tanpa service-role key di browser).

**Butuh keputusan user sebelum implementasi**
- Tidak ada migrasi wajib untuk v1 (lihat 4.3 & 4.4). Semua fitur inti berjalan di skema saat ini.
- **Kalau** OQ-2 (uang masuk hanya setelah verifikasi), OQ-4 (buka NOT NULL `order_id`), atau
  upload bukti transfer (R-5) diambil, masing-masing = **satu file migrasi additive baru** yang
  hanya dijalankan atas permintaan eksplisit user, dry-run dulu.

**Eksternal**: tanpa API pihak ketiga. Midtrans/VA eksplisit di luar scope.

---

## 6. Risiko & unknowns

| ID | Risiko | Mitigasi / keputusan |
|---|---|---|
| R-1 | **Double count uang** kalau pembayaran portal dijumlah dengan `transactions` warisan | Rumus rollup hanya membaca `payments` (4.2); daftar menampilkan dua subtotal terpisah |
| R-2 | Aksi multi-tabel (cicilan lunas → `installments` + `payments` + recompute) tidak atomic; Supabase REST tanpa transaksi | Urutan tulis: `payments` dulu, lalu installments, lalu recompute; recompute selalu dari SUM sehingga langkah terakhir selalu memperbaiki angka; gagal di tengah → pesan error jujur, bukan toast success |
| R-3 | Batal pembayaran cicilan meninggalkan status "lunas" palsu | `voidPayment` mendeteksi `is_installment` dan reset installment pada aksi yang sama + recompute |
| R-4 | `payments.order_id`/`installments.order_id` `uuid NOT NULL` = mustahil mencatat pembayaran untuk `bookings` lama | v1 hanya-baca untuk entri lama; opsi migrasi didokumentasikan (OQ-4), tidak diambil diam-diam |
| R-5 | Upload bukti transfer butuh bucket Storage baru → `pilgrim_docs_*` policies terikat `bucket_id='pilgrim-docs'`, jadi tidak bisa dipakai ulang | Fitur upload **ditunda**; kolom `proof_path` dibiarkan NULL. Fase tambahan = 1 migrasi additive meniru `20261116_pilgrims_docs_bucket.sql` |
| R-6 | `bank_id` `uuid` vs `banks.id` text (`bnk-1`) — tipe tidak cocok, FK juga tidak ada | v1: simpan metode + label rekening sebagai text (snapshot), `bank_id` NULL. Jangan pernah memaksa UUID |
| R-7 | `payments.code` tidak punya unique index (unique hanya di `orders.booking_code`) | Generator kode melebar (pola `buatKodePesanan`), tabrakan praktis kecil; indeks unik = kandidat migrasi nanti |
| R-8 | Race dua pembayaran paralel → agregat bisa sementara basi | Recompute dari SUM (self-healing); aksi "Sinkronkan angka" opsional di detail pesanan kalau drift terlihat |
| R-9 | `/keuangan/deposit-travel` dan `/keuangan/komisi-agen` masih mock, sedangkan tetangganya jadi nyata | Disengaja dan dilaporkan; sidebar tetap konsisten karena URL tidak berubah |
| R-10 | Data uji tipis: `orders` 0, `payments` 0, `pilgrims` 0 untuk An-Nahl; uang asli ada di `bookings` | Fase verifikasi harus membuat order portal lewat UI, catat pembayaran, cek rumus, **lalu bersihkan** (pola Modul 4/5: nama Indonesia natural, hapus segera, jangan sentuh baris asli) |
| R-11 | `Content-Range: */*` saat probe berarti total tidak dihitung → angka "jumlah baris" di UI tidak boleh diklaim sebagai total DB | Label UI memakai "ditemukan", bukan "total semua" |
| R-12 | Status enum `payments` (5 nilai) tidak cocok 1:1 dengan bahasa web asli ("Terbayar", "Pending") | Normalizer dua arah di `payment-fields.js` (pola `STATUS_SINONIM` Modul 5) + label tetap Bahasa Indonesia |
| R-13 | `installments` **tidak punya** `deleted_at` → hapus jadwal = hard delete | v1: hard delete jadwal milik sendiri (RLS mengizinkan) + konfirmasi eksplisit; kalau user mau retensi, perlu migrasi kolom |

**Unknowns yang butuh probe saat implementasi (bukan sekarang)**
- Apakah satu travel pernah punya >1 tagihan/booking (data sekarang 1:1 untuk An-Nahl) → bentuk
  join `transactions.invoice → invoices.noFaktur → bookings.pemesan` belum teruji pada fan-out.
- Nilai `status` `transactions` selain "Berhasil" ( enum teks warisan belum diinventaris di DB).

---

## 7. Open questions (butuh jawaban user, bukan teknis-sepele)

1. **OQ-1 — Setelah lunas, status pesanan ikut berubah?** Rekomendasi desain saat ini: **tidak**
   (hanya `payment_status`). Kalau user ingin "lunas → Confirmed" otomatis, itu satu baris
   tambahan di rollup dan perlu aturan siapa `confirmed_by`.
2. **OQ-2 — Pembayaran `pending` dihitung sebagai uang masuk?** v1: ya (uang sudah diterima,
   verifikasi hanya label). Alternatif: hanya `verified` yang dihitung → butuh role finance.
3. **OQ-3 — Refund**: tandai pembayaran lama (`status='refunded'`, keluar dari hitungan) atau
   baris pengurang tersendiri? v1: yang pertama, dan tetap di luar jalur cicilan.
4. **OQ-4 — Perlu catat pembayaran untuk pesanan lama (`bookings`)?** Kalau ya, pilih:
   (a) migrasi `order_id` nullable, (b) tulis `transactions` lama. Kalau tidak, entri lama
   hanya-baca selamanya sampai backfill produksi.
5. **OQ-5 — Link `payments.installment_id`** untuk audit (butuh migrasi additive) atau cukup
   `is_installment + notes`?
6. **OQ-6 — Upload bukti transfer** masuk v1 (butuh persetujuan migrasi bucket) atau fase
   berikutnya?
7. **OQ-7 — Gating role**: halaman keuangan untuk semua role travel, atau hanya
   `travel_admin`/`travel_finance`? Modul sebelumnya tidak me-gate role.
8. **OQ-8 — `overdue` ditulis ke DB** lewat trigger/jadwal, atau tetap dihitung aplikasi (
   rekomendasi: aplikasi, konsisten dengan preseden `document_status`).

---

## 8. Task breakdown & rough estimates

Estimate = jam kerja developer terbiasa dengan repo ini, sudah termasuk penulisan uji manual
browser + bersih-bersih data tes. Angka sengaja rentang, bukan janji.

| Fase | Isi | Output terlihat | Est. |
|---|---|---|---|
| **0. Probe & kunci kontrak** | Verifikasi ulang permission `payments`/`installments` (insert/update/delete nyata lewat 1 order percobaan), inventaris enum warisan, putuskan OQ-1..OQ-8 bareng user | Kontrak rollup final tertulis di komentar `payments.js` | 1–1,5 h |
| **1. Fields + read layer** | `payment-fields.js` (enum, warna badge, sinonim label warisan, path, `PILIH_METODE`), `payments.js` (`listPayments` union + `getOrderPaymentView` + `listInstallments` + opsi form) | Data bisa dibaca, belum ada tulis | 2–3 h |
| **2. Mesin rollup + tulis pembayaran** | `payment-actions.js`: `recomputeOrderPayment`, `recordPayment`, `buatKodePembayaran`, guard (kepemilikan, order batal, double-submit, lebih-bayar), `voidPayment` soft-delete | US-2, US-3, SC-1..SC-4, SC-7 | 3–4 h |
| **3. Detail pesanan + UI pembayaran** | `/pesanan/[id]` baru (ringkasan uang + riwayat + tautan dari tabel), `/pesanan/[id]/pembayaran`, `order-payments.jsx`, `payment-form.jsx`, `payment-row-actions.jsx`, tautan "Lihat" di `orders-table.jsx` | US-1, US-4, layar utama selesai | 3–4 h |
| **4. Daftar pembayaran keuangan** | Rewrite `/keuangan/pembayaran` jadi Server Component + `payments-table.jsx` + `/keuangan/pembayaran/baru` (pilih order dulu) + pesan toast | US-5 | 2–3 h |
| **5. Cicilan** | `installment-form.jsx` (generator jadwal + DP), `installment-table.jsx`, rewrite `/keuangan/cicilan`, `cicilan/baru`, `saveInstallmentPlan`, `markInstallmentPaid`, `deleteInstallmentPlan`, penurunan `overdue` | US-6, US-7, US-8, SC-5, SC-6 | 3,5–4,5 h |
| **6. Verifikasi keamanan + bersih + build** | Uji lintas-travel dua JWT, uji rumus SC-1..SC-3 dengan query, hapus data tes, `rm -rf .next && npm run build` + grep log, stop dev server sebelum build | Laporan + build exit 0 | 2–2,5 h |
| | **Total v1** | | **16,5–22,5 h ≈ 3–4 sesi** |
| *(7. Opsional)* | Bucket `payment-proofs` + upload + `proof_path` (OQ-6) | Bukti transfer | +2–3 h (termasuk persetujuan migrasi) |
| *(8. Opsional)* | Link `payments.installment_id` (OQ-5) | Audit rapi | +1–1,5 h |

**Checkpoint yang saya sarankan:** setelah Fase 3 (uang + detail pesanan) — pada titik itu nilai
inti modul sudah bisa dipakai dan diuji, dan cicilan bisa menyusul tanpa mengubah kontrak.

---

## 9. Rekomendasi mulai dari mana

**Mulai dari Fase 1 + 2 + 3: mesin rekonsiliasi + detail pesanan + catat pembayaran.**

Alasannya, berurutan:

1. **Kontrak rollup adalah fondasi yang tidak boleh berubah nanti.** Cicilan, daftar keuangan,
   dashboard, dan refund semuanya membaca angka yang sama. Membangunnya belakangan berarti
   membalik logika semua layar setelahnya; membangunnya lebih dulu membuat sisanya tinggal
   memajang angka yang sudah benar.
2. **Ia menutup risiko terbesar lebih awal** (R-1 double count, R-2 non-atomic, R-4 `order_id`
   NOT NULL). Ketiganya adalah risiko yang kalau baru diketahui di Fase 5 bisa memaksa migrasi atau
   perubahan bentuk data.
3. **Ia butuh halaman yang belum ada anyway** (`/pesanan/[id]`), sehingga hasil kerjanya langsung
   dipakai dua kali: pembayaran sekarang, dan detail pesanan untuk modul-modul berikutnya
   (dokumen jamaah, manifest).
4. **Nilai yang terlihat paling cepat.** Setelah Fase 3, user sudah bisa menjawab "siapa belum
   lunas dan berapa sisanya?" dari layar nyata — pertanyaan bisnis yang paling mendesak —
   sementara cicilan hanya menambah disiplin penagihan di atasnya.
5. **Cicilan di akhir karena paling banyak open question** (OQ-1, OQ-3, OQ-5) dan satu-satunya
   bagian yang mungkin menyentuh migrasi. Menaruhnya terakhir berarti pertanyaan itu dijawab
   setelah kontrak uang terbukti, bukan sebelum.

Urutan konkret 3 sesi pertama: **(Sesi A)** Fase 0+1+2 — kontrak + tulis pembayaran + rollup,
diuji dengan satu order percobaan yang langsung dibersihkan. **(Sesi B)** Fase 3 — detail
pesanan + form + badge + toast, diuji visual di browser. **(Sesi C)** Fase 4+5+6 — daftar
keuangan, cicilan, uji RLS dua akun, build final.
