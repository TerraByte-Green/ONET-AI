import { NextResponse, type NextRequest } from "next/server";
import { authCheck } from "@/lib/auth";

// The single request hook for every page and API route (Next 16 renamed middleware.ts to proxy.ts).
export async function proxy(request: NextRequest) {
  return (await authCheck(request)) ?? NextResponse.next();
}

export const config = {
  // Everything except build assets and public brand files.
  matcher: ["/((?!_next/static|_next/image|brand/|favicon.ico|icon.png).*)"],
};
