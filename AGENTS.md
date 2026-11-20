# AGENTS.md

## Stack

- Next.js App Router dengan **JavaScript (.jsx)** — jangan buat file TypeScript (`.ts`/`.tsx`).
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`) dipakai bersama oleh Web Admin, Travel, dan Marketplace. Browser client: `src/lib/supabase/client.js`. Server client: `src/lib/supabase/server.js`.

## UI

- Web Travel pakai **Light Mode** (`bg-white`, `bg-gray-50`).
- Warna utama: **Emerald-700/800**. Warna aksen: **Amber-500**.
- Wajib pakai komponen **shadcn/ui**.

## Keamanan

- **Dilarang pakai Service Role Key di frontend.** Hanya `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) yang boleh sampai ke browser.
