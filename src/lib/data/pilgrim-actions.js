"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTravelContext } from "@/lib/auth/session";
import {
  JAMAAH_LIST_PATH,
  JAMAAH_DOKUMEN_PATH,
  DOC_BUCKET,
  DOC_MAX_BYTES,
  DOC_MIME_ALLOWED,
  DOC_TYPE_VALUES,
  normalizePilgrimStatus,
} from "@/lib/data/pilgrim-fields";

function pesanError(error) {
  return error?.message
    ? `Database menolak penyimpanan: ${error.message}`
    : "Terjadi kesalahan tak terduga.";
}

// `t` membuat URL redirect selalu unik supaya ToastMessage ter-remount
// (persis alasan yang sama seperti di modul Paket).
function redirectToast(kind, path) {
  redirect(`${path}?toast=${kind}&t=${Date.now()}`);
}

async function writeScope() {
  const ctx = await getTravelContext();
  if (!ctx?.profile) return { error: "Sesi tidak dikenali. Silakan masuk kembali." };
  const travelId = ctx.profile.travel_id ?? null;
  if (!travelId) {
    return { error: "Akun Anda belum ditautkan ke travel mana pun, jadi belum bisa menyimpan jamaah." };
  }
  return {
    supabase: await createClient(),
    travelId,
    userId: ctx.user?.id ?? null,
    isSuperAdmin: ctx.profile.role === "super_admin",
  };
}

function bacaField(formData) {
  const teks = (name) => String(formData.get(name) ?? "").trim();
  return {
    idLama: teks("idLama"),
    nama: teks("full_name"),
    phone: teks("phone"),
    paspor: teks("passport_number").toUpperCase(),
    packageId: teks("package_id") || null,
    status: normalizePilgrimStatus(teks("status")),
  };
}

// Guard kepemilikan di sisi aplikasi: RLS memang sudah menyaring, tapi pesan
// "jamaah tidak ditemukan" lebih jujur daripada mengirim UPDATE yang diam-diam
// tidak mengenai baris apa pun.
async function findOwnedPilgrim(s, id) {
  if (!id) return { error: "Jamaah tidak dikenali." };
  const { data, error } = await s.supabase
    .from("pilgrims")
    .select("id, travel_id, package_id, document_status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { error: pesanError(error) };
  if (!data || (!s.isSuperAdmin && data.travel_id !== s.travelId)) {
    return { error: "Jamaah tidak ditemukan atau bukan jamaah travel Anda." };
  }
  return { pilgrim: data };
}

async function syncDocumentStatus(s, pilgrimId) {
  const { data } = await s.supabase
    .from("pilgrim_documents")
    .select("doc_type")
    .eq("pilgrim_id", pilgrimId);
  const punya = new Set((data ?? []).map((d) => d.doc_type));
  const lengkap = DOC_TYPE_VALUES.every((type) => punya.has(type));
  const { error } = await s.supabase
    .from("pilgrims")
    .update({
      document_status: lengkap ? "complete" : "incomplete",
      updated_at: new Date().toISOString(),
    })
    .eq("id", pilgrimId);
  if (error) console.error("syncDocumentStatus gagal:", pilgrimId, error.code, error.message);
  return lengkap;
}

export async function savePilgrim(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };
  const f = bacaField(formData);
  if (!f.nama) return { error: "Nama jamaah wajib diisi." };

  const now = new Date().toISOString();
  // Kolom lain (NIK, masa berlaku paspor, catatan) sengaja tidak ditulis:
  // form ini hanya memegang 5 field spesifikasi, dan menulis null untuk kolom
  // yang tidak ada di form akan menghapus hasil backfill produksi.
  const payload = {
    full_name: f.nama,
    phone: f.phone || null,
    passport_number: f.paspor || null,
    package_id: f.packageId,
    status: f.status,
    updated_at: now,
  };

  if (f.idLama) {
    const owned = await findOwnedPilgrim(s, f.idLama);
    if (owned.error) return { error: owned.error };
    const { error } = await s.supabase
      .from("pilgrims")
      .update(payload)
      .eq("id", f.idLama);
    if (error) return { error: pesanError(error) };
    redirectToast("jamaah-ubah", JAMAAH_LIST_PATH);
  }

  const { error } = await s.supabase.from("pilgrims").insert({
    ...payload,
    id: crypto.randomUUID(),
    travel_id: s.travelId,
    order_id: null,
    document_status: "incomplete",
    nationality: "WNI",
    created_at: now,
  });
  if (error) return { error: pesanError(error) };
  redirectToast("jamaah-baru", JAMAAH_LIST_PATH);
}

// Soft delete: pilgrims_select tidak menyaring deleted_at (beda dengan
// katalog packages), jadi UPDATE polos lolos RLS. Dokumen jamaah ikut
// dibersihkan supaya berkas KTP/paspor tidak tertinggal yatim di Storage.
export async function deletePilgrim(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };
  const id = String(formData.get("idLama") ?? "").trim();
  const owned = await findOwnedPilgrim(s, id);
  if (owned.error) return { error: owned.error };

  const { error } = await s.supabase
    .from("pilgrims")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: pesanError(error) };

  const { data: docs } = await s.supabase
    .from("pilgrim_documents")
    .select("id, file_path")
    .eq("pilgrim_id", id);
  if (docs?.length) {
    const paths = docs.map((d) => d.file_path).filter(Boolean);
    if (paths.length) await s.supabase.storage.from(DOC_BUCKET).remove(paths);
    await s.supabase
      .from("pilgrim_documents")
      .delete()
      .in("id", docs.map((d) => d.id));
  }

  redirectToast("jamaah-hapus", JAMAAH_LIST_PATH);
}

