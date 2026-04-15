@AGENTS.md

# MTG Commander League — Project Overview

A fullstack web app for a 4-player Magic: The Gathering Commander league.

## Stack
- **Next.js 16.2.3** (App Router) — see AGENTS.md for breaking-change notes
- **React 19** with React Compiler enabled
- **Supabase** — Postgres DB + anon key client
- **Tailwind CSS v4** — CSS-first, no config file; use `@theme` in globals.css
- **TypeScript 5**

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_PASSWORD=      # protects /register and adding players
MASTER_PASSWORD=     # protects editing/deleting matches on /history
```

## Pages
| Route | Description |
|-------|-------------|
| `/` | Leaderboard + last 5 matches feed |
| `/register` | Password-protected match registration form |
| `/history` | Full match history; edit/delete behind MASTER_PASSWORD |
| `/players` | All players list + add player (behind ADMIN_PASSWORD) |
| `/player/[id]` | Player profile + achievements |

## Point System
| Placement | Points |
|-----------|--------|
| 1st | 100 |
| 2nd | 50 |
| 3rd | 25 |
| 4th | 10 |

## Database Schema
- `players` — id, name
- `matches` — id, played_at (date)
- `match_results` — id, match_id, player_id, placement (1–4)

## Admin Auth
- `ADMIN_PASSWORD` → cookie `admin_session` via `POST /api/auth` — protects `/register` and adding players
- `MASTER_PASSWORD` → cookie `master_session` via `POST /api/master-auth` — protects editing/deleting matches (`PUT/DELETE /api/matches/[id]`)

## Achievements (calculated dynamically)
- 🏆 "One of Every Kind" — received all 4 placements at least once
- 😈 "Fallen from Grace" — won 2+ in a row, then came last
- 💪 "The Underdog" — won after 3+ consecutive losses
- 🔒 "Consistency is Key" — no last-place finish in 5 matches in a row
- ⚡ "Hot Streak" — won 3 matches in a row

## Key Next.js 16 Gotchas
- `params` and `searchParams` in page/layout components are **Promises** — always `await` them
- `cookies()` and `headers()` from `next/headers` are **async** — always `await` them
- Cache revalidation: use `revalidatePath` / `revalidateTag` from `next/cache`; `refresh()` for router-only refresh
- Route context helper: `RouteContext<'/path/[id]'>` for typed params in route handlers
