"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Items without an href are on the roadmap and shown as "soon".
const ITEMS: { label: string; href?: string }[] = [
  { label: "Home", href: "/" },
  { label: "My team", href: "/me" },
  { label: "Write-ups", href: "/writeups" },
  { label: "League", href: "/league" },
];

function Item({ label, href, active }: { label: string; href?: string; active: boolean }) {
  if (!href) {
    return (
      <span className="flex flex-col items-center text-soft/50" title="Coming soon">
        {label}
        <span className="text-[9px] tracking-widest">soon</span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={active ? "text-lime" : "text-soft hover:text-ink"}
    >
      {label}
    </Link>
  );
}

/** Top bar on laptops, bottom tab bar on phones. */
export function Nav({ leagueName }: { leagueName: string }) {
  const path = usePathname();
  const items = ITEMS.map((item) => (
    <Item key={item.label} {...item} active={item.href === "/" ? path === "/" : !!item.href && path.startsWith(item.href)} />
  ));
  const [first, ...rest] = leagueName.split(" in ");

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-pitch/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="font-brand text-[17px] uppercase tracking-tight">
            {rest.length ? (
              <>
                {first} <span className="text-lime">in</span> {rest.join(" in ")}
              </>
            ) : (
              leagueName
            )}
          </Link>
          <nav className="display hidden gap-8 text-[15px] tracking-[0.08em] md:flex">{items}</nav>
        </div>
      </header>
      <nav className="display fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-line bg-pitch/95 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-sm tracking-[0.08em] backdrop-blur md:hidden">
        {items}
      </nav>
    </>
  );
}
