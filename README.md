# MTG Commander League

A fullstack web app for tracking a Magic: The Gathering Commander league. Supports 3–5 player games, dynamic scoring, achievements, match history, and player profiles.

## Stack

- **Next.js 16** (App Router)
- **React 19** with React Compiler
- **Supabase** — Postgres + anon key client
- **Tailwind CSS v4**
- **Framer Motion** — mobile nav animation
- **TypeScript**

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ADMIN_PASSWORD=choose-a-password
MASTER_PASSWORD=choose-a-master-password
```

### 3. Set up Supabase tables

Run these SQL statements in the **Supabase SQL editor**:

```sql
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  played_at date not null,
  notes text
);

create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  placement smallint not null check (placement between 1 and 5)
);

alter table match_results
  add constraint unique_placement_per_match unique (match_id, placement);
```

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Leaderboard + last 5 matches feed |
| `/history` | Full match history with edit/delete |
| `/register` | Password-protected match registration |
| `/players` | All players + add player |
| `/player/[id]` | Player profile + achievements |
| `/match/[id]` | Match detail page |
| `/about` | Rules, scoring table, achievement descriptions |

---

## Point System

Points scale with player count:

| Placement | 3 players | 4 players | 5 players |
|-----------|-----------|-----------|-----------|
| 1st       | 80        | 100       | 120       |
| 2nd       | 60        | 75        | 90        |
| 3rd       | 40        | 50        | 60        |
| 4th       | —         | 25        | 30        |
| 5th       | —         | —         | 15        |

---

## Auth

Two password levels, both set as environment variables:

| Password | Cookie | Protects |
|----------|--------|----------|
| `ADMIN_PASSWORD` | `admin_session` | Register match, edit match, add player, rename player |
| `MASTER_PASSWORD` | `master_session` | Delete match, delete player |

---

## Achievements

Calculated dynamically from a player's match history:

| Achievement | Condition |
|-------------|-----------|
| 🏆 One of Every Kind | Received all placements at least once |
| 😈 Fallen from Grace | Won 2+ in a row, then came last |
| 💪 The Underdog | Won after 3+ consecutive losses |
| 🔒 Consistency is Key | No last-place finish in 5 consecutive matches |
| ⚡ Hot Streak | Won 3 matches in a row |
