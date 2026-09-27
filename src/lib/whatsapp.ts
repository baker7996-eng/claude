/**
 * Convert a markdown write-up to WhatsApp formatting: headings and **bold**
 * become *bold*, and tables become aligned monospace blocks.
 */
export function toWhatsApp(markdown: string): string {
  const out: string[] = [];
  const lines = markdown.trim().split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("|")) {
      const table: string[][] = [];
      for (; i < lines.length && lines[i].startsWith("|"); i++) {
        if (/^\|[\s:-]+\|/.test(lines[i]) && !/[A-Za-z0-9]/.test(lines[i])) continue; // separator row
        table.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
      }
      i--;
      out.push("```" + alignTable(table) + "```");
      continue;
    }
    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    if (heading) {
      out.push(`*${stripBold(heading[1])}*`);
      continue;
    }
    out.push(line.replace(/\*\*(.+?)\*\*/g, "*$1*"));
  }
  return out.join("\n");
}

function stripBold(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1");
}

function alignTable(rows: string[][]): string {
  const widths = rows[0].map((_, col) => Math.max(...rows.map((r) => (r[col] ?? "").length)));
  return rows
    .map((r) =>
      r
        .map((cell, col) => (col === 1 ? cell.padEnd(widths[col]) : cell.padStart(widths[col])))
        .join(" "),
    )
    .join("\n");
}
