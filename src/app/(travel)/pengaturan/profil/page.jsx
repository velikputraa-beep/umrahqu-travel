import React from "react";
import { Building2, Mail, Phone, MapPin, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABEL, getTravelContext } from "@/lib/auth/session";
import { getProfilTravel, PROFIL_BISA_DIUBAH } from "@/lib/data/pengaturan";
import { saveProfil } from "@/lib/data/pengaturan-actions";
import { PROFIL_FIELDS, PROFIL_PATH } from "@/lib/data/record-fields";
import RecordForm from "@/components/travel/record-form";
import ToastMessage from "@/components/travel/toast-message";

function Baris({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
          {label}
        </div>
        <div className="text-xs text-gray-800 mt-0.5">{value || "Belum diisi"}</div>
      </div>
    </div>
  );
}

export default async function ProfilPengaturanPage({ searchParams }) {
  const ctx = await getTravelContext();
  const params = await searchParams;
  const { travel, error } = await getProfilTravel(ctx);
  const bolehUbah =
    Boolean(travel) && PROFIL_BISA_DIUBAH.includes(String(ctx.profile?.role ?? ""));

  const inisial = (travel?.nama ?? ctx.travelName ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <ToastMessage key={`${params.toast}:${params.t ?? ""}`} toast={params.toast} />

      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Profil Travel</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Identitas ini ditampilkan di invoice, dokumen jamaah, dan halaman
          marketplace travel Anda.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <ShieldAlert className="size-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-rose-800">{error}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Muat ulang halaman ini. Kalau masih gagal, hubungi super admin.
            </p>
          </div>
        </div>
      )}

      {travel && (
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {travel.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={travel.logo_url}
                alt={`Logo ${travel.nama}`}
                className="size-16 rounded-xl object-cover border border-gray-200 bg-white shrink-0"
              />
            ) : (
              <div className="size-16 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-700 flex items-center justify-center text-lg font-extrabold shrink-0">
                {inisial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900 leading-tight">
                {travel.nama}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {[travel.alamatKota, travel.alamatDetail].filter(Boolean).join(" · ") ||
                  "Alamat belum diisi"}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="px-2.5 py-0.5 rounded-full border text-[11px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                  {travel.status ?? "Aktif"}
                </span>
                {travel.legalitas && (
                  <span className="px-2.5 py-0.5 rounded-full border text-[11px] font-medium bg-gray-100 text-gray-600 border-gray-200">
                    Legalitas {travel.legalitas}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full border text-[11px] font-medium bg-gray-100 text-gray-600 border-gray-200">
                  {travel.totalPaket ?? 0} paket
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {travel && bolehUbah && (
        <RecordForm
          heading="Ubah Identitas Travel"
          description="Perubahan langsung dipakai di dokumen dan halaman publik travel Anda."
          action={saveProfil}
          fields={PROFIL_FIELDS}
          initial={{
            nama: travel.nama ?? "",
            email: travel.contact_email ?? "",
            telepon: travel.contact_phone ?? "",
            alamat: travel.alamatDetail ?? "",
            kota: travel.alamatKota ?? "",
            logo: travel.logo_url ?? "",
          }}
          backHref={PROFIL_PATH}
          backLabel="Muat ulang profil"
          submitLabel="Simpan"
        />
      )}

      {travel && !bolehUbah && (
        <Card className="border-gray-200/80 shadow-xs">
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="text-xs font-bold text-gray-900">Informasi Travel</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Hanya Admin Travel yang bisa mengubah data ini.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Baris icon={Building2} label="Nama Travel" value={travel.nama} />
              <Baris icon={Mail} label="Email Resmi" value={travel.contact_email} />
              <Baris icon={Phone} label="No. Telepon" value={travel.contact_phone} />
              <Baris icon={MapPin} label="Alamat" value={travel.alamatDetail} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200/80 shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div>
            <h2 className="text-xs font-bold text-gray-900">Akun Login Anda</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Akun dan password dikelola lewat Web Admin UmrahQu.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Baris icon={Building2} label="Nama" value={ctx.profile?.full_name} />
            <Baris icon={Mail} label="Email" value={ctx.profile?.email ?? ctx.user?.email} />
            <Baris
              icon={ShieldAlert}
              label="Peran"
              value={ROLE_LABEL[ctx.profile?.role] ?? ctx.profile?.role}
            />
            <Baris label="Travel" value={ctx.travelName} icon={MapPin} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
