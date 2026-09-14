# Gutbuster

A curated home for improv, sketch, and standup videos from theaters and
teams around the world. Starts with IO, Second City, Magnet, and UCB.

## Stack

- **Next.js** (App Router, TypeScript) -- the web app
- **Tailwind CSS v4** -- styling, with Gutbuster's retro design tokens in
  `src/app/globals.css`
- **Airtable** -- the database (Shows, Videos, Theaters, Teams tables)
- **Vercel** -- hosting (free tier)

## How caching works (read this before building more pages)

Airtable's free plan caps API calls at 1,000/month and 5 requests/sec per
base. To stay well under that no matter how much traffic the site gets,
every Airtable read in this project goes through `src/lib/data.ts`, which
wraps each call in Next.js's `unstable_cache`. That means:

- Airtable only actually gets hit once every `REVALIDATE_SECONDS`
  (15 minutes by default), no matter how many visitors load the site in
  between.
- Visitors always get fast, pre-rendered pages, not a live Airtable
  round-trip.
- If you add a new page that needs Airtable data, import from
  `src/lib/data.ts` rather than calling Airtable directly. That keeps the
  caching behavior consistent everywhere.

To make content updates appear faster than the 15-minute window, you can
later wire up on-demand revalidation (an Airtable automation pings a
Next.js API route on record change), but that's a v2 nice-to-have, not
required for launch.

## Airtable setup

Create a base with these four tables. Field names need to match exactly
(case-sensitive) since `src/lib/data.ts` reads them by name.

**Why Theaters and Teams are separate tables, not one shared "Channels"
table:** an earlier version of this schema combined them into one table
with a `Type` field to tell them apart. The problem: Airtable's basic
linked-record field doesn't restrict which rows you can pick, so a
`Team` field could accidentally get linked to a theater's row (or vice
versa) with nothing stopping you. Splitting into two real tables makes
that mistake structurally impossible -- a field that links to `Theaters`
can only ever show you theaters in its picker, never teams.

### Theaters

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | "UCB", "IO" |
| Subscriber Count | Number | |
| Icon | Attachment | |
| Theater Info | Long text | Bio/description |

### Teams

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | "Asssscat", "Babe" |
| Home Theater | Link to Theaters | Fill in for house teams only. Leave blank for indie teams. |
| Subscriber Count | Number | |
| Icon | Attachment | |
| Bio | Long text | Team bio/description |

`Home Theater` is what answers "is this a house team or indie, and if
house, whose house." A team with this filled in is a house team. A team
with it blank is indie.

