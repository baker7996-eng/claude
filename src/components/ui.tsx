import Link from "next/link";
import type { ReactNode } from "react";

export function Panel({
  title,
  link,
  className = "",
  children,
}: {
  title: string;
  link?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-md border border-line bg-panel px-4 py-3.5 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="display text-xl">{title}</h2>
        {link && (
          <Link href={link.href} className="text-xs font-semibold text-lime hover:underline">
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const chipTones = {
  lime: "bg-lime/12 text-lime",
  amber: "bg-amber/14 text-amber",
  loss: "bg-loss/14 text-loss",
};

export function Chip({ tone, children }: { tone: keyof typeof chipTones; children: ReactNode }) {
  return (
    <span className={`display rounded-[3px] px-2 py-0.5 text-[15px] ${chipTones[tone]}`}>
      {children}
    </span>
  );
}

/** Rows separated by thin rules, as used in every panel list. */
export function Rows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line">{children}</ul>;
}

export function FormStrip({ results }: { results: ("W" | "D" | "L")[] }) {
  const tone = { W: "bg-lime", D: "bg-soft", L: "bg-loss" };
  return (
    <div className="flex gap-1" aria-label={`Last ${results.length}: ${results.join(" ")}`}>
      {results.map((r, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-sm ${tone[r]}`} />
      ))}
    </div>
  );
}
