import type { NextRequest, NextResponse } from "next/server";

/**
 * AUTH_ENABLED=true turns on the auth check. Off by default: the app has no login yet.
 * When Supabase Auth is added, put the session check in authCheck() and nowhere else;
 * proxy.ts already routes every page and API request through it.
 */
export const AUTH_ENABLED = process.env.AUTH_ENABLED === "true";

/** Return a response to stop the request (redirect, 401), or null to let it through. */
export async function authCheck(request: NextRequest): Promise<NextResponse | null> {
  if (!AUTH_ENABLED) return null;
  // Supabase Auth goes here: read the session cookie from request.cookies,
  // refresh it, and redirect to the sign-in page when it is missing.
  void request;
  return null;
}
