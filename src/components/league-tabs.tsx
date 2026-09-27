"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Table", href: "/league" },
  { label: "Awards", href: "/league/awards" },
  { label: "Rivals", href: "/league/rivals" },
  { label: "Trade block", href: "/league/trades" },
];

/** Sub-navigation for the League section. */
export function LeagueTabs() {
  const path = usePathname();
  return (
    <nav className="display -mx-4 mb-3 flex gap-1 overflow-x-auto px-4 text-[15px] tracking-[0.06em] md:mb-4">
      {TABS.map((t) => {
        const active = t.href === "/league" ? path === "/league" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-[3px] px-3 py-1.5 ${
              active ? "bg-lime text-pitch" : "border border-line text-soft hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
