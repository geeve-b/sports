# Wildplay

A sports team management portal styled like a live broadcast meets a stadium scoreboard. Coaches manage the squad, fixtures, lineups, training and stats. Players set their availability, check in to training and follow their own numbers. Admins approve coaches and run teams, users and seasons.

**Stack:** React 18 (Vite, JavaScript) · React Router 6 · Bootstrap 5.3 + React-Bootstrap, restyled through Sass · CSS Modules · Framer Motion · Recharts · Node.js + Express · MongoDB + Mongoose · JWT in an httpOnly cookie.

---

## Quick start: no database needed

```bash
npm run install:all   # installs root, server and client dependencies
npm run demo          # API on :5050 with an in-memory MongoDB, client on :5173
```

Open http://localhost:5173. The in-memory database is seeded on every start and wiped when the server stops.

> The first `npm run demo` downloads a MongoDB binary (about 600 MB) through `mongodb-memory-server`. Later runs reuse it.

### Demo accounts (password `matchday26` for all)

| Role | Email |
|---|---|
| Coach | `coach@wildplay.test` |
| Player | `dani.okafor@wildplay.test` |
| Admin | `admin@wildplay.test` |
| Coach awaiting approval | `priya.nandakumar@wildplay.test` |

In development, the sign-in page lists these accounts so you can fill them in with one click.

## Running against a real MongoDB

1. Create the env files:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
2. In `server/.env`, set `MONGO_URI` (local `mongodb://127.0.0.1:27017/wildplay` or an Atlas SRV URI such as `mongodb+srv://<user>:<url-encoded-password>@<cluster-host>/wildplay`) and a long random `JWT_SECRET`. Keep the real URI only in this ignored `.env` file; URL-encode special characters in the password.
3. Seed and run:
   ```bash
   npm run seed   # wipes that database and loads the demo club
   npm run dev    # server (nodemon) + client (vite) together via concurrently
   ```

### Scripts (root)

| Script | What it does |
|---|---|
| `npm run install:all` | Install dependencies in root, `server/` and `client/` |
| `npm run dev` | API + client together, using `MONGO_URI` |
| `npm run demo` | API + client together, in-memory database, seeded on boot |
| `npm run seed` | Reset the `MONGO_URI` database to the demo data |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | Start the API. With `NODE_ENV=production` it also serves `client/dist` |

### Production

```bash
npm run build
NODE_ENV=production JWT_SECRET=... MONGO_URI=... npm start
```

The API serves the built client from the same origin, so the auth cookie is first-party (`SameSite=Strict`, `Secure`). To host the client elsewhere, set `CLIENT_ORIGIN` on the server and `VITE_API_URL` on the client, and serve both over HTTPS.

### Vercel

[`vercel.json`](vercel.json) deploys the repo as one project with two services on one domain: `client` (Vite, serves `/`) and `server` (Express, serves `/api/*`, entrypoint `app.js`). The client calls the API at the relative path `/api`, so the cookie stays first-party.

- In the Vercel project, set `MONGO_URI` and `JWT_SECRET` (the API refuses to start in production without a real secret).
- In MongoDB Atlas → Network Access, allow `0.0.0.0/0`, since Vercel functions have no fixed IP.
- The API connects to MongoDB on the first request and reuses the connection while the function is warm.
- Seed the database from your machine with `npm run seed` (it wipes the target database first).
- Test locally with `vercel dev`.

---

## What's in the seed

- **Wildplay FC**, season 2026/27, with one admin, one coach and one coach awaiting approval.
- **22 players** (3 GK, 7 DF, 7 MF, 5 FW) with heights, feet and dates of birth. One is injured with an injury history, one is doubtful and one is suspended after a red card.
- **10 matches**: 8 played with scores, lineups (4-3-3), goals, assists, cards, substitutions and per-player stats (minutes, shots, passes, ratings), plus 2 upcoming.
- Training for the past four weeks and the next ten days, with attendance registers.
- Availability answers for the next fixture, with a few players who haven't replied.
- Five announcements, including an urgent one.

All dates are relative to the day you seed, so there is always a next fixture to count down to. The stats come from a fixed random seed, so every seed produces the same data.

---

## Project structure

