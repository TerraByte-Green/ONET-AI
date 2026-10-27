"use client";

import { useState, type MouseEvent } from "react";

type Status = "idle" | "working" | "done" | "error";

/**
 * The page's one primary action. A plain download link that, with JavaScript,
 * fetches the file itself so it can say "CSV downloaded" when it is done.
 */
export function DownloadCsv({ href, filename }: { href: string; filename: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function download(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (status === "working") return;
    setStatus("working");
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={href} download={filename} onClick={download} className="tbg-btn tbg-btn-primary" aria-busy={status === "working"}>
        {status === "working" ? "Building CSV…" : "Download CSV"}
      </a>
      <span role="status" className="text-sm">
        {status === "done" ? "CSV downloaded." : null}
        {status === "error" ? "We couldn't build the CSV. Try again in a minute." : null}
      </span>
    </div>
  );
}
