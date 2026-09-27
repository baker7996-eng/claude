@AGENTS.md

# FPL Draft Assistant

A personal web app that analyses an FPL **Draft** league (draft.premierleague.com):
gameweek reviews, free-agent rankings, and transfer/trade suggestions.
Built primarily for one user (team id 66992), but may later support other users.

## Working with the owner
- The owner is new to Claude Code and learning as we go: explain what was done
  and why in plain terms, and point out useful Claude Code habits.
- End every reply with a clearly labelled "What you need to do" section of
  simple numbered steps (or say plainly that nothing is needed).

## Stack
- Next.js 16 (App Router, `src/`), TypeScript, Tailwind CSS v4.
- All FPL requests go through `src/lib/fpl/client.ts` and run server-side only
  (the FPL site blocks browser cross-origin requests). Responses are cached via
  `fetch(..., { next: { revalidate } })`.
- API response types live in `src/lib/fpl/types.ts` — only type fields we use.
- Config (team id) in `src/lib/config.ts`, overridable with `FPL_ENTRY_ID`.

## Commands
- `npm run dev` — dev server. In Claude Code cloud sessions, run
  `NODE_USE_ENV_PROXY=1 npm run dev`: Node's fetch ignores HTTPS_PROXY otherwise
  and FPL requests fail with 403. (The environment must also allow
  draft.premierleague.com in its network settings.)
- `npm run lint` / `npx tsc --noEmit` / `npm run build` — run all three before committing

## What exists
- `/facts/review?gw=N&part=1|2|3|league` and `/facts/preview?...`: plain-text
  fact sheets (`src/lib/facts/`). Consumed by the owner's two Claude scheduled
  tasks (Thursday preview, Tuesday review) that write WhatsApp write-ups for the
  league. Every number must come from FPL data; the review's "Checks" lines
  verify each counted XI sums to the FPL score. Keep each part small (<5KB):
  the tasks read them via WebFetch, which truncates long pages.
- The group write-ups must never include transfer/waiver advice for the owner.
- Deployed on Vercel at https://claude-delta-lovat-90.vercel.app from this
  repo's default branch; every push redeploys. Replacement instructions for
  the scheduled tasks live in `docs/scheduled-tasks.md`.

## Roadmap
1. Fact sheets (done) · 2. Deploy (done) + point scheduled tasks at them ·
3. Predictions/season log in the app · 4. Private waiver/trade advice ·
5. Optional: app writes the reports itself via the Claude API

## Notes
- The FPL Draft API is unofficial and undocumented; field names may change.
- Useful endpoints (base https://draft.premierleague.com/api): /game,
  /bootstrap-static (players, teams, events, fixtures for next ~3 GWs keyed by
  GW), /entry/{id}/public, /entry/{id}/event/{gw} (picks, subs),
  /league/{id}/details (entries, standings, H2H matches),
  /league/{id}/element-status (who owns each player), /event/{gw}/live.
- The owner's league is 13390 ("No Friends in Fantasy", 6 teams, head-to-head,
  waivers + trades enabled).
- Mobile-first layout: the owner mostly uses it on a phone.
