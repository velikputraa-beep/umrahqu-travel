import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Halaman yang boleh diakses tanpa login. `/login` adalah rute aslinya;
// `/travel/login` juga dilayani karena next.config.mjs me-rewrite
// `/travel/:path*` ke `/:path*`.
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname === `/travel${p}` || pathname.startsWith(`${p}/`)
  );
}

export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  // getUser() membaca sesi dari cookie dan otomatis me-refresh access token
  // yang kedaluwarsa; cookie hasil refresh ditulis lewat setAll di atas.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectTo = (path) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!user && !isPublicPath(pathname)) {
    return redirectTo("/login");
  }

  if (user && (pathname === "/login" || pathname === "/travel/login")) {
    return redirectTo("/travel/dashboard");
  }

  return response;
}

export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
};
