# Editorial Photography

The cinematic sections work without photography. They currently display actual
sample-data charts and a typographic player profile. No stock photographs or
generated player likenesses are included.

Add approved photographs to `public/editorial/` and configure
`src/lib/data/editorial-media.ts`. A photo entry contains:

```ts
{
  src: "/editorial/season.jpg",
  alt: "A factual description of the scene",
  credit: "Photographer name",
  objectPosition: "65% center",
}
```

- `season`: wide team or game photograph for the season introduction.
- `play`: a representative game photograph for the field-position chapter.
- `players[playerId]`: portrait of the matching player, keyed by dataset ID.
- `opponents[opponentId]`: contextual image for the matching opponent.
- `games[gameId]`: photograph from the matching game for the horizontal sequence.

Use local JPEG, PNG, or WebP files. Wide scene images should be approximately
2000 pixels across; player photos should leave space for analytical labels on
the left. `objectPosition` controls the subject's framing without changing the
layout. Supply descriptive alternative text and a photographer credit.

Do not attach real player identities or photographs to the synthetic roster.
Replace the relevant data record first so imagery and statistics refer to the
same person or event. A representative game image does not imply that its exact
frame was used to calculate the field-position distribution.

## Sequence Behavior

Each desktop scene uses native vertical scrolling and a sticky viewport. Scroll
progress controls photo cropping, restrained scaling, chart reveals, and the
active analytical state. The game reel maps vertical progress to horizontal
translation. It displays the six most recent games.

On mobile and with reduced motion, scenes become stacked analytical sections.
Stage controls make every state available without pinned scrolling. The game
reel becomes a native horizontal scroller. Desktop users can explicitly enable
or pause animation using the control above the first section; the default
follows the operating system's motion preference.

Player analysis uses attributed offensive play records, including EPA per
attributed play and third-down success. It does not claim isolated player
causality, pressure splits, route tracking, or computer-vision inference.
The existing football metrics and detailed tables remain available below the
editorial sequences.
