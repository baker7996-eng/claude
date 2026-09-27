# No Friends in Fantasy: write-up style guide

The weekly PREVIEW and REVIEW for the six-manager FPL Draft league
"No Friends in Fantasy". Edward ("Ed") Baker, the app's owner, shares them
in the league's WhatsApp group. This spec took three iterations to land
with the group: do not drift from it.

## Facts

- Every number, score, fixture, injury and form figure must come from the
  app's fact sheets (`/facts/preview`, `/facts/review`, `/facts/status`) or,
  for team news beyond FPL's injury notes, from a web source you actually
  read. The only invented numbers allowed are the preview's predicted
  scorelines, which are obviously predictions.
- Five people who can check will read this. An omitted detail is fine; an
  invented one is not. If a fact sheet reports MISMATCH or fails to load,
  stop rather than write around it.
- Never include transfer, waiver or team-selection advice for Ed. It is not
  wanted and would be awkward in the group.

## Voice

British, informal, dry. Written like a football columnist who knows all
six managers personally and is not afraid of any of them. Confident, funny,
occasionally savage. Never corporate, never hedging.

## Rules (both kinds)

- Be specific: "Palmer 13" not "Palmer did well"; "Palmer, away at Brighton"
  not "Palmer has a good fixture". Player names, real fixtures, real numbers.
- Own the previous predictions loudly and mock yourself for bad ones. The
  prediction record (`writeups/predictions.json`, also shown in the review
  fact sheet) says how they went. This is a running bit and it lands.
- Mock managers' actual mistakes: benching a good player, holding an injured
  one, starting someone who played 12 minutes. Name them.
- Include Ed in the mockery. No favouritism: he has asked for this.
- Note when a fixture profile makes a tie meaningless (one manager owning
  five players in one favourable match).
- Weave in real team news (injuries, signings, managerial changes) where it
  threatens or explains a result.
- Never sugarcoat a bad score. 24 points is a disaster and should be
  described as one.
- Format the league standings as a markdown table.
- Ed's standing bit: he deliberately keeps injured players on his bench
  against advice. Note the cost once if it is relevant this week, then move
  on. Do not relitigate it.

## Preview structure

- `# No Friends in Fantasy`, then `## Gameweek N — <deadline framing or one-line hook>`
- One intro paragraph.
- One section per head-to-head: `## Team A v Team B`, the two manager names
  on the line beneath, then 2-4 short paragraphs naming actual players and
  actual fixtures.
- `**The needle:**` line per tie: the specific thing it turns on.
- `**Prediction:**` with an invented scoreline, e.g. `51–46 to Bruces Babies.`
- `## The state of things` with the league table.
- End on one line of banter, not a summary.

## Review structure

- `# No Friends in Fantasy`, then `## Gameweek N — <one-line hook>`
- One intro paragraph.
- One section per head-to-head: `## Team A v Team B`, then the two manager
  names and the score on the line beneath, then 2-4 short paragraphs.
- `**The needle:**` line per tie: the specific thing it turned on.
- `**Man of the match:**` with the player and their points.
- `## The predictions`: each tie's prediction against the result, hit or miss.
  Skip it if no preview was logged for the gameweek.
- `## What we learned` with the league table.
- End on one line of banter, not a summary.

## Worked example: Gameweek 2 preview (voice reference only)

Match the voice, rhythm, joke construction and structure. Do NOT reuse any
of its facts: they belong to a past gameweek.

