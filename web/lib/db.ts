import "server-only";
import { Pool, type PoolConfig, type QueryResultRow } from "pg";

// Same rules as scripts/load.py: DATABASE_URL, optionally without the password,
// plus DATABASE_PASSWORD (raw, no URL-encoding). An unencoded password inside
// DATABASE_URL is also accepted.

/** Pull an unencoded password out of postgresql://user:PASSWORD@host/... */
function splitRawPassword(url: string): [string, string | undefined] {
  const m = /^(postgres(?:ql)?:\/\/[^:@/]*):([\s\S]*)@([^@]*)$/.exec(url);
  return m ? [`${m[1]}@${m[3]}`, m[2]] : [url, undefined];
}

function connectionConfig(): PoolConfig {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

  let password = process.env.DATABASE_PASSWORD || undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
    password ??= decodeURIComponent(parsed.password) || undefined;
  } catch {
    // Not a valid URL as written, most likely an unencoded password.
    const [stripped, raw] = splitRawPassword(url);
    password ??= raw;
    try {
      parsed = new URL(stripped);
    } catch {
      // Never echo the URL: it may contain the password.
      throw new Error("DATABASE_URL could not be parsed. Expected "
        + "postgresql://user:password@host:port/database");
    }
  }

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    database: decodeURIComponent(parsed.pathname.slice(1)) || "postgres",
    password,
    // Supabase requires TLS. Its CA is not in Node's default store, so verify
    // only when DATABASE_CA_CERT (PEM) is provided.
    ssl: process.env.DATABASE_CA_CERT
      ? { ca: process.env.DATABASE_CA_CERT }
      : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

// One pool per process; reused across dev hot reloads.
const globalForDb = globalThis as unknown as { onetPool?: Pool };

function pool(): Pool {
  globalForDb.onetPool ??= new Pool(connectionConfig());
  return globalForDb.onetPool;
}

/** Run a parameterized query. Table names must be literals in the SQL, never user input. */
export async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool().query<T>(sql, params);
  return result.rows;
}