```
client/
  src/
    api/            axios instance + one service object per resource
    components/     Button, Input, Select, PlayerCard, Scoreline, FlipNumber, Ticker,
                    Countdown, StatBlock, FormGuide, AvailabilityBar, Leaderboard,
                    PageHeader, Skeleton, EmptyState, Segmented, StatusTag, Pitch…
    context/        AuthContext, ThemeContext, ToastContext
    hooks/          useAuth, useFetch, useCountdown, useChartColors, useMediaQuery
    layouts/        AppShell (team-sheet side nav, mobile tab bar + offcanvas, page wipe)
    pages/          Auth, MatchCentre, Squad, PlayerProfile, Fixtures, Formation,
                    Training, Availability, Announcements, TeamStats, Admin, Settings
    styles/         custom.scss (Bootstrap overrides), variables.css, typography.css,
                    animations.css
    utils/          formations, match helpers, formatting
server/
  config/           env, db (real or in-memory), constants
  models/           User, Team, Season, Player, Match, PlayerMatchStat,
                    TrainingSession, Availability, Announcement
  controllers/      one per resource
  routes/           one per resource, with express-validator rules
  middleware/       verifyToken, requireRole, validate, error handler, auth rate limit
  utils/            seed data, player serialisation, access helpers, tokens
  app.js  server.js  seed.js
```

## API

All routes are under `/api`. Everything except register, login, logout and `GET /teams/public` needs the auth cookie.

| Area | Routes |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `PUT /auth/me` · `PUT /auth/password` |
| Teams | `GET /teams` · `GET /teams/public` · `GET /teams/:id` · `POST /teams` (admin) · `PUT /teams/:id` · `DELETE /teams/:id` (admin) |
| Players | `GET /players?position&status&q` · `GET /players/:id` · `POST/PUT/DELETE` (staff) · `POST /players/:id/injuries` · `PUT /players/:id/injuries/:injuryId` |
| Matches | `GET /matches?status&from&to&sort&limit` · `GET /matches/:id` · `POST/PUT/DELETE` (staff) · `PUT /matches/:id/lineup` · `POST /matches/:id/events` · `DELETE /matches/:id/events/:eventId` · `PUT /matches/:id/stats` |
| Stats | `GET /stats/team/:id` · `GET /stats/players/:id` |
| Training | `GET /training?from&to` · `POST/PUT/DELETE` (staff) · `PUT /training/:id/attendance` (staff) · `POST /training/:id/attendance/check-in` (player) |
| Availability | `GET /availability?match=` (staff see the squad, players see their own) · `GET /availability/mine` · `PUT /availability` |
| Announcements | `GET /announcements` · `GET /announcements/ticker` · `POST/PUT/DELETE` (staff) |
| Admin | `GET /admin/overview` · `GET /admin/users` · `PATCH/DELETE /admin/users/:id` · `GET/POST/PUT/DELETE /admin/seasons` |

Team stats come from MongoDB aggregation pipelines. A `$facet` stage computes the summary, form and trend in one pass, `$setWindowFields` computes running points and rolling goals, and `$group` + `$lookup` build the leaderboards. Non-admins are scoped to their own team on every route.

## Design system

The look is set in [`client/src/styles/custom.scss`](client/src/styles/custom.scss), which overrides Bootstrap variables before importing Bootstrap, and in [`variables.css`](client/src/styles/variables.css).

- **Palette:** ink `#0E0F0C`, chalk `#F2F0E6`, flood `#E8FF3A` (the only bright colour), turf `#1F3B2D`, red card `#E5322D`.
- **Type:** Anton for display, Barlow for body and UI, JetBrains Mono for figures.
- **Themes:** Night match is the default (`data-bs-theme="dark"`). Day match (`light`) is toggled in the side nav or under Settings. In day mode, accent text switches to ink because flood text is unreadable on chalk.
- **Accessibility:** AA contrast throughout. Red fills that carry text use a deeper `#C0241F` (5.3:1 with chalk), because `#E5322D` reaches only about 3.8:1. Focus rings are two-tone (ink inside flood) so they show on both themes. Every Framer Motion animation and CSS animation respects `prefers-reduced-motion`. The ticker stops and becomes scrollable.
- **Formation builder:** drag players with the mouse or touch, with spring physics. Keyboard users press Enter on a player, then on a position, the bench or the squad list. Every move is announced through a live region.

## Notes

- Passwords are hashed with **bcryptjs**, a pure-JS implementation of bcrypt (12 rounds). It is hash-compatible with native `bcrypt` and needs no build tools on Windows. To use native `bcrypt`, swap the import in `server/models/User.js`.
- The spec's admin "seasons" area needed a **Season** model. `Team.season` and `Match.season` refer to it.
- Coaches who register get `approved: false`, and sign-in is refused until an admin approves them under **Admin → Approvals**.
#   s p o r t s  
 