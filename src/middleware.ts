import { NextRequest, NextResponse } from "next/server";

/**
 * Dormant until RESTAURANTOS_TENANT_BASE_DOMAIN is configured.
 * Hostnames are only used for public routing; backend JWT and tenant membership
 * must still authorize all protected restaurant operations.
 */
export function middleware(request: NextRequest) {
  const base = process.env.RESTAURANTOS_TENANT_BASE_DOMAIN?.trim().toLowerCase().replace(/\.$/, "");
  if (!base) return NextResponse.next();

  const hostname = (request.headers.get("host") ?? "").split(":")[0].toLowerCase().replace(/\.$/, "");
  if (!hostname.endsWith("." + base)) return NextResponse.next();

  const subdomain = hostname.slice(0, -(base.length + 1));
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
    return new NextResponse("Invalid restaurant hostname", { status: 400 });
  }
  if (["www", "admin", "api", "app", "support", "login", "mail", "status", "docs"].includes(subdomain)) {
    return NextResponse.next();
  }
  const pathname = request.nextUrl.pathname;
  if (pathname !== "/" && pathname !== "/menu") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/tenant-host/" + subdomain;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/", "/menu"] };
