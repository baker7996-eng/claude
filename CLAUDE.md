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
- `/facts/review`, `/facts/preview` (`?gw=N&part=1|2|3|league`) and
  `/facts/status`: plain-text fact sheets (`src/lib/facts/`). Every number in
  a write-up must come from these; the review's "Check" lines verify each
  counted XI sums to the FPL score.
- Write-ups: markdown in `writeups/` (`gwNN-preview.md`, `gwNN-review.md`),
  style guide `writeups/STYLE.md`, predictions `writeups/predictions.json`
  (the app marks them hit/miss from real results). Shown at `/writeups` with
  a "Send to WhatsApp" button (`src/lib/whatsapp.ts` converts formatting).
- A Claude Code routine ("FPL write-ups", 4x daily) checks `/facts/status`
  and writes/pushes due write-ups. Its prompt is in `docs/writeup-routine.md`.
  It replaced the owner's old Cowork scheduled tasks and season-log artifact.
- The group write-ups must never include transfer/waiver advice for the owner.
- Deployed on Vercel at https://claude-delta-lovat-90.vercel.app from this
  repo's default branch; every push redeploys.

## Sign-in and My team
- Members only: `src/proxy.ts` sends anyone without a signed session cookie
  to `/login` (team + PIN). `/facts/*` stays open for the write-up routine.
  Sign-in is OFF (site open, everyone treated as the owner) until
  `AUTH_SECRET` is set in Vercel. The owner can sign in with `OWNER_PIN`
  until they set their own PIN.
- PINs: hashed (scrypt) with a version that bumps on change, stored in
  Upstash Redis (`src/lib/store.ts`; in-memory fallback for local dev). On
  Vercel the integration provides `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
  Env var changes only reach the site after a new deployment.
  5 wrong tries lock that device (IP) out of that team for 15 minutes, so a
  prankster locks out only themselves. Owner issues PINs at `/admin`;
  anyone changes theirs at `/me/pin`.
- `/me` is each manager's private advice (`src/lib/advice.ts`): projected
  points over 3 GWs (60% last-4 form + 40% PPG, scaled by FPL fixture
  difficulty from fantasy.premierleague.com and chance of playing), waiver
  swaps, trade ideas (their player projects higher, ours has >=90% of their
  season points and >=75% chance to play), fixture ticker, next opponents.
- Home, League and My team all show the signed-in manager's own team.

## Design ("Matchday" theme, chosen by the owner)
- Dark only. Tokens in `src/app/globals.css` (`bg-pitch`, `bg-panel`,
  `border-line`, `text-ink`, `text-soft`, `text-lime` = you/positive,
  `text-amber` = doubt, `text-loss` = loss/injury). Fonts are self-hosted
  via @fontsource: Inter (body), Barlow Condensed (`display` utility for
  uppercase headings/numbers), Archivo Black (`font-brand`, logo only).
- Reuse `src/components/ui.tsx` (Panel, Chip, Rows, FormStrip) and
  `src/components/nav.tsx`. Must work on phone (bottom tab bar, one column)
  and laptop (top nav, `md:`/`lg:` grid). Screenshot both sizes before pushing.

## Roadmap
1. Fact sheets (done) · 2. Deploy (done) + point scheduled tasks at them ·
3. Matchday design + Home/League pages (done) · 3b. Automated write-ups
 (done) · 4. Per-manager sign-in +
 private My team advice (done) · 5. Matchday tab · 6. Predictions/season log in the app ·
7. Optional: app writes the reports itself via the Claude API

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
