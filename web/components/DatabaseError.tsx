import { Mascot } from "./Mascot";

/** Shown in place of page data when a query fails. */
export function DatabaseError() {
  return (
    <div role="alert" className="flex items-center gap-6">
      <Mascot size="md" />
      <p className="text-lg">We couldn&rsquo;t reach the database. Refresh in a minute.</p>
    </div>
  );
}

/** Run a page's data loader; null (and a server log line) when the database fails. */
export async function loadOrNull<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    console.error(`${label} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}
