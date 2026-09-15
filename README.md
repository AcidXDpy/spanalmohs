# Mount Olive SPANAL

Mount Olive SPANAL is a production-oriented high-school sports analytics application. The initial build supports football and is structured so additional sports or school activities can plug into the same data, statistics, modeling, and reporting layers.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Local demo-data repository abstraction

## Sections

- Dashboard
- Data
- Team Performance
- Model Evaluation
- Player Performance
- Opponent Analysis
- Game Analysis
- Decision Analysis
- Reports
- Methodology / Credibility

## Development

```bash
pnpm dev
pnpm lint
pnpm build
```

The app runs at `http://localhost:3000`. The included football dataset is realistic demo data and is clearly marked as sample data in the UI.

## Architecture

- `src/types` contains sport-agnostic domain models.
- `src/lib/data` contains the local data repository and football demo data.
- `src/lib/stats` contains football statistics and modeling-row preparation.
- `src/lib/ml` contains the regression, classification, tree, forest, and clustering utilities.
- `src/lib/validation` contains data quality and CSV schema validation.
- `src/components` contains shared analytics UI, charts, tables, and shadcn primitives.