export async function uploadPilgrimDocument(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };

  const id = String(formData.get("pilgrim_id") ?? "").trim();
  const docType = String(formData.get("doc_type") ?? "").trim();
  const file = formData.get("file");

  if (!DOC_TYPE_VALUES.includes(docType)) return { error: "Jenis dokumen tidak dikenali." };
  if (!file || typeof file.size !== "number" || file.size === 0) {
    return { error: "Pilih berkas dulu sebelum mengunggah." };
  }
  if (file.size > DOC_MAX_BYTES) {
    return { error: `Berkas terlalu besar (maks ${DOC_MAX_BYTES / 1024 / 1024} MB).` };
  }
  if (!DOC_MIME_ALLOWED.includes(file.type)) {
    return { error: "Format berkas harus JPG, PNG, WEBP, atau PDF." };
  }

  const owned = await findOwnedPilgrim(s, id);
  if (owned.error) return { error: owned.error };

  const ext = String(file.name ?? "").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const filePath = `${s.travelId}/${id}/${docType}-${Date.now()}.${ext}`;

  const { error: uploadError } = await s.supabase.storage
    .from(DOC_BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("uploadPilgrimDocument Storage gagal:", uploadError.code, uploadError.message);
    return { error: `Berkas gagal diunggah: ${uploadError.message}` };
  }

  const { error: insertError } = await s.supabase.from("pilgrim_documents").insert({
    id: crypto.randomUUID(),
    travel_id: s.travelId,
    pilgrim_id: id,
    doc_type: docType,
    file_path: filePath,
    file_name: String(file.name ?? "").slice(0, 200),
    mime_type: file.type,
    file_size: file.size,
    status: "uploaded",
    uploaded_by: s.userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (insertError) {
    // Batalkan berkas yang baru saja naik supaya tidak jadi yatim.
    await s.supabase.storage.from(DOC_BUCKET).remove([filePath]);
    return { error: pesanError(insertError) };
  }

  // Versi lama dibersihkan HANYA setelah baris baru berhasil, jadi unggah yang
  // gagal tidak pernah menghilangkan dokumen sebelumnya.
  const { data: lama } = await s.supabase
    .from("pilgrim_documents")
    .select("id, file_path")
    .eq("pilgrim_id", id)
    .eq("doc_type", docType)
    .neq("file_path", filePath);
  if (lama?.length) {
    const paths = lama.map((d) => d.file_path).filter(Boolean);
    if (paths.length) await s.supabase.storage.from(DOC_BUCKET).remove(paths);
    await s.supabase
      .from("pilgrim_documents")
      .delete()
      .in("id", lama.map((d) => d.id));
  }

  await syncDocumentStatus(s, id);
  redirectToast("dokumen-unggah", JAMAAH_DOKUMEN_PATH);
}

export async function deletePilgrimDocument(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };
  const docId = String(formData.get("doc_id") ?? "").trim();
  if (!docId) return { error: "Dokumen tidak dikenali." };

  const { data: doc, error: findError } = await s.supabase
    .from("pilgrim_documents")
    .select("id, travel_id, pilgrim_id, file_path")
    .eq("id", docId)
    .maybeSingle();
  if (findError) return { error: pesanError(findError) };
  if (!doc || (!s.isSuperAdmin && doc.travel_id !== s.travelId)) {
    return { error: "Dokumen tidak ditemukan atau bukan milik travel Anda." };
  }

  const { error: deleteError } = await s.supabase
    .from("pilgrim_documents")
    .delete()
    .eq("id", docId);
  if (deleteError) return { error: pesanError(deleteError) };

  if (doc.file_path) {
    const { error: storageError } = await s.supabase.storage.from(DOC_BUCKET).remove([doc.file_path]);
    if (storageError) {
      console.error("deletePilgrimDocument: berkas tersisa", doc.file_path, storageError.message);
    }
  }

  await syncDocumentStatus(s, doc.pilgrim_id);
  redirectToast("dokumen-hapus", JAMAAH_DOKUMEN_PATH);
}

// Tidak redirect: pemanggil butuh URL-nya untuk membuka berkas di tab baru.
// Signed URL 60 detik supaya link tidak jadi tautan publik yang awet.
export async function viewPilgrimDocument(formData) {
  const s = await writeScope();
  if (s.error) return { error: s.error };
  const docId = String(formData.get("doc_id") ?? "").trim();
  if (!docId) return { error: "Dokumen tidak dikenali." };

  const { data: doc, error } = await s.supabase
    .from("pilgrim_documents")
    .select("id, travel_id, file_path, file_name")
    .eq("id", docId)
    .maybeSingle();
  if (error) return { error: pesanError(error) };
  if (!doc || (!s.isSuperAdmin && doc.travel_id !== s.travelId)) {
    return { error: "Dokumen tidak ditemukan atau bukan milik travel Anda." };
  }
  if (!doc.file_path) return { error: "Dokumen ini belum punya berkas." };

  const { data: signed, error: signError } = await s.supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(doc.file_path, 60);
  if (signError) return { error: `Berkas tidak bisa dibuka: ${signError.message}` };
  return { url: signed.signedUrl, fileName: doc.file_name };
}
