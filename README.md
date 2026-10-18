# EventBook

A small event-booking app. Visitors browse upcoming events, registered users book and cancel seats, and admins manage events and see who has booked.

## Live links

- Frontend: https://event-book-eight.vercel.app/
- Backend API: https://eventbook-xw4o.onrender.com (health check: `/api/health`)
- Repository: https://github.com/w-kiran/EventBook

Test accounts (admin and user) are provided in the submission message, not in this repository.

> The backend is on a free tier and sleeps after about 15 minutes without traffic. The first request after a pause can take up to a minute.

## Tech stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Redux Toolkit, axios
- Backend: Node.js, Express, TypeScript, Zod (validation)
- Database: Supabase PostgreSQL, accessed with Prisma
- Auth: custom (Argon2 password hashing, JWT in an HttpOnly cookie)
- Hosting: Vercel (frontend), Render (backend), Supabase (database)

## How it fits together

```
Browser --> Next.js (Vercel) --/api/* rewrite--> Express (Render) --> Supabase PostgreSQL
```

The browser only talks to the Next.js site. Next.js forwards `/api/*` requests to the Express backend (`rewrites` in `apps/web/next.config.ts`), so the login cookie is first-party and there are no CORS or cross-site cookie problems. The browser never talks to Supabase. All business rules and checks run in the Express backend.

## Run it locally

Requirements: Node.js 20 or newer, and a Supabase (or any PostgreSQL) database.

### 1. Backend

```bash
cd apps/api
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env
# fill in .env (see the table below)
npx prisma migrate deploy
npx prisma generate
npm run db:seed:admin       # creates the admin user from ADMIN_* values
npm run db:seed:demo        # optional: sample events and users (refuses to run in production)
npm run dev                 # http://localhost:4000
```

### 2. Frontend

```bash
cd apps/web
npm install
cp .env.example .env.local  # Windows PowerShell: copy .env.example .env.local
npm run dev                 # http://localhost:3000
```

## Environment variables

Backend (`apps/api/.env`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string used by the app |
| `DIRECT_URL` | Postgres connection string used by migrations |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default 4000) |
| `JWT_SECRET` | Long random string used to sign login tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example `7d` |
| `FRONTEND_ORIGIN` | Frontend URL allowed by CORS |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used only by the admin seed (password at least 12 characters) |
| `DEMO_USER_PASSWORD` | Used only by the demo seed |

Frontend (`apps/web/.env.local`):

| Variable | Purpose |
|---|---|
| `API_URL` | Backend base URL for the `/api` rewrite, for example `http://localhost:4000` (read at build time on Vercel) |

Real `.env` files are git-ignored. Only `.env.example` files are committed.

## Tests

The tests use a separate `test` schema in the database and refuse to run against any other schema.

```bash
cd apps/api
cp .env.test.example .env.test   # fill in, with schema=test in the connection string
npm run test:db:migrate
npm test
```

They cover authentication, the booking rules, admin authorization, event listing, and concurrent booking (several users racing for the last seat).

## Data model

- **User**: name, unique email, password hash, role (`USER` or `ADMIN`)
- **Event**: title, description, venue, `startsAt`, `totalSeats`, `bookedSeats`
- **Booking**: user, event, status (`ACTIVE` or `CANCELLED`), `cancelledAt`

Available seats = `totalSeats - bookedSeats`. Cancelling a booking keeps the row (status `CANCELLED`), so there is a history.

## API endpoints

All routes start with `/api`. Responses are `{ "data": ... }` or `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | API and database status |
| POST | `/auth/register` | public | Create an account |
| POST | `/auth/login` | public | Log in (sets cookie) |
| POST | `/auth/logout` | public | Log out |
| GET | `/auth/me` | logged in | Current user |
| GET | `/events` | public | Upcoming events (search and pagination) |
| GET | `/events/:id` | public | Event details (includes your booking if logged in) |
| POST | `/events/:id/bookings` | logged in | Book a seat |
| GET | `/bookings/me` | logged in | My bookings |
| POST | `/bookings/:id/cancel` | logged in | Cancel my booking |
| GET | `/admin/events` | admin | All events (upcoming, past or all) |
| POST | `/admin/events` | admin | Create an event |
| PATCH | `/admin/events/:id` | admin | Edit an upcoming event |
| DELETE | `/admin/events/:id` | admin | Delete an event with no active bookings |
| GET | `/admin/events/:id/attendees` | admin | List active attendees |

## Booking integrity

The rules are enforced in the backend and the database, not just the UI:

- **No overbooking:** booking uses one atomic conditional `UPDATE` inside a transaction (`bookedSeats` is increased only if a seat is free). A database `CHECK` also guarantees `bookedSeats <= totalSeats`.
- **One active booking per user per event:** a partial unique index on `(userId, eventId)` where status is `ACTIVE`.
- **No booking or cancelling after an event starts:** decided with the database clock.
- **Cancel only your own booking:** someone else's booking returns 404.
- **Cancelling frees the seat:** the counter is decremented in the same transaction.
- **Capacity cannot go below active bookings:** conditional update returns 409.
- **Admin-only routes:** the role is read from the database on every request, never from the request body.

## Deletion policy

An event can be deleted only if it has no active bookings (otherwise 409). Because of this, a past event that still has active bookings cannot be deleted.

## Time zones

Times are stored in UTC and shown in Nepal time (UTC+05:45). Admins enter event times in Nepal time.

## Known limitations

- A JWT cannot be revoked before it expires (7 days); logging out only clears the cookie.
- The rate limiter is in memory, so it resets when the server restarts or sleeps.
- No email verification or password reset.
- Search text and page number are not kept in the URL.
- Free-tier hosting: the backend sleeps when idle, and Supabase may pause an inactive project.

## AI tool usage
I used Claude to help write the code and ChatGPT to debug issues and fix errors. I made sure I understood how the code works and can explain the logic and functionality of this project. AI helped me work more efficiently and learn along the way.