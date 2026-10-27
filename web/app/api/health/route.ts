import { NextResponse } from "next/server";
import { getReleaseInfo } from "@/lib/onet";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const release = await getReleaseInfo();
    if (!release) {
      return NextResponse.json(
        { status: "error", message: "The database is reachable but no O*NET release is loaded." },
        { status: 503 });
    }
    return NextResponse.json({ status: "ok", release });
  } catch (err) {
    console.error("health check failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { status: "error", message: "We couldn't reach the database. Refresh in a minute." },
      { status: 503 });
  }
}
