// Gutbuster's data layer. Every page and component reads data from here.
//
// The site never calls Airtable. It reads content/snapshot.json, a copy of
// the Airtable base made by `npm run import:csv` (or, later, `npm run sync`)
// and committed to git. Next.js bundles that file at build time, so dev,
// previews, builds, and production all cost zero Airtable API calls, and
// new content goes live through the same branch -> preview -> merge path
// as code.
//
// Updating content: change Airtable, re-import, commit content/snapshot.json.
// See scripts/import-csv.mjs.
//
// The functions below keep the names and shapes they had when they read
// Airtable directly (still async, so callers didn't change), and the
// mapping from Airtable's field names now lives in scripts/lib/normalize.mjs.

import snapshotJson from "../../content/snapshot.json";
import type {
  Theater,
  Team,
  Show,
  Video,
  VideoWithContext,
  FeedVideo,
  ImprovForm,
  CutType,
} from "@/types/gutbuster";

interface Snapshot {
  generatedAt: string;
  source: string;
  theaters: Theater[];
  teams: Team[];
  shows: Show[];
  videos: Video[];
}

const snapshot = snapshotJson as unknown as Snapshot;

// --- Raw tables ------------------------------------------------------------

export async function getTheaters(): Promise<Theater[]> {
  return snapshot.theaters;
}

export async function getTeams(): Promise<Team[]> {
  return snapshot.teams;
}

export async function getShows(): Promise<Show[]> {
  return snapshot.shows;
}

export async function getVideos(): Promise<Video[]> {
  return snapshot.videos;
}

// When the snapshot was made, for a "catalog updated" line if ever wanted.
export function getSnapshotDate(): string {
  return snapshot.generatedAt;
}

// --- Lookups ---------------------------------------------------------------

const showsById = new Map(snapshot.shows.map((s) => [s.id, s]));
const teamsById = new Map(snapshot.teams.map((t) => [t.id, t]));
const theatersById = new Map(snapshot.theaters.map((t) => [t.id, t]));

// Team comes from the Show when there is one, otherwise from the Video's
// own Team link. Same rule for Theater (the Show's venue wins).
function resolve(video: Video) {
  const show = video.showId ? showsById.get(video.showId) : undefined;
  const teamId = show?.teamId || video.teamId;
  const theaterId = show?.performedAtId || video.theaterId;
  return {
    show,
    team: teamId ? teamsById.get(teamId) : undefined,
    theater: theaterId ? theatersById.get(theaterId) : undefined,
  };
}

// --- Joined data -----------------------------------------------------------

// Only videos with a Team (directly or through their Show). Used by the older
// row components, which always show a team badge.
export async function getVideosWithContext(): Promise<VideoWithContext[]> {
  return snapshot.videos.flatMap((video) => {
    const { show, team, theater } = resolve(video);
    if (!team) return [];
    return [{ ...video, team, ...(show ? { show } : {}), ...(theater ? { theater } : {}) }];
  });
}

// Every video, with whatever context it has. The home feed uses this, so a
// talk or demo with no team still appears (credited by its Source/channel).
export async function getFeedVideos(): Promise<FeedVideo[]> {
  return snapshot.videos.map((video) => ({ ...video, ...resolve(video) }));
}

// "Spotlight" is the tag Airtable uses for featured videos (was "Featured").
export async function getFeaturedVideos(): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.tags?.includes("Spotlight"));
}

export async function getVideosByCutType(cutType: CutType): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.cutType === cutType);
}

export async function getFullSetVideos(): Promise<VideoWithContext[]> {
  return getVideosByCutType("Full Set");
}

export async function getVideosByTag(tag: string): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.tags?.includes(tag));
}

export async function getVideosByForm(form: ImprovForm): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.show?.forms?.includes(form));
}

export async function getVideosByTeam(teamId: string): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.team.id === teamId);
}

export async function getVideosByTheater(theaterId: string): Promise<VideoWithContext[]> {
  const all = await getVideosWithContext();
  return all.filter((v) => v.theater?.id === theaterId);
}

export function isHomeGame(show: Show, team: Team): boolean {
  return !!show.performedAtId && show.performedAtId === team.homeTheaterId;
}
