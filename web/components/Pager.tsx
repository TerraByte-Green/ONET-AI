import Link from "next/link";
import { hrefWith } from "@/lib/url";

const fmt = new Intl.NumberFormat("en-US");

/** "Showing 51 to 100 of 340" plus previous / next links that keep the other params. */
export function Pager({ path, params, page, pageSize, total, noun }: {
  path: string;
  params: Record<string, string | number | undefined>;
  page: number;
  pageSize: number;
  total: number;
  noun: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center gap-4">
      <p className="mr-auto">
        Showing {fmt.format(from)} to {fmt.format(to)} of {fmt.format(total)} {noun}
      </p>
      {page > 1 ? (
        <Link href={hrefWith(path, { ...params, page: page - 1 })} rel="prev" className="tbg-btn tbg-btn-secondary">
          Previous page
        </Link>
      ) : null}
      {page < pages ? (
        <Link href={hrefWith(path, { ...params, page: page + 1 })} rel="next" className="tbg-btn tbg-btn-secondary">
          Next page
        </Link>
      ) : null}
    </nav>
  );
}