(The old `Origin` field from the single-table version has been dropped
-- it overlapped with `Theater Info` and didn't carry its own meaning.)

### Shows

A Show represents an actual structured performance. It always records
who performed (`Team`) and where that specific performance happened
(`Performed At`) -- these can differ from a team's home theater, since
house teams and indie teams alike can guest at other venues.

`Form` (Harold, Armando, Slacker, Montage) lives ONLY on Show, since it
only makes sense for a real structured performance. (An earlier version
of this schema also had an "Exercise Type" field here -- that's been
removed. See the Videos section below for why.)

| Field | Type | Notes |
|---|---|---|
| Title | Single line text | |
| Team | Link to Teams | Who performed. |
| Performed At | Link to Theaters | Where this specific show happened. Filled in for every show, whether it's the team's home theater or a guest spot elsewhere. |
| Date Performed | Date | |
| Suggestion | Single line text | Almost always a short word/phrase ("Breakfast"). Bump to Long text if you ever expect full-sentence prompts. |
| Form | Multi-select | `Harold`, `Armando`, `Slacker`, `Montage` |
| Style | Multi-select | e.g. absurdist, narrative, musical |
| Speed | Multi-select | e.g. slow burn, high energy |

To check whether a given Show was a "home game" or a "road show,"
compare `Performed At` against that Team's `Home Theater` -- they'll
match for a home game and differ for a guest performance. The data
layer has a small helper for this: `isHomeGame(show, team)` in
`src/lib/data.ts`.

### Videos

Airtable requires every table's leftmost ("primary") field to be a real
text/number/formula field -- it can't be a Link to another record. So
`Video Title` needs to be the first column, not `Show`.

**`Show` is OPTIONAL on Video. `Team` is ALSO optional on Video, but
only needs to be filled in when there's no Show.** This is the most
important structural decision in this table, worth understanding:

- A **full performance recording** links to a `Show`. Its Team comes
  from that Show automatically -- the data layer (`getVideosWithContext`
  in `src/lib/data.ts`) reads Team through the Show, so you do **NOT**
  need to re-enter Team directly on a Video that already has a Show.
- A **standalone teaching/exercise clip** -- e.g. a 3-minute object
  work demo with no audience and no structured set -- may have NO Show
  at all. THIS is when you fill in Video's own direct `Team` field,
  since there's no Show to borrow it from otherwise.

In short: if you set `Show`, leave `Team` blank. If you leave `Show`
blank, set `Team` directly. Filling in both isn't wrong, but it's
redundant -- Show's Team wins whenever a Show is present.

`Full Set`, `Object Work`, `Group Game`, and `Warmup` all live on the
Video's `Tags` field, NOT as Show fields. Reasoning for each:
- `Full Set` describes how much of a performance THIS recording covers
  (the whole thing vs. an excerpt) -- a property of the recording, not
  the performance's structural format.
- `Object Work` / `Group Game` / `Warmup` describe a kind of video
  content that doesn't require a real performance behind it at all --
  a standalone teaching clip can carry these tags with no Show and no
  Form.

A single Show can have a "Full Set" Video and a separate scene-clip
Video that ISN'T tagged Full Set but IS tagged e.g. `Object Work` --
both pointing at the same Show record (a complete Harold recording,
plus a shorter clip of just one notable object-work scene from inside
that same Harold).

| Field | Type | Notes |
|---|---|---|
| Video Title | Single line text | **Primary field.** A real title -- this is what lets you distinguish multiple cuts of the same performance, e.g. "Pancake House (Main Cut)" vs "Pancake House (Object Work Scene)", and is the only required label for standalone clips that have no Show. |
| Show | Link to Shows | **Optional.** Leave blank for standalone exercise/teaching clips with no real performance behind them. |
| Team | Link to Teams | **Optional.** Only fill in directly when Show is blank -- when Show is set, its Team is used automatically and this field can stay empty. |
| Embed URL | URL | |
| Source Platform | Single select | `YouTube`, `Vimeo`, `TikTok`, `Instagram`, `DailyMotion`, `Twitch`, `Kick` |
| Video Quality | Single line text | |
| Subtitles | Checkbox | |
| Upload Date | Date | |
| Tags | Multi-select | `Featured`, `Promo`, `Full Set`, `Object Work`, `Group Game`, `Warmup` |

One Show can link to multiple Videos (e.g. a full-set recording and a
scene-clip excerpt from the same performance -- for a scene clip,
paste the same source URL with a YouTube timestamp appended, e.g.
`&t=185s`, rather than a separate upload). A Comment object is
deliberately NOT included yet -- that's scoped for v2.

### Single line text vs. Long text, quick rule of thumb

Single line for anything short and factual where a line break would
never be expected (names, titles, one-word tags). Long text for
anything that could run more than a sentence or might eventually need
paragraph breaks (bios, descriptions). Airtable doesn't actually enforce
a length limit on Single line -- the difference is the editing
experience, not what data is allowed in.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local
npm run dev
```

Get your API key from a Personal Access Token at
`airtable.com/create/tokens`, scoped to read access on your Gutbuster
base. Get your Base ID from the Airtable API docs page for your base
(or the base's URL, which starts with `app...`).

## Project structure

```
src/
  app/
    page.tsx          <- homepage, pulls cached data and renders rows
    layout.tsx         <- fonts (Anton display, DM Sans body) + metadata
    globals.css         <- Gutbuster design tokens (colors, shadow utility)
  components/
    NavBar.tsx
    VideoCard.tsx        <- the core reusable card unit
    VideoRow.tsx         <- horizontal scrolling Netflix-style row
  lib/
    airtable.ts          <- Airtable client + table name constants
    data.ts              <- ALL Airtable reads go through here (caching)
  types/
    gutbuster.ts          <- Theater, Team, Show, Video, VideoWithContext types
```

## Deploying

Push to GitHub, then import the repo into Vercel. Add
`AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` in Vercel's project
environment variables (Settings -> Environment Variables). Every push to
`main` auto-deploys.
