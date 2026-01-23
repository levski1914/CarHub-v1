import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/vehicles", "/calendar", "/settings", "/profile"];
const AUTH_PAGES = ["/login"]; // можеш да добавиш и /register ако имаш отделно

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("access_token")?.value;
  const isAuthed = !!token;

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // ✅ 1) ако НЕ е логнат и отваря protected -> към login
  if (!isAuthed && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ✅ 2) ако е логнат и отваря login -> към /vehicles
  if (isAuthed && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/vehicles";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  // ✅ 3) по желание: ако е логнат и отвори "/" (landing) -> към /vehicles
  // ако НЕ искаш това, махни блока
  if (isAuthed && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/vehicles";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/", // за да работи правилото за landing при логнат
    "/login",
    "/vehicles/:path*",
    "/calendar/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
