# Sport Configuration Layer

This folder contains the additive multi-sport analytics layer. It does not replace the existing football stats implementation in `src/lib/stats/football.ts`.

## Contract

Each sport config defines:

- surface geometry and markings
- active-player structure
- possession or rally unit
- tracking profile and occlusion strategy
- movement patterns
- 8-12 impact metrics
- composite impact weighting
- default modeling features and targets

The shared scorer in `core/impact-score.ts` computes a confidence-discounted, z-scored composite from sport-specific metric observations.

## Compatibility

Football is registered in `football/config.ts` as an extraction target, but current football pages still use the existing football module directly. Do not route football through the config layer until golden-output checks confirm identical metric and player-impact outputs.

## Usage

```ts
import { computeSportImpactScores, getSportConfig } from "@/lib/sports";

const config = getSportConfig("basketball");
const scores = computeSportImpactScores(config, observations);
```

Use `validateAllSportConfigs()` to check that all registered configs have valid metric weights, positive surface dimensions, and modeling defaults.