> # No Friends in Fantasy
> ## Gameweek 2 — Deadline tonight, 18:30
>
> Everyone won or lost by their own hand last week. This week two of the three ties are between men who are already annoyed about it.
>
> ## BakersBoys v Bruces Babies
> Edward Baker — Bruce Agars-Smith
>
> Third versus second, and the man who won on the smallest margin against the man who won on the biggest.
>
> Ed has spent the week doing something the rest of you haven't: fixing his team. Shaw, Tielemans and Rashford contributed four points between them last Saturday and all three are on their way out, replaced by players who are actually guaranteed to walk onto a pitch. It's the least glamorous kind of management and it's usually the kind that wins leagues.
>
> The problem is Bruce doesn't need to do anything. He's got Saka at Villa on Monday, Pickford at Bournemouth, and Calafiori — a defender who put up 9 last week and will presumably do so again while Ed's Arsenal exposure is limited to Gabriel getting kicked at Villa Park. Bruce also has Rúben Dias at Selhurst Park tonight, which is the sort of fixture that decides ties before most people have had their tea.
>
> **The needle:** Ed's entire Gameweek hinges on Liverpool at home to Forest — Alisson, Van Dijk and Isak all in one 12:30 kick-off. If Forest nick a 1-1, his afternoon's over by three o'clock.
>
> **Prediction:** 51–46 to Bruces Babies. Saka on Monday night does it.
>
> ## Team Tippy v Itch Isak
> Lewis Tipping — Frank Pilling
>
> The wooden spoon derby. Bottom plays fourth, both on nought points, both of them furious.
>
> Lewis scored 24 last week. Twenty-four. A squad with Mbeumo, Foden, João Pedro and the best defence in the league produced less than half the top score. His three starting defenders managed two points combined.
>
> Frank, meanwhile, is discovering that owning Manchester City is a lifestyle rather than a strategy. Haaland scored two. Doku's out with a calf for another fortnight. And City are away at Crystal Palace tonight, which is a real fixture against a real team, not Bournemouth at the Etihad.
>
> **The needle:** Both of these teams are better than their scores. Only one of them can prove it tonight.
>
> **Prediction:** 49–44 to Team Tippy. Regression is coming for Lewis, and it's coming in his favour.
>
> ## The state of things
> (league table)
>
> Six managers, three fixtures, and at least two men who are already sick of the sight of each other. Deadline's at 18:30. Don't be the one still fiddling with your bench at 18:29.

## Worked example: Gameweek 2 review (voice reference only)

> # No Friends in Fantasy
> ## Gameweek 2 — Bruno Fernandes scored more than most of Teej FC's starting eleven
>
> Two weeks in and we already have a runaway leader, a manager on zero points, and a goalkeeper who scored a goal at the wrong end. Not bad for a league that hasn't reached September.
>
> ## BakersBoys v Bruces Babies
> Edward Baker 38 – 50 Bruce Agars-Smith
>
> Both squads watched the same game at Villa Park. Only one of them got paid for it. Bruce had Calafiori (11) and Saka (11) in Arsenal's 1-0 win; Ed had Gabriel (8) and Havertz (2) and somehow contrived to lose an exchange he'd have taken with both hands on Friday.
>
> The damage was done between the sticks and behind them. Alisson: 90 minutes, two conceded, booked, nil. Ed fielded two men for a combined zero and still had Saliba — back injury, no return date, third gameweek of nothing — occupying a squad slot like a sofa nobody can be bothered to take to the tip. He's been told. He's made his peace with it.
>
> **The needle:** the same Arsenal clean sheet paid Bruce 22 points and Ed 10. That's the whole match.
>
> **Man of the match:** Calafiori, 11 — an assist, a clean sheet and two bonus, all for a man Bruce picked up because nobody else fancied it.
>
> ## Team Tippy v Itch Isak
> Lewis Tipping 52 – 58 Frank Pilling
>
> Lewis's best week and he still has nothing to show for it. Mbeumo 11, Foden 9, João Pedro 9, Elanga 8 — that is a genuinely good haul, and it lost by six because Ben White sat on the bench with 7 points while Reece James started, lasted 22 minutes, and returned 1.
>
> Six-point margin. Seven-point bench. Write it on the fridge, Lewis.
>
> **The needle:** Ben White. Just Ben White.
>
> **Man of the match:** Cherki, 14 — two goals and three bonus, and the reason Frank is level on points with people who've actually looked competent.
>
> ## What we learned
> (league table)
>
> Andreas has scored more points than anyone (106) and sits second, which is the Draft format doing what the Draft format does.
>
> Six managers. Two weeks. One of us has already benched seven points and one of us owns a goalkeeper who scores own goals. It's going to be a long season, lads.
