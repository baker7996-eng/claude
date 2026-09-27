# Pointing the scheduled tasks at the fact sheets

The two scheduled tasks (Thursday preview, Tuesday review) currently gather
numbers with ~90 WebFetch calls against the FPL API, a hand-kept player-name
map, and a list of endpoints they must avoid. The app now does all of that in
code and serves the results as small plain-text fact sheets.

Replace `APP_URL` below with the deployed address (for example
`https://your-project.vercel.app`) before pasting.

## Fact sheet URLs

| Sheet | URL |
|---|---|
| Review, one H2H tie at a time | `APP_URL/facts/review?part=1`, `?part=2`, `?part=3` |
| Review, results, league-wide stats, table, checks | `APP_URL/facts/review?part=league` |
| Preview, one H2H tie at a time | `APP_URL/facts/preview?part=1`, `?part=2`, `?part=3` |
| Preview, fixtures, stacking, table | `APP_URL/facts/preview?part=league` |

Add `&gw=N` to pick a specific gameweek (the review defaults to the latest
finished one; the preview to the next one).

## Review task: replace the "WHICH ENDPOINTS YOU MAY TRUST" section and STEPS 2 and 3 with

```
=====================================================================
WHERE THE NUMBERS COME FROM
=====================================================================
All numbers come from the league's fact sheet app, which reads the FPL
Draft API directly in code. Fetch these four pages with WebFetch, asking
for the text back verbatim:

  APP_URL/facts/review?part=1
  APP_URL/facts/review?part=2
  APP_URL/facts/review?part=3
  APP_URL/facts/review?part=league

They cover the latest finished gameweek (add &gw=N for another one) and
contain: every H2H score, every player in all six squads with points,
minutes and what scored, auto-subs, starters who played 0 minutes, bench
points, points grouped by real fixture, form over the last four
gameweeks, real Premier League results, league-wide stats and the table.

Every "Check:" line must say OK: that confirms each counted XI adds up to
the score FPL recorded. If any says MISMATCH, or a page is cut off or
fails to load, stop and tell Ed rather than writing around it.

Do not fetch the FPL API yourself and do not use the element map on the
season log page: the fact sheets already have correct, current names.
Never use a number that is not in the fact sheets.
```

Keep STEP 1 (the duplicate check against the season log), STEP 4
(marking predictions from the season log), STEP 5 (the style spec and
worked example) and STEP 6 (updating the season log) as they are. In
STEP 6's verification, replace the element-summary and bootstrap-static
checks with: "every number came from the fact sheets and every Check
line said OK".

## Preview task: replace the "WHICH ENDPOINTS YOU MAY TRUST" section and STEPS 2 and 3 with

```
=====================================================================
WHERE THE NUMBERS COME FROM
=====================================================================
All numbers come from the league's fact sheet app, which reads the FPL
Draft API directly in code. Fetch these four pages with WebFetch, asking
for the text back verbatim:

  APP_URL/facts/preview?part=1
  APP_URL/facts/preview?part=2
  APP_URL/facts/preview?part=3
  APP_URL/facts/preview?part=league

They cover the next gameweek and contain: the FPL deadline, the ten real
fixtures with UK kick-off times, each manager's XI and bench with their
opponent, form over the last four gameweeks, season totals and FPL's own
injury news, plus a "Stacking" list showing where managers have three or
more starters in one real fixture. If line-ups for the new gameweek are
not published yet, the sheet says so and uses last week's XIs: say so in
the write-up.

If a page is cut off or fails to load, stop and tell Ed rather than
guessing. Never use a number that is not in the fact sheets.

Team news beyond FPL's injury notes still comes from WebSearch and
https://www.fantasyfootballscout.co.uk/ as before.
```

Keep STEP 1 (the duplicate check), STEP 4 (the style spec and worked
example) and STEP 5 (logging predictions) as they are, minus the element
map.
