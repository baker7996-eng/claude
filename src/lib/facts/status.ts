import "server-only";

import { hasWriteup, listWriteups } from "@/lib/writeups";
import { loadLeague } from "./league";
import { ukTime } from "./text";

/**
 * Plain-text answer to "is a preview or review due right now?", read by the
 * scheduled write-up job before it does anything else.
 *
 * - A preview is due from the start of the UK calendar day before the FPL
 *   deadline until the deadline itself, if it hasn't been written yet.
 * - A review is due once every league match in the latest gameweek has
 *   finished (FPL sets this after bonus points are confirmed), if it hasn't
 *   been written yet.
 */
export async function statusFacts(now = new Date()): Promise<string> {
  const lg = await loadLeague();
  const events = lg.bootstrap.events.data;

  const upcoming = events.find((e) => new Date(e.deadline_time) > now);
  const matchesFor = (gw: number) => lg.league.matches.filter((m) => m.event === gw);
  const finishedGws = [...new Set(lg.league.matches.map((m) => m.event))]
    .filter((gw) => matchesFor(gw).every((m) => m.finished))
    .sort((a, b) => b - a);
  const latestFinished = finishedGws[0];

  const out = [`Now: ${ukTime(now.toISOString())} (UK)`];
  out.push(`Saved write-ups: ${listWriteups().map((w) => w.slug).join(", ") || "none"}`);

  if (upcoming && matchesFor(upcoming.id).length > 0) {
    const deadline = new Date(upcoming.deadline_time);
    const opens = startOfUkDayBefore(deadline);
    const hours = Math.round((deadline.getTime() - now.getTime()) / 3_600_000);
    out.push(`Next deadline: gameweek ${upcoming.id}, ${ukTime(upcoming.deadline_time)} (UK), in ${hours}h`);
    if (hasWriteup(upcoming.id, "preview")) {
      out.push(`PREVIEW: not due (gameweek ${upcoming.id} preview already saved)`);
    } else if (now >= opens) {
      out.push(`PREVIEW: DUE for gameweek ${upcoming.id}`);
    } else {
      out.push(`PREVIEW: not due (gameweek ${upcoming.id} preview window opens ${ukTime(opens.toISOString())} UK)`);
    }
  } else {
    out.push("PREVIEW: not due (no upcoming league gameweek)");
  }

  if (!latestFinished) {
    out.push("REVIEW: not due (no gameweek has finished)");
  } else if (hasWriteup(latestFinished, "review")) {
    out.push(`REVIEW: not due (gameweek ${latestFinished} review already saved)`);
  } else {
    out.push(`REVIEW: DUE for gameweek ${latestFinished}`);
  }
  return out.join("\n");
}

/** Midnight UK time at the start of the day before `date`. */
function startOfUkDayBefore(date: Date): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(date);
  const [y, m, d] = ymd.split("-").map(Number);
  // Midnight UTC that day, corrected for the UK offset (0 or 1 hour).
  const utcMidnight = Date.UTC(y, m - 1, d - 1);
  const ukHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(
      new Date(utcMidnight),
    ),
  );
  return new Date(utcMidnight - ukHour * 3_600_000);
}
