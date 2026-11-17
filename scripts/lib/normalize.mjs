// Shared normalizer: turns raw Airtable rows into the shapes in
// src/types/gutbuster.ts (Theater, Team, Show, Video) and checks them.
//
// Both importers feed this the same input, so the snapshot comes out
// identical whichever one ran:
//   tables = { theaters, teams, shows, videos }, each an array of
//   { id, fields } where `fields` is keyed by Airtable field name and
//   every linked-record field is already an array of record IDs.
// The CSV importer resolves names to IDs before calling this; the API
// sync gets IDs from Airtable directly.

// --- Cut Type ---------------------------------------------------------
// Airtable's Cut Type options are "Improv 101", "Full sets", and "Scenes".
// The site stores one value per video ("Improv 101", "Full Set", "Scene"),
// since a single tape is one full set or one scene; the filter chips add
// the plural labels. Matching ignores case and extra spaces, so "Full Sets"
// and "full sets" land the same way. Retired names (Exercise Demo, Scene
// Clip, the old singular options) still map forward. Promo maps to
// nothing, and the report lists those videos.
const CUT_TYPES = {
  "improv 101": "Improv 101",
  "exercise demo": "Improv 101",
  "full sets": "Full Set",
  "full set": "Full Set",
  scenes: "Scene",
  scene: "Scene",
  "scene clip": "Scene",
};

export function normalizeCutType(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return undefined;
  return CUT_TYPES[value.trim().replace(/\s+/g, " ").toLowerCase()];
}

// --- Field helpers ----------------------------------------------------

const text = (v) => {
  if (Array.isArray(v)) v = v[0];
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
};

const number = (v) => {
  const s = text(v);
  if (s === undefined) return undefined;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const list = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = text(v);
  return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];
};

const firstLink = (v) => (Array.isArray(v) && v.length > 0 ? v[0] : undefined);

const checkbox = (v) => v === true || (typeof v === "string" && /^(checked|true|yes|1)$/i.test(v.trim()));

// Dates arrive as ISO (API, or a CSV field set to ISO format) or as
// M/D/YYYY (Airtable's default "Local" format in CSV). Output is always
// YYYY-MM-DD, which is what the site slices years from.
export function isoDate(v) {
  const s = text(v);
  if (!s) return undefined;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return undefined;
}

// --- Build ------------------------------------------------------------

export function buildSnapshot(tables, { source }) {
  const warnings = [];
  const warn = (msg) => warnings.push(msg);

  const theaters = tables.theaters.map(({ id, fields: f }) => ({
    id,
    name: text(f["Name"]) ?? "",
    location: text(f["City"]),
    subscriberCount: number(f["Subscriber Count"]),
    iconUrl: text(f.__iconUrl),
    theaterInfo: text(f["Bio"]) ?? text(f["Theater Info"]), // field renamed to Bio in Airtable
  }));

  const teams = tables.teams.map(({ id, fields: f }) => ({
    id,
    name: text(f["Name"]) ?? "",
    homeTheaterId: firstLink(f["Home Theater"]),
    subscriberCount: number(f["Subscriber Count"]),
    iconUrl: text(f.__iconUrl),
    bio: text(f["Bio"]),
  }));

  const shows = tables.shows.map(({ id, fields: f }) => ({
    id,
    title: text(f["Title"]) ?? "",
    teamId: firstLink(f["Team"]) ?? "",
    performedAtId: firstLink(f["Performed At"]),
    datePerformed: isoDate(f["Date Performed"]),
    suggestion: text(f["Suggestion"]),
    forms: list(f["Form"]),
    style: list(f["Style"]),
    speed: list(f["Speed"]),
  }));

  const showsById = new Map(shows.map((s) => [s.id, s]));

  const videos = tables.videos.map(({ id, fields: f }) => {
    const title = text(f["Auto Title"]) ?? text(f["Video Title"]) ?? "";
    const label = title || id;
    const rawCut = text(f["Cut Type"]);
    const cutType = normalizeCutType(rawCut);
    const video = {
      id,
      title,
      showId: firstLink(f["Show"]),
      teamId: firstLink(f["Team"]),
      theaterId: firstLink(f["Theater"]),
      cutType,
      embedUrl: text(f["URL"]) ?? text(f["Embed URL"]) ?? "", // field renamed to URL in Airtable
      sourcePlatform: text(f["Source Platform"]) ?? "YouTube",
      videoQuality: text(f["Video Quality"]),
      hasSubtitles: checkbox(f["Subtitles"]),
      uploadDate: isoDate(f["Upload Date"]),
      tags: list(f["Tags"]),
      // Who to credit when there's no team: the Source field in Airtable
      // when filled in, otherwise the channel the video was posted by.
      source: text(f["Source"]),
      channel: text(f.__channel),
      channelUrl: text(f.__channelUrl),
    };

    if (!video.embedUrl) warn(`Video "${label}" has no Embed URL.`);
    if (!rawCut) warn(`Video "${label}" has no Cut Type, so it only shows under All.`);
    else if (!cutType) warn(`Video "${label}" has Cut Type "${rawCut}", which isn't Improv 101, Full sets, or Scenes.`);
    const show = video.showId ? showsById.get(video.showId) : undefined;
    if (!show?.teamId && !video.teamId && !video.source && !video.channel) {
      warn(`Video "${label}" has no Team, Source, or channel, so nothing shows under its title. Fill in Source in Airtable.`);
    }

    return video;
  });

  // Drop undefined keys so the JSON stays small and diffs stay quiet.
  const clean = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source,
    counts: {
      theaters: theaters.length,
      teams: teams.length,
      shows: shows.length,
      videos: videos.length,
    },
    theaters: clean(theaters),
    teams: clean(teams),
    shows: clean(shows),
    videos: clean(videos),
  };

  return { snapshot, warnings };
}
