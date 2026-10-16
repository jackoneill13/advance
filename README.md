# Advance

Your half of the advance, done. A venue-side advancing tool: a rider comes in (PDF, Word, text, or photos of pages), it is
parsed against the venue's spec pack, the venue clears a worklist instead of reading a PDF, the artist answers one share link,
and the door sheet and advance sheet come out the other end.

Release 1 (this repo): spec pack, rider ingestion and parsing, matching, the worklist, the artist share link, people and
access, door sheet, advance sheet. Release 2 (not here yet): the chaser (email/SMS follow-ups), costing, calendar, PDF
publishing, Master Tour import, auth.

## Quick start

```bash
npm install
cp .env.example .env.local        # add ANTHROPIC_API_KEY to parse real riders
npm run setup                     # creates ./data/advance.db and seeds a demo venue + advance
npm run dev                       # http://localhost:3000
```

The demo advance ("The Harbor Lights") runs with no API key: it loads a parsed rider and matched worklist from
`fixtures/demo/`, so you can click through the worklist, the share link (Artist link button), people and access, the door
sheet, and the advance sheet immediately.

To parse a real rider from the command line (needs the API key):

```bash
npm run parse -- fixtures/riders/your-rider.pdf --capacity 300
npm run parse -- page1.jpg page2.jpg page3.jpg --spec fixtures/spec-pack.example.json --out result.json
```

`fixtures/riders/` is git-ignored; real riders carry personal information and should never be committed.

## How it works

```
rider files ──▶ ingest ──▶ parser (Claude, structured output) ──▶ fit check ──▶ matcher (Claude + spec pack + rules) ──▶ line items
                                                                                                         │
   venue console ◀── worklist (met / venue decides / ask the artist / rule / declined) ◀────────────────┘
   artist share link ◀── open questions, substitutions to approve, roster, guest list, vehicles
   show day ◀── door sheet (credentials by pass, guest list by act, vehicles), advance sheet (every line and its outcome)
```

- **Ingest** (`src/lib/ingest.ts`): PDF and images go to the model as-is; `.docx` is text-extracted with mammoth; text is passed
  through. Multi-file uploads keep page order. HEIC and legacy `.doc` are rejected with a clear message.
- **Parser** (`src/lib/parser.ts`): one call with a JSON schema (`RiderParseSchema`). Every line gets a category, quantity,
  spec, requirement level (hard / preferred / wish / joke / process), page, and confidence. It also reports the rider's date,
  who clears deviations, the inferred party size, the capacity the rider seems written for, missing referenced documents,
  and internal contradictions. It never outputs phone numbers or emails.
- **Fit check** (`src/lib/fitcheck.ts`): deterministic. If the rider's implied capacity is 3x the room or more, the advance opens
  with a scope message instead of fifteen declines.
- **Matcher** (`src/lib/matcher.ts`): one call with the house rules (`src/lib/rules.ts`) and the spec pack as cached system
  text. Returns one resolution per line. Refusals (staff privacy, etc.) are applied deterministically afterwards so they never
  depend on the model.
- **Worklist** (`/advances/[id]`): grouped by state; each venue decision is Provide / Substitute / Decline with a note.
  Substitutions and declines on hard or preferred lines are flagged for the artist side's sign-off.
- **Share link** (`/a/[token]`): no login. The TM answers questions, approves substitutions, and adds the roster, guest list,
  and vehicles. Guest-list adds after the venue's cutoff are marked as late adds.
- **People and access** (`/advances/[id]/people`): roster with pass types defaulted by role, guest list against the comp policy
  per act, vehicles. The door sheet (`/door`) and advance sheet (`/sheet`) print cleanly from the browser.

Spec packs are written in plain language per section (stage, PA, monitors, power, backline, lighting/video/SFX, rooms,
hospitality, crew, load-in, policies, vendors) plus pass types and comp policy. That is what every rider is diffed against,
and it is the venue's data: it compounds with every show.

## Project layout

```
src/app/                 pages (App Router) and server actions (actions.ts)
src/app/a/[token]/       artist share link
src/app/advances/        new advance, worklist, people, door sheet, advance sheet
src/app/venues/          venue list, new venue, spec pack editor
src/components/          UI primitives, ItemCard, tabs, print button
src/db/                  Drizzle schema and client (SQLite via libSQL)
src/lib/                 schemas (zod), ingest, parser, matcher, fitcheck, rules, pipeline, queries
scripts/                 seed.ts (demo data), parse-rider.ts (CLI)
fixtures/                example spec pack, demo rider + parse + match, riders/ (git-ignored)
```

## Models and cost

Defaults: `claude-sonnet-5-5` for parse and match, `claude-haiku-5-5` reserved for the chaser. The rules and spec pack are
sent as cached system text, so repeat advances at the same venue pay a fraction of the input cost. A typical six-page rider
costs well under a dollar to parse and match. `MAX_OUTPUT_TOKENS_PER_CALL` caps every call; add a per-advance budget before
opening this to many venues.

## Hosting

Local: SQLite file in `./data/`. Hosted: point `DATABASE_URL` at a libSQL/Turso database (same driver), or swap the Drizzle
driver to Postgres in `src/db/index.ts` and `drizzle.config.ts` (the schema uses only portable column types). Uploads go to
`UPLOAD_DIR`; move them to object storage (S3/GCS) before multi-instance hosting. Deploy as any Next.js 15 app (Vercel,
Fly, Cloud Run). Add authentication before any venue other than your own uses it; the share link is the only unauthenticated
surface by design.

## Install as an app

The site ships a web manifest. On iPhone: Share → Add to Home Screen. On Android: the browser's install prompt. Push
notifications, camera capture, NFC passes, and offline day sheets are the phase-two native app.
