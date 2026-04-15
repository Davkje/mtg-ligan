# MTG Commander League

A fullstack web app for tracking a 4-player Magic: The Gathering Commander league.

## Stack

- **Next.js 16** (App Router)
- **Supabase** — Postgres + anon key client
- **Tailwind CSS v4**
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
```

### 3. Set up Supabase tables

Run these SQL statements in the **Supabase SQL editor**:

```sql
-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  played_at date not null
);

-- Match results
create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  placement smallint not null check (placement between 1 and 4)
);

-- Unique placement per match
alter table match_results
  add constraint unique_placement_per_match unique (match_id, placement);
```

### 4. Seed players

Replace names as needed:

```sql
insert into players (name) values
  ('Carl'),
  ('Hanna');
  ('Gustav'),
  ('David'),
```

### 5. Seed sample matches

```sql
-- Match 1
with m as (
  insert into matches (played_at) values ('2025-01-10') returning id
)
insert into match_results (match_id, player_id, placement)
select m.id, p.id, case p.name
  when 'Carl'   then 1
  when 'David'     then 2
  when 'Hanna' then 3
  when 'Gustav'   then 4
end
from m, players p;

-- Match 2
with m as (
  insert into matches (played_at) values ('2025-01-17') returning id
)
insert into match_results (match_id, player_id, placement)
select m.id, p.id, case p.name
  when 'Gustav'     then 1
  when 'Carl'   then 2
  when 'Hanna'   then 3
  when 'David' then 4
end
from m, players p;
```

### 6. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Pages

| Route          | Description                           |
| -------------- | ------------------------------------- |
| `/`            | Leaderboard + last 5 matches feed     |
| `/history`     | Full match history                    |
| `/register`    | Password-protected match registration |
| `/player/[id]` | Player profile + achievements         |

## Point System

| Placement | Points |
| --------- | ------ |
| 1st       | 100    |
| 2nd       | 50     |
| 3rd       | 25     |
| 4th       | 10     |
