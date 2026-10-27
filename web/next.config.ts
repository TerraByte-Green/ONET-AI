import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The shared .env lives at the repo root (also used by scripts/load.py), but Next.js
// only reads env files from web/. Load the root one too; vars already set win.
loadEnvConfig(path.join(__dirname, ".."));

const nextConfig: NextConfig = {
  // pg is a Node-only driver; keep it out of the server bundle.
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
  // Pin the project root to web/ so a stray lockfile in a parent folder is never picked up.
  turbopack: { root: __dirname },
};

export default nextConfig;
