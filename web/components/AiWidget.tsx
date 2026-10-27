"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Mascot } from "./Mascot";

// "auto" = open on wide screens, folded elsewhere, until the visitor chooses.
type WidgetState = "auto" | "open" | "closed";

const WIDE = "(min-width: 1024px)";

function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getWide = () => window.matchMedia(WIDE).matches;
const getWideOnServer = () => false;

/**
 * Page body plus the AI widget slot hosted by the mascot.
 * Desktop: 360px right panel that folds to an edge tab.
 * Tablet: the same panel over the page. Mobile: full-height bottom sheet.
 * Layout lives in globals.css under .tbg-shell; state is a data attribute.
 */
export function AiWidgetShell({ children, widget }: { children: ReactNode; widget?: ReactNode }) {
  const [state, setState] = useState<WidgetState>("auto");
  const wide = useSyncExternalStore(subscribeWide, getWide, getWideOnServer);
  const open = state === "open" || (state === "auto" && wide);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function setOpen(next: boolean) {
    setState(next ? "open" : "closed");
    // Move focus with the panel so keyboard users follow it.
    requestAnimationFrame(() => (next ? headingRef.current : toggleRef.current)?.focus());
  }

  return (
    <div className="tbg-shell" data-widget={state}>
      <main id="main" className="min-w-0">
        {children}
      </main>

      <button
        ref={toggleRef}
        type="button"
        className="tbg-widget-toggle"
        aria-expanded={open}
        aria-controls="ai-widget"
        onClick={() => setOpen(!open)}
      >
        <Mascot size="sm" />
        <span className="tbg-widget-toggle-label">Ask about careers</span>
      </button>

      <aside
        id="ai-widget"
        className="tbg-widget"
        aria-labelledby="ai-widget-title"
        onKeyDown={(e) => {
          if (e.key === "Escape" && !wide) setOpen(false);
        }}
      >
        <div className="tbg-on-brown flex items-center gap-3 bg-earth px-4 py-3 text-white">
          <Mascot size="sm" />
          <h2 id="ai-widget-title" ref={headingRef} tabIndex={-1} className="flex-1 text-lg">
            Ask about careers
          </h2>
          <button
            type="button"
            className="rounded-control border-2 border-white px-3 py-1 font-bold text-white hover:bg-white hover:text-earth"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{widget ?? <WidgetPlaceholder />}</div>
      </aside>
    </div>
  );
}

function WidgetPlaceholder() {
  return (
    <div className="flex flex-col items-start gap-4">
      <Mascot size="md" />
      <p>
        Soon you can ask questions here, like &ldquo;What does a dental hygienist do?&rdquo; or
        &ldquo;Which jobs use math every day?&rdquo;
      </p>
      <p>
        Until then, <Link href="/search">search jobs</Link> by title, skill or a code like 15-1252.
      </p>
    </div>
  );
}
