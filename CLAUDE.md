@AGENTS.md

# FPL Draft Assistant

A personal web app that analyses an FPL **Draft** league (draft.premierleague.com):
gameweek reviews, free-agent rankings, and transfer/trade suggestions.
Built primarily for one user (team id 66992), but may later support other users.

## Stack
- Next.js 16 (App Router, `src/`), TypeScript, Tailwind CSS v4.
- All FPL requests go through `src/lib/fpl/client.ts` and run server-side only
  (the FPL site blocks browser cross-origin requests). Responses are cached via
  `fetch(..., { next: { revalidate } })`.
- API response types live in `src/lib/fpl/types.ts` — only type fields we use.
- Config (team id) in `src/lib/config.ts`, overridable with `FPL_ENTRY_ID`.

## Commands
- `npm run dev` — dev server
- `npm run lint` / `npx tsc --noEmit` / `npm run build` — run all three before committing

## Roadmap
0. Setup (done) · 1. Gameweek review · 2. Free agents & fixtures ·
3. Transfer/trade recommendations · 4. Claude-written summaries, deploy, multi-user

## Notes
- The FPL Draft API is unofficial and undocumented; field names may change.
- Mobile-first layout: the owner mostly uses it on a phone.
