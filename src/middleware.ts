import { withAuth } from "next-auth/middleware";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing, locales, defaultLocale } from "./routing";

const intlMiddleware = createMiddleware(routing);

const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const prefix = pathname.split("/")[1];
    const locale = locales.find((value) => value === prefix) || defaultLocale;
    const routePath = locales.some((value) => value === prefix) ? pathname.slice(prefix.length + 1) || "/" : pathname;
    if (routePath.startsWith("/auth/") || routePath === "/" || routePath === "/results" || routePath.startsWith("/results/") || routePath.startsWith("/invitations/")) return intlMiddleware(req);
    if (!token) {
      const login = new URL(`/${locale}/auth/login`, req.url);
      login.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }

    // Role-based access control
    const role = token?.role as string;

    // Evaluator cannot access create pages
    if (role === "EVALUATOR" && (
      pathname.includes("/tasks/new") ||
      pathname.includes("/classes/new") ||
      pathname.includes("/students/bulk")
    )) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Student only dashboard and tasks
    if (role === "STUDENT" && (
      routePath.startsWith("/students") ||
      routePath.startsWith("/evaluations") ||
      pathname.includes("/classes/new")
    )) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return intlMiddleware(req);
  },
  {
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    callbacks: {
      // The callback above performs redirects so the requested locale is preserved.
      authorized: () => true,
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

export default function middleware(req: NextRequest) {
  const publicPaths = ["/api/", "/auth/", "/_next/", "/favicon.ico", "/logo.svg"];
  const isPublic = publicPaths.some((path) => req.nextUrl.pathname.startsWith(path));

  if (isPublic) {
    return intlMiddleware(req);
  }

  return (authMiddleware as any)(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
