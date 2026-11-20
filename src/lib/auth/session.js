import { createClient } from "@/lib/supabase/server";

export const ROLE_LABEL = {
  super_admin: "Super Admin",
  admin: "Administrator",
  travel_admin: "Admin Travel",
  travel_operational: "Operational",
  travel_finance: "Keuangan",
  travel_staff: "Staf Travel",
};

// Membaca sesi + baris `profiles` milik user yang login.
// Dipakai hanya di Server Component/Route Handler: RLS `profiles_select`
// membatasi hasilnya ke `id = auth.uid()`, jadi tidak perlu filter manual.
export async function getTravelContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, travel_id, branch_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  let travelName = null;
  if (profile?.travel_id) {
    const { data: travel } = await supabase
      .from("travels")
      .select("uid, nama")
      .eq("uid", profile.travel_id)
      .maybeSingle();
    travelName = travel?.nama ?? null;
  }

  return { user, profile, travelName };
}

export function initialsOf(nameOrEmail) {
  const source = (nameOrEmail || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
