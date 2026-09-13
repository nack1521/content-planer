# Content Planner

Content Planner is a private bilingual workspace for planning social content from the first idea through publication. It transforms spreadsheet workflows into a focused, responsive creator-studio control board.

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (prepared for Milestone 2)
- **Deployment**: Vercel
- **Localization**: Bilingual Thai (`th`) and English (`en`) with zero-reload switching
- **Timezone**: Asia/Bangkok (`UTC+7`)

## Features (Milestone 1 — Application Foundation and Planner Slice)

- **AppShell**: Deep graphite desktop side navigation and mobile navigation with responsive layout.
- **Production Overview**: KPIs for planned today, planned this month, in-production stages, and published records.
- **Workflow Pipeline Breakdown**: Stage indicators for the 8 fixed workflow statuses (`idea`, `researching`, `scripting`, `recording`, `editing`, `reviewing`, `scheduled`, `published`).
- **Controlled Filters & Search**: Search across titles, hooks, captions, and hashtags, plus filters for platform, status, content pillar, format, and goal.
- **Dual Presentation**:
  - Desktop: Compact, scannable table at 1440px wide.
  - Mobile: Touch-friendly cards designed to fit 390px widths with no horizontal scroll.
- **Bilingual Message Dictionaries**: 100% key parity across `messages/th.json` and `messages/en.json`.
- **Bangkok Timezone Handling**: Localized date and time formatting in `Asia/Bangkok`.
- **Loading & Empty States**: Built-in skeletons and empty filter state with reset actions.

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node.js v26)
- npm

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app will automatically redirect to the saved or default locale (`/th/planner`).

### Verification & Quality Checks

Run before committing or handoff:

```bash
npm run lint
npm run build
```

## Route Map

- `/`: Redirects to saved locale destination (`/{locale}/planner`)
- `/{locale}/planner`: Core planner surface with summary, filters, table, and cards
- `/{locale}/calendar`: Scheduled calendar view (Milestone 5)
- `/{locale}/ideas`: Idea bank quick capture (Milestone 5)
- `/{locale}/settings`: Workspace and language preferences (Milestone 6)

## License

Private personal use.
