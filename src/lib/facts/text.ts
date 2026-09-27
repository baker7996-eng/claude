import type { TableRow } from "./league";

/** League table as a markdown table, ready to paste. */
export function tableText(rows: TableRow[]): string[] {
  return [
    "| # | Team | W | D | L | PF | PA | Pts |",
    "|---|------|---|---|---|----|----|-----|",
    ...rows.map(
      (r) =>
        `| ${r.rank} | ${r.team} | ${r.won} | ${r.drawn} | ${r.lost} | ${r.pointsFor} | ${r.pointsAgainst} | ${r.points} |`,
    ),
  ];
}

/** "Sat 10 Oct, 11:30" in UK time. */
export function ukTime(iso: string | null): string {
  if (!iso) return "time TBC";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Collects fact-sheet lines under named sections so a caller can ask for one
 * part at a time (small responses survive tools that truncate long pages).
 * The "intro" section is always included.
 */
export class Sheet {
  private chunks: { key: string; lines: string[] }[] = [{ key: "intro", lines: [] }];

  /** Following lines belong to `key` (a key can be reopened later). */
  section(key: string) {
    this.chunks.push({ key, lines: [] });
  }

  push(...lines: string[]) {
    this.chunks[this.chunks.length - 1].lines.push(...lines);
  }

  render(part?: string): string {
    const keys = new Set(this.chunks.map((c) => c.key));
    if (part && !keys.has(part)) {
      keys.delete("intro");
      return `Unknown part "${part}". Available parts: ${[...keys].join(", ")}.`;
    }
    return this.chunks
      .filter((c) => !part || c.key === "intro" || c.key === part)
      .flatMap((c) => c.lines)
      .join("\n");
  }
}

/** FPL stores names as typed at sign-up ("lewis tipping"); tidy them. */
export function titleCase(name: string): string {
  return name.replace(/(^|[\s-])(\p{Ll})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}
