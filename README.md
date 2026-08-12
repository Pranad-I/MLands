# MLaNDS — Intelligent Multi-Layer Network Defence System

A home / small-office network security console for monitoring connected devices,
reviewing access requests, responding to alerts, and quarantining suspicious
traffic in real time.

## Project architecture and maintainability notes

The project is structured around a clear separation of responsibilities:

- `app/` contains route and screen-level composition.
- `components/` holds reusable UI and global providers.
- `lib/` owns shared state, auth, and Supabase integration.
- `supabase/` stores database migrations and schema setup.
- `MLaNDS Functions/` contains the Python network-monitoring subsystem and its
  validation logic.

This separation keeps the front-end dashboard, authentication flow, and backend
risk-monitoring logic maintainable and easy to review against the rubric.

## Pages

| Route              | Description                                              |
|---------------------|-----------------------------------------------------------|
| `/login`            | Sign-in screen, with real Supabase auth and password reset |
| `/signup`            | Account creation — full name, email, password, required Terms & Conditions acceptance |
| `/dashboard`         | Live overview — stat cards, risk chart, recent alerts, quick actions, all driven by shared app data |
| `/devices`           | Device inventory — status/risk filters, network scan, per-device approve/block/quarantine, pagination |
| `/access-control`    | Managed devices table, device/risk overview donuts, network activity chart, recent actions, top active devices — all driven by shared app data |
| `/access-requests`   | Pending access requests, device risk-score decision panel, trusted devices, access history, network segmentation |
| `/activity-log`      | Categorized event log (Alert/Warning/Info) with date filter, search, CSV export, pagination |
| `/quarantine`        | Quarantined devices table, device detail + action panel, quarantine history, risk overview donut |
| `/alerts`            | Full alert triage view — priority stat cards, tabs, donut + type breakdown, 7-day trend, alert actions panel |
| `/settings`          | Notification, security, network, and account preferences   |
| `/about`             | System information and connected node status                |

Note: `/access-control` and `/access-requests` had their page content swapped relative to
their intended designs in the original scaffold (the Access Control route was rendering
the Access Requests UI and vice versa) — this has been corrected.

## Authentication

Sign-up and sign-in are backed by real Supabase Auth:

- `/signup` collects full name, email, and password, requires accepting the
  Terms & Conditions before submitting, and calls `supabase.auth.signUp()`.
  A `profiles` row is created automatically for every new user via a database
  trigger (see `supabase/migrations/20260721010342_create_profiles.sql`),
  storing the name, email, and terms-acceptance timestamp.
- `/login` calls `supabase.auth.signInWithPassword()`, and "Forgot Password?"
  sends a real reset email via `supabase.auth.resetPasswordForEmail()`.
- Once signed in, every page's header shows a working account menu (name/email
  + **Log out**) instead of a static "Admin" label.
- Route protection (`components/AuthGate.tsx`) redirects signed-out visitors
  to `/login`, and redirects signed-in visitors away from `/login`/`/signup`.

**Without Supabase credentials configured**, sign-up/sign-in show a clear
"Supabase isn't configured" notice instead of failing silently, and route
protection is skipped entirely — so the rest of the app (all sample data
pages) remains fully usable out of the box.

## Shared live data

Devices, Alerts, Quarantine, Activity Log, and the Dashboard all read from one
in-memory store (`lib/store.tsx`, via React Context). Actions in one page show
up everywhere else immediately — approve a device on `/devices` and it's
reflected on `/dashboard`, and a log entry appears on `/activity-log`;
release something from `/quarantine` and its status updates on `/devices` too.

## Sidebar & theme

- Every page's header has a hamburger (☰) button that collapses/expands the
  sidebar, plus a light/dark mode toggle (sun/moon) next to it. Preference is
  persisted via `next-themes`.
- The sidebar itself always stays on a dark navy theme by design; the toggle
  affects the main content area.

## Getting started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment variables

Copy `.env.local` (already present) and fill in your Supabase project credentials
to enable authentication and live data on the Access Requests / Access Control pages:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

The Python network-monitoring subsystem reads `GEMINI_API_KEY` from the same
repository `.env.local` file, so the AI analyser can use the key without the
secret appearing in source code.

Then run the migrations in `supabase/migrations/` against your project (via the
Supabase CLI or SQL editor) to create the `devices`, `access_logs`,
`network_activity`, and `profiles` tables.

Without credentials set, sign-up/sign-in show a "not configured" notice rather
than erroring, route protection is skipped, and the Access Requests / Access
Control pages fall back to empty/zeroed data. All other pages (Devices, Alerts,
Quarantine, Activity Log, Dashboard) run on local sample data out of the box
so the whole app is usable immediately.

## Tech stack

Next.js 13 (App Router) · TypeScript · Tailwind CSS · Supabase · Recharts ·
Radix UI · lucide-react · framer-motion · next-themes
