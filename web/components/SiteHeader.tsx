"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HELP_HREF, NAV, isCurrent } from "@/lib/site";
import { Wave } from "./Wave";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <header>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3 focus:font-bold"
      >
        Skip to content
      </a>
      <div className="bg-sky">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-8">
          {/* Clear space around the lockup: about 1/8 of the icon width. */}
          <Link href="/" className="block p-2 no-underline hover:bg-none" onClick={close}>
            <Image
              src="/brand/logo-lockup.png"
              alt="TerraByte Green"
              width={177}
              height={60}
              preload
              className="h-auto w-[150px] md:w-[177px]"
            />
          </Link>

          <button
            type="button"
            className="tbg-btn tbg-btn-secondary md:hidden"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close menu" : "Menu"}
          </button>

          <nav
            id="site-nav"
            aria-label="Main"
            className={`${menuOpen ? "block" : "hidden"} w-full md:block md:w-auto`}
          >
            <ul className="flex flex-col gap-1 pb-2 md:flex-row md:items-center md:gap-6 md:pb-0">
              {NAV.map(({ href, label }) => {
                const current = isCurrent(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      aria-current={current ? "page" : undefined}
                      className={`block py-2 font-medium no-underline hover:underline ${current ? "tbg-highlight font-bold" : ""}`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href={HELP_HREF}
                  onClick={close}
                  aria-current={isCurrent(pathname, HELP_HREF) ? "page" : undefined}
                  className="flex items-center gap-2 py-2 font-medium no-underline hover:bg-none md:py-0"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-earth font-bold ${isCurrent(pathname, HELP_HREF) ? "bg-sun" : "bg-white"}`}
                  >
                    ?
                  </span>
                  <span className="md:sr-only">Help</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      {/* Home draws its own wave under the search hero. */}
      {pathname === "/" ? null : <Wave />}
    </header>
  );
}
